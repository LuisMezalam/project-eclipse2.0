// Advanced Reliability Analysis Functions
// RBDO, Sensitivity-Driven Adaptive Sampling, Time-Dependent Reliability

import { normalRandom, normalQuantile, normalCDF, normalInverseCDF } from '@/lib/probability';
import { reliabilityIndex, probabilityOfFailure } from './reliability';

// ===== RELIABILITY-BASED DESIGN OPTIMIZATION (RBDO) =====

export interface RBDOVariable {
  name: string;
  mean: number;
  stdDev: number;
  lowerBound: number;
  upperBound: number;
  isDesign: boolean; // true = design variable (optimizable), false = random variable
  unit: string;
}

export interface RBDOConstraint {
  name: string;
  targetReliability: number; // Target β value
  limitStateFunction: (designVars: number[], randomVars: number[]) => number; // g(x,z) < 0 is failure
}

export interface RBDOResult {
  optimalDesign: number[];
  optimalMeans: number[];
  reliabilityIndex: number;
  probabilityOfFailure: number;
  objectiveValue: number;
  convergenceHistory: { iteration: number; objective: number; beta: number; feasible: boolean }[];
  sensitivityToDesign: number[];
  iterationCount: number;
  status: 'converged' | 'maxIterations' | 'infeasible';
}

// FORM-based reliability analysis for a single limit state
function computeFORMReliability(
  limitState: (vars: number[]) => number,
  means: number[],
  stdDevs: number[],
  maxIterations: number = 50
): { beta: number; designPoint: number[]; gradients: number[] } {
  const dim = means.length;
  let u = new Array(dim).fill(0); // Start at mean (origin in standard normal space)
  let beta = 0;
  const gradients = new Array(dim).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Transform to physical space
    const x = u.map((ui, i) => means[i] + ui * stdDevs[i]);
    
    // Evaluate limit state
    const g = limitState(x);
    
    // Compute gradients via finite differences
    const h = 1e-6;
    for (let i = 0; i < dim; i++) {
      const xPlus = [...x];
      xPlus[i] += h * stdDevs[i];
      const gPlus = limitState(xPlus);
      gradients[i] = (gPlus - g) / (h * stdDevs[i]);
    }
    
    // Gradient magnitude
    const gradNorm = Math.sqrt(gradients.reduce((sum, gi) => sum + gi * gi, 0));
    if (gradNorm < 1e-10) break;
    
    // Normalized gradient (unit vector toward failure surface)
    const alpha = gradients.map(gi => gi / gradNorm);
    
    // Update design point using HL-RF algorithm
    const dotProduct = u.reduce((sum, ui, i) => sum + ui * alpha[i], 0);
    beta = -(g / gradNorm) + dotProduct;
    
    // New point on failure surface
    const uNew = alpha.map(ai => -ai * beta);
    
    // Check convergence
    const diff = Math.sqrt(uNew.reduce((sum, ui, i) => sum + Math.pow(ui - u[i], 2), 0));
    u = uNew;
    
    if (diff < 1e-6 && Math.abs(g) < 1e-4 * Math.abs(means[0])) break;
  }
  
  // Transform design point back to physical space
  const designPoint = u.map((ui, i) => means[i] + ui * stdDevs[i]);
  
  return { beta: Math.abs(beta), designPoint, gradients };
}

// Sequential Quadratic Programming (SQP) based RBDO
export function performRBDO(
  variables: RBDOVariable[],
  objectiveFunction: (designMeans: number[]) => number, // Minimize this (e.g., cost, weight)
  constraint: RBDOConstraint,
  options: {
    maxIterations?: number;
    tolerance?: number;
    stepSize?: number;
    penaltyFactor?: number;
  } = {}
): RBDOResult {
  const {
    maxIterations = 100,
    tolerance = 1e-4,
    stepSize = 0.1,
    penaltyFactor = 1000
  } = options;
  
  const designVars = variables.filter(v => v.isDesign);
  const randomVars = variables.filter(v => !v.isDesign);
  
  // Initial design = current means
  let currentDesign = designVars.map(v => v.mean);
  const convergenceHistory: RBDOResult['convergenceHistory'] = [];
  
  let bestDesign = [...currentDesign];
  let bestObjective = Infinity;
  let bestBeta = 0;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Current objective value
    const objective = objectiveFunction(currentDesign);
    
    // Compute reliability for current design
    const allMeans = [...currentDesign, ...randomVars.map(v => v.mean)];
    const allStdDevs = [...designVars.map(v => v.stdDev), ...randomVars.map(v => v.stdDev)];
    
    // Create limit state function with fixed design
    const limitState = (x: number[]) => {
      const designPart = currentDesign;
      const randomPart = x.slice(designVars.length);
      return constraint.limitStateFunction(designPart, randomPart);
    };
    
    // FORM analysis
    const form = computeFORMReliability(
      (x) => constraint.limitStateFunction(
        x.slice(0, designVars.length), 
        x.slice(designVars.length)
      ),
      allMeans,
      allStdDevs
    );
    
    const beta = form.beta;
    const feasible = beta >= constraint.targetReliability;
    
    // Penalized objective for constraint violation
    const constraintViolation = Math.max(0, constraint.targetReliability - beta);
    const penalizedObjective = objective + penaltyFactor * constraintViolation * constraintViolation;
    
    convergenceHistory.push({ iteration: iter, objective, beta, feasible });
    
    // Update best if improved
    if (penalizedObjective < bestObjective) {
      bestObjective = penalizedObjective;
      bestDesign = [...currentDesign];
      bestBeta = beta;
    }
    
    // Compute gradients of objective and reliability w.r.t. design variables
    const h = 1e-5;
    const objGradient = currentDesign.map((_, i) => {
      const designPlus = [...currentDesign];
      designPlus[i] += h;
      return (objectiveFunction(designPlus) - objective) / h;
    });
    
    // Sensitivity of reliability to design variables
    const betaGradient = currentDesign.map((_, i) => {
      const designPlus = [...currentDesign];
      designPlus[i] += h;
      
      const allMeansPlus = [...designPlus, ...randomVars.map(v => v.mean)];
      const formPlus = computeFORMReliability(
        (x) => constraint.limitStateFunction(
          x.slice(0, designVars.length), 
          x.slice(designVars.length)
        ),
        allMeansPlus,
        allStdDevs
      );
      return (formPlus.beta - beta) / h;
    });
    
    // Combined gradient with penalty
    const combinedGradient = objGradient.map((og, i) => 
      og - 2 * penaltyFactor * constraintViolation * betaGradient[i]
    );
    
    // Update design (gradient descent with projection to bounds)
    const newDesign = currentDesign.map((d, i) => {
      const updated = d - stepSize * combinedGradient[i];
      return Math.max(designVars[i].lowerBound, Math.min(designVars[i].upperBound, updated));
    });
    
    // Check convergence
    const designChange = Math.sqrt(newDesign.reduce((sum, d, i) => 
      sum + Math.pow(d - currentDesign[i], 2), 0
    ));
    
    currentDesign = newDesign;
    
    if (designChange < tolerance && feasible) {
      return {
        optimalDesign: bestDesign,
        optimalMeans: [...bestDesign, ...randomVars.map(v => v.mean)],
        reliabilityIndex: bestBeta,
        probabilityOfFailure: normalCDF(-bestBeta),
        objectiveValue: objectiveFunction(bestDesign),
        convergenceHistory,
        sensitivityToDesign: betaGradient,
        iterationCount: iter + 1,
        status: 'converged'
      };
    }
  }
  
  return {
    optimalDesign: bestDesign,
    optimalMeans: [...bestDesign, ...randomVars.map(v => v.mean)],
    reliabilityIndex: bestBeta,
    probabilityOfFailure: normalCDF(-bestBeta),
    objectiveValue: objectiveFunction(bestDesign),
    convergenceHistory,
    sensitivityToDesign: new Array(designVars.length).fill(0),
    iterationCount: maxIterations,
    status: convergenceHistory[convergenceHistory.length - 1]?.feasible ? 'maxIterations' : 'infeasible'
  };
}

// ===== SENSITIVITY-DRIVEN ADAPTIVE SAMPLING =====

export interface AdaptiveSamplingResult {
  samples: { point: number[]; weight: number; response: number }[];
  refinedRegions: { center: number[]; radius: number; importance: number }[];
  statistics: { mean: number; variance: number; stdDev: number };
  sensitivityMap: { dimension: number; sensitivity: number }[];
  convergenceHistory: { iteration: number; mean: number; variance: number; numSamples: number }[];
  effectiveSampleSize: number;
}

// Compute local sensitivity at a point
function computeLocalSensitivity(
  responseFunction: (x: number[]) => number,
  point: number[],
  stdDevs: number[],
  h: number = 1e-4
): number[] {
  const dim = point.length;
  const sensitivities: number[] = [];
  const f0 = responseFunction(point);
  
  for (let i = 0; i < dim; i++) {
    const pointPlus = [...point];
    const pointMinus = [...point];
    pointPlus[i] += h * stdDevs[i];
    pointMinus[i] -= h * stdDevs[i];
    
    const fPlus = responseFunction(pointPlus);
    const fMinus = responseFunction(pointMinus);
    
    // Normalized sensitivity: (∂f/∂x_i) * σ_i
    sensitivities.push(Math.abs((fPlus - fMinus) / (2 * h)));
  }
  
  return sensitivities;
}

// Importance function for adaptive sampling
function computeImportanceWeight(
  point: number[],
  means: number[],
  stdDevs: number[],
  sensitivities: number[]
): number {
  const dim = point.length;
  let weight = 1;
  
  for (let i = 0; i < dim; i++) {
    // Higher weight for regions with high sensitivity
    const normalizedDist = Math.abs(point[i] - means[i]) / stdDevs[i];
    const sensitivityFactor = 1 + sensitivities[i];
    
    // Importance: prioritize tails of sensitive dimensions
    weight *= sensitivityFactor * Math.exp(-0.5 * normalizedDist * normalizedDist / sensitivityFactor);
  }
  
  return weight;
}

export function performAdaptiveSampling(
  responseFunction: (x: number[]) => number,
  means: number[],
  stdDevs: number[],
  options: {
    initialSamples?: number;
    refinementIterations?: number;
    samplesPerRefinement?: number;
    sensitivityThreshold?: number;
  } = {}
): AdaptiveSamplingResult {
  const {
    initialSamples = 100,
    refinementIterations = 5,
    samplesPerRefinement = 50,
    sensitivityThreshold = 0.1
  } = options;
  
  const dim = means.length;
  const samples: AdaptiveSamplingResult['samples'] = [];
  const refinedRegions: AdaptiveSamplingResult['refinedRegions'] = [];
  const convergenceHistory: AdaptiveSamplingResult['convergenceHistory'] = [];
  
  // Initial Latin Hypercube-like sampling
  for (let i = 0; i < initialSamples; i++) {
    const point = means.map((m, d) => m + normalRandom(0, 1) * stdDevs[d]);
    const response = responseFunction(point);
    const sensitivities = computeLocalSensitivity(responseFunction, point, stdDevs);
    const weight = computeImportanceWeight(point, means, stdDevs, sensitivities);
    
    samples.push({ point, weight, response });
  }
  
  // Compute initial statistics
  let stats = computeWeightedStatistics(samples);
  convergenceHistory.push({ 
    iteration: 0, 
    mean: stats.mean, 
    variance: stats.variance, 
    numSamples: samples.length 
  });
  
  // Global sensitivity analysis
  const globalSensitivities = new Array(dim).fill(0);
  for (const sample of samples) {
    const localSens = computeLocalSensitivity(responseFunction, sample.point, stdDevs);
    localSens.forEach((s, i) => globalSensitivities[i] += s * sample.weight);
  }
  const totalWeight = samples.reduce((sum, s) => sum + s.weight, 0);
  globalSensitivities.forEach((_, i) => globalSensitivities[i] /= totalWeight);
  
  // Normalize sensitivities
  const maxSens = Math.max(...globalSensitivities);
  const normalizedSensitivities = globalSensitivities.map(s => s / maxSens);
  
  // Refinement iterations
  for (let iter = 0; iter < refinementIterations; iter++) {
    // Identify high-sensitivity regions
    const highSensRegions: { center: number[]; importance: number }[] = [];
    
    // Find samples in tails with high local sensitivity
    for (const sample of samples) {
      const localSens = computeLocalSensitivity(responseFunction, sample.point, stdDevs);
      const maxLocalSens = Math.max(...localSens);
      
      // Check if in tail (|z| > 1.5)
      const isInTail = sample.point.some((p, d) => 
        Math.abs(p - means[d]) / stdDevs[d] > 1.5
      );
      
      if (maxLocalSens > sensitivityThreshold * maxSens && isInTail) {
        highSensRegions.push({
          center: sample.point,
          importance: maxLocalSens
        });
      }
    }
    
    // Add refined samples around high-sensitivity regions
    if (highSensRegions.length > 0) {
      // Sort by importance
      highSensRegions.sort((a, b) => b.importance - a.importance);
      
      // Take top regions
      const numRegions = Math.min(5, highSensRegions.length);
      const samplesPerRegion = Math.floor(samplesPerRefinement / numRegions);
      
      for (let r = 0; r < numRegions; r++) {
        const region = highSensRegions[r];
        const radius = 0.5; // Refinement radius in standard normal units
        
        refinedRegions.push({
          center: region.center,
          radius,
          importance: region.importance
        });
        
        // Add samples in this region
        for (let s = 0; s < samplesPerRegion; s++) {
          const point = region.center.map((c, d) => 
            c + normalRandom(0, radius * stdDevs[d])
          );
          const response = responseFunction(point);
          const sensitivities = computeLocalSensitivity(responseFunction, point, stdDevs);
          const weight = computeImportanceWeight(point, means, stdDevs, sensitivities) * 2; // Double weight for refined
          
          samples.push({ point, weight, response });
        }
      }
    } else {
      // If no high-sensitivity regions, add uniform samples
      for (let s = 0; s < samplesPerRefinement; s++) {
        const point = means.map((m, d) => m + normalRandom(0, 1) * stdDevs[d]);
        const response = responseFunction(point);
        const sensitivities = computeLocalSensitivity(responseFunction, point, stdDevs);
        const weight = computeImportanceWeight(point, means, stdDevs, sensitivities);
        
        samples.push({ point, weight, response });
      }
    }
    
    // Update statistics
    stats = computeWeightedStatistics(samples);
    convergenceHistory.push({ 
      iteration: iter + 1, 
      mean: stats.mean, 
      variance: stats.variance, 
      numSamples: samples.length 
    });
  }
  
  // Compute effective sample size
  const weights = samples.map(s => s.weight);
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumW2 = weights.reduce((a, b) => a + b * b, 0);
  const effectiveSampleSize = (sumW * sumW) / sumW2;
  
  // Sensitivity map
  const sensitivityMap = normalizedSensitivities.map((s, i) => ({
    dimension: i,
    sensitivity: s
  })).sort((a, b) => b.sensitivity - a.sensitivity);
  
  return {
    samples,
    refinedRegions,
    statistics: stats,
    sensitivityMap,
    convergenceHistory,
    effectiveSampleSize
  };
}

function computeWeightedStatistics(
  samples: { weight: number; response: number }[]
): { mean: number; variance: number; stdDev: number } {
  const totalWeight = samples.reduce((sum, s) => sum + s.weight, 0);
  const mean = samples.reduce((sum, s) => sum + s.weight * s.response, 0) / totalWeight;
  const variance = samples.reduce((sum, s) => 
    sum + s.weight * Math.pow(s.response - mean, 2), 0
  ) / totalWeight;
  
  return { mean, variance, stdDev: Math.sqrt(variance) };
}

// ===== TIME-DEPENDENT RELIABILITY ANALYSIS =====

export interface StochasticProcess {
  type: 'gaussian' | 'ornstein-uhlenbeck' | 'karhunen-loeve';
  mean: number;
  variance: number;
  correlationTime: number; // Characteristic time scale
  correlationLength?: number;
}

export interface TimeDependentReliabilityResult {
  timePoints: number[];
  instantReliability: number[]; // β(t)
  cumulativeReliability: number[]; // P(no failure in [0,t])
  firstPassageTime: { mean: number; stdDev: number; percentiles: number[] };
  loadTimeHistory: { time: number; mean: number; upper: number; lower: number }[];
  resistanceTimeHistory: { time: number; mean: number; upper: number; lower: number }[];
  outcrossingRate: number[];
  hazardFunction: number[];
  crossingEvents: { time: number; value: number }[];
}

// Generate Gaussian process sample path
function generateGaussianProcessPath(
  process: StochasticProcess,
  timePoints: number[],
  seed?: number
): number[] {
  const n = timePoints.length;
  const path: number[] = [];
  
  // Covariance function (squared exponential)
  const covariance = (t1: number, t2: number): number => {
    const tau = Math.abs(t1 - t2) / process.correlationTime;
    return process.variance * Math.exp(-0.5 * tau * tau);
  };
  
  // Build covariance matrix
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K[i] = [];
    for (let j = 0; j < n; j++) {
      K[i][j] = covariance(timePoints[i], timePoints[j]);
      if (i === j) K[i][j] += 1e-8; // Regularization
    }
  }
  
  // Cholesky decomposition
  const L = choleskyDecomposition(K);
  
  // Generate standard normal samples
  const z: number[] = [];
  for (let i = 0; i < n; i++) {
    z.push(normalRandom(0, 1));
  }
  
  // Transform to correlated samples: y = mean + L * z
  for (let i = 0; i < n; i++) {
    let sum = process.mean;
    for (let j = 0; j <= i; j++) {
      sum += L[i][j] * z[j];
    }
    path.push(sum);
  }
  
  return path;
}

// Ornstein-Uhlenbeck process (mean-reverting)
function generateOUProcessPath(
  process: StochasticProcess,
  timePoints: number[]
): number[] {
  const path: number[] = [];
  const dt = timePoints.length > 1 ? timePoints[1] - timePoints[0] : 1;
  const theta = 1 / process.correlationTime; // Mean reversion rate
  const sigma = Math.sqrt(2 * theta * process.variance);
  
  let x = process.mean; // Start at mean
  
  for (let i = 0; i < timePoints.length; i++) {
    path.push(x);
    
    // Euler-Maruyama step
    const dW = normalRandom(0, Math.sqrt(dt));
    x = x + theta * (process.mean - x) * dt + sigma * dW;
  }
  
  return path;
}

// Cholesky decomposition
function choleskyDecomposition(A: number[][]): number[][] {
  const n = A.length;
  const L: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      
      if (i === j) {
        for (let k = 0; k < j; k++) {
          sum += L[j][k] * L[j][k];
        }
        L[j][j] = Math.sqrt(Math.max(0, A[j][j] - sum));
      } else {
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        L[i][j] = L[j][j] !== 0 ? (A[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  
  return L;
}

// Time-dependent reliability analysis with stochastic processes
export function analyzeTimeDependentReliability(
  loadProcess: StochasticProcess,
  resistanceProcess: StochasticProcess,
  timeSpan: number, // Total time duration
  numTimePoints: number = 100,
  numSimulations: number = 500,
  threshold: number = 0 // Failure when R - S < threshold
): TimeDependentReliabilityResult {
  const timePoints = Array.from({ length: numTimePoints }, (_, i) => 
    (i / (numTimePoints - 1)) * timeSpan
  );
  
  // Storage for statistics
  const loadPaths: number[][] = [];
  const resistancePaths: number[][] = [];
  const marginPaths: number[][] = [];
  const firstPassageTimes: number[] = [];
  const crossingEvents: { time: number; value: number }[] = [];
  
  // Monte Carlo simulation
  for (let sim = 0; sim < numSimulations; sim++) {
    // Generate load and resistance paths
    const loadPath = loadProcess.type === 'ornstein-uhlenbeck'
      ? generateOUProcessPath(loadProcess, timePoints)
      : generateGaussianProcessPath(loadProcess, timePoints);
    
    const resistancePath = resistanceProcess.type === 'ornstein-uhlenbeck'
      ? generateOUProcessPath(resistanceProcess, timePoints)
      : generateGaussianProcessPath(resistanceProcess, timePoints);
    
    // Safety margin path: g(t) = R(t) - S(t)
    const marginPath = resistancePath.map((r, i) => r - loadPath[i]);
    
    loadPaths.push(loadPath);
    resistancePaths.push(resistancePath);
    marginPaths.push(marginPath);
    
    // Find first passage time (first time margin goes below threshold)
    let failed = false;
    for (let t = 0; t < numTimePoints; t++) {
      if (marginPath[t] < threshold) {
        firstPassageTimes.push(timePoints[t]);
        failed = true;
        break;
      }
      
      // Detect upcrossings (crossing from above threshold)
      if (t > 0 && marginPath[t - 1] >= threshold && marginPath[t] < threshold) {
        crossingEvents.push({ time: timePoints[t], value: marginPath[t] });
      }
    }
    
    if (!failed) {
      firstPassageTimes.push(Infinity); // No failure in time window
    }
  }
  
  // Compute instantaneous reliability at each time point
  const instantReliability = timePoints.map((_, t) => {
    const margins = marginPaths.map(path => path[t]);
    const meanMargin = margins.reduce((a, b) => a + b, 0) / numSimulations;
    const stdMargin = Math.sqrt(
      margins.reduce((sum, m) => sum + Math.pow(m - meanMargin, 2), 0) / numSimulations
    );
    
    // Reliability index at time t
    return stdMargin > 0 ? meanMargin / stdMargin : 10;
  });
  
  // Cumulative reliability: P(no failure in [0,t])
  const cumulativeReliability = timePoints.map((t, idx) => {
    const survivorCount = firstPassageTimes.filter(fpt => fpt > t).length;
    return survivorCount / numSimulations;
  });
  
  // First passage time statistics
  const finiteFPT = firstPassageTimes.filter(t => t !== Infinity);
  const fptMean = finiteFPT.length > 0 
    ? finiteFPT.reduce((a, b) => a + b, 0) / finiteFPT.length 
    : Infinity;
  const fptStdDev = finiteFPT.length > 1
    ? Math.sqrt(finiteFPT.reduce((sum, t) => sum + Math.pow(t - fptMean, 2), 0) / (finiteFPT.length - 1))
    : 0;
  
  // FPT percentiles
  const sortedFPT = [...firstPassageTimes].sort((a, b) => a - b);
  const fptPercentiles = [0.05, 0.25, 0.5, 0.75, 0.95].map(p => {
    const idx = Math.floor(p * numSimulations);
    return sortedFPT[idx] === Infinity ? timeSpan : sortedFPT[idx];
  });
  
  // Load and resistance time histories (mean ± 2σ)
  const loadTimeHistory = timePoints.map((t, idx) => {
    const values = loadPaths.map(path => path[idx]);
    const mean = values.reduce((a, b) => a + b, 0) / numSimulations;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numSimulations);
    return { time: t, mean, upper: mean + 2 * stdDev, lower: mean - 2 * stdDev };
  });
  
  const resistanceTimeHistory = timePoints.map((t, idx) => {
    const values = resistancePaths.map(path => path[idx]);
    const mean = values.reduce((a, b) => a + b, 0) / numSimulations;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numSimulations);
    return { time: t, mean, upper: mean + 2 * stdDev, lower: mean - 2 * stdDev };
  });
  
  // Outcrossing rate (Rice formula approximation)
  const outcrossingRate = timePoints.map((t, idx) => {
    if (idx === 0) return 0;
    
    // Count crossings in interval
    const crossingsInInterval = crossingEvents.filter(e => 
      e.time > timePoints[idx - 1] && e.time <= t
    ).length;
    
    const dt = timePoints[idx] - timePoints[idx - 1];
    return crossingsInInterval / (numSimulations * dt);
  });
  
  // Hazard function: h(t) = -d/dt[ln(R(t))]
  const hazardFunction = timePoints.map((t, idx) => {
    if (idx === 0 || cumulativeReliability[idx] <= 0) return 0;
    
    const dt = idx > 0 ? timePoints[idx] - timePoints[idx - 1] : 1;
    const dR = cumulativeReliability[idx] - cumulativeReliability[idx - 1];
    
    return -dR / (cumulativeReliability[idx] * dt);
  });
  
  return {
    timePoints,
    instantReliability,
    cumulativeReliability,
    firstPassageTime: {
      mean: fptMean === Infinity ? timeSpan : fptMean,
      stdDev: fptStdDev,
      percentiles: fptPercentiles
    },
    loadTimeHistory,
    resistanceTimeHistory,
    outcrossingRate,
    hazardFunction,
    crossingEvents
  };
}

// Generate multiple stochastic load paths for visualization
export function generateStochasticPaths(
  process: StochasticProcess,
  timeSpan: number,
  numPaths: number = 10,
  numPoints: number = 100
): { time: number; [key: string]: number }[] {
  const timePoints = Array.from({ length: numPoints }, (_, i) => 
    (i / (numPoints - 1)) * timeSpan
  );
  
  const paths: number[][] = [];
  for (let p = 0; p < numPaths; p++) {
    paths.push(
      process.type === 'ornstein-uhlenbeck'
        ? generateOUProcessPath(process, timePoints)
        : generateGaussianProcessPath(process, timePoints)
    );
  }
  
  // Format for chart
  return timePoints.map((t, idx) => {
    const point: { time: number; [key: string]: number } = { time: t };
    paths.forEach((path, p) => {
      point[`path${p}`] = path[idx];
    });
    return point;
  });
}

// ===== MONTE CARLO VALIDATION FOR RBDO =====

export interface MonteCarloValidation {
  numSamples: number;
  failureCount: number;
  estimatedPf: number;
  estimatedBeta: number;
  coefficientOfVariation: number;
  confidenceInterval: { lower: number; upper: number };
  sampleLimitStates: number[];
  histogram: { bin: number; count: number }[];
}

// Monte Carlo simulation to validate RBDO results
export function validateRBDOWithMonteCarlo(
  limitStateFunction: (designVars: number[], randomVars: number[]) => number,
  optimalDesign: number[],
  randomMeans: number[],
  randomStdDevs: number[],
  numSamples: number = 10000
): MonteCarloValidation {
  const limitStates: number[] = [];
  let failureCount = 0;
  
  // Generate Monte Carlo samples
  for (let i = 0; i < numSamples; i++) {
    // Sample random variables
    const randomVars = randomMeans.map((mean, idx) => 
      normalRandom(mean, randomStdDevs[idx])
    );
    
    // Evaluate limit state
    const g = limitStateFunction(optimalDesign, randomVars);
    limitStates.push(g);
    
    if (g < 0) failureCount++;
  }
  
  // Estimate probability of failure
  const estimatedPf = failureCount / numSamples;
  const estimatedBeta = estimatedPf > 0 ? -normalQuantile(estimatedPf) : 5;
  
  // Coefficient of variation of Pf estimator
  const cov = estimatedPf > 0 
    ? Math.sqrt((1 - estimatedPf) / (numSamples * estimatedPf))
    : 0;
  
  // 95% confidence interval for Pf
  const z95 = 1.96;
  const ciLower = Math.max(0, estimatedPf - z95 * estimatedPf * cov);
  const ciUpper = estimatedPf + z95 * estimatedPf * cov;
  
  // Create histogram of limit state values
  const minG = Math.min(...limitStates);
  const maxG = Math.max(...limitStates);
  const binWidth = (maxG - minG) / 30;
  const histogram: { bin: number; count: number }[] = [];
  
  for (let i = 0; i < 30; i++) {
    const binStart = minG + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = limitStates.filter(g => g >= binStart && g < binEnd).length;
    histogram.push({ bin: binStart + binWidth / 2, count });
  }
  
  return {
    numSamples,
    failureCount,
    estimatedPf,
    estimatedBeta,
    coefficientOfVariation: cov,
    confidenceInterval: { lower: ciLower, upper: ciUpper },
    sampleLimitStates: limitStates.slice(0, 500), // Keep first 500 for visualization
    histogram
  };
}

// ===== SYSTEM RELIABILITY ANALYSIS =====

export interface SystemComponent {
  id: string;
  name: string;
  reliabilityIndex: number;
  probabilityOfFailure: number;
  importance: number; // Birnbaum importance
}

export interface CommonCauseGroup {
  componentIds: string[];
  betaFactor: number; // Beta-factor model parameter (0-1)
  shockRate: number;  // Rate of common cause shocks
}

export interface SystemReliabilityResult {
  systemType: 'series' | 'parallel' | 'series-parallel' | 'k-out-of-n';
  systemPf: number;
  systemBeta: number;
  boundsPf: { lower: number; upper: number };
  componentImportance: { id: string; birnbaum: number; fusselVesely: number; riskAchievement: number }[];
  correlationEffect: number;
  commonCauseContribution: number;
  cutSets?: { components: string[]; probability: number }[];
  pathSets?: { components: string[]; probability: number }[];
}

// Series system: system fails if ANY component fails
function seriesSystemPf(
  components: SystemComponent[],
  correlationMatrix: number[][]
): { pf: number; bounds: { lower: number; upper: number } } {
  const n = components.length;
  const pfs = components.map(c => c.probabilityOfFailure);
  
  // Independent case (lower bound)
  const pfIndependent = 1 - pfs.reduce((prod, pf) => prod * (1 - pf), 1);
  
  // Perfect correlation case (upper bound)
  const pfPerfect = Math.max(...pfs);
  
  // First-order bounds (Ditlevsen bounds)
  const pfSum = pfs.reduce((sum, pf) => sum + pf, 0);
  let pfPairMax = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const rho = correlationMatrix[i][j];
      // Joint probability approximation using bivariate normal
      const jointPf = bivariateNormalCDF(
        -components[i].reliabilityIndex,
        -components[j].reliabilityIndex,
        rho
      );
      pfPairMax = Math.max(pfPairMax, jointPf);
    }
  }
  
  // Estimate with correlation
  const avgCorr = correlationMatrix.flat().reduce((s, r) => s + r, 0) / (n * n);
  const pfEstimate = pfIndependent + (pfPerfect - pfIndependent) * Math.sqrt(avgCorr);
  
  return {
    pf: Math.min(1, pfEstimate),
    bounds: { lower: pfPerfect, upper: Math.min(1, pfSum) }
  };
}

// Parallel system: system fails only if ALL components fail
function parallelSystemPf(
  components: SystemComponent[],
  correlationMatrix: number[][]
): { pf: number; bounds: { lower: number; upper: number } } {
  const n = components.length;
  const pfs = components.map(c => c.probabilityOfFailure);
  
  // Independent case (lower bound)
  const pfIndependent = pfs.reduce((prod, pf) => prod * pf, 1);
  
  // Perfect correlation case (upper bound)
  const pfPerfect = Math.min(...pfs);
  
  // Estimate with correlation
  const avgCorr = correlationMatrix.flat().reduce((s, r) => s + r, 0) / (n * n);
  const pfEstimate = pfIndependent + (pfPerfect - pfIndependent) * Math.sqrt(avgCorr);
  
  return {
    pf: pfEstimate,
    bounds: { lower: pfIndependent, upper: pfPerfect }
  };
}

// K-out-of-N system: system fails if fewer than K components survive
function kOutOfNSystemPf(
  components: SystemComponent[],
  k: number,
  correlationMatrix: number[][]
): { pf: number; bounds: { lower: number; upper: number } } {
  const n = components.length;
  const pfs = components.map(c => c.probabilityOfFailure);
  const rs = pfs.map(pf => 1 - pf); // Reliabilities
  
  // For independent case, use binomial-like calculation
  let pfIndependent = 0;
  
  // Sum over all combinations with fewer than k survivors
  for (let numFailed = n - k + 1; numFailed <= n; numFailed++) {
    const combos = binomialCoefficient(n, numFailed);
    // Approximate: use average pf
    const avgPf = pfs.reduce((s, p) => s + p, 0) / n;
    pfIndependent += combos * Math.pow(avgPf, numFailed) * Math.pow(1 - avgPf, n - numFailed);
  }
  
  // Bounds
  const avgCorr = correlationMatrix.flat().reduce((s, r) => s + r, 0) / (n * n);
  const pfPerfectCorr = k === n ? Math.min(...pfs) : Math.max(...pfs);
  const pfEstimate = pfIndependent + (pfPerfectCorr - pfIndependent) * avgCorr;
  
  return {
    pf: Math.max(0, Math.min(1, pfEstimate)),
    bounds: { lower: pfIndependent, upper: pfPerfectCorr }
  };
}

// Bivariate normal CDF approximation
function bivariateNormalCDF(a: number, b: number, rho: number): number {
  // Use Drezner-Wesolowsky approximation
  if (Math.abs(rho) < 1e-10) {
    return normalCDF(a) * normalCDF(b);
  }
  
  if (rho === 1) {
    return normalCDF(Math.min(a, b));
  }
  
  if (rho === -1) {
    return Math.max(0, normalCDF(a) - normalCDF(-b));
  }
  
  // Approximate using Gauss-Legendre quadrature
  const w = [0.1713245, 0.3607616, 0.4679139];
  const x = [0.9324695, 0.6612094, 0.2386192];
  
  let sum = 0;
  const rhoStar = Math.sqrt(1 - rho * rho);
  
  for (let i = 0; i < 3; i++) {
    for (const sign of [-1, 1]) {
      const xi = sign * x[i];
      const val = (a * rho - b) / rhoStar;
      const term = normalCDF(val + xi * Math.sqrt(2) * rhoStar);
      sum += w[i] * term * Math.exp(-xi * xi);
    }
  }
  
  return normalCDF(a) * normalCDF(b) + sum * rho / (2 * Math.PI);
}

// Binomial coefficient
function binomialCoefficient(n: number, k: number): number {
  if (k > n || k < 0) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

// Common cause failure model (Beta-factor method)
function applyCommonCauseFailures(
  components: SystemComponent[],
  commonCauseGroups: CommonCauseGroup[]
): { adjustedComponents: SystemComponent[]; ccfContribution: number } {
  const adjustedComponents = components.map(c => ({ ...c }));
  let ccfContribution = 0;
  
  for (const group of commonCauseGroups) {
    const beta = group.betaFactor;
    
    // For each component in the group
    for (const compId of group.componentIds) {
      const comp = adjustedComponents.find(c => c.id === compId);
      if (comp) {
        // Split failure rate into independent and common cause
        const originalPf = comp.probabilityOfFailure;
        const independentPf = originalPf * (1 - beta);
        const commonCausePf = originalPf * beta;
        
        // Common cause affects all components simultaneously
        // Increase effective Pf for correlated failures
        comp.probabilityOfFailure = independentPf + commonCausePf * Math.pow(group.componentIds.length, 0.3);
        comp.reliabilityIndex = -normalQuantile(comp.probabilityOfFailure);
        
        ccfContribution += commonCausePf;
      }
    }
  }
  
  return { adjustedComponents, ccfContribution: ccfContribution / components.length };
}

// Component importance measures
function computeImportanceMeasures(
  components: SystemComponent[],
  systemType: 'series' | 'parallel' | 'k-out-of-n',
  k: number = 0,
  correlationMatrix: number[][]
): { id: string; birnbaum: number; fusselVesely: number; riskAchievement: number }[] {
  const importance: { id: string; birnbaum: number; fusselVesely: number; riskAchievement: number }[] = [];
  
  // Compute base system Pf
  let basePf: number;
  if (systemType === 'series') {
    basePf = seriesSystemPf(components, correlationMatrix).pf;
  } else if (systemType === 'parallel') {
    basePf = parallelSystemPf(components, correlationMatrix).pf;
  } else {
    basePf = kOutOfNSystemPf(components, k, correlationMatrix).pf;
  }
  
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    
    // Birnbaum importance: ∂Psys/∂Pi
    const modifiedComps = components.map((c, idx) => 
      idx === i ? { ...c, probabilityOfFailure: 1 } : c
    );
    
    let pfWith1: number;
    if (systemType === 'series') {
      pfWith1 = 1; // If one component fails with certainty in series
    } else if (systemType === 'parallel') {
      pfWith1 = parallelSystemPf(modifiedComps, correlationMatrix).pf;
    } else {
      pfWith1 = kOutOfNSystemPf(modifiedComps, k, correlationMatrix).pf;
    }
    
    const modifiedComps0 = components.map((c, idx) => 
      idx === i ? { ...c, probabilityOfFailure: 0 } : c
    );
    
    let pfWith0: number;
    if (systemType === 'series') {
      pfWith0 = seriesSystemPf(modifiedComps0, correlationMatrix).pf;
    } else if (systemType === 'parallel') {
      pfWith0 = 0; // If one component never fails in parallel
    } else {
      pfWith0 = kOutOfNSystemPf(modifiedComps0, k, correlationMatrix).pf;
    }
    
    const birnbaum = pfWith1 - pfWith0;
    
    // Fussell-Vesely importance: contribution to system failure
    const fusselVesely = basePf > 0 ? (birnbaum * comp.probabilityOfFailure) / basePf : 0;
    
    // Risk Achievement Worth: Psys(Pi=1) / Psys(Pi=current)
    const riskAchievement = basePf > 0 ? pfWith1 / basePf : 0;
    
    importance.push({
      id: comp.id,
      birnbaum: Math.max(0, Math.min(1, birnbaum)),
      fusselVesely: Math.max(0, Math.min(1, fusselVesely)),
      riskAchievement: Math.max(0, riskAchievement)
    });
  }
  
  return importance;
}

// Generate minimal cut sets for series-parallel systems
function generateMinimalCutSets(
  components: SystemComponent[],
  systemType: 'series' | 'parallel'
): { components: string[]; probability: number }[] {
  if (systemType === 'series') {
    // Each component is a cut set
    return components.map(c => ({
      components: [c.id],
      probability: c.probabilityOfFailure
    }));
  } else {
    // All components together form one cut set
    return [{
      components: components.map(c => c.id),
      probability: components.reduce((prod, c) => prod * c.probabilityOfFailure, 1)
    }];
  }
}

// Main system reliability analysis function
export function analyzeSystemReliability(
  components: SystemComponent[],
  systemType: 'series' | 'parallel' | 'series-parallel' | 'k-out-of-n',
  correlationCoefficient: number = 0,
  commonCauseGroups: CommonCauseGroup[] = [],
  kValue: number = 0
): SystemReliabilityResult {
  const n = components.length;
  
  // Build correlation matrix
  const correlationMatrix: number[][] = Array(n).fill(null).map((_, i) =>
    Array(n).fill(null).map((_, j) => i === j ? 1 : correlationCoefficient)
  );
  
  // Apply common cause failures
  const { adjustedComponents, ccfContribution } = applyCommonCauseFailures(
    components,
    commonCauseGroups
  );
  
  // Compute system reliability based on type
  let result: { pf: number; bounds: { lower: number; upper: number } };
  
  if (systemType === 'series') {
    result = seriesSystemPf(adjustedComponents, correlationMatrix);
  } else if (systemType === 'parallel') {
    result = parallelSystemPf(adjustedComponents, correlationMatrix);
  } else if (systemType === 'k-out-of-n') {
    result = kOutOfNSystemPf(adjustedComponents, kValue, correlationMatrix);
  } else {
    // Series-parallel: assume series of parallel subsystems
    // Split components into groups of 2-3 for parallel subsystems
    const groupSize = Math.min(3, Math.ceil(n / 2));
    const parallelGroups: SystemComponent[][] = [];
    
    for (let i = 0; i < n; i += groupSize) {
      parallelGroups.push(adjustedComponents.slice(i, Math.min(i + groupSize, n)));
    }
    
    // Each parallel group becomes a super-component
    const superComponents: SystemComponent[] = parallelGroups.map((group, idx) => {
      const groupResult = parallelSystemPf(group, correlationMatrix.slice(0, group.length).map(r => r.slice(0, group.length)));
      return {
        id: `subsystem_${idx}`,
        name: `Parallel Subsystem ${idx + 1}`,
        reliabilityIndex: -normalQuantile(groupResult.pf),
        probabilityOfFailure: groupResult.pf,
        importance: 0
      };
    });
    
    // Series of super-components
    result = seriesSystemPf(superComponents, Array(superComponents.length).fill(null).map((_, i) =>
      Array(superComponents.length).fill(null).map((_, j) => i === j ? 1 : correlationCoefficient * 0.5)
    ));
  }
  
  // Compute importance measures
  const importanceMeasures = computeImportanceMeasures(
    adjustedComponents,
    systemType === 'series-parallel' ? 'series' : systemType,
    kValue,
    correlationMatrix
  );
  
  // Compute correlation effect
  const indepResult = systemType === 'series' 
    ? seriesSystemPf(adjustedComponents, Array(n).fill(null).map((_, i) => Array(n).fill(null).map((_, j) => i === j ? 1 : 0)))
    : parallelSystemPf(adjustedComponents, Array(n).fill(null).map((_, i) => Array(n).fill(null).map((_, j) => i === j ? 1 : 0)));
  
  const correlationEffect = (result.pf - indepResult.pf) / Math.max(indepResult.pf, 1e-10);
  
  // Generate cut sets for simple systems
  const cutSets = (systemType === 'series' || systemType === 'parallel')
    ? generateMinimalCutSets(adjustedComponents, systemType)
    : undefined;
  
  return {
    systemType,
    systemPf: result.pf,
    systemBeta: result.pf > 0 ? -normalQuantile(result.pf) : 5,
    boundsPf: result.bounds,
    componentImportance: importanceMeasures,
    correlationEffect,
    commonCauseContribution: ccfContribution,
    cutSets
  };
}
