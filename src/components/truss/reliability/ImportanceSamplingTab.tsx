import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { type TrussSystemReliability, type ImportanceSamplingResult } from "@/lib/trussSolver";

interface ImportanceSamplingTabProps {
  isSamples: number; setIsSamples: (v: number) => void;
  setIsTrigger: (fn: (v: number) => number) => void;
  isResults: ImportanceSamplingResult;
  trussReliability: TrussSystemReliability;
}

export function ImportanceSamplingTab({ isSamples, setIsSamples, setIsTrigger, isResults, trussReliability }: ImportanceSamplingTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border">
        <div className="flex-1"><label className="text-xs text-muted-foreground">IS Samples</label><Slider value={[isSamples]} onValueChange={([v]) => setIsSamples(v)} min={500} max={20000} step={500} /></div>
        <span className="text-sm font-mono w-16">{isSamples}</span>
        <Button onClick={() => setIsTrigger(t => t + 1)} variant="outline" size="sm">Run IS</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Importance Sampling Results</h4>
          <p className="text-xs text-muted-foreground">Importance sampling shifts the sampling distribution toward the design point, dramatically improving efficiency for rare failure events.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-chart-4/10 border border-chart-4/30"><div className="text-xs text-muted-foreground">IS P<sub>f</sub></div><div className="text-lg font-bold font-mono text-chart-4">{(isResults.estimatedPf * 100).toFixed(6)}%</div></div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30"><div className="text-xs text-muted-foreground">IS β</div><div className="text-lg font-bold font-mono text-accent">{isResults.estimatedBeta.toFixed(3)}</div></div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border"><div className="text-xs text-muted-foreground">CoV of Estimator</div><div className="text-lg font-bold font-mono">{(isResults.coefficientOfVariation * 100).toFixed(1)}%</div></div>
            <div className={`p-4 rounded-lg border ${isResults.efficiencyGain > 5 ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-border'}`}><div className="text-xs text-muted-foreground">Efficiency Gain</div><div className="text-lg font-bold font-mono">{isResults.efficiencyGain.toFixed(1)}×</div></div>
          </div>
          <div className={`p-3 rounded-lg border ${Math.abs(isResults.estimatedBeta - trussReliability.systemBeta) < 0.3 ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-2">{Math.abs(isResults.estimatedBeta - trussReliability.systemBeta) < 0.3 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}<span className="text-sm font-semibold">Validation: Δβ = {(isResults.estimatedBeta - trussReliability.systemBeta).toFixed(3)} (vs FORM)</span></div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">IS Convergence</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={isResults.convergenceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis dataKey="samples" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => (v * 100).toFixed(3) + '%'} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number, name: string) => [name === 'pf' ? (value * 100).toFixed(6) + '%' : (value * 100).toFixed(1) + '%', name === 'pf' ? 'Pf' : 'CoV']} />
              <Legend />
              <ReferenceLine y={trussReliability.systemPf} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="pf" name="Pf" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 p-2 rounded bg-muted/20 text-xs text-muted-foreground"><strong>Importance Sampling</strong> uses a shifted sampling distribution centered near the failure region, dramatically reducing variance for rare events.</div>
        </div>
      </div>
    </div>
  );
}
