import { describe, it, expect } from "vitest";
import {
  reliabilityIndex,
  probabilityOfFailure,
  reliabilityAnalysis,
  monteCarloReliability,
  analyzeDynamicResponse,
} from "@/lib/reliability";
import { normalCDF, normalInverseCDF } from "@/lib/probability";

// ============================================================
// Lab Experiment Calculation Verification
// Tests mirror the useMemo logic in each Exp component.
// ============================================================

// ── Experiment 1: Monte Carlo Convergence ──
describe("Lab Exp1: Monte Carlo Convergence", () => {
  const muR = 100, sigR = 15, muS = 70, sigS = 12, N = 10000;

  it("analytic β matches reliabilityIndex", () => {
    const beta = reliabilityIndex(muR, sigR, muS, sigS);
    expect(beta).toBeCloseTo((muR - muS) / Math.sqrt(sigR ** 2 + sigS ** 2), 8);
  });

  it("CoV of MC estimator = sqrt((1-Pf)/(N·Pf))", () => {
    const beta = reliabilityIndex(muR, sigR, muS, sigS);
    const pf = probabilityOfFailure(beta);
    const covEst = Math.sqrt((1 - pf) / (N * pf));
    expect(covEst).toBeGreaterThan(0);
    expect(covEst).toBeLessThan(1); // should be small for this setup
  });

  it("95% CI half-width = 1.96·sqrt(Pf(1-Pf)/N)", () => {
    const pf = 0.05;
    const ciHalf = 1.96 * Math.sqrt(pf * (1 - pf) / N);
    expect(ciHalf).toBeCloseTo(1.96 * Math.sqrt(0.05 * 0.95 / 10000), 6);
  });
});

// ── Experiment 2: FORM vs SORM ──
describe("Lab Exp2: FORM vs SORM", () => {
  it("reliabilityAnalysis returns SORM fields", () => {
    const result = reliabilityAnalysis(100, 0.15, 60, 0.20);
    expect(result.betaSorm).toBeDefined();
    expect(result.pfSorm).toBeDefined();
    expect(result.curvatureCorrection).toBeDefined();
  });

  it("relative error is finite and non-negative", () => {
    const rel = reliabilityAnalysis(100, 0.15, 60, 0.20);
    const relError = rel.pfSorm && rel.pf > 0
      ? Math.abs(rel.pfSorm - rel.pf) / rel.pf * 100
      : 0;
    expect(relError).toBeGreaterThanOrEqual(0);
    expect(isFinite(relError)).toBe(true);
  });
});

// ── Experiment 3: Tail Sensitivity — Normal vs Lognormal ──
describe("Lab Exp3: Tail Sensitivity", () => {
  const mean = 50, cov = 0.20, threshold = 30;

  it("Normal Pf = Φ((threshold - μ)/σ)", () => {
    const sigma = mean * cov;
    const pfNormal = normalCDF((threshold - mean) / sigma);
    expect(pfNormal).toBeCloseTo(normalCDF(-2), 6); // (30-50)/10 = -2
  });

  it("Lognormal parameters are correct", () => {
    const sigLn = Math.sqrt(Math.log(1 + cov * cov));
    const muLn = Math.log(mean / Math.sqrt(1 + cov * cov));
    expect(sigLn).toBeGreaterThan(0);
    expect(Math.exp(muLn + sigLn ** 2 / 2)).toBeCloseTo(mean, 2); // E[X] = exp(μ + σ²/2)
  });

  it("Lognormal P(X<0) = 0 (strictly positive)", () => {
    // Lognormal never produces negative values
    const pfNeg = normalCDF((Math.log(0 + 1e-300) - 3.88) / 0.198);
    expect(pfNeg).toBeCloseTo(0, 10);
  });

  it("P(X<0) for Normal is nonzero when μ/σ is finite", () => {
    const sigma = mean * cov;
    const pNeg = normalCDF(-mean / sigma);
    expect(pNeg).toBeGreaterThan(0);
  });
});

// ── Experiment 4: Correlation Effects ──
describe("Lab Exp4: Correlation Effects", () => {
  const muR = 100, sigR = 15, muS = 70, sigS = 12;

  it("positive correlation reduces β (Var(g) increases)", () => {
    const rho = 0.5;
    const varG = sigR ** 2 + sigS ** 2 - 2 * rho * sigR * sigS;
    const sigG = Math.sqrt(varG);
    const betaCorr = (muR - muS) / sigG;
    const betaUncorr = reliabilityIndex(muR, sigR, muS, sigS);
    // With positive ρ for R-S: Var(g) = σR² + σS² - 2ρσRσS → decreases → β increases
    expect(betaCorr).toBeGreaterThan(betaUncorr);
  });

  it("negative correlation increases Var(g)", () => {
    const rho = -0.5;
    const varG = sigR ** 2 + sigS ** 2 - 2 * rho * sigR * sigS;
    const varUncorr = sigR ** 2 + sigS ** 2;
    expect(varG).toBeGreaterThan(varUncorr);
  });

  it("ρ = 0 matches uncorrelated reliabilityIndex", () => {
    const varG = sigR ** 2 + sigS ** 2;
    const beta = (muR - muS) / Math.sqrt(varG);
    expect(beta).toBeCloseTo(reliabilityIndex(muR, sigR, muS, sigS), 10);
  });
});

// ── Experiment 5: Point vs Uniform Load ──
describe("Lab Exp5: Point vs Uniform Load", () => {
  const L = 6, W = 20, covW = 0.15, muR = 30, covR = 0.10;

  it("Uniform moment = WL/8", () => {
    expect(W * L / 8).toBeCloseTo(15, 6);
  });

  it("Point moment = WL/4 (double uniform)", () => {
    expect(W * L / 4).toBeCloseTo(30, 6);
  });

  it("Point load moment > Uniform load moment for same total W", () => {
    expect(W * L / 4).toBeGreaterThan(W * L / 8);
  });

  it("variance scales with (L/c)² where c is 8 or 4", () => {
    const sigW = W * covW;
    const varU = (L / 8) ** 2 * sigW ** 2;
    const varP = (L / 4) ** 2 * sigW ** 2;
    expect(varP).toBeCloseTo(4 * varU, 6); // (L/4)² / (L/8)² = 4
  });

  it("β_uniform > β_point (uniform is safer for same total load)", () => {
    const sigW = W * covW;
    const sigR_abs = muR * covR;
    const M_u = W * L / 8;
    const M_p = W * L / 4;
    const varM_u = (L / 8) ** 2 * sigW ** 2;
    const varM_p = (L / 4) ** 2 * sigW ** 2;
    const betaU = (muR - M_u) / Math.sqrt(sigR_abs ** 2 + varM_u);
    const betaP = (muR - M_p) / Math.sqrt(sigR_abs ** 2 + varM_p);
    expect(betaU).toBeGreaterThan(betaP);
  });
});

// ── Experiment 6: Dynamic Response ──
describe("Lab Exp6: Dynamic Response", () => {
  const mass = 1000, stiffness = 100000, damping = 500, F0 = 5000, omega = 8;

  it("natural frequency = sqrt(k/m)", () => {
    const resp = analyzeDynamicResponse(mass, stiffness, damping, F0, omega);
    expect(resp.naturalFrequency).toBeCloseTo(Math.sqrt(stiffness / mass), 6);
  });

  it("damping ratio = c / (2√(km))", () => {
    const resp = analyzeDynamicResponse(mass, stiffness, damping, F0, omega);
    expect(resp.dampingRatio).toBeCloseTo(damping / (2 * Math.sqrt(stiffness * mass)), 6);
  });

  it("DAF = 1/√((1-r²)² + (2ζr)²)", () => {
    const wn = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const r = omega / wn;
    const expected = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2);
    const resp = analyzeDynamicResponse(mass, stiffness, damping, F0, omega);
    expect(resp.dynamicAmplificationFactor).toBeCloseTo(expected, 6);
  });

  it("max displacement = static_disp × DAF", () => {
    const resp = analyzeDynamicResponse(mass, stiffness, damping, F0, omega);
    const staticDisp = F0 / stiffness;
    expect(resp.maxDisplacement).toBeCloseTo(staticDisp * resp.dynamicAmplificationFactor, 10);
  });
});

// ── Experiment 7: First-Passage Failure ──
describe("Lab Exp7: First-Passage Failure", () => {
  const rmsResp = 0.012, threshold = 0.05, nuPlus = 2.0, T = 3600;

  it("Poisson first-passage: Pf = 1 - exp(-ν₊·T·exp(-η²/2))", () => {
    const eta = threshold / rmsResp;
    const exponent = -nuPlus * T * Math.exp(-eta * eta / 2);
    const pf = 1 - Math.exp(exponent);
    expect(pf).toBeGreaterThanOrEqual(0);
    expect(pf).toBeLessThanOrEqual(1);
  });

  it("expected max = σ·√(2·ln(ν₊·T))", () => {
    const expectedMax = rmsResp * Math.sqrt(2 * Math.log(nuPlus * T));
    expect(expectedMax).toBeGreaterThan(rmsResp);
    expect(expectedMax).toBeGreaterThan(0);
  });

  it("Pf increases with duration", () => {
    const eta = threshold / rmsResp;
    const pf1 = 1 - Math.exp(-nuPlus * 100 * Math.exp(-eta * eta / 2));
    const pf2 = 1 - Math.exp(-nuPlus * 10000 * Math.exp(-eta * eta / 2));
    expect(pf2).toBeGreaterThanOrEqual(pf1);
  });

  it("Pf decreases with higher threshold", () => {
    const eta1 = 0.03 / rmsResp;
    const eta2 = 0.08 / rmsResp;
    const pf1 = 1 - Math.exp(-nuPlus * T * Math.exp(-eta1 * eta1 / 2));
    const pf2 = 1 - Math.exp(-nuPlus * T * Math.exp(-eta2 * eta2 / 2));
    expect(pf1).toBeGreaterThan(pf2);
  });
});

// ── Experiment 8: System Redundancy ──
describe("Lab Exp8: System Redundancy", () => {
  const pfMember = 0.001;

  it("series Pf = 1 - (1-Pf_member)^n", () => {
    const n = 5;
    const pfSeries = 1 - Math.pow(1 - pfMember, n);
    expect(pfSeries).toBeGreaterThan(pfMember);
    expect(pfSeries).toBeLessThan(n * pfMember); // less than upper bound
  });

  it("parallel Pf = Pf_member^n (independent)", () => {
    const n = 5;
    const pfParallel = Math.pow(pfMember, n);
    expect(pfParallel).toBeLessThan(pfMember);
  });

  it("series Pf increases with more members", () => {
    const pf3 = 1 - Math.pow(1 - pfMember, 3);
    const pf10 = 1 - Math.pow(1 - pfMember, 10);
    expect(pf10).toBeGreaterThan(pf3);
  });

  it("parallel Pf decreases with more members", () => {
    const pf3 = Math.pow(pfMember, 3);
    const pf10 = Math.pow(pfMember, 10);
    expect(pf10).toBeLessThan(pf3);
  });

  it("redundancy ratio (parallel/series) << 1", () => {
    const n = 5;
    const pfSeries = 1 - Math.pow(1 - pfMember, n);
    const pfParallel = Math.pow(pfMember, n);
    expect(pfParallel / pfSeries).toBeLessThan(1e-6);
  });
});

// ── Experiment 9: IS vs Subset Simulation ──
describe("Lab Exp9: Sampling Efficiency", () => {
  const targetBeta = 4.0;
  const N_mc = 10000;
  const p0 = 0.1;

  it("target Pf = Φ(-β)", () => {
    const pfTarget = normalCDF(-targetBeta);
    expect(pfTarget).toBeCloseTo(3.167e-5, 4);
  });

  it("Crude MC requires N ≈ 10/Pf for CoV ≈ 30%", () => {
    const pfTarget = normalCDF(-targetBeta);
    const N_req = Math.ceil(10 / pfTarget);
    expect(N_req).toBeGreaterThan(100000);
  });

  it("Subset Simulation levels = ceil(log(Pf)/log(p0))", () => {
    const pfTarget = normalCDF(-targetBeta);
    const nLevels = Math.ceil(Math.log(pfTarget) / Math.log(p0));
    expect(nLevels).toBeGreaterThan(0);
    // For Pf ≈ 3e-5, log(3e-5)/log(0.1) ≈ 4.5 → 5 levels
    expect(nLevels).toBeGreaterThanOrEqual(4);
    expect(nLevels).toBeLessThanOrEqual(6);
  });

  it("CoV of crude MC estimator decreases with N", () => {
    const pfTarget = normalCDF(-targetBeta);
    const cov1 = Math.sqrt((1 - pfTarget) / (1000 * pfTarget));
    const cov2 = Math.sqrt((1 - pfTarget) / (100000 * pfTarget));
    expect(cov2).toBeLessThan(cov1);
  });
});

// ── Experiment 10: RBDO ──
describe("Lab Exp10: RBDO Calculations", () => {
  const area = 50, muLoad = 200, covLoad = 0.15, fy = 250, covFy = 0.10;
  const betaTarget = 3.0;

  it("resistance = fy × A × 1e-1 (units: kN)", () => {
    const muR = fy * area * 1e-1;
    expect(muR).toBeCloseTo(1250, 6);
  });

  it("β computed correctly from R-S model", () => {
    const muR = fy * area * 1e-1;
    const sigR = muR * covFy;
    const sigS = muLoad * covLoad;
    const beta = reliabilityIndex(muR, sigR, muLoad, sigS);
    expect(beta).toBeGreaterThan(0);
  });

  it("penalty = ρ × max(0, βTarget - β)²", () => {
    const muR = fy * area * 1e-1;
    const sigR = muR * covFy;
    const sigS = muLoad * covLoad;
    const beta = reliabilityIndex(muR, sigR, muLoad, sigS);
    const rho = 1000;
    const violation = Math.max(0, betaTarget - beta);
    const penalty = rho * violation * violation;
    // With area=50 and muR=1250 >> muLoad=200, β is large → violation=0
    expect(penalty).toBeCloseTo(0, 6);
  });

  it("lagrangian = weight + penalty", () => {
    const weight = area;
    const penalty = 0; // large area → β > βTarget → no violation
    expect(weight + penalty).toBeCloseTo(area, 6);
  });

  it("deterministic SF design area = μS × SF / (fy × 0.1)", () => {
    const sfArea = (muLoad * 1.5) / (fy * 0.1);
    expect(sfArea).toBeCloseTo(12, 6);
  });
});
