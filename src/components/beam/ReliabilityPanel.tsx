/**
 * ReliabilityPanel — Pf analysis section for beam module.
 */

import { normalCDF, ReliabilityResult } from "@/lib/reliability";
import type { BeamAnalysis } from "@/lib/reliability";

interface DisplayUnits {
  stress: { factor: number; unit: string };
  yieldUnit: string;
  yieldFactor: number;
}

interface ReliabilityPanelProps {
  reliability: ReliabilityResult;
  beamResult: BeamAnalysis;
  yieldStrength: number;
  strengthCOV: number;
  loadCOV: number;
  loadInverted: boolean;
  displayUnits: DisplayUnits;
}

export function ReliabilityPanel({
  reliability, beamResult, yieldStrength, strengthCOV, loadCOV, loadInverted,
  displayUnits: du,
}: ReliabilityPanelProps) {
  // Display stress in current unit system
  const stressDisplay = Math.abs(beamResult.maxStress) * du.stress.factor;
  const yieldDisplay = yieldStrength * du.yieldFactor;
  const su = du.yieldUnit; // stress unit label (MPa or ksi)

  // Delta-method margin of error (computed in MPa internally for consistency)
  const meanStress = Math.abs(beamResult.maxStress) / 1e6;
  const stdR = yieldStrength * strengthCOV;
  const stdS = meanStress * loadCOV;
  const sigmaG = Math.sqrt(stdR * stdR + stdS * stdS);
  const n = 30;
  const dB_dMuR = 1 / sigmaG;
  const dB_dMuS = -1 / sigmaG;
  const dB_dSigR = -(yieldStrength - meanStress) * stdR / Math.pow(sigmaG, 3);
  const dB_dSigS = -(yieldStrength - meanStress) * stdS / Math.pow(sigmaG, 3);
  const varBeta =
    dB_dMuR * dB_dMuR * (stdR * stdR / n) +
    dB_dMuS * dB_dMuS * (stdS * stdS / n) +
    dB_dSigR * dB_dSigR * (2 * Math.pow(stdR, 4) / n) +
    dB_dSigS * dB_dSigS * (2 * Math.pow(stdS, 4) / n);
  const se = Math.sqrt(varBeta);
  const methodUncertainty = 0.05 + 0.02 * Math.pow(strengthCOV + loadCOV, 2);
  const totalSE = Math.sqrt(se * se + methodUncertainty * methodUncertainty);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Probability of Failure Analysis</h3>

      {/* Main metrics */}
      <div className="grid md:grid-cols-4 gap-4 mb-4">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">FORM β</div>
          <div className="text-2xl font-bold text-primary font-mono">{reliability.beta.toFixed(3)}</div>
        </div>
        <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/30">
          <div className="text-xs text-muted-foreground">SORM β</div>
          <div className="text-2xl font-bold text-chart-3 font-mono">{(reliability.betaSorm || reliability.beta).toFixed(3)}</div>
        </div>
        <div className={`p-4 rounded-lg border ${reliability.pf > 0.001 ? "bg-destructive/10 border-destructive/30" : "bg-accent/10 border-accent/30"}`}>
          <div className="text-xs text-muted-foreground">P<sub>f</sub> (FORM)</div>
          <div className={`text-2xl font-bold font-mono ${reliability.pf > 0.001 ? "text-destructive" : "text-accent"}`}>
            {reliability.pf.toExponential(2)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Safety Factor</div>
          <div className={`text-2xl font-bold font-mono ${reliability.centralSafetyFactor < 1 ? "text-destructive" : "text-foreground"}`}>
            {reliability.centralSafetyFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Inverted load warning */}
      {loadInverted && (
        <div className="mb-4 p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 text-xs">
          <span className="font-semibold text-chart-3">↑ Inverted Load Active:</span>
          <span className="text-muted-foreground ml-1">
            Reliability uses |σ<sub>max</sub>| = {stressDisplay.toFixed(2)} {su}.
          </span>
        </div>
      )}

      {/* Margin of Error & Method Comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
          <div className="text-xs font-semibold">Margin of Error (95% CI)</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">β Estimate:</span>
              <span className="ml-1 font-mono font-semibold">{reliability.beta.toFixed(3)} ± {totalSE.toFixed(3)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">95% CI:</span>
              <span className="ml-1 font-mono">
                [{Math.max(0, reliability.beta - 1.96 * totalSE).toFixed(3)}, {(reliability.beta + 1.96 * totalSE).toFixed(3)}]
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">P<sub>f</sub> 95% CI:</span>
              <span className="ml-1 font-mono">
                [{normalCDF(-(reliability.beta + 1.96 * totalSE)).toExponential(2)}, {normalCDF(-Math.max(0, reliability.beta - 1.96 * totalSE)).toExponential(2)}]
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Method Err:</span>
              <span className="ml-1 font-mono">±{methodUncertainty.toFixed(4)}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            SE propagated via delta method from CoV<sub>R</sub> = {(strengthCOV * 100).toFixed(1)}%, CoV<sub>S</sub> = {(loadCOV * 100).toFixed(1)}% (n=30 assumed).
            R = {yieldDisplay.toFixed(1)} {su}, S = {stressDisplay.toFixed(2)} {su}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-2">
          <div className="text-xs font-semibold">Method Comparison</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SORM - FORM:</span>
              <span className="font-mono font-semibold">Δβ = {((reliability.betaSorm || reliability.beta) - reliability.beta).toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Curvature κ:</span>
              <span className="font-mono font-semibold">{(reliability.curvatureCorrection || 0).toFixed(4)}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            For linear R-S limit states, FORM ≈ SORM. Differences &lt;1% indicate well-behaved reliability problem.
          </p>
        </div>
      </div>
    </div>
  );
}
