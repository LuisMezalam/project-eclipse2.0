/**
 * ProbabilityOfFailure — thin orchestrator for the Pf analysis tab.
 *
 * Sub-components live in src/components/reliability/.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { SliderWithInput } from "@/components/SliderWithInput";
import { reliabilityAnalysis, type ReliabilityResult } from "@/lib/reliability";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { AIRecommendations } from "./AIRecommendations";
import { ExportButton } from "./ExportButton";
import { ReportSection } from "@/lib/exportUtils";
import { useSharedParameters } from "@/contexts/SharedParametersContext";

import {
  ReliabilityMetricsGrid,
  DistributionOverlapChart,
  MonteCarloPanel,
  FORMEquations,
} from "./reliability";

export function ProbabilityOfFailure() {
  const ctx = useSharedParameters();

  // Resistance (strength) parameters
  const [meanR, setMeanR] = useState(500);
  const [covR, setCovR] = useState(0.1);

  // Load effect (stress) parameters
  const [meanS, setMeanS] = useState(300);
  const [covS, setCovS] = useState(0.15);

  // Sync from context
  useEffect(() => {
    if (ctx.isSynced) {
      setMeanR(ctx.resistanceMean);
      setCovR(ctx.resistanceCoV);
      setMeanS(ctx.derivedStressMean / 1e6);
      setCovS(ctx.derivedStressCoV);
    }
  }, [ctx.isSynced, ctx.resistanceMean, ctx.resistanceCoV, ctx.derivedStressMean, ctx.derivedStressCoV]);

  // Monte Carlo state (lifted so export can access it)
  const [mcResults, setMcResults] = useState<{ pf: number; samples: { r: number; s: number; failed: boolean }[] } | null>(null);

  // FORM analysis
  const result: ReliabilityResult = useMemo(() => reliabilityAnalysis(meanR, covR, meanS, covS), [meanR, covR, meanS, covS]);

  // Risk classification
  const getRiskLevel = (pf: number) => {
    if (pf < 1e-6) return { level: "Very Low", color: "text-accent", icon: <CheckCircle className="w-5 h-5" /> };
    if (pf < 1e-4) return { level: "Low", color: "text-accent", icon: <CheckCircle className="w-5 h-5" /> };
    if (pf < 1e-2) return { level: "Moderate", color: "text-chart-posterior", icon: <AlertTriangle className="w-5 h-5" /> };
    return { level: "High", color: "text-destructive", icon: <AlertTriangle className="w-5 h-5" /> };
  };
  const risk = getRiskLevel(result.pf);

  // ─── Export helpers ─────────────────────────────────────────
  const getReportData = useCallback((): ReportSection[] => {
    const sections: ReportSection[] = [
      {
        title: "Analysis Parameters",
        description: "Input parameters for reliability analysis using FORM method",
        data: [
          { label: "Resistance Mean (μR)", value: meanR, unit: "MPa", precision: 1 },
          { label: "Resistance CoV (δR)", value: covR * 100, unit: "%", precision: 1 },
          { label: "Resistance Std Dev (σR)", value: meanR * covR, unit: "MPa", precision: 2 },
          { label: "Load Mean (μS)", value: meanS, unit: "MPa", precision: 1 },
          { label: "Load CoV (δS)", value: covS * 100, unit: "%", precision: 1 },
          { label: "Load Std Dev (σS)", value: meanS * covS, unit: "MPa", precision: 2 },
        ],
      },
      {
        title: "Reliability Results",
        description: "First-Order Reliability Method (FORM) analysis results",
        data: [
          { label: "Reliability Index (β)", value: result.beta, precision: 4 },
          { label: "Probability of Failure (Pf)", value: result.pf, precision: 6 },
          { label: "Central Safety Factor", value: result.centralSafetyFactor, precision: 3 },
          { label: "Mean Safety Margin", value: result.meanSafetyMargin, unit: "MPa", precision: 2 },
          { label: "Risk Level", value: risk.level, precision: 0 },
        ],
      },
    ];

    if (mcResults) {
      const failedCount = mcResults.samples.filter((s) => s.failed).length;
      sections.push({
        title: "Monte Carlo Simulation",
        description: `Results from ${mcResults.samples.length} random samples`,
        data: [
          { label: "Monte Carlo Pf", value: mcResults.pf, precision: 6 },
          { label: "Failed Samples", value: failedCount, precision: 0 },
          { label: "Total Samples", value: mcResults.samples.length, precision: 0 },
        ],
      });
    }
    return sections;
  }, [meanR, covR, meanS, covS, result, risk.level, mcResults]);

  const getCSVData = useCallback(() => [{
    resistance_mean_mpa: meanR,
    resistance_cov: covR,
    load_mean_mpa: meanS,
    load_cov: covS,
    reliability_index: result.beta,
    probability_of_failure: result.pf,
    safety_factor: result.centralSafetyFactor,
    safety_margin_mpa: result.meanSafetyMargin,
    risk_level: risk.level,
    mc_pf: mcResults?.pf ?? null,
  }], [meanR, covR, meanS, covS, result, risk.level, mcResults]);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header + metrics + inputs */}
      <div className="glass-card p-6 border-muted">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Probability of Failure Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1">First-Order Reliability Method (FORM) | g(X) = R - S</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton getReportData={getReportData} getCSVData={getCSVData} filename="reliability_analysis" />
            <div className={`flex items-center gap-2 ${risk.color}`}>
              {risk.icon}
              <span className="font-semibold">{risk.level} Risk</span>
            </div>
          </div>
        </div>

        <ReliabilityMetricsGrid result={result} />

        {/* Parameter Controls */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              Resistance (Strength) R
            </h4>
            <SliderWithInput label="Mean μR" value={meanR}
              onChange={(v) => { setMeanR(v); if (ctx.isSynced) ctx.setResistanceMean(v); }}
              min={200} max={800} step={10} precision={0} unit="MPa" />
            <SliderWithInput label="COV δR" value={covR}
              onChange={(v) => { setCovR(v); if (ctx.isSynced) ctx.setResistanceCoV(v); }}
              min={0.05} max={0.3} step={0.01} precision={2} />
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-chart-likelihood flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(340 82% 52%)" }} />
              Load Effect (Stress) S
            </h4>
            <SliderWithInput label="Mean μS" value={meanS} onChange={setMeanS}
              min={100} max={600} step={10} precision={0} unit="MPa" />
            <SliderWithInput label="COV δS" value={covS} onChange={setCovS}
              min={0.05} max={0.4} step={0.01} precision={2} />
          </div>
        </div>
      </div>

      <DistributionOverlapChart meanR={meanR} covR={covR} meanS={meanS} covS={covS} />

      <MonteCarloPanel meanR={meanR} covR={covR} meanS={meanS} covS={covS}
        formResult={result} mcResults={mcResults} onMcComplete={setMcResults} />

      <FORMEquations />

      {/* AI Recommendations */}
      <div className="glass-card p-6">
        <AIRecommendations
          analysisType="form"
          parameters={{
            resistanceMean: meanR, resistanceCOV: covR,
            loadMean: meanS, loadCOV: covS,
            reliabilityIndex: result.beta, pof: result.pf,
            monteCarloPoF: mcResults?.pf || result.pf,
          }} />
      </div>
    </div>
  );
}
