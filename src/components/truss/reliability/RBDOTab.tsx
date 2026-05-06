import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Settings, Target } from "lucide-react";
import { type RBDOResult } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "../useTrussAnalysis";

interface RBDOTabProps {
  rbdoTargetBeta: number; setRbdoTargetBeta: (v: number) => void;
  setRbdoTrigger: (fn: (v: number) => number) => void;
  rbdoResults: RBDOResult | null;
  applyRBDOResults: () => void;
  du: TrussDisplayUnits;
}

export function RBDOTab({ rbdoTargetBeta, setRbdoTargetBeta, setRbdoTrigger, rbdoResults, applyRBDOResults, du }: RBDOTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border">
        <Target className="h-5 w-5 text-primary" />
        <div className="flex-1"><label className="text-xs text-muted-foreground">Target β</label><Slider value={[rbdoTargetBeta]} onValueChange={([v]) => setRbdoTargetBeta(v)} min={2.5} max={5.0} step={0.1} /></div>
        <span className="text-sm font-mono w-12">{rbdoTargetBeta.toFixed(1)}</span>
        <Button onClick={() => setRbdoTrigger(t => t + 1)} variant="outline" size="sm">Optimize</Button>
        {rbdoResults?.success && <Button onClick={applyRBDOResults} variant="default" size="sm">Apply Results</Button>}
      </div>
      {rbdoResults && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><Settings className="h-4 w-4" />RBDO Optimization Results</h4>
            <p className="text-xs text-muted-foreground">Reliability-Based Design Optimization adjusts member cross-sections to achieve target reliability while minimizing material usage.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-lg border ${rbdoResults.success ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}><div className="text-xs text-muted-foreground">Status</div><div className="flex items-center gap-2">{rbdoResults.success ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}<span className="text-sm font-bold">{rbdoResults.success ? 'Converged' : 'Not Converged'}</span></div></div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border"><div className="text-xs text-muted-foreground">Iterations</div><div className="text-lg font-bold font-mono">{rbdoResults.iterations}</div></div>
              <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30"><div className="text-xs text-muted-foreground">Initial β</div><div className="text-lg font-bold font-mono text-chart-2">{rbdoResults.initialBeta.toFixed(3)}</div></div>
              <div className={`p-4 rounded-lg border ${Math.abs(rbdoResults.finalBeta - rbdoResults.targetBeta) < 0.1 ? 'bg-primary/10 border-primary/30' : 'bg-chart-3/10 border-chart-3/30'}`}><div className="text-xs text-muted-foreground">Final β</div><div className="text-lg font-bold font-mono">{rbdoResults.finalBeta.toFixed(3)}</div><div className="text-[10px] text-muted-foreground">Target: {rbdoResults.targetBeta.toFixed(1)}</div></div>
            </div>
            <div className="p-3 rounded-lg bg-muted/20 border border-border"><div className="text-xs font-semibold mb-2">Total Area Change</div><div className={`text-lg font-bold font-mono ${rbdoResults.totalAreaIncrease > 0 ? 'text-destructive' : 'text-primary'}`}>{rbdoResults.totalAreaIncrease > 0 ? '+' : ''}{(rbdoResults.totalAreaIncrease * du.areaSmall.factor).toFixed(2)} {du.areaSmall.unit}</div><p className="text-[10px] text-muted-foreground mt-1">{rbdoResults.totalAreaIncrease > 0 ? 'Additional material needed to meet target reliability' : 'Material can be saved while maintaining reliability'}</p></div>
          </div>
          <div className="space-y-4">
            <h5 className="text-xs font-semibold">Convergence History</h5>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={rbdoResults.convergenceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                <XAxis dataKey="iteration" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => [value.toFixed(3), 'β']} />
                <ReferenceLine y={rbdoResults.targetBeta} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: `Target β=${rbdoResults.targetBeta}`, fill: 'hsl(var(--primary))', fontSize: 9 }} />
                <Line type="monotone" dataKey="systemBeta" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
              </LineChart>
            </ResponsiveContainer>
            <h5 className="text-xs font-semibold">Optimized Member Areas</h5>
            <div className="overflow-x-auto max-h-[150px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background"><tr className="border-b border-border"><th className="text-left py-1 px-2 text-muted-foreground">Member</th><th className="text-right py-1 px-2 text-muted-foreground">Original ({du.areaSmall.unit})</th><th className="text-right py-1 px-2 text-muted-foreground">Optimized ({du.areaSmall.unit})</th><th className="text-right py-1 px-2 text-muted-foreground">Change</th></tr></thead>
                <tbody>
                  {rbdoResults.optimizedAreas.map(a => {
                    const original = rbdoResults.initialAreas.find(o => o.memberId === a.memberId);
                    return (
                      <tr key={a.memberId} className="border-b border-border/50">
                        <td className="py-1 px-2 font-mono">M{a.memberId}</td>
                        <td className="py-1 px-2 text-right font-mono">{((original?.area || 0) * du.areaSmall.factor).toFixed(2)}</td>
                        <td className="py-1 px-2 text-right font-mono">{(a.area * du.areaSmall.factor).toFixed(2)}</td>
                        <td className={`py-1 px-2 text-right font-mono ${a.change > 0 ? 'text-destructive' : a.change < 0 ? 'text-primary' : 'text-muted-foreground'}`}>{a.change > 0 ? '+' : ''}{a.change.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <div className="p-3 rounded-lg bg-muted/20 border border-border"><p className="text-xs text-muted-foreground"><strong>RBDO</strong> iteratively adjusts member cross-sections to meet a target reliability index while minimizing structural weight. Click "Apply Results" to update the member areas with the optimized values.</p></div>
    </div>
  );
}
