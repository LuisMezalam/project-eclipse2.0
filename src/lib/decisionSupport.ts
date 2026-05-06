import { reliabilityAnalysis, type ReliabilityResult } from "@/lib/reliability";
import type { ReportSection } from "@/lib/exportUtils";

export interface DecisionScenario {
  projectName: string;
  meanR: number;
  covR: number;
  meanS: number;
  covS: number;
  correlation: number;
  degradationRate: number;
  serviceYears: number;
  targetBeta: number;
  unit: string;
}

export interface DecisionPreset extends DecisionScenario {
  category: string;
  notes: string;
}

export interface SensitivityItem {
  label: string;
  key: keyof DecisionScenario;
  swing: number;
  score: number;
  direction: string;
}

export interface OptimizationAction {
  title: string;
  detail: string;
  value: number;
}

export interface OptimizationPlan {
  met: boolean;
  summary: string;
  actions: OptimizationAction[];
}

export const decisionPresets: DecisionPreset[] = [
  {
    category: "Building frame",
    projectName: "Steel beam flexure",
    meanR: 520,
    covR: 0.09,
    meanS: 310,
    covS: 0.16,
    correlation: 0.05,
    degradationRate: 0.006,
    serviceYears: 25,
    targetBeta: 3.5,
    unit: "MPa",
    notes: "Strength-controlled member with moderate live-load uncertainty.",
  },
  {
    category: "Bridge",
    projectName: "Bridge truss member",
    meanR: 390,
    covR: 0.11,
    meanS: 245,
    covS: 0.2,
    correlation: 0.18,
    degradationRate: 0.01,
    serviceYears: 35,
    targetBeta: 4,
    unit: "MPa",
    notes: "Aging member with inspection-driven degradation concerns.",
  },
  {
    category: "Offshore",
    projectName: "Offshore brace fatigue",
    meanR: 165,
    covR: 0.18,
    meanS: 112,
    covS: 0.28,
    correlation: 0.22,
    degradationRate: 0.018,
    serviceYears: 20,
    targetBeta: 3.2,
    unit: "MPa",
    notes: "High environmental uncertainty and time-dependent capacity loss.",
  },
  {
    category: "Aerospace",
    projectName: "Aerospace bracket",
    meanR: 720,
    covR: 0.055,
    meanS: 475,
    covS: 0.1,
    correlation: 0.02,
    degradationRate: 0.002,
    serviceYears: 10,
    targetBeta: 4.5,
    unit: "MPa",
    notes: "Tight manufacturing controls with high target reliability.",
  },
];

export function effectiveScenario(scenario: DecisionScenario): DecisionScenario {
  const degradationFactor = Math.max(0.35, 1 - scenario.degradationRate * scenario.serviceYears);
  return {
    ...scenario,
    meanR: scenario.meanR * degradationFactor,
  };
}

export function analyzeDecisionScenario(scenario: DecisionScenario): ReliabilityResult {
  const adjusted = effectiveScenario(scenario);
  return reliabilityAnalysis(adjusted.meanR, adjusted.covR, adjusted.meanS, adjusted.covS);
}

export function riskLabel(pf: number): "Very Low" | "Low" | "Moderate" | "High" {
  if (pf < 1e-6) return "Very Low";
  if (pf < 1e-4) return "Low";
  if (pf < 1e-2) return "Moderate";
  return "High";
}

export function assumptionLedger(scenario: DecisionScenario): Array<[string, string]> {
  const adjusted = effectiveScenario(scenario);
  return [
    ["Limit state", "g(X) = R - S; failure occurs when load effect exceeds resistance."],
    ["Distribution model", "Normal resistance and load variables using FORM/SORM style reliability metrics."],
    ["Resistance", `Mean ${scenario.meanR.toFixed(2)} ${scenario.unit}; COV ${scenario.covR.toFixed(3)}.`],
    ["Load effect", `Mean ${scenario.meanS.toFixed(2)} ${scenario.unit}; COV ${scenario.covS.toFixed(3)}.`],
    ["Time dependency", `${(scenario.degradationRate * 100).toFixed(2)}% annual resistance degradation over ${scenario.serviceYears} years.`],
    ["Effective resistance", `${adjusted.meanR.toFixed(2)} ${scenario.unit} after degradation adjustment.`],
    ["Correlation note", `Correlation coefficient ${scenario.correlation.toFixed(2)} is documented for review; base FORM calculator currently treats R and S as independent.`],
    ["Target reliability", `Target beta ${scenario.targetBeta.toFixed(2)}.`],
  ];
}

export function sensitivityRanking(scenario: DecisionScenario): SensitivityItem[] {
  const basePf = analyzeDecisionScenario(scenario).pf || 1;
  const variables: Array<[string, keyof DecisionScenario, number]> = [
    ["Resistance mean", "meanR", 0.1],
    ["Resistance COV", "covR", 0.1],
    ["Load mean", "meanS", 0.1],
    ["Load COV", "covS", 0.1],
    ["Degradation rate", "degradationRate", 0.2],
  ];

  return variables
    .map(([label, key, step]) => {
      const raw = scenario[key];
      if (typeof raw !== "number") {
        return null;
      }

      const up = { ...scenario, [key]: raw * (1 + step) };
      const down = { ...scenario, [key]: raw * (1 - step) };
      const upPf = analyzeDecisionScenario(up).pf;
      const downPf = analyzeDecisionScenario(down).pf;
      const swing = Math.abs(upPf - downPf);

      return {
        label,
        key,
        swing,
        score: swing / basePf,
        direction: upPf > downPf ? "Increasing raises risk" : "Increasing lowers risk",
      };
    })
    .filter((item): item is SensitivityItem => Boolean(item))
    .sort((a, b) => b.swing - a.swing);
}

export function targetOptimization(scenario: DecisionScenario): OptimizationPlan {
  const result = analyzeDecisionScenario(scenario);
  const gap = scenario.targetBeta - result.beta;
  if (gap <= 0) {
    return {
      met: true,
      summary: `Target beta ${scenario.targetBeta.toFixed(2)} is already met.`,
      actions: [],
    };
  }

  const neededMeanResistance = scenario.meanS + scenario.targetBeta * result.stdSafetyMargin;
  const degradationFactor = Math.max(0.35, 1 - scenario.degradationRate * scenario.serviceYears);
  const extraResistance = Math.max(0, neededMeanResistance / degradationFactor - scenario.meanR);
  const allowableLoad = effectiveScenario(scenario).meanR - scenario.targetBeta * result.stdSafetyMargin;
  const loadReduction = Math.max(0, scenario.meanS - allowableLoad);
  const covReduction = Math.max(0, scenario.covR - scenario.covR * result.beta / scenario.targetBeta);

  return {
    met: false,
    summary: `Close a beta gap of ${gap.toFixed(2)} to reach target reliability.`,
    actions: [
      {
        title: "Increase nominal resistance",
        detail: `Raise resistance mean by about ${extraResistance.toFixed(1)} ${scenario.unit}.`,
        value: extraResistance,
      },
      {
        title: "Reduce mean load effect",
        detail: `Lower mean load by about ${loadReduction.toFixed(1)} ${scenario.unit}.`,
        value: loadReduction,
      },
      {
        title: "Tighten resistance variability",
        detail: `Reduce resistance COV by about ${covReduction.toFixed(3)} through QA, inspection, or material controls.`,
        value: covReduction,
      },
    ].sort((a, b) => b.value - a.value),
  };
}

export function decisionReportSections(scenario: DecisionScenario): ReportSection[] {
  const result = analyzeDecisionScenario(scenario);
  const optimization = targetOptimization(scenario);

  return [
    {
      title: "Decision Support Summary",
      description: "Project-level reliability interpretation and target check.",
      data: [
        { label: "Project", value: scenario.projectName },
        { label: "Reliability Index (Beta)", value: result.beta, precision: 4 },
        { label: "Probability of Failure", value: result.pf, precision: 6 },
        { label: "Risk Level", value: riskLabel(result.pf) },
        { label: "Target Beta", value: scenario.targetBeta, precision: 2 },
        { label: "Target Status", value: optimization.met ? "Met" : "Not met" },
      ],
    },
    {
      title: "Assumption Ledger",
      description: "Traceable assumptions used by the decision support layer.",
      table: {
        headers: ["Assumption", "Value"],
        rows: assumptionLedger(scenario),
      },
    },
    {
      title: "Sensitivity Ranking",
      description: "Inputs ranked by effect on probability of failure.",
      table: {
        headers: ["Rank", "Input", "Direction", "Pf Swing"],
        rows: sensitivityRanking(scenario).map((item, index) => [
          String(index + 1),
          item.label,
          item.direction,
          item.swing.toExponential(3),
        ]),
      },
    },
    {
      title: "Target Reliability Actions",
      description: optimization.summary,
      data: optimization.actions.length
        ? optimization.actions.map((action) => ({ label: action.title, value: action.detail }))
        : [{ label: "Recommendation", value: "Maintain current design controls and document assumptions." }],
    },
  ];
}
