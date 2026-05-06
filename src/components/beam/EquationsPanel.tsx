/**
 * EquationsPanel — load-type-specific key equations.
 */

import type { LoadType } from "@/lib/reliability";
import { getLoadTypeLabel } from "./beamTypes";

interface EquationsPanelProps {
  loadType: LoadType;
}

export function EquationsPanel({ loadType }: EquationsPanelProps) {
  const isAdvancedEquivalent = !["udl", "concentrated", "triangular", "moving"].includes(loadType);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {getLoadTypeLabel(loadType)} - Equations
      </h3>
      <div className="grid md:grid-cols-2 gap-4 font-mono text-sm">
        {loadType === "udl" && (
          <>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Total Load</div>
              <div className="text-muted-foreground">W = w · L</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Max Moment (SS)</div>
              <div className="text-muted-foreground">M<sub>max</sub> = wL²/8</div>
            </div>
          </>
        )}
        {loadType === "concentrated" && (
          <>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Reactions (SS)</div>
              <div className="text-muted-foreground">R₁ = Pb/L, R₂ = Pa/L</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Max Moment</div>
              <div className="text-muted-foreground">M<sub>max</sub> = Pab/L</div>
            </div>
          </>
        )}
        {loadType === "triangular" && (
          <>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Total Load</div>
              <div className="text-muted-foreground">W = w₀L/2</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Centroid</div>
              <div className="text-muted-foreground">x̄ = L/3 (from peak)</div>
            </div>
          </>
        )}
        {loadType === "moving" && (
          <>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Influence Line</div>
              <div className="text-muted-foreground">M(a) = Pa(L-a)/L</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Max Moment Position</div>
              <div className="text-muted-foreground">At a = L/2: M<sub>max</sub> = PL/4</div>
            </div>
          </>
        )}
        {isAdvancedEquivalent && (
          <>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Equivalent Load Path</div>
              <div className="text-muted-foreground">q_eq(x) or P_eq selected from load family</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-primary mb-2">Screening Demand</div>
              <div className="text-muted-foreground">S_eq = max(V_eq, M_eq, deflection_eq)</div>
            </div>
          </>
        )}
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-primary mb-2">Max Stress</div>
          <div className="text-muted-foreground">σ = M<sub>max</sub> / S</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-primary mb-2">Reliability Index</div>
          <div className="text-muted-foreground">β = (μ<sub>R</sub> - μ<sub>S</sub>) / √(σ²)</div>
        </div>
      </div>
    </div>
  );
}
