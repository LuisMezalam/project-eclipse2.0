/**
 * useBeamAnalysis — custom hook encapsulating all state, domain computations,
 * unit conversions, and export utilities for the Static Beam Analysis module.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  analyzeSimplySupported, analyzeCantilever, analyzeFixedFixed,
  analyzeProppedCantilever, analyzeOverhanging, analyzeContinuous,
  analyzeHybridLoads, reliabilityAnalysis,
  generateHybridDiagramData, generateDiagramData,
  generateInfluenceLineData, generateEnvelopeData,
  calculateCrossSectionProperties,
  type BeamAnalysis, type LoadConfig, type LoadType, type BeamType,
  type CrossSectionType, type CrossSectionDimensions, type CrossSectionProperties,
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
  const map: Partial<Record<BeamType, BeamType>> = {
    "multi-span": "continuous",
    gerber: "simply-supported",
    "elastic-foundation": "simply-supported",
    "spring-supported": "continuous",
    settlement: "propped-cantilever",
    tapered: "simply-supported",
    "beam-column": "simply-supported",
    composite: "simply-supported",
  };
  return map[beamType] ?? beamType;
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
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [forceUnit, setForceUnit] = useState<ForceUnit>("kN");
  const [distributedForceUnit, setDistributedForceUnit] = useState<DistributedForceUnit>("kN/m");
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("m");

  useEffect(() => {
    if (unitSystem === "metric") { setForceUnit("kN"); setDistributedForceUnit("kN/m"); setLengthUnit("m"); }
    else { setForceUnit("kip"); setDistributedForceUnit("kip/ft"); setLengthUnit("ft"); }
  }, [unitSystem]);

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
        radius: { factor: 100 / 2.54, unit: "in" },
        yieldUnit: "ksi",
        yieldFactor: 1 / 6.89476,  // MPa → ksi
        distForce: { factor: 1 / 14593.9, unit: "kip/ft" },
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
      radius: { factor: 100, unit: "cm" },
      yieldUnit: "MPa",
      yieldFactor: 1,
      distForce: { factor: 1 / 1000, unit: "kN/m" },
      diagramShear: 1,
      diagramMoment: 1,
      diagramDefl: 1,
      diagramPos: 1,
    };
  }, [isImperial]);

  // ─── Supports ───────────────────────────────────────────────
  const [supports, setSupports] = useState<Support[]>([{ position: 0, type: "pin" }, { position: 1, type: "roller" }]);
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
      gerber: [{ position: 0, type: "pin" }, { position: 0.5, type: "hinge" }, { position: 1, type: "roller" }],
      "elastic-foundation": [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      "spring-supported": [{ position: 0, type: "pin" }, { position: 0.5, type: "roller" }, { position: 1, type: "roller" }],
      settlement: [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }],
      tapered: [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      "beam-column": [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
      composite: [{ position: 0, type: "pin" }, { position: 1, type: "roller" }],
    };
    setSupports(map[beamType]);
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

  const beamResult: BeamAnalysis = useMemo(() => {
    if (loadMode === "hybrid" && hybridLoads.length > 0) {
      return analyzeHybridLoads(effectiveBeamType, { loads: effectiveHybridLoads }, beamLength, sectionProps.sectionModulus, elasticModulus * 1e9, sectionProps.momentOfInertia);
    }
    const analyzers: Record<BeamType, typeof analyzeSimplySupported> = {
      "fixed-fixed": analyzeFixedFixed,
      "propped-cantilever": analyzeProppedCantilever,
      overhanging: analyzeOverhanging,
      continuous: analyzeContinuous,
      cantilever: analyzeCantilever,
      "simply-supported": analyzeSimplySupported,
      "multi-span": analyzeContinuous,
      gerber: analyzeSimplySupported,
      "elastic-foundation": analyzeSimplySupported,
      "spring-supported": analyzeContinuous,
      settlement: analyzeProppedCantilever,
      tapered: analyzeSimplySupported,
      "beam-column": analyzeSimplySupported,
      composite: analyzeSimplySupported,
    };
    return (analyzers[effectiveBeamType] || analyzeSimplySupported)(effectiveLoadConfig, beamLength, sectionProps.sectionModulus, elasticModulus * 1e9, sectionProps.momentOfInertia);
  }, [effectiveBeamType, effectiveLoadConfig, loadMode, hybridLoads.length, effectiveHybridLoads, beamLength, sectionProps, elasticModulus]);

  const reliability = useMemo(() => {
    const meanStress = Math.abs(beamResult.maxStress) / 1e6;
    return reliabilityAnalysis(yieldStrength, strengthCOV, meanStress, loadCOV);
  }, [beamResult.maxStress, yieldStrength, strengthCOV, loadCOV]);

  useEffect(() => {
    if (!isSynced) {
      setActiveStressMean(null);
      setActiveStressCoV(null);
      return;
    }

    setActiveStressMean(Math.abs(beamResult.maxStress));
    setActiveStressCoV(loadCOV);
    setSharedResistanceMean(yieldStrength);
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
    yieldStrength,
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
    crossSectionType,
    crossSectionDims,
    sectionProps,
    beamResult,
    yieldStrength,
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
    crossSectionType,
    crossSectionDims,
    sectionProps,
    beamResult,
    yieldStrength,
    strengthCOV,
    loadCOV,
    reliability,
  ]);

  const diagramData = useMemo(() => {
    if (loadMode === "hybrid" && hybridLoads.length > 0)
      return generateHybridDiagramData(effectiveBeamType, effectiveHybridLoads, beamLength, elasticModulus * 1e9, sectionProps.momentOfInertia);
    return generateDiagramData(effectiveBeamType, effectiveLoadConfig, beamLength, elasticModulus * 1e9, sectionProps.momentOfInertia);
  }, [effectiveBeamType, effectiveLoadConfig, loadMode, hybridLoads.length, effectiveHybridLoads, beamLength, elasticModulus, sectionProps.momentOfInertia]);

  const influenceData = useMemo(() => generateInfluenceLineData(effectiveBeamType, influenceMeasurePoint, beamLength, 50, elasticModulus * 1e9, sectionProps.momentOfInertia),
    [effectiveBeamType, influenceMeasurePoint, beamLength, elasticModulus, sectionProps.momentOfInertia]);

  const envelopeData = useMemo(() => {
    const intensity = loadMode === "hybrid"
      ? effectiveHybridLoads.find((l) => l.type === "moving")?.intensity || effectiveLoadConfig.intensity
      : effectiveLoadConfig.intensity;
    return generateEnvelopeData(effectiveBeamType, intensity, beamLength, elasticModulus * 1e9, sectionProps.momentOfInertia);
  }, [effectiveBeamType, effectiveLoadConfig.intensity, loadMode, effectiveHybridLoads, beamLength, elasticModulus, sectionProps.momentOfInertia]);

  const hasMovingLoad = loadMode === "hybrid" ? hybridLoads.some(l => l.type === "moving" || l.type === "axle-train") : loadType === "moving" || loadType === "axle-train";

  // ─── Load markers for influence lines ───────────────────────
  const loadMarkers = useMemo(() => {
    const markers: { position: number; intensity: number; type: LoadType; label: string; endPosition?: number; color: string }[] = [];
    const addMarker = (load: LoadConfig, idx: number, color: string) => {
      const lbl = (prefix: string) => loadMode === "hybrid" ? `${prefix}${idx + 1}` : prefix;
      if (load.type === "concentrated" || load.type === "moving") {
        const pos = load.type === "moving" ? (load.movingStep || 0.5) : (load.position || 0.5);
        markers.push({ position: pos * beamLength, intensity: load.intensity, type: load.type, label: lbl("P"), color });
      } else if (load.type === "moment") {
        markers.push({ position: (load.position || 0.5) * beamLength, intensity: load.intensity, type: load.type, label: lbl("M"), color });
      } else if (load.type === "udl") {
        markers.push({ position: 0, intensity: load.intensity, type: load.type, label: lbl("w"), endPosition: beamLength, color });
      } else if (load.type === "partial-udl") {
        markers.push({ position: (load.startPosition || 0.25) * beamLength, intensity: load.intensity, type: load.type, label: lbl("w"), endPosition: (load.endPosition || 0.75) * beamLength, color });
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

    const getIL = (pos: number) => {
      const idx = Math.round((pos / beamLength) * 50);
      return influenceData[Math.min(idx, influenceData.length - 1)] || { shearAt: 0, momentAt: 0 };
    };
    const integrate = (start: number, end: number, intensity: number) => {
      const steps = 20, dx = (end - start) / steps;
      let s = 0, m = 0;
      for (let i = 0; i <= steps; i++) {
        const il = getIL(start + i * dx);
        const w = (i === 0 || i === steps) ? 0.5 : 1;
        s += w * il.shearAt * intensity * dx;
        m += w * il.momentAt * intensity * dx;
      }
      return { shear: s, moment: m };
    };

    const processLoad = (load: LoadConfig, label: string, color: string) => {
      let shear = 0, moment = 0;
      if (load.type === "concentrated" || load.type === "moving") {
        const pos = (load.type === "moving" ? (load.movingStep || 0.5) : (load.position || 0.5)) * beamLength;
        const il = getIL(pos);
        shear = load.intensity * il.shearAt;
        moment = load.intensity * il.momentAt;
      } else if (load.type === "moment") {
        moment = load.intensity;
      } else if (load.type === "udl") {
        const r = integrate(0, beamLength, load.intensity); shear = r.shear; moment = r.moment;
      } else if (load.type === "partial-udl") {
        const r = integrate((load.startPosition || 0.25) * beamLength, (load.endPosition || 0.75) * beamLength, load.intensity); shear = r.shear; moment = r.moment;
      } else if (load.type === "triangular" || load.type === "trapezoidal" || load.type === "parabolic") {
        const r = integrate(0, beamLength, load.intensity); shear = r.shear; moment = r.moment;
      }
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
    return { influenceEffects: { shear: totalShear / 1000, moment: totalMoment / 1000 }, loadContributions: contributions };
  }, [loadMode, effectiveHybridLoads, effectiveLoadConfig, beamLength, influenceData]);

  // ─── Export ─────────────────────────────────────────────────
  const getBeamReportData = useCallback((): ReportSection[] => {
    const du = displayUnits;
    const lu = du.length.unit;
    const posConv = du.length.factor;
    const eModUnit = isImperial ? "ksi" : "GPa";
    const eModValue = isImperial ? (elasticModulus * 1e9) / 6894760 : elasticModulus;

    const sections: ReportSection[] = [
      { title: "Beam Configuration", description: `${getBeamTypeLabel(beamType)} beam analysis`, data: [
        { label: "Beam Type", value: getBeamTypeLabel(beamType), precision: 0 },
        { label: "Beam Length", value: beamLength * posConv, unit: lu, precision: 2 },
        { label: "Loading Mode", value: loadMode === "hybrid" ? "Hybrid (Multiple Loads)" : "Single Load", precision: 0 },
        { label: "Elastic Modulus", value: eModValue, unit: eModUnit, precision: 1 },
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
            if (load.type === "concentrated" || load.type === "moment") posInfo = `${((load.position || 0.5) * beamLength * posConv).toFixed(2)} ${lu}`;
            else if (load.type === "moving") posInfo = `${((load.movingStep || 0.5) * beamLength * posConv).toFixed(2)} ${lu} (moving)`;
            else if (load.type === "partial-udl") posInfo = `${((load.startPosition || 0.25) * beamLength * posConv).toFixed(2)} - ${((load.endPosition || 0.75) * beamLength * posConv).toFixed(2)} ${lu}`;
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
      { title: "Cross Section Properties", description: getCrossSectionLabel(crossSectionType), data: [
        { label: "Area", value: sectionProps.area * du.area.factor, unit: du.area.unit, precision: 2 },
        { label: "Moment of Inertia", value: sectionProps.momentOfInertia * du.inertia.factor, unit: du.inertia.unit, precision: 2 },
        { label: "Section Modulus", value: sectionProps.sectionModulus * du.sectionMod.factor, unit: du.sectionMod.unit, precision: 2 },
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
    return sections;
  }, [beamType, beamLength, loadType, loadMode, hybridLoads, loadIntensity, elasticModulus, crossSectionType, sectionProps, beamResult, reliability, validation, displayUnits, isImperial, convertForceToDisplay, getDisplayForceUnit]);

  const getBeamCSVData = useCallback(() => diagramData.map(p => ({
    position_m: p.x, shear_kn: p.shear, moment_knm: p.moment, deflection_mm: p.deflection * 1000,
  })), [diagramData]);

  return {
    ctx,
    // Core state
    beamType, setBeamType, loadType, setLoadType, loadMode, setLoadMode,
    hybridLoads, setHybridLoads, loadIntensity, setLoadIntensity,
    beamLength, setBeamLength, yieldStrength, setYieldStrength,
    strengthCOV, setStrengthCOV, loadCOV, setLoadCOV,
    elasticModulus, setElasticModulus,
    // Units
    unitSystem, setUnitSystem, forceUnit, setForceUnit,
    distributedForceUnit, setDistributedForceUnit, lengthUnit, setLengthUnit,
    convertForceToDisplay, convertForceFromDisplay,
    convertLengthToDisplay, convertLengthFromDisplay, getDisplayForceUnit,
    isImperial, dimFactor, dimUnit, dimToInternal, displayUnits,
    // Supports
    supports, setSupports, showSupportEditor, setShowSupportEditor,
    forceAngle, setForceAngle,
    // Cross-section
    crossSectionType, setCrossSectionType,
    sectionWidth, setSectionWidth, sectionHeight, setSectionHeight,
    sectionDiameter, setSectionDiameter, innerDiameter, setInnerDiameter,
    innerWidth, setInnerWidth, innerHeight, setInnerHeight,
    flangeWidth, setFlangeWidth, flangeThickness, setFlangeThickness,
    webThickness, setWebThickness, sectionProps,
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
    hasMovingLoad, loadMarkers, influenceEffects, loadContributions,
    // Export
    getBeamReportData, getBeamCSVData,
  };
}
