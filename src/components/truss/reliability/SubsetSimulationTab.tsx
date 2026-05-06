import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { type TrussSystemReliability, type SubsetSimulationResult } from "@/lib/trussSolver";

interface SubsetSimulationTabProps {
  ssSamplesPerLevel: number; setSsSamplesPerLevel: (v: number) => void;
  setSsTrigger: (fn: (v: number) => number) => void;
  ssResults: SubsetSimulationResult;
  trussReliability: TrussSystemReliability;
}

export function SubsetSimulationTab({ ssSamplesPerLevel, setSsSamplesPerLevel, setSsTrigger, ssResults, trussReliability }: SubsetSimulationTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border">
        <div className="flex-1"><label className="text-xs text-muted-foreground">Samples per Level</label><Slider value={[ssSamplesPerLevel]} onValueChange={([v]) => setSsSamplesPerLevel(v)} min={200} max={2000} step={100} /></div>
        <span className="text-sm font-mono w-16">{ssSamplesPerLevel}</span>
        <Button onClick={() => setSsTrigger(t => t + 1)} variant="outline" size="sm">Run SS</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Subset Simulation Results</h4>
          <p className="text-xs text-muted-foreground">Subset simulation efficiently estimates ultra-rare failure probabilities (P<sub>f</sub> &lt; 10<sup>-6</sup>) by adaptively sampling in progressively smaller failure regions.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg bg-chart-5/10 border border-chart-5/30"><div className="text-xs text-muted-foreground">SS P<sub>f</sub></div><div className="text-lg font-bold font-mono text-chart-5">{ssResults.estimatedPf < 1e-6 ? ssResults.estimatedPf.toExponential(2) : (ssResults.estimatedPf * 100).toFixed(6) + '%'}</div></div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/30"><div className="text-xs text-muted-foreground">SS β</div><div className="text-lg font-bold font-mono text-accent">{ssResults.estimatedBeta.toFixed(3)}</div></div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border"><div className="text-xs text-muted-foreground">Levels</div><div className="text-lg font-bold font-mono">{ssResults.numLevels}</div></div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border"><div className="text-xs text-muted-foreground">CoV</div><div className="text-lg font-bold font-mono">{(ssResults.coefficientOfVariation * 100).toFixed(1)}%</div></div>
          </div>
          <div className={`p-3 rounded-lg border ${Math.abs(ssResults.estimatedBeta - trussReliability.systemBeta) < 0.5 ? 'bg-primary/10 border-primary/30' : 'bg-chart-3/10 border-chart-3/30'}`}>
            <div className="flex items-center gap-2">{Math.abs(ssResults.estimatedBeta - trussReliability.systemBeta) < 0.5 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-chart-3" />}<span className="text-sm font-semibold">Δβ = {(ssResults.estimatedBeta - trussReliability.systemBeta).toFixed(3)} (vs FORM)</span></div>
            <p className="text-xs text-muted-foreground mt-1">Differences expected for ultra-rare events where FORM approximation may be less accurate.</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Level Progression</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ssResults.convergenceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis dataKey="level" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} label={{ value: 'Level', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} label={{ value: 'Threshold', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number, name: string) => { if (name === 'threshold') return [value.toFixed(2), 'Threshold g']; if (name === 'cumulativePf') return [value.toExponential(2), 'Cumulative Pf']; return [value.toFixed(2), name]; }} />
              <Bar dataKey="threshold" name="threshold" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-2 rounded bg-muted/20 text-xs text-muted-foreground"><strong>Subset Simulation</strong> uses MCMC to sample progressively closer to the failure region. Each level corresponds to P(F<sub>i</sub>|F<sub>i-1</sub>) = p<sub>0</sub> ≈ 0.1.</div>
        </div>
      </div>
    </div>
  );
}
