import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from "recharts";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { type TrussSystemReliability } from "@/lib/trussSolver";

interface SystemTabProps {
  trussReliability: TrussSystemReliability;
}

export function SystemTab({ trussReliability }: SystemTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Series System Analysis</h4>
        <p className="text-xs text-muted-foreground">Truss treated as series system: failure of ANY member causes system failure. Comparing FOSM, FORM, SORM, and TORM methods.</p>

        <div className="grid grid-cols-4 gap-2">
          {([
            ['FORM', trussReliability.systemBeta, 'primary'],
            ['FOSM', trussReliability.systemBetaFOSM, 'chart-2'],
            ['SORM', trussReliability.systemBetaSORM, 'chart-3'],
            ['TORM', trussReliability.systemBetaTORM, 'chart-4'],
          ] as const).map(([label, beta, color]) => (
            <div key={label} className={`p-3 rounded-lg border ${beta >= 3 ? `bg-${color}/10 border-${color}/30` : 'bg-destructive/10 border-destructive/30'}`}>
              <div className="text-xs text-muted-foreground">{label} β</div>
              <div className="text-lg font-bold font-mono">{beta.toFixed(3)}</div>
              <div className="flex items-center gap-1 mt-1">
                {beta >= 3 ? <CheckCircle2 className={`h-3 w-3 text-${color}`} /> : <AlertTriangle className="h-3 w-3 text-destructive" />}
                <span className="text-[9px]">{beta >= 3 ? 'OK' : 'Low'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {([
            ['FORM', trussReliability.systemPf, 'primary'],
            ['FOSM', trussReliability.systemPfFOSM, 'chart-2'],
            ['SORM', trussReliability.systemPfSORM, 'chart-3'],
            ['TORM', trussReliability.systemPfTORM, 'chart-4'],
          ] as const).map(([label, pf, color]) => (
            <div key={label} className={`p-2 rounded-lg bg-${color}/5 border border-${color}/20`}>
              <div className="text-[10px] text-muted-foreground">{label} P<sub>f</sub></div>
              <div className="text-xs font-bold font-mono">{(pf * 100).toFixed(4)}%</div>
            </div>
          ))}
        </div>

        {trussReliability.systemMarginOfError && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-2"><Shield className="h-3 w-3" />Margin of Error (95% CI)</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">β Estimate:</span><span className="ml-1 font-mono font-semibold">{trussReliability.systemMarginOfError.betaEstimate.toFixed(3)} ± {trussReliability.systemMarginOfError.betaStdError.toFixed(3)}</span></div>
              <div><span className="text-muted-foreground">95% CI:</span><span className="ml-1 font-mono">[{trussReliability.systemMarginOfError.beta95CI.lower.toFixed(3)}, {trussReliability.systemMarginOfError.beta95CI.upper.toFixed(3)}]</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">P<sub>f</sub> 95% CI:</span><span className="ml-1 font-mono">[{(trussReliability.systemMarginOfError.pf95CI.lower * 100).toFixed(4)}%, {(trussReliability.systemMarginOfError.pf95CI.upper * 100).toFixed(4)}%]</span></div>
            </div>
          </div>
        )}

        {trussReliability.higherOrderAnalysis && trussReliability.higherOrderAnalysis.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-2">
            <div className="text-xs font-semibold">Higher-Order Convergence (Taylor Series)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50"><th className="text-left py-1 px-1">Order</th><th className="text-right py-1 px-1">β</th><th className="text-right py-1 px-1">Δβ</th><th className="text-center py-1 px-1">Trend</th></tr></thead>
                <tbody>
                  {trussReliability.higherOrderAnalysis.map((a) => (
                    <tr key={a.order} className="border-b border-border/30">
                      <td className="py-1 px-1 font-mono">{a.order === 1 ? 'FORM' : a.order === 2 ? 'SORM' : a.order === 3 ? 'TORM' : `${a.order}th`}</td>
                      <td className="py-1 px-1 text-right font-mono">{a.beta.toFixed(4)}</td>
                      <td className="py-1 px-1 text-right font-mono">{a.order === 1 ? '-' : a.correction.toFixed(5)}</td>
                      <td className="py-1 px-1 text-center"><span className={`px-1.5 py-0.5 rounded text-[9px] ${a.convergenceTrend === 'converging' ? 'bg-primary/20 text-primary' : a.convergenceTrend === 'diverging' ? 'bg-destructive/20 text-destructive' : 'bg-chart-3/20 text-chart-3'}`}>{a.convergenceTrend === 'converging' ? '↓ Conv.' : a.convergenceTrend === 'diverging' ? '↑ Div.' : '∿ Osc.'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2"><strong>Taylor Series Insight:</strong> Corrections typically shrink as order increases for well-behaved limit states (low CoV). For highly non-linear cases (high CoV &gt; 0.3), series may diverge or oscillate.</p>
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/20 border border-border space-y-2">
          <div className="text-xs font-semibold">Method Differences</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">FORM-FOSM:</span><span className="font-mono font-semibold">Δβ = {(trussReliability.systemBeta - trussReliability.systemBetaFOSM).toFixed(3)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">SORM-FORM:</span><span className="font-mono font-semibold">Δβ = {(trussReliability.systemBetaSORM - trussReliability.systemBeta).toFixed(3)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">TORM-SORM:</span><span className="font-mono font-semibold">Δβ = {(trussReliability.systemBetaTORM - trussReliability.systemBetaSORM).toFixed(3)}</span></div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1"><strong>FOSM:</strong> Linear at mean. <strong>FORM:</strong> Hasofer-Lind (1st order). <strong>SORM:</strong> Breitung curvature. <strong>TORM:</strong> Skewness (3rd cumulant) correction.</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="text-xs text-muted-foreground mb-2">P<sub>f</sub> Bounds (Ditlevsen)</div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono">{(trussReliability.boundsPf.lower * 100).toFixed(4)}%</span>
            <div className="flex-1 h-2 bg-muted/30 rounded relative">
              <div className="absolute h-full bg-primary rounded" style={{ left: `${(trussReliability.boundsPf.lower / Math.max(trussReliability.boundsPf.upper * 1.5, 0.001)) * 100}%`, width: `${((trussReliability.boundsPf.upper - trussReliability.boundsPf.lower) / Math.max(trussReliability.boundsPf.upper * 1.5, 0.001)) * 100}%` }} />
            </div>
            <span className="text-xs font-mono">{(trussReliability.boundsPf.upper * 100).toFixed(4)}%</span>
          </div>
        </div>

        {trussReliability.criticalPath.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="text-xs font-semibold mb-1">Critical Members (Lowest β)</div>
            <div className="flex gap-2 flex-wrap">
              {trussReliability.criticalPath.map(memberId => {
                const rel = trussReliability.memberReliabilities.find(r => r.memberId === memberId);
                return <span key={memberId} className="px-2 py-1 rounded bg-destructive/20 text-xs font-mono">M{memberId} (β={rel?.beta.toFixed(2)})</span>;
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3">Reliability Method Comparison</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trussReliability.memberReliabilities.filter(r => r.meanStress > 0)} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
            <XAxis dataKey="memberId" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => `M${v}`} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number, name: string) => [value.toFixed(3), name]} />
            <Legend />
            <ReferenceLine y={3} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: 'β=3', fill: 'hsl(var(--destructive))', fontSize: 9 }} />
            <Bar dataKey="beta" name="FORM β" fill="hsl(var(--primary))" />
            <Bar dataKey="betaFOSM" name="FOSM β" fill="hsl(var(--chart-2))" />
            <Bar dataKey="betaSORM" name="SORM β" fill="hsl(var(--chart-3))" />
            <Bar dataKey="betaTORM" name="TORM β" fill="hsl(var(--chart-4))" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 p-2 rounded bg-muted/20 text-xs text-muted-foreground">
          <strong>nth-Order Methods:</strong> Each order adds Taylor series terms. FORM (1st) linearizes at design point. SORM (2nd) adds curvature. TORM (3rd) adds skewness. For linear g(X)=R-S, differences are typically &lt;1%.
        </div>
      </div>
    </div>
  );
}
