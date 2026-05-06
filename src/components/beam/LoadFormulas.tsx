/**
 * LoadFormulas — structural formula cards for the active beam/load configuration.
 */

import type { BeamType, LoadType, BeamAnalysis } from "@/lib/reliability";
import type { LoadConfig } from "@/lib/beamAnalysis";
import { getLoadTypeLabel, getBeamTypeLabel } from "./beamTypes";

interface DisplayUnits {
  force: { factor: number; unit: string };
  moment: { factor: number; unit: string };
  deflection: { factor: number; unit: string };
}

interface LoadFormulasProps {
  beamType: BeamType;
  loadType: LoadType;
  loadMode: "single" | "hybrid";
  beamResult: BeamAnalysis;
  displayUnits: DisplayUnits;
  forceAngle?: number;
  hybridLoads?: LoadConfig[];
}

export function LoadFormulas({ beamType, loadType, loadMode, beamResult, displayUnits: du, forceAngle = 0, hybridLoads = [] }: LoadFormulasProps) {
  const isSS = beamType === "simply-supported";
  const hybridAngled = loadMode === "hybrid" && hybridLoads.some(
    (l) => (l.type === "concentrated" || l.type === "moving") && Math.abs(l.forceAngle ?? 0) > 0.001
  );
  const angleApplies =
    (loadMode !== "hybrid" && (loadType === "concentrated" || loadType === "moving") && Math.abs(forceAngle) > 0.001) ||
    hybridAngled;
  // Use Pv notation when an angle is applied; the analysis engine uses P·cos(θ) internally.
  const P = angleApplies ? "P\u1D65" : "P"; // P_v
  const isAdvancedEquivalent = ![
    "udl",
    "concentrated",
    "triangular",
    "partial-udl",
    "trapezoidal",
    "parabolic",
    "moment",
    "moving",
  ].includes(loadType);

  // Collect angled loads description for the legend
  const angledLoadsDesc = hybridLoads
    .filter((l) => (l.type === "concentrated" || l.type === "moving") && Math.abs(l.forceAngle ?? 0) > 0.001)
    .map((l, i) => `${l.type === "moving" ? "moving" : "P"}@${(l.forceAngle ?? 0).toFixed(0)}°`)
    .join(", ");

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Structural Formulas - {loadMode === "hybrid" ? "Hybrid Load (Superposition)" : getLoadTypeLabel(loadType)} ({getBeamTypeLabel(beamType)})
      </h3>
      <div className="grid md:grid-cols-3 gap-4">
        {/* Shear */}
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="text-sm font-semibold text-destructive mb-2">Shear Force V(x)</div>
          <div className="font-mono text-sm text-foreground">
            {isSS ? (
              <>
                {loadType === "udl" && <span>V(x) = wL/2 - wx</span>}
                {loadType === "concentrated" && <span>V(x) = {P}(1-a/L) for x &lt; a</span>}
                {loadType === "triangular" && <span>V(x) = wL/6 - wx²/(2L)</span>}
                {loadType === "partial-udl" && <span>V(x) = w(b-a)(L-c)/L</span>}
                {loadType === "trapezoidal" && <span>V(x) = (w₁+w₂)L/4 - ∫w(x)dx</span>}
                {loadType === "parabolic" && <span>V(x) = 2w₀L/3 - w₀x²/L</span>}
                {loadType === "moment" && <span>V(x) = 0 (pure bending)</span>}
                {loadType === "moving" && <span>V(x) = {P}(1-a/L) or -{P}a/L</span>}
                {isAdvancedEquivalent && <span>V(x) = V_eq(x) from equivalent screening model</span>}
              </>
            ) : (
              <>
                {loadType === "udl" && <span>V(x) = w(L-x)</span>}
                {loadType === "concentrated" && <span>V(x) = {P} for x &lt; a</span>}
                {loadType === "triangular" && <span>V(x) = w(L-x)²/(2L)</span>}
                {loadType === "partial-udl" && <span>V(x) = w(b-x) for a≤x≤b</span>}
                {loadType === "trapezoidal" && <span>V(x) = ∫w(ξ)dξ from x to L</span>}
                {loadType === "parabolic" && <span>V(x) = w₀(L-x)²/L</span>}
                {loadType === "moment" && <span>V(x) = 0 (pure bending)</span>}
                {loadType === "moving" && <span>V(x) = {P} for x &lt; a</span>}
                {isAdvancedEquivalent && <span>V(x) = V_eq(x) from equivalent screening model</span>}
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">V<sub>max</sub> = {(beamResult.maxShear * du.force.factor).toFixed(2)} {du.force.unit}</div>
        </div>

        {/* Moment */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-sm font-semibold text-primary mb-2">Bending Moment M(x)</div>
          <div className="font-mono text-sm text-foreground">
            {isSS ? (
              <>
                {loadType === "udl" && <span>M(x) = wx(L-x)/2</span>}
                {loadType === "concentrated" && <span>M(x) = {P}b(x)/L for x &lt; a</span>}
                {loadType === "triangular" && <span>M(x) = wLx/6 - wx³/(6L)</span>}
                {loadType === "partial-udl" && <span>M(x) = R₁x - w(x-a)²/2</span>}
                {loadType === "trapezoidal" && <span>M(x) = R₁x - ∫∫w(x)dx²</span>}
                {loadType === "parabolic" && <span>M(x) = w₀Lx/3 - w₀x³/(3L)</span>}
                {loadType === "moment" && <span>M(x) = M₀(x/L) or M₀(1-x/L)</span>}
                {loadType === "moving" && <span>M<sub>max</sub> = {P}ab/L</span>}
                {isAdvancedEquivalent && <span>M(x) = M_eq(x) with documented equivalent load path</span>}
              </>
            ) : (
              <>
                {loadType === "udl" && <span>M(x) = -w(L-x)²/2</span>}
                {loadType === "concentrated" && <span>M(x) = -{P}(a-x) for x &lt; a</span>}
                {loadType === "triangular" && <span>M(x) = -w(L-x)³/(6L)</span>}
                {loadType === "partial-udl" && <span>M(x) = -w(b-x)²/2</span>}
                {loadType === "trapezoidal" && <span>M(x) = -∫∫w(ξ)dξ²</span>}
                {loadType === "parabolic" && <span>M(x) = -w₀(L-x)³/(3L)</span>}
                {loadType === "moment" && <span>M(x) = M₀ (constant)</span>}
                {loadType === "moving" && <span>M(x) = -{P}(a-x)</span>}
                {isAdvancedEquivalent && <span>M(x) = M_eq(x) with documented equivalent load path</span>}
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">M<sub>max</sub> = {(beamResult.maxBendingMoment * du.moment.factor).toFixed(2)} {du.moment.unit}</div>
        </div>

        {/* Deflection */}
        {isAdvancedEquivalent && <span className="sr-only">deflection = equivalent-load serviceability estimate</span>}
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
          <div className="text-sm font-semibold text-accent mb-2">Deflection δ(x)</div>
          <div className="font-mono text-sm text-foreground">
            {isSS ? (
              <>
                {loadType === "udl" && <span>δ<sub>max</sub> = 5wL⁴/(384EI)</span>}
                {loadType === "concentrated" && <span>δ<sub>max</sub> = {P}L³/(48EI) at center</span>}
                {loadType === "triangular" && <span>δ<sub>max</sub> = wL⁴/(120EI)</span>}
                {loadType === "partial-udl" && <span>δ = f(a,b,L,EI)</span>}
                {loadType === "trapezoidal" && <span>δ = superposition method</span>}
                {loadType === "parabolic" && <span>δ<sub>max</sub> = w₀L⁴/(120EI)</span>}
                {loadType === "moment" && <span>δ = M₀L²/(16EI) at center</span>}
                {loadType === "moving" && <span>δ = {P}a²b²/(3EIL)</span>}
              </>
            ) : (
              <>
                {loadType === "udl" && <span>δ<sub>max</sub> = wL⁴/(8EI)</span>}
                {loadType === "concentrated" && <span>δ<sub>max</sub> = {P}L³/(3EI)</span>}
                {loadType === "triangular" && <span>δ<sub>max</sub> = wL⁴/(30EI)</span>}
                {loadType === "partial-udl" && <span>δ = f(a,b,L,EI)</span>}
                {loadType === "trapezoidal" && <span>δ = superposition method</span>}
                {loadType === "parabolic" && <span>δ<sub>max</sub> = w₀L⁴/(15EI)</span>}
                {loadType === "moment" && <span>δ<sub>max</sub> = M₀L²/(2EI)</span>}
                {loadType === "moving" && <span>δ = {P}(L-a)²(2L+a)/(6EI)</span>}
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">δ<sub>max</sub> = {(Math.abs(beamResult.maxDeflection) * du.deflection.factor).toFixed(3)} {du.deflection.unit}</div>
        </div>
      </div>

      <div className="mt-4 p-3 rounded bg-muted/30 text-xs text-muted-foreground">
        <span className="font-semibold">Notation:</span> w = load intensity, L = beam length, P = point load
        {angleApplies && (
          loadMode === "hybrid"
            ? <> (Pᵥ = P·cos(θ) — vertical component used in analysis; angled loads: {angledLoadsDesc})</>
            : <> (Pᵥ = P·cos({forceAngle.toFixed(0)}°) = vertical component used in analysis)</>
        )},
        a,b = load positions, E = elastic modulus, I = moment of inertia, M₀ = applied moment,
        R₁ = reaction at left support
      </div>
    </div>
  );
}
