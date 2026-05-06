import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { type LRFDResult, DEFAULT_COV_BY_CATEGORY } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "../useTrussAnalysis";

interface LRFDTabProps {
  lrfdResults: LRFDResult[];
  criticalLRFD: LRFDResult | null;
  du: TrussDisplayUnits;
}

export function LRFDTab({ lrfdResults, criticalLRFD, du }: LRFDTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h4 className="text-sm font-semibold">LRFD Load Combinations (ASCE 7-22)</h4><p className="text-xs text-muted-foreground">Partial safety factors applied per load category.</p></div>
        {criticalLRFD && <div className={`px-3 py-2 rounded-lg ${criticalLRFD.systemBeta >= 3 ? 'bg-primary/10' : 'bg-destructive/10'}`}><div className="text-xs text-muted-foreground">Governing Combination</div><div className="font-semibold">{criticalLRFD.combinationName}</div></div>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-muted-foreground">Combination</th><th className="text-right py-2 px-3 text-muted-foreground">Factored Load ({du.force.unit})</th><th className="text-right py-2 px-3 text-muted-foreground">System β</th><th className="text-right py-2 px-3 text-muted-foreground">P<sub>f</sub></th><th className="text-center py-2 px-3 text-muted-foreground">Status</th></tr></thead>
          <tbody>
            {lrfdResults.map(result => (
              <tr key={result.combinationId} className={`border-b border-border/50 ${result.isCritical ? 'bg-destructive/5' : ''}`}>
                <td className="py-2 px-3 font-mono">{result.combinationName}</td>
                <td className="py-2 px-3 text-right font-mono">{(result.factoredLoad * du.force.factor).toFixed(2)}</td>
                <td className={`py-2 px-3 text-right font-mono font-semibold ${result.systemBeta >= 3 ? 'text-primary' : 'text-destructive'}`}>{result.systemBeta.toFixed(3)}</td>
                <td className="py-2 px-3 text-right font-mono">{(result.systemPf * 100).toFixed(4)}%</td>
                <td className="py-2 px-3 text-center">{result.isCritical ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-destructive/20 text-destructive"><AlertTriangle className="h-3 w-3 inline mr-1" />Critical</span> : <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary"><CheckCircle2 className="h-3 w-3 inline mr-1" />OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 rounded-lg bg-muted/20 border border-border">
        <div className="text-xs font-semibold mb-2">Partial Safety Factors (ASCE 7-22)</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Dead (D):</span><span className="ml-1 font-mono">1.2/1.4/0.9</span></div>
          <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Live (L):</span><span className="ml-1 font-mono">1.6/1.0</span></div>
          <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Wind (W):</span><span className="ml-1 font-mono">1.0</span></div>
          <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Snow (S):</span><span className="ml-1 font-mono">1.6/0.5/0.2</span></div>
          <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Earthquake (E):</span><span className="ml-1 font-mono">1.0</span></div>
          <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Rain (R):</span><span className="ml-1 font-mono">1.0</span></div>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-muted/20 border border-border">
        <div className="text-xs font-semibold mb-2">Load Uncertainty (CoV)</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          {Object.entries(DEFAULT_COV_BY_CATEGORY).map(([cat, cov]) => (
            <div key={cat} className="p-2 rounded bg-muted/30"><span className="text-muted-foreground capitalize">{cat}:</span><span className="ml-1 font-mono">{(cov * 100).toFixed(0)}%</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}
