import type { BeamType, LoadType } from "@/lib/reliability";

export type CapabilityLevel = "exact" | "approximate" | "envelope" | "planned";

export interface BeamCapabilityCell {
  level: CapabilityLevel;
  note: string;
}

export interface BeamCapabilityRow {
  beamType: BeamType;
  label: string;
  loads: Partial<Record<LoadType, BeamCapabilityCell>>;
}

export interface LoadCombinationPreset {
  id: string;
  standard: "LRFD" | "ASD" | "Service";
  name: string;
  expression: string;
  factors: Record<string, number>;
  useCase: string;
}

export const beamTypeLabels: Record<BeamType, string> = {
  "simply-supported": "Simply supported",
  cantilever: "Cantilever",
  "fixed-fixed": "Fixed-fixed",
  "propped-cantilever": "Propped cantilever",
  overhanging: "Overhanging",
  continuous: "Continuous 2-span",
  "multi-span": "Arbitrary multi-span",
  gerber: "Gerber/internal hinge",
  "elastic-foundation": "Elastic foundation",
  "spring-supported": "Spring-supported",
  settlement: "Support settlement beam",
  tapered: "Tapered/non-prismatic",
  "beam-column": "Beam-column",
  composite: "Composite beam",
};

export const loadTypeLabels: Record<LoadType, string> = {
  udl: "UDL",
  concentrated: "Point",
  triangular: "Triangular",
  moving: "Moving point",
  "partial-udl": "Partial UDL",
  trapezoidal: "Trapezoidal",
  moment: "Applied moment",
  parabolic: "Parabolic",
  parametric: "Parametric",
  "axle-train": "Axle train",
  "support-settlement": "Settlement",
  "thermal-gradient": "Thermal",
  prestress: "Prestress",
  patch: "Patch",
  torsional: "Torsion",
  "snow-drift": "Snow drift",
  hydrostatic: "Hydrostatic",
  "construction-stage": "Stage",
  "harmonic-equivalent": "Harmonic eq.",
};

const exact = (note: string): BeamCapabilityCell => ({ level: "exact", note });
const approximate = (note: string): BeamCapabilityCell => ({ level: "approximate", note });
const envelope = (note: string): BeamCapabilityCell => ({ level: "envelope", note });
const planned = (note: string): BeamCapabilityCell => ({ level: "planned", note });

const directPrismaticLoads: Partial<Record<LoadType, BeamCapabilityCell>> = {
  udl: exact("Uniform distributed load solved with the selected supports."),
  concentrated: exact("Point load position is included directly in the beam model."),
  triangular: exact("Triangular load distribution is integrated over its configured range."),
  moving: envelope("Moving point positions are swept through the finite-element model."),
  "partial-udl": exact("Partial load boundaries are included directly in the model."),
  trapezoidal: exact("Linear load variation is integrated over the beam."),
  moment: exact("Applied couple and support reactions are included in the model."),
  parabolic: exact("Parabolic load distribution is integrated over the beam."),
};

const equivalentLoads: Partial<Record<LoadType, BeamCapabilityCell>> = {
  parametric: approximate("Parametric loads are converted to a linear trapezoidal load."),
  "axle-train": approximate("Axle train is represented by one equivalent moving point load."),
  "support-settlement": approximate("Support movement is represented by an equivalent applied moment."),
  "thermal-gradient": approximate("Thermal curvature is represented by an equivalent applied moment."),
  prestress: approximate("Prestress is represented by an equivalent uplift load."),
  patch: approximate("Patch contact is represented by a partial distributed load."),
  torsional: approximate("Torsion is represented by an equivalent vertical point load."),
  "snow-drift": approximate("Snow drift is represented by a triangular load."),
  hydrostatic: approximate("Hydrostatic pressure is represented by a triangular load."),
  "construction-stage": approximate("Construction stage is represented by an equivalent UDL."),
  "harmonic-equivalent": approximate("Dynamic demand is represented by a static-equivalent point load."),
};

const directBeamRow = (beamType: BeamType, label: string): BeamCapabilityRow => ({
  beamType,
  label,
  loads: { ...directPrismaticLoads, ...equivalentLoads },
});

const approximateBeamRow = (beamType: BeamType, label: string, modelNote: string): BeamCapabilityRow => ({
  beamType,
  label,
  loads: {
    udl: approximate(modelNote),
    concentrated: approximate(modelNote),
    triangular: approximate(modelNote),
    moving: approximate(modelNote),
    "partial-udl": approximate(modelNote),
    trapezoidal: approximate(modelNote),
    moment: approximate(modelNote),
    parabolic: approximate(modelNote),
    ...equivalentLoads,
  },
});

export const beamCapabilityMatrix: BeamCapabilityRow[] = [
  directBeamRow("simply-supported", beamTypeLabels["simply-supported"]),
  directBeamRow("cantilever", beamTypeLabels.cantilever),
  directBeamRow("fixed-fixed", beamTypeLabels["fixed-fixed"]),
  directBeamRow("propped-cantilever", beamTypeLabels["propped-cantilever"]),
  directBeamRow("overhanging", beamTypeLabels.overhanging),
  directBeamRow("continuous", beamTypeLabels.continuous),
  directBeamRow("multi-span", beamTypeLabels["multi-span"]),
  directBeamRow("gerber", beamTypeLabels.gerber),
  approximateBeamRow("elastic-foundation", beamTypeLabels["elastic-foundation"], "Foundation stiffness between discrete supports is not modeled."),
  approximateBeamRow("spring-supported", beamTypeLabels["spring-supported"], "Spring support stiffness is idealized as fixed or pinned restraints."),
  approximateBeamRow("settlement", beamTypeLabels.settlement, "Support settlement uses an equivalent load instead of imposed displacement."),
  approximateBeamRow("tapered", beamTypeLabels.tapered, "Section stiffness is assumed constant along the span."),
  approximateBeamRow("beam-column", beamTypeLabels["beam-column"], "Geometric P–Δ and axial interaction are not included."),
  approximateBeamRow("composite", beamTypeLabels.composite, "Composite action is represented by the selected section properties."),
];
export const loadCombinationPresets: LoadCombinationPreset[] = [
  {
    id: "lrfd-strength-gravity",
    standard: "LRFD",
    name: "Strength gravity",
    expression: "1.2D + 1.6L + 0.5S",
    factors: { D: 1.2, L: 1.6, S: 0.5 },
    useCase: "Common strength check where live load governs.",
  },
  {
    id: "lrfd-wind",
    standard: "LRFD",
    name: "Wind strength",
    expression: "1.2D + 1.0W + 1.0L + 0.5S",
    factors: { D: 1.2, W: 1.0, L: 1.0, S: 0.5 },
    useCase: "Member strength with wind present.",
  },
  {
    id: "lrfd-seismic",
    standard: "LRFD",
    name: "Seismic strength",
    expression: "1.2D + 1.0E + 1.0L + 0.2S",
    factors: { D: 1.2, E: 1.0, L: 1.0, S: 0.2 },
    useCase: "Seismic strength screening.",
  },
  {
    id: "asd-service",
    standard: "ASD",
    name: "Service gravity",
    expression: "D + L",
    factors: { D: 1.0, L: 1.0 },
    useCase: "Serviceability deflection and stress checks.",
  },
  {
    id: "service-deflection",
    standard: "Service",
    name: "Deflection service",
    expression: "D + 0.5L",
    factors: { D: 1.0, L: 0.5 },
    useCase: "Long-term or sustained serviceability screening.",
  },
];

export function getCapability(beamType: BeamType, loadType: LoadType): BeamCapabilityCell {
  return beamCapabilityMatrix.find((row) => row.beamType === beamType)?.loads[loadType] ?? planned("Combination is not currently documented.");
}
