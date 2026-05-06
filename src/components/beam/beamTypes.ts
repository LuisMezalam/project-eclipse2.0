/**
 * Shared types, constants, and helpers for the beam analysis module.
 */

import {
  BeamType,
  LoadType,
  CrossSectionType,
} from "@/lib/reliability";

// ─── Unit system ──────────────────────────────────────────────
export type UnitSystem = "metric" | "imperial";
export type ForceUnit = "N" | "kN" | "MN" | "lbf" | "kip";
export type DistributedForceUnit = "N/m" | "kN/m" | "MN/m" | "lbf/ft" | "kip/ft";
export type LengthUnit = "m" | "mm" | "ft" | "in";

// ─── Support ──────────────────────────────────────────────────
export type SupportType = "pin" | "roller" | "fixed" | "hinge" | "none";

export interface Support {
  position: number; // 0-1 ratio along beam
  type: SupportType;
}

// ─── Conversion tables ───────────────────────────────────────
export const forceConversions: Record<ForceUnit, number> = {
  N: 1,
  kN: 1000,
  MN: 1000000,
  lbf: 4.44822,
  kip: 4448.22,
};

export const distributedForceConversions: Record<DistributedForceUnit, number> = {
  "N/m": 1,
  "kN/m": 1000,
  "MN/m": 1000000,
  "lbf/ft": 14.5939,
  "kip/ft": 14593.9,
};

export const lengthConversions: Record<LengthUnit, number> = {
  m: 1,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
};

// ─── Label helpers ────────────────────────────────────────────
export const getLoadTypeLabel = (type: LoadType): string => {
  const map: Record<LoadType, string> = {
    udl: "Uniform Distributed Load (UDL)",
    concentrated: "Concentrated Point Load",
    triangular: "Triangular Distributed Load",
    moving: "Moving Load",
    "partial-udl": "Partial Uniform Load",
    trapezoidal: "Trapezoidal Load",
    moment: "Applied Moment",
    parabolic: "Parabolic Load",
    parametric: "Parametric Load f(x)",
    "axle-train": "Vehicle Axle Train",
    "support-settlement": "Support Settlement",
    "thermal-gradient": "Thermal Gradient",
    prestress: "Prestress / PT Equivalent",
    patch: "Patch / Wheel Contact Load",
    torsional: "Eccentric / Torsional Load",
    "snow-drift": "Snow Drift Load",
    hydrostatic: "Hydrostatic / Soil Pressure",
    "construction-stage": "Construction Stage Load",
    "harmonic-equivalent": "Harmonic Static-Equivalent Load",
  };
  return map[type] ?? "Load";
};

export const getBeamTypeLabel = (type: BeamType): string => {
  const map: Record<BeamType, string> = {
    "simply-supported": "Simply Supported",
    cantilever: "Cantilever",
    "fixed-fixed": "Fixed-Fixed",
    "propped-cantilever": "Propped Cantilever",
    overhanging: "Overhanging",
    continuous: "Continuous (2-Span)",
    "multi-span": "Arbitrary Multi-Span",
    gerber: "Gerber / Internal Hinge",
    "elastic-foundation": "Beam on Elastic Foundation",
    "spring-supported": "Spring-Supported Beam",
    settlement: "Support Settlement Beam",
    tapered: "Tapered / Non-Prismatic Beam",
    "beam-column": "Beam-Column",
    composite: "Composite Beam",
  };
  return map[type] ?? "Beam";
};

export const getCrossSectionLabel = (type: CrossSectionType): string => {
  const map: Record<CrossSectionType, string> = {
    rectangular: "Rectangular",
    circular: "Circular",
    "hollow-rectangular": "Hollow Rectangular",
    "hollow-circular": "Hollow Circular (Pipe)",
    "i-beam": "I-Beam / Wide Flange",
  };
  return map[type];
};

export const isDistributedLoad = (type: LoadType): boolean =>
  type === "udl" ||
  type === "triangular" ||
  type === "partial-udl" ||
  type === "trapezoidal" ||
  type === "parabolic" ||
  type === "parametric" ||
  type === "snow-drift" ||
  type === "hydrostatic" ||
  type === "construction-stage" ||
  type === "prestress" ||
  type === "patch";

export const getLoadUnit = (type: LoadType): string => {
  if (type === "support-settlement" || type === "thermal-gradient") return "kN-m";
  if (type === "moment") return "kN·m";
  return isDistributedLoad(type) ? "kN/m" : "kN";
};

// ─── Color palette for hybrid load markers ────────────────────
export const loadColors = [
  "hsl(142 71% 45%)",
  "hsl(340 82% 52%)",
  "hsl(45 93% 47%)",
  "hsl(199 89% 48%)",
  "hsl(262 83% 58%)",
  "hsl(16 85% 57%)",
  "hsl(173 80% 40%)",
  "hsl(291 64% 42%)",
];

// ─── Tooltip style ────────────────────────────────────────────
export const chartTooltipStyle = {
  backgroundColor: "hsl(222 47% 9%)",
  border: "1px solid hsl(217 33% 20%)",
  borderRadius: "8px",
  color: "hsl(210 40% 96%)",
};
