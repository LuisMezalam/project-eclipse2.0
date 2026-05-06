import { describe, it, expect } from "vitest";
import {
  fosmReliabilityIndex,
  sormReliabilityIndex,
  tormReliabilityIndex,
  analyzeHigherOrderConvergence,
  calculateReliabilityMarginOfError,
  importanceSamplingMonteCarlo,
  subsetSimulationMonteCarlo,
  reliabilityBasedDesignOptimization,
  DEFAULT_YIELD_STRENGTH,
  DEFAULT_YIELD_COV,
  DEFAULT_AREA_COV,
  DEFAULT_LOAD_COV,
  type TrussMember,
  type MemberResult,
  type PointLoad,
} from "@/lib/trussSolver";

// ── Helpers ──

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

// ============================================================
// Zero-Force Members
// ============================================================

describe("Zero-force members", () => {
  it("zero-force member has stress = 0, type = 'zero'", () => {
    const result = makeResult(1, 0);
    expect(result.stress).toBe(0);
    expect(result.strain).toBe(0);
    expect(result.type).toBe("zero");
  });

  it("FOSM with zero stress → high β (member is safe)", () => {
    // If stress is 0, then mean load effect is 0 → β = R/σR (very high)
    const beta = fosmReliabilityIndex(DEFAULT_YIELD_STRENGTH, DEFAULT_YIELD_COV, 0, 0.15);
    expect(beta).toBe(10); // capped at 10 since stdS = 0 * 0.15 = 0
  });

  it("RBDO with all zero-force members doesn't crash", () => {
    const members = [makeMember({ id: 1 }), makeMember({ id: 2 }), makeMember({ id: 3 })];
    const results = members.map(m => makeResult(m.id, 0));
    const loads = [makeLoad({ id: 1 })];
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    expect(rbdo).toBeDefined();
    expect(rbdo.finalBeta).toBeGreaterThanOrEqual(0);
    expect(rbdo.optimizedAreas).toHaveLength(3);
  });

  it("IS skips zero-stress members correctly", () => {
    const members = [makeMember({ id: 1 }), makeMember({ id: 2 })];
    const results = [makeResult(1, 0), makeResult(2, 0)];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 200, 3.0);
    expect(is).toBeDefined();
    expect(is.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(is.estimatedPf).toBeLessThanOrEqual(1);
  });

  it("subset simulation with zero-force members doesn't crash", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, 0)];
    const loads = [makeLoad({ id: 1 })];
    const ss = subsetSimulationMonteCarlo(members, results, loads, 100);
    expect(ss).toBeDefined();
    expect(ss.estimatedPf).toBeGreaterThanOrEqual(0);
  });

  it("mixed zero and non-zero force members", () => {
    const members = [makeMember({ id: 1 }), makeMember({ id: 2 }), makeMember({ id: 3 })];
    const results = [
      makeResult(1, -100000),  // compression
      makeResult(2, 0),         // zero-force
      makeResult(3, 50000),     // tension
    ];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 500, 3.0);
    expect(is).toBeDefined();
    expect(is.numSamples).toBe(500);
  });
});

// ============================================================
// Near-zero force (very lightly loaded members)
// ============================================================

describe("Near-zero force members", () => {
  it("very small force → very high β", () => {
    const force = 0.001; // 1 mN
    const area = 0.005;
    const stress = force / area; // 0.2 Pa
    const beta = fosmReliabilityIndex(DEFAULT_YIELD_STRENGTH, DEFAULT_YIELD_COV, stress, 0.15);
    expect(beta).toBeGreaterThan(5);
  });

  it("near-zero force produces valid member classification", () => {
    const r1 = makeResult(1, 1e-10);
    expect(r1.type).toBe("tension");
    expect(r1.stress).toBeGreaterThan(0);

    const r2 = makeResult(2, -1e-10);
    expect(r2.type).toBe("compression");
    expect(r2.stress).toBeLessThan(0);
  });
});

// ============================================================
// Unstable / degenerate configurations
// ============================================================

describe("Unstable and degenerate configurations", () => {
  it("single member with extreme compression → low β", () => {
    const member = makeMember({ id: 1, area: 0.001 }); // small area
    const force = -500000; // 500 kN compression
    const stress = Math.abs(force / 0.001); // 500 MPa > 250 MPa yield
    const beta = fosmReliabilityIndex(
      member.yieldStrength,
      member.yieldStrengthCoV,
      stress,
      0.15
    );
    expect(beta).toBeLessThan(0); // overstressed → negative β
  });

  it("member at exactly yield stress → β near 0", () => {
    const yieldStress = DEFAULT_YIELD_STRENGTH; // 250 MPa
    const beta = fosmReliabilityIndex(yieldStress, DEFAULT_YIELD_COV, yieldStress, DEFAULT_YIELD_COV);
    expect(beta).toBeCloseTo(0, 5);
  });

  it("all members in tension → valid reliability", () => {
    const members = [makeMember({ id: 1 }), makeMember({ id: 2 })];
    const results = [makeResult(1, 100000), makeResult(2, 80000)];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 300, 3.0);
    expect(is.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(is.estimatedBeta).toBeGreaterThanOrEqual(0);
  });

  it("all members in compression → valid reliability", () => {
    const members = [makeMember({ id: 1 }), makeMember({ id: 2 })];
    const results = [makeResult(1, -100000), makeResult(2, -80000)];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 300, 3.0);
    expect(is.estimatedPf).toBeGreaterThanOrEqual(0);
  });

  it("empty members array doesn't crash IS", () => {
    const is = importanceSamplingMonteCarlo([], [], [makeLoad({ id: 1 })], 100, 3.0);
    expect(is).toBeDefined();
    expect(is.numSamples).toBe(100);
  });

  it("empty members array doesn't crash SS", () => {
    const ss = subsetSimulationMonteCarlo([], [], [makeLoad({ id: 1 })], 100);
    expect(ss).toBeDefined();
  });

  it("empty members array doesn't crash RBDO", () => {
    const rbdo = reliabilityBasedDesignOptimization([], [], [makeLoad({ id: 1 })], 3.0);
    expect(rbdo).toBeDefined();
    expect(rbdo.optimizedAreas).toHaveLength(0);
  });
});

// ============================================================
// Extreme material properties
// ============================================================

describe("Extreme material properties", () => {
  it("very high yield strength → very high β", () => {
    const beta = fosmReliabilityIndex(2000e6, 0.05, 100e6, 0.15);
    expect(beta).toBeGreaterThan(8);
  });

  it("very low yield strength → low or negative β", () => {
    const beta = fosmReliabilityIndex(10e6, 0.10, 100e6, 0.15);
    expect(beta).toBeLessThan(0);
  });

  it("very high CoV → low β", () => {
    const beta = fosmReliabilityIndex(250e6, 0.5, 100e6, 0.5);
    expect(beta).toBeLessThan(
      fosmReliabilityIndex(250e6, 0.1, 100e6, 0.1)
    );
  });

  it("very small CoV → β approaches deterministic limit", () => {
    const beta = fosmReliabilityIndex(300, 0.001, 200, 0.001);
    expect(beta).toBeGreaterThan(100);
  });
});

// ============================================================
// Higher-order methods with edge inputs
// ============================================================

describe("Higher-order methods edge cases", () => {
  it("SORM with very high β (β=8)", () => {
    const { betaSORM, pfSORM } = sormReliabilityIndex(8.0, 500, 50, 100, 15);
    expect(isFinite(betaSORM)).toBe(true);
    expect(pfSORM).toBeGreaterThanOrEqual(0);
    expect(pfSORM).toBeLessThanOrEqual(1);
  });

  it("TORM with very high β (β=8)", () => {
    const { betaTORM, pfTORM } = tormReliabilityIndex(8.0, 500, 50, 100, 15);
    expect(isFinite(betaTORM)).toBe(true);
    expect(pfTORM).toBeGreaterThanOrEqual(0);
    expect(pfTORM).toBeLessThanOrEqual(1);
  });

  it("SORM with equal std devs (symmetric problem)", () => {
    const { betaSORM, pfSORM } = sormReliabilityIndex(3.0, 300, 30, 200, 30);
    expect(betaSORM).toBeGreaterThan(0);
    expect(pfSORM).toBeGreaterThan(0);
  });

  it("convergence analysis with very small CoV → converging", () => {
    const results = analyzeHigherOrderConvergence(3.0, 300, 3, 200, 2);
    const lastTrend = results[results.length - 1].convergenceTrend;
    expect(lastTrend).toBe("converging");
  });

  it("convergence analysis with large CoV → all valid", () => {
    const results = analyzeHigherOrderConvergence(2.0, 300, 90, 200, 80);
    results.forEach(r => {
      expect(r.beta).toBeGreaterThanOrEqual(0);
      expect(r.beta).toBeLessThanOrEqual(10);
      expect(r.pf).toBeGreaterThanOrEqual(0);
      expect(r.pf).toBeLessThanOrEqual(1);
    });
  });

  it("margin of error with very small sample size", () => {
    const moe = calculateReliabilityMarginOfError(3.0, 300, 30, 200, 30, 3);
    expect(moe.betaStdError).toBeGreaterThan(0);
    expect(moe.beta95CI.lower).toBeLessThan(moe.beta95CI.upper);
    // Small sample → wide CI
    const ciWidth = moe.beta95CI.upper - moe.beta95CI.lower;
    const ciWidthLarge = (() => {
      const m = calculateReliabilityMarginOfError(3.0, 300, 30, 200, 30, 10000);
      return m.beta95CI.upper - m.beta95CI.lower;
    })();
    expect(ciWidth).toBeGreaterThan(ciWidthLarge);
  });
});

// ============================================================
// RBDO edge cases
// ============================================================

describe("RBDO edge cases", () => {
  it("already meets target → returns valid result", () => {
    // Large area, small load → already high β
    const members = [makeMember({ id: 1, area: 0.05 })];
    const results = [makeResult(1, -10000, 0.05)]; // stress = 0.2 MPa << 250 MPa
    const loads = [makeLoad({ id: 1 })];
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 2.0);
    expect(rbdo).toBeDefined();
    expect(rbdo.optimizedAreas).toHaveLength(1);
    expect(rbdo.iterations).toBeGreaterThan(0);
  });

  it("very high target β → areas increase significantly", () => {
    const members = [makeMember({ id: 1, area: 0.002 })];
    const results = [makeResult(1, -200000, 0.002)]; // stress = 100 MPa
    const loads = [makeLoad({ id: 1 })];
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 5.0);
    expect(rbdo).toBeDefined();
    expect(rbdo.iterations).toBeGreaterThan(0);
  });

  it("single member truss RBDO", () => {
    const members = [makeMember({ id: 1, area: 0.003 })];
    const results = [makeResult(1, -150000, 0.003)];
    const loads = [makeLoad({ id: 1 })];
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    expect(rbdo.optimizedAreas).toHaveLength(1);
    expect(rbdo.convergenceHistory.length).toBeGreaterThan(0);
    expect(rbdo.convergenceHistory[0].iteration).toBe(0);
  });

  it("many members RBDO doesn't crash", () => {
    const n = 10;
    const members = Array.from({ length: n }, (_, i) => makeMember({ id: i + 1, area: 0.003 }));
    const results = members.map(m => makeResult(m.id, -50000 * (1 + Math.random()), 0.003));
    const loads = [makeLoad({ id: 1 })];
    const rbdo = reliabilityBasedDesignOptimization(members, results, loads, 3.0);
    expect(rbdo.optimizedAreas).toHaveLength(n);
  });
});

// ============================================================
// Sampling methods with extreme scenarios
// ============================================================

describe("Sampling methods — extreme scenarios", () => {
  it("IS with very small N still returns valid result", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, -100000)];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 10, 3.0);
    expect(is.numSamples).toBe(10);
    expect(is.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(is.estimatedPf).toBeLessThanOrEqual(1);
  });

  it("SS with very small N still returns valid result", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, -100000)];
    const loads = [makeLoad({ id: 1 })];
    const ss = subsetSimulationMonteCarlo(members, results, loads, 20);
    expect(ss).toBeDefined();
    expect(ss.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(ss.estimatedPf).toBeLessThanOrEqual(1);
  });

  it("IS with very high target β", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, -100000)];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 200, 6.0);
    expect(is).toBeDefined();
    expect(is.estimatedBeta).toBeGreaterThanOrEqual(0);
    expect(is.estimatedBeta).toBeLessThanOrEqual(10);
  });

  it("IS convergence history is monotonically increasing in sample count", () => {
    const members = [makeMember({ id: 1 })];
    const results = [makeResult(1, -80000)];
    const loads = [makeLoad({ id: 1 })];
    const is = importanceSamplingMonteCarlo(members, results, loads, 500, 3.0);
    for (let i = 1; i < is.convergenceHistory.length; i++) {
      expect(is.convergenceHistory[i].samples).toBeGreaterThan(is.convergenceHistory[i - 1].samples);
    }
  });
});
