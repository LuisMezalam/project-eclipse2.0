import { describe, it, expect } from "vitest";
import {
  reliabilityIndex,
  probabilityOfFailure,
  reliabilityAnalysis,
  monteCarloReliability,
  sormCorrection,
  analyzeDynamicResponse,
} from "@/lib/reliability";
import { normalCDF } from "@/lib/probability";

// ============================================================
// Property-based monotonicity tests
// Increasing resistance must NEVER reduce reliability.
// ============================================================

describe("Monotonicity: increasing resistance → non-decreasing β", () => {
  const meanS = 200;
  const stdS = 30;
  const stdR = 25;

  const resistances = [250, 300, 350, 400, 500, 700, 1000];

  it("FORM β increases monotonically with mean resistance", () => {
    let prevBeta = -Infinity;
    for (const muR of resistances) {
      const beta = reliabilityIndex(muR, stdR, meanS, stdS);
      expect(beta).toBeGreaterThanOrEqual(prevBeta);
      prevBeta = beta;
    }
  });

  it("FORM Pf decreases monotonically with mean resistance", () => {
    let prevPf = 1;
    for (const muR of resistances) {
      const beta = reliabilityIndex(muR, stdR, meanS, stdS);
      const pf = probabilityOfFailure(beta);
      expect(pf).toBeLessThanOrEqual(prevPf);
      prevPf = pf;
    }
  });
});

describe("Monotonicity: increasing resistance → reliabilityAnalysis", () => {
  const covS = 0.15;
  const covR = 0.10;
  const meanS = 200;
  const resistances = [250, 300, 400, 600];

  it("β (FORM) increases with mean resistance", () => {
    let prevBeta = -Infinity;
    for (const muR of resistances) {
      const result = reliabilityAnalysis(muR, covR, meanS, covS);
      expect(result.beta).toBeGreaterThanOrEqual(prevBeta);
      prevBeta = result.beta;
    }
  });

  it("Pf (FORM) decreases with mean resistance", () => {
    let prevPf = 1;
    for (const muR of resistances) {
      const result = reliabilityAnalysis(muR, covR, meanS, covS);
      expect(result.pf).toBeLessThanOrEqual(prevPf);
      prevPf = result.pf;
    }
  });

  it("SORM Pf decreases with mean resistance", () => {
    let prevPf = 1;
    for (const muR of resistances) {
      const result = reliabilityAnalysis(muR, covR, meanS, covS);
      const pfSorm = result.pfSorm ?? result.pf;
      expect(pfSorm).toBeLessThanOrEqual(prevPf + 1e-10); // small tolerance
      prevPf = pfSorm;
    }
  });

  it("safety margin increases with mean resistance", () => {
    let prevMargin = -Infinity;
    for (const muR of resistances) {
      const result = reliabilityAnalysis(muR, covR, meanS, covS);
      expect(result.meanSafetyMargin).toBeGreaterThan(prevMargin);
      prevMargin = result.meanSafetyMargin;
    }
  });

  it("central safety factor increases with mean resistance", () => {
    let prevSF = 0;
    for (const muR of resistances) {
      const result = reliabilityAnalysis(muR, covR, meanS, covS);
      expect(result.centralSafetyFactor).toBeGreaterThan(prevSF);
      prevSF = result.centralSafetyFactor;
    }
  });
});

describe("Monotonicity: decreasing uncertainty → increasing β", () => {
  const muR = 400;
  const muS = 250;
  const covs = [0.30, 0.20, 0.15, 0.10, 0.05];

  it("β increases as CoV_R decreases (fixed CoV_S)", () => {
    let prevBeta = -Infinity;
    for (const cov of covs) {
      const result = reliabilityAnalysis(muR, cov, muS, 0.15);
      expect(result.beta).toBeGreaterThanOrEqual(prevBeta);
      prevBeta = result.beta;
    }
  });

  it("β increases as CoV_S decreases (fixed CoV_R)", () => {
    let prevBeta = -Infinity;
    for (const cov of covs) {
      const result = reliabilityAnalysis(muR, 0.10, muS, cov);
      expect(result.beta).toBeGreaterThanOrEqual(prevBeta);
      prevBeta = result.beta;
    }
  });
});

describe("Monotonicity: Monte Carlo consistency", () => {
  it("MC Pf decreases as resistance increases (large N)", () => {
    const muS = 200, stdS = 30;
    const stdR = 25;
    const N = 50000;

    const mc1 = monteCarloReliability(250, stdR, muS, stdS, N);
    const mc2 = monteCarloReliability(400, stdR, muS, stdS, N);
    const mc3 = monteCarloReliability(600, stdR, muS, stdS, N);

    expect(mc1.pf).toBeGreaterThanOrEqual(mc2.pf);
    expect(mc2.pf).toBeGreaterThanOrEqual(mc3.pf);
  });
});

describe("Monotonicity: increasing load → decreasing reliability", () => {
  const muR = 400, stdR = 40;
  const stdS = 30;
  const loads = [100, 200, 300, 350, 390];

  it("β decreases as mean load increases", () => {
    let prevBeta = Infinity;
    for (const muS of loads) {
      const beta = reliabilityIndex(muR, stdR, muS, stdS);
      expect(beta).toBeLessThanOrEqual(prevBeta);
      prevBeta = beta;
    }
  });

  it("Pf increases as mean load increases", () => {
    let prevPf = 0;
    for (const muS of loads) {
      const beta = reliabilityIndex(muR, stdR, muS, stdS);
      const pf = probabilityOfFailure(beta);
      expect(pf).toBeGreaterThanOrEqual(prevPf);
      prevPf = pf;
    }
  });
});

describe("Monotonicity: SORM correction", () => {
  it("positive curvature → correction < 1 (monotonic with κ)", () => {
    const beta = 3;
    const curvatures = [0.01, 0.05, 0.1, 0.2];
    let prevCorr = 1;
    for (const k of curvatures) {
      const corr = sormCorrection(beta, [k]);
      expect(corr).toBeLessThan(prevCorr + 1e-10);
      prevCorr = corr;
    }
  });

  it("negative curvature → correction > 1 (monotonic with |κ|)", () => {
    const beta = 3;
    const curvatures = [-0.01, -0.05, -0.1, -0.2];
    let prevCorr = 1;
    for (const k of curvatures) {
      const corr = sormCorrection(beta, [k]);
      expect(corr).toBeGreaterThan(prevCorr - 1e-10);
      prevCorr = corr;
    }
  });
});

describe("Monotonicity: dynamic response", () => {
  it("DAF peaks near resonance (r ≈ 1)", () => {
    const mass = 1000, stiffness = 100000, damping = 500, F0 = 5000;
    const wn = Math.sqrt(stiffness / mass);

    const farBelow = analyzeDynamicResponse(mass, stiffness, damping, F0, wn * 0.3);
    const nearRes = analyzeDynamicResponse(mass, stiffness, damping, F0, wn * 0.99);
    const farAbove = analyzeDynamicResponse(mass, stiffness, damping, F0, wn * 3);

    expect(nearRes.dynamicAmplificationFactor).toBeGreaterThan(farBelow.dynamicAmplificationFactor);
    expect(nearRes.dynamicAmplificationFactor).toBeGreaterThan(farAbove.dynamicAmplificationFactor);
  });

  it("increasing stiffness increases natural frequency", () => {
    const mass = 1000, damping = 500, F0 = 5000, omega = 10;
    const r1 = analyzeDynamicResponse(mass, 50000, damping, F0, omega);
    const r2 = analyzeDynamicResponse(mass, 200000, damping, F0, omega);
    expect(r2.naturalFrequency).toBeGreaterThan(r1.naturalFrequency);
  });

  it("increasing damping reduces DAF near resonance", () => {
    const mass = 1000, stiffness = 100000, F0 = 5000;
    const wn = Math.sqrt(stiffness / mass);
    const r1 = analyzeDynamicResponse(mass, stiffness, 200, F0, wn);
    const r2 = analyzeDynamicResponse(mass, stiffness, 2000, F0, wn);
    expect(r1.dynamicAmplificationFactor).toBeGreaterThan(r2.dynamicAmplificationFactor);
  });
});
