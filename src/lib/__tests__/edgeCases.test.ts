import { describe, it, expect } from "vitest";
import {
  reliabilityIndex,
  probabilityOfFailure,
  reliabilityAnalysis,
  monteCarloReliability,
  sormCorrection,
  analyzeDynamicResponse,
} from "@/lib/reliability";
import {
  analyzeSimplySupported,
  analyzeCantilever,
  calculateCrossSectionProperties,
  type LoadConfig,
  type CrossSectionDimensions,
} from "@/lib/beamAnalysis";
import { normalCDF, normalInverseCDF } from "@/lib/probability";

// ============================================================
// Edge cases: near-zero standard deviation
// ============================================================

describe("Edge: near-zero std dev", () => {
  it("β is extremely large when both σR and σS → 0 and μR > μS", () => {
    const beta = reliabilityIndex(300, 1e-15, 200, 1e-15);
    expect(beta).toBeGreaterThan(1e10);
  });

  it("β is extremely negative when μR < μS and σ → 0", () => {
    const beta = reliabilityIndex(100, 1e-15, 200, 1e-15);
    expect(beta).toBeLessThan(-1e10);
  });

  it("Pf → 0 for very large β", () => {
    expect(probabilityOfFailure(10)).toBeLessThan(1e-20);
    expect(probabilityOfFailure(8)).toBeLessThan(1e-14);
  });

  it("Pf → 1 for very negative β", () => {
    expect(probabilityOfFailure(-10)).toBeGreaterThan(1 - 1e-10);
  });

  it("reliabilityAnalysis handles near-zero COV gracefully", () => {
    const result = reliabilityAnalysis(500, 0.001, 300, 0.001);
    expect(result.beta).toBeGreaterThan(100);
    expect(result.pf).toBeLessThan(1e-10);
    expect(isFinite(result.meanSafetyMargin)).toBe(true);
  });
});

// ============================================================
// Edge cases: very high β
// ============================================================

describe("Edge: very high β values", () => {
  it("β = 6 → Pf ≈ 9.87e-10", () => {
    const pf = probabilityOfFailure(6);
    expect(pf).toBeLessThan(1e-8);
    expect(pf).toBeGreaterThan(1e-11);
  });

  it("β = 8 → Pf < 1e-14", () => {
    expect(probabilityOfFailure(8)).toBeLessThan(1e-14);
  });

  it("SORM correction is finite for high β", () => {
    const corr = sormCorrection(6, [0.01]);
    expect(isFinite(corr)).toBe(true);
    expect(corr).toBeGreaterThan(0);
  });

  it("reliabilityAnalysis with large safety margin", () => {
    const result = reliabilityAnalysis(10000, 0.05, 100, 0.05);
    expect(result.beta).toBeGreaterThan(10);
    expect(result.pf).toBeLessThan(1e-10);
    expect(result.centralSafetyFactor).toBeCloseTo(100, 0);
  });

  it("Monte Carlo returns Pf=0 when resistance >> load (no failures observable)", () => {
    const mc = monteCarloReliability(10000, 10, 100, 10, 10000);
    expect(mc.pf).toBe(0);
  });
});

// ============================================================
// Edge cases: negative means
// ============================================================

describe("Edge: negative means", () => {
  it("negative μR < μS → negative β (likely failure)", () => {
    const beta = reliabilityIndex(-50, 20, 100, 20);
    expect(beta).toBeLessThan(0);
  });

  it("both negative means, μR > μS → positive β", () => {
    const beta = reliabilityIndex(-10, 5, -100, 5);
    expect(beta).toBeGreaterThan(0);
  });

  it("Pf > 0.5 when β < 0", () => {
    const beta = reliabilityIndex(100, 20, 200, 20);
    expect(beta).toBeLessThan(0);
    expect(probabilityOfFailure(beta)).toBeGreaterThan(0.5);
  });

  it("reliabilityAnalysis with negative safety margin", () => {
    const result = reliabilityAnalysis(100, 0.10, 200, 0.10);
    expect(result.beta).toBeLessThan(0);
    expect(result.pf).toBeGreaterThan(0.5);
    expect(result.meanSafetyMargin).toBeLessThan(0);
    expect(result.centralSafetyFactor).toBeLessThan(1);
  });
});

// ============================================================
// Edge cases: equal means (β = 0)
// ============================================================

describe("Edge: equal means", () => {
  it("β = 0 when μR = μS", () => {
    expect(reliabilityIndex(100, 10, 100, 10)).toBeCloseTo(0, 10);
  });

  it("Pf = 0.5 when β = 0", () => {
    expect(probabilityOfFailure(0)).toBeCloseTo(0.5, 8);
  });

  it("safety factor = 1 when means equal", () => {
    const result = reliabilityAnalysis(300, 0.10, 300, 0.10);
    expect(result.centralSafetyFactor).toBeCloseTo(1, 10);
    expect(result.meanSafetyMargin).toBeCloseTo(0, 10);
  });
});

// ============================================================
// Edge cases: extreme load intensities
// ============================================================

describe("Edge: extreme beam loads", () => {
  const S = 1e-4, E_mod = 200e9, I_mom = 1e-5, beamL = 6;

  it("zero load → zero results", () => {
    const load: LoadConfig = { type: "udl", intensity: 0 };
    const result = analyzeSimplySupported(load, beamL, S, E_mod, I_mom);
    expect(result.totalLoad).toBeCloseTo(0, 10);
    expect(result.maxBendingMoment).toBeCloseTo(0, 10);
    expect(result.maxShear).toBeCloseTo(0, 10);
    expect(result.maxDeflection).toBeCloseTo(0, 10);
  });

  it("very small load produces proportionally small results", () => {
    const r1 = analyzeSimplySupported({ type: "udl", intensity: 1 }, beamL, S, E_mod, I_mom);
    const r2 = analyzeSimplySupported({ type: "udl", intensity: 1000 }, beamL, S, E_mod, I_mom);
    expect(r2.maxBendingMoment / r1.maxBendingMoment).toBeCloseTo(1000, 0);
    expect(r2.maxDeflection / r1.maxDeflection).toBeCloseTo(1000, 0);
  });

  it("very large load produces finite results", () => {
    const load: LoadConfig = { type: "udl", intensity: 1e12 };
    const result = analyzeSimplySupported(load, beamL, S, E_mod, I_mom);
    expect(isFinite(result.maxBendingMoment)).toBe(true);
    expect(isFinite(result.maxDeflection)).toBe(true);
    expect(result.maxBendingMoment).toBeGreaterThan(0);
  });
});

// ============================================================
// Edge cases: extreme cross-section dimensions
// ============================================================

describe("Edge: cross-section edge cases", () => {
  it("very thin rectangular section", () => {
    const dims: CrossSectionDimensions = { type: "rectangular", width: 0.001, height: 0.5 };
    const props = calculateCrossSectionProperties(dims);
    expect(props.area).toBeCloseTo(0.0005, 6);
    expect(props.momentOfInertia).toBeGreaterThan(0);
    expect(isFinite(props.sectionModulus)).toBe(true);
  });

  it("very small circular section", () => {
    const dims: CrossSectionDimensions = { type: "circular", diameter: 0.001 };
    const props = calculateCrossSectionProperties(dims);
    expect(props.area).toBeGreaterThan(0);
    expect(props.momentOfInertia).toBeGreaterThan(0);
  });

  it("hollow circular with thin wall", () => {
    const dims: CrossSectionDimensions = { type: "hollow-circular", diameter: 0.5, innerDiameter: 0.499 };
    const props = calculateCrossSectionProperties(dims);
    expect(props.area).toBeGreaterThan(0);
    expect(props.area).toBeLessThan(Math.PI * 0.25 * 0.25); // less than solid
  });
});

// ============================================================
// Edge cases: normalCDF / normalInverseCDF extremes
// ============================================================

describe("Edge: probability function extremes", () => {
  it("normalCDF at extreme negative returns near-zero", () => {
    expect(normalCDF(-38)).toBeCloseTo(0, 15);
  });

  it("normalCDF at extreme positive returns near-one", () => {
    expect(normalCDF(38)).toBeCloseTo(1, 15);
  });

  it("normalInverseCDF near 0 returns large negative", () => {
    const val = normalInverseCDF(1e-10);
    expect(val).toBeLessThan(-6);
    expect(isFinite(val)).toBe(true);
  });

  it("normalInverseCDF near 1 returns large positive", () => {
    const val = normalInverseCDF(1 - 1e-10);
    expect(val).toBeGreaterThan(6);
    expect(isFinite(val)).toBe(true);
  });

  it("normalInverseCDF(0) = -Infinity", () => {
    expect(normalInverseCDF(0)).toBe(-Infinity);
  });

  it("normalInverseCDF(1) = +Infinity", () => {
    expect(normalInverseCDF(1)).toBe(Infinity);
  });
});

// ============================================================
// Edge cases: SORM with extreme curvatures
// ============================================================

describe("Edge: SORM extreme curvatures", () => {
  it("very large positive curvature → correction near 0", () => {
    const corr = sormCorrection(3, [1.0]);
    expect(corr).toBeLessThan(1);
    expect(corr).toBeGreaterThan(0);
  });

  it("zero curvatures array → correction = 1", () => {
    expect(sormCorrection(3, [])).toBeCloseTo(1, 10);
  });

  it("many small curvatures multiply correctly", () => {
    const curvatures = Array(10).fill(0.01);
    const corr = sormCorrection(3, curvatures);
    const expected = Math.pow(1 / Math.sqrt(1 + 3 * 0.01), 10);
    expect(corr).toBeCloseTo(expected, 8);
  });
});

// ============================================================
// Edge cases: dynamic response extremes
// ============================================================

describe("Edge: dynamic response extremes", () => {
  it("zero damping at resonance → very large DAF", () => {
    const mass = 1000, stiffness = 100000, F0 = 5000;
    const wn = Math.sqrt(stiffness / mass);
    // Very small damping
    const resp = analyzeDynamicResponse(mass, stiffness, 0.001, F0, wn);
    expect(resp.dynamicAmplificationFactor).toBeGreaterThan(100);
  });

  it("very high frequency ratio → DAF → 0", () => {
    const resp = analyzeDynamicResponse(1000, 100000, 500, 5000, 10000);
    expect(resp.dynamicAmplificationFactor).toBeLessThan(0.01);
  });

  it("zero forcing frequency → DAF = 1 (quasi-static)", () => {
    const resp = analyzeDynamicResponse(1000, 100000, 500, 5000, 0.001);
    expect(resp.dynamicAmplificationFactor).toBeCloseTo(1, 1);
  });
});

// ============================================================
// Edge cases: Monte Carlo with extreme parameters
// ============================================================

describe("Edge: Monte Carlo extremes", () => {
  it("very small N still returns valid result", () => {
    const mc = monteCarloReliability(300, 30, 200, 40, 10);
    expect(mc.pf).toBeGreaterThanOrEqual(0);
    expect(mc.pf).toBeLessThanOrEqual(1);
    expect(mc.samples.length).toBeLessThanOrEqual(10);
  });

  it("identical distributions → Pf ≈ 0.5", () => {
    const mc = monteCarloReliability(100, 10, 100, 10, 50000);
    expect(mc.pf).toBeGreaterThan(0.4);
    expect(mc.pf).toBeLessThan(0.6);
  });

  it("all samples have valid failed flag", () => {
    const mc = monteCarloReliability(200, 20, 150, 20, 100);
    for (const s of mc.samples) {
      expect(s.failed).toBe(s.r < s.s);
    }
  });
});
