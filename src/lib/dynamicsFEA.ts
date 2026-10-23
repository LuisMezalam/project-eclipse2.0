// FEA and Random Dynamics Analysis Module
// Based on CE_340 files - Sections 4-5 concepts

import { normalCDF, normalInverseCDF } from '@/lib/probability';

// ============================================================================
// FEA BEAM ELEMENT ANALYSIS
// ============================================================================

export interface FEANode {
  id: number;
  x: number;           // Position along beam
  displacement: number;
  rotation: number;
  force: number;       // Applied force
  moment: number;      // Applied moment
  isFixed: boolean;
  isRoller: boolean;
}

export interface FEAElement {
  id: number;
  node1: number;
  node2: number;
  length: number;
  EI: number;          // Flexural rigidity
  EA: number;          // Axial rigidity
}

export interface FEAResult {
  nodes: FEANode[];
  elements: FEAElement[];
  globalStiffness: number[][];
  displacements: number[];
  reactions: number[];
  internalForces: { element: number; shear: number[]; moment: number[] }[];
  modeShapes: { frequency: number; shape: number[] }[];
  error?: string;
}

// Generate mesh for beam
export function generateBeamMesh(
  beamLength: number,
  numElements: number,
  EI: number = 1e6,
  EA: number = 1e9
): { nodes: FEANode[]; elements: FEAElement[] } {
  const nodes: FEANode[] = [];
  const elements: FEAElement[] = [];
  const elementLength = beamLength / numElements;
  
  // Create nodes
  for (let i = 0; i <= numElements; i++) {
    nodes.push({
      id: i,
      x: i * elementLength,
      displacement: 0,
      rotation: 0,
      force: 0,
      moment: 0,
      isFixed: false,
      isRoller: false
    });
  }
  
  // Create elements
  for (let i = 0; i < numElements; i++) {
    elements.push({
      id: i,
      node1: i,
      node2: i + 1,
      length: elementLength,
      EI,
      EA
    });
  }
  
  return { nodes, elements };
}

// Euler-Bernoulli beam element stiffness matrix (4x4)
export function elementStiffnessMatrix(element: FEAElement): number[][] {
  const L = element.length;
  const EI = element.EI;
  const k = EI / (L * L * L);
  
  return [
    [12 * k, 6 * L * k, -12 * k, 6 * L * k],
    [6 * L * k, 4 * L * L * k, -6 * L * k, 2 * L * L * k],
    [-12 * k, -6 * L * k, 12 * k, -6 * L * k],
    [6 * L * k, 2 * L * L * k, -6 * L * k, 4 * L * L * k]
  ];
}

// Assemble global stiffness matrix
export function assembleGlobalStiffness(
  nodes: FEANode[],
  elements: FEAElement[]
): number[][] {
  const n = nodes.length * 2; // 2 DOF per node (v, θ)
  const K: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (const elem of elements) {
    const ke = elementStiffnessMatrix(elem);
    const i1 = elem.node1 * 2;
    const i2 = elem.node2 * 2;
    const indices = [i1, i1 + 1, i2, i2 + 1];
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        K[indices[i]][indices[j]] += ke[i][j];
      }
    }
  }
  
  return K;
}

// Apply boundary conditions
export function applyBoundaryConditions(
  K: number[][],
  F: number[],
  nodes: FEANode[]
): { Kred: number[][]; Fred: number[]; freeDOFs: number[] } {
  const freeDOFs: number[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    if (!nodes[i].isFixed && !nodes[i].isRoller) {
      freeDOFs.push(i * 2); // Vertical displacement is restrained by pins and rollers.
    }
    if (!nodes[i].isFixed) {
      freeDOFs.push(i * 2 + 1); // Pins and rollers leave rotation free; fixed supports restrain it.
    }
  }
  
  const n = freeDOFs.length;
  const Kred: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const Fred: number[] = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    Fred[i] = F[freeDOFs[i]];
    for (let j = 0; j < n; j++) {
      Kred[i][j] = K[freeDOFs[i]][freeDOFs[j]];
    }
  }
  
  return { Kred, Fred, freeDOFs };
}

// Solve linear system using Gaussian elimination
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  if (A.length !== n || A.some(row => row.length !== n)) throw new Error('Matrix dimensions do not match the right-hand side.');
  const aug = A.map((row, i) => [...row, b[i]]);
  const matrixScale = Math.max(...A.flat().map(Math.abs), 0);
  const pivotTolerance = Math.max(1e-30, matrixScale * 1e-12);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    
    if (!Number.isFinite(aug[i][i]) || Math.abs(aug[i][i]) <= pivotTolerance) {
      throw new Error('The reduced stiffness matrix is singular. Check the beam supports.');
    }
    
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  
  // Back substitution
  const x: number[] = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(aug[i][i]) <= pivotTolerance) throw new Error('The reduced stiffness matrix is singular. Check the beam supports.');
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }
  
  return x;
}

// Full FEA analysis
export function performFEAAnalysis(
  beamLength: number,
  numElements: number,
  loads: { position: number; force: number; moment?: number }[],
  supports: { position: number; type: 'fixed' | 'pinned' | 'roller' }[],
  EI: number = 1e6,
  massPerLength: number = 250
): FEAResult {
  const { nodes, elements } = generateBeamMesh(beamLength, numElements, EI);
  
  // Apply supports
  for (const support of supports) {
    const nodeIdx = Math.round((support.position / beamLength) * numElements);
    if (nodeIdx >= 0 && nodeIdx < nodes.length) {
      if (support.type === 'fixed') {
        nodes[nodeIdx].isFixed = true;
      } else if (support.type === 'roller') {
        nodes[nodeIdx].isRoller = true;
      } else if (support.type === 'pinned') {
        nodes[nodeIdx].isRoller = true; // Pinned = vertical restraint only
      }
    }
  }
  
  // Apply loads
  const F: number[] = Array(nodes.length * 2).fill(0);
  for (const load of loads) {
    const nodeIdx = Math.round((load.position / beamLength) * numElements);
    if (nodeIdx >= 0 && nodeIdx < nodes.length) {
      F[nodeIdx * 2] += load.force;
      if (load.moment) {
        F[nodeIdx * 2 + 1] += load.moment;
      }
    }
  }
  
  // Assemble and solve
  const K = assembleGlobalStiffness(nodes, elements);
  const { Kred, Fred, freeDOFs } = applyBoundaryConditions(K, F, nodes);
  let ured: number[];
  try {
    ured = solveLinearSystem(Kred, Fred);
  } catch (error) {
    return {
      nodes,
      elements,
      globalStiffness: K,
      displacements: Array(nodes.length * 2).fill(0),
      reactions: Array(nodes.length * 2).fill(0),
      internalForces: [],
      modeShapes: [],
      error: error instanceof Error ? error.message : 'Unable to solve the beam stiffness matrix.',
    };
  }
  
  // Map back to global DOFs
  const u: number[] = Array(nodes.length * 2).fill(0);
  for (let i = 0; i < freeDOFs.length; i++) {
    u[freeDOFs[i]] = ured[i];
  }
  
  // Update node displacements
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].displacement = u[i * 2];
    nodes[i].rotation = u[i * 2 + 1];
  }
  
  // Calculate reactions
  const reactions: number[] = [];
  for (let i = 0; i < nodes.length * 2; i++) {
    let reaction = -F[i];
    for (let j = 0; j < nodes.length * 2; j++) {
      reaction += K[i][j] * u[j];
    }
    reactions.push(reaction);
  }
  
  // Calculate internal forces for each element
  const internalForces: { element: number; shear: number[]; moment: number[] }[] = [];
  for (const elem of elements) {
    const L = elem.length;
    const u1 = nodes[elem.node1].displacement;
    const t1 = nodes[elem.node1].rotation;
    const u2 = nodes[elem.node2].displacement;
    const t2 = nodes[elem.node2].rotation;
    
    // Shear and moment at ends
    const EI = elem.EI;
    const V1 = (EI / (L * L * L)) * (12 * (u1 - u2) + 6 * L * (t1 + t2));
    const V2 = -V1;
    const M1 = (EI / (L * L)) * (6 * (u1 - u2) + L * (4 * t1 + 2 * t2));
    const M2 = (EI / (L * L)) * (6 * (u1 - u2) + L * (2 * t1 + 4 * t2));
    
    internalForces.push({
      element: elem.id,
      shear: [V1, V2],
      moment: [M1, M2]
    });
  }
  
  // Simple modal analysis (first few modes)
  const modeShapes = computeModeShapes(nodes, elements, freeDOFs, 3, massPerLength);
  
  return {
    nodes,
    elements,
    globalStiffness: K,
    displacements: u,
    reactions,
    internalForces,
    modeShapes
  };
}

// Solve the constrained generalized eigenproblem Kφ = ω²Mφ using a
// consistent Euler-Bernoulli beam mass matrix and a symmetric Jacobi solver.
function computeModeShapes(
  nodes: FEANode[],
  elements: FEAElement[],
  freeDOFs: number[],
  numModes: number,
  massPerLength: number,
): { frequency: number; shape: number[] }[] {
  const globalDOFs = nodes.length * 2;
  if (freeDOFs.length === 0 || !Number.isFinite(massPerLength) || massPerLength <= 0) return [];

  const K = assembleGlobalStiffness(nodes, elements);
  const M = Array.from({ length: globalDOFs }, () => Array(globalDOFs).fill(0));
  for (const element of elements) {
    const L = element.length;
    const factor = massPerLength * L / 420;
    const localMass = [
      [156, 22 * L, 54, -13 * L],
      [22 * L, 4 * L * L, 13 * L, -3 * L * L],
      [54, 13 * L, 156, -22 * L],
      [-13 * L, -3 * L * L, -22 * L, 4 * L * L],
    ].map(row => row.map(value => value * factor));
    const dofs = [2 * element.node1, 2 * element.node1 + 1, 2 * element.node2, 2 * element.node2 + 1];
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) M[dofs[row]][dofs[column]] += localMass[row][column];
    }
  }

  const reducedK = freeDOFs.map(row => freeDOFs.map(column => K[row][column]));
  const reducedM = freeDOFs.map(row => freeDOFs.map(column => M[row][column]));
  const lower = choleskyFactor(reducedM);
  if (!lower) return [];

  const inverseLower = invertLowerTriangular(lower);
  const transformedK = multiplyMatrices(multiplyMatrices(inverseLower, reducedK), transposeMatrix(inverseLower));
  const { values, vectors } = symmetricJacobiEigen(transformedK);
  const sortedEigenvalues = values
    .map((value, index) => ({ value, index }))
    .filter(entry => Number.isFinite(entry.value) && entry.value > 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, numModes);
  const freeIndex = new Map<number, number>(freeDOFs.map((dof, index) => [dof, index] as const));

  return sortedEigenvalues.map(({ value, index }) => {
    // The eigenvectors of L⁻¹KL⁻ᵀ map back through L⁻ᵀ to physical DOFs.
    const reducedShape = Array.from({ length: inverseLower.length }, (_, dof) =>
      inverseLower.reduce((sum, row, rowIndex) => sum + row[dof] * vectors[rowIndex][index], 0),
    );
    const rawShape = nodes.map((_, nodeIndex) => {
      const reducedIndex = freeIndex.get(2 * nodeIndex);
      return reducedIndex === undefined ? 0 : reducedShape[reducedIndex];
    });
    const maxAmplitude = Math.max(...rawShape.map(Math.abs), 0);
    const shape = maxAmplitude > 0 ? rawShape.map(amplitude => amplitude / maxAmplitude) : rawShape;
    return { frequency: Math.sqrt(value) / (2 * Math.PI), shape };
  });
}

function choleskyFactor(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const lower = Array.from({ length: n }, () => Array(n).fill(0));
  const scale = Math.max(...matrix.map((row, index) => Math.abs(row[index])), 0);
  const tolerance = Math.max(1e-30, scale * 1e-14);
  for (let row = 0; row < n; row++) {
    for (let column = 0; column <= row; column++) {
      let value = matrix[row][column];
      for (let k = 0; k < column; k++) value -= lower[row][k] * lower[column][k];
      if (row === column) {
        if (!Number.isFinite(value) || value <= tolerance) return null;
        lower[row][column] = Math.sqrt(value);
      } else {
        lower[row][column] = value / lower[column][column];
      }
    }
  }
  return lower;
}

function invertLowerTriangular(lower: number[][]): number[][] {
  const n = lower.length;
  const inverse = Array.from({ length: n }, () => Array(n).fill(0));
  for (let column = 0; column < n; column++) {
    for (let row = 0; row < n; row++) {
      let value = row === column ? 1 : 0;
      for (let k = 0; k < row; k++) value -= lower[row][k] * inverse[k][column];
      inverse[row][column] = value / lower[row][row];
    }
  }
  return inverse;
}

function multiplyMatrices(left: number[][], right: number[][]): number[][] {
  const rows = left.length;
  const inner = right.length;
  const columns = right[0]?.length ?? 0;
  const result = Array.from({ length: rows }, () => Array(columns).fill(0));
  for (let row = 0; row < rows; row++) {
    for (let k = 0; k < inner; k++) {
      const value = left[row][k];
      for (let column = 0; column < columns; column++) result[row][column] += value * right[k][column];
    }
  }
  return result;
}

function transposeMatrix(matrix: number[][]): number[][] {
  return matrix[0].map((_, column) => matrix.map(row => row[column]));
}

function symmetricJacobiEigen(matrix: number[][]): { values: number[]; vectors: number[][] } {
  const n = matrix.length;
  const A = matrix.map(row => [...row]);
  const vectors = Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, column) => row === column ? 1 : 0));
  const scale = Math.max(...A.flat().map(Math.abs), 0);
  const tolerance = Math.max(1e-14, scale * 1e-12);
  const maxIterations = Math.max(50, 50 * n * n);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let p = 0;
    let q = 0;
    let largest = 0;
    for (let row = 0; row < n; row++) {
      for (let column = row + 1; column < n; column++) {
        if (Math.abs(A[row][column]) > largest) {
          largest = Math.abs(A[row][column]);
          p = row;
          q = column;
        }
      }
    }
    if (largest <= tolerance || p === q) break;

    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];
    const tau = (aqq - app) / (2 * apq);
    const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
    const c = 1 / Math.sqrt(1 + t * t);
    const s = t * c;

    for (let k = 0; k < n; k++) {
      if (k === p || k === q) continue;
      const akp = A[k][p];
      const akq = A[k][q];
      A[k][p] = A[p][k] = c * akp - s * akq;
      A[k][q] = A[q][k] = s * akp + c * akq;
    }
    A[p][p] = app - t * apq;
    A[q][q] = aqq + t * apq;
    A[p][q] = A[q][p] = 0;

    for (let k = 0; k < n; k++) {
      const vkp = vectors[k][p];
      const vkq = vectors[k][q];
      vectors[k][p] = c * vkp - s * vkq;
      vectors[k][q] = s * vkp + c * vkq;
    }
  }

  return { values: A.map((row, index) => row[index]), vectors };
}

// ============================================================================
// RANDOM EXCITATION DYNAMICS
// Based on CE_340_4 Section 5
// ============================================================================

export interface SpectralAnalysisResult {
  frequencies: number[];
  inputPSD: number[];
  outputPSD: number[];
  transferFunction: number[];
  responseVariance: number;
  peakFactor: number;
  rmsResponse: number;
  expectedMaxResponse: number;
}

// Power Spectral Density models
export type PSDType = 'white-noise' | 'kanai-tajimi' | 'wind-davenport' | 'traffic' | 'machine';

// White noise PSD
export function whitenoisePSD(S0: number): (f: number) => number {
  return () => S0;
}

// Kanai-Tajimi model for earthquake ground motion
export function kanaiTajimiPSD(
  S0: number,      // White noise intensity
  wg: number,      // Ground filter frequency (rad/s)
  zetaG: number    // Ground damping ratio
): (f: number) => number {
  return (f: number) => {
    const w = 2 * Math.PI * f;
    if (w === 0) return S0;
    const r = w / wg;
    const num = 1 + 4 * zetaG * zetaG * r * r;
    const den = Math.pow(1 - r * r, 2) + 4 * zetaG * zetaG * r * r;
    return S0 * (Math.pow(r, 4) * num) / den;
  };
}

// Davenport wind spectrum
export function davenportWindPSD(
  U10: number,     // Mean wind speed at 10m (m/s)
  z: number = 10   // Height (m)
): (f: number) => number {
  const kappa = 0.4; // von Karman constant
  const z0 = 0.03;   // Roughness length
  const uStar = kappa * U10 / Math.log(z / z0);
  
  return (f: number) => {
    if (f <= 0) return 0;
    const fL = 1200 * f / U10;
    const num = 4 * uStar * uStar * 1200 / U10;
    const den = Math.pow(1 + fL * fL, 4/3);
    return num / den;
  };
}

// Traffic-induced vibration spectrum
export function trafficPSD(
  intensity: number = 1,  // Traffic intensity factor
  v: number = 60          // Vehicle speed (km/h)
): (f: number) => number {
  const fc = v / (3.6 * 5); // Characteristic frequency
  return (f: number) => {
    if (f <= 0) return 0;
    return intensity * Math.exp(-Math.pow((f - fc) / fc, 2));
  };
}

// Machine vibration spectrum (narrowband)
export function machinePSD(
  rpm: number,           // Machine RPM
  intensity: number = 1,
  bandwidth: number = 0.1
): (f: number) => number {
  const f0 = rpm / 60;   // Fundamental frequency
  return (f: number) => {
    let S = 0;
    // Include harmonics
    for (let h = 1; h <= 3; h++) {
      const fh = f0 * h;
      S += (intensity / h) * Math.exp(-Math.pow((f - fh) / (bandwidth * fh), 2));
    }
    return S;
  };
}

// SDOF transfer function magnitude squared
export function transferFunctionMag2(
  f: number,
  wn: number,      // Natural frequency (rad/s)
  zeta: number     // Damping ratio
): number {
  const w = 2 * Math.PI * f;
  const r = w / wn;
  const den = Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2);
  return 1 / den;
}

// Spectral analysis for SDOF under random excitation
export function spectralAnalysis(
  mass: number,
  stiffness: number,
  damping: number,
  psdType: PSDType,
  psdParams: { S0?: number; wg?: number; zetaG?: number; U10?: number; rpm?: number; intensity?: number } = {}
): SpectralAnalysisResult {
  const wn = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const fn = wn / (2 * Math.PI);
  
  // Select PSD function
  let inputPSDFunc: (f: number) => number;
  switch (psdType) {
    case 'kanai-tajimi':
      inputPSDFunc = kanaiTajimiPSD(
        psdParams.S0 || 0.01,
        psdParams.wg || wn * 0.5,
        psdParams.zetaG || 0.6
      );
      break;
    case 'wind-davenport':
      inputPSDFunc = davenportWindPSD(psdParams.U10 || 20);
      break;
    case 'traffic':
      inputPSDFunc = trafficPSD(psdParams.intensity || 1);
      break;
    case 'machine':
      inputPSDFunc = machinePSD(psdParams.rpm || 1800, psdParams.intensity || 1);
      break;
    case 'white-noise':
    default:
      inputPSDFunc = whitenoisePSD(psdParams.S0 || 0.01);
  }
  
  // Frequency range for analysis
  const fMax = fn * 5;
  const df = fMax / 200;
  const frequencies: number[] = [];
  const inputPSD: number[] = [];
  const outputPSD: number[] = [];
  const transferFunction: number[] = [];
  
  let responseVariance = 0;
  
  for (let f = df; f <= fMax; f += df) {
    const Sf = inputPSDFunc(f);
    const H2 = transferFunctionMag2(f, wn, zeta) / (stiffness * stiffness);
    const Sy = Sf * H2;
    
    frequencies.push(f);
    inputPSD.push(Sf);
    outputPSD.push(Sy);
    transferFunction.push(Math.sqrt(H2) * stiffness);
    
    responseVariance += Sy * df;
  }
  
  const rmsResponse = Math.sqrt(responseVariance);
  
  // Peak factor for Gaussian process (Davenport)
  const T = 3600; // 1 hour observation
  const nu = fn * Math.sqrt(1 - zeta * zeta); // Zero-crossing rate
  const peakFactor = Math.sqrt(2 * Math.log(nu * T)) + 0.5772 / Math.sqrt(2 * Math.log(nu * T));
  
  const expectedMaxResponse = peakFactor * rmsResponse;
  
  return {
    frequencies,
    inputPSD,
    outputPSD,
    transferFunction,
    responseVariance,
    peakFactor,
    rmsResponse,
    expectedMaxResponse
  };
}

// ============================================================================
// VARIANCE PROPAGATION (CE_340_4 Theorem 4)
// ============================================================================

export interface VariancePropagationResult {
  inputMean: number;
  inputVariance: number;
  inputSkewness: number;
  inputKurtosis: number;
  outputMean: number;
  outputVariance: number;
  outputCOV: number;
  amplificationFactor: number;
}

// Propagate variance through linear system
export function propagateVariance(
  inputMean: number,
  inputVariance: number,
  inputSkewness: number,
  inputKurtosis: number,
  systemGain: number  // |H(ω)|² integrated or DAF
): VariancePropagationResult {
  const outputMean = inputMean * systemGain;
  const outputVariance = inputVariance * systemGain * systemGain;
  const outputCOV = Math.sqrt(outputVariance) / Math.abs(outputMean);
  
  return {
    inputMean,
    inputVariance,
    inputSkewness,
    inputKurtosis,
    outputMean,
    outputVariance,
    outputCOV,
    amplificationFactor: systemGain
  };
}

// ============================================================================
// CIVIL ENGINEERING APPLICATIONS
// ============================================================================

export interface CivilApplication {
  id: string;
  name: string;
  category: 'seismic' | 'wind' | 'vibration-serviceability' | 'traffic' | 'machine';
  description: string;
  typicalFrequencyRange: [number, number]; // Hz
  dampingRange: [number, number];          // ratio
  criticalParameters: string[];
  designCriteria: string;
  references: string[];
}

export const civilApplications: CivilApplication[] = [
  {
    id: 'seismic',
    name: 'Seismic/Earthquake Loading',
    category: 'seismic',
    description: 'Random ground motion excitation from earthquakes, characterized by the Kanai-Tajimi spectrum. Critical for building design in seismic zones.',
    typicalFrequencyRange: [0.1, 10],
    dampingRange: [0.02, 0.07],
    criticalParameters: ['Peak Ground Acceleration (PGA)', 'Spectral Acceleration', 'Site Class'],
    designCriteria: 'ASCE 7-22 Chapter 11-23, Eurocode 8',
    references: ['Kanai (1961)', 'Tajimi (1960)', 'ASCE/SEI 7-22']
  },
  {
    id: 'wind',
    name: 'Wind Loading',
    category: 'wind',
    description: 'Turbulent wind pressure fluctuations modeled by Davenport or Kaimal spectra. Critical for tall buildings and long-span bridges.',
    typicalFrequencyRange: [0.01, 2],
    dampingRange: [0.01, 0.05],
    criticalParameters: ['Basic Wind Speed', 'Exposure Category', 'Gust Factor'],
    designCriteria: 'ASCE 7-22 Chapter 26-31',
    references: ['Davenport (1961)', 'Simiu & Scanlan (1996)']
  },
  {
    id: 'floor-vibration',
    name: 'Vibration Serviceability',
    category: 'vibration-serviceability',
    description: 'Human-induced vibrations from walking, rhythmic activities. Important for floor systems in offices, gyms, and pedestrian bridges.',
    typicalFrequencyRange: [1, 12],
    dampingRange: [0.02, 0.06],
    criticalParameters: ['Walking Frequency', 'Resonance Factor', 'Acceleration Limits'],
    designCriteria: 'AISC Design Guide 11, ISO 10137',
    references: ['Murray et al. (2016)', 'ISO 10137:2007']
  },
  {
    id: 'traffic',
    name: 'Traffic-Induced Vibration',
    category: 'traffic',
    description: 'Vibrations from vehicle passages on bridges and adjacent structures. Combines quasi-static and dynamic components.',
    typicalFrequencyRange: [2, 15],
    dampingRange: [0.02, 0.04],
    criticalParameters: ['Vehicle Speed', 'Axle Loads', 'Road Roughness'],
    designCriteria: 'AASHTO LRFD Bridge Design',
    references: ['Fryba (1999)', 'AASHTO (2020)']
  },
  {
    id: 'machine',
    name: 'Machine Foundation Vibrations',
    category: 'machine',
    description: 'Periodic and random excitations from rotating/reciprocating machinery. Requires isolation design to protect sensitive equipment.',
    typicalFrequencyRange: [5, 100],
    dampingRange: [0.03, 0.10],
    criticalParameters: ['Operating Frequency', 'Unbalance Force', 'Isolation Efficiency'],
    designCriteria: 'ACI 351.3R, DIN 4150',
    references: ['Richart et al. (1970)', 'ACI 351.3R-18']
  }
];

// Get recommended parameters for application
export function getApplicationParameters(appId: string): {
  psdType: PSDType;
  defaultParams: Record<string, number>;
  typicalSystemParams: { mass: number; stiffness: number; damping: number };
} {
  switch (appId) {
    case 'seismic':
      return {
        psdType: 'kanai-tajimi',
        defaultParams: { S0: 0.02, wg: 15.7, zetaG: 0.6 },
        typicalSystemParams: { mass: 100000, stiffness: 5e6, damping: 20000 }
      };
    case 'wind':
      return {
        psdType: 'wind-davenport',
        defaultParams: { U10: 25 },
        typicalSystemParams: { mass: 500000, stiffness: 2e7, damping: 50000 }
      };
    case 'floor-vibration':
      return {
        psdType: 'white-noise',
        defaultParams: { S0: 0.001 },
        typicalSystemParams: { mass: 5000, stiffness: 1e6, damping: 1000 }
      };
    case 'traffic':
      return {
        psdType: 'traffic',
        defaultParams: { intensity: 1 },
        typicalSystemParams: { mass: 50000, stiffness: 5e6, damping: 10000 }
      };
    case 'machine':
      return {
        psdType: 'machine',
        defaultParams: { rpm: 1800, intensity: 1 },
        typicalSystemParams: { mass: 2000, stiffness: 2e6, damping: 4000 }
      };
    default:
      return {
        psdType: 'white-noise',
        defaultParams: { S0: 0.01 },
        typicalSystemParams: { mass: 1000, stiffness: 1e5, damping: 500 }
      };
  }
}

// ============================================================================
// RELIABILITY UNDER RANDOM LOADING
// ============================================================================

export interface RandomLoadReliability {
  beta: number;
  pf: number;
  pfFirstCrossing: number;
  expectedCrossings: number;
  modeFactorB: number;
}

// First-passage probability (Poisson approximation)
export function firstPassageReliability(
  rmsResponse: number,
  threshold: number,
  zeroRate: number,        // Expected zero-crossing rate (Hz)
  duration: number = 3600  // Observation time (s)
): RandomLoadReliability {
  // Normalized threshold
  const a = threshold / rmsResponse;
  
  // Expected number of crossings (Rice formula for Gaussian)
  const nu = zeroRate * Math.exp(-a * a / 2);
  const expectedCrossings = nu * duration;
  
  // First-passage probability (Poisson approximation)
  const pfFirstCrossing = 1 - Math.exp(-expectedCrossings);
  
  // Equivalent reliability index
  const beta = -normalInverseCDF(pfFirstCrossing);
  
  // Mode factor (bandwidth correction)
  const modeFactorB = Math.sqrt(1 + 0.2 * Math.pow(zeroRate, 2));
  
  return {
    beta: isFinite(beta) ? beta : 5,
    pf: normalCDF(-beta),
    pfFirstCrossing,
    expectedCrossings,
    modeFactorB
  };
}

// ============================================================================
// HIGHER-ORDER MOMENTS (CE_340_3 Section 3)
// ============================================================================

export interface HigherOrderMoments {
  mean: number;
  variance: number;
  standardDev: number;
  skewness: number;
  kurtosis: number;
  excessKurtosis: number;
  interpretation: {
    dispersion: string;
    asymmetry: string;
    tailedness: string;
  };
}

export function computeHigherOrderMoments(values: number[], probabilities?: number[]): HigherOrderMoments {
  const n = values.length;
  const p = probabilities || Array(n).fill(1 / n);
  
  // Mean
  const mean = values.reduce((sum, v, i) => sum + v * p[i], 0);
  
  // Central moments
  const mu2 = values.reduce((sum, v, i) => sum + Math.pow(v - mean, 2) * p[i], 0);
  const mu3 = values.reduce((sum, v, i) => sum + Math.pow(v - mean, 3) * p[i], 0);
  const mu4 = values.reduce((sum, v, i) => sum + Math.pow(v - mean, 4) * p[i], 0);
  
  const variance = mu2;
  const standardDev = Math.sqrt(variance);
  const skewness = mu3 / Math.pow(standardDev, 3);
  const kurtosis = mu4 / Math.pow(standardDev, 4);
  const excessKurtosis = kurtosis - 3;
  
  // Interpretation
  let dispersion: string;
  const cov = standardDev / Math.abs(mean);
  if (cov < 0.1) dispersion = 'Low variability (COV < 10%)';
  else if (cov < 0.3) dispersion = 'Moderate variability (10% < COV < 30%)';
  else dispersion = 'High variability (COV > 30%)';
  
  let asymmetry: string;
  if (Math.abs(skewness) < 0.5) asymmetry = 'Approximately symmetric';
  else if (skewness > 0) asymmetry = 'Right-skewed (heavier upper tail)';
  else asymmetry = 'Left-skewed (heavier lower tail)';
  
  let tailedness: string;
  if (excessKurtosis < -0.5) tailedness = 'Light-tailed (platykurtic)';
  else if (excessKurtosis > 0.5) tailedness = 'Heavy-tailed (leptokurtic) - extreme events more likely';
  else tailedness = 'Normal-like tails (mesokurtic)';
  
  return {
    mean,
    variance,
    standardDev,
    skewness,
    kurtosis,
    excessKurtosis,
    interpretation: { dispersion, asymmetry, tailedness }
  };
}

// ============================================================================
// SEISMIC RESPONSE SPECTRUM (ASCE 7 STYLE)
// ============================================================================

export interface SeismicParameters {
  Ss: number;      // Short-period spectral acceleration (g)
  S1: number;      // 1-second spectral acceleration (g)
  siteClass: 'A' | 'B' | 'C' | 'D' | 'E';
  TL: number;      // Long-period transition period (s)
}

export interface ResponseSpectrumPoint {
  T: number;       // Period (s)
  Sa: number;      // Spectral acceleration (g)
  Sd: number;      // Spectral displacement (mm)
  Sv: number;      // Spectral velocity (mm/s)
}

// Site coefficients (ASCE 7-22 simplified)
export function getSiteCoefficients(siteClass: string, Ss: number, S1: number): { Fa: number; Fv: number } {
  const siteFactors: Record<string, { Fa: number; Fv: number }> = {
    'A': { Fa: 0.8, Fv: 0.8 },
    'B': { Fa: 0.9, Fv: 0.8 },
    'C': { Fa: 1.0, Fv: 1.0 },
    'D': { Fa: 1.1, Fv: 1.5 },
    'E': { Fa: 1.0, Fv: 2.4 }
  };
  
  // Apply Ss and S1 dependent modifications for site class D/E
  let { Fa, Fv } = siteFactors[siteClass] || siteFactors['D'];
  
  if (siteClass === 'D' || siteClass === 'E') {
    if (Ss > 1.0) Fa *= 0.9;
    if (S1 > 0.4) Fv *= 0.9;
  }
  
  return { Fa, Fv };
}

export function getSpectralAccelerationAtPeriod(
  period: number,
  params: SeismicParameters,
  spectrumType: 'design' | 'mce',
): number {
  if (!Number.isFinite(period) || period < 0) return 0;
  const { Fa, Fv } = getSiteCoefficients(params.siteClass, params.Ss, params.S1);
  const designSpectrum = spectrumType === 'design';
  const plateau = designSpectrum ? (2 / 3) * Fa * params.Ss : Fa * params.Ss;
  const oneSecond = designSpectrum ? (2 / 3) * Fv * params.S1 : Fv * params.S1;
  const T0 = 0.2 * oneSecond / plateau;
  const Ts = oneSecond / plateau;

  if (period < T0) return plateau * (0.4 + 0.6 * period / T0);
  if (period <= Ts) return plateau;
  if (period <= params.TL) return oneSecond / period;
  return oneSecond * params.TL / (period * period);
}

function getResponseSpectrumPeriods(additionalPeriods: number[] = []): number[] {
  const standardPeriods = [
    0, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2,
    ...Array.from({ length: 38 }, (_, i) => 0.25 + i * 0.1),
    4.0, 5.0, 6.0, 8.0, 10.0,
  ];
  return [...new Set([...standardPeriods, ...additionalPeriods.filter(period => Number.isFinite(period) && period >= 0)])]
    .sort((a, b) => a - b);
}

// Generate ASCE 7 Design Response Spectrum
export function generateDesignSpectrum(params: SeismicParameters, additionalPeriods: number[] = []): ResponseSpectrumPoint[] {
  
  const spectrum: ResponseSpectrumPoint[] = [];
  const g = 9810; // mm/s²
  const periods = getResponseSpectrumPeriods(additionalPeriods);
  for (const T of periods) {
    const Sa = getSpectralAccelerationAtPeriod(T, params, 'design');
    
    // Spectral displacement and velocity
    const omega = T > 0 ? (2 * Math.PI / T) : Infinity;
    const Sd = T > 0 ? (Sa * g) / (omega * omega) : 0;
    const Sv = T > 0 ? (Sa * g) / omega : 0;
    
    spectrum.push({ T, Sa, Sd, Sv });
  }
  
  return spectrum;
}

// Generate MCE (Maximum Considered Earthquake) Spectrum
export function generateMCESpectrum(params: SeismicParameters, additionalPeriods: number[] = []): ResponseSpectrumPoint[] {
  
  const spectrum: ResponseSpectrumPoint[] = [];
  const g = 9810;
  const periods = getResponseSpectrumPeriods(additionalPeriods);
  for (const T of periods) {
    const Sa = getSpectralAccelerationAtPeriod(T, params, 'mce');
    
    const omega = T > 0 ? (2 * Math.PI / T) : Infinity;
    const Sd = T > 0 ? (Sa * g) / (omega * omega) : 0;
    const Sv = T > 0 ? (Sa * g) / omega : 0;
    
    spectrum.push({ T, Sa, Sd, Sv });
  }
  
  return spectrum;
}

// Seismic hazard levels for common US locations
export const seismicHazardPresets: Record<string, SeismicParameters> = {
  'Los Angeles, CA': { Ss: 2.3, S1: 0.85, siteClass: 'D', TL: 8 },
  'San Francisco, CA': { Ss: 1.5, S1: 0.6, siteClass: 'D', TL: 12 },
  'Seattle, WA': { Ss: 1.4, S1: 0.5, siteClass: 'D', TL: 6 },
  'Salt Lake City, UT': { Ss: 1.6, S1: 0.5, siteClass: 'D', TL: 6 },
  'Memphis, TN': { Ss: 1.2, S1: 0.4, siteClass: 'D', TL: 12 },
  'Charleston, SC': { Ss: 1.0, S1: 0.3, siteClass: 'D', TL: 8 },
  'New York, NY': { Ss: 0.3, S1: 0.08, siteClass: 'C', TL: 6 },
  'Chicago, IL': { Ss: 0.15, S1: 0.05, siteClass: 'D', TL: 6 },
  'Custom': { Ss: 1.0, S1: 0.4, siteClass: 'D', TL: 8 }
};
