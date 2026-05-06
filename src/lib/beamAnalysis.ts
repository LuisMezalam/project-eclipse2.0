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
  maxShear: number;
  maxStress: number;
  maxDeflection: number;
  deflectionLocation: number;
  loadType: LoadType;
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
  numPoints: number = 50
): DiagramPoint[] {
  const sign = loadConfig.inverted ? -1 : 1;
  const { type, position = 0.5, peakPosition = 0, movingStep = 0.5 } = loadConfig;
  const intensity = loadConfig.intensity * sign * verticalFactor(loadConfig);
  const L = beamLength;
  const E = elasticModulus;
  const I = momentOfInertia;
  const data: DiagramPoint[] = [];
  const diagramFamily = beamType === 'cantilever' ? 'cantilever' : 'simply-supported';
  const diagramFactors: Partial<Record<BeamType, { shear: number; moment: number; deflection: number }>> = {
    'fixed-fixed': { shear: 1.15, moment: 0.65, deflection: 0.25 },
    'propped-cantilever': { shear: 1.1, moment: 0.8, deflection: 0.45 },
    overhanging: { shear: 1.1, moment: 1.15, deflection: 1.1 },
    continuous: { shear: 1.1, moment: 0.8, deflection: 0.45 },
    'multi-span': { shear: 1.1, moment: 0.75, deflection: 0.4 },
    'spring-supported': { shear: 1.05, moment: 0.85, deflection: 0.55 },
    settlement: { shear: 1.1, moment: 0.8, deflection: 0.45 },
    gerber: { shear: 1, moment: 0.95, deflection: 1 },
    'elastic-foundation': { shear: 0.95, moment: 0.9, deflection: 0.65 },
    tapered: { shear: 1, moment: 1, deflection: 0.9 },
    'beam-column': { shear: 1, moment: 1.12, deflection: 1.2 },
    composite: { shear: 1, moment: 1, deflection: 0.75 },
  };

  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * L;
    let shear = 0;
    let moment = 0;
    let load = 0;
    let deflection = 0;

    if (diagramFamily === 'simply-supported') {
      switch (type) {
        case 'concentrated': {
          const a = position * L;
          const b = L - a;
          const R1 = intensity * b / L;
          load = Math.abs(x - a) < L / numPoints ? intensity : 0;
          shear = x < a ? R1 : R1 - intensity;
          moment = x <= a ? R1 * x : R1 * x - intensity * (x - a);
          if (x <= a) {
            deflection = (intensity * b * x * (L * L - b * b - x * x)) / (6 * E * I * L);
          } else {
            deflection = (intensity * a * (L - x) * (2 * L * x - x * x - a * a)) / (6 * E * I * L);
          }
          break;
        }
        case 'triangular': {
          if (peakPosition === 0) {
            const w_x = intensity * (1 - x / L);
            load = w_x;
            const R1 = (intensity * L) / 3;
            shear = R1 - intensity * x + (intensity * x * x) / (2 * L);
            moment = R1 * x - (intensity * x * x) / 2 + (intensity * x * x * x) / (6 * L);
          } else {
            const w_x = intensity * (x / L);
            load = w_x;
            const R1 = (intensity * L) / 6;
            shear = R1 - (intensity * x * x) / (2 * L);
            moment = R1 * x - (intensity * x * x * x) / (6 * L);
          }
          deflection = (intensity * x * (L * L - x * x) * (7 * L * L - 3 * x * x)) / (360 * E * I * L * L);
          break;
        }
        case 'moving': {
          const a = movingStep * L;
          const b = L - a;
          const R1 = intensity * b / L;
          load = Math.abs(x - a) < L / numPoints ? intensity : 0;
          shear = x < a ? R1 : R1 - intensity;
          moment = x <= a ? R1 * x : R1 * x - intensity * (x - a);
          if (x <= a) {
            deflection = (intensity * b * x * (L * L - b * b - x * x)) / (6 * E * I * L);
          } else {
            deflection = (intensity * a * (L - x) * (2 * L * x - x * x - a * a)) / (6 * E * I * L);
          }
          break;
        }
        case 'partial-udl': {
          const aStart = (loadConfig.startPosition || 0.25) * L;
          const aEnd = (loadConfig.endPosition || 0.75) * L;
          if (x >= aStart && x <= aEnd) {
            load = intensity;
          }
          const totalLoad = intensity * (aEnd - aStart);
          const centroid = aStart + (aEnd - aStart) / 2;
          const R1 = totalLoad * (L - centroid) / L;
          if (x < aStart) {
            shear = R1;
            moment = R1 * x;
          } else if (x <= aEnd) {
            shear = R1 - intensity * (x - aStart);
            moment = R1 * x - intensity * (x - aStart) * (x - aStart) / 2;
          } else {
            shear = R1 - totalLoad;
            moment = R1 * x - totalLoad * (x - centroid);
          }
          deflection = (5 * intensity * Math.pow(L, 4)) / (384 * E * I) * (x / L) * (1 - x / L);
          break;
        }
        case 'trapezoidal': {
          const w1 = (loadConfig.startIntensity || loadConfig.intensity) * sign;
          const w2 = (loadConfig.endIntensity || loadConfig.intensity * 0.5) * sign;
          const w_x = w1 + (w2 - w1) * x / L;
          load = w_x;
          const totalLoad = (w1 + w2) * L / 2;
          const centroid = L * (w1 + 2 * w2) / (3 * (w1 + w2));
          const R1 = totalLoad * (L - centroid) / L;
          shear = R1 - w1 * x - (w2 - w1) * x * x / (2 * L);
          moment = R1 * x - w1 * x * x / 2 - (w2 - w1) * x * x * x / (6 * L);
          deflection = (totalLoad * x * (L - x) * (L + x)) / (24 * E * I * L);
          break;
        }
        case 'moment': {
          const a = position * L;
          const M0 = intensity;
          load = 0;
          const R1 = -M0 / L;
          shear = R1;
          if (x <= a) {
            moment = R1 * x;
          } else {
            moment = R1 * x + M0;
          }
          deflection = (M0 * x * (L - x)) / (3 * E * I * L);
          break;
        }
        case 'parabolic': {
          const w_x = 4 * intensity * x * (L - x) / (L * L);
          load = w_x;
          const totalLoad = (2 * intensity * L) / 3;
          const R1 = totalLoad / 2;
          shear = R1 - 4 * intensity * x * x / (2 * L) + 4 * intensity * x * x * x / (3 * L * L);
          moment = R1 * x - 4 * intensity * x * x * x / (6 * L) + 4 * intensity * x * x * x * x / (12 * L * L);
          deflection = (5 * intensity * Math.pow(L, 4)) / (768 * E * I) * 16 * (x / L) * (1 - x / L);
          break;
        }
        case 'udl':
        default: {
          const R = intensity * L / 2;
          load = intensity;
          shear = R - intensity * x;
          moment = R * x - (intensity * x * x) / 2;
          deflection = (intensity * x * (L * L * L - 2 * L * x * x + x * x * x)) / (24 * E * I);
          break;
        }
      }
    } else {
      // Cantilever (fixed at x=0)
      switch (type) {
        case 'concentrated': {
          const a = position * L;
          load = Math.abs(x - a) < L / numPoints ? intensity : 0;
          shear = x <= a ? 0 : -intensity;
          moment = x <= a ? 0 : -intensity * (x - a);
          if (x <= a) {
            deflection = (intensity * x * x * (3 * a - x)) / (6 * E * I);
          } else {
            deflection = (intensity * a * a * (3 * x - a)) / (6 * E * I);
          }
          break;
        }
        case 'triangular': {
          if (peakPosition === 0) {
            const w_x = intensity * (1 - x / L);
            load = w_x;
            shear = -(intensity * L / 2) + intensity * x - (intensity * x * x) / (2 * L);
            moment = -(intensity * L * L / 6) + (intensity * L / 2) * x - (intensity * x * x) / 2 + (intensity * x * x * x) / (6 * L);
          } else {
            const w_x = intensity * (x / L);
            load = w_x;
            shear = (intensity * x * x) / (2 * L) - (intensity * L) / 2;
            moment = -(intensity * x * x * x) / (6 * L) + (intensity * L * x) / 2 - (intensity * L * L) / 3;
          }
          deflection = (intensity * x * x * (20 * L * L - 10 * L * x + x * x)) / (120 * E * I * L);
          break;
        }
        case 'moving': {
          const a = movingStep * L;
          load = Math.abs(x - a) < L / numPoints ? intensity : 0;
          shear = x <= a ? 0 : -intensity;
          moment = x <= a ? 0 : -intensity * (x - a);
          if (x <= a) {
            deflection = (intensity * x * x * (3 * a - x)) / (6 * E * I);
          } else {
            deflection = (intensity * a * a * (3 * x - a)) / (6 * E * I);
          }
          break;
        }
        case 'partial-udl': {
          const aStart = (loadConfig.startPosition || 0) * L;
          const aEnd = (loadConfig.endPosition || 1) * L;
          if (x >= aStart && x <= aEnd) {
            load = intensity;
          }
          const loadLength = aEnd - aStart;
          if (x < aStart) {
            shear = 0;
            moment = 0;
          } else if (x <= aEnd) {
            shear = -intensity * (x - aStart);
            moment = -intensity * (x - aStart) * (x - aStart) / 2;
          } else {
            shear = -intensity * loadLength;
            moment = -intensity * loadLength * (x - aStart - loadLength / 2);
          }
          deflection = (intensity * Math.pow(L, 4)) / (8 * E * I) * Math.pow(x / L, 2);
          break;
        }
        case 'trapezoidal': {
          const w1 = loadConfig.startIntensity || intensity;
          const w2 = loadConfig.endIntensity || intensity * 0.5;
          const w_x = w1 + (w2 - w1) * x / L;
          load = w_x;
          const totalLoad = (w1 + w2) * L / 2;
          shear = -w1 * x - (w2 - w1) * x * x / (2 * L);
          moment = -w1 * x * x / 2 - (w2 - w1) * x * x * x / (6 * L);
          deflection = (totalLoad * x * x) / (6 * E * I);
          break;
        }
        case 'moment': {
          const a = position * L;
          const M0 = intensity;
          load = 0;
          shear = 0;
          moment = x >= a ? M0 : 0;
          deflection = x >= a ? (M0 * (x - a) * (x - a)) / (2 * E * I) : 0;
          break;
        }
        case 'parabolic': {
          const w_x = 4 * intensity * x * (L - x) / (L * L);
          load = w_x;
          shear = -4 * intensity * x * x / (2 * L) + 4 * intensity * x * x * x / (3 * L * L);
          moment = -4 * intensity * x * x * x / (6 * L) + 4 * intensity * x * x * x * x / (12 * L * L);
          deflection = (intensity * Math.pow(L, 4)) / (20 * E * I) * Math.pow(x / L, 2);
          break;
        }
        case 'udl':
        default: {
          load = intensity;
          shear = -intensity * (L - x);
          moment = -(intensity * Math.pow(L - x, 2)) / 2;
          deflection = (intensity * x * x * (6 * L * L - 4 * L * x + x * x)) / (24 * E * I);
          break;
        }
      }
    }

    const factors = diagramFactors[beamType] ?? { shear: 1, moment: 1, deflection: 1 };
    data.push({
      x,
      shear: (shear * factors.shear) / 1000,
      moment: (moment * factors.moment) / 1000,
      load: load / 1000,
      deflection: deflection * factors.deflection * 1000
    });
  }

  return data;
}

export function generateHybridDiagramData(
  beamType: BeamType,
  loads: LoadConfig[],
  beamLength: number,
  elasticModulus: number = 200e9,
  momentOfInertia: number = 1e-5,
  numPoints: number = 50
): DiagramPoint[] {
  if (loads.length === 0) {
    const data: DiagramPoint[] = [];
    for (let i = 0; i <= numPoints; i++) {
      data.push({ x: (i / numPoints) * beamLength, shear: 0, moment: 0, load: 0, deflection: 0 });
    }
    return data;
  }

  const loadDatas = loads.map(load =>
    generateDiagramData(beamType, load, beamLength, elasticModulus, momentOfInertia, numPoints)
  );

  const data: DiagramPoint[] = [];
  for (let i = 0; i <= numPoints; i++) {
    let shear = 0, moment = 0, load = 0, deflection = 0;

    for (const loadData of loadDatas) {
      shear += loadData[i].shear;
      moment += loadData[i].moment;
      load += loadData[i].load;
      deflection += loadData[i].deflection;
    }

    data.push({
      x: loadDatas[0][i].x,
      shear,
      moment,
      load,
      deflection
    });
  }

  return data;
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
  momentOfInertia: number = 1e-5
): InfluencePoint[] {
  const L = beamLength;
  const a = measurementPosition * L;
  const E = elasticModulus;
  const I = momentOfInertia;
  const data: InfluencePoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const xp = (i / numPoints) * L;
    let shearAt = 0;
    let momentAt = 0;
    let deflectionAt = 0;
    let reactionA = 0;
    let reactionB = 0;

    if (beamType === 'simply-supported') {
      reactionA = (L - xp) / L;
      reactionB = xp / L;

      if (xp <= a) {
        shearAt = -xp / L;
        momentAt = xp * (L - a) / L;
      } else {
        shearAt = (L - xp) / L;
        momentAt = a * (L - xp) / L;
      }

      if (xp <= a) {
        deflectionAt = (xp * (L - a) * (2 * L * a - a * a - xp * xp)) / (6 * E * I * L);
      } else {
        deflectionAt = (a * (L - xp) * (2 * L * xp - xp * xp - a * a)) / (6 * E * I * L);
      }
    } else if (beamType === 'cantilever') {
      reactionA = 1;
      reactionB = 0;

      if (xp <= a) {
        shearAt = 0;
        momentAt = 0;
        deflectionAt = (xp * xp * (3 * a - xp)) / (6 * E * I);
      } else {
        shearAt = -1;
        momentAt = -(xp - a);
        deflectionAt = (a * a * (3 * xp - a)) / (6 * E * I);
      }
    } else if (beamType === 'fixed-fixed') {
      const b = L - a;
      reactionA = 1 - (xp * xp * (3 * L - 2 * xp)) / (L * L * L);
      reactionB = (xp * xp * (3 * L - 2 * xp)) / (L * L * L);

      if (xp <= a) {
        shearAt = -xp * xp * (3 * a - 2 * xp) / (a * a * a) * reactionA;
        momentAt = xp * b * b / (L * L) * (L - 2 * xp + a * xp / L);
      } else {
        shearAt = reactionA;
        momentAt = a * (L - xp) * (L - xp) / (L * L) * (L - 2 * (L - xp) + b * (L - xp) / L);
      }

      deflectionAt = (xp * (L - xp)) / (6 * E * I * L) * (2 * xp * L - xp * xp - a * a) * 0.3;
    } else if (beamType === 'overhanging') {
      const supportPos = 0.75 * L;
      reactionA = xp <= supportPos ? (supportPos - xp) / supportPos : 0;
      reactionB = xp <= supportPos ? xp / supportPos : 1;

      if (a <= supportPos) {
        if (xp <= a) {
          shearAt = -xp / supportPos;
          momentAt = xp * (supportPos - a) / supportPos;
        } else if (xp <= supportPos) {
          shearAt = (supportPos - xp) / supportPos;
          momentAt = a * (supportPos - xp) / supportPos;
        } else {
          shearAt = 0;
          momentAt = 0;
        }
      } else {
        if (xp <= supportPos) {
          shearAt = 0;
          momentAt = -xp * (a - supportPos) / supportPos;
        } else {
          shearAt = xp <= a ? 0 : -1;
          momentAt = xp <= a ? 0 : -(xp - a);
        }
      }

      deflectionAt = Math.abs(momentAt) * L / (6 * E * I);
    } else {
      reactionA = (L - xp) / L;
      reactionB = xp / L;
      if (xp <= a) {
        shearAt = -xp / L;
        momentAt = xp * (L - a) / L;
      } else {
        shearAt = (L - xp) / L;
        momentAt = a * (L - xp) / L;
      }
      deflectionAt = Math.abs(momentAt) * L / (6 * E * I);
    }

    data.push({
      loadPosition: xp,
      shearAt,
      momentAt,
      deflectionAt: deflectionAt * 1000,
      reactionA,
      reactionB
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
  numPositions: number = 20
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

      const diagData = generateDiagramData(beamType, config, L, elasticModulus, momentOfInertia, numPoints);
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
