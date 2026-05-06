import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { type SensitivityResult } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "../useTrussAnalysis";

interface SensitivityTabProps {
  topSensitivityFactors: SensitivityResult[];
  du: TrussDisplayUnits;
}

export function SensitivityTab({ topSensitivityFactors, du }: SensitivityTabProps) {
  const formatBaseValue = (s: SensitivityResult) => {
    if (s.parameterType === 'yield_strength') return `${(s.baseValue * (du.system === 'imperial' ? 1 / 6.89476 : 1)).toFixed(0)} ${du.stress.unit}`;
    if (s.parameterType === 'area') return `${(s.baseValue * (du.system === 'imperial' ? 6.4516 / 10000 * du.areaSmall.factor : 1)).toFixed(2)} ${du.areaSmall.unit}`;
    return `${s.baseValue.toFixed(1)}%`;
  };

  return (
    <div className="space-y-4">
      <div><h4 className="text-sm font-semibold">Parameter Sensitivity Analysis</h4><p className="text-xs text-muted-foreground">Normalized sensitivity showing which parameters most affect system reliability.</p></div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h5 className="text-xs font-semibold mb-3">Top Sensitivity Factors (Importance)</h5>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topSensitivityFactors} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
              <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} domain={[0, 1]} />
              <YAxis type="category" dataKey="parameterName" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} width={100} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value: number, name: string) => { if (name === 'importance') return [value.toFixed(3), 'Importance']; return [value.toFixed(3), name]; }} />
              <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
                {topSensitivityFactors.map((entry, index) => (
                  <Cell key={index} fill={entry.parameterType === 'yield_strength' ? 'hsl(var(--primary))' : entry.parameterType === 'area' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: 'hsl(var(--primary))' }} />Yield Strength</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: 'hsl(var(--chart-2))' }} />Cross-Section</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ background: 'hsl(var(--chart-3))' }} />Load Uncertainty</span>
          </div>
        </div>
        <div>
          <h5 className="text-xs font-semibold mb-3">Sensitivity Details</h5>
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background"><tr className="border-b border-border"><th className="text-left py-1 px-2 text-muted-foreground">Parameter</th><th className="text-right py-1 px-2 text-muted-foreground">Base Value</th><th className="text-right py-1 px-2 text-muted-foreground">Elasticity</th><th className="text-right py-1 px-2 text-muted-foreground">Importance</th></tr></thead>
              <tbody>
                {topSensitivityFactors.map((s, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-1 px-2 font-mono">{s.parameterName}</td>
                    <td className="py-1 px-2 text-right font-mono">{formatBaseValue(s)}</td>
                    <td className={`py-1 px-2 text-right font-mono ${s.elasticity > 0 ? 'text-primary' : 'text-destructive'}`}>{s.elasticity > 0 ? '+' : ''}{s.elasticity.toFixed(3)}</td>
                    <td className="py-1 px-2 text-right"><div className="flex items-center gap-1 justify-end"><div className="w-12 h-2 bg-muted/30 rounded overflow-hidden"><div className="h-full bg-primary rounded" style={{ width: `${s.importance * 100}%` }} /></div><span className="font-mono w-10">{(s.importance * 100).toFixed(0)}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/20 border border-border"><p className="text-xs text-muted-foreground"><strong>Interpretation:</strong> Parameters with high importance have the greatest effect on system reliability. Positive elasticity means increasing the parameter increases β. Focus design improvements on high-importance parameters.</p></div>
    </div>
  );
}
