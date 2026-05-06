/**
 * Truss Solver Domain Logic
 * 
 * Pure domain functions, types, and constants for truss/frame structural
 * reliability analysis. No UI or React dependencies.
 */

import { normalCDF, normalInverseCDF, normalRandom } from "@/lib/probability";
import { reliabilityIndex, probabilityOfFailure } from "@/lib/reliability";

// ============================================================
// Types & Interfaces
// ============================================================

export interface TrussNode {
  id: number;
  x: number;
  y: number;
  supportType: 'none' | 'pin' | 'roller' | 'fixed' | 'hinge';
  loadX: number;
  loadY: number;
}

export interface TrussMember {
  id: number;
  startNode: number;
  endNode: number;
  area: number;       // m²
  elasticModulus: number; // Pa
  isRigid: boolean;   // For frame option - rigid connections
  // Reliability parameters
  yieldStrength: number;  // Pa (mean)
  yieldStrengthCoV: number; // coefficient of variation
  areaCoV: number;   // coefficient of variation for area
}

export type LoadCategory = 'dead' | 'live' | 'wind' | 'snow' | 'earthquake' | 'rain';

export interface PointLoad {
  id: number;
  nodeId: number;
  magnitude: number;  // N
  angle: number;      // degrees from vertical (0 = straight down)
  magnitudeCoV: number; // coefficient of variation for load
  category: LoadCategory; // LRFD load category
}

export interface LoadCombination {
  id: string;
  name: string;
  factors: Record<LoadCategory, number>;
}

export interface MemberResult {
  memberId: number;
  force: number;      // N (positive = tension, negative = compression)
  stress: number;     // Pa
  strain: number;
  type: 'tension' | 'compression' | 'zero';
}

export interface ReliabilityMarginOfError {
  betaEstimate: number;
  betaStdError: number;
  beta95CI: { lower: number; upper: number };
  pfEstimate: number;
  pf95CI: { lower: number; upper: number };
  methodUncertainty: number;
}

export interface MemberReliability {
  memberId: number;
  meanStress: number;
  stdStress: number;
  meanStrength: number;
  stdStrength: number;
  beta: number;
  betaFOSM: number;
  betaSORM: number;
  betaTORM: number;
  pf: number;
  pfFOSM: number;
  pfSORM: number;
  pfTORM: number;
  safetyFactor: number;
  isCritical: boolean;
  marginOfError?: ReliabilityMarginOfError;
}

export interface HigherOrderAnalysis {
  order: number;
  beta: number;
  pf: number;
  correction: number;
  convergenceTrend: 'converging' | 'diverging' | 'oscillating';
}

export interface TrussSystemReliability {
  systemType: 'series' | 'parallel' | 'mixed';
  systemBeta: number;
  systemBetaFOSM: number;
  systemBetaSORM: number;
  systemBetaTORM: number;
  systemPf: number;
  systemPfFOSM: number;
  systemPfSORM: number;
  systemPfTORM: number;
  boundsPf: { lower: number; upper: number };
  criticalPath: number[];
  memberReliabilities: MemberReliability[];
  higherOrderAnalysis?: HigherOrderAnalysis[];
  systemMarginOfError?: ReliabilityMarginOfError;
  mcValidation?: {
    numSamples: number;
    failureCount: number;
    estimatedPf: number;
    estimatedBeta: number;
    convergenceHistory: { samples: number; pf: number }[];
  };
  importanceSampling?: {
    numSamples: number;
    estimatedPf: number;
    estimatedBeta: number;
    coefficientOfVariation: number;
    efficiencyGain: number;
    convergenceHistory: { samples: number; pf: number; cov: number }[];
  };
}

export interface ImportanceSamplingResult {
  numSamples: number;
  estimatedPf: number;
  estimatedBeta: number;
  coefficientOfVariation: number;
  efficiencyGain: number;
  convergenceHistory: { samples: number; pf: number; cov: number }[];
}

export interface SubsetSimulationResult {
  numLevels: number;
  samplesPerLevel: number;
  conditionalPf: number[];
  thresholds: number[];
  estimatedPf: number;
  estimatedBeta: number;
  coefficientOfVariation: number;
  convergenceHistory: { level: number; threshold: number; condPf: number; cumulativePf: number }[];
}

export interface RBDOResult {
  success: boolean;
  iterations: number;
  targetBeta: number;
  initialBeta: number;
  finalBeta: number;
  initialAreas: { memberId: number; area: number }[];
  optimizedAreas: { memberId: number; area: number; change: number }[];
  totalAreaIncrease: number;
  convergenceHistory: { iteration: number; systemBeta: number; maxAreaChange: number }[];
}

export interface SensitivityResult {
  memberId: number;
  parameterName: string;
  parameterType: 'yield_strength' | 'area' | 'load';
  baseValue: number;
  sensitivity: number;
  elasticity: number;
  importance: number;
  direction: 'increase' | 'decrease';
}

export interface LRFDResult {
  combinationId: string;
  combinationName: string;
  factoredLoad: number;
  systemBeta: number;
  systemPf: number;
  isCritical: boolean;
  memberBetas: { memberId: number; beta: number }[];
}

// ============================================================
// Constants
// ============================================================

/** ASCE 7-22 Load Combinations */
export const LRFD_COMBINATIONS: LoadCombination[] = [
  { id: 'lc1', name: '1.4D', factors: { dead: 1.4, live: 0, wind: 0, snow: 0, earthquake: 0, rain: 0 } },
  { id: 'lc2', name: '1.2D + 1.6L + 0.5S', factors: { dead: 1.2, live: 1.6, wind: 0, snow: 0.5, earthquake: 0, rain: 0 } },
  { id: 'lc3', name: '1.2D + 1.6S + L', factors: { dead: 1.2, live: 1.0, wind: 0, snow: 1.6, earthquake: 0, rain: 0 } },
  { id: 'lc4', name: '1.2D + W + L + 0.5S', factors: { dead: 1.2, live: 1.0, wind: 1.0, snow: 0.5, earthquake: 0, rain: 0 } },
  { id: 'lc5', name: '1.2D + E + L + 0.2S', factors: { dead: 1.2, live: 1.0, wind: 0, snow: 0.2, earthquake: 1.0, rain: 0 } },
  { id: 'lc6', name: '0.9D + W', factors: { dead: 0.9, live: 0, wind: 1.0, snow: 0, earthquake: 0, rain: 0 } },
  { id: 'lc7', name: '0.9D + E', factors: { dead: 0.9, live: 0, wind: 0, snow: 0, earthquake: 1.0, rain: 0 } },
];

/** Default CoV by load category (typical values from literature) */
export const DEFAULT_COV_BY_CATEGORY: Record<LoadCategory, number> = {
  dead: 0.10,
  live: 0.25,
  wind: 0.35,
  snow: 0.25,
  earthquake: 0.40,
  rain: 0.20,
};

export const DEFAULT_YIELD_STRENGTH = 250e6; // 250 MPa
export const DEFAULT_YIELD_COV = 0.1;
export const DEFAULT_AREA_COV = 0.05;
export const DEFAULT_LOAD_COV = 0.15;

// ============================================================
// Helper Functions
// ============================================================

/** Standard normal PDF */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ============================================================
// Reliability Methods
// ============================================================

/**
 * FOSM (First Order Second Moment) reliability calculation.
 * Uses mean value method — evaluates limit state at mean values.
 */
export function fosmReliabilityIndex(
  meanR: number,
  covR: number,
  meanS: number,
  covS: number
): number {
  const meanG = meanR - meanS;
  const stdR = meanR * covR;
  const stdS = meanS * covS;
  const stdG = Math.sqrt(stdR * stdR + stdS * stdS);
  if (stdG === 0) return meanG > 0 ? 10 : 0;
  return meanG / stdG;
}

/**
 * SORM (Second Order Reliability Method) with Breitung's curvature correction.
 */
export function sormReliabilityIndex(
  betaFORM: number,
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number
): { betaSORM: number; pfSORM: number; curvature: number } {
  const totalVar = stdR * stdR + stdS * stdS;
  if (totalVar === 0 || betaFORM <= 0) {
    return { betaSORM: betaFORM, pfSORM: normalCDF(-betaFORM), curvature: 0 };
  }

  const covR = stdR / meanR;
  const covS = meanS > 0 ? stdS / meanS : 0;
  const avgCoV = (Math.abs(covR) + Math.abs(covS)) / 2;

  const kappa = avgCoV * avgCoV * 0.5;
  const correctionFactor = Math.pow(1 + betaFORM * kappa, -0.5);

  const A1 = normalCDF(-betaFORM) * correctionFactor;
  const A2 = (betaFORM * normalCDF(-betaFORM) - normalPDF(betaFORM)) *
    (correctionFactor - 1);
  const A3 = (betaFORM + 1) * (betaFORM * normalCDF(-betaFORM) - normalPDF(betaFORM)) *
    (correctionFactor - 1 - 0.5 * betaFORM * kappa * correctionFactor);

  const pfSORM = Math.max(0, Math.min(1, A1 + A2 + A3 * 0.1));
  const betaSORM = pfSORM > 0 && pfSORM < 1 ? -normalInverseCDF(pfSORM) : betaFORM;

  return {
    betaSORM: Math.max(0, Math.min(betaSORM, 10)),
    pfSORM,
    curvature: kappa
  };
}

/**
 * TORM (Third Order Reliability Method) with higher-order corrections.
 */
export function tormReliabilityIndex(
  betaFORM: number,
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number
): { betaTORM: number; pfTORM: number; thirdOrderCorrection: number } {
  const totalVar = stdR * stdR + stdS * stdS;
  if (totalVar === 0 || betaFORM <= 0) {
    return { betaTORM: betaFORM, pfTORM: normalCDF(-betaFORM), thirdOrderCorrection: 0 };
  }

  const covR = stdR / meanR;
  const covS = meanS > 0 ? stdS / meanS : 0;
  const avgCoV = (Math.abs(covR) + Math.abs(covS)) / 2;

  const kappa2 = avgCoV * avgCoV * 0.5;
  const kappa3 = avgCoV * avgCoV * avgCoV * 0.25;

  const c2 = -0.5 * Math.log(1 + betaFORM * kappa2);

  const phi = normalPDF(betaFORM);
  const Phi = normalCDF(-betaFORM);
  const H3 = betaFORM * betaFORM * betaFORM - 3 * betaFORM;
  const c3 = (kappa3 / 6) * H3 * phi / Math.max(Phi, 1e-15);

  const correctionFactor2 = Math.pow(1 + betaFORM * kappa2, -0.5);
  const correctionFactor3 = 1 - c3 * 0.5;

  const pfTORM = Math.max(0, Math.min(1, Phi * correctionFactor2 * correctionFactor3));
  const betaTORM = pfTORM > 0 && pfTORM < 1 ? -normalInverseCDF(pfTORM) : betaFORM;

  return {
    betaTORM: Math.max(0, Math.min(betaTORM, 10)),
    pfTORM,
    thirdOrderCorrection: c3
  };
}

/**
 * Higher-Order Reliability Method convergence analysis (orders 1–4).
 */
export function analyzeHigherOrderConvergence(
  betaFORM: number,
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number
): HigherOrderAnalysis[] {
  const results: HigherOrderAnalysis[] = [];

  // Order 1: FORM
  results.push({
    order: 1,
    beta: betaFORM,
    pf: normalCDF(-betaFORM),
    correction: 0,
    convergenceTrend: 'converging'
  });

  // Order 2: SORM
  const sorm = sormReliabilityIndex(betaFORM, meanR, stdR, meanS, stdS);
  const sormCorrection = betaFORM - sorm.betaSORM;
  results.push({
    order: 2,
    beta: sorm.betaSORM,
    pf: sorm.pfSORM,
    correction: sormCorrection,
    convergenceTrend: 'converging'
  });

  // Order 3: TORM
  const torm = tormReliabilityIndex(betaFORM, meanR, stdR, meanS, stdS);
  const tormCorrection = sorm.betaSORM - torm.betaTORM;
  results.push({
    order: 3,
    beta: torm.betaTORM,
    pf: torm.pfTORM,
    correction: tormCorrection,
    convergenceTrend: Math.abs(tormCorrection) < Math.abs(sormCorrection) ? 'converging' :
      (Math.abs(tormCorrection) > Math.abs(sormCorrection) * 1.5 ? 'diverging' : 'oscillating')
  });

  // Order 4: Extrapolated kurtosis correction
  const covR = stdR / meanR;
  const covS = meanS > 0 ? stdS / meanS : 0;
  const avgCoV = (Math.abs(covR) + Math.abs(covS)) / 2;

  const kappa4 = Math.pow(avgCoV, 4) * 0.125;
  const c4 = kappa4 * (Math.pow(betaFORM, 4) - 6 * betaFORM * betaFORM + 3);
  const beta4 = torm.betaTORM - c4 * 0.1;
  const order4Correction = torm.betaTORM - beta4;

  results.push({
    order: 4,
    beta: Math.max(0, Math.min(beta4, 10)),
    pf: normalCDF(-Math.max(0, Math.min(beta4, 10))),
    correction: order4Correction,
    convergenceTrend: Math.abs(order4Correction) < Math.abs(tormCorrection) * 0.5 ? 'converging' :
      (Math.abs(order4Correction) > Math.abs(tormCorrection) ? 'diverging' : 'oscillating')
  });

  return results;
}

/**
 * Calculate margin of error for reliability estimates using delta method.
 */
export function calculateReliabilityMarginOfError(
  beta: number,
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number,
  sampleSize?: number
): ReliabilityMarginOfError {
  const covR = stdR / meanR;
  const covS = meanS > 0 ? stdS / meanS : 0;

  const sigmaG = Math.sqrt(stdR * stdR + stdS * stdS);

  const dBeta_dMuR = 1 / sigmaG;
  const dBeta_dMuS = -1 / sigmaG;
  const dBeta_dSigR = -(meanR - meanS) * stdR / Math.pow(sigmaG, 3);
  const dBeta_dSigS = -(meanR - meanS) * stdS / Math.pow(sigmaG, 3);

  const n = sampleSize || 30;
  const varMuR = (stdR * stdR) / n;
  const varMuS = (stdS * stdS) / n;
  const varSigR = (2 * stdR * stdR * stdR * stdR) / n;
  const varSigS = (2 * stdS * stdS * stdS * stdS) / n;

  const betaVariance =
    dBeta_dMuR * dBeta_dMuR * varMuR +
    dBeta_dMuS * dBeta_dMuS * varMuS +
    dBeta_dSigR * dBeta_dSigR * varSigR +
    dBeta_dSigS * dBeta_dSigS * varSigS;

  const betaStdError = Math.sqrt(betaVariance);
  const methodUncertainty = 0.05 + 0.02 * Math.pow(covR + covS, 2);
  const totalStdError = Math.sqrt(betaStdError * betaStdError + methodUncertainty * methodUncertainty);

  const z95 = 1.96;
  const beta95CI = {
    lower: Math.max(0, beta - z95 * totalStdError),
    upper: beta + z95 * totalStdError
  };

  const pfEstimate = normalCDF(-beta);
  const pf95CI = {
    lower: normalCDF(-beta95CI.upper),
    upper: normalCDF(-beta95CI.lower)
  };

  return {
    betaEstimate: beta,
    betaStdError: totalStdError,
    beta95CI,
    pfEstimate,
    pf95CI,
    methodUncertainty
  };
}

// ============================================================
// Monte Carlo / Sampling Methods
// ============================================================

/**
 * Importance Sampling Monte Carlo — shifts sampling distribution
 * towards the design point for efficient rare-event estimation.
 */
export function importanceSamplingMonteCarlo(
  members: TrussMember[],
  memberResults: MemberResult[],
  pointLoads: PointLoad[],
  numSamples: number,
  targetBeta: number
): ImportanceSamplingResult {
  const avgLoadCoV = pointLoads.length > 0
    ? pointLoads.reduce((sum, l) => sum + l.magnitudeCoV, 0) / pointLoads.length
    : DEFAULT_LOAD_COV;

  const shiftFactor = Math.min(targetBeta * 0.8, 3);

  let weightedFailures = 0;
  let weightedSquaredSum = 0;
  const convergenceHistory: { samples: number; pf: number; cov: number }[] = [];

  for (let i = 0; i < numSamples; i++) {
    const shiftedLoadMean = 1 + shiftFactor * avgLoadCoV;
    const loadFactor = normalRandom(shiftedLoadMean, avgLoadCoV);

    const w_load = Math.exp(
      -0.5 * Math.pow((loadFactor - 1) / avgLoadCoV, 2) +
      0.5 * Math.pow((loadFactor - shiftedLoadMean) / avgLoadCoV, 2)
    );

    let systemFailed = false;
    let totalWeight = w_load;

    for (const member of members) {
      const result = memberResults.find(r => r.memberId === member.id);
      if (!result || result.stress === 0) continue;

      const shiftedStrengthMean = member.yieldStrength * (1 - shiftFactor * member.yieldStrengthCoV * 0.3);
      const strength = normalRandom(shiftedStrengthMean, member.yieldStrength * member.yieldStrengthCoV);

      const w_strength = Math.exp(
        -0.5 * Math.pow((strength - member.yieldStrength) / (member.yieldStrength * member.yieldStrengthCoV), 2) +
        0.5 * Math.pow((strength - shiftedStrengthMean) / (member.yieldStrength * member.yieldStrengthCoV), 2)
      );
      totalWeight *= w_strength;

      const areaFactor = normalRandom(1, member.areaCoV);
      const sampledStress = Math.abs(result.stress) * loadFactor / areaFactor;

      if (strength < sampledStress) {
        systemFailed = true;
        break;
      }
    }

    const indicator = systemFailed ? 1 : 0;
    const weightedIndicator = indicator * totalWeight;

    weightedFailures += weightedIndicator;
    weightedSquaredSum += weightedIndicator * weightedIndicator;

    if ((i + 1) % Math.floor(numSamples / 20) === 0 || i === numSamples - 1) {
      const currentPf = weightedFailures / (i + 1);
      const variance = (weightedSquaredSum / (i + 1)) - currentPf * currentPf;
      const cov = currentPf > 0 ? Math.sqrt(variance / (i + 1)) / currentPf : 1;

      convergenceHistory.push({
        samples: i + 1,
        pf: currentPf,
        cov: Math.min(cov, 10)
      });
    }
  }

  const estimatedPf = weightedFailures / numSamples;
  const variance = (weightedSquaredSum / numSamples) - estimatedPf * estimatedPf;
  const coefficientOfVariation = estimatedPf > 0
    ? Math.sqrt(variance / numSamples) / estimatedPf
    : 1;

  const crudeMCCoV = estimatedPf > 0
    ? Math.sqrt((1 - estimatedPf) / (numSamples * estimatedPf))
    : 1;
  const efficiencyGain = crudeMCCoV > 0 ? Math.pow(crudeMCCoV / Math.max(coefficientOfVariation, 0.001), 2) : 1;

  const estimatedBeta = estimatedPf > 0 && estimatedPf < 1
    ? -normalInverseCDF(estimatedPf)
    : (estimatedPf === 0 ? 5 : 0);

  return {
    numSamples,
    estimatedPf,
    estimatedBeta: Math.max(0, Math.min(estimatedBeta, 10)),
    coefficientOfVariation: Math.min(coefficientOfVariation, 10),
    efficiencyGain: Math.min(efficiencyGain, 1000),
    convergenceHistory
  };
}

/**
 * Subset Simulation for ultra-rare events (Pf < 10^-6).
 */
export function subsetSimulationMonteCarlo(
  members: TrussMember[],
  memberResults: MemberResult[],
  pointLoads: PointLoad[],
  samplesPerLevel: number,
  conditionalProbability: number = 0.1
): SubsetSimulationResult {
  const avgLoadCoV = pointLoads.length > 0
    ? pointLoads.reduce((sum, l) => sum + l.magnitudeCoV, 0) / pointLoads.length
    : DEFAULT_LOAD_COV;

  const evaluateLimitState = (samples: { loadFactor: number; strengths: number[]; areaFactors: number[] }): number => {
    let minMargin = Infinity;
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const result = memberResults.find(r => r.memberId === member.id);
      if (!result || result.stress === 0) continue;
      const sampledStress = Math.abs(result.stress) * samples.loadFactor / samples.areaFactors[i];
      const margin = samples.strengths[i] - sampledStress;
      minMargin = Math.min(minMargin, margin);
    }
    return minMargin;
  };

  const generateSample = () => ({
    loadFactor: normalRandom(1, avgLoadCoV),
    strengths: members.map(m => normalRandom(m.yieldStrength, m.yieldStrength * m.yieldStrengthCoV)),
    areaFactors: members.map(m => normalRandom(1, m.areaCoV))
  });

  const mcmcStep = (currentSample: ReturnType<typeof generateSample>, threshold: number) => {
    const proposalStd = 0.3;
    const proposal = {
      loadFactor: currentSample.loadFactor + normalRandom(0, proposalStd * avgLoadCoV),
      strengths: currentSample.strengths.map((s, i) =>
        s + normalRandom(0, proposalStd * members[i].yieldStrength * members[i].yieldStrengthCoV)
      ),
      areaFactors: currentSample.areaFactors.map((a, i) =>
        a + normalRandom(0, proposalStd * members[i].areaCoV)
      )
    };
    const proposalG = evaluateLimitState(proposal);
    if (proposalG < threshold) {
      return proposal;
    }
    return currentSample;
  };

  const convergenceHistory: SubsetSimulationResult['convergenceHistory'] = [];
  const conditionalPfs: number[] = [];
  const thresholds: number[] = [];

  let samples = Array.from({ length: samplesPerLevel }, generateSample);
  let gValues = samples.map(evaluateLimitState);

  let level = 0;
  const maxLevels = 20;

  while (level < maxLevels) {
    const sortedIndices = gValues
      .map((g, i) => ({ g, i }))
      .sort((a, b) => a.g - b.g)
      .map(x => x.i);

    const thresholdIndex = Math.floor(conditionalProbability * samplesPerLevel);
    const threshold = gValues[sortedIndices[thresholdIndex]];

    if (threshold >= 0) {
      const failureCount = gValues.filter(g => g < 0).length;
      const finalCondPf = failureCount / samplesPerLevel;
      conditionalPfs.push(finalCondPf);
      thresholds.push(0);
      const cumulativePf = conditionalPfs.reduce((prod, p) => prod * p, 1);
      convergenceHistory.push({
        level: level + 1,
        threshold: 0,
        condPf: finalCondPf,
        cumulativePf
      });
      break;
    }

    thresholds.push(threshold);
    conditionalPfs.push(conditionalProbability);
    const cumulativePf = conditionalPfs.reduce((prod, p) => prod * p, 1);
    convergenceHistory.push({
      level: level + 1,
      threshold,
      condPf: conditionalProbability,
      cumulativePf
    });

    const seeds = sortedIndices
      .filter(i => gValues[i] < threshold)
      .map(i => samples[i]);

    const newSamples: typeof samples = [];
    const chainsPerSeed = Math.ceil(samplesPerLevel / seeds.length);

    for (const seed of seeds) {
      let current = seed;
      for (let i = 0; i < chainsPerSeed && newSamples.length < samplesPerLevel; i++) {
        current = mcmcStep(current, threshold);
        newSamples.push({ ...current });
      }
    }

    samples = newSamples.slice(0, samplesPerLevel);
    gValues = samples.map(evaluateLimitState);
    level++;
  }

  const estimatedPf = conditionalPfs.reduce((prod, p) => prod * p, 1);
  const estimatedBeta = estimatedPf > 0 && estimatedPf < 1
    ? -normalInverseCDF(estimatedPf)
    : (estimatedPf === 0 ? 8 : 0);

  const coefficientOfVariation = Math.sqrt(
    conditionalPfs.reduce((sum, p) => sum + (1 - p) / (p * samplesPerLevel), 0)
  );

  return {
    numLevels: convergenceHistory.length,
    samplesPerLevel,
    conditionalPf: conditionalPfs,
    thresholds,
    estimatedPf,
    estimatedBeta: Math.max(0, Math.min(estimatedBeta, 10)),
    coefficientOfVariation: Math.min(coefficientOfVariation, 5),
    convergenceHistory
  };
}

// ============================================================
// RBDO (Reliability-Based Design Optimization)
// ============================================================

export function reliabilityBasedDesignOptimization(
  members: TrussMember[],
  memberResults: MemberResult[],
  pointLoads: PointLoad[],
  targetBeta: number,
  maxIterations: number = 20,
  tolerance: number = 0.05
): RBDOResult {
  const avgLoadCoV = pointLoads.length > 0
    ? pointLoads.reduce((sum, l) => sum + l.magnitudeCoV, 0) / pointLoads.length
    : DEFAULT_LOAD_COV;

  const calculateMemberBeta = (member: TrussMember, area: number) => {
    const result = memberResults.find(r => r.memberId === member.id);
    if (!result || result.stress === 0) return 10;
    const baseStress = Math.abs(result.stress);
    const scaledStress = baseStress * (member.area / area);
    const stressCoV = Math.sqrt(avgLoadCoV * avgLoadCoV + member.areaCoV * member.areaCoV);
    const stdStress = scaledStress * stressCoV;
    const stdStrength = member.yieldStrength * member.yieldStrengthCoV;
    return reliabilityIndex(member.yieldStrength, stdStrength, scaledStress, stdStress);
  };

  const calculateSystemBeta = (areas: Map<number, number>) => {
    let minBeta = 10;
    for (const member of members) {
      const area = areas.get(member.id) || member.area;
      const beta = calculateMemberBeta(member, area);
      minBeta = Math.min(minBeta, beta);
    }
    return minBeta;
  };

  const currentAreas = new Map<number, number>();
  for (const member of members) {
    currentAreas.set(member.id, member.area);
  }

  const initialAreas = members.map(m => ({ memberId: m.id, area: m.area }));
  const initialBeta = calculateSystemBeta(currentAreas);

  const convergenceHistory: RBDOResult['convergenceHistory'] = [];
  let iteration = 0;

  convergenceHistory.push({ iteration: 0, systemBeta: initialBeta, maxAreaChange: 0 });

  while (iteration < maxIterations) {
    iteration++;
    const systemBeta = calculateSystemBeta(currentAreas);
    if (Math.abs(systemBeta - targetBeta) < tolerance) break;

    const memberBetas: { memberId: number; beta: number; area: number }[] = [];
    for (const member of members) {
      const area = currentAreas.get(member.id) || member.area;
      const beta = calculateMemberBeta(member, area);
      memberBetas.push({ memberId: member.id, beta, area });
    }
    memberBetas.sort((a, b) => a.beta - b.beta);

    let maxAreaChange = 0;
    const betaGap = targetBeta - systemBeta;

    for (const { memberId, beta, area } of memberBetas) {
      const memberBetaGap = targetBeta - beta;
      if (memberBetaGap > tolerance) {
        const result = memberResults.find(r => r.memberId === memberId);
        if (!result || result.stress === 0) continue;
        const adjustmentFactor = 1 + memberBetaGap / (beta + 1) * 0.3;
        const newArea = Math.min(area * adjustmentFactor, area * 3);
        const areaChange = (newArea - area) / area;
        maxAreaChange = Math.max(maxAreaChange, Math.abs(areaChange));
        currentAreas.set(memberId, newArea);
      } else if (memberBetaGap < -tolerance * 2 && betaGap < 0) {
        const adjustmentFactor = 1 - Math.abs(memberBetaGap) / (beta + 1) * 0.1;
        const newArea = Math.max(area * adjustmentFactor, area * 0.5);
        const areaChange = (newArea - area) / area;
        maxAreaChange = Math.max(maxAreaChange, Math.abs(areaChange));
        currentAreas.set(memberId, newArea);
      }
    }

    const newSystemBeta = calculateSystemBeta(currentAreas);
    convergenceHistory.push({ iteration, systemBeta: newSystemBeta, maxAreaChange });
    if (maxAreaChange < 0.001) break;
  }

  const finalBeta = calculateSystemBeta(currentAreas);
  const optimizedAreas = members.map(m => {
    const newArea = currentAreas.get(m.id) || m.area;
    return { memberId: m.id, area: newArea, change: (newArea - m.area) / m.area * 100 };
  });
  const totalAreaIncrease = optimizedAreas.reduce((sum, a) => {
    const original = members.find(m => m.id === a.memberId)?.area || 0;
    return sum + (a.area - original);
  }, 0);

  return {
    success: Math.abs(finalBeta - targetBeta) < tolerance,
    iterations: iteration,
    targetBeta,
    initialBeta,
    finalBeta,
    initialAreas,
    optimizedAreas,
    totalAreaIncrease,
    convergenceHistory
  };
}
