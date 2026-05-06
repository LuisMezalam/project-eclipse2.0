import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { MomentLadderFlowchart } from "./MomentLadderFlowchart";
import { MomentCalculusCalculator } from "./MomentCalculusCalculator";

interface FormulaProps {
  name: string;
  formula: string;
  description: string;
  variables?: { symbol: string; meaning: string }[];
  usedIn?: string[];
  category?: "core" | "advanced" | "specialized";
  reference?: string;
}

const Formula = ({ name, formula, description, variables, usedIn, category = "core", reference }: FormulaProps) => (
  <div className="border border-border/50 rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors">
    <div className="flex items-start justify-between gap-2 mb-2">
      <h4 className="font-semibold text-foreground">{name}</h4>
      <Badge variant={category === "core" ? "default" : category === "advanced" ? "secondary" : "outline"} className="text-xs">
        {category}
      </Badge>
    </div>
    <div className="bg-muted/50 rounded-md p-3 font-mono text-sm mb-3 overflow-x-auto">
      <code className="text-primary whitespace-pre-wrap">{formula}</code>
    </div>
    <p className="text-sm text-muted-foreground mb-2">{description}</p>
    {reference && (
      <p className="text-xs text-muted-foreground/70 italic mb-2">Ref: {reference}</p>
    )}
    {variables && variables.length > 0 && (
      <div className="mt-3">
        <p className="text-xs font-medium text-foreground mb-1">Variables:</p>
        <div className="flex flex-wrap gap-2">
          {variables.map((v, i) => (
            <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
              <span className="font-mono text-primary">{v.symbol}</span>: {v.meaning}
            </span>
          ))}
        </div>
      </div>
    )}
    {usedIn && usedIn.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1">
        {usedIn.map((tab, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {tab}
          </Badge>
        ))}
      </div>
    )}
  </div>
);

interface MomentCalculusLibraryProps {
  onSendToPf?: (data: { meanLoad: number; loadCoV: number; beamLength: number }) => void;
}

export const MomentCalculusLibrary = ({ onSendToPf }: MomentCalculusLibraryProps = {}) => {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Moment Calculus — Unified Load Framework
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          From Meza (2025/2026): nonnegative intensity fields normalized into probability densities produce
          statistical moments identical to rigidized/mechanical moments. This section captures the civil
          engineering applications of the universal moment-ladder pipeline.
        </p>
      </CardHeader>
      <CardContent>
        <MomentLadderFlowchart />
        <MomentCalculusCalculator onSendToPf={onSendToPf} />
        <Accordion type="multiple" className="space-y-2">

          {/* 1. Universal Definitions & Normalization */}
          <AccordionItem value="universal-definitions">
            <AccordionTrigger className="text-sm font-medium">Universal Definitions & Normalization</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Nonnegative Intensity Field"
                formula="I(z) ≥ 0,   z ∈ Ω,   I₀ := ∫_Ω I(z) dμ(z) ∈ (0, ∞)"
                description="A load is a nonnegative intensity field over a measurable domain Ω (spatial, temporal, or parametric). Its integral is the resultant."
                variables={[
                  { symbol: "I(z)", meaning: "Intensity at point z" },
                  { symbol: "Ω", meaning: "Domain (line, area, volume, time interval)" },
                  { symbol: "dμ", meaning: "Domain measure (dx, dA, dV, dt)" },
                  { symbol: "I₀", meaning: "Resultant (total load)" },
                ]}
                usedIn={["Stat Moments", "Static Loads"]}
                category="core"
                reference="Meza (2026) §1.1"
              />
              <Formula
                name="Normalization to Density"
                formula="f(z) = I(z) / I₀,   ∫_Ω f(z) dμ(z) = 1"
                description="Dividing by the resultant produces a dimensionless density (probability measure). This is the bridge that makes statistical and mechanical moments identical."
                variables={[
                  { symbol: "f(z)", meaning: "Normalized density (dimensionless)" },
                  { symbol: "I₀", meaning: "Total intensity / resultant" },
                ]}
                usedIn={["Stat Moments", "Static Loads"]}
                category="core"
                reference="Meza (2026) §1.2"
              />
              <Formula
                name="Dimensional Sanity Check"
                formula="[I₀] = [I] × [μ]"
                description="The resultant's units equal intensity units times measure units. E.g., w(x) [N/m] × dx [m] = Force [N]; q″ [W/m²] × dA [m²] = Power [W]."
                usedIn={["All tabs"]}
                category="core"
                reference="Meza (2026) §1.1"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 2. The Moment Ladder */}
          <AccordionItem value="moment-ladder">
            <AccordionTrigger className="text-sm font-medium">The Moment Ladder</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Zeroth Moment (Resultant)"
                formula="I₀ = ∫_Ω I(z) dμ(z)"
                description="Total intensity over the domain. For a beam line load: resultant force R = ∫₀ᴸ w(x) dx. For pressure: resultant force F = ∫_A p dA."
                usedIn={["Static Loads", "Stat Moments"]}
                category="core"
                reference="Meza (2026) §1.3"
              />
              <Formula
                name="First Raw Moment & Centroid"
                formula="I₁ = ∫_Ω ϕ(z) I(z) dμ(z),   ϕ̄ = I₁ / I₀"
                description="The centroid ϕ̄ is the location where the resultant 'acts'. For line loads: x̄ = ∫xw dx / ∫w dx. For pressure: center of pressure."
                variables={[
                  { symbol: "ϕ(z)", meaning: "Coordinate map (position, time, etc.)" },
                  { symbol: "ϕ̄", meaning: "Centroid / point of action" },
                ]}
                usedIn={["Static Loads", "Stat Moments"]}
                category="core"
                reference="Meza (2026) §1.3"
              />
              <Formula
                name="Second Central Moment (Spread)"
                formula="Σ = ∫_Ω r(z) r(z)ᵀ f(z) dμ(z),   r(z) = ϕ(z) - ϕ̄"
                description="Covariance-like tensor measuring spread/nonuniformity of the load about its centroid. In 1D: μ₂ = ∫(x - x̄)² f(x) dx = variance of normalized load."
                variables={[
                  { symbol: "r(z)", meaning: "Deviation from centroid" },
                  { symbol: "Σ", meaning: "Spread / covariance tensor" },
                  { symbol: "μ₂", meaning: "Scalar second central moment (1D)" },
                ]}
                usedIn={["Stat Moments", "Static Loads", "Pf Analysis"]}
                category="core"
                reference="Meza (2026) §1.3"
              />
              <Formula
                name="Higher Central Moments (Shape)"
                formula="μₖ = ∫_Ω (ϕ(z) - ϕ̄)ᵏ f(z) dμ(z),   k = 3, 4, ..."
                description="Third central moment → skewness (asymmetry of load distribution). Fourth central moment → kurtosis (tail heaviness / extreme event concentration)."
                variables={[
                  { symbol: "μ₃", meaning: "Third central moment → skewness" },
                  { symbol: "μ₄", meaning: "Fourth central moment → kurtosis" },
                ]}
                usedIn={["Stat Moments", "Truss", "Pf Analysis"]}
                category="core"
                reference="Meza (2026) §1.3"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 3. Structural Load Applications */}
          <AccordionItem value="structural-loads">
            <AccordionTrigger className="text-sm font-medium">Structural Load Applications</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Beam Line Load (M-001)"
                formula="R = ∫₀ᴸ w(x) dx,   x̄ = (1/R) ∫₀ᴸ x w(x) dx,   μ₂ = (1/R) ∫₀ᴸ (x - x̄)² w(x) dx"
                description="Distributed line load w(x) [N/m] on beam of length L. Resultant R is total force; centroid x̄ is line of action; μ₂ is load spread."
                variables={[
                  { symbol: "w(x)", meaning: "Load intensity [N/m]" },
                  { symbol: "R", meaning: "Resultant force [N]" },
                  { symbol: "x̄", meaning: "Centroid / line of action [m]" },
                  { symbol: "μ₂", meaning: "Load spread [m²]" },
                ]}
                usedIn={["Static Loads", "Stat Moments"]}
                category="core"
                reference="Meza (2026) §5, M-001"
              />
              <Formula
                name="Surface Pressure (M-002)"
                formula="F = ∫_A p(x) dA,   x̄ = (1/F) ∫_A x p(x) dA,   Σ = (1/F) ∫_A (x - x̄)(x - x̄)ᵀ p(x) dA"
                description="Pressure magnitude p ≥ 0 over area A. Resultant is total force; centroid approximates center of pressure; Σ gives the pressure footprint covariance."
                variables={[
                  { symbol: "p(x)", meaning: "Pressure [Pa = N/m²]" },
                  { symbol: "F", meaning: "Resultant force [N]" },
                  { symbol: "Σ", meaning: "Footprint covariance [m²]" },
                ]}
                usedIn={["Static Loads", "Stat Moments"]}
                category="advanced"
                reference="Meza (2026) §5, M-002"
              />
              <Formula
                name="Body Force Density (M-017)"
                formula="F = ∫_V ‖b(x)‖ dV,   x̄ = (1/F) ∫_V x ‖b(x)‖ dV"
                description="Volumetric body force magnitude b(x) [N/m³]. Resultant is total body force; centroid is center of gravity for self-weight loads."
                variables={[
                  { symbol: "b(x)", meaning: "Body force density [N/m³]" },
                  { symbol: "V", meaning: "Volume domain" },
                ]}
                usedIn={["Static Loads"]}
                category="advanced"
                reference="Meza (2026) §5, M-017"
              />
              <Formula
                name="Surface Traction (M-018)"
                formula="T = ∫_A ‖t(x)‖ dA,   x̄ = (1/T) ∫_A x ‖t(x)‖ dA"
                description="Traction magnitude on a surface. Integrating gives total intensity; centroid gives point of action; spread gives footprint."
                variables={[
                  { symbol: "t(x)", meaning: "Traction vector [N/m²]" },
                  { symbol: "‖t‖", meaning: "Traction magnitude (scalarization)" },
                ]}
                usedIn={["Static Loads"]}
                category="advanced"
                reference="Meza (2026) §5, M-018"
              />
              <Formula
                name="Concentrated Force (M-019)"
                formula="I(z) = F × δ(z - z₀)"
                description="Point load as Dirac delta intensity. Resultant = F, centroid = z₀, variance = 0. Negative-order moments require regularization ε."
                variables={[
                  { symbol: "F", meaning: "Concentrated force magnitude [N]" },
                  { symbol: "δ", meaning: "Dirac delta function" },
                  { symbol: "z₀", meaning: "Point of application" },
                ]}
                usedIn={["Static Loads", "Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §5, M-019"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 4. Moment Propagation in Structures */}
          <AccordionItem value="moment-propagation">
            <AccordionTrigger className="text-sm font-medium">Moment Propagation in Structures</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Beam Moment from Load Variance"
                formula="E[M] = E[w] × L²/8,   Var(M) = (L²/8)² × Var(w)"
                description="For a simply-supported beam under random UDL, the midspan moment is a linear function of w. Mean and variance propagate through the L²/8 factor."
                variables={[
                  { symbol: "E[w]", meaning: "Mean load intensity" },
                  { symbol: "Var(w)", meaning: "Variance of load intensity" },
                  { symbol: "L", meaning: "Span length" },
                ]}
                usedIn={["Static Loads", "Stat Moments", "Pf Analysis"]}
                category="core"
                reference="Meza (2025) Eq. 7"
              />
              <Formula
                name="Slab Strip Linear Response"
                formula="E[Mx] = c × E[q],   Var(Mx) = c² × Var(q)"
                description="Slab/strip bending moment is linearly proportional to applied load q with coefficient c determined by boundary conditions."
                variables={[
                  { symbol: "c", meaning: "Response coefficient (from plate theory)" },
                  { symbol: "q", meaning: "Applied distributed load" },
                ]}
                usedIn={["Static Loads"]}
                category="core"
                reference="Meza (2025)"
              />
              <Formula
                name="Stress Variance from Moment Variance"
                formula="Var(σ) = Var(M) / S²"
                description="Bending stress σ = M/S propagates uncertainty from moment to stress through the section modulus. This feeds directly into reliability calculations."
                variables={[
                  { symbol: "S", meaning: "Section modulus" },
                  { symbol: "Var(M)", meaning: "Variance of bending moment" },
                ]}
                usedIn={["Pf Analysis", "Static Loads"]}
                category="core"
                reference="Meza (2025)"
              />
              <Formula
                name="Skewness Effect on Critical Location"
                formula="Δx_crit ≈ γ₁ × L × c_shift"
                description="Asymmetric load distribution (nonzero skewness γ₁) shifts the location of maximum response away from midspan. The shift is proportional to span and skewness."
                variables={[
                  { symbol: "γ₁", meaning: "Skewness of load distribution" },
                  { symbol: "c_shift", meaning: "Shift coefficient (geometry-dependent)" },
                ]}
                usedIn={["Stat Moments", "Static Loads"]}
                category="advanced"
                reference="Meza (2025)"
              />
              <Formula
                name="Kurtosis Effect on Extreme Events"
                formula="Pf_adj ≈ Pf × [1 + (κ - 3) × c_tail]"
                description="Excess kurtosis (κ > 3) indicates heavier tails than Gaussian. The probability of failure must be adjusted upward; the normal assumption underestimates tail risk."
                variables={[
                  { symbol: "κ", meaning: "Kurtosis of load distribution" },
                  { symbol: "c_tail", meaning: "Tail sensitivity coefficient" },
                ]}
                usedIn={["Pf Analysis", "Stat Moments"]}
                category="advanced"
                reference="Meza (2025)"
              />
              <Formula
                name="Dynamic Amplification from Mass Variance"
                formula="DAF ≈ 1 + c_d × Var(m) / μ_m²"
                description="Variance in mass distribution affects effective stiffness and hence dynamic response. Higher mass variance increases the dynamic amplification factor."
                variables={[
                  { symbol: "Var(m)", meaning: "Variance of distributed mass" },
                  { symbol: "μ_m", meaning: "Mean mass" },
                  { symbol: "c_d", meaning: "Dynamic coupling coefficient" },
                ]}
                usedIn={["Dynamic", "Stat Moments"]}
                category="advanced"
                reference="Meza (2026) §2.2"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 5. Signed Field Handling */}
          <AccordionItem value="signed-fields">
            <AccordionTrigger className="text-sm font-medium">Signed Field Handling</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Intensity Transform"
                formula="I(z) ∈ { |S(z)|, S(z)², energy density, dissipation rate }"
                description="A signed field S(z) is not a valid intensity. Choose a nonnegative surrogate: absolute value, square, or a physically meaningful energy/dissipation proxy."
                variables={[
                  { symbol: "S(z)", meaning: "Signed field (e.g., gauge pressure, temperature deviation)" },
                  { symbol: "I(z)", meaning: "Nonnegative surrogate intensity" },
                ]}
                usedIn={["Stat Moments"]}
                category="advanced"
                reference="Meza (2026) §3"
              />
              <Formula
                name="Jordan Decomposition"
                formula="S(z) = S⁺(z) - S⁻(z),   S⁺(z) = max(S, 0),   S⁻(z) = max(-S, 0)"
                description="Split a signed field into positive and negative parts, each nonnegative. Compute moment ladders for S⁺ and S⁻ separately. Critical for bending moment diagrams, gauge pressure fields."
                variables={[
                  { symbol: "S⁺", meaning: "Positive part (≥ 0)" },
                  { symbol: "S⁻", meaning: "Negative part (≥ 0)" },
                ]}
                usedIn={["Static Loads", "Stat Moments"]}
                category="advanced"
                reference="Meza (2026) §3"
              />
              <Formula
                name="Temperature Field Conversion"
                formula="I(x) = (T(x) - T_ref)₊  or  I(x) = (T(x) - T̄)²  or  I(x) = ‖∇T‖"
                description="Temperature is a state variable, not a load. Convert to intensity via positive deviation from reference, squared deviation, or gradient magnitude. Centroid locates hotspot; spread gives footprint."
                variables={[
                  { symbol: "T_ref", meaning: "Reference temperature" },
                  { symbol: "∇T", meaning: "Temperature gradient" },
                ]}
                usedIn={["Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §6"
              />
              <Formula
                name="Gauge Pressure Conversion"
                formula="I(x) = |p_g(x)|  or  split: p⁺(x), p⁻(x)"
                description="Gauge pressure is signed relative to ambient. Use magnitude or Jordan split before applying the moment ladder. Centroid and spread give the pressure footprint."
                usedIn={["Static Loads", "Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §6"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 6. Negative-Order Moments */}
          <AccordionItem value="negative-order">
            <AccordionTrigger className="text-sm font-medium">Negative-Order Moments (Localization)</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Raw Inverse Moment"
                formula="m₋ₖ = E[X⁻ᵏ] = ∫₀^∞ x⁻ᵏ f(x) dx,   k > 0"
                description="Inverse-power moments quantify localization/concentration of the load. They exist only if the density near x = 0 decays sufficiently fast. Higher k amplifies near-origin behavior."
                variables={[
                  { symbol: "k", meaning: "Order of inverse moment (positive integer)" },
                  { symbol: "f(x)", meaning: "Normalized density" },
                ]}
                usedIn={["Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §4.1"
              />
              <Formula
                name="Central Inverse Moment (Singularity)"
                formula="μ₋ₖ = ∫_Ω |r(z)|⁻ᵏ f(z) dμ(z),   r = ϕ(z) - ϕ̄"
                description="In 1D, if f(ϕ̄) > 0 and f is continuous near the centroid, central inverse moments diverge for all k ≥ 1. This is not a defect—it encodes that inverse-power localization is singular at perfect centering."
                variables={[
                  { symbol: "r(z)", meaning: "Deviation from centroid" },
                  { symbol: "k", meaning: "Order (k ≥ 1 diverges in continuous fields)" },
                ]}
                usedIn={["Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §4.2"
              />
              <Formula
                name="Regularized Inverse Moment"
                formula="μ₋ₖ,ε = ∫_Ω (r(z)² + ε²)^(-k/2) f(z) dμ(z)"
                description="Engineering fix: introduce a physically meaningful resolution scale ε > 0 (sensor footprint, mesh size, minimum resolvable scale). Always report ε alongside negative-order results."
                variables={[
                  { symbol: "ε", meaning: "Resolution scale (mesh size, sensor footprint)" },
                  { symbol: "k", meaning: "Inverse moment order" },
                ]}
                usedIn={["Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §4.3"
              />
              <Formula
                name="Effective Width (Localization Proxy)"
                formula="w_eff(k, ε) = μ₋ₖ,ε^(-1/k)"
                description="A derived scalar that converts the regularized inverse moment into a length scale representing the effective width of load concentration. Useful for hotspot characterization."
                variables={[
                  { symbol: "w_eff", meaning: "Effective concentration width" },
                  { symbol: "μ₋ₖ,ε", meaning: "Regularized inverse moment" },
                ]}
                usedIn={["Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §4.4"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 7. Balance Law & Conservation */}
          <AccordionItem value="balance-laws">
            <AccordionTrigger className="text-sm font-medium">Balance Laws & Conservation</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Generic Balance Law"
                formula="d/dt ∫_V ψ dV = -∫_∂V J · n dA + ∫_V s dV"
                description="Classical physics is built on integral balance laws. Each integrand (density ψ, flux J·n, source s) is an intensity field whose integral is a resultant. The moment ladder applies whenever the integrand is nonnegative."
                variables={[
                  { symbol: "ψ", meaning: "Density (per volume)" },
                  { symbol: "J · n", meaning: "Boundary flux (per area)" },
                  { symbol: "s", meaning: "Volumetric source term" },
                ]}
                usedIn={["Static Loads", "Dynamic"]}
                category="advanced"
                reference="Meza (2026) §2.1"
              />
              <Formula
                name="Structural Effort–Flow Power"
                formula="P = F × v   (translational),   P = τ × ω   (rotational)"
                description="Power as effort × flow is always nonnegative for dissipative systems. This makes power dissipation a natural intensity field for unifying structural dynamics."
                variables={[
                  { symbol: "F", meaning: "Force (effort)" },
                  { symbol: "v", meaning: "Velocity (flow)" },
                  { symbol: "τ", meaning: "Torque" },
                  { symbol: "ω", meaning: "Angular velocity" },
                ]}
                usedIn={["Dynamic"]}
                category="advanced"
                reference="Meza (2026) §2.2"
              />
              <Formula
                name="Viscous Damper Dissipation (M-008)"
                formula="I(t) = b × ẋ(t)²"
                description="Translational damper dissipation is nonnegative intensity over time. Integrates to dissipated energy; centroid and spread show intermittency of dissipation."
                variables={[
                  { symbol: "b", meaning: "Damping coefficient [N·s/m]" },
                  { symbol: "ẋ(t)", meaning: "Velocity at time t" },
                ]}
                usedIn={["Dynamic"]}
                category="advanced"
                reference="Meza (2026) §5, M-008"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 8. Verification & Dimensional Analysis */}
          <AccordionItem value="verification">
            <AccordionTrigger className="text-sm font-medium">Verification & Dimensional Analysis</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Units Harness"
                formula="[f] = dimensionless,   [I₀] = [I] × [μ],   [ϕ̄] = [ϕ],   [Σ] = [ϕ]²"
                description="For every load application: verify that the normalized density is dimensionless, the resultant has correct units, the centroid has coordinate units, and the spread has squared coordinate units."
                usedIn={["All tabs"]}
                category="core"
                reference="Meza (2026) §8.1"
              />
              <Formula
                name="Conservation Invariant Check"
                formula="∫_Ω I dμ = I₀ = constant (steady state)"
                description="When the load derives from a balance law, verify that the resultant satisfies conservation. For beams: ΣF = 0, ΣM = 0. For dynamics: energy dissipation balances input."
                usedIn={["Static Loads", "Dynamic"]}
                category="core"
                reference="Meza (2026) §8.2"
              />
              <Formula
                name="Negative-Order Audit Protocol"
                formula="Report: (1) reference point, (2) raw vs central, (3) ε value, (4) ε-sensitivity"
                description="Any negative-order statistic must state the chosen reference point, whether raw or central, the regularization scale ε, and demonstrate stability of conclusions under reasonable ε variation."
                usedIn={["Stat Moments"]}
                category="specialized"
                reference="Meza (2026) §8.3"
              />
            </AccordionContent>
          </AccordionItem>

          {/* 9. Equivalence Statements */}
          <AccordionItem value="equivalence">
            <AccordionTrigger className="text-sm font-medium">Equivalence Statements (Structures ↔ Densities)</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <Formula
                name="Beam Load ↔ Probability Density"
                formula="w(x) [N/m] → f(x) = w(x)/R → centroid x̄, variance σ², skewness γ₁, kurtosis κ"
                description="A beam line load normalized by its resultant is literally a probability density. The statistical centroid equals the mechanical line of action; the variance equals the second central moment of the load about its line of action."
                usedIn={["Stat Moments", "Static Loads"]}
                category="core"
                reference="Meza (2026) §7"
              />
              <Formula
                name="Pressure ↔ Spatial Density"
                formula="p(x) [Pa] → f(x) = p(x)/F → centroid (center of pressure), covariance Σ (pressure footprint)"
                description="Pressure distribution normalized by resultant force yields a 2D density. Its moments characterize the center of pressure and the extent of the loaded region."
                usedIn={["Static Loads", "Stat Moments"]}
                category="advanced"
                reference="Meza (2026) §7"
              />
              <Formula
                name="Wall Shear ↔ Traction Density (M-005)"
                formula="|τ_w(x)| → f(x) = |τ_w(x)| / ∫|τ_w| dA → shear centroid, shear spread"
                description="Wall shear magnitude on a surface normalized by total shear intensity. Centroid locates the effective shear center; spread measures the shear distribution footprint."
                usedIn={["Static Loads"]}
                category="advanced"
                reference="Meza (2026) §5, M-005"
              />
              <Formula
                name="Force Input ↔ Temporal Density (M-006)"
                formula="|F(t)| → f(t) = |F(t)| / ∫|F| dt → temporal centroid, temporal spread"
                description="External force magnitude over time normalized to a density. The centroid gives the center-of-action in time; the spread quantifies duration/intermittency."
                variables={[
                  { symbol: "F(t)", meaning: "Time-varying external force" },
                ]}
                usedIn={["Dynamic"]}
                category="advanced"
                reference="Meza (2026) §5, M-006"
              />
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </CardContent>
    </Card>
  );
};
