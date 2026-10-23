/**
 * Beam Analysis Domain Logic
 *
 * Pure domain functions, types, and interfaces for static beam analysis,
 * cross-section properties, diagram generation, influence lines, and envelopes.
 * No UI or React dependencies.
 */

// ============================================================
// Types & Interfaces
// ============================================================

export type LoadType =
  | 'udl'
  | 'concentrated'
  | 'triangular'
  | 'moving'
  | 'partial-udl'
  | 'trapezoidal'
  | 'moment'
  | 'parabolic'
  | 'parametric'
  | 'axle-train'
  | 'support-settlement'
  | 'thermal-gradient'
  | 'prestress'
  | 'patch'
  | 'torsional'
  | 'snow-drift'
  | 'hydrostatic'
  | 'construction-stage'
  | 'harmonic-equivalent';

export type BeamType =
  | 'simply-supported'
  | 'cantilever'
  | 'fixed-fixed'
  | 'propped-cantilever'
  | 'overhanging'
  | 'continuous'
  | 'multi-span'
  | 'gerber'
  | 'elastic-foundation'
  | 'spring-supported'
  | 'settlement'
  | 'tapered'
  | 'beam-column'
  | 'composite';

export type CrossSectionType = 'rectangular' | 'circular' | 'i-beam' | 'hollow-rectangular' | 'hollow-circular';

export interface CrossSectionDimensions {
  type: CrossSectionType;
  width?: number;
  height?: number;
  diameter?: number;
  innerDiameter?: number;
  innerWidth?: number;
  innerHeight?: number;
  flangeWidth?: number;
  flangeThickness?: number;
  webThickness?: number;
}

export interface CrossSectionProperties {
  area: number;
  momentOfInertia: number;
  polarMomentOfInertia: number;
  sectionModulus: number;
  radiusOfGyration: number;
}

export interface BeamAnalysis {
  totalLoad: number;
  centroidX: number;
  momentAtSupport: number;
  maxBendingMoment: number;
  minBendingMoment?: number;
  maxShear: number;
  minShear?: number;
  maxStress: number;
  maxDeflection: number;
  minDeflection?: number;
  deflectionLocation: number;
  loadType: LoadType;
}

export interface BeamSupportCondition {
  position: number;
  type: 'pin' | 'roller' | 'fixed' | 'hinge' | 'none';
}

export interface BeamSolverOptions {
  /** Number of points returned for plotting. The extrema use a finer grid. */
  numPoints?: number;
  /** Extra positions to include in the returned plot data. */
  extraSamplePositions?: number[];
  /** Number of finite elements across the beam. */
  elementCount?: number;
}

export interface BeamSupportReaction {
  position: number;
  vertical: number;
  moment: number;
}

export interface BeamSolverResponse {
  analysis: BeamAnalysis;
  diagramData: DiagramPoint[];
  supportReactions: BeamSupportReaction[];
  supportFallback: boolean;
}

export interface LoadConfig {
  type: LoadType;
  intensity: number;
  position?: number;
  peakPosition?: number;
  movingStep?: number;
  startPosition?: number;
  endPosition?: number;
  startIntensity?: number;
  endIntensity?: number;
  slope?: number;
  intercept?: number;
  inverted?: boolean;
  triStartPosition?: number;
  triEndPosition?: number;
  forceAngle?: number;
}

export interface HybridLoadConfig {
  loads: LoadConfig[];
  combinations?: LoadCombination[];
}

export interface LoadCombination {
  name: string;
  factors: { loadIndex: number; factor: number }[];
}

export interface DiagramPoint {
  x: number;
  shear: number;
  moment: number;
  load: number;
  deflection: number;
}

export interface InfluencePoint {
  loadPosition: number;
  shearAt: number;
  momentAt: number;
  deflectionAt: number;
  reactionA: number;
  reactionB: number;
}

export interface EnvelopePoint {
  x: number;
  maxShear: number;
  minShear: number;
  maxMoment: number;
  minMoment: number;
  maxDeflection: number;
  minDeflection: number;
}

// ============================================================
// Cross-Section Properties
// ============================================================

export function calculateCrossSectionProperties(dims: CrossSectionDimensions): CrossSectionProperties {
  let area = 0, I = 0, J = 0, c = 0;

  switch (dims.type) {
    case 'rectangular': {
      const b = dims.width || 0.1;
      const h = dims.height || 0.2;
      area = b * h;
      I = (b * Math.pow(h, 3)) / 12;
      J = (b * h * (b * b + h * h)) / 12;
      c = h / 2;
      break;
    }
    case 'circular': {
      const d = dims.diameter || 0.1;
      const r = d / 2;
      area = Math.PI * r * r;
      I = (Math.PI * Math.pow(d, 4)) / 64;
      J = (Math.PI * Math.pow(d, 4)) / 32;
      c = r;
      break;
    }
    case 'hollow-rectangular': {
      const b = dims.width || 0.15;
      const h = dims.height || 0.25;
      const bi = dims.innerWidth || 0.12;
      const hi = dims.innerHeight || 0.22;
      area = b * h - bi * hi;
      I = (b * Math.pow(h, 3) - bi * Math.pow(hi, 3)) / 12;
      J = (b * h * (b * b + h * h) - bi * hi * (bi * bi + hi * hi)) / 12;
      c = h / 2;
      break;
    }
    case 'hollow-circular': {
      const d = dims.diameter || 0.15;
      const di = dims.innerDiameter || 0.12;
      const r = d / 2;
      area = Math.PI * (r * r - (di / 2) * (di / 2));
      I = (Math.PI * (Math.pow(d, 4) - Math.pow(di, 4))) / 64;
      J = (Math.PI * (Math.pow(d, 4) - Math.pow(di, 4))) / 32;
      c = r;
      break;
    }
    case 'i-beam': {
      const bf = dims.flangeWidth || 0.15;
      const tf = dims.flangeThickness || 0.015;
      const h = dims.height || 0.3;
      const tw = dims.webThickness || 0.01;
      const hw = h - 2 * tf;
      area = 2 * bf * tf + hw * tw;
      I = (bf * Math.pow(h, 3) - (bf - tw) * Math.pow(hw, 3)) / 12;
      J = (2 * bf * Math.pow(tf, 3) + hw * Math.pow(tw, 3)) / 3;
      c = h / 2;
      break;
    }
  }

  const S = I / c;
  const r = Math.sqrt(I / area);

  return {
    area,
    momentOfInertia: I,
    polarMomentOfInertia: J,
    sectionModulus: S,
    radiusOfGyration: r
  };
}

// ============================================================
// Beam Analysis Functions
// ============================================================

/** For concentrated/moving loads with a force angle, return the vertical component factor */
function verticalFactor(loadConfig: LoadConfig): number {
  if ((loadConfig.type === 'concentrated' || loadConfig.type === 'moving') && loadConfig.forceAngle) {
    return Math.cos(loadConfig.forceAngle * Math.PI / 180);
  }
  return 1;
}

const gaussNodes = [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)];
const gaussWeights = [5 / 9, 8 / 9, 5 / 9];

function defaultBeamSupports(beamType: BeamType): BeamSupportCondition[] {
  switch (beamType) {
    case 'cantilever': return [{ position: 0, type: 'fixed' }];
    case 'fixed-fixed': return [{ position: 0, type: 'fixed' }, { position: 1, type: 'fixed' }];
    case 'propped-cantilever':
    case 'settlement': return [{ position: 0, type: 'fixed' }, { position: 1, type: 'roller' }];
    case 'overhanging': return [{ position: 0.25, type: 'pin' }, { position: 0.75, type: 'roller' }];
    case 'continuous': return [{ position: 0, type: 'pin' }, { position: 0.5, type: 'pin' }, { position: 1, type: 'roller' }];
    case 'multi-span': return [{ position: 0, type: 'pin' }, { position: 0.33, type: 'roller' }, { position: 0.66, type: 'roller' }, { position: 1, type: 'roller' }];
    case 'gerber': return [{ position: 0, type: 'pin' }, { position: 0.5, type: 'hinge' }, { position: 1, type: 'roller' }];
    case 'spring-supported': return [{ position: 0, type: 'pin' }, { position: 0.5, type: 'roller' }, { position: 1, type: 'roller' }];
    case 'simply-supported':
    case 'elastic-foundation':
    case 'tapered':
    case 'beam-column':
    case 'composite':
    default: return [{ position: 0, type: 'pin' }, { position: 1, type: 'roller' }];
  }
}

function normalizedBeamSupports(beamType: BeamType, supports: BeamSupportCondition[] | undefined, beamLength: number): BeamSupportCondition[] {
  const source = supports?.length ? supports : defaultBeamSupports(beamType);
  const normalized = source
    .filter((support) => support.type !== 'none' && Number.isFinite(support.position))
    .map((support) => ({ ...support, position: Math.min(1, Math.max(0, support.position)) }));
  const restrainedPositions = new Set(normalized.map((support) => support.position.toFixed(9)));
  const hasFixed = normalized.some((support) => support.type === 'fixed');
  if (hasFixed || restrainedPositions.size >= 2) return normalized;

  // A free beam or a single pin has rigid-body motion. Use the selected beam's
  // standard restraints so the solver never returns plausible-looking NaNs.
  return defaultBeamSupports(beamType);
}

function hasStableSupportLayout(supports: BeamSupportCondition[]): boolean {
  const active = supports.filter((support) => support.type !== 'none' && Number.isFinite(support.position));
  return active.some((support) => support.type === 'fixed') || new Set(active.map((support) => support.position.toFixed(9))).size >= 2;
}

function loadPosition(load: LoadConfig, beamLength: number): number {
  if (load.type === 'moving' || load.type === 'axle-train') return (load.movingStep ?? load.position ?? 0.5) * beamLength;
  return (load.position ?? 0.5) * beamLength;
}

function distributedLoadBounds(load: LoadConfig, beamLength: number): [number, number] {
  if (load.type === 'partial-udl' || load.type === 'patch' || load.type === 'prestress') {
    return [(load.startPosition ?? 0.25) * beamLength, (load.endPosition ?? 0.75) * beamLength];
  }
  if (load.type === 'triangular' || load.type === 'snow-drift' || load.type === 'hydrostatic') {
    return [(load.triStartPosition ?? 0) * beamLength, (load.triEndPosition ?? 1) * beamLength];
  }
  return [0, beamLength];
}

/** Load intensity is positive downward and remains in base SI units. */
function distributedIntensityAt(load: LoadConfig, x: number, beamLength: number): number {
  const sign = load.inverted ? -1 : 1;
  const intensity = load.intensity * sign;
  const [start, end] = distributedLoadBounds(load, beamLength);
  if (end <= start || x < start || x > end) return 0;

  switch (load.type) {
    case 'partial-udl':
    case 'patch':
    case 'prestress':
      return intensity;
    case 'triangular':
    case 'snow-drift':
    case 'hydrostatic': {
      const ratio = (x - start) / (end - start);
      return intensity * (load.peakPosition === 1 ? ratio : 1 - ratio);
    }
    case 'trapezoidal':
    case 'parametric': {
      const startIntensity = (load.startIntensity ?? load.intercept ?? load.intensity) * sign;
      const endIntensity = (load.endIntensity ?? ((load.slope ?? 0) * beamLength + (load.intercept ?? load.intensity))) * sign;
      return startIntensity + (endIntensity - startIntensity) * x / beamLength;
    }
    case 'parabolic':
      return 4 * intensity * x * (beamLength - x) / (beamLength * beamLength);
    case 'udl':
    case 'construction-stage':
    default:
      return intensity;
  }
}

function isDistributedLoadType(type: LoadType): boolean {
  return type === 'udl' || type === 'partial-udl' || type === 'triangular' || type === 'trapezoidal' ||
    type === 'parabolic' || type === 'parametric' || type === 'patch' || type === 'prestress' ||
    type === 'snow-drift' || type === 'hydrostatic' || type === 'construction-stage';
}

function integrateDistributedLoad(load: LoadConfig, beamLength: number, from: number, to: number, momentAboutX?: number): number {
  const [rawStart, rawEnd] = distributedLoadBounds(load, beamLength);
  const start = Math.max(0, from, Math.min(rawStart, rawEnd));
  const end = Math.min(beamLength, to, Math.max(rawStart, rawEnd));
  if (end <= start) return 0;

  let total = 0;
  const midpoint = (start + end) / 2;
  const halfLength = (end - start) / 2;
  for (let i = 0; i < gaussNodes.length; i++) {
    const x = midpoint + halfLength * gaussNodes[i];
    const value = distributedIntensityAt(load, x, beamLength);
    total += gaussWeights[i] * value * (momentAboutX === undefined ? 1 : momentAboutX - x);
  }
  return total * halfLength;
}

function solveDenseSystem(matrix: Float64Array[], rhs: Float64Array): Float64Array | null {
  const size = rhs.length;
  const a = matrix.map((row) => row.slice());
  const b = rhs.slice();

  for (let column = 0; column < size; column++) {
    let pivot = column;
    let pivotMagnitude = Math.abs(a[column][column]);
    for (let row = column + 1; row < size; row++) {
      const magnitude = Math.abs(a[row][column]);
      if (magnitude > pivotMagnitude) {
        pivot = row;
        pivotMagnitude = magnitude;
      }
    }
    if (!Number.isFinite(pivotMagnitude) || pivotMagnitude < 1e-18) return null;
    if (pivot !== column) {
      [a[pivot], a[column]] = [a[column], a[pivot]];
      [b[pivot], b[column]] = [b[column], b[pivot]];
    }

    for (let row = column + 1; row < size; row++) {
      const factor = a[row][column] / a[column][column];
      if (factor === 0) continue;
      a[row][column] = 0;
      for (let entry = column + 1; entry < size; entry++) a[row][entry] -= factor * a[column][entry];
      b[row] -= factor * b[column];
    }
  }

  const result = new Float64Array(size);
  for (let row = size - 1; row >= 0; row--) {
    let value = b[row];
    for (let column = row + 1; column < size; column++) value -= a[row][column] * result[column];
    result[row] = value / a[row][row];
  }
  return result;
}

/**
 * Solve the Euler-Bernoulli beam equation with a finite-element stiffness
 * model. Point loads and support locations are inserted into the mesh exactly;
 * distributed loads use consistent element loads. This keeps the plotted
 * curves and reported extrema on the same structural model for every span.
 */
export function solveBeamResponse(
  beamType: BeamType,
  loads: LoadConfig[],
  beamLength: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  supports?: BeamSupportCondition[],
  options: BeamSolverOptions = {},
  sectionModulus: number = momentOfInertia / 0.1,
): BeamSolverResponse {
  const L = Math.max(beamLength, 1e-6);
  const E = Math.max(elasticModulus, 1e-6);
  const I = Math.max(momentOfInertia, 1e-12);
  const meshCount = Math.max(12, Math.min(160, Math.floor(options.elementCount ?? 80)));
  const supportFallback = supports !== undefined && !hasStableSupportLayout(supports);
  const supportConditions = normalizedBeamSupports(beamType, supports, L);
  const pointForces = loads
    .filter((load) => load.type === 'concentrated' || load.type === 'moving' || load.type === 'axle-train')
    .map((load) => ({
      position: Math.min(L, Math.max(0, loadPosition(load, L))),
      downward: load.intensity * (load.inverted ? -1 : 1) * verticalFactor(load),
    }));
  const pointMoments = loads
    .filter((load) => load.type === 'moment')
    .map((load) => ({
      position: Math.min(L, Math.max(0, loadPosition(load, L))),
      moment: load.intensity * (load.inverted ? -1 : 1),
    }));
  const distributedLoads = loads.filter((load) => isDistributedLoadType(load.type));

  const events = [
    ...supportConditions.map((support) => support.position * L),
    ...pointForces.map((load) => load.position),
    ...pointMoments.map((load) => load.position),
    ...distributedLoads.flatMap((load) => distributedLoadBounds(load, L)),
  ];
  const tolerance = L * 1e-10;
  const coordinates = [...Array.from({ length: meshCount + 1 }, (_, index) => (index / meshCount) * L), 0, L, ...events]
    .map((x) => Math.min(L, Math.max(0, x)))
    .sort((a, b) => a - b)
    .filter((x, index, values) => index === 0 || Math.abs(x - values[index - 1]) > tolerance);
  const nodeCount = coordinates.length;
  const positionToNode = (position: number) => {
    let low = 0;
    let high = nodeCount - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (coordinates[middle] < position) low = middle + 1;
      else high = middle;
    }
    if (low > 0 && Math.abs(coordinates[low - 1] - position) < Math.abs(coordinates[low] - position)) return low - 1;
    return low;
  };

  const supportAtNode = new Map<number, BeamSupportCondition['type']>();
  for (const support of supportConditions) {
    const node = positionToNode(support.position * L);
    const existing = supportAtNode.get(node);
    if (!existing || support.type === 'fixed' || (support.type === 'hinge' && existing !== 'fixed')) supportAtNode.set(node, support.type);
  }

  const leftRotation = Array.from({ length: nodeCount }, (_, node) => node * 2 + 1);
  const rightRotation = [...leftRotation];
  let degreeCount = nodeCount * 2;
  for (const [node, type] of supportAtNode) {
    if (type === 'hinge' && node > 0 && node < nodeCount - 1) rightRotation[node] = degreeCount++;
  }

  const elementDofs: number[][] = [];
  const stiffness = Array.from({ length: degreeCount }, () => new Float64Array(degreeCount));
  const force = new Float64Array(degreeCount);
  for (let element = 0; element < nodeCount - 1; element++) {
    const x1 = coordinates[element];
    const x2 = coordinates[element + 1];
    const length = x2 - x1;
    const dofs = [element * 2, rightRotation[element], (element + 1) * 2, leftRotation[element + 1]];
    elementDofs.push(dofs);
    const scale = E * I / Math.pow(length, 3);
    const localK = [
      [12, 6 * length, -12, 6 * length],
      [6 * length, 4 * length * length, -6 * length, 2 * length * length],
      [-12, -6 * length, 12, -6 * length],
      [6 * length, 2 * length * length, -6 * length, 4 * length * length],
    ];
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) stiffness[dofs[row]][dofs[column]] += scale * localK[row][column];
    }

    const midpoint = (x1 + x2) / 2;
    const halfLength = length / 2;
    for (let gauss = 0; gauss < gaussNodes.length; gauss++) {
      const xi = (gaussNodes[gauss] + 1) / 2;
      const x = midpoint + halfLength * gaussNodes[gauss];
      const qUp = -distributedLoads.reduce((sum, load) => sum + distributedIntensityAt(load, x, L), 0);
      const n1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
      const n2 = length * (xi - 2 * xi * xi + xi * xi * xi);
      const n3 = 3 * xi * xi - 2 * xi * xi * xi;
      const n4 = length * (-xi * xi + xi * xi * xi);
      const shapes = [n1, n2, n3, n4];
      for (let row = 0; row < 4; row++) force[dofs[row]] += qUp * shapes[row] * gaussWeights[gauss] * halfLength;
    }
  }

  for (const point of pointForces) force[positionToNode(point.position) * 2] -= point.downward;
  for (const point of pointMoments) {
    const node = positionToNode(point.position);
    force[rightRotation[node]] += point.moment;
  }

  const restrained = new Set<number>();
  for (const [node, type] of supportAtNode) {
    if (type === 'none') continue;
    restrained.add(node * 2);
    if (type === 'fixed') {
      restrained.add(leftRotation[node]);
      restrained.add(rightRotation[node]);
    }
  }
  const freeDofs = Array.from({ length: degreeCount }, (_, degree) => degree).filter((degree) => !restrained.has(degree));
  const reducedK = freeDofs.map((row) => {
    const reducedRow = new Float64Array(freeDofs.length);
    freeDofs.forEach((column, index) => { reducedRow[index] = stiffness[row][column]; });
    return reducedRow;
  });
  const reducedF = new Float64Array(freeDofs.map((degree) => force[degree]));
  let solved = solveDenseSystem(reducedK, reducedF);
  if (!solved) {
    const fallbackSupports = defaultBeamSupports(beamType);
    const alreadyUsingDefaults = supportConditions.length === fallbackSupports.length && supportConditions.every((support, index) =>
      support.type === fallbackSupports[index].type && support.position === fallbackSupports[index].position,
    );
    if (alreadyUsingDefaults) throw new Error('Beam support configuration is unstable.');
    const fallback = solveBeamResponse(beamType, loads, L, E, I, fallbackSupports, options, sectionModulus);
    return { ...fallback, supportFallback: true };
  }

  const displacement = new Float64Array(degreeCount);
  freeDofs.forEach((degree, index) => { displacement[degree] = solved![index]; });
  const residual = new Float64Array(degreeCount);
  for (let row = 0; row < degreeCount; row++) {
    let value = -force[row];
    for (let column = 0; column < degreeCount; column++) value += stiffness[row][column] * displacement[column];
    residual[row] = value;
  }

  const supportReactions = [...supportAtNode.entries()].map(([node, type]) => ({
    position: coordinates[node],
    vertical: residual[node * 2],
    moment: type === 'fixed' ? residual[leftRotation[node]] + residual[rightRotation[node]] : 0,
  }));

  const integrateAllDistributed = (from: number, to: number, momentAboutX?: number) =>
    distributedLoads.reduce((sum, load) => sum + integrateDistributedLoad(load, L, from, to, momentAboutX), 0);

  const elementForX = (x: number): number => {
    if (x >= L) return nodeCount - 2;
    let low = 0;
    let high = nodeCount - 1;
    while (low < high - 1) {
      const middle = Math.floor((low + high) / 2);
      if (coordinates[middle] <= x) low = middle;
      else high = middle;
    }
    return low;
  };

  const evaluateAt = (rawX: number) => {
    const x = Math.min(L, Math.max(0, rawX));
    const element = elementForX(x);
    const x1 = coordinates[element];
    const length = coordinates[element + 1] - x1;
    const xi = Math.min(1, Math.max(0, (x - x1) / length));
    const dofs = elementDofs[element];
    const n1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
    const n2 = length * (xi - 2 * xi * xi + xi * xi * xi);
    const n3 = 3 * xi * xi - 2 * xi * xi * xi;
    const n4 = length * (-xi * xi + xi * xi * xi);
    const deflectionUp = n1 * displacement[dofs[0]] + n2 * displacement[dofs[1]] + n3 * displacement[dofs[2]] + n4 * displacement[dofs[3]];

    let shear = 0;
    let moment = 0;
    for (const reaction of supportReactions) {
      const beforeRightBoundary = reaction.position < L - tolerance;
      const isLeftOfCut = reaction.position < x - tolerance || (beforeRightBoundary && reaction.position <= x + tolerance);
      if (!isLeftOfCut) continue;
      shear += reaction.vertical;
      moment += reaction.vertical * (x - reaction.position) - reaction.moment;
    }
    for (const point of pointForces) {
      const beforeRightBoundary = point.position < L - tolerance;
      if (point.position < x - tolerance || (beforeRightBoundary && point.position <= x + tolerance)) {
        shear -= point.downward;
        moment -= point.downward * (x - point.position);
      }
    }
    for (const point of pointMoments) {
      if (point.position < x - tolerance || (point.position < L - tolerance && point.position <= x + tolerance)) moment -= point.moment;
    }
    shear -= integrateAllDistributed(0, x);
    moment -= integrateAllDistributed(0, x, x);
    const load = distributedLoads.reduce((sum, item) => sum + distributedIntensityAt(item, x, L), 0);
    return { x, shear, moment, load, deflection: -deflectionUp };
  };

  const numPoints = Math.max(1, Math.floor(options.numPoints ?? 400));
  const chartXs = Array.from({ length: numPoints + 1 }, (_, index) => (index / numPoints) * L);
  for (const extraPosition of options.extraSamplePositions ?? []) {
    if (Number.isFinite(extraPosition) && extraPosition >= 0 && extraPosition <= L) chartXs.push(extraPosition);
  }
  const sortedChartXs = chartXs.sort((a, b) => a - b).filter((x, index, values) => index === 0 || Math.abs(x - values[index - 1]) > tolerance);
  const diagramData = sortedChartXs.map((x) => {
    const point = evaluateAt(x);
    return { x: point.x, shear: point.shear / 1000, moment: point.moment / 1000, load: point.load / 1000, deflection: point.deflection * 1000 };
  });

  const eventPositions = [...coordinates, ...pointForces.map((point) => point.position), ...pointMoments.map((point) => point.position)];
  const epsilon = Math.max(L * 1e-7, 1e-9);
  const extremaXs = [
    ...Array.from({ length: Math.max(400, numPoints) + 1 }, (_, index) => (index / Math.max(400, numPoints)) * L),
    ...eventPositions,
    ...eventPositions.flatMap((position) => [position - epsilon, position + epsilon]),
  ].map((x) => Math.min(L, Math.max(0, x))).sort((a, b) => a - b)
    .filter((x, index, values) => index === 0 || Math.abs(x - values[index - 1]) > tolerance);

  let maxShear = -Infinity;
  let minShear = Infinity;
  let maxBendingMoment = -Infinity;
  let minBendingMoment = Infinity;
  let maxDeflection = -Infinity;
  let minDeflection = Infinity;
  let maxAbsDeflection = -Infinity;
  let deflectionLocation = L / 2;
  let maxAbsMoment = 0;
  for (const x of extremaXs) {
    const point = evaluateAt(x);
    maxShear = Math.max(maxShear, point.shear);
    minShear = Math.min(minShear, point.shear);
    maxBendingMoment = Math.max(maxBendingMoment, point.moment);
    minBendingMoment = Math.min(minBendingMoment, point.moment);
    maxDeflection = Math.max(maxDeflection, point.deflection);
    minDeflection = Math.min(minDeflection, point.deflection);
    if (Math.abs(point.deflection) > maxAbsDeflection) {
      maxAbsDeflection = Math.abs(point.deflection);
      deflectionLocation = point.x;
    }
    maxAbsMoment = Math.max(maxAbsMoment, Math.abs(point.moment));
  }

  let totalLoad = 0;
  let firstMoment = 0;
  for (const load of distributedLoads) {
    totalLoad += integrateDistributedLoad(load, L, 0, L);
    // Integrate x·q(x) directly; the Gauss rule is exact for the supported load profiles.
    const [rawStart, rawEnd] = distributedLoadBounds(load, L);
    const start = Math.max(0, Math.min(rawStart, rawEnd));
    const end = Math.min(L, Math.max(rawStart, rawEnd));
    if (end > start) {
      const midpoint = (start + end) / 2;
      const halfLength = (end - start) / 2;
      for (let i = 0; i < gaussNodes.length; i++) {
        const x = midpoint + halfLength * gaussNodes[i];
        firstMoment += gaussWeights[i] * x * distributedIntensityAt(load, x, L) * halfLength;
      }
    }
  }
  for (const point of pointForces) {
    totalLoad += point.downward;
    firstMoment += point.downward * point.position;
  }
  const momentAtSupport = Math.max(0, ...supportReactions.map((reaction) => Math.abs(reaction.moment)));
  const analysis: BeamAnalysis = {
    totalLoad,
    centroidX: Math.abs(totalLoad) > 1e-12 ? firstMoment / totalLoad : L / 2,
    momentAtSupport,
    maxBendingMoment: Number.isFinite(maxBendingMoment) ? maxBendingMoment : 0,
    minBendingMoment: Number.isFinite(minBendingMoment) ? minBendingMoment : 0,
    maxShear: Number.isFinite(maxShear) ? maxShear : 0,
    minShear: Number.isFinite(minShear) ? minShear : 0,
    maxStress: 0,
    maxDeflection: Number.isFinite(maxDeflection) ? maxDeflection : 0,
    minDeflection: Number.isFinite(minDeflection) ? minDeflection : 0,
    deflectionLocation,
    loadType: loads.length === 1 ? loads[0].type : 'udl',
  };
  analysis.maxStress = sectionModulus > 0 ? maxAbsMoment / sectionModulus : 0;

  return { analysis, diagramData, supportReactions, supportFallback };
}

export function analyzeSimplySupported(
  loadConfig: LoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5
): BeamAnalysis {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type, position = 0.5, peakPosition = 0 } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const E = elasticModulus;
  const I = momentOfInertia;

  let totalLoad: number;
  let centroidX: number;
  let maxBendingMoment: number;
  let maxShear: number;
  let maxDeflection: number;
  let deflectionLocation: number;

  switch (type) {
    case 'concentrated': {
      const a = position * L;
      const b = L - a;
      totalLoad = intensity;
      centroidX = a;
      maxBendingMoment = (intensity * a * b) / L;
      maxShear = Math.max(intensity * b / L, intensity * a / L);
      maxDeflection = (intensity * a * a * b * b) / (3 * E * I * L);
      deflectionLocation = a;
      break;
    }
    case 'triangular': {
      totalLoad = (intensity * L) / 2;
      if (peakPosition === 0) {
        centroidX = L / 3;
        maxBendingMoment = (intensity * L * L) / (9 * Math.sqrt(3));
      } else {
        centroidX = (2 * L) / 3;
        maxBendingMoment = (intensity * L * L) / (9 * Math.sqrt(3));
      }
      const R1 = peakPosition === 0 ? (2 * totalLoad) / 3 : totalLoad / 3;
      const R2 = totalLoad - R1;
      maxShear = Math.max(R1, R2);
      maxDeflection = (intensity * Math.pow(L, 4)) / (120 * E * I);
      deflectionLocation = peakPosition === 0 ? 0.519 * L : 0.481 * L;
      break;
    }
    case 'moving': {
      const pos = (loadConfig.movingStep || 0.5) * L;
      const a = pos;
      const b = L - a;
      totalLoad = intensity;
      centroidX = a;
      maxBendingMoment = (intensity * a * b) / L;
      maxShear = Math.max(intensity * b / L, intensity * a / L);
      maxDeflection = (intensity * a * a * b * b) / (3 * E * I * L);
      deflectionLocation = a;
      break;
    }
    case 'partial-udl': {
      const a = (loadConfig.startPosition || 0.25) * L;
      const b = (loadConfig.endPosition || 0.75) * L;
      const loadLength = b - a;
      totalLoad = intensity * loadLength;
      centroidX = a + loadLength / 2;
      const R1 = totalLoad * (L - centroidX) / L;
      maxBendingMoment = R1 * centroidX - (intensity * Math.pow(centroidX - a, 2)) / 2;
      maxShear = Math.max(R1, totalLoad - R1);
      maxDeflection = (5 * totalLoad * Math.pow(L, 3)) / (384 * E * I);
      deflectionLocation = L / 2;
      break;
    }
    case 'trapezoidal': {
      const w1 = loadConfig.startIntensity || intensity;
      const w2 = loadConfig.endIntensity || intensity * 0.5;
      totalLoad = (w1 + w2) * L / 2;
      centroidX = L * (w1 + 2 * w2) / (3 * (w1 + w2));
      const R1 = totalLoad * (L - centroidX) / L;
      maxBendingMoment = R1 * L / 2;
      maxShear = Math.max(R1, totalLoad - R1);
      maxDeflection = (totalLoad * Math.pow(L, 3)) / (60 * E * I);
      deflectionLocation = L / 2;
      break;
    }
    case 'moment': {
      const a = position * L;
      const M0 = intensity;
      totalLoad = 0;
      centroidX = a;
      maxBendingMoment = M0 * (1 - a / L);
      maxShear = M0 / L;
      maxDeflection = (M0 * L * L) / (9 * Math.sqrt(3) * E * I);
      deflectionLocation = L / Math.sqrt(3);
      break;
    }
    case 'parabolic': {
      totalLoad = (2 * intensity * L) / 3;
      centroidX = L / 2;
      maxBendingMoment = (intensity * L * L) / 12;
      maxShear = totalLoad / 2;
      maxDeflection = (5 * intensity * Math.pow(L, 4)) / (768 * E * I);
      deflectionLocation = L / 2;
      break;
    }
    case 'udl':
    default: {
      totalLoad = intensity * L;
      centroidX = L / 2;
      maxBendingMoment = (intensity * L * L) / 8;
      maxShear = totalLoad / 2;
      maxDeflection = (5 * intensity * Math.pow(L, 4)) / (384 * E * I);
      deflectionLocation = L / 2;
      break;
    }
  }

  const maxStress = maxBendingMoment / sectionModulus;

  return {
    totalLoad,
    centroidX,
    momentAtSupport: 0,
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: type
  };
}

export function analyzeCantilever(
  loadConfig: LoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5
): BeamAnalysis {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type, position = 1, peakPosition = 1 } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const E = elasticModulus;
  const I = momentOfInertia;

  let totalLoad: number;
  let centroidX: number;
  let maxBendingMoment: number;
  let maxShear: number;
  let maxDeflection: number;
  let deflectionLocation: number;

  switch (type) {
    case 'concentrated': {
      const a = position * L;
      totalLoad = intensity;
      centroidX = a;
      maxBendingMoment = intensity * a;
      maxShear = intensity;
      maxDeflection = (intensity * Math.pow(a, 3)) / (3 * E * I);
      deflectionLocation = a;
      break;
    }
    case 'triangular': {
      totalLoad = (intensity * L) / 2;
      if (peakPosition === 0) {
        centroidX = L / 3;
        maxBendingMoment = (intensity * L * L) / 6;
        maxDeflection = (intensity * Math.pow(L, 4)) / (30 * E * I);
      } else {
        centroidX = (2 * L) / 3;
        maxBendingMoment = (intensity * L * L) / 3;
        maxDeflection = (intensity * Math.pow(L, 4)) / (15 * E * I);
      }
      maxShear = totalLoad;
      deflectionLocation = L;
      break;
    }
    case 'moving': {
      const pos = (loadConfig.movingStep || 1) * L;
      totalLoad = intensity;
      centroidX = pos;
      maxBendingMoment = intensity * pos;
      maxShear = intensity;
      maxDeflection = (intensity * Math.pow(pos, 3)) / (3 * E * I);
      deflectionLocation = pos;
      break;
    }
    case 'partial-udl': {
      const a = (loadConfig.startPosition || 0) * L;
      const b = (loadConfig.endPosition || 1) * L;
      const loadLength = b - a;
      totalLoad = intensity * loadLength;
      centroidX = a + loadLength / 2;
      maxBendingMoment = intensity * loadLength * (a + loadLength / 2);
      maxShear = totalLoad;
      maxDeflection = (intensity * Math.pow(L, 4)) / (8 * E * I);
      deflectionLocation = L;
      break;
    }
    case 'trapezoidal': {
      const w1 = loadConfig.startIntensity || intensity;
      const w2 = loadConfig.endIntensity || intensity * 0.5;
      totalLoad = (w1 + w2) * L / 2;
      centroidX = L * (w1 + 2 * w2) / (3 * (w1 + w2));
      maxBendingMoment = totalLoad * centroidX;
      maxShear = totalLoad;
      maxDeflection = (totalLoad * Math.pow(L, 3)) / (8 * E * I);
      deflectionLocation = L;
      break;
    }
    case 'moment': {
      const a = position * L;
      const M0 = intensity;
      totalLoad = 0;
      centroidX = a;
      maxBendingMoment = M0;
      maxShear = 0;
      maxDeflection = (M0 * a * a) / (2 * E * I);
      deflectionLocation = a;
      break;
    }
    case 'parabolic': {
      totalLoad = (2 * intensity * L) / 3;
      centroidX = L / 2;
      maxBendingMoment = (intensity * L * L) / 4;
      maxShear = totalLoad;
      maxDeflection = (intensity * Math.pow(L, 4)) / (20 * E * I);
      deflectionLocation = L;
      break;
    }
    case 'udl':
    default: {
      totalLoad = intensity * L;
      centroidX = L / 2;
      maxBendingMoment = (intensity * L * L) / 2;
      maxShear = totalLoad;
      maxDeflection = (intensity * Math.pow(L, 4)) / (8 * E * I);
      deflectionLocation = L;
      break;
    }
  }

  const maxStress = maxBendingMoment / sectionModulus;

  return {
    totalLoad,
    centroidX,
    momentAtSupport: maxBendingMoment,
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: type
  };
}

export function analyzeFixedFixed(
  loadConfig: LoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5
): BeamAnalysis {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type, position = 0.5 } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const E = elasticModulus;
  const I = momentOfInertia;

  let totalLoad: number;
  let centroidX: number;
  let maxBendingMoment: number;
  let maxShear: number;
  let maxDeflection: number;
  let deflectionLocation: number;
  let momentAtSupport: number;

  switch (type) {
    case 'concentrated': {
      const a = position * L;
      const b = L - a;
      totalLoad = intensity;
      centroidX = a;
      const Ma = (intensity * a * b * b) / (L * L);
      const Mb = (intensity * a * a * b) / (L * L);
      momentAtSupport = Math.max(Ma, Mb);
      maxBendingMoment = (intensity * a * a * b * b) / (L * L * L) * 2;
      const R1 = intensity * b * b * (3 * a + b) / (L * L * L);
      maxShear = Math.max(R1, intensity - R1);
      maxDeflection = (intensity * a * a * a * b * b * b) / (3 * E * I * L * L * L);
      deflectionLocation = a;
      break;
    }
    case 'udl':
    default: {
      totalLoad = intensity * L;
      centroidX = L / 2;
      momentAtSupport = (intensity * L * L) / 12;
      maxBendingMoment = (intensity * L * L) / 24;
      maxShear = totalLoad / 2;
      maxDeflection = (intensity * Math.pow(L, 4)) / (384 * E * I);
      deflectionLocation = L / 2;
      break;
    }
  }

  const maxStress = Math.max(maxBendingMoment, momentAtSupport) / sectionModulus;

  return {
    totalLoad,
    centroidX,
    momentAtSupport,
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: type
  };
}

export function analyzeProppedCantilever(
  loadConfig: LoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5
): BeamAnalysis {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const E = elasticModulus;
  const I = momentOfInertia;

  let totalLoad: number;
  let centroidX: number;
  let maxBendingMoment: number;
  let maxShear: number;
  let maxDeflection: number;
  let deflectionLocation: number;
  let momentAtSupport: number;

  switch (type) {
    case 'concentrated': {
      const a = (loadConfig.position || 0.5) * L;
      totalLoad = intensity;
      centroidX = a;
      const Rb = (intensity * a * a * (3 * L - a)) / (2 * L * L * L);
      momentAtSupport = intensity * a - Rb * L;
      maxBendingMoment = Math.abs(momentAtSupport);
      maxShear = Math.max(intensity - Rb, Rb);
      maxDeflection = (intensity * Math.pow(L, 3)) / (48 * E * I);
      deflectionLocation = L * 0.58;
      break;
    }
    case 'udl':
    default: {
      totalLoad = intensity * L;
      centroidX = L / 2;
      const Rb = (3 * intensity * L) / 8;
      momentAtSupport = (intensity * L * L) / 8;
      maxBendingMoment = (9 * intensity * L * L) / 128;
      maxShear = (5 * intensity * L) / 8;
      maxDeflection = (intensity * Math.pow(L, 4)) / (185 * E * I);
      deflectionLocation = 0.4215 * L;
      break;
    }
  }

  const maxStress = Math.max(maxBendingMoment, momentAtSupport) / sectionModulus;

  return {
    totalLoad,
    centroidX,
    momentAtSupport,
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: type
  };
}

export function analyzeOverhanging(
  loadConfig: LoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  overhangRatio: number = 0.25
): BeamAnalysis {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const overhang = overhangRatio * L;
  const span = L - overhang;
  const E = elasticModulus;
  const I = momentOfInertia;

  let totalLoad: number;
  let centroidX: number;
  let maxBendingMoment: number;
  let maxShear: number;
  let maxDeflection: number;
  let deflectionLocation: number;
  let momentAtSupport: number;

  switch (type) {
    case 'concentrated': {
      totalLoad = intensity;
      centroidX = L;
      momentAtSupport = intensity * overhang;
      maxBendingMoment = momentAtSupport;
      maxShear = intensity;
      maxDeflection = (intensity * overhang * overhang * (overhang + span)) / (3 * E * I);
      deflectionLocation = L;
      break;
    }
    case 'udl':
    default: {
      totalLoad = intensity * L;
      centroidX = L / 2;
      momentAtSupport = (intensity * overhang * overhang) / 2;
      const R1 = (intensity * L * L / 2 - momentAtSupport) / span;
      const xMax = R1 / intensity;
      maxBendingMoment = Math.max(momentAtSupport, R1 * xMax - intensity * xMax * xMax / 2);
      maxShear = Math.max(R1, intensity * overhang);
      maxDeflection = (5 * intensity * Math.pow(span, 4)) / (384 * E * I);
      deflectionLocation = span / 2;
      break;
    }
  }

  const maxStress = maxBendingMoment / sectionModulus;

  return {
    totalLoad,
    centroidX,
    momentAtSupport,
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: type
  };
}

export function analyzeContinuous(
  loadConfig: LoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  spanRatio: number = 0.5
): BeamAnalysis {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const L1 = spanRatio * L;
  const E = elasticModulus;
  const I = momentOfInertia;

  let totalLoad: number;
  let centroidX: number;
  let maxBendingMoment: number;
  let maxShear: number;
  let maxDeflection: number;
  let deflectionLocation: number;
  let momentAtSupport: number;

  switch (type) {
    case 'udl':
    default: {
      totalLoad = intensity * L;
      centroidX = L / 2;
      momentAtSupport = (intensity * L1 * L1) / 8;
      maxBendingMoment = (9 * intensity * L1 * L1) / 128;
      maxShear = (5 * intensity * L1) / 8;
      maxDeflection = (intensity * Math.pow(L1, 4)) / (185 * E * I);
      deflectionLocation = L1 * 0.4215;
      break;
    }
  }

  const maxStress = Math.max(maxBendingMoment, momentAtSupport) / sectionModulus;

  return {
    totalLoad,
    centroidX,
    momentAtSupport,
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: type
  };
}

export function analyzeHybridLoads(
  beamType: BeamType,
  hybridConfig: HybridLoadConfig,
  beamLength: number,
  sectionModulus: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5
): BeamAnalysis {
  const results: BeamAnalysis[] = [];

  for (const load of hybridConfig.loads) {
    let result: BeamAnalysis;
    switch (beamType) {
      case 'fixed-fixed':
        result = analyzeFixedFixed(load, beamLength, sectionModulus, elasticModulus, momentOfInertia);
        break;
      case 'propped-cantilever':
        result = analyzeProppedCantilever(load, beamLength, sectionModulus, elasticModulus, momentOfInertia);
        break;
      case 'overhanging':
        result = analyzeOverhanging(load, beamLength, sectionModulus, elasticModulus, momentOfInertia);
        break;
      case 'continuous':
        result = analyzeContinuous(load, beamLength, sectionModulus, elasticModulus, momentOfInertia);
        break;
      case 'cantilever':
        result = analyzeCantilever(load, beamLength, sectionModulus, elasticModulus, momentOfInertia);
        break;
      case 'simply-supported':
      default:
        result = analyzeSimplySupported(load, beamLength, sectionModulus, elasticModulus, momentOfInertia);
        break;
    }
    results.push(result);
  }

  // Build the true point-wise superposed diagram so reported maxima reflect
  // the actual envelope of M(x), V(x), δ(x) — not a conservative sum of per-load
  // maxima (which can occur at different x and over-count, especially for
  // angled loads in opposing directions or off-center placements).
  // NOTE: generateDiagramData returns shear/moment scaled to kN/kN·m (÷1000) and
  // deflection scaled to mm (×1000). Convert back to base SI for BeamAnalysis.
  const diag = generateHybridDiagramData(beamType, hybridConfig.loads, beamLength, elasticModulus, momentOfInertia, 200);
  let maxBendingMoment = 0; // N·m
  let maxShear = 0;         // N
  let maxDeflection = 0;    // m
  let deflectionLocation = beamLength / 2;
  for (const p of diag) {
    const M = p.moment * 1000;       // kN·m → N·m
    const V = p.shear * 1000;        // kN   → N
    const D = p.deflection / 1000;   // mm   → m
    if (Math.abs(M) > Math.abs(maxBendingMoment)) maxBendingMoment = M;
    if (Math.abs(V) > Math.abs(maxShear)) maxShear = V;
    if (Math.abs(D) > Math.abs(maxDeflection)) {
      maxDeflection = D;
      deflectionLocation = p.x;
    }
  }
  const maxStress = sectionModulus > 0 ? Math.abs(maxBendingMoment) / sectionModulus : 0;

  const combined: BeamAnalysis = {
    totalLoad: results.reduce((sum, r) => sum + r.totalLoad, 0),
    centroidX: beamLength / 2,
    momentAtSupport: results.reduce((sum, r) => sum + r.momentAtSupport, 0),
    maxBendingMoment,
    maxShear,
    maxStress,
    maxDeflection,
    deflectionLocation,
    loadType: 'udl'
  };

  return combined;
}

// ============================================================
// Diagram Generation
// ============================================================

export function generateDiagramData(
  beamType: BeamType,
  loadConfig: LoadConfig,
  beamLength: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  numPoints: number = 50,
  supports?: BeamSupportCondition[],
): DiagramPoint[] {
  return solveBeamResponse(beamType, [loadConfig], beamLength, elasticModulus, momentOfInertia, supports, {
    numPoints,
    elementCount: 50,
  }).diagramData;
}
export function generateHybridDiagramData(
  beamType: BeamType,
  loads: LoadConfig[],
  beamLength: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  numPoints: number = 50,
  supports?: BeamSupportCondition[],
): DiagramPoint[] {
  return solveBeamResponse(beamType, loads, beamLength, elasticModulus, momentOfInertia, supports, {
    numPoints,
  }).diagramData;
}
// ============================================================
// Influence Lines
// ============================================================

export function generateInfluenceLineData(
  beamType: BeamType,
  measurementPosition: number,
  beamLength: number,
  numPoints: number = 50,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  supports?: BeamSupportCondition[],
): InfluencePoint[] {
  const L = beamLength;
  const measurementX = Math.min(L, Math.max(0, measurementPosition * L));
  const data: InfluencePoint[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const loadPositionRatio = i / numPoints;
    const response = solveBeamResponse(
      beamType,
      [{ type: 'concentrated', intensity: 1, position: loadPositionRatio }],
      L,
      elasticModulus,
      momentOfInertia,
      supports,
      { numPoints: 1, extraSamplePositions: [measurementX], elementCount: 40 },
    );
    const point = response.diagramData.reduce((closest, candidate) =>
      Math.abs(candidate.x - measurementX) < Math.abs(closest.x - measurementX) ? candidate : closest,
    );
    data.push({
      loadPosition: loadPositionRatio * L,
      shearAt: point.shear * 1000,
      momentAt: point.moment * 1000,
      deflectionAt: point.deflection,
      reactionA: response.supportReactions[0]?.vertical ?? 0,
      reactionB: response.supportReactions[1]?.vertical ?? 0,
    });
  }
  return data;
}
// ============================================================
// Envelope Data (Moving Loads)
// ============================================================

export function generateEnvelopeData(
  beamType: BeamType,
  loadIntensity: number,
  beamLength: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  numPoints: number = 50,
  numPositions: number = 20,
  supports?: BeamSupportCondition[],
): EnvelopePoint[] {
  const L = beamLength;
  const data: EnvelopePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * L;
    let maxShear = -Infinity, minShear = Infinity;
    let maxMoment = -Infinity, minMoment = Infinity;
    let maxDeflection = -Infinity, minDeflection = Infinity;

    for (let j = 0; j <= numPositions; j++) {
      const loadPos = j / numPositions;
      const config: LoadConfig = {
        type: 'moving',
        intensity: loadIntensity,
        movingStep: loadPos
      };

      const diagData = generateDiagramData(beamType, config, L, elasticModulus, momentOfInertia, numPoints, supports);
      const point = diagData[i];

      if (point) {
        maxShear = Math.max(maxShear, point.shear);
        minShear = Math.min(minShear, point.shear);
        maxMoment = Math.max(maxMoment, point.moment);
        minMoment = Math.min(minMoment, point.moment);
        maxDeflection = Math.max(maxDeflection, point.deflection);
        minDeflection = Math.min(minDeflection, point.deflection);
      }
    }

    data.push({
      x,
      maxShear: maxShear === -Infinity ? 0 : maxShear,
      minShear: minShear === Infinity ? 0 : minShear,
      maxMoment: maxMoment === -Infinity ? 0 : maxMoment,
      minMoment: minMoment === Infinity ? 0 : minMoment,
      maxDeflection: maxDeflection === -Infinity ? 0 : maxDeflection,
      minDeflection: minDeflection === Infinity ? 0 : minDeflection
    });
  }

  return data;
}
