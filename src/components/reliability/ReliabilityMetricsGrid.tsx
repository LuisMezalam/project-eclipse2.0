/**
 * ReliabilityMetricsGrid — FORM and SORM result cards.
 */

import type { ReliabilityResult } from "@/lib/reliability";

interface ReliabilityMetricsGridProps {
  result: ReliabilityResult;
}

export function ReliabilityMetricsGrid({ result }: ReliabilityMetricsGridProps) {
  return (
    <>
      {/* FORM Results */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">FORM β</div>
          <div className="text-2xl font-bold text-primary font-mono">{result.beta.toFixed(3)}</div>
        </div>
        <div className={`p-4 rounded-lg border ${result.pf > 0.01 ? 'bg-destructive/10 border-destructive/30' : 'bg-accent/10 border-accent/30'}`}>
          <div className="text-xs text-muted-foreground">FORM P<sub>f</sub></div>
          <div className={`text-2xl font-bold font-mono ${result.pf > 0.01 ? 'text-destructive' : 'text-accent'}`}>
            {result.pf.toExponential(2)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Safety Factor</div>
          <div className="text-2xl font-bold text-foreground font-mono">{result.centralSafetyFactor.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Safety Margin</div>
          <div className="text-2xl font-bold text-foreground font-mono">{result.meanSafetyMargin.toFixed(0)} MPa</div>
        </div>
      </div>

      {/* SORM Results */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
          <div className="text-xs text-muted-foreground">SORM β</div>
          <div className="text-2xl font-bold text-secondary font-mono">{(result.betaSorm ?? result.beta).toFixed(3)}</div>
        </div>
        <div className={`p-4 rounded-lg border ${(result.pfSorm ?? result.pf) > 0.01 ? 'bg-destructive/10 border-destructive/30' : 'bg-secondary/10 border-secondary/30'}`}>
          <div className="text-xs text-muted-foreground">SORM P<sub>f</sub></div>
          <div className={`text-2xl font-bold font-mono ${(result.pfSorm ?? result.pf) > 0.01 ? 'text-destructive' : 'text-secondary'}`}>
            {(result.pfSorm ?? result.pf).toExponential(2)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Curvature Correction</div>
          <div className="text-2xl font-bold text-foreground font-mono">{(result.curvatureCorrection ?? 1).toFixed(3)}</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">SORM vs FORM</div>
          <div className="text-lg font-bold text-foreground font-mono">
            {result.pf > 0 ? (((result.pfSorm ?? result.pf) / result.pf - 1) * 100).toFixed(1) : 0}% diff
          </div>
        </div>
      </div>
    </>
  );
}
