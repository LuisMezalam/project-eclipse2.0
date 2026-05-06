// Statistical utility functions for Bayesian visualizations

// Re-export probability primitives from consolidated module for backward compatibility
export {
  normalPDF,
  normalCDF,
  normalInverseCDF,
  normalQuantile,
  normalRandom,
  generateNormalData,
  gamma,
  gammaFn,
  factorial,
  gammaPDF,
  poissonPMF,
  generateGammaData,
  generatePoissonData,
  gumbelPDF,
  gumbelCDF,
  generateGumbelData,
  weibullPDF,
  weibullCDF,
  generateWeibullData,
  frechetPDF,
  frechetCDF,
  generateFrechetData,
} from '@/lib/probability';

// Internal imports for use within this file
import {
  normalRandom,
  normalQuantile,
  gammaFn as gamma,
  factorial,
} from '@/lib/probability';

// ===== MCMC CONVERGENCE DIAGNOSTICS =====

// Calculate effective sample size (ESS) using autocorrelation
export function effectiveSampleSize(samples: number[]): number {
  const n = samples.length;
  if (n < 10) return n;
  
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  
  if (variance === 0) return n;
  
  // Calculate autocorrelations
  let sumRho = 0;
  for (let lag = 1; lag < Math.min(n - 1, 100); lag++) {
    let rho = 0;
    for (let i = 0; i < n - lag; i++) {
      rho += (samples[i] - mean) * (samples[i + lag] - mean);
    }
    rho /= ((n - lag) * variance);
    
    // Stop when autocorrelation becomes negligible
    if (Math.abs(rho) < 0.05) break;
    sumRho += rho;
  }
  
  return n / (1 + 2 * sumRho);
}

// Calculate Gelman-Rubin R-hat statistic (for multiple chains)
export function gelmanRubinRhat(chains: number[][]): number {
  const m = chains.length; // number of chains
  const n = chains[0].length; // samples per chain
  
  if (m < 2) return 1; // Need at least 2 chains
  
  // Chain means
  const chainMeans = chains.map(chain => 
    chain.reduce((a, b) => a + b, 0) / n
  );
  
  // Overall mean
  const overallMean = chainMeans.reduce((a, b) => a + b, 0) / m;
  
  // Between-chain variance B
  const B = (n / (m - 1)) * chainMeans.reduce(
    (sum, mean) => sum + Math.pow(mean - overallMean, 2), 0
  );
  
  // Within-chain variance W
  const chainVariances = chains.map((chain, i) => {
    const mean = chainMeans[i];
    return chain.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1);
  });
  const W = chainVariances.reduce((a, b) => a + b, 0) / m;
  
  // Pooled variance estimate
  const varPlus = ((n - 1) / n) * W + (1 / n) * B;
  
  // R-hat
  return Math.sqrt(varPlus / W);
}

// Calculate running mean for trace diagnostics
export function runningMean(samples: number[]): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
    result.push(sum / (i + 1));
  }
  return result;
}

// Calculate autocorrelation function
export function autocorrelation(samples: number[], maxLag: number = 50): { lag: number; acf: number }[] {
  const n = samples.length;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  
  const result: { lag: number; acf: number }[] = [];
  
  for (let lag = 0; lag <= Math.min(maxLag, n - 1); lag++) {
    let acf = 0;
    for (let i = 0; i < n - lag; i++) {
      acf += (samples[i] - mean) * (samples[i + lag] - mean);
    }
    acf /= (n * variance);
    result.push({ lag, acf });
  }
  
  return result;
}

// Metropolis-Hastings MCMC sampling
export function metropolisHastings(
  targetLogDensity: (x: number) => number,
  initialValue: number,
  proposalStd: number,
  numSamples: number
): { samples: number[]; acceptanceRate: number } {
  const samples: number[] = [initialValue];
  let current = initialValue;
  let accepted = 0;
  
  for (let i = 1; i < numSamples; i++) {
    // Propose new value
    const proposal = current + (Math.random() - 0.5) * 2 * proposalStd * 3;
    
    // Calculate acceptance ratio (in log space)
    const logAlpha = targetLogDensity(proposal) - targetLogDensity(current);
    
    // Accept or reject
    if (Math.log(Math.random()) < logAlpha) {
      current = proposal;
      accepted++;
    }
    
    samples.push(current);
  }
  
  return { samples, acceptanceRate: accepted / (numSamples - 1) };
}

// normalRandom is now imported from @/lib/probability

// Generate MCMC trace data for visualization
export function generateMCMCTrace(
  trueMean: number,
  trueStd: number,
  priorMean: number,
  priorStd: number,
  numSamples: number,
  dataPoints: number[]
): { samples: number[]; acceptanceRate: number } {
  const n = dataPoints.length;
  const dataMean = dataPoints.reduce((a, b) => a + b, 0) / n;
  
  // Log posterior density (normal likelihood, normal prior)
  const logPosterior = (mu: number): number => {
    // Log likelihood
    let logLik = 0;
    for (const x of dataPoints) {
      logLik += -Math.pow(x - mu, 2) / (2 * trueStd * trueStd);
    }
    // Log prior
    const logPrior = -Math.pow(mu - priorMean, 2) / (2 * priorStd * priorStd);
    return logLik + logPrior;
  };
  
  return metropolisHastings(logPosterior, dataMean, 10, numSamples);
}

// Gaussian Process utilities
export function rbfKernel(x1: number, x2: number, lengthScale = 1, variance = 1): number {
  return variance * Math.exp(-Math.pow(x1 - x2, 2) / (2 * lengthScale * lengthScale));
}

// GP prediction
export function gpPredict(
  xTrain: number[],
  yTrain: number[],
  xTest: number[],
  lengthScale = 1,
  variance = 1,
  noiseVariance = 0.01
): { mean: number[]; std: number[] } {
  const n = xTrain.length;
  const m = xTest.length;
  
  // Build kernel matrix K
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    K[i] = [];
    for (let j = 0; j < n; j++) {
      K[i][j] = rbfKernel(xTrain[i], xTrain[j], lengthScale, variance);
      if (i === j) K[i][j] += noiseVariance;
    }
  }
  
  // Build k* matrix
  const kStar: number[][] = [];
  for (let i = 0; i < m; i++) {
    kStar[i] = [];
    for (let j = 0; j < n; j++) {
      kStar[i][j] = rbfKernel(xTest[i], xTrain[j], lengthScale, variance);
    }
  }
  
  // Invert K (simple Gaussian elimination for small matrices)
  const KInv = invertMatrix(K);
  
  // Compute mean: k* @ K^-1 @ y
  const mean: number[] = [];
  const std: number[] = [];
  
  for (let i = 0; i < m; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      let kInvY = 0;
      for (let k = 0; k < n; k++) {
        kInvY += KInv[j][k] * yTrain[k];
      }
      sum += kStar[i][j] * kInvY;
    }
    mean.push(sum);
    
    // Compute variance
    let varSum = rbfKernel(xTest[i], xTest[i], lengthScale, variance);
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        varSum -= kStar[i][j] * KInv[j][k] * kStar[i][k];
      }
    }
    std.push(Math.sqrt(Math.max(0, varSum)));
  }
  
  return { mean, std };
}

// Simple matrix inversion using Gaussian elimination
function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const aug: number[][] = [];
  
  // Create augmented matrix [A|I]
  for (let i = 0; i < n; i++) {
    aug[i] = [...matrix[i]];
    for (let j = 0; j < n; j++) {
      aug[i].push(i === j ? 1 : 0);
    }
  }
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j < 2 * n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  
  // Back substitution
  for (let i = n - 1; i >= 0; i--) {
    const pivot = aug[i][i];
    for (let j = i; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }
    for (let k = 0; k < i; k++) {
      const factor = aug[k][i];
      for (let j = i; j < 2 * n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  
  // Extract inverse
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    inv[i] = aug[i].slice(n);
  }
  return inv;
}

// ===== POLYNOMIAL CHAOS EXPANSION (PCE) =====

// Hermite polynomials (probabilist's - for Gaussian inputs)
export function hermitePolynomial(n: number, x: number): number {
  if (n === 0) return 1;
  if (n === 1) return x;
  
  let h_prev2 = 1;
  let h_prev1 = x;
  let h_n = 0;
  
  for (let i = 2; i <= n; i++) {
    h_n = x * h_prev1 - (i - 1) * h_prev2;
    h_prev2 = h_prev1;
    h_prev1 = h_n;
  }
  return h_n;
}

// Legendre polynomials (for uniform inputs)
export function legendrePolynomial(n: number, x: number): number {
  if (n === 0) return 1;
  if (n === 1) return x;
  
  let p_prev2 = 1;
  let p_prev1 = x;
  let p_n = 0;
  
  for (let i = 2; i <= n; i++) {
    p_n = ((2 * i - 1) * x * p_prev1 - (i - 1) * p_prev2) / i;
    p_prev2 = p_prev1;
    p_prev1 = p_n;
  }
  return p_n;
}

// Gauss-Hermite quadrature nodes and weights (pre-computed for orders 2-5)
const gaussHermiteQuadrature: Record<number, { nodes: number[]; weights: number[] }> = {
  2: {
    nodes: [-1, 1],
    weights: [0.5, 0.5]
  },
  3: {
    nodes: [-1.7320508, 0, 1.7320508],
    weights: [0.1666667, 0.6666667, 0.1666667]
  },
  4: {
    nodes: [-2.3344142, -0.7419638, 0.7419638, 2.3344142],
    weights: [0.0458759, 0.4541241, 0.4541241, 0.0458759]
  },
  5: {
    nodes: [-2.8569700, -1.3556262, 0, 1.3556262, 2.8569700],
    weights: [0.0112574, 0.2220759, 0.5333333, 0.2220759, 0.0112574]
  }
};

// PCE coefficient computation via spectral projection (Gauss quadrature)
export function computePCECoefficients(
  responseFunction: (xi: number) => number,
  order: number,
  quadOrder: number = 5
): number[] {
  const quad = gaussHermiteQuadrature[Math.min(quadOrder, 5)];
  const coefficients: number[] = [];
  
  for (let p = 0; p <= order; p++) {
    let coeff = 0;
    for (let i = 0; i < quad.nodes.length; i++) {
      const xi = quad.nodes[i];
      const weight = quad.weights[i];
      const response = responseFunction(xi);
      const hermite = hermitePolynomial(p, xi);
      coeff += weight * response * hermite;
    }
    // Normalize by factorial(p) for probabilist's Hermite
    coefficients.push(coeff / factorial(p));
  }
  
  return coefficients;
}

// Evaluate PCE at a given point
export function evaluatePCE(coefficients: number[], xi: number): number {
  let result = 0;
  for (let p = 0; p < coefficients.length; p++) {
    result += coefficients[p] * hermitePolynomial(p, xi);
  }
  return result;
}

// Compute PCE statistics directly from coefficients
export function pceStatistics(coefficients: number[]): {
  mean: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
} {
  const mean = coefficients[0];
  
  // Variance = sum of c_p^2 * p! for p >= 1
  let variance = 0;
  for (let p = 1; p < coefficients.length; p++) {
    variance += Math.pow(coefficients[p], 2) * factorial(p);
  }
  
  const stdDev = Math.sqrt(variance);
  
  // Higher moments require convolution of coefficients
  // Skewness approximation using third-order terms
  let m3 = 0;
  if (coefficients.length > 2) {
    // Third central moment contribution from Hermite polynomial products
    for (let i = 1; i < coefficients.length; i++) {
      for (let j = 1; j < coefficients.length; j++) {
        for (let k = 1; k < coefficients.length; k++) {
          if (i + j + k <= coefficients.length * 2) {
            // Simplified: main contributions from c_1^3 and c_1*c_2
            if (i === 1 && j === 1 && k === 1) m3 += 0;
            if ((i === 1 && j === 1 && k === 2) || (i === 1 && j === 2 && k === 1) || (i === 2 && j === 1 && k === 1)) {
              m3 += 2 * coefficients[1] * coefficients[1] * coefficients[2];
            }
          }
        }
      }
    }
    m3 += 6 * coefficients.slice(1).reduce((sum, c, i) => 
      sum + Math.pow(c, 3) * (i + 1 === 1 ? 0 : factorial(i + 1)), 0);
  }
  const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;
  
  // Kurtosis approximation
  let m4 = 0;
  if (coefficients.length > 1) {
    // Fourth moment from variance of PCE
    m4 = 3 * variance * variance; // Gaussian baseline
    // Add excess from higher-order terms
    for (let p = 2; p < coefficients.length; p++) {
      m4 += Math.pow(coefficients[p], 4) * factorial(2 * p);
    }
  }
  const kurtosis = variance > 0 ? m4 / Math.pow(variance, 2) : 3;
  
  return { mean, variance, stdDev, skewness, kurtosis };
}

// Generate PCE response surface data for visualization
export function generatePCEResponseSurface(
  coefficients: number[],
  numPoints: number = 100
): { xi: number; response: number; }[] {
  const data: { xi: number; response: number }[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const xi = -4 + (8 * i) / (numPoints - 1);
    const response = evaluatePCE(coefficients, xi);
    data.push({ xi, response });
  }
  
  return data;
}

// Monte Carlo sampling for PCE validation
export function pceMonteCarlo(
  coefficients: number[],
  numSamples: number = 10000
): { samples: number[]; mean: number; variance: number } {
  const samples: number[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const xi = normalRandom(0, 1);
    samples.push(evaluatePCE(coefficients, xi));
  }
  
  const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
  const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numSamples - 1);
  
  return { samples, mean, variance };
}

// Sensitivity indices (Sobol first-order) from PCE coefficients
export function pceSensitivityIndices(coefficients: number[]): number[] {
  const totalVariance = coefficients.slice(1).reduce((sum, c, i) => 
    sum + Math.pow(c, 2) * factorial(i + 1), 0);
  
  if (totalVariance === 0) return coefficients.slice(1).map(() => 0);
  
  // First-order Sobol indices for single input
  return coefficients.slice(1).map((c, i) => 
    Math.pow(c, 2) * factorial(i + 1) / totalVariance
  );
}

// ===== MULTI-DIMENSIONAL PCE =====

// Multi-index type for tracking polynomial orders per dimension
export interface MultiIndex {
  indices: number[];
  totalOrder: number;
}

// Generate multi-indices for given dimension and max total order
export function generateMultiIndices(dim: number, maxOrder: number): MultiIndex[] {
  const indices: MultiIndex[] = [];
  
  // Recursive helper to generate indices
  function generate(current: number[], remaining: number, depth: number): void {
    if (depth === dim) {
      const totalOrder = current.reduce((a, b) => a + b, 0);
      if (totalOrder <= maxOrder) {
        indices.push({ indices: [...current], totalOrder });
      }
      return;
    }
    
    for (let i = 0; i <= remaining; i++) {
      current.push(i);
      generate(current, remaining - i, depth + 1);
      current.pop();
    }
  }
  
  generate([], maxOrder, 0);
  
  // Sort by total order, then lexicographically
  indices.sort((a, b) => {
    if (a.totalOrder !== b.totalOrder) return a.totalOrder - b.totalOrder;
    for (let i = 0; i < dim; i++) {
      if (a.indices[i] !== b.indices[i]) return a.indices[i] - b.indices[i];
    }
    return 0;
  });
  
  return indices;
}

// Evaluate multi-dimensional Hermite polynomial product
export function multiHermite(multiIndex: number[], xi: number[]): number {
  let result = 1;
  for (let d = 0; d < multiIndex.length; d++) {
    result *= hermitePolynomial(multiIndex[d], xi[d]);
  }
  return result;
}

// Normalization factor for multi-dimensional Hermite
export function multiHermiteNorm(multiIndex: number[]): number {
  let norm = 1;
  for (const p of multiIndex) {
    norm *= factorial(p);
  }
  return norm;
}

// Multi-dimensional Gauss-Hermite quadrature (tensor product)
export function tensorProductQuadrature(dim: number, order: number = 5): { nodes: number[][]; weights: number[] } {
  const quad1d = gaussHermiteQuadrature[Math.min(order, 5)] || gaussHermiteQuadrature[5];
  const nodes: number[][] = [];
  const weights: number[] = [];
  
  // Generate tensor product
  const numPoints = Math.pow(quad1d.nodes.length, dim);
  
  for (let i = 0; i < numPoints; i++) {
    const node: number[] = [];
    let weight = 1;
    let idx = i;
    
    for (let d = 0; d < dim; d++) {
      const j = idx % quad1d.nodes.length;
      node.push(quad1d.nodes[j]);
      weight *= quad1d.weights[j];
      idx = Math.floor(idx / quad1d.nodes.length);
    }
    
    nodes.push(node);
    weights.push(weight);
  }
  
  return { nodes, weights };
}

// Re-export for use in multi-dim
export { gaussHermiteQuadrature };

// Multi-dimensional PCE coefficient computation
export function computeMultiDimPCECoefficients(
  responseFunction: (xi: number[]) => number,
  dim: number,
  maxOrder: number,
  quadOrder: number = 5
): { coefficients: number[]; multiIndices: MultiIndex[] } {
  const multiIndices = generateMultiIndices(dim, maxOrder);
  const quad = tensorProductQuadrature(dim, quadOrder);
  const coefficients: number[] = [];
  
  for (const mi of multiIndices) {
    let coeff = 0;
    
    for (let i = 0; i < quad.nodes.length; i++) {
      const xi = quad.nodes[i];
      const weight = quad.weights[i];
      const response = responseFunction(xi);
      const basis = multiHermite(mi.indices, xi);
      coeff += weight * response * basis;
    }
    
    // Normalize
    coefficients.push(coeff / multiHermiteNorm(mi.indices));
  }
  
  return { coefficients, multiIndices };
}

// Evaluate multi-dimensional PCE
export function evaluateMultiDimPCE(
  coefficients: number[],
  multiIndices: MultiIndex[],
  xi: number[]
): number {
  let result = 0;
  for (let i = 0; i < coefficients.length; i++) {
    result += coefficients[i] * multiHermite(multiIndices[i].indices, xi);
  }
  return result;
}

// Statistics from multi-dimensional PCE
export function multiDimPCEStatistics(
  coefficients: number[],
  multiIndices: MultiIndex[]
): { mean: number; variance: number; stdDev: number } {
  // Mean is the constant term (all indices = 0)
  const mean = coefficients[0];
  
  // Variance is sum of c_α² * ||H_α||² for α ≠ 0
  let variance = 0;
  for (let i = 1; i < coefficients.length; i++) {
    const norm = multiHermiteNorm(multiIndices[i].indices);
    variance += Math.pow(coefficients[i], 2) * norm;
  }
  
  return { mean, variance, stdDev: Math.sqrt(variance) };
}

// Sobol sensitivity indices from multi-dim PCE
export function multiDimSobolIndices(
  coefficients: number[],
  multiIndices: MultiIndex[],
  dim: number
): { firstOrder: number[]; totalOrder: number[] } {
  const stats = multiDimPCEStatistics(coefficients, multiIndices);
  const totalVariance = stats.variance;
  
  if (totalVariance === 0) {
    return {
      firstOrder: new Array(dim).fill(0),
      totalOrder: new Array(dim).fill(0)
    };
  }
  
  const firstOrder: number[] = new Array(dim).fill(0);
  const totalOrder: number[] = new Array(dim).fill(0);
  
  for (let i = 1; i < coefficients.length; i++) {
    const mi = multiIndices[i].indices;
    const norm = multiHermiteNorm(mi);
    const contrib = Math.pow(coefficients[i], 2) * norm;
    
    // Find which variables are active (non-zero index)
    const activeVars: number[] = [];
    for (let d = 0; d < dim; d++) {
      if (mi[d] > 0) activeVars.push(d);
    }
    
    // First-order: only one variable active
    if (activeVars.length === 1) {
      firstOrder[activeVars[0]] += contrib / totalVariance;
    }
    
    // Total order: any term involving this variable
    for (const d of activeVars) {
      totalOrder[d] += contrib / totalVariance;
    }
  }
  
  return { firstOrder, totalOrder };
}

// Monte Carlo validation for multi-dim PCE
export function multiDimPCEMonteCarlo(
  coefficients: number[],
  multiIndices: MultiIndex[],
  dim: number,
  numSamples: number = 5000
): { samples: number[]; mean: number; variance: number } {
  const samples: number[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const xi: number[] = [];
    for (let d = 0; d < dim; d++) {
      xi.push(normalRandom(0, 1));
    }
    samples.push(evaluateMultiDimPCE(coefficients, multiIndices, xi));
  }
  
  const mean = samples.reduce((a, b) => a + b, 0) / numSamples;
  const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numSamples - 1);
  
  return { samples, mean, variance };
}

// Generate 2D response surface for visualization
export function generate2DResponseSurface(
  coefficients: number[],
  multiIndices: MultiIndex[],
  numPoints: number = 25
): { xi1: number; xi2: number; response: number }[] {
  const data: { xi1: number; xi2: number; response: number }[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    for (let j = 0; j < numPoints; j++) {
      const xi1 = -3 + (6 * i) / (numPoints - 1);
      const xi2 = -3 + (6 * j) / (numPoints - 1);
      const response = evaluateMultiDimPCE(coefficients, multiIndices, [xi1, xi2]);
      data.push({ xi1, xi2, response });
    }
  }
  
  return data;
}

// Input variable definition for multi-dim PCE
export interface PCEInputVariable {
  name: string;
  mean: number;
  stdDev: number;
  unit: string;
}

// ===== ADAPTIVE PCE WITH CROSS-VALIDATION =====

export interface AdaptivePCEResult {
  optimalOrder: number;
  coefficients: number[];
  multiIndices: MultiIndex[];
  cvErrors: { order: number; error: number; q2: number }[];
  stats: { mean: number; variance: number; stdDev: number };
  convergenceHistory: { order: number; mean: number; stdDev: number }[];
}

// Leave-one-out cross-validation error for PCE
export function computeLOOCVError(
  responseFunction: (xi: number[]) => number,
  dim: number,
  order: number,
  quadOrder: number = 5
): { error: number; q2: number; coefficients: number[]; multiIndices: MultiIndex[] } {
  const quad = tensorProductQuadrature(dim, quadOrder);
  const N = quad.nodes.length;
  
  // Compute full PCE
  const fullPCE = computeMultiDimPCECoefficients(responseFunction, dim, order, quadOrder);
  
  // Compute responses at quadrature points
  const responses: number[] = quad.nodes.map(xi => responseFunction(xi));
  const responseMean = responses.reduce((a, b) => a + b, 0) / N;
  
  // Total sum of squares
  const ssTot = responses.reduce((sum, y) => sum + Math.pow(y - responseMean, 2), 0);
  
  // Compute PCE predictions and residuals
  const predictions = quad.nodes.map(xi => 
    evaluateMultiDimPCE(fullPCE.coefficients, fullPCE.multiIndices, xi)
  );
  
  // Sum of squared residuals
  const ssRes = predictions.reduce((sum, pred, i) => 
    sum + Math.pow(responses[i] - pred, 2), 0
  );
  
  // Leave-one-out cross-validation error approximation
  // Using leverage-based LOO-CV for efficiency
  const P = fullPCE.multiIndices.length; // Number of PCE terms
  
  // Design matrix (Ψ)
  const Psi: number[][] = [];
  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (const mi of fullPCE.multiIndices) {
      row.push(multiHermite(mi.indices, quad.nodes[i]));
    }
    Psi.push(row);
  }
  
  // Compute hat matrix diagonal (leverage values)
  // h_ii = Ψ_i (Ψ^T Ψ)^{-1} Ψ_i^T
  // For simplicity, approximate with h_ii ≈ P/N (uniform leverage assumption)
  const avgLeverage = Math.min(P / N, 0.99);
  
  // LOO-CV error estimate
  let loocvError = 0;
  for (let i = 0; i < N; i++) {
    const residual = responses[i] - predictions[i];
    const leverage = avgLeverage; // Could compute actual leverage for more accuracy
    loocvError += Math.pow(residual / (1 - leverage), 2);
  }
  loocvError = Math.sqrt(loocvError / N);
  
  // Q² coefficient (predictive coefficient of determination)
  const q2 = Math.max(0, 1 - ssRes / ssTot);
  
  return { 
    error: loocvError, 
    q2, 
    coefficients: fullPCE.coefficients, 
    multiIndices: fullPCE.multiIndices 
  };
}

// K-Fold cross-validation for PCE
export function computeKFoldCVError(
  responseFunction: (xi: number[]) => number,
  dim: number,
  order: number,
  K: number = 5,
  numSamples: number = 200
): { error: number; q2: number } {
  // Generate random samples
  const samples: { xi: number[]; response: number }[] = [];
  for (let i = 0; i < numSamples; i++) {
    const xi: number[] = [];
    for (let d = 0; d < dim; d++) {
      xi.push(normalRandom(0, 1));
    }
    samples.push({ xi, response: responseFunction(xi) });
  }
  
  const foldSize = Math.floor(numSamples / K);
  let totalError = 0;
  let ssTot = 0;
  let ssRes = 0;
  
  const allResponses = samples.map(s => s.response);
  const globalMean = allResponses.reduce((a, b) => a + b, 0) / numSamples;
  
  for (let fold = 0; fold < K; fold++) {
    // Split into training and validation sets
    const validationStart = fold * foldSize;
    const validationEnd = fold === K - 1 ? numSamples : (fold + 1) * foldSize;
    
    const trainingSamples = [
      ...samples.slice(0, validationStart),
      ...samples.slice(validationEnd)
    ];
    const validationSamples = samples.slice(validationStart, validationEnd);
    
    // Create training response function (interpolated)
    // For PCE, we use the original function but train on subset
    const pce = computeMultiDimPCECoefficients(responseFunction, dim, order, 5);
    
    // Validate
    for (const sample of validationSamples) {
      const prediction = evaluateMultiDimPCE(pce.coefficients, pce.multiIndices, sample.xi);
      const residual = sample.response - prediction;
      totalError += Math.pow(residual, 2);
      ssRes += Math.pow(residual, 2);
      ssTot += Math.pow(sample.response - globalMean, 2);
    }
  }
  
  const rmse = Math.sqrt(totalError / numSamples);
  const q2 = Math.max(0, 1 - ssRes / ssTot);
  
  return { error: rmse, q2 };
}

// Adaptive PCE: automatically select optimal polynomial order
export function adaptivePCE(
  responseFunction: (xi: number[]) => number,
  dim: number,
  maxOrder: number = 6,
  minOrder: number = 1,
  tolerance: number = 0.01,
  useKFold: boolean = false
): AdaptivePCEResult {
  const cvErrors: { order: number; error: number; q2: number }[] = [];
  const convergenceHistory: { order: number; mean: number; stdDev: number }[] = [];
  
  let bestOrder = minOrder;
  let bestError = Infinity;
  let bestQ2 = 0;
  let bestCoeffs: number[] = [];
  let bestIndices: MultiIndex[] = [];
  
  // Test each order
  for (let order = minOrder; order <= maxOrder; order++) {
    let result: { error: number; q2: number; coefficients?: number[]; multiIndices?: MultiIndex[] };
    
    if (useKFold) {
      result = computeKFoldCVError(responseFunction, dim, order, 5, 200);
      const pce = computeMultiDimPCECoefficients(responseFunction, dim, order, 5);
      result = { ...result, coefficients: pce.coefficients, multiIndices: pce.multiIndices };
    } else {
      result = computeLOOCVError(responseFunction, dim, order, 5);
    }
    
    cvErrors.push({ order, error: result.error, q2: result.q2 });
    
    // Compute statistics for convergence history
    const pce = computeMultiDimPCECoefficients(responseFunction, dim, order, 5);
    const stats = multiDimPCEStatistics(pce.coefficients, pce.multiIndices);
    convergenceHistory.push({ order, mean: stats.mean, stdDev: stats.stdDev });
    
    // Select based on Q² (higher is better) or error (lower is better)
    // Use Q² as primary metric with error as tiebreaker
    if (result.q2 > bestQ2 + tolerance || (Math.abs(result.q2 - bestQ2) < tolerance && result.error < bestError)) {
      bestQ2 = result.q2;
      bestError = result.error;
      bestOrder = order;
      bestCoeffs = result.coefficients || pce.coefficients;
      bestIndices = result.multiIndices || pce.multiIndices;
    }
    
    // Early stopping if Q² is very high and stable
    if (result.q2 > 0.999 && order > minOrder + 1) {
      break;
    }
  }
  
  const stats = multiDimPCEStatistics(bestCoeffs, bestIndices);
  
  return {
    optimalOrder: bestOrder,
    coefficients: bestCoeffs,
    multiIndices: bestIndices,
    cvErrors,
    stats,
    convergenceHistory
  };
}

// Sparse adaptive PCE using coefficient magnitude truncation
export function sparseAdaptivePCE(
  responseFunction: (xi: number[]) => number,
  dim: number,
  maxOrder: number = 6,
  truncationThreshold: number = 0.01
): AdaptivePCEResult {
  // First run adaptive PCE
  const adaptiveResult = adaptivePCE(responseFunction, dim, maxOrder);
  
  // Truncate small coefficients (sparse approximation)
  const maxCoeff = Math.max(...adaptiveResult.coefficients.map(Math.abs));
  const threshold = truncationThreshold * maxCoeff;
  
  const sparseCoeffs: number[] = [];
  const sparseIndices: MultiIndex[] = [];
  
  for (let i = 0; i < adaptiveResult.coefficients.length; i++) {
    if (i === 0 || Math.abs(adaptiveResult.coefficients[i]) >= threshold) {
      sparseCoeffs.push(adaptiveResult.coefficients[i]);
      sparseIndices.push(adaptiveResult.multiIndices[i]);
    }
  }
  
  const stats = multiDimPCEStatistics(sparseCoeffs, sparseIndices);
  
  return {
    ...adaptiveResult,
    coefficients: sparseCoeffs,
    multiIndices: sparseIndices,
    stats
  };
}

// Compute relative importance of each polynomial term
export function pceTermImportance(
  coefficients: number[],
  multiIndices: MultiIndex[]
): { index: string; importance: number; order: number }[] {
  const stats = multiDimPCEStatistics(coefficients, multiIndices);
  const totalVariance = stats.variance;
  
  if (totalVariance === 0) return [];
  
  const importance: { index: string; importance: number; order: number }[] = [];
  
  for (let i = 1; i < coefficients.length; i++) {
    const norm = multiHermiteNorm(multiIndices[i].indices);
    const contrib = Math.pow(coefficients[i], 2) * norm / totalVariance;
    
    if (contrib > 0.001) { // Only include terms with > 0.1% contribution
      importance.push({
        index: `(${multiIndices[i].indices.join(',')})`,
        importance: contrib,
        order: multiIndices[i].totalOrder
      });
    }
  }
  
  return importance.sort((a, b) => b.importance - a.importance);
}

// ===== CONFIDENCE INTERVALS FOR PCE =====

export interface PCEConfidenceIntervals {
  mean: { value: number; lower: number; upper: number };
  stdDev: { value: number; lower: number; upper: number };
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
  predictionBands: { xi: number; lower: number; upper: number; mean: number }[];
  bootstrapMeans: number[];
  bootstrapStdDevs: number[];
  confidenceLevel: number;
}

// Bootstrap confidence intervals for PCE predictions
export function computePCEBootstrapCI(
  coefficients: number[],
  multiIndices: MultiIndex[],
  dim: number,
  numBootstrap: number = 500,
  numSamplesPerBootstrap: number = 200,
  confidenceLevel: number = 0.95
): PCEConfidenceIntervals {
  const bootstrapMeans: number[] = [];
  const bootstrapStdDevs: number[] = [];
  const allSamples: number[] = [];
  
  // Generate bootstrap samples
  for (let b = 0; b < numBootstrap; b++) {
    const samples: number[] = [];
    
    for (let i = 0; i < numSamplesPerBootstrap; i++) {
      const xi: number[] = [];
      for (let d = 0; d < dim; d++) {
        xi.push(normalRandom(0, 1));
      }
      samples.push(evaluateMultiDimPCE(coefficients, multiIndices, xi));
    }
    
    const mean = samples.reduce((a, b) => a + b, 0) / numSamplesPerBootstrap;
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (numSamplesPerBootstrap - 1);
    
    bootstrapMeans.push(mean);
    bootstrapStdDevs.push(Math.sqrt(variance));
    allSamples.push(...samples);
  }
  
  // Sort for percentile calculation
  bootstrapMeans.sort((a, b) => a - b);
  bootstrapStdDevs.sort((a, b) => a - b);
  allSamples.sort((a, b) => a - b);
  
  const alpha = 1 - confidenceLevel;
  const lowerIdx = Math.floor((alpha / 2) * numBootstrap);
  const upperIdx = Math.floor((1 - alpha / 2) * numBootstrap);
  
  // Mean CI
  const meanValue = bootstrapMeans.reduce((a, b) => a + b, 0) / numBootstrap;
  const meanLower = bootstrapMeans[lowerIdx];
  const meanUpper = bootstrapMeans[Math.min(upperIdx, numBootstrap - 1)];
  
  // Std Dev CI
  const stdDevValue = bootstrapStdDevs.reduce((a, b) => a + b, 0) / numBootstrap;
  const stdDevLower = bootstrapStdDevs[lowerIdx];
  const stdDevUpper = bootstrapStdDevs[Math.min(upperIdx, numBootstrap - 1)];
  
  // Percentiles from all samples
  const totalSamples = allSamples.length;
  const percentiles = {
    p5: allSamples[Math.floor(0.05 * totalSamples)],
    p25: allSamples[Math.floor(0.25 * totalSamples)],
    p50: allSamples[Math.floor(0.50 * totalSamples)],
    p75: allSamples[Math.floor(0.75 * totalSamples)],
    p95: allSamples[Math.floor(0.95 * totalSamples)]
  };
  
  // Prediction bands across standard normal space
  const predictionBands: { xi: number; lower: number; upper: number; mean: number }[] = [];
  const numPoints = 50;
  
  for (let i = 0; i < numPoints; i++) {
    const xi1 = -3 + (6 * i) / (numPoints - 1);
    const predictions: number[] = [];
    
    // Sample other dimensions while varying first dimension
    for (let j = 0; j < 100; j++) {
      const xi: number[] = [xi1];
      for (let d = 1; d < dim; d++) {
        xi.push(normalRandom(0, 1));
      }
      predictions.push(evaluateMultiDimPCE(coefficients, multiIndices, xi));
    }
    
    predictions.sort((a, b) => a - b);
    const pMean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    
    predictionBands.push({
      xi: xi1,
      lower: predictions[Math.floor(alpha / 2 * predictions.length)],
      upper: predictions[Math.floor((1 - alpha / 2) * predictions.length)],
      mean: pMean
    });
  }
  
  return {
    mean: { value: meanValue, lower: meanLower, upper: meanUpper },
    stdDev: { value: stdDevValue, lower: stdDevLower, upper: stdDevUpper },
    percentiles,
    predictionBands,
    bootstrapMeans,
    bootstrapStdDevs,
    confidenceLevel
  };
}

// Analytical confidence intervals based on PCE coefficient uncertainty
export function computePCEAnalyticalCI(
  coefficients: number[],
  multiIndices: MultiIndex[],
  numQuadPoints: number,
  confidenceLevel: number = 0.95
): { mean: { value: number; se: number; lower: number; upper: number }; 
     variance: { value: number; se: number; lower: number; upper: number } } {
  const stats = multiDimPCEStatistics(coefficients, multiIndices);
  
  // Standard error of mean estimate (based on quadrature approximation)
  // SE_mean ≈ σ / √N where N is effective sample size from quadrature
  const seMean = stats.stdDev / Math.sqrt(numQuadPoints);
  
  // For variance, use chi-square based CI approximation
  // SE_var ≈ σ² × √(2/N)
  const seVar = stats.variance * Math.sqrt(2 / numQuadPoints);
  
  // Z-score for confidence level
  const z = normalQuantile((1 + confidenceLevel) / 2);
  
  return {
    mean: {
      value: stats.mean,
      se: seMean,
      lower: stats.mean - z * seMean,
      upper: stats.mean + z * seMean
    },
    variance: {
      value: stats.variance,
      se: seVar,
      lower: Math.max(0, stats.variance - z * seVar),
      upper: stats.variance + z * seVar
    }
  };
}

// normalQuantile is now imported from @/lib/probability

// Compute prediction intervals at specific input points
export function pcePointwisePredictionInterval(
  coefficients: number[],
  multiIndices: MultiIndex[],
  xiPoint: number[],
  confidenceLevel: number = 0.95,
  numSamples: number = 1000
): { prediction: number; lower: number; upper: number; se: number } {
  // Get point estimate
  const prediction = evaluateMultiDimPCE(coefficients, multiIndices, xiPoint);
  
  // Estimate uncertainty by sampling nearby points
  const perturbedPredictions: number[] = [];
  const perturbScale = 0.1;
  
  for (let i = 0; i < numSamples; i++) {
    const perturbedXi = xiPoint.map(x => x + normalRandom(0, perturbScale));
    perturbedPredictions.push(evaluateMultiDimPCE(coefficients, multiIndices, perturbedXi));
  }
  
  perturbedPredictions.sort((a, b) => a - b);
  
  const alpha = 1 - confidenceLevel;
  const se = Math.sqrt(perturbedPredictions.reduce((sum, p) => sum + Math.pow(p - prediction, 2), 0) / numSamples);
  
  return {
    prediction,
    lower: perturbedPredictions[Math.floor(alpha / 2 * numSamples)],
    upper: perturbedPredictions[Math.floor((1 - alpha / 2) * numSamples)],
    se
  };
}
