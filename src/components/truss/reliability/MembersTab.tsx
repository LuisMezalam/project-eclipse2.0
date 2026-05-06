import { type TrussSystemReliability } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "../useTrussAnalysis";

interface MembersTabProps {
  trussReliability: TrussSystemReliability;
  du: TrussDisplayUnits;
}

export function MembersTab({ trussReliability, du }: MembersTabProps) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-1 text-muted-foreground text-xs">Member</th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs">μ<sub>σ</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs">μ<sub>R</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs text-primary">β<sub>FORM</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs text-chart-2">β<sub>FOSM</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs text-chart-3">β<sub>SORM</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs text-chart-4">β<sub>TORM</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs">±SE</th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs">P<sub>f</sub></th>
              <th className="text-right py-2 px-1 text-muted-foreground text-xs">SF</th>
              <th className="text-center py-2 px-1 text-muted-foreground text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {trussReliability.memberReliabilities.filter(r => r.meanStress > 0).map(rel => (
              <tr key={rel.memberId} className={`border-b border-border/50 ${rel.isCritical ? 'bg-destructive/5' : ''}`}>
                <td className="py-1 px-1 font-mono text-xs">M{rel.memberId}</td>
                <td className="py-1 px-1 text-right font-mono text-[10px]">{(rel.meanStress * du.stress.factor).toFixed(1)}</td>
                <td className="py-1 px-1 text-right font-mono text-[10px]">{(rel.meanStrength * du.stress.factor).toFixed(0)}</td>
                <td className={`py-1 px-1 text-right font-mono text-xs font-semibold ${rel.beta >= 3 ? 'text-primary' : 'text-destructive'}`}>{rel.beta.toFixed(3)}</td>
                <td className={`py-1 px-1 text-right font-mono text-xs font-semibold ${rel.betaFOSM >= 3 ? 'text-chart-2' : 'text-destructive'}`}>{rel.betaFOSM.toFixed(3)}</td>
                <td className={`py-1 px-1 text-right font-mono text-xs font-semibold ${rel.betaSORM >= 3 ? 'text-chart-3' : 'text-destructive'}`}>{rel.betaSORM.toFixed(3)}</td>
                <td className={`py-1 px-1 text-right font-mono text-xs font-semibold ${rel.betaTORM >= 3 ? 'text-chart-4' : 'text-destructive'}`}>{rel.betaTORM.toFixed(3)}</td>
                <td className="py-1 px-1 text-right font-mono text-[10px] text-muted-foreground">{rel.marginOfError ? `±${rel.marginOfError.betaStdError.toFixed(2)}` : '-'}</td>
                <td className="py-1 px-1 text-right font-mono text-[10px]">{(rel.pf * 100).toFixed(4)}%</td>
                <td className="py-1 px-1 text-right font-mono text-[10px]">{rel.safetyFactor.toFixed(2)}</td>
                <td className="py-1 px-1 text-center">{rel.isCritical ? <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/20 text-destructive">Crit</span> : <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary">OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
        <p className="text-xs text-muted-foreground"><strong>Legend:</strong> μ<sub>σ</sub> = mean stress ({du.stress.unit}), μ<sub>R</sub> = mean strength ({du.stress.unit}), β<sub>FORM/FOSM/SORM/TORM</sub> = reliability indices, ±SE = standard error margin, P<sub>f</sub> = probability of failure, SF = safety factor. Target β ≥ 3.0.</p>
      </div>
    </>
  );
}
