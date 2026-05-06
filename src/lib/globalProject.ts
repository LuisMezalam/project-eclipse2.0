import type { SharedParametersContextValue } from "@/contexts/SharedParametersContext";
import { reliabilityAnalysis } from "@/lib/reliability";
import type { ReportSection } from "@/lib/exportUtils";

export interface GlobalProjectSnapshot {
  id: string;
  name: string;
  savedAt: string;
  loadMean: number;
  loadVariance: number;
  loadSkewness: number;
  loadKurtosis: number;
  beamLength: number;
  resistanceMean: number;
  resistanceCoV: number;
  loadCoV: number;
  derivedStressMean: number;
  derivedStressCoV: number;
  activeTab: string;
  beta: number;
  pf: number;
}

export interface RiskDriver {
  label: string;
  score: number;
  description: string;
  action: string;
}

export function buildGlobalSnapshot(ctx: SharedParametersContextValue, name: string): GlobalProjectSnapshot {
  const demandMpa = ctx.derivedStressMean / 1e6;
  const reliability = reliabilityAnalysis(ctx.resistanceMean, ctx.resistanceCoV, demandMpa, ctx.derivedStressCoV);

  return {
    id: crypto.randomUUID(),
    name,
    savedAt: new Date().toISOString(),
    loadMean: ctx.loadMean,
    loadVariance: ctx.loadVariance,
    loadSkewness: ctx.loadSkewness,
    loadKurtosis: ctx.loadKurtosis,
    beamLength: ctx.beamLength,
    resistanceMean: ctx.resistanceMean,
    resistanceCoV: ctx.resistanceCoV,
    loadCoV: ctx.loadCoV,
    derivedStressMean: ctx.derivedStressMean,
    derivedStressCoV: ctx.derivedStressCoV,
    activeTab: ctx.activeTab,
    beta: reliability.beta,
    pf: reliability.pf,
  };
}

export function applyGlobalSnapshot(ctx: SharedParametersContextValue, snapshot: GlobalProjectSnapshot) {
  ctx.setLoadMean(snapshot.loadMean);
  ctx.setLoadVariance(snapshot.loadVariance);
  ctx.setLoadSkewness(snapshot.loadSkewness);
  ctx.setLoadKurtosis(snapshot.loadKurtosis);
  ctx.setBeamLength(snapshot.beamLength);
  ctx.setResistanceMean(snapshot.resistanceMean);
  ctx.setResistanceCoV(snapshot.resistanceCoV);
  ctx.setActiveTab(snapshot.activeTab);
  ctx.setSyncEnabled(true);
  ctx.setCrossRefOpen(true);
}

export function getGlobalRiskDrivers(snapshot: GlobalProjectSnapshot): RiskDriver[] {
  const spanScore = Math.min(100, (snapshot.beamLength / 12) * 100);
  const loadVarianceScore = Math.min(100, snapshot.loadCoV * 260);
  const resistanceScore = Math.min(100, snapshot.resistanceCoV * 420);
  const demandRatio = snapshot.resistanceMean > 0 ? (snapshot.derivedStressMean / 1e6) / snapshot.resistanceMean : 1;
  const demandScore = Math.min(100, demandRatio * 100);
  const tailScore = Math.min(100, Math.max(0, (snapshot.loadKurtosis - 3) * 22 + Math.abs(snapshot.loadSkewness) * 18));

  return [
    {
      label: "Demand / resistance ratio",
      score: demandScore,
      description: "Compares derived stress demand against resistance mean.",
      action: "Reduce demand, increase section capacity, or raise resistance mean.",
    },
    {
      label: "Load uncertainty",
      score: loadVarianceScore,
      description: "Captures the coefficient of variation coming from shared load moments.",
      action: "Improve load characterization or reduce demand variability.",
    },
    {
      label: "Resistance uncertainty",
      score: resistanceScore,
      description: "Captures material, detailing, and capacity uncertainty.",
      action: "Tighten material controls, inspection assumptions, or capacity model uncertainty.",
    },
    {
      label: "Span amplification",
      score: spanScore,
      description: "Beam demand scales strongly with span in the shared framework.",
      action: "Shorten effective span, add support, or increase section stiffness.",
    },
    {
      label: "Tail behavior",
      score: tailScore,
      description: "Skewness and kurtosis indicate whether tails may be heavier than a normal approximation.",
      action: "Use non-normal distributions or simulation when tail metrics are high.",
    },
  ].sort((a, b) => b.score - a.score);
}

export function formatGlobalPf(value: number) {
  return value < 0.001 ? value.toExponential(2) : `${(value * 100).toFixed(3)}%`;
}

export function globalReportSections(current: GlobalProjectSnapshot, saved: GlobalProjectSnapshot[]): ReportSection[] {
  const drivers = getGlobalRiskDrivers(current);

  return [
    {
      title: "Whole-System Scenario",
      description: "Unified state shared across reliability, static, truss, moments, dynamic, distributions, inference, and advanced analysis tabs.",
      data: [
        { label: "Project", value: current.name },
        { label: "Active tab", value: current.activeTab },
        { label: "Reliability beta", value: current.beta, precision: 3 },
        { label: "Probability of failure", value: formatGlobalPf(current.pf) },
      ],
    },
    {
      title: "Shared Parameters",
      data: [
        { label: "Mean load", value: current.loadMean, unit: "kN/m", precision: 2 },
        { label: "Load variance", value: current.loadVariance, unit: "(kN/m)^2", precision: 2 },
        { label: "Load CoV", value: current.loadCoV, precision: 4 },
        { label: "Skewness", value: current.loadSkewness, precision: 3 },
        { label: "Kurtosis", value: current.loadKurtosis, precision: 3 },
        { label: "Beam length", value: current.beamLength, unit: "m", precision: 2 },
        { label: "Resistance mean", value: current.resistanceMean, unit: "MPa", precision: 2 },
        { label: "Resistance CoV", value: current.resistanceCoV, precision: 4 },
      ],
    },
    {
      title: "Risk Drivers",
      table: {
        headers: ["Driver", "Score", "Reason", "Action"],
        rows: drivers.map((driver) => [
          driver.label,
          driver.score.toFixed(0),
          driver.description,
          driver.action,
        ]),
      },
    },
    {
      title: "Saved Scenario Comparison",
      table: {
        headers: ["Scenario", "Saved", "Load", "Span", "Resistance", "Beta", "Pf"],
        rows: [current, ...saved].slice(0, 8).map((item) => [
          item.name,
          item.id === current.id ? "Current" : new Date(item.savedAt).toLocaleString(),
          item.loadMean.toFixed(2),
          item.beamLength.toFixed(2),
          item.resistanceMean.toFixed(1),
          item.beta.toFixed(3),
          formatGlobalPf(item.pf),
        ]),
      },
    },
  ];
}
