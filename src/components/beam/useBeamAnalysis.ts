/**
 * useBeamAnalysis — custom hook encapsulating all state, domain computations,
 * unit conversions, and export utilities for the Static Beam Analysis module.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  reliabilityAnalysis, solveBeamResponse,
  generateInfluenceLineData, generateEnvelopeData,
  calculateCrossSectionProperties, calculateCompositeSectionProperties,
  calculateLaminateBeamProperties,
  type BeamAnalysis, type LoadConfig, type LoadType, type BeamType,
  type CrossSectionType, type CrossSectionDimensions, type CrossSectionProperties,
  type CompositeSectionProperties, type LaminaMaterialProperties, type LaminateSectionProperties,
} from "@/lib/reliability";
import { ReportSection } from "@/lib/exportUtils";
import { validateBeamAnalysis } from "@/lib/beamValidation";
import { useSharedParameters } from "@/contexts/SharedParametersContext";
import {
  type UnitSystem, type ForceUnit, type DistributedForceUnit, type LengthUnit,
  type Support,
  forceConversions, distributedForceConversions, lengthConversions,
  isDistributedLoad, getLoadTypeLabel, getBeamTypeLabel, getCrossSectionLabel,
  loadColors,
} from "./beamTypes";

function resolveAnalysisBeamType(beamType: BeamType): BeamType {
  // The finite-element solver uses the selected support layout directly.
  return beamType;
}

function resolveAnalysisLoadConfig(load: LoadConfig, beamLength: number): LoadConfig {
  const pointAt = load.position ?? 0.5;
  const partial = {
    startPosition: load.startPosition ?? 0.25,
    endPosition: load.endPosition ?? 0.75,
  };
  const map: Partial<Record<LoadType, LoadConfig>> = {
    "axle-train": { ...load, type: "moving", intensity: load.intensity * 1.75, movingStep: load.movingStep ?? pointAt },
    "support-settlement": { ...load, type: "moment", intensity: load.intensity * beamLength * 0.08, position: load.position ?? 1 },
    "thermal-gradient": { ...load, type: "moment", intensity: load.intensity * beamLength * 0.06, position: load.position ?? 0.5 },
    prestress: { ...load, type: "partial-udl", intensity: -Math.abs(load.intensity) * 0.65, ...partial },
    patch: { ...load, type: "partial-udl", ...partial },
    torsional: { ...load, type: "concentrated", intensity: load.intensity * 1.15, position: pointAt },
    "snow-drift": { ...load, type: "triangular", peakPosition: load.peakPosition ?? 1 },
    hydrostatic: { ...load, type: "triangular", peakPosition: load.peakPosition ?? 1 },
    "construction-stage": { ...load, type: "udl", intensity: load.intensity * 1.25 },
    "harmonic-equivalent": { ...load, type: "concentrated", intensity: load.intensity * 1.4, position: pointAt },
    parametric: {
      ...load,
      type: "trapezoidal",
      startIntensity: load.startIntensity ?? load.intercept ?? load.intensity,
      endIntensity: load.endIntensity ?? ((load.slope ?? 0) * beamLength + (load.intercept ?? load.intensity)),
    },
  };
  return map[load.type] ?? load;
}

export function useBeamAnalysis() {
  const ctx = useSharedParameters();
  const {
    isSynced,
    setActiveStressMean,
    setActiveStressCoV,
    setResistanceMean: setSharedResistanceMean,
    setResistanceCoV: setSharedResistanceCoV,
    setBeamLength: setSharedBeamLength,
  } = ctx;

  // ─── Core state ─────────────────────────────────────────────
  const [beamType, setBeamType] = useState<BeamType>("simply-supported");
  const [loadType, setLoadType] = useState<LoadType>("udl");
  const [loadMode, setLoadMode] = useState<"single" | "hybrid">("single");
  const [hybridLoads, setHybridLoads] = useState<LoadConfig[]>([]);
  const [loadIntensity, setLoadIntensity] = useState(5000);
  const [beamLength, setBeamLength] = useState(6);
  const [yieldStrength, setYieldStrength] = useState(250);
  const [strengthCOV, setStrengthCOV] = useState(0.08);
  const [loadCOV, setLoadCOV] = useState(0.2);
  const [elasticModulus, setElasticModulus] = useState(200);
  const [includeSelfWeight, setIncludeSelfWeight] = useState(false);
  const [materialUnitWeight, setMaterialUnitWeight] = useState(77000); // N/m³; steel default
  const [compositeSlabWidth, setCompositeSlabWidth] = useState(0.9);
  const [compositeSlabThickness, setCompositeSlabThickness] = useState(0.12);
  const [compositeSlabElasticModulus, setCompositeSlabElasticModulus] = useState(30);
  const [compositeSlabTensileStrength, setCompositeSlabTensileStrength] = useState(3);
  const [compositeSlabCompressiveStrength, setCompositeSlabCompressiveStrength] = useState(30);
  const [compositeSlabUnitWeight, setCompositeSlabUnitWeight] = useState(24000); // N/m³; normal-weight concrete default
  const [compositeModel, setCompositeModel] = useState<"laminate" | "layered">("laminate");
  const [laminateLayup, setLaminateLayup] = useState("0, 45, -45, 90, 90, -45, 45, 0");
  const [laminatePlyThickness, setLaminatePlyThickness] = useState(0.00025);
  const [laminateUnitWeight, setLaminateUnitWeight] = useState(16000);
  const [laminateMaterial, setLaminateMaterial] = useState<LaminaMaterialProperties>({
    E1: 181e9, E2: 10.3e9, G12: 7.17e9, nu12: 0.28,
    Xt: 1500e6, Xc: 1500e6, Yt: 40e6, Yc: 246e6, S12: 68e6,
  });
  const updateLaminateMaterial = useCallback(<K extends keyof LaminaMaterialProperties>(key: K, value: number) => {
    setLaminateMaterial((current) => ({ ...current, [key]: value }));
  }, []);

  // Sync from shared context
  useEffect(() => {
    if (ctx.isSynced) {
      setBeamLength(ctx.beamLength);
      setLoadIntensity(ctx.loadMean * 1000);
      setLoadCOV(ctx.loadCoV);
      setYieldStrength(ctx.resistanceMean);
      setStrengthCOV(ctx.resistanceCoV);
    }
  }, [ctx.isSynced, ctx.beamLength, ctx.loadMean, ctx.loadCoV, ctx.resistanceMean, ctx.resistanceCoV]);

  // ─── Units ──────────────────────────────────────────────────
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>("metric");
  const [forceUnit, setForceUnit] = useState<ForceUnit>("kN");
  const [distributedForceUnit, setDistributedForceUnit] = useState<DistributedForceUnit>("kN/m");
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("m");
  const setUnitSystem = useCallback((system: UnitSystem) => {
    setUnitSystemState(system);
    if (system === "metric") {
      setForceUnit("kN");
      setDistributedForceUnit("kN/m");
      setLengthUnit("m");
    } else {
      setForceUnit("kip");
      setDistributedForceUnit("kip/ft");
      setLengthUnit("ft");
    }
  }, []);

  const convertForceToDisplay = useCallback((valueN: number) => {
    return valueN / (isDistributedLoad(loadType) ? distributedForceConversions[distributedForceUnit] : forceConversions[forceUnit]);
  }, [loadType, distributedForceUnit, forceUnit]);

  const convertForceFromDisplay = useCallback((value: number) => {
    return value * (isDistributedLoad(loadType) ? distributedForceConversions[distributedForceUnit] : forceConversions[forceUnit]);
  }, [loadType, distributedForceUnit, forceUnit]);

  const convertLengthToDisplay = useCallback((valueM: number) => valueM / lengthConversions[lengthUnit], [lengthUnit]);
  const convertLengthFromDisplay = useCallback((value: number) => value * lengthConversions[lengthUnit], [lengthUnit]);
  const getDisplayForceUnit = useCallback(() => isDistributedLoad(loadType) ? distributedForceUnit : forceUnit, [loadType, distributedForceUnit, forceUnit]);

  // ─── Display-unit helpers (metric vs imperial) ─────────────
  const isImperial = unitSystem === "imperial";
  const dimFactor = isImperial ? (1 / 0.0254) : 1000;        // m → in or mm
  const dimUnit = isImperial ? "in" : "mm";
  const dimToInternal = useCallback((v: number) => isImperial ? v * 0.0254 : v / 1000, [isImperial]);

  /** Display helpers for results & cross-section properties */
  const displayUnits = useMemo(() => {
    if (isImperial) {
      return {
        force: { factor: 1 / 4448.22, unit: "kip" },
        moment: { factor: 1 / 1355.82, unit: "kip·ft" },
        stress: { factor: 1 / 6894760, unit: "ksi" },
        deflection: { factor: 1000 / 25.4, unit: "in" },
        length: { factor: 1 / 0.3048, unit: "ft" },
        area: { factor: 1e4 / 6.4516, unit: "in²" },
        inertia: { factor: 1e8 / 41.6231, unit: "in⁴" },
        sectionMod: { factor: 1e6 / 16.3871, unit: "in³" },
        rigidity: { factor: 1 / (forceConversions.kip * Math.pow(lengthConversions.ft, 2)), unit: "kip·ft²" },
        radius: { factor: 100 / 2.54, unit: "in" },
        yieldUnit: "ksi",
        yieldFactor: 1 / 6.89476,  // MPa → ksi
        distForce: { factor: 1 / 14593.9, unit: "kip/ft" },
        unitWeight: { factor: 1 / (forceConversions.kip / Math.pow(lengthConversions.ft, 3)), unit: "kip/ft³" },
        // Diagram data is in kN, kN·m, mm, m (x-axis)
        diagramShear: 0.224809,   // kN → kip
        diagramMoment: 0.737562,  // kN·m → kip·ft
        diagramDefl: 1 / 25.4,   // mm → in
        diagramPos: 1 / 0.3048,  // m → ft
      };
    }
    return {
      force: { factor: 1 / 1000, unit: "kN" },
      moment: { factor: 1 / 1000, unit: "kN·m" },
      stress: { factor: 1 / 1e6, unit: "MPa" },
      deflection: { factor: 1000, unit: "mm" },
      length: { factor: 1, unit: "m" },
      area: { factor: 1e4, unit: "cm²" },
      inertia: { factor: 1e8, unit: "cm⁴" },
      sectionMod: { factor: 1e6, unit: "cm³" },
      rigidity: { factor: 1e-6, unit: "MN·m²" },
      radius: { factor: 100, unit: "cm" },
      yieldUnit: "MPa",
      yieldFactor: 1,
      distForce: { factor: 1 / 1000, unit: "kN/m" },
      unitWeight: { factor: 1 / 1000, unit: "kN/m³" },
      diagramShear: 1,
      diagramMoment: 1,
      diagramDefl: 1,
      diagramPos: 1,
    };
  }, [isImperial]);

  // ─── Supports ───────────────────────────────────────────────
  const [supports, setSupports] = useState<Support[]>([{ position: 0, type: "pin" }, { position: 1, type: "roller" }]);
  const [internalHinges, setInternalHinges] = useState<number[]>([]);
  const [showSupportEditor, setShowSupportEditor] = useState(false);
  const [forceAngle, setForceAngle] = useState(0);

  useEffect(() => {
    const map: Record<BeamType, Support[]> = {
      "simply-supported": [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      cantilever: [{ position: 0, type: "fixed" }],
      "fixed-fixed": [{ position: 0, type: "fixed" }, { position: 1, type: "fixed" }],
      "propped-cantilever": [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }],
      overhanging: [{ position: 0.25, type: "pin" }, { position: 0.75, type: "roller" }],
      continuous: [{ position: 0, type: "pin" }, { position: 0.5, type: "pin" }, { position: 1, type: "roller" }],
      "multi-span": [{ position: 0, type: "pin" }, { position: 0.33, type: "roller" }, { position: 0.66, type: "roller" }, { position: 1, type: "roller" }],
      gerber: [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }],
      "elastic-foundation": [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      "spring-supported": [{ position: 0, type: "pin" }, { position: 0.5, type: "roller" }, { position: 1, type: "roller" }],
      settlement: [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }],
      tapered: [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      "beam-column": [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      composite: [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
    };
    setSupports(map[beamType]);
    setInternalHinges(beamType === "gerber" ? [0.5] : []);
  }, [beamType]);

  // ─── Cross-section ──────────────────────────────────────────
  const [crossSectionType, setCrossSectionType] = useState<CrossSectionType>("rectangular");
  const [sectionWidth, setSectionWidth] = useState(0.1);
  const [sectionHeight, setSectionHeight] = useState(0.2);
  const [sectionDiameter, setSectionDiameter] = useState(0.15);
  const [innerDiameter, setInnerDiameter] = useState(0.12);
  const [innerWidth, setInnerWidth] = useState(0.08);
  const [innerHeight, setInnerHeight] = useState(0.16);
  const [flangeWidth, setFlangeWidth] = useState(0.15);
  const [flangeThickness, setFlangeThickness] = useState(0.015);
  const [webThickness, setWebThickness] = useState(0.01);

  const crossSectionDims: CrossSectionDimensions = useMemo(() => ({
    type: crossSectionType, width: sectionWidth, height: sectionHeight,
    diameter: sectionDiameter, innerDiameter, innerWidth, innerHeight,
    flangeWidth, flangeThickness, webThickness,
  }), [crossSectionType, sectionWidth, sectionHeight, sectionDiameter, innerDiameter, innerWidth, innerHeight, flangeWidth, flangeThickness, webThickness]);

  const sectionProps: CrossSectionProperties = useMemo(() => calculateCrossSectionProperties(crossSectionDims), [crossSectionDims]);

  const baseSectionHeight = crossSectionType === "circular" || crossSectionType === "hollow-circular"
    ? sectionDiameter
    : sectionHeight;
  const parsedLaminateAngles = useMemo(() => {
    const parts = laminateLayup.split(/[\s,/]+/).filter(Boolean);
    const angles = parts.map(Number);
    const valid = parts.length > 0 && parts.length <= 64 && angles.every(Number.isFinite);
    return { angles: valid ? angles : [0], valid };
  }, [laminateLayup]);
  const laminateSection: LaminateSectionProperties | null = useMemo(() => {
    if (beamType !== "composite" || compositeModel !== "laminate") return null;
    return calculateLaminateBeamProperties(sectionWidth, parsedLaminateAngles.angles.map((angleDegrees) => ({
      material: "Lamina material",
      angleDegrees,
      thickness: Math.max(laminatePlyThickness, 1e-8),
      properties: laminateMaterial,
    })));
  }, [beamType, compositeModel, sectionWidth, parsedLaminateAngles, laminatePlyThickness, laminateMaterial]);
  const compositeSection: CompositeSectionProperties | null = useMemo(() => {
    if (beamType !== "composite" || compositeModel !== "layered") return null;
    const baseElasticModulus = Math.max(elasticModulus * 1e9, 1);
    const baseHeight = Math.max(baseSectionHeight, 1e-6);
    const slabWidth = Math.max(compositeSlabWidth, 1e-6);
    const slabThickness = Math.max(compositeSlabThickness, 1e-6);
    const slabArea = slabWidth * slabThickness;
    return calculateCompositeSectionProperties([
      {
        material: "Primary beam",
        elasticModulus: baseElasticModulus,
        tensileStrength: Math.max(yieldStrength * 1e6, 1),
        compressiveStrength: Math.max(yieldStrength * 1e6, 1),
        area: Math.max(sectionProps.area, 1e-12),
        centroidY: baseHeight / 2,
        momentOfInertia: Math.max(sectionProps.momentOfInertia, 1e-18),
        bottomY: 0,
        topY: baseHeight,
      },
      {
        material: "Composite slab",
        elasticModulus: Math.max(compositeSlabElasticModulus * 1e9, 1),
        tensileStrength: Math.max(compositeSlabTensileStrength * 1e6, 1),
        compressiveStrength: Math.max(compositeSlabCompressiveStrength * 1e6, 1),
        area: slabArea,
        centroidY: baseHeight + slabThickness / 2,
        momentOfInertia: slabWidth * Math.pow(slabThickness, 3) / 12,
        bottomY: baseHeight,
        topY: baseHeight + slabThickness,
      },
    ], baseElasticModulus);
  }, [beamType, compositeModel, elasticModulus, yieldStrength, sectionProps, baseSectionHeight, compositeSlabWidth, compositeSlabThickness, compositeSlabElasticModulus, compositeSlabTensileStrength, compositeSlabCompressiveStrength]);

  const solverElasticModulus = laminateSection?.plies[0]?.properties.E1 ?? elasticModulus * 1e9;
  const solverFlexuralRigidity = laminateSection?.flexuralRigidity ?? compositeSection?.flexuralRigidity ?? elasticModulus * 1e9 * sectionProps.momentOfInertia;
  const solverMomentOfInertia = solverFlexuralRigidity / Math.max(solverElasticModulus, 1);
  const solverSectionModulus = laminateSection?.effectiveSectionModulus ?? compositeSection?.effectiveSectionModulus ?? sectionProps.sectionModulus;
  const analysisSectionProps = useMemo(() => laminateSection
    ? calculateCrossSectionProperties({ type: "rectangular", width: laminateSection.width, height: laminateSection.totalThickness })
    : sectionProps,
  [laminateSection, sectionProps]);
  const analysisCrossSectionType: CrossSectionType = laminateSection ? "rectangular" : crossSectionType;
  const analysisCrossSectionDims: CrossSectionDimensions = laminateSection
    ? { type: "rectangular", width: laminateSection.width, height: laminateSection.totalThickness }
    : crossSectionDims;

  // ─── Load-specific parameters ──────────────────────────────
  const [concentratedPosition, setConcentratedPosition] = useState(0.5);
  const [triangularPeak, setTriangularPeak] = useState<0 | 1>(0);
  const [movingPosition, setMovingPosition] = useState(0.5);
  const [isAnimating, setIsAnimating] = useState(false);
  const [partialStart, setPartialStart] = useState(0.25);
  const [partialEnd, setPartialEnd] = useState(0.75);
  const [trapStartIntensity, setTrapStartIntensity] = useState(5000);
  const [trapEndIntensity, setTrapEndIntensity] = useState(2500);
  const [momentPosition, setMomentPosition] = useState(0.5);
  const [influenceMeasurePoint, setInfluenceMeasurePoint] = useState(0.5);
  const [loadInverted, setLoadInverted] = useState(false);
  const [triStart, setTriStart] = useState(0);
  const [triEnd, setTriEnd] = useState(1);

  // Animation
  useEffect(() => {
    if (!isAnimating || (loadType !== "moving" && loadType !== "axle-train")) return;
    const interval = setInterval(() => setMovingPosition(p => (p + 0.02 > 1 ? 0 : p + 0.02)), 50);
    return () => clearInterval(interval);
  }, [isAnimating, loadType]);

  // ─── Domain computations ────────────────────────────────────
  const loadConfig: LoadConfig = useMemo(() => {
    const momentLike = loadType === "moment" || loadType === "support-settlement" || loadType === "thermal-gradient";
    return ({
    type: loadType, intensity: loadIntensity,
    position: momentLike ? momentPosition : concentratedPosition,
    peakPosition: triangularPeak, movingStep: movingPosition,
    startPosition: partialStart, endPosition: partialEnd,
    startIntensity: trapStartIntensity, endIntensity: trapEndIntensity,
    inverted: loadInverted, triStartPosition: triStart, triEndPosition: triEnd,
    forceAngle,
  });
  }, [loadType, loadIntensity, concentratedPosition, triangularPeak, movingPosition, partialStart, partialEnd, trapStartIntensity, trapEndIntensity, momentPosition, loadInverted, triStart, triEnd, forceAngle]);

  const effectiveBeamType = useMemo<BeamType>(() => resolveAnalysisBeamType(beamType), [beamType]);
  const effectiveLoadConfig = useMemo<LoadConfig>(() => resolveAnalysisLoadConfig(loadConfig, beamLength), [loadConfig, beamLength]);
  const effectiveHybridLoads = useMemo<LoadConfig[]>(
    () => hybridLoads.map((load) => resolveAnalysisLoadConfig(load, beamLength)),
    [hybridLoads, beamLength],
  );

  const activeLoads = useMemo<LoadConfig[]>(() => (
    loadMode === "hybrid" && effectiveHybridLoads.length > 0
      ? effectiveHybridLoads
      : [effectiveLoadConfig]
  ), [loadMode, effectiveHybridLoads, effectiveLoadConfig]);
  const compositeSlabArea = compositeSlabWidth * compositeSlabThickness;
  const selfWeightIntensity = includeSelfWeight
    ? (laminateSection
      ? laminateUnitWeight * laminateSection.area
      : beamType === "composite"
      ? materialUnitWeight * sectionProps.area + compositeSlabUnitWeight * compositeSlabArea
      : materialUnitWeight * sectionProps.area)
    : 0;
  const selfWeightLoad = useMemo<LoadConfig | null>(() => includeSelfWeight
    ? { type: "udl", intensity: selfWeightIntensity, inverted: false }
    : null, [includeSelfWeight, selfWeightIntensity]);

  const beamSolution = useMemo(() => {
    return solveBeamResponse(
      beamType,
      selfWeightLoad ? [...activeLoads, selfWeightLoad] : activeLoads,
      beamLength,
      solverElasticModulus,
      solverMomentOfInertia,
      supports,
      { numPoints: 400, includeEventSamples: true, includeExtremaSamples: true, internalHinges },
      solverSectionModulus,
    );
  }, [beamType, activeLoads, selfWeightLoad, beamLength, sectionProps, solverElasticModulus, solverMomentOfInertia, solverSectionModulus, supports, internalHinges]);
  const beamResult: BeamAnalysis = beamSolution.analysis;
  const diagramData = beamSolution.diagramData;
  const governingMoment = Math.abs(beamResult.maxBendingMoment) >= Math.abs(beamResult.minBendingMoment ?? 0)
    ? beamResult.maxBendingMoment
    : (beamResult.minBendingMoment ?? 0);
  const analysisYieldStrength = laminateSection
    ? (governingMoment >= 0 ? laminateSection.positiveMomentEquivalentStrength : laminateSection.negativeMomentEquivalentStrength) / 1e6
    : compositeSection
    ? (governingMoment >= 0 ? compositeSection.positiveMomentEquivalentStrength : compositeSection.negativeMomentEquivalentStrength) / 1e6
    : yieldStrength;

  const reliability = useMemo(() => {
    const meanStress = Math.abs(beamResult.maxStress) / 1e6;
    return reliabilityAnalysis(analysisYieldStrength, strengthCOV, meanStress, loadCOV);
  }, [beamResult.maxStress, analysisYieldStrength, strengthCOV, loadCOV]);

  useEffect(() => {
    if (!isSynced) {
      setActiveStressMean(null);
      setActiveStressCoV(null);
      return;
    }

    setActiveStressMean(Math.abs(beamResult.maxStress));
    setActiveStressCoV(loadCOV);
    setSharedResistanceMean(analysisYieldStrength);
    setSharedResistanceCoV(strengthCOV);
    setSharedBeamLength(beamLength);
  }, [
    isSynced,
    setActiveStressMean,
    setActiveStressCoV,
    setSharedResistanceMean,
    setSharedResistanceCoV,
    setSharedBeamLength,
    beamResult.maxStress,
    loadCOV,
    analysisYieldStrength,
    strengthCOV,
    beamLength,
  ]);

  const validation = useMemo(() => validateBeamAnalysis({
    beamType,
    effectiveBeamType,
    loadType,
    loadMode,
    loadConfig,
    effectiveLoadConfig,
    hybridLoads,
    effectiveHybridLoads,
    beamLength,
    crossSectionType: analysisCrossSectionType,
    crossSectionDims: analysisCrossSectionDims,
    sectionProps: analysisSectionProps,
    beamResult,
    yieldStrength: analysisYieldStrength,
    strengthCOV,
    loadCOV,
    reliability,
  }), [
    beamType,
    effectiveBeamType,
    loadType,
    loadMode,
    loadConfig,
    effectiveLoadConfig,
    hybridLoads,
    effectiveHybridLoads,
    beamLength,
    analysisCrossSectionType,
    analysisCrossSectionDims,
    analysisSectionProps,
    beamResult,
    analysisYieldStrength,
    strengthCOV,
    loadCOV,
    reliability,
  ]);

  const influenceData = useMemo(() => generateInfluenceLineData(
    beamType,
    influenceMeasurePoint,
    beamLength,
    50,
    solverElasticModulus,
    solverMomentOfInertia,
    supports,
  ), [beamType, influenceMeasurePoint, beamLength, solverElasticModulus, solverMomentOfInertia, supports]);

  const envelopeData = useMemo(() => {
    const movingLoads = activeLoads.filter((load) => load.type === "moving" || load.type === "axle-train");
    const baseLoads = activeLoads.filter((load) => load.type !== "moving" && load.type !== "axle-train");
    if (selfWeightLoad) baseLoads.push(selfWeightLoad);
    const intensity = movingLoads[0]?.intensity ?? effectiveLoadConfig.intensity;
    return generateEnvelopeData(
      beamType,
      intensity,
      beamLength,
      solverElasticModulus,
      solverMomentOfInertia,
      50,
      20,
      supports,
      baseLoads,
      movingLoads,
    );
  }, [beamType, activeLoads, selfWeightLoad, effectiveLoadConfig.intensity, beamLength, solverElasticModulus, solverMomentOfInertia, supports]);

  const hasMovingLoad = activeLoads.some((load) => load.type === "moving" || load.type === "axle-train");

  // ─── Load markers for influence lines ───────────────────────
  const loadMarkers = useMemo(() => {
    const markers: { position: number; intensity: number; type: LoadType; label: string; endPosition?: number; color: string }[] = [];
    const addMarker = (load: LoadConfig, idx: number, color: string) => {
      const lbl = (prefix: string) => loadMode === "hybrid" ? `${prefix}${idx + 1}` : prefix;
      if (load.type === "concentrated" || load.type === "moving") {
        const pos = load.type === "moving" ? (load.movingStep ?? 0.5) : (load.position ?? 0.5);
        markers.push({ position: pos * beamLength, intensity: load.intensity, type: load.type, label: lbl("P"), color });
      } else if (load.type === "moment") {
        markers.push({ position: (load.position ?? 0.5) * beamLength, intensity: load.intensity, type: load.type, label: lbl("M"), color });
      } else if (load.type === "udl") {
        markers.push({ position: 0, intensity: load.intensity, type: load.type, label: lbl("w"), endPosition: beamLength, color });
      } else if (load.type === "partial-udl") {
        markers.push({ position: (load.startPosition ?? 0.25) * beamLength, intensity: load.intensity, type: load.type, label: lbl("w"), endPosition: (load.endPosition ?? 0.75) * beamLength, color });
      } else if (load.type === "triangular") {
        markers.push({ position: 0, intensity: load.intensity, type: load.type, label: lbl("△"), endPosition: beamLength, color });
      } else if (load.type === "trapezoidal") {
        markers.push({ position: 0, intensity: load.intensity, type: load.type, label: lbl("⬡"), endPosition: beamLength, color });
      } else if (load.type === "parabolic") {
        markers.push({ position: 0, intensity: load.intensity, type: load.type, label: lbl("⌒"), endPosition: beamLength, color });
      }
    };
    if (loadMode === "hybrid" && effectiveHybridLoads.length > 0) {
      effectiveHybridLoads.forEach((load, i) => addMarker(load, i, loadColors[i % loadColors.length]));
    } else {
      addMarker(effectiveLoadConfig, 0, "hsl(142 71% 45%)");
    }
    return markers;
  }, [loadMode, effectiveHybridLoads, effectiveLoadConfig, beamLength]);

  // ─── Influence effects ──────────────────────────────────────
  const { influenceEffects, loadContributions } = useMemo(() => {
    let totalShear = 0, totalMoment = 0;
    const contributions: { label: string; color: string; shear: number; moment: number; type: LoadType; intensity: number }[] = [];

    const processLoad = (load: LoadConfig, label: string, color: string) => {
      const response = solveBeamResponse(
        beamType,
        [load],
        beamLength,
        solverElasticModulus,
        solverMomentOfInertia,
        supports,
        { numPoints: 1, extraSamplePositions: [influenceMeasurePoint * beamLength] },
        solverSectionModulus,
      );
      const targetX = influenceMeasurePoint * beamLength;
      const point = response.diagramData.reduce((closest, candidate) =>
        Math.abs(candidate.x - targetX) < Math.abs(closest.x - targetX) ? candidate : closest,
      );
      const shear = point.shear * 1000;
      const moment = point.moment * 1000;
      totalShear += shear; totalMoment += moment;
      contributions.push({ label, color, shear: shear / 1000, moment: moment / 1000, type: load.type, intensity: load.intensity });
    };

    if (loadMode === "hybrid" && effectiveHybridLoads.length > 0) {
      effectiveHybridLoads.forEach((load, i) => {
        const prefix = load.type === "concentrated" || load.type === "moving" ? "P" : load.type === "moment" ? "M" : "w";
        processLoad(load, `${prefix}${i + 1}`, loadColors[i % loadColors.length]);
      });
    } else {
      const prefix = effectiveLoadConfig.type === "concentrated" || effectiveLoadConfig.type === "moving" ? "P" : effectiveLoadConfig.type === "moment" ? "M" : "w";
      processLoad(effectiveLoadConfig, prefix, "hsl(142 71% 45%)");
    }
    if (selfWeightLoad) processLoad(selfWeightLoad, "SW", "hsl(215 20% 65%)");
    return { influenceEffects: { shear: totalShear / 1000, moment: totalMoment / 1000 }, loadContributions: contributions };
  }, [loadMode, effectiveHybridLoads, effectiveLoadConfig, selfWeightLoad, beamType, beamLength, solverElasticModulus, solverMomentOfInertia, solverSectionModulus, supports, influenceMeasurePoint]);

  // ─── Export ─────────────────────────────────────────────────
  const getBeamReportData = useCallback((): ReportSection[] => {
    const du = displayUnits;
    const lu = du.length.unit;
    const posConv = du.length.factor;
    const eModUnit = isImperial ? "ksi" : "GPa";
    const eModValue = laminateSection
      ? laminateMaterial.E1 * (isImperial ? 1 / 6894760 : 1e-9)
      : isImperial ? (elasticModulus * 1e9) / 6894760 : elasticModulus;

    const sections: ReportSection[] = [
      { title: "Beam Configuration", description: `${getBeamTypeLabel(beamType)} beam analysis`, data: [
        { label: "Beam Type", value: getBeamTypeLabel(beamType), precision: 0 },
        { label: "Beam Length", value: beamLength * posConv, unit: lu, precision: 2 },
        { label: "Loading Mode", value: loadMode === "hybrid" ? "Hybrid (Multiple Loads)" : "Single Load", precision: 0 },
        { label: laminateSection ? "Fiber-direction modulus E₁" : "Elastic Modulus", value: eModValue, unit: eModUnit, precision: 1 },
        { label: "Beam Self-Weight", value: includeSelfWeight ? "Included" : "Off", precision: 0 },
        ...(includeSelfWeight ? [
          { label: "Material Unit Weight", value: (laminateSection ? laminateUnitWeight : materialUnitWeight) * du.unitWeight.factor, unit: du.unitWeight.unit, precision: 2 },
          { label: "Self-Weight Line Load", value: selfWeightIntensity * du.distForce.factor, unit: du.distForce.unit, precision: 3 },
        ] : []),
      ]},
    ];
    if (loadMode === "hybrid" && hybridLoads.length > 0) {
      sections.push({
        title: "Hybrid Load Configuration", description: `${hybridLoads.length} load case(s)`,
        table: {
          headers: ["Load #", "Type", "Intensity", "Unit", "Position/Range"],
          rows: hybridLoads.map((load, i) => {
            const isMomentType = load.type === "moment";
            const isPointType = load.type === "concentrated" || load.type === "moving";
            const unit = isMomentType ? du.moment.unit : isPointType ? du.force.unit : du.distForce.unit;
            const intFactor = isMomentType ? du.moment.factor : isPointType ? du.force.factor : du.distForce.factor;
            let posInfo = "-";
            if (load.type === "concentrated" || load.type === "moment") posInfo = `${((load.position ?? 0.5) * beamLength * posConv).toFixed(2)} ${lu}`;
            else if (load.type === "moving") posInfo = `${((load.movingStep ?? 0.5) * beamLength * posConv).toFixed(2)} ${lu} (moving)`;
            else if (load.type === "partial-udl") posInfo = `${((load.startPosition ?? 0.25) * beamLength * posConv).toFixed(2)} - ${((load.endPosition ?? 0.75) * beamLength * posConv).toFixed(2)} ${lu}`;
            else posInfo = `0 - ${(beamLength * posConv).toFixed(2)} ${lu} (full span)`;
            return [`L${i + 1}`, getLoadTypeLabel(load.type), (load.intensity * intFactor).toFixed(2), unit, posInfo];
          }),
        },
      });
    } else {
      sections.push({
        title: "Single Load Configuration", description: getLoadTypeLabel(loadType),
        data: [
          { label: "Load Type", value: getLoadTypeLabel(loadType), precision: 0 },
          { label: "Load Intensity", value: convertForceToDisplay(loadIntensity), unit: getDisplayForceUnit(), precision: 2 },
        ],
      });
    }
    sections.push(
      { title: "Analysis Health", description: validation.statusLabel, data: [
        { label: "Solver Route", value: validation.solverLabel, precision: 0 },
        { label: "Stress Utilization", value: validation.stressUtilization * 100, unit: "%", precision: 1 },
        { label: "Deflection Ratio", value: validation.deflectionRatio * 100, unit: "% of L/250", precision: 1 },
        { label: "Critical Flags", value: validation.criticalCount, precision: 0 },
        { label: "Warnings", value: validation.warningCount, precision: 0 },
      ]},
      { title: "Cross Section Properties", description: getCrossSectionLabel(analysisCrossSectionType), data: [
        { label: "Area", value: analysisSectionProps.area * du.area.factor, unit: du.area.unit, precision: 2 },
        { label: "Moment of Inertia", value: analysisSectionProps.momentOfInertia * du.inertia.factor, unit: du.inertia.unit, precision: 2 },
        { label: "Section Modulus", value: analysisSectionProps.sectionModulus * du.sectionMod.factor, unit: du.sectionMod.unit, precision: 2 },
      ]},
      { title: "Analysis Results", description: "Maximum values", data: [
        { label: "Max Shear", value: beamResult.maxShear * du.force.factor, unit: du.force.unit, precision: 3 },
        { label: "Max Moment", value: beamResult.maxBendingMoment * du.moment.factor, unit: du.moment.unit, precision: 3 },
        { label: "Max Deflection", value: beamResult.maxDeflection * du.deflection.factor, unit: du.deflection.unit, precision: 4 },
        { label: "Max Stress", value: beamResult.maxStress * du.stress.factor, unit: du.stress.unit, precision: 2 },
      ]},
      { title: "Reliability Analysis", description: "Structural reliability", data: [
        { label: "β", value: reliability.beta, precision: 4 },
        { label: "Pf", value: reliability.pf, precision: 6 },
        { label: "Safety Factor", value: reliability.centralSafetyFactor, precision: 3 },
      ]},
    );
    if (compositeSection) {
      sections.push({
        title: "Composite Section Mechanics",
        description: "Fully bonded linear-elastic transformed section; screening result only",
        data: [
          { label: "Effective slab width", value: compositeSlabWidth * posConv, unit: lu, precision: 3 },
          { label: "Deck thickness", value: compositeSlabThickness * posConv, unit: lu, precision: 3 },
          { label: "Composite material area", value: compositeSection.area * du.area.factor, unit: du.area.unit, precision: 3 },
          { label: "Elastic neutral axis from beam bottom", value: compositeSection.elasticNeutralAxis * posConv, unit: lu, precision: 3 },
          { label: "Modular ratio Edeck/Ebeam", value: compositeSlabElasticModulus / Math.max(elasticModulus, 1e-9), precision: 3 },
          { label: "Composite flexural rigidity EI", value: compositeSection.flexuralRigidity * du.rigidity.factor, unit: du.rigidity.unit, precision: 3 },
          { label: "Transformed I (beam material reference)", value: compositeSection.transformedMomentOfInertia * du.inertia.factor, unit: du.inertia.unit, precision: 3 },
          { label: "Effective section modulus", value: compositeSection.effectiveSectionModulus * du.sectionMod.factor, unit: du.sectionMod.unit, precision: 3 },
          { label: "Equivalent screening strength", value: analysisYieldStrength * du.yieldFactor, unit: du.yieldUnit, precision: 2 },
          ...(includeSelfWeight ? [{ label: "Slab material unit weight", value: compositeSlabUnitWeight * du.unitWeight.factor, unit: du.unitWeight.unit, precision: 2 }] : []),
        ],
      });
    }
    if (laminateSection) {
      const strengthUtilization = Math.abs(governingMoment) * (governingMoment >= 0
        ? laminateSection.positiveMomentUtilizationCoefficient
        : laminateSection.negativeMomentUtilizationCoefficient);
      sections.push({
        title: "Laminated Composite Beam Mechanics",
        description: "Classical Lamination Theory with first-ply maximum-stress screening",
        data: [
          { label: "Ply angles, bottom to top", value: laminateSection.plies.map((ply) => `${ply.angleDegrees}°`).join(", "), precision: 0 },
          { label: "Ply count", value: laminateSection.plies.length, precision: 0 },
          { label: "Laminate width", value: laminateSection.width * posConv, unit: lu, precision: 3 },
          { label: "Laminate total thickness", value: laminateSection.totalThickness * posConv, unit: lu, precision: 4 },
          { label: "A₁₁ extensional stiffness", value: laminateSection.extensionalStiffness[0][0] * (du.force.factor / du.length.factor), unit: `${du.force.unit}/${lu}`, precision: 3 },
          { label: "B₁₁ extension-bending coupling", value: laminateSection.couplingStiffness[0][0] * du.force.factor, unit: du.force.unit, precision: 3 },
          { label: "D₁₁ bending stiffness per width", value: laminateSection.bendingStiffness[0][0] * du.moment.factor, unit: du.moment.unit, precision: 3 },
          { label: "Effective beam EI from full ABD compliance", value: laminateSection.flexuralRigidity * du.rigidity.factor, unit: du.rigidity.unit, precision: 4 },
          { label: "Effective elastic section modulus", value: laminateSection.effectiveSectionModulus * du.sectionMod.factor, unit: du.sectionMod.unit, precision: 3 },
          { label: "Governing first-ply utilization", value: strengthUtilization * 100, unit: "%", precision: 2 },
          { label: "Positive / negative moment resistance", value: `${(laminateSection.positiveMomentResistance * du.moment.factor).toFixed(3)} / ${(laminateSection.negativeMomentResistance * du.moment.factor).toFixed(3)} ${du.moment.unit}`, precision: 0 },
          ...(includeSelfWeight ? [{ label: "Lamina unit weight", value: laminateUnitWeight * du.unitWeight.factor, unit: du.unitWeight.unit, precision: 2 }] : []),
        ],
      });
    }
    return sections;
  }, [beamType, beamLength, loadType, loadMode, hybridLoads, loadIntensity, elasticModulus, laminateSection, laminateMaterial, analysisCrossSectionType, analysisSectionProps, beamResult, reliability, validation, displayUnits, isImperial, convertForceToDisplay, getDisplayForceUnit, includeSelfWeight, materialUnitWeight, laminateUnitWeight, selfWeightIntensity, compositeSection, compositeSlabWidth, compositeSlabThickness, compositeSlabElasticModulus, compositeSlabUnitWeight, analysisYieldStrength]);

  const getBeamCSVData = useCallback(() => diagramData.map(p => ({
    position_m: p.x, shear_kn: p.shear, moment_knm: p.moment, deflection_mm: p.deflection,
  })), [diagramData]);

  return {
    ctx,
    // Core state
    beamType, setBeamType, loadType, setLoadType, loadMode, setLoadMode,
    hybridLoads, setHybridLoads, loadIntensity, setLoadIntensity,
    beamLength, setBeamLength, yieldStrength, setYieldStrength,
    strengthCOV, setStrengthCOV, loadCOV, setLoadCOV,
    elasticModulus, setElasticModulus,
    includeSelfWeight, setIncludeSelfWeight, materialUnitWeight, setMaterialUnitWeight,
    compositeSlabWidth, setCompositeSlabWidth,
    compositeSlabThickness, setCompositeSlabThickness,
    compositeSlabElasticModulus, setCompositeSlabElasticModulus,
    compositeSlabTensileStrength, setCompositeSlabTensileStrength,
    compositeSlabCompressiveStrength, setCompositeSlabCompressiveStrength,
    compositeSlabUnitWeight, setCompositeSlabUnitWeight,
    compositeModel, setCompositeModel,
    laminateLayup, setLaminateLayup, laminateLayupValid: parsedLaminateAngles.valid,
    laminatePlyThickness, setLaminatePlyThickness,
    laminateUnitWeight, setLaminateUnitWeight,
    laminateMaterial, updateLaminateMaterial,
    selfWeightIntensity,
    // Units
    unitSystem, setUnitSystem, forceUnit, setForceUnit,
    distributedForceUnit, setDistributedForceUnit, lengthUnit, setLengthUnit,
    convertForceToDisplay, convertForceFromDisplay,
    convertLengthToDisplay, convertLengthFromDisplay, getDisplayForceUnit,
    isImperial, dimFactor, dimUnit, dimToInternal, displayUnits,
    // Supports
    supports, setSupports, internalHinges, setInternalHinges, showSupportEditor, setShowSupportEditor,
    forceAngle, setForceAngle,
    // Cross-section
    crossSectionType, setCrossSectionType,
    sectionWidth, setSectionWidth, sectionHeight, setSectionHeight,
    sectionDiameter, setSectionDiameter, innerDiameter, setInnerDiameter,
    innerWidth, setInnerWidth, innerHeight, setInnerHeight,
    flangeWidth, setFlangeWidth, flangeThickness, setFlangeThickness,
    webThickness, setWebThickness, sectionProps, analysisSectionProps,
    analysisCrossSectionType,
    baseSectionHeight, compositeSection, laminateSection, analysisYieldStrength,
    solverElasticModulus,
    solverFlexuralRigidity, solverMomentOfInertia, solverSectionModulus,
    // Load params
    concentratedPosition, setConcentratedPosition,
    triangularPeak, setTriangularPeak,
    movingPosition, setMovingPosition,
    isAnimating, setIsAnimating,
    partialStart, setPartialStart, partialEnd, setPartialEnd,
    trapStartIntensity, setTrapStartIntensity, trapEndIntensity, setTrapEndIntensity,
    momentPosition, setMomentPosition,
    influenceMeasurePoint, setInfluenceMeasurePoint,
    loadInverted, setLoadInverted,
    triStart, setTriStart, triEnd, setTriEnd,
    // Computed
    loadConfig, effectiveLoadConfig, effectiveHybridLoads, effectiveBeamType,
    beamResult, reliability, validation, diagramData, influenceData, envelopeData,
    supportFallback: beamSolution.supportFallback,
    hasMovingLoad, loadMarkers, influenceEffects, loadContributions,
    // Export
    getBeamReportData, getBeamCSVData,
  };
}
