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

export interface CompositeSectionLayerInput {
  /** Material label shown in the analysis summary. */
  material: string;
  /** Elastic modulus in Pa. */
  elasticModulus: number;
  /** Tensile and compressive elastic stress limits in Pa for screening checks. */
  tensileStrength: number;
  compressiveStrength: number;
  /** Layer area in m². */
  area: number;
  /** Layer centroid from the bottom of the composite section in m. */
  centroidY: number;
  /** Centroidal second moment of area in m⁴. */
  momentOfInertia: number;
  /** Layer bottom and top elevations from the section bottom in m. */
  bottomY: number;
  topY: number;
}

export interface CompositeSectionLayerResult extends CompositeSectionLayerInput {
  /** Absolute stress at the layer top per unit absolute bending moment (1/m³). */
  topStressCoefficient: number;
  /** Absolute stress at the layer bottom per unit absolute bending moment (1/m³). */
  bottomStressCoefficient: number;
  /** Largest layer-fiber stress coefficient (1/m³). */
  maxStressCoefficient: number;
  /** Largest material utilization per unit absolute bending moment (1/(N·m)). */
  utilizationCoefficient: number;
  /** Largest material utilization per unit positive (sagging) moment. */
  positiveMomentUtilizationCoefficient: number;
  /** Largest material utilization per unit negative (hogging) moment. */
  negativeMomentUtilizationCoefficient: number;
}

export interface CompositeSectionProperties {
  area: number;
  elasticNeutralAxis: number;
  totalDepth: number;
  referenceElasticModulus: number;
  flexuralRigidity: number;
  transformedMomentOfInertia: number;
  effectiveSectionModulus: number;
  maxStressCoefficient: number;
  positiveMomentEquivalentStrength: number;
  negativeMomentEquivalentStrength: number;
  topMaterial: string;
  bottomMaterial: string;
  layers: CompositeSectionLayerResult[];
}

export interface LaminaMaterialProperties {
  /** Longitudinal modulus along the fibers, Pa. */
  E1: number;
  /** Transverse modulus in the ply plane, Pa. */
  E2: number;
  /** In-plane shear modulus, Pa. */
  G12: number;
  /** Major Poisson ratio nu12. */
  nu12: number;
  /** Longitudinal tensile/compressive allowables, Pa. */
  Xt: number;
  Xc: number;
  /** Transverse tensile/compressive allowables, Pa. */
  Yt: number;
  Yc: number;
  /** In-plane shear allowable, Pa. */
  S12: number;
}

export interface LaminatePlyInput {
  material: string;
  angleDegrees: number;
  thickness: number;
  properties: LaminaMaterialProperties;
}

export interface LaminatePlyStressCoefficients {
  sigma1: number;
  sigma2: number;
  tau12: number;
}

export interface LaminatePlyResult extends LaminatePlyInput {
  zBottom: number;
  zTop: number;
  bottomStressPerMoment: LaminatePlyStressCoefficients;
  topStressPerMoment: LaminatePlyStressCoefficients;
}

export interface LaminateSectionProperties {
  width: number;
  totalThickness: number;
  area: number;
  extensionalStiffness: number[][];
  couplingStiffness: number[][];
  bendingStiffness: number[][];
  flexuralRigidity: number;
  flexuralRigidityPerWidth: number;
  effectiveSectionModulus: number;
  maxStressCoefficient: number;
  positiveMomentUtilizationCoefficient: number;
  negativeMomentUtilizationCoefficient: number;
  positiveMomentResistance: number;
  negativeMomentResistance: number;
  positiveMomentEquivalentStrength: number;
  negativeMomentEquivalentStrength: number;
  unitMomentMidplaneStrain: [number, number, number];
  unitMomentCurvature: [number, number, number];
  plies: LaminatePlyResult[];
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
  /** Add samples immediately before and after point, support, and load events. */
  includeEventSamples?: boolean;
  /** Add interior V=0, q=0, and deflection-slope roots to the plotted data. */
  includeExtremaSamples?: boolean;
  /** Number of finite elements across the beam. */
  elementCount?: number;
  /** Unrestrained internal moment releases, expressed as fractions of beam length. */
  internalHinges?: number[];
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

/**
 * Calculate an elastic, fully bonded composite section using the E-weighted
 * neutral axis and the parallel-axis theorem. The returned transformed I is
 * referenced to `referenceElasticModulus`, so E_ref * I_transformed equals the
 * composite flexural rigidity used by the beam finite-element solver.
 *
 * Tensile/compressive strengths are treated as elastic stress limits for
 * screening only; this does not represent concrete cracking, plastic
 * resistance, or a design-code composite-beam strength check.
 */
export function calculateCompositeSectionProperties(
  layers: CompositeSectionLayerInput[],
  referenceElasticModulus: number,
): CompositeSectionProperties {
  if (layers.length === 0 || !Number.isFinite(referenceElasticModulus) || referenceElasticModulus <= 0) {
    throw new Error("A composite section needs at least one layer and a positive reference elastic modulus.");
  }
  for (const layer of layers) {
    if (
      !Number.isFinite(layer.elasticModulus) || layer.elasticModulus <= 0 ||
      !Number.isFinite(layer.tensileStrength) || layer.tensileStrength <= 0 ||
      !Number.isFinite(layer.compressiveStrength) || layer.compressiveStrength <= 0 ||
      !Number.isFinite(layer.area) || layer.area <= 0 ||
      !Number.isFinite(layer.centroidY) ||
      !Number.isFinite(layer.momentOfInertia) || layer.momentOfInertia < 0 ||
      !Number.isFinite(layer.bottomY) || !Number.isFinite(layer.topY) || layer.bottomY > layer.topY
    ) {
      throw new Error(`Composite layer "${layer.material}" has invalid material or section properties.`);
    }
  }

  const elasticArea = layers.reduce((sum, layer) => sum + layer.elasticModulus * layer.area, 0);
  const elasticNeutralAxis = layers.reduce(
    (sum, layer) => sum + layer.elasticModulus * layer.area * layer.centroidY,
    0,
  ) / elasticArea;
  const flexuralRigidity = layers.reduce((sum, layer) =>
    sum + layer.elasticModulus * (
      layer.momentOfInertia + layer.area * Math.pow(layer.centroidY - elasticNeutralAxis, 2)
    ), 0);
  const totalDepth = Math.max(...layers.map((layer) => layer.topY));
  const minElevation = Math.min(...layers.map((layer) => layer.bottomY));
  const compositeArea = layers.reduce((sum, layer) => sum + layer.area, 0);

  const layerResults = layers.map((layer): CompositeSectionLayerResult => {
    const topStressCoefficient = layer.elasticModulus * Math.abs(layer.topY - elasticNeutralAxis) / flexuralRigidity;
    const bottomStressCoefficient = layer.elasticModulus * Math.abs(layer.bottomY - elasticNeutralAxis) / flexuralRigidity;
    const maxStressCoefficient = Math.max(topStressCoefficient, bottomStressCoefficient);
    const limitForFiber = (y: number, momentSign: 1 | -1) => {
      const isAboveNeutralAxis = y > elasticNeutralAxis;
      const isCompression = momentSign > 0 ? isAboveNeutralAxis : !isAboveNeutralAxis;
      return isCompression ? layer.compressiveStrength : layer.tensileStrength;
    };
    const positiveMomentUtilizationCoefficient = Math.max(
      topStressCoefficient / limitForFiber(layer.topY, 1),
      bottomStressCoefficient / limitForFiber(layer.bottomY, 1),
    );
    const negativeMomentUtilizationCoefficient = Math.max(
      topStressCoefficient / limitForFiber(layer.topY, -1),
      bottomStressCoefficient / limitForFiber(layer.bottomY, -1),
    );
    return {
      ...layer,
      topStressCoefficient,
      bottomStressCoefficient,
      maxStressCoefficient,
      utilizationCoefficient: Math.max(positiveMomentUtilizationCoefficient, negativeMomentUtilizationCoefficient),
      positiveMomentUtilizationCoefficient,
      negativeMomentUtilizationCoefficient,
    };
  });
  const maxStressCoefficient = Math.max(...layerResults.map((layer) => layer.maxStressCoefficient));
  const positiveMomentUtilizationCoefficient = Math.max(...layerResults.map((layer) => layer.positiveMomentUtilizationCoefficient));
  const negativeMomentUtilizationCoefficient = Math.max(...layerResults.map((layer) => layer.negativeMomentUtilizationCoefficient));
  const topLayer = layerResults.reduce((highest, layer) => layer.topY > highest.topY ? layer : highest);
  const bottomLayer = layerResults.reduce((lowest, layer) => layer.bottomY < lowest.bottomY ? layer : lowest);

  return {
    area: compositeArea,
    elasticNeutralAxis,
    totalDepth: totalDepth - minElevation,
    referenceElasticModulus,
    flexuralRigidity,
    transformedMomentOfInertia: flexuralRigidity / referenceElasticModulus,
    effectiveSectionModulus: 1 / maxStressCoefficient,
    maxStressCoefficient,
    positiveMomentEquivalentStrength: maxStressCoefficient / positiveMomentUtilizationCoefficient,
    negativeMomentEquivalentStrength: maxStressCoefficient / negativeMomentUtilizationCoefficient,
    topMaterial: topLayer.material,
    bottomMaterial: bottomLayer.material,
    layers: layerResults,
  };
}

/**
 * Build the Classical Lamination Theory ABD matrices and reduce a laminate
 * beam to the equivalent EI needed by the existing one-dimensional beam
 * solver. Ply angles are measured from the beam axis to the material 1-axis;
 * plies are listed from the bottom surface to the top surface.
 *
 * The beam bending case has no membrane resultants and applies only Mx. The
 * full 6x6 ABD system is solved, so unsymmetric coupling and free transverse
 * and twisting curvatures affect both EI and each ply's stress state.
 */
export function calculateLaminateBeamProperties(
  width: number,
  plies: LaminatePlyInput[],
): LaminateSectionProperties {
  if (!Number.isFinite(width) || width <= 0 || plies.length === 0) {
    throw new Error("A laminate beam needs a positive width and at least one ply.");
  }

  for (const ply of plies) {
    const p = ply.properties;
    if (
      !Number.isFinite(ply.angleDegrees) || !Number.isFinite(ply.thickness) || ply.thickness <= 0 ||
      ![p.E1, p.E2, p.G12, p.Xt, p.Xc, p.Yt, p.Yc, p.S12].every((value) => Number.isFinite(value) && value > 0) ||
      !Number.isFinite(p.nu12)
    ) {
      throw new Error(`Laminate ply at ${ply.angleDegrees}° has invalid geometry or material properties.`);
    }
  }

  const totalThickness = plies.reduce((sum, ply) => sum + ply.thickness, 0);
  const A = Array.from({ length: 3 }, () => [0, 0, 0]);
  const B = Array.from({ length: 3 }, () => [0, 0, 0]);
  const D = Array.from({ length: 3 }, () => [0, 0, 0]);
  const layerGeometry: { ply: LaminatePlyInput; zBottom: number; zTop: number; qBar: number[][] }[] = [];
  let zBottom = -totalThickness / 2;

  for (const ply of plies) {
    const zTop = zBottom + ply.thickness;
    const qBar = transformedReducedStiffness(ply.properties, ply.angleDegrees);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        A[i][j] += qBar[i][j] * (zTop - zBottom);
        B[i][j] += 0.5 * qBar[i][j] * (zTop * zTop - zBottom * zBottom);
        D[i][j] += (qBar[i][j] / 3) * (zTop ** 3 - zBottom ** 3);
      }
    }
    layerGeometry.push({ ply, zBottom, zTop, qBar });
    zBottom = zTop;
  }

  const abd = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => {
    if (i < 3 && j < 3) return A[i][j];
    if (i < 3 && j >= 3) return B[i][j - 3];
    if (i >= 3 && j < 3) return B[i - 3][j];
    return D[i - 3][j - 3];
  }));

  // Normalize curvature coordinates by the laminate thickness before solving.
  // This keeps the extensional and flexural blocks on similar numeric scales.
  const coordinateScale = [1, 1, 1, 1 / totalThickness, 1 / totalThickness, 1 / totalThickness];
  const normalizedAbd = abd.map((row, i) => Float64Array.from(
    row.map((value, j) => value * coordinateScale[i] * coordinateScale[j]),
  ));
  // CLT takes z positive from bottom to top and uses Mx = integral(sigma_x*z).
  // The beam solver calls positive sagging moment top compression, so its M is
  // mapped to a negative CLT moment resultant.
  const normalizedLoad = Float64Array.from([0, 0, 0, -1 / (width * totalThickness), 0, 0]);
  const normalizedResponse = solveDenseSystem(normalizedAbd, normalizedLoad);
  if (!normalizedResponse) {
    throw new Error("The laminate ABD matrix is singular. Check the ply material values and stack.");
  }
  const response = Float64Array.from(normalizedResponse.map((value, i) => value * coordinateScale[i]));
  const unitMomentMidplaneStrain: [number, number, number] = [response[0], response[1], response[2]];
  const unitMomentCurvature: [number, number, number] = [response[3], response[4], response[5]];
  const curvaturePerMoment = Math.abs(unitMomentCurvature[0]);
  if (!Number.isFinite(curvaturePerMoment) || curvaturePerMoment <= 0) {
    throw new Error("The laminate has no finite positive beam-axis bending compliance.");
  }

  const plyResults: LaminatePlyResult[] = layerGeometry.map(({ ply, zBottom: bottom, zTop: top, qBar }) => {
    const stressAt = (z: number): LaminatePlyStressCoefficients => {
      const globalStrain = [
        unitMomentMidplaneStrain[0] + z * unitMomentCurvature[0],
        unitMomentMidplaneStrain[1] + z * unitMomentCurvature[1],
        unitMomentMidplaneStrain[2] + z * unitMomentCurvature[2],
      ];
      const globalStress = qBar.map((row) => row.reduce((sum, value, index) => sum + value * globalStrain[index], 0));
      const theta = ply.angleDegrees * Math.PI / 180;
      const m = Math.cos(theta);
      const n = Math.sin(theta);
      return {
        sigma1: m * m * globalStress[0] + n * n * globalStress[1] + 2 * m * n * globalStress[2],
        sigma2: n * n * globalStress[0] + m * m * globalStress[1] - 2 * m * n * globalStress[2],
        tau12: -m * n * globalStress[0] + m * n * globalStress[1] + (m * m - n * n) * globalStress[2],
      };
    };
    return {
      ...ply,
      zBottom: bottom,
      zTop: top,
      bottomStressPerMoment: stressAt(bottom),
      topStressPerMoment: stressAt(top),
    };
  });

  const plyStressCoefficients = plyResults.flatMap((ply) => [
    { stress: ply.bottomStressPerMoment, properties: ply.properties },
    { stress: ply.topStressPerMoment, properties: ply.properties },
  ]);
  const stressCoefficients = plyStressCoefficients.map(({ stress }) => stress);
  const maxStressCoefficient = Math.max(...stressCoefficients.flatMap((stress) => [
    Math.abs(stress.sigma1), Math.abs(stress.sigma2), Math.abs(stress.tau12),
  ]));
  const utilizationForStress = (stress: LaminatePlyStressCoefficients, properties: LaminaMaterialProperties) => {
    const { Xt, Xc, Yt, Yc, S12 } = properties;
    return Math.max(
      Math.abs(stress.sigma1) / (stress.sigma1 >= 0 ? Xt : Xc),
      Math.abs(stress.sigma2) / (stress.sigma2 >= 0 ? Yt : Yc),
      Math.abs(stress.tau12) / S12,
    );
  };
  const positiveMomentUtilizationCoefficient = Math.max(...plyStressCoefficients.map(({ stress, properties }) => utilizationForStress(stress, properties)));
  const negativeMomentUtilizationCoefficient = Math.max(...plyStressCoefficients.map(({ stress, properties }) => utilizationForStress({
    sigma1: -stress.sigma1, sigma2: -stress.sigma2, tau12: -stress.tau12,
  }, properties)));
  const effectiveSectionModulus = 1 / maxStressCoefficient;
  const positiveMomentResistance = 1 / positiveMomentUtilizationCoefficient;
  const negativeMomentResistance = 1 / negativeMomentUtilizationCoefficient;
  const flexuralRigidity = 1 / curvaturePerMoment;

  return {
    width,
    totalThickness,
    area: width * totalThickness,
    extensionalStiffness: A,
    couplingStiffness: B,
    bendingStiffness: D,
    flexuralRigidity,
    flexuralRigidityPerWidth: flexuralRigidity / width,
    effectiveSectionModulus,
    maxStressCoefficient,
    positiveMomentUtilizationCoefficient,
    negativeMomentUtilizationCoefficient,
    positiveMomentResistance,
    negativeMomentResistance,
    positiveMomentEquivalentStrength: maxStressCoefficient / positiveMomentUtilizationCoefficient,
    negativeMomentEquivalentStrength: maxStressCoefficient / negativeMomentUtilizationCoefficient,
    unitMomentMidplaneStrain,
    unitMomentCurvature,
    plies: plyResults,
  };
}

function transformedReducedStiffness(properties: LaminaMaterialProperties, angleDegrees: number): number[][] {
  const { E1, E2, G12, nu12 } = properties;
  const nu21 = nu12 * E2 / E1;
  const denominator = 1 - nu12 * nu21;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new Error("The lamina elastic constants violate plane-stress stability (1 - nu12*nu21 must be positive).");
  }
  const Q11 = E1 / denominator;
  const Q22 = E2 / denominator;
  const Q12 = nu12 * E2 / denominator;
  const Q66 = G12;
  const theta = angleDegrees * Math.PI / 180;
  const m = Math.cos(theta);
  const n = Math.sin(theta);
  const m2 = m * m;
  const n2 = n * n;
  const m4 = m2 * m2;
  const n4 = n2 * n2;
  const m2n2 = m2 * n2;
  const q11 = Q11 * m4 + 2 * (Q12 + 2 * Q66) * m2n2 + Q22 * n4;
  const q22 = Q11 * n4 + 2 * (Q12 + 2 * Q66) * m2n2 + Q22 * m4;
  const q12 = (Q11 + Q22 - 4 * Q66) * m2n2 + Q12 * (m4 + n4);
  const q16 = (Q11 - Q12 - 2 * Q66) * m * m2 * n - (Q22 - Q12 - 2 * Q66) * m * n * n2;
  const q26 = (Q11 - Q12 - 2 * Q66) * m * n * n2 - (Q22 - Q12 - 2 * Q66) * m * m2 * n;
  const q66 = (Q11 + Q22 - 2 * Q12 - 2 * Q66) * m2n2 + Q66 * (m4 + n4);
  return [
    [q11, q12, q16],
    [q12, q22, q26],
    [q16, q26, q66],
  ];
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
    case 'gerber': return [{ position: 0, type: 'fixed' }, { position: 1, type: 'roller' }];
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

function hasStableSupportLayout(supports: BeamSupportCondition[], internalHinges: number[] = []): boolean {
  const active = supports.filter((support) => support.type !== 'none' && Number.isFinite(support.position));
  const normalizePosition = (position: number) => Math.min(1, Math.max(0, position)).toFixed(9);
  const verticalPositions = new Set(active.map((support) => normalizePosition(support.position)));
  const fixedPositions = new Set(active.filter((support) => support.type === 'fixed').map((support) => normalizePosition(support.position)));
  const hingePositions = new Set([
    ...active.filter((support) => support.type === 'hinge').map((support) => support.position),
    ...internalHinges,
  ]
    .filter((position) => position > 1e-9 && position < 1 - 1e-9)
    .map(normalizePosition));

  // A vertical restraint removes one rigid-body DOF and each fixed end adds
  // rotational restraint. Every ungrounded release adds one mechanism DOF,
  // so the layout needs that many independent restraints to remain stable.
  for (const fixedPosition of fixedPositions) hingePositions.delete(fixedPosition);
  return verticalPositions.size + fixedPositions.size >= 2 + hingePositions.size;
}

function stableFallbackSupports(beamType: BeamType, internalHinges: number[]): BeamSupportCondition[] {
  const defaults = defaultBeamSupports(beamType);
  if (hasStableSupportLayout(defaults, internalHinges)) return defaults;

  const fallback: BeamSupportCondition[] = [{ position: 0, type: 'fixed' }, { position: 1, type: 'roller' }];
  if (hasStableSupportLayout(fallback, internalHinges)) return fallback;

  for (let step = 1; step < 100; step++) {
    const position = step / 100;
    if (fallback.some((support) => Math.abs(support.position - position) < 1e-9)
      || internalHinges.some((hinge) => Math.abs(hinge - position) < 1e-9)) continue;
    fallback.push({ position, type: 'roller' });
    if (hasStableSupportLayout(fallback, internalHinges)) return fallback;
  }

  throw new Error('Beam support configuration is unstable with the selected internal releases.');
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
      // The endpoint values define the load shape; the main intensity input
      // still controls its overall sign, just as it does for other load types.
      const direction = sign * Math.sign(load.intensity);
      const defaultMagnitude = Math.abs(load.intensity);
      const intercept = load.intercept ?? defaultMagnitude;
      const startShape = load.type === 'trapezoidal'
        ? (load.startIntensity ?? defaultMagnitude)
        : (load.startIntensity ?? intercept);
      const endShape = load.type === 'trapezoidal'
        ? (load.endIntensity ?? defaultMagnitude * 0.5)
        : (load.endIntensity ?? ((load.slope ?? 0) * beamLength + intercept));
      const startIntensity = startShape * direction;
      const endIntensity = endShape * direction;
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

/** Effective vertical load direction for diagrams (positive means downward). */
export function getLoadDirectionSign(load: LoadConfig, beamLength = 1, positionRatio = 0.5): number {
  const inversion = load.inverted ? -1 : 1;
  const inputSign = Math.sign(load.intensity);
  if (inputSign === 0) return 0;

  let representedIntensity = load.intensity;
  if (load.type === 'prestress') {
    // Prestress is modeled as an equivalent uplift load.
    representedIntensity = -load.intensity;
  } else if (load.type === 'trapezoidal' || load.type === 'parametric') {
    const defaultMagnitude = Math.abs(load.intensity);
    const intercept = load.intercept ?? defaultMagnitude;
    const startIntensity = load.type === 'trapezoidal'
      ? (load.startIntensity ?? defaultMagnitude)
      : (load.startIntensity ?? intercept);
    const endIntensity = load.type === 'trapezoidal'
      ? (load.endIntensity ?? defaultMagnitude * 0.5)
      : (load.endIntensity ?? ((load.slope ?? 0) * beamLength + intercept));
    representedIntensity = startIntensity + (endIntensity - startIntensity) * positionRatio;
  }

  if ((load.type === 'concentrated' || load.type === 'moving') && load.forceAngle) {
    representedIntensity *= Math.cos(load.forceAngle * Math.PI / 180);
  }

  // Trapezoidal and parametric endpoints carry the load shape while the main
  // intensity input supplies their shared direction sign.
  const direction = load.type === 'trapezoidal' || load.type === 'parametric'
    ? Math.sign(representedIntensity) * inputSign * inversion
    : Math.sign(representedIntensity) * inversion;
  return direction;
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
  // Preserve thin laminate section stiffness. A 1e-12 m⁴ floor overwhelms
  // valid small composite sections (for example, a 10 mm wide 20 μm ply has
  // I ≈ 7e-18 m⁴) and makes the beam appear hundreds of times too stiff.
  const I = Math.max(momentOfInertia, 1e-30);
  const meshCount = Math.max(12, Math.min(160, Math.floor(options.elementCount ?? 80)));
  const internalHingeFractions = (options.internalHinges ?? (beamType === 'gerber' ? [0.5] : []))
    .filter(Number.isFinite)
    .map((position) => Math.min(1, Math.max(0, position)));
  const requestedSupportConditions = supports ?? defaultBeamSupports(beamType);
  const supportFallback = (supports !== undefined && supports.length === 0)
    || !hasStableSupportLayout(requestedSupportConditions, internalHingeFractions);
  const supportConditions = supportFallback
    ? stableFallbackSupports(beamType, internalHingeFractions)
    : normalizedBeamSupports(beamType, supports, L);
  const internalHingePositions = internalHingeFractions.map((position) => position * L);
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
    ...internalHingePositions,
    ...pointForces.map((load) => load.position),
    ...pointMoments.map((load) => load.position),
  ];
  const distributedLoadBoundaries = distributedLoads
    .flatMap((load) => distributedLoadBounds(load, L))
    .filter(Number.isFinite)
    .map((x) => Math.min(L, Math.max(0, x)));
  const tolerance = L * 1e-10;
  const coordinates = [...Array.from({ length: meshCount + 1 }, (_, index) => (index / meshCount) * L), 0, L, ...events, ...distributedLoadBoundaries]
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

  const internalHingeNodes = new Set(internalHingePositions.map(positionToNode));
  for (const [node, type] of supportAtNode) {
    if (type === 'hinge') internalHingeNodes.add(node);
    if (type === 'fixed') internalHingeNodes.delete(node);
  }

  const leftRotation = Array.from({ length: nodeCount }, (_, node) => node * 2 + 1);
  const rightRotation = [...leftRotation];
  let degreeCount = nodeCount * 2;
  for (const node of internalHingeNodes) {
    if (node > 0 && node < nodeCount - 1) rightRotation[node] = degreeCount++;
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

    const integrationBounds = [
      x1,
      ...distributedLoadBoundaries.filter((boundary) => boundary > x1 && boundary < x2),
      x2,
    ];
    for (let segment = 0; segment < integrationBounds.length - 1; segment++) {
      const segmentStart = integrationBounds[segment];
      const segmentEnd = integrationBounds[segment + 1];
      const midpoint = (segmentStart + segmentEnd) / 2;
      const halfLength = (segmentEnd - segmentStart) / 2;
      for (let gauss = 0; gauss < gaussNodes.length; gauss++) {
        const x = midpoint + halfLength * gaussNodes[gauss];
        const xi = (x - x1) / length;
        const qUp = -distributedLoads.reduce((sum, load) => sum + distributedIntensityAt(load, x, L), 0);
        const n1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
        const n2 = length * (xi - 2 * xi * xi + xi * xi * xi);
        const n3 = 3 * xi * xi - 2 * xi * xi * xi;
        const n4 = length * (-xi * xi + xi * xi * xi);
        const shapes = [n1, n2, n3, n4];
        for (let row = 0; row < 4; row++) force[dofs[row]] += qUp * shapes[row] * gaussWeights[gauss] * halfLength;
      }
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
    const fallbackSupports = stableFallbackSupports(beamType, internalHingeFractions);
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

  const rawSupportReactions = [...supportAtNode.entries()].map(([node, type]) => ({
    position: coordinates[node],
    vertical: residual[node * 2],
    // A fixed support has one shared rotational DOF. Summing left and right
    // entries doubled its reaction moment because both indices reference it.
    moment: type === 'fixed' ? residual[leftRotation[node]] : 0,
  }));

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

  // The finite-element solve determines compatibility reactions. Project its
  // global force and moment residual onto the support reactions so diagrams
  // close at supports and free ends even for very flexible or thin sections.
  // The minimum-norm correction preserves the stiffness solution's reaction
  // sharing for indeterminate layouts while enforcing the equilibrium sums.
  const fixedSupportNodes = new Set([...supportAtNode.entries()].filter(([, type]) => type === 'fixed').map(([node]) => node));
  const fixedMomentCount = fixedSupportNodes.size;
  const normalizedPositions = rawSupportReactions.map((reaction) => reaction.position / L);
  const sumPosition = normalizedPositions.reduce((sum, position) => sum + position, 0);
  const sumPositionSquared = normalizedPositions.reduce((sum, position) => sum + position * position, 0);
  const a00 = rawSupportReactions.length;
  const a01 = sumPosition;
  const a11 = sumPositionSquared + fixedMomentCount;
  const determinant = a00 * a11 - a01 * a01;
  const verticalResidual = totalLoad - rawSupportReactions.reduce((sum, reaction) => sum + reaction.vertical, 0);
  const targetReactionMoment = firstMoment - pointMoments.reduce((sum, point) => sum + point.moment, 0);
  const currentReactionMoment = rawSupportReactions.reduce((sum, reaction) =>
    sum + reaction.vertical * reaction.position + reaction.moment, 0);
  const normalizedMomentResidual = (targetReactionMoment - currentReactionMoment) / L;
  const lambda0 = determinant > 1e-14 ? (verticalResidual * a11 - normalizedMomentResidual * a01) / determinant : 0;
  const lambda1 = determinant > 1e-14 ? (normalizedMomentResidual * a00 - verticalResidual * a01) / determinant : 0;
  const supportReactions = rawSupportReactions.map((reaction, index) => {
    const node = positionToNode(reaction.position);
    return {
      ...reaction,
      vertical: reaction.vertical + lambda0 + normalizedPositions[index] * lambda1,
      moment: fixedSupportNodes.has(node) ? reaction.moment + L * lambda1 : reaction.moment,
    };
  });

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
  const epsilon = Math.max(L * 1e-7, 1e-9);
  const physicalBreakpoints = [...new Set([
    0,
    L,
    ...supportConditions.map((support) => support.position * L),
    ...internalHingePositions,
    ...pointForces.map((point) => point.position),
    ...pointMoments.map((point) => point.position),
    ...distributedLoadBoundaries,
  ].map((x) => Math.min(L, Math.max(0, x))).sort((a, b) => a - b))];
  const eventPositions = physicalBreakpoints;
  const chartEventPositions = options.includeEventSamples ? [
      ...supportConditions.map((support) => support.position * L),
      ...internalHingePositions,
      ...pointForces.map((point) => point.position),
      ...pointMoments.map((point) => point.position),
      ...distributedLoadBoundaries,
    ] : [];
  const findRoots = (valueAt: (x: number) => number, intervals: number[], subdivisions = 16): number[] => {
    const roots: number[] = [];
    const rootTolerance = Math.max(L * 1e-12, 1e-14);
    const endpointInset = Math.max(tolerance * 4, 1e-14);
    for (let interval = 0; interval < intervals.length - 1; interval++) {
      const start = intervals[interval];
      const end = intervals[interval + 1];
      if (end - start <= endpointInset * 2) continue;
      const interiorStart = start + endpointInset;
      const interiorEnd = end - endpointInset;
      const samples = Array.from({ length: subdivisions + 1 }, (_, sample) => {
        const x = interiorStart + (interiorEnd - interiorStart) * sample / subdivisions;
        return { x, value: valueAt(x) };
      });
      if (samples.every((sample) => sample.value === 0)) continue;
      let previousX = samples[0].x;
      let previousValue = samples[0].value;
      for (let sample = 1; sample < samples.length; sample++) {
        const currentX = samples[sample].x;
        const currentValue = samples[sample].value;
        if (previousValue === 0) roots.push(previousX);
        if ((previousValue < 0 && currentValue > 0) || (previousValue > 0 && currentValue < 0)) {
          let low = previousX;
          let high = currentX;
          let lowValue = previousValue;
          for (let iteration = 0; iteration < 64; iteration++) {
            const middle = (low + high) / 2;
            const middleValue = valueAt(middle);
            if (middleValue === 0 || high - low <= rootTolerance) {
              low = middle;
              high = middle;
              break;
            }
            if ((lowValue < 0 && middleValue > 0) || (lowValue > 0 && middleValue < 0)) high = middle;
            else {
              low = middle;
              lowValue = middleValue;
            }
          }
          roots.push((low + high) / 2);
        }
        previousX = currentX;
        previousValue = currentValue;
      }
      if (previousValue === 0) roots.push(previousX);
    }
    return roots.filter((root, index) => index === 0 || Math.abs(root - roots[index - 1]) > rootTolerance);
  };
  const distributedLoadAt = (x: number) => distributedLoads.reduce((sum, load) => sum + distributedIntensityAt(load, x, L), 0);
  const shearRoots = findRoots((x) => evaluateAt(x).shear, physicalBreakpoints, 32);
  const distributedLoadRoots = findRoots(distributedLoadAt, physicalBreakpoints, 32);
  const deflectionSlopeAt = (rawX: number): number => {
    const x = Math.min(L, Math.max(0, rawX));
    const element = elementForX(x);
    const x1 = coordinates[element];
    const length = coordinates[element + 1] - x1;
    const xi = Math.min(1, Math.max(0, (x - x1) / length));
    const dofs = elementDofs[element];
    const dn1 = -6 * xi + 6 * xi * xi;
    const dn2 = length * (1 - 4 * xi + 3 * xi * xi);
    const dn3 = 6 * xi - 6 * xi * xi;
    const dn4 = length * (-2 * xi + 3 * xi * xi);
    return -(dn1 * displacement[dofs[0]] + dn2 * displacement[dofs[1]] + dn3 * displacement[dofs[2]] + dn4 * displacement[dofs[3]]) / length;
  };
  const deflectionRoots = findRoots(deflectionSlopeAt, coordinates, 8);
  const extremaXs = [
    ...eventPositions,
    ...eventPositions.flatMap((position) => [position - epsilon, position + epsilon]),
    ...distributedLoadBoundaries,
    ...shearRoots,
    ...distributedLoadRoots,
    ...deflectionRoots,
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

  const chartXs = [
    ...Array.from({ length: numPoints + 1 }, (_, index) => (index / numPoints) * L),
    ...chartEventPositions.flatMap((position) => [position - epsilon, position, position + epsilon]),
    ...(options.includeExtremaSamples ? [...shearRoots, ...distributedLoadRoots, ...deflectionRoots] : []),
    ...(options.extraSamplePositions ?? []).filter((position) => Number.isFinite(position) && position >= 0 && position <= L),
  ].map((x) => Math.min(L, Math.max(0, x))).sort((a, b) => a - b)
    .filter((x, index, values) => index === 0 || Math.abs(x - values[index - 1]) > tolerance);
  const diagramData = chartXs.map((x) => {
    const point = evaluateAt(x);
    return { x: point.x, shear: point.shear / 1000, moment: point.moment / 1000, load: point.load / 1000, deflection: point.deflection * 1000 };
  });

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
      const pos = (loadConfig.movingStep ?? 0.5) * L;
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
      const a = (loadConfig.startPosition ?? 0.25) * L;
      const b = (loadConfig.endPosition ?? 0.75) * L;
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
      const pos = (loadConfig.movingStep ?? 1) * L;
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
      const b = (loadConfig.endPosition ?? 1) * L;
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
      const a = (loadConfig.position ?? 0.5) * L;
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
    elementCount: 80,
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
  baseLoads: LoadConfig[] = [],
  movingLoads: LoadConfig[] = [],
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
      const sweptLoads = movingLoads.length > 0
        ? movingLoads.map((load) => ({ ...load, type: 'moving' as const, movingStep: loadPos }))
        : [{ type: 'moving' as const, intensity: loadIntensity, movingStep: loadPos }];
      const diagData = generateHybridDiagramData(
        beamType,
        [...baseLoads, ...sweptLoads],
        L,
        elasticModulus,
        momentOfInertia,
        numPoints,
        supports,
      );
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
