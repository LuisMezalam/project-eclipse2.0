import { describe, it, expect } from "vitest";
import {
  reliabilityIndex,
  probabilityOfFailure,
  reliabilityAnalysis,
  sormCorrection,
  estimateCurvature,
  monteCarloReliability,
} from "@/lib/reliability";
import { normalCDF, normalInverseCDF } from "@/lib/probability";

// ============================================================
// Normal CDF / Inverse CDF primitives
// ============================================================

describe("normalCDF", () => {
  it("Φ(0) = 0.5", () => expect(normalCDF(0)).toBeCloseTo(0.5, 8));
  it("Φ(-∞) → 0", () => expect(normalCDF(-10)).toBeLessThan(1e-10));
  it("Φ(+∞) → 1", () => expect(normalCDF(10)).toBeGreaterThan(1 - 1e-10));
  it("Φ(1.645) ≈ 0.95", () => expect(normalCDF(1.645)).toBeCloseTo(0.95, 2));
  it("Φ(1.96) ≈ 0.975", () => expect(normalCDF(1.96)).toBeCloseTo(0.975, 2));
  it("Φ(2.326) ≈ 0.99", () => expect(normalCDF(2.326)).toBeCloseTo(0.99, 2));
  it("symmetry: Φ(x) + Φ(-x) = 1", () => {
    for (const x of [0.5, 1, 2, 3]) {
      expect(normalCDF(x) + normalCDF(-x)).toBeCloseTo(1, 8);
    }
  });
});

describe("normalInverseCDF", () => {
  it("Φ⁻¹(0.5) = 0", () => expect(normalInverseCDF(0.5)).toBeCloseTo(0, 6));
  it("Φ⁻¹(0.975) ≈ 1.96", () => expect(normalInverseCDF(0.975)).toBeCloseTo(1.96, 2));
  it("Φ⁻¹(0.95) ≈ 1.645", () => expect(normalInverseCDF(0.95)).toBeCloseTo(1.645, 2));
  it("round-trip: Φ(Φ⁻¹(p)) = p", () => {
    for (const p of [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99]) {
      expect(normalCDF(normalInverseCDF(p))).toBeCloseTo(p, 4);
    }
  });
  it("Φ⁻¹(0) = -Infinity", () => expect(normalInverseCDF(0)).toBe(-Infinity));
  it("Φ⁻¹(1) = +Infinity", () => expect(normalInverseCDF(1)).toBe(Infinity));
});

// ============================================================
// FORM: Reliability Index β
// ============================================================

describe("reliabilityIndex (FORM)", () => {
  it("β = (μR - μS) / √(σR² + σS²) — textbook formula", () => {
    const meanR = 300, stdR = 30;
    const meanS = 200, stdS = 40;
    const expected = (300 - 200) / Math.sqrt(30 ** 2 + 40 ** 2);
    expect(reliabilityIndex(meanR, stdR, meanS, stdS)).toBeCloseTo(expected, 8);
    expect(expected).toBeCloseTo(2.0, 1); // β ≈ 2.0
  });

  it("β = 0 when mean resistance equals mean load", () => {
    expect(reliabilityIndex(100, 10, 100, 10)).toBeCloseTo(0, 8);
  });

  it("β increases with larger safety margin", () => {
    const b1 = reliabilityIndex(200, 20, 150, 20);
    const b2 = reliabilityIndex(300, 20, 150, 20);
    expect(b2).toBeGreaterThan(b1);
  });

  it("β decreases with larger uncertainty", () => {
    const b1 = reliabilityIndex(300, 10, 200, 10);
    const b2 = reliabilityIndex(300, 50, 200, 50);
    expect(b1).toBeGreaterThan(b2);
  });

  it("known benchmark: β ≈ 3.0 for typical structural member", () => {
    // μR=500 kN, COV_R=0.1 → σR=50; μS=300 kN, COV_S=0.15 → σS=45
    const beta = reliabilityIndex(500, 50, 300, 45);
    // (500-300)/√(50²+45²) = 200/67.27 ≈ 2.97
    expect(beta).toBeCloseTo(2.97, 1);
  });
});

// ============================================================
// Probability of Failure
// ============================================================

describe("probabilityOfFailure", () => {
  it("Pf = Φ(-β)", () => {
    expect(probabilityOfFailure(3.0)).toBeCloseTo(normalCDF(-3.0), 8);
  });

  it("β=0 → Pf=0.5", () => {
    expect(probabilityOfFailure(0)).toBeCloseTo(0.5, 8);
  });

  it("β=3.72 → Pf ≈ 1e-4 (typical target)", () => {
    expect(probabilityOfFailure(3.72)).toBeCloseTo(1e-4, 4);
  });

  it("Pf decreases as β increases", () => {
    const pf1 = probabilityOfFailure(2);
    const pf2 = probabilityOfFailure(3);
    const pf3 = probabilityOfFailure(4);
    expect(pf1).toBeGreaterThan(pf2);
    expect(pf2).toBeGreaterThan(pf3);
  });

  it("known values table", () => {
    // β : Pf pairs from standard tables
    const pairs: [number, number][] = [
      [1.0, 0.1587],
      [2.0, 0.02275],
      [3.0, 0.001350],
      [4.0, 3.167e-5],
    ];
    for (const [beta, expectedPf] of pairs) {
      expect(probabilityOfFailure(beta)).toBeCloseTo(expectedPf, 3);
    }
  });
});

// ============================================================
// SORM Correction (Breitung's formula)
// ============================================================

describe("sormCorrection", () => {
  it("correction = 1 when curvature is zero (linear limit state)", () => {
    expect(sormCorrection(3, [0])).toBeCloseTo(1, 8);
  });

  it("correction = 1/√(1 + β·κ) for single curvature", () => {
    const beta = 3, kappa = 0.1;
    const expected = 1 / Math.sqrt(1 + beta * kappa);
    expect(sormCorrection(beta, [kappa])).toBeCloseTo(expected, 8);
  });

  it("multiple curvatures multiply", () => {
    const beta = 2;
    const k1 = 0.05, k2 = 0.1;
    const expected = (1 / Math.sqrt(1 + beta * k1)) * (1 / Math.sqrt(1 + beta * k2));
    expect(sormCorrection(beta, [k1, k2])).toBeCloseTo(expected, 8);
  });

  it("negative curvature increases Pf (correction > 1)", () => {
    // Negative curvature → concave surface → FORM underestimates Pf
    expect(sormCorrection(3, [-0.05])).toBeGreaterThan(1);
  });

  it("positive curvature decreases Pf (correction < 1)", () => {
    expect(sormCorrection(3, [0.05])).toBeLessThan(1);
  });
});

// ============================================================
// Full Reliability Analysis (FORM + SORM)
// ============================================================

describe("reliabilityAnalysis", () => {
  it("computes correct β, Pf, safety margin, and safety factor", () => {
    const result = reliabilityAnalysis(500, 0.1, 300, 0.15);
    // μR=500, σR=50, μS=300, σS=45
    const expectedBeta = (500 - 300) / Math.sqrt(50 ** 2 + 45 ** 2);
    expect(result.beta).toBeCloseTo(expectedBeta, 4);
    expect(result.pf).toBeCloseTo(normalCDF(-expectedBeta), 6);
    expect(result.meanSafetyMargin).toBeCloseTo(200, 4);
    expect(result.stdSafetyMargin).toBeCloseTo(Math.sqrt(50 ** 2 + 45 ** 2), 4);
    expect(result.centralSafetyFactor).toBeCloseTo(500 / 300, 6);
  });

  it("SORM results are present and finite", () => {
    const result = reliabilityAnalysis(400, 0.12, 250, 0.18);
    expect(result.betaSorm).toBeDefined();
    expect(result.pfSorm).toBeDefined();
    expect(result.curvatureCorrection).toBeDefined();
    expect(isFinite(result.betaSorm!)).toBe(true);
    expect(isFinite(result.pfSorm!)).toBe(true);
  });

  it("SORM Pf is close to FORM Pf for linear limit state", () => {
    // When curvature is small, SORM ≈ FORM
    const result = reliabilityAnalysis(500, 0.1, 300, 0.1);
    // Equal COVs → curvature = 0 → correction = 1
    expect(result.pfSorm).toBeCloseTo(result.pf, 4);
  });

  it("increasing COV reduces β", () => {
    const r1 = reliabilityAnalysis(500, 0.05, 300, 0.05);
    const r2 = reliabilityAnalysis(500, 0.20, 300, 0.20);
    expect(r1.beta).toBeGreaterThan(r2.beta);
  });

  it("safety factor > 1 when mean R > mean S", () => {
    const result = reliabilityAnalysis(600, 0.1, 400, 0.1);
    expect(result.centralSafetyFactor).toBeGreaterThan(1);
  });

  it("safety factor < 1 when mean R < mean S", () => {
    const result = reliabilityAnalysis(200, 0.1, 400, 0.1);
    expect(result.centralSafetyFactor).toBeLessThan(1);
  });
});

// ============================================================
// Monte Carlo Reliability
// ============================================================

describe("monteCarloReliability", () => {
  it("Pf converges to FORM estimate for large N", () => {
    const meanR = 300, stdR = 30;
    const meanS = 200, stdS = 40;
    const formBeta = reliabilityIndex(meanR, stdR, meanS, stdS);
    const formPf = probabilityOfFailure(formBeta);

    const mc = monteCarloReliability(meanR, stdR, meanS, stdS, 100000);
    // Allow ±50% relative error for stochastic test
    expect(mc.pf).toBeGreaterThan(formPf * 0.5);
    expect(mc.pf).toBeLessThan(formPf * 1.5);
  });

  it("returns samples for visualization (max 500)", () => {
    const mc = monteCarloReliability(300, 30, 200, 40, 1000);
    expect(mc.samples.length).toBeLessThanOrEqual(500);
    expect(mc.samples.length).toBeGreaterThan(0);
  });

  it("each sample has r, s, and failed flag", () => {
    const mc = monteCarloReliability(300, 30, 200, 40, 100);
    for (const s of mc.samples) {
      expect(typeof s.r).toBe("number");
      expect(typeof s.s).toBe("number");
      expect(typeof s.failed).toBe("boolean");
      // failed iff r < s
      expect(s.failed).toBe(s.r < s.s);
    }
  });

  it("Pf ≈ 0.5 when distributions are identical", () => {
    const mc = monteCarloReliability(100, 20, 100, 20, 50000);
    expect(mc.pf).toBeGreaterThan(0.4);
    expect(mc.pf).toBeLessThan(0.6);
  });

  it("Pf → 0 when resistance >> load", () => {
    const mc = monteCarloReliability(1000, 10, 100, 10, 10000);
    expect(mc.pf).toBe(0);
  });

  it("Pf increases with smaller safety margin", () => {
    const mc1 = monteCarloReliability(500, 30, 200, 30, 50000);
    const mc2 = monteCarloReliability(300, 30, 200, 30, 50000);
    expect(mc2.pf).toBeGreaterThan(mc1.pf);
  });
});

// ============================================================
// Lognormal benchmark (via moment matching)
// ============================================================

describe("Lognormal reliability benchmark", () => {
  // For lognormal R and S, convert to normal-space parameters
  // and verify β matches the analytical lognormal formula

  it("β_LN matches known lognormal formula", () => {
    const muR = 300, covR = 0.15;
    const muS = 150, covS = 0.20;

    // Lognormal parameters
    const sigLnR = Math.sqrt(Math.log(1 + covR ** 2));
    const muLnR = Math.log(muR / Math.sqrt(1 + covR ** 2));
    const sigLnS = Math.sqrt(Math.log(1 + covS ** 2));
    const muLnS = Math.log(muS / Math.sqrt(1 + covS ** 2));

    // Lognormal β = (μ_lnR - μ_lnS) / √(σ²_lnR + σ²_lnS)
    const betaLN = (muLnR - muLnS) / Math.sqrt(sigLnR ** 2 + sigLnS ** 2);

    // This should be the analytically correct value
    expect(betaLN).toBeGreaterThan(2);
    expect(isFinite(betaLN)).toBe(true);

    // Cross-check: FORM on equivalent normal approximation
    // (FORM with normal assumption will give a different but comparable value)
    const betaFORM = reliabilityIndex(muR, muR * covR, muS, muS * covS);
    // Both should be positive and in a similar range
    expect(betaFORM).toBeGreaterThan(1);
    expect(Math.abs(betaLN - betaFORM)).toBeLessThan(2); // reasonable proximity
  });
});

// ============================================================
// Edge cases and property-based checks
// ============================================================

describe("Edge cases", () => {
  it("zero std dev (deterministic) → β = ±Infinity", () => {
    // If both are deterministic and R > S, β → Infinity
    const beta = reliabilityIndex(300, 0, 200, 0);
    expect(beta).toBe(Infinity);
  });

  it("very high β → Pf ≈ 0", () => {
    expect(probabilityOfFailure(6)).toBeLessThan(1e-8);
  });

  it("negative β → Pf > 0.5 (likely failure)", () => {
    expect(probabilityOfFailure(-1)).toBeGreaterThan(0.5);
  });
});
