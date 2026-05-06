import {
  getCapability,
  type CapabilityLevel,
} from "@/lib/beamCapability";
import type {
  BeamAnalysis,
  BeamType,
  CrossSectionDimensions,
  CrossSectionProperties,
  CrossSectionType,
  LoadConfig,
  LoadType,
  ReliabilityResult,
} from "@/lib/reliability";

export type BeamValidationSeverity = "info" | "warning" | "critical";
export type BeamValidationStatus = "ready" | "watch" | "critical";

export interface BeamValidationIssue {
  severity: BeamValidationSeverity;
  title: string;
  detail: string;
}

export interface BeamValidationSummary {
  status: BeamValidationStatus;
  statusLabel: string;
  solverLevel: CapabilityLevel;
  solverLabel: string;
  solverNote: string;
  issues: BeamValidationIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  stressUtilization: number;
  deflectionRatio: number;
  reliabilityBeta: number;
  probabilityOfFailure: number;
  safetyFactor: number;
}

interface BeamValidationInput {
  beamType: BeamType;
  effectiveBeamType: BeamType;
  loadType: LoadType;
  loadMode: "single" | "hybrid";
  loadConfig: LoadConfig;
  effectiveLoadConfig: LoadConfig;
  hybridLoads: LoadConfig[];
  effectiveHybridLoads: LoadConfig[];
  beamLength: number;
  crossSectionType: CrossSectionType;
  crossSectionDims: CrossSectionDimensions;
  sectionProps: CrossSectionProperties;
  beamResult: BeamAnalysis;
  yieldStrength: number;
  strengthCOV: number;
  loadCOV: number;
  reliability: ReliabilityResult;
}

const levelRank: Record<CapabilityLevel, number> = {
  exact: 0,
  envelope: 1,
  approximate: 2,
  planned: 3,
};

const solverLabels: Record<CapabilityLevel, string> = {
  exact: "Direct closed-form",
  envelope: "Envelope sweep",
  approximate: "Screening approximation",
  planned: "Roadmap solver",
};

const finitePositive = (value: number) => Number.isFinite(value) && value > 0;
const withinUnitSpan = (value: number | undefined) => value === undefined || (value >= 0 && value <= 1);

function addIssue(
  issues: BeamValidationIssue[],
  severity: BeamValidationSeverity,
  title: string,
  detail: string,
) {
  issues.push({ severity, title, detail });
}

function validateLoadRange(issues: BeamValidationIssue[], load: LoadConfig, label: string) {
  if (!Number.isFinite(load.intensity)) {
    addIssue(issues, "critical", `${label} intensity is invalid`, "Load intensity must be a finite number before results can be trusted.");
  } else if (Math.abs(load.intensity) < 1e-9) {
    addIssue(issues, "warning", `${label} has zero intensity`, "The current load contributes no demand to shear, moment, deflection, or reliability.");
  }

  if (!withinUnitSpan(load.position) || !withinUnitSpan(load.movingStep) || !withinUnitSpan(load.startPosition) || !withinUnitSpan(load.endPosition)) {
    addIssue(issues, "critical", `${label} position is outside the span`, "Positions must stay between 0 and 1 times the beam length.");
  }

  if ((load.type === "partial-udl" || load.type === "patch") && (load.startPosition ?? 0) >= (load.endPosition ?? 1)) {
    addIssue(issues, "critical", `${label} range is reversed`, "The load start must be less than the load end.");
  }

  if (load.type === "triangular" && (load.triStartPosition ?? 0) >= (load.triEndPosition ?? 1)) {
    addIssue(issues, "warning", `${label} triangular base is collapsed`, "The custom triangular base should have a positive length.");
  }

  if ((load.type === "moving" || load.type === "axle-train") && ((load.movingStep ?? 0.5) <= 0.02 || (load.movingStep ?? 0.5) >= 0.98)) {
    addIssue(issues, "info", `${label} is near a support`, "Demand can drop sharply near supports, so reliability may change quickly as the load moves.");
  }
}

function getHybridSolverLevel(beamType: BeamType, loads: LoadConfig[]): CapabilityLevel {
  if (loads.length === 0) return "planned";
  return loads.reduce<CapabilityLevel>((worst, load) => {
    const level = getCapability(beamType, load.type).level;
    return levelRank[level] > levelRank[worst] ? level : worst;
  }, "exact");
}

export function validateBeamAnalysis(input: BeamValidationInput): BeamValidationSummary {
  const issues: BeamValidationIssue[] = [];
  const activeCapability = getCapability(input.beamType, input.loadType);
  const solverLevel = input.loadMode === "hybrid"
    ? getHybridSolverLevel(input.beamType, input.hybridLoads)
    : activeCapability.level;
  const solverNote = input.loadMode === "hybrid"
    ? `${input.hybridLoads.length} load component(s) checked against the capability matrix.`
    : activeCapability.note;

  if (solverLevel === "approximate") {
    addIssue(issues, "warning", "Approximate solver route", solverNote);
  } else if (solverLevel === "envelope") {
    addIssue(issues, "info", "Envelope route active", solverNote);
  } else if (solverLevel === "planned") {
    addIssue(issues, "warning", "Roadmap solver route", "This case is currently routed through an equivalent screening model and should be treated as preliminary.");
  }

  if (input.effectiveBeamType !== input.beamType) {
    addIssue(issues, "warning", "Equivalent beam idealization", `The selected beam is analyzed through the ${input.effectiveBeamType} solver path.`);
  }

  if (input.loadMode === "single" && input.effectiveLoadConfig.type !== input.loadConfig.type) {
    addIssue(issues, "warning", "Equivalent load model", `The selected load is reduced to a ${input.effectiveLoadConfig.type} model for calculation.`);
  }

  if (input.loadMode === "hybrid") {
    if (input.hybridLoads.length === 0) {
      addIssue(issues, "warning", "Hybrid load case is empty", "Add at least one load component or return to single-load mode.");
    }
    const equivalentLoads = input.hybridLoads.filter((load, index) => input.effectiveHybridLoads[index]?.type !== load.type).length;
    if (equivalentLoads > 0) {
      addIssue(issues, "warning", "Hybrid equivalent loads active", `${equivalentLoads} load component(s) are converted to simpler calculation models.`);
    }
  }

  const loads = input.loadMode === "hybrid" ? input.hybridLoads : [input.loadConfig];
  loads.forEach((load, index) => validateLoadRange(issues, load, input.loadMode === "hybrid" ? `Load ${index + 1}` : "Load"));

  if (!finitePositive(input.beamLength)) {
    addIssue(issues, "critical", "Beam length is invalid", "Beam length must be greater than zero.");
  }

  if (!finitePositive(input.yieldStrength)) {
    addIssue(issues, "critical", "Yield strength is invalid", "Yield strength must be greater than zero.");
  }

  const { crossSectionDims: dims } = input;
  if (input.crossSectionType === "hollow-circular" && (dims.innerDiameter ?? 0) >= (dims.diameter ?? 0)) {
    addIssue(issues, "critical", "Pipe wall geometry is invalid", "Inner diameter must be smaller than the outer diameter.");
  }
  if (input.crossSectionType === "hollow-rectangular" && ((dims.innerWidth ?? 0) >= (dims.width ?? 0) || (dims.innerHeight ?? 0) >= (dims.height ?? 0))) {
    addIssue(issues, "critical", "Tube wall geometry is invalid", "Inner width and height must remain inside the outer section.");
  }
  if (input.crossSectionType === "i-beam") {
    if (2 * (dims.flangeThickness ?? 0) >= (dims.height ?? 0)) {
      addIssue(issues, "critical", "I-beam flange geometry is invalid", "Two flange thicknesses must be smaller than the total beam depth.");
    }
    if ((dims.webThickness ?? 0) > (dims.flangeWidth ?? 0)) {
      addIssue(issues, "warning", "I-beam web is wider than flange", "This produces unusual section behavior and may indicate an input mistake.");
    }
  }

  if (!finitePositive(input.sectionProps.area) || !finitePositive(input.sectionProps.momentOfInertia) || !finitePositive(input.sectionProps.sectionModulus)) {
    addIssue(issues, "critical", "Section properties are invalid", "Area, moment of inertia, and section modulus must all be positive finite values.");
  }

  const stressMpa = Math.abs(input.beamResult.maxStress) / 1e6;
  const stressUtilization = input.yieldStrength > 0 ? stressMpa / input.yieldStrength : Number.POSITIVE_INFINITY;
  const serviceLimit = input.beamLength / 250;
  const deflectionRatio = serviceLimit > 0 ? Math.abs(input.beamResult.maxDeflection) / serviceLimit : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(stressUtilization)) {
    addIssue(issues, "critical", "Stress demand is invalid", "Stress utilization could not be calculated from the current section and material.");
  } else if (stressUtilization >= 1) {
    addIssue(issues, "critical", "Yield stress exceeded", "Demand stress is greater than the selected yield strength.");
  } else if (stressUtilization >= 0.9) {
    addIssue(issues, "warning", "Stress is near yield", "Demand stress is above 90% of the selected yield strength.");
  } else if (stressUtilization >= 0.75) {
    addIssue(issues, "info", "High stress utilization", "Demand stress is above 75% of the selected yield strength.");
  }

  if (Number.isFinite(deflectionRatio) && deflectionRatio >= 1) {
    addIssue(issues, "warning", "Service deflection limit exceeded", "Maximum deflection is greater than the L/250 service check.");
  } else if (Number.isFinite(deflectionRatio) && deflectionRatio >= 0.7) {
    addIssue(issues, "info", "Service deflection is elevated", "Maximum deflection is above 70% of the L/250 check.");
  }

  if (!Number.isFinite(input.reliability.beta) || !Number.isFinite(input.reliability.pf)) {
    addIssue(issues, "critical", "Reliability result is invalid", "FORM beta and Pf must be finite before risk can be interpreted.");
  } else {
    if (input.reliability.pf > 1e-2 || input.reliability.centralSafetyFactor < 1) {
      addIssue(issues, "critical", "Failure probability is high", "Pf is above 1e-2 or the central safety factor is below 1.0.");
    } else if (input.reliability.pf > 1e-3 || input.reliability.beta < 3) {
      addIssue(issues, "warning", "Reliability index is low", "Beta below 3.0 or Pf above 1e-3 should be reviewed before design use.");
    }
  }

  if (input.loadCOV > 0.35) {
    addIssue(issues, "warning", "Load uncertainty is high", "Load CoV above 35% can make FORM/SORM tail estimates sensitive.");
  }
  if (input.strengthCOV > 0.18) {
    addIssue(issues, "warning", "Resistance uncertainty is high", "Strength CoV above 18% can materially reduce beta and safety margin.");
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;
  const status: BeamValidationStatus = criticalCount > 0 ? "critical" : warningCount > 0 ? "watch" : "ready";
  const statusLabel = status === "ready" ? "Ready" : status === "watch" ? "Review" : "Needs attention";

  return {
    status,
    statusLabel,
    solverLevel,
    solverLabel: solverLabels[solverLevel],
    solverNote,
    issues,
    criticalCount,
    warningCount,
    infoCount,
    stressUtilization,
    deflectionRatio,
    reliabilityBeta: input.reliability.beta,
    probabilityOfFailure: input.reliability.pf,
    safetyFactor: input.reliability.centralSafetyFactor,
  };
}
