import { Scale } from "lucide-react";
import type { BeamSupportReaction } from "@/lib/beamAnalysis";
import type { Support } from "./beamTypes";

interface DisplayUnits {
  force: { factor: number; unit: string };
  moment: { factor: number; unit: string };
  length: { factor: number; unit: string };
}

interface SupportReactionsPanelProps {
  supportReactions: BeamSupportReaction[];
  supports: Support[];
  beamLength: number;
  appliedLoad: number;
  displayUnits: DisplayUnits;
  supportFallback: boolean;
}

const supportLabels: Record<Support["type"], string> = {
  pin: "Pin",
  roller: "Roller",
  fixed: "Fixed",
  hinge: "Hinge",
  none: "Support",
};

function format(value: number, precision = 2) {
  return Number.isFinite(value) ? value.toFixed(precision) : "—";
}

export function SupportReactionsPanel({
  supportReactions,
  supports,
  beamLength,
  appliedLoad,
  displayUnits,
  supportFallback,
}: SupportReactionsPanelProps) {
  const reactions = [...supportReactions].sort((a, b) => a.position - b.position);
  const reactionSum = reactions.reduce((sum, reaction) => sum + reaction.vertical, 0);
  const balanceResidual = reactionSum - appliedLoad;
  const balanceTolerance = Math.max(1e-6, Math.abs(appliedLoad) * 1e-8);
  const isBalanced = Math.abs(balanceResidual) <= balanceTolerance;

  return (
    <section className="glass-card p-6" aria-labelledby="support-reactions-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="support-reactions-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Scale className="h-5 w-5 text-primary" />
            Support Reactions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vertical reactions and support moments required to balance the applied loads.
          </p>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${
          isBalanced
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {isBalanced ? "Vertical force balanced" : "Check vertical balance"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="text-xs text-muted-foreground">Applied load resultant W</div>
          <div className="mt-1 font-mono text-lg font-bold text-foreground">
            {format(appliedLoad * displayUnits.force.factor, 3)} {displayUnits.force.unit}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Downward load positive</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="text-xs text-muted-foreground">Sum of vertical reactions ΣRᵧ</div>
          <div className="mt-1 font-mono text-lg font-bold text-foreground">
            {format(reactionSum * displayUnits.force.factor, 3)} {displayUnits.force.unit}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Upward reaction positive</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="text-xs text-muted-foreground">Force balance residual</div>
          <div className={`mt-1 font-mono text-lg font-bold ${isBalanced ? "text-accent" : "text-destructive"}`}>
            {format(balanceResidual * displayUnits.force.factor, 6)} {displayUnits.force.unit}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">ΣRᵧ − W (solver balance convention)</div>
        </div>
      </div>

      {reactions.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-muted-foreground">
                <th scope="col" className="pb-2 pr-4 font-medium">Support</th>
                <th scope="col" className="pb-2 pr-4 font-medium">Position</th>
                <th scope="col" className="pb-2 pr-4 text-right font-medium">Vertical reaction (↑ +)</th>
                <th scope="col" className="pb-2 text-right font-medium">Reaction moment</th>
              </tr>
            </thead>
            <tbody>
              {reactions.map((reaction, index) => {
                const matchedSupport = supports.reduce<Support | undefined>((best, support) => {
                  const distance = Math.abs(support.position * beamLength - reaction.position);
                  if (!best || distance < Math.abs(best.position * beamLength - reaction.position)) return support;
                  return best;
                }, undefined);
                const label = supportFallback
                  ? `Solver support ${index + 1}`
                  : `${supportLabels[matchedSupport?.type ?? "none"]} ${index + 1}`;

                return (
                  <tr key={`${reaction.position}-${index}`} className="border-b border-border/40 last:border-0">
                    <th scope="row" className="py-3 pr-4 font-medium text-foreground">{label}</th>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {format(reaction.position * displayUnits.length.factor)} {displayUnits.length.unit}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-foreground">
                      {format(reaction.vertical * displayUnits.force.factor, 3)} {displayUnits.force.unit}
                    </td>
                    <td className="py-3 text-right font-mono text-foreground">
                      {format(reaction.moment * displayUnits.moment.factor, 3)} {displayUnits.moment.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-chart-3/30 bg-chart-3/10 p-3 text-sm text-muted-foreground">
          No support reactions are available for this analysis.
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        This beam model reports vertical forces and fixed-support moments. Horizontal reactions are not modeled.
        {supportFallback && " The selected layout was unstable, so these reactions correspond to the solver's fallback support layout."}
      </p>
    </section>
  );
}
