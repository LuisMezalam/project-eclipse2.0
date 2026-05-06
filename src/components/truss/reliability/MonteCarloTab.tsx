import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { type TrussSystemReliability } from "@/lib/trussSolver";

interface MonteCarloTabProps {
  mcSamples: number; setMcSamples: (v: number) => void;
  setMcTrigger: (fn: (v: number) => number) => void;
  mcResults: { numSamples: number; failureCount: number; estimatedPf: number; estimatedBeta: number; convergenceHistory: { samples: number; pf: number }[] };
  trussReliability: TrussSystemReliability;
}

export function MonteCarloTab({ mcSamples, setMcSamples, setMcTrigger, mcResults, trussReliability }: MonteCarloTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border">
        <div className="flex-1"><label className="text-xs text-muted-foreground">MC Samples</label><Slider value={[mcSamples]} onValueChange={([v]) => setMcSamples(v)} min={1000} max={50000} step={1000} /></div>
        <span className="text-sm font-mono w-16">{mcSamples}</span>
        <Button onClick={() => setMcTrigger(t => t + 1)} variant="outline" size="sm">Run MC</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Monte Carlo Results</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30"><div className="text-xs text-muted-foreground">MC P<sub>f</sub></div><div className="text-lg font-bold font-mono text-chart-2">{(mcResults.estimatedPf * 100).toFixed(4)}%</div></div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30"><div className="text-xs text-muted-foreground">MC β</div><div className="text-lg font-bold font-mono text-accent">{mcResults.estimatedBeta.toFixed(3)}</div></div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border"><div className="text-xs text-muted-foreground">Failures</div><div className="text-lg font-bold font-mono">{mcResults.failureCount} / {mcResults.numSamples}</div></div>
            <div className={`p-4 rounded-lg border ${Math.abs(mcResults.estimatedBeta - trussReliability.systemBeta) < 0.3 ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <div className="text-xs text-muted-foreground">Validation</div>
              <div className="flex items-center gap-2">{Math.abs(mcResults.estimatedBeta - trussReliability.systemBeta) < 0.3 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}<span className="text-sm font-semibold">Δβ = {(mcResults.estimatedBeta - trussReliability.systemBeta).toFixed(3)}</span></div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Convergence History</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mcResults.convergenceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis dataKey="samples" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => (v * 100).toFixed(2) + '%'} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number) => [(value * 100).toFixed(4) + '%', 'Pf']} />
              <ReferenceLine y={trussReliability.systemPf} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="pf" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-1 text-center">Dashed line: FORM estimate</p>
        </div>
      </div>
    </div>
  );
}
