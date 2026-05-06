// Reliability and Probability of Failure calculations
// Based on First-Order Reliability Method (FORM) and limit state functions

// Re-export probability primitives from consolidated module for backward compatibility
export { normalCDF, normalInverseCDF } from '@/lib/probability';

import { normalCDF, normalInverseCDF } from '@/lib/probability';

// Reliability index (beta) for R-S type limit state
// g(X) = R - S where R is resistance and S is load effect
export function reliabilityIndex(
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number
): number {
  const meanG = meanR - meanS;
  const stdG = Math.sqrt(stdR * stdR + stdS * stdS);
  return meanG / stdG;
}

// Probability of failure from reliability index
export function probabilityOfFailure(beta: number): number {
  return normalCDF(-beta);
}

// Full reliability analysis
export interface ReliabilityResult {
  beta: number;
  pf: number;
  meanSafetyMargin: number;
  stdSafetyMargin: number;
  centralSafetyFactor: number;
  // SORM additions
  betaSorm?: number;
  pfSorm?: number;
  curvatureCorrection?: number;
}

// SORM (Second-Order Reliability Method) correction
// Accounts for curvature of the limit state surface
export function sormCorrection(beta: number, principalCurvatures: number[]): number {
  // Breitung's formula for SORM
  let product = 1;
  for (const kappa of principalCurvatures) {
    product *= 1 / Math.sqrt(1 + beta * kappa);
  }
  return product;
}

// Estimate curvature from second derivatives of limit state function
export function estimateCurvature(
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number
): number[] {
  // For g(X) = R - S, the limit state surface curvature depends on
  // the ratio of standard deviations and correlation structure
  // Simplified approximation for demonstration
  const ratio = stdS / stdR;
  const curvature = (ratio - 1) / (stdR + stdS);
  return [curvature]; // Single curvature for 2D problem
}

export function reliabilityAnalysis(
  meanResistance: number,
  covResistance: number,  // coefficient of variation
  meanLoad: number,
  covLoad: number
): ReliabilityResult {
  const stdR = meanResistance * covResistance;
  const stdS = meanLoad * covLoad;
  const beta = reliabilityIndex(meanResistance, stdR, meanLoad, stdS);
  const pf = probabilityOfFailure(beta);
  
  // SORM correction
  const curvatures = estimateCurvature(meanResistance, stdR, meanLoad, stdS);
  const correction = sormCorrection(beta, curvatures);
  const pfSorm = pf * correction;
  const betaSorm = -normalInverseCDF(pfSorm);
  
  return {
    beta,
    pf,
    meanSafetyMargin: meanResistance - meanLoad,
    stdSafetyMargin: Math.sqrt(stdR * stdR + stdS * stdS),
    centralSafetyFactor: meanResistance / meanLoad,
    betaSorm: isFinite(betaSorm) ? betaSorm : beta,
    pfSorm: isFinite(pfSorm) ? pfSorm : pf,
    curvatureCorrection: correction
  };
}

// Re-export beam analysis domain logic for backward compatibility
export {
  type LoadType,
  type BeamType,
  type CrossSectionType,
  type CrossSectionDimensions,
  type CrossSectionProperties,
  type BeamAnalysis,
  type LoadConfig,
  type HybridLoadConfig,
  type LoadCombination,
  type DiagramPoint,
  type InfluencePoint,
  type EnvelopePoint,
  calculateCrossSectionProperties,
  analyzeSimplySupported,
  analyzeCantilever,
  analyzeFixedFixed,
  analyzeProppedCantilever,
  analyzeOverhanging,
  analyzeContinuous,
  analyzeHybridLoads,
  generateDiagramData,
  generateHybridDiagramData,
  generateInfluenceLineData,
  generateEnvelopeData,
} from "@/lib/beamAnalysis";


export interface DynamicResponse {
  naturalFrequency: number;       // rad/s
  dampingRatio: number;
  maxDisplacement: number;        // m
  maxVelocity: number;            // m/s
  maxAcceleration: number;        // m/s^2
  dynamicAmplificationFactor: number;
}

export function analyzeDynamicResponse(
  mass: number,           // kg
  stiffness: number,      // N/m
  damping: number,        // N·s/m
  forceAmplitude: number, // N
  forceFrequency: number  // rad/s
): DynamicResponse {
  const wn = Math.sqrt(stiffness / mass);  // Natural frequency
  const zeta = damping / (2 * Math.sqrt(stiffness * mass)); // Damping ratio
  const r = forceFrequency / wn;  // Frequency ratio
  
  // Dynamic amplification factor (DAF)
  const DAF = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
  
  // Static displacement
  const staticDisp = forceAmplitude / stiffness;
  
  // Maximum dynamic displacement
  const maxDisp = staticDisp * DAF;
  
  // Maximum velocity and acceleration (approximate for steady-state)
  const maxVel = maxDisp * forceFrequency;
  const maxAccel = maxDisp * forceFrequency * forceFrequency;
  
  return {
    naturalFrequency: wn,
    dampingRatio: zeta,
    maxDisplacement: maxDisp,
    maxVelocity: maxVel,
    maxAcceleration: maxAccel,
    dynamicAmplificationFactor: DAF
  };
}

// Generate frequency response data
export function generateFrequencyResponse(
  mass: number,
  stiffness: number,
  damping: number,
  maxFreqRatio: number = 3
): { r: number; DAF: number }[] {
  const wn = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  
  const data: { r: number; DAF: number }[] = [];
  for (let r = 0.01; r <= maxFreqRatio; r += 0.02) {
    const DAF = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
    data.push({ r, DAF });
  }
  return data;
}

// Monte Carlo simulation for probability of failure
export function monteCarloReliability(
  meanR: number,
  stdR: number,
  meanS: number,
  stdS: number,
  numSimulations: number = 10000
): { pf: number; samples: { r: number; s: number; failed: boolean }[] } {
  let failures = 0;
  const samples: { r: number; s: number; failed: boolean }[] = [];
  
  // Box-Muller for normal random
  const normalRandom = (mu: number, sigma: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * sigma + mu;
  };
  
  for (let i = 0; i < numSimulations; i++) {
    const r = normalRandom(meanR, stdR);
    const s = normalRandom(meanS, stdS);
    const failed = r < s;
    if (failed) failures++;
    
    // Store subset for visualization
    if (i < 500) {
      samples.push({ r, s, failed });
    }
  }
  
  return { pf: failures / numSimulations, samples };
}

// Time history response for SDOF system
export function generateTimeHistory(
  mass: number,
  stiffness: number,
  damping: number,
  forceAmplitude: number,
  forceFrequency: number,
  duration: number = 10,
  dt: number = 0.01
): { t: number; x: number; F: number }[] {
  const wn = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = wn * Math.sqrt(1 - zeta * zeta);
  
  const data: { t: number; x: number; F: number }[] = [];
  
  // Numerical integration (Newmark-beta method simplified)
  let x = 0, v = 0;
  
  for (let t = 0; t <= duration; t += dt) {
    const F = forceAmplitude * Math.sin(forceFrequency * t);
    
    // Simple explicit integration
    const a = (F - damping * v - stiffness * x) / mass;
    v += a * dt;
    x += v * dt;
    
    data.push({ t, x, F });
  }
  
  return data;
}
