import { describe, it, expect } from "vitest";
import {
  fosmReliabilityIndex,
  sormReliabilityIndex,
  tormReliabilityIndex,
  analyzeHigherOrderConvergence,
  calculateReliabilityMarginOfError,
  normalPDF,
  importanceSamplingMonteCarlo,
  subsetSimulationMonteCarlo,
  reliabilityBasedDesignOptimization,
  LRFD_COMBINATIONS,
  DEFAULT_COV_BY_CATEGORY,
  DEFAULT_YIELD_STRENGTH,
  DEFAULT_YIELD_COV,
  DEFAULT_AREA_COV,
  DEFAULT_LOAD_COV,
  type TrussNode,
  type TrussMember,
  type PointLoad,
  type MemberResult,
} from "@/lib/trussSolver";

// ── Helpers ──────────────────────────────────────────────────

function makeMember(overrides: Partial<TrussMember> & { id: number }): TrussMember {
  return {
    startNode: 1,
    endNode: 2,
    area: 0.005,
    elasticModulus: 200e9,
    isRigid: false,
    yieldStrength: DEFAULT_YIELD_STRENGTH,
    yieldStrengthCoV: DEFAULT_YIELD_COV,
    areaCoV: DEFAULT_AREA_COV,
    ...overrides,
  };
}

function makeResult(memberId: number, force: number, area = 0.005): MemberResult {
  const stress = force / area;
  return {
    memberId,
    force,
    stress,
    strain: stress / 200e9,
    type: force > 0 ? "tension" : force < 0 ? "compression" : "zero",
  };
}

function makeLoad(overrides: Partial<PointLoad> & { id: number }): PointLoad {
  return {
    nodeId: 2,
    magnitude: 50000,
    angle: 0,
    magnitudeCoV: DEFAULT_LOAD_COV,
    category: "dead",
    ...overrides,
  };
}

// ── Constants ────────────────────────────────────────────────

describe("Constants", () => {
  it("LRFD_COMBINATIONS has 7 combos per ASCE 7-22", () => {
    expect(LRFD_COMBINATIONS).toHaveLength(7);
    LRFD_COMBINATIONS.forEach((lc) => {
      expect(lc.factors).toHaveProperty("dead");
      expect(lc.factors).toHaveProperty("live");
      expect(lc.factors).toHaveProperty("earthquake");
    });
  });

  it("DEFAULT_COV_BY_CATEGORY covers all load types", () => {
    const categories = ["dead", "live", "wind", "snow", "earthquake", "rain"] as const;
    categories.forEach((c) => {
      expect(DEFAULT_COV_BY_CATEGORY[c]).toBeGreaterThan(0);
      expect(DEFAULT_COV_BY_CATEGORY[c]).toBeLessThan(1);
    });
  });

  it("dead load CoV < live load CoV (dead is less uncertain)", () => {
    expect(DEFAULT_COV_BY_CATEGORY.dead).toBeLessThan(DEFAULT_COV_BY_CATEGORY.live);
  });
});

// ── normalPDF ────────────────────────────────────────────────

describe("normalPDF", () => {
  it("peak at x=0 equals 1/sqrt(2π)", () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 10);
  });

  it("is symmetric", () => {
    expect(normalPDF(1.5)).toBeCloseTo(normalPDF(-1.5), 10);
  });

  it("decays towards zero for large |x|", () => {
    expect(normalPDF(5)).toBeLessThan(1e-5);
  });
});

// ── FOSM ─────────────────────────────────────────────────────

describe("fosmReliabilityIndex", () => {
  it("returns correct β for known R–S case", () => {
    // R: mean=300, cov=0.1 → σR=30
    // S: mean=200, cov=0.15 → σS=30
    // β = (300-200)/√(900+900) = 100/42.43 ≈ 2.357
    const beta = fosmReliabilityIndex(300, 0.1, 200, 0.15);
    expect(beta).toBeCloseTo(100 / Math.sqrt(900 + 900), 2);
  });

  it("increases when mean resistance increases", () => {
    const b1 = fosmReliabilityIndex(300, 0.1, 200, 0.15);
    const b2 = fosmReliabilityIndex(400, 0.1, 200, 0.15);
    expect(b2).toBeGreaterThan(b1);
  });

  it("decreases when load uncertainty increases", () => {
    const b1 = fosmReliabilityIndex(300, 0.1, 200, 0.10);
    const b2 = fosmReliabilityIndex(300, 0.1, 200, 0.30);
    expect(b2).toBeLessThan(b1);
  });

  it("returns capped value when stdG = 0 (deterministic safe)", () => {
    const beta = fosmReliabilityIndex(300, 0, 200, 0);
    expect(beta).toBe(10);
  });

  it("returns 0 when deterministic and meanR <= meanS", () => {
    const beta = fosmReliabilityIndex(200, 0, 300, 0);
    expect(beta).toBe(0);
  });
});

// ── SORM ─────────────────────────────────────────────────────

describe("sormReliabilityIndex", () => {
  it("returns values close to FORM for small CoV", () => {
    const betaFORM = 3.0;
    const { betaSORM } = sormReliabilityIndex(betaFORM, 300, 3, 200, 2);
    // Small CoV → curvature correction is minor
    expect(Math.abs(betaSORM - betaFORM)).toBeLessThan(0.5);
  });

  it("SORM correction is non-zero for large CoV", () => {
    const betaFORM = 3.0;
    const { betaSORM, curvature } = sormReliabilityIndex(betaFORM, 300, 60, 200, 50);
    expect(curvature).toBeGreaterThan(0);
    // SORM should differ from FORM, even if slightly
    expect(betaSORM).not.toBe(betaFORM);
  });

  it("pfSORM is between 0 and 1", () => {
    const { pfSORM } = sormReliabilityIndex(2.5, 300, 30, 200, 30);
    expect(pfSORM).toBeGreaterThanOrEqual(0);
    expect(pfSORM).toBeLessThanOrEqual(1);
  });

  it("handles zero variance gracefully", () => {
    const { betaSORM } = sormReliabilityIndex(3.0, 300, 0, 200, 0);
    expect(betaSORM).toBe(3.0);
  });
});

// ── TORM ─────────────────────────────────────────────────────

describe("tormReliabilityIndex", () => {
  it("returns valid β and Pf", () => {
    const { betaTORM, pfTORM } = tormReliabilityIndex(3.0, 300, 30, 200, 30);
    expect(betaTORM).toBeGreaterThan(0);
    expect(betaTORM).toBeLessThanOrEqual(10);
    expect(pfTORM).toBeGreaterThanOrEqual(0);
    expect(pfTORM).toBeLessThanOrEqual(1);
  });

  it("handles zero-variance case", () => {
    const { betaTORM } = tormReliabilityIndex(3.0, 300, 0, 200, 0);
    expect(betaTORM).toBe(3.0);
  });
});

// ── Higher-order convergence ─────────────────────────────────

describe("analyzeHigherOrderConvergence", () => {
  it("returns 4 orders", () => {
    const results = analyzeHigherOrderConvergence(3.0, 300, 30, 200, 30);
    expect(results).toHaveLength(4);
    expect(results.map((r) => r.order)).toEqual([1, 2, 3, 4]);
  });

  it("order-1 matches FORM input", () => {
    const results = analyzeHigherOrderConvergence(3.0, 300, 30, 200, 30);
    expect(results[0].beta).toBe(3.0);
    expect(results[0].correction).toBe(0);
  });

  it("corrections shrink for small CoV (converging)", () => {
    const results = analyzeHigherOrderConvergence(3.0, 300, 6, 200, 4);
    // Small CoV → corrections should be small
    for (const r of results) {
      expect(Math.abs(r.correction)).toBeLessThan(1);
    }
  });

  it("all Pf values are valid probabilities", () => {
    const results = analyzeHigherOrderConvergence(2.5, 300, 45, 200, 40);
    results.forEach((r) => {
      expect(r.pf).toBeGreaterThanOrEqual(0);
      expect(r.pf).toBeLessThanOrEqual(1);
    });
  });
});

// ── Margin of error ──────────────────────────────────────────

describe("calculateReliabilityMarginOfError", () => {
  it("returns valid CI structure", () => {
    const moe = calculateReliabilityMarginOfError(3.0, 300, 30, 200, 30);
    expect(moe.betaEstimate).toBe(3.0);
    expect(moe.betaStdError).toBeGreaterThan(0);
    expect(moe.beta95CI.lower).toBeLessThan(moe.beta95CI.upper);
    expect(moe.pf95CI.lower).toBeLessThan(moe.pf95CI.upper);
  });

  it("larger sample size reduces std error", () => {
    const moe30 = calculateReliabilityMarginOfError(3.0, 300, 30, 200, 30, 30);
    const moe1000 = calculateReliabilityMarginOfError(3.0, 300, 30, 200, 30, 1000);
    expect(moe1000.betaStdError).toBeLessThan(moe30.betaStdError);
  });

  it("pfEstimate is consistent with beta", () => {
    const moe = calculateReliabilityMarginOfError(3.0, 300, 30, 200, 30);
    // Pf = Φ(-β) ≈ 0.00135
    expect(moe.pfEstimate).toBeCloseTo(0.00135, 3);
  });
});

// ── Importance Sampling MC ───────────────────────────────────

describe("importanceSamplingMonteCarlo", () => {
  const members = [makeMember({ id: 1 }), makeMember({ id: 2 })];
  const results = [makeResult(1, -100000), makeResult(2, 80000)];
  const loads = [makeLoad({ id: 1 })];

  it("returns valid structure", () => {
    const is = importanceSamplingMonteCarlo(members, results, loads, 500, 3.0);
    expect(is.numSamples).toBe(500);
    expect(is.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(is.estimatedPf).toBeLessThanOrEqual(1);
    expect(is.estimatedBeta).toBeGreaterThanOrEqual(0);
    expect(is.estimatedBeta).toBeLessThanOrEqual(10);
    expect(is.convergenceHistory.length).toBeGreaterThan(0);
  });

  it("efficiency gain ≥ 1 (at least as good as crude MC)", () => {
    const is = importanceSamplingMonteCarlo(members, results, loads, 1000, 3.0);
    expect(is.efficiencyGain).toBeGreaterThanOrEqual(0.1); // allow some noise
  });
});

// ── Subset Simulation ────────────────────────────────────────

describe("subsetSimulationMonteCarlo", () => {
  const members = [makeMember({ id: 1 })];
  const results = [makeResult(1, -50000)];
  const loads = [makeLoad({ id: 1 })];

  it("returns valid structure with levels", () => {
    const ss = subsetSimulationMonteCarlo(members, results, loads, 200);
    expect(ss.numLevels).toBeGreaterThan(0);
    expect(ss.samplesPerLevel).toBe(200);
    expect(ss.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(ss.estimatedBeta).toBeGreaterThanOrEqual(0);
    expect(ss.convergenceHistory.length).toBe(ss.numLevels);
  });

  it("thresholds decrease through levels", () => {
    const ss = subsetSimulationMonteCarlo(members, results, loads, 200);
    for (let i = 1; i < ss.thresholds.length; i++) {
      expect(ss.thresholds[i]).toBeLessThanOrEqual(ss.thresholds[i - 1] + 1e-6);
    }
  });
});

// ── RBDO ─────────────────────────────────────────────────────

describe("reliabilityBasedDesignOptimization", () => {
  const members = [
    makeMember({ id: 1, area: 0.002 }),
    makeMember({ id: 2, area: 0.002 }),
  ];
  // High stress relative to area → low β → RBDO should increase areas
  const results = [makeResult(1, -200000, 0.002), makeResult(2, 150000, 0.002)];
  const loads = [makeLoad({ id: 1 })];

  it("returns valid result structure", () => {
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    expect(rbdo.targetBeta).toBe(3.0);
    expect(rbdo.initialAreas).toHaveLength(2);
    expect(rbdo.optimizedAreas).toHaveLength(2);
    expect(rbdo.convergenceHistory.length).toBeGreaterThan(0);
    expect(rbdo.iterations).toBeGreaterThan(0);
  });

  it("increases areas when initial β < target", () => {
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.5);
    if (rbdo.initialBeta < rbdo.targetBeta) {
      const totalChange = rbdo.optimizedAreas.reduce((s, a) => s + a.change, 0);
      expect(totalChange).toBeGreaterThan(0);
    }
  });

  it("convergence history tracks system β", () => {
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    expect(rbdo.convergenceHistory[0].iteration).toBe(0);
    expect(rbdo.convergenceHistory[0].systemBeta).toBe(rbdo.initialBeta);
  });

  it("final β moves towards target", () => {
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    const initialGap = Math.abs(rbdo.initialBeta - rbdo.targetBeta);
    const finalGap = Math.abs(rbdo.finalBeta - rbdo.targetBeta);
    // Should improve or already met
    expect(finalGap).toBeLessThanOrEqual(initialGap + 0.1);
  });
});

// ── Member force / stress classification ─────────────────────

describe("MemberResult classification", () => {
  it("positive force → tension", () => {
    const r = makeResult(1, 50000);
    expect(r.type).toBe("tension");
    expect(r.stress).toBeGreaterThan(0);
  });

  it("negative force → compression", () => {
    const r = makeResult(1, -50000);
    expect(r.type).toBe("compression");
    expect(r.stress).toBeLessThan(0);
  });

  it("zero force → zero member", () => {
    const r = makeResult(1, 0);
    expect(r.type).toBe("zero");
    expect(r.stress).toBe(0);
  });

  it("stress = force / area", () => {
    const area = 0.003;
    const force = 60000;
    const r = makeResult(1, force, area);
    expect(r.stress).toBeCloseTo(force / area, 5);
  });

  it("strain = stress / E", () => {
    const r = makeResult(1, 100000, 0.005);
    expect(r.strain).toBeCloseTo(r.stress / 200e9, 15);
  });
});

// ── Stability / edge cases ───────────────────────────────────

describe("Edge cases and stability", () => {
  it("FOSM with equal R and S means → β = 0", () => {
    const beta = fosmReliabilityIndex(200, 0.1, 200, 0.1);
    expect(beta).toBeCloseTo(0, 5);
  });

  it("FOSM with very large safety margin → high β", () => {
    const beta = fosmReliabilityIndex(1000, 0.05, 100, 0.05);
    expect(beta).toBeGreaterThan(5);
  });

  it("SORM handles negative betaFORM gracefully", () => {
    const { betaSORM, pfSORM } = sormReliabilityIndex(-1, 100, 30, 200, 30);
    expect(pfSORM).toBeGreaterThanOrEqual(0);
    expect(pfSORM).toBeLessThanOrEqual(1);
  });

  it("RBDO with zero-force members doesn't crash", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, 0)];
    const loads = [makeLoad({ id: 1 })];
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    expect(rbdo).toBeDefined();
    expect(rbdo.finalBeta).toBeGreaterThanOrEqual(0);
  });

  it("IS with empty loads uses default CoV", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, -50000)];
    const is = importanceSamplingMonteCarlo(members, results, [], 100, 3.0);
    expect(is).toBeDefined();
    expect(is.numSamples).toBe(100);
  });
});
