import { useState } from "react";
import { ArrowDown, Zap, Divide, MapPin, Maximize2, Waves, ChevronDown, ChevronUp } from "lucide-react";

interface LadderStep {
  id: string;
  icon: React.ReactNode;
  label: string;
  notation: string;
  formula: string;
  civilExample: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const ladderSteps: LadderStep[] = [
  {
    id: "intensity",
    icon: <Zap className="h-5 w-5" />,
    label: "Intensity Field",
    notation: "I(z) ≥ 0",
    formula: "Raw nonnegative field over domain Ω",
    civilExample: "w(x) [N/m] — beam line load, p(x) [Pa] — surface pressure, b(x) [N/m³] — body force",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/40",
  },
  {
    id: "normalize",
    icon: <Divide className="h-5 w-5" />,
    label: "Normalize → Density",
    notation: "f(z) = I(z) / I₀",
    formula: "I₀ = ∫_Ω I(z) dμ(z)  →  ∫f dμ = 1",
    civilExample: "Divide load by resultant R → dimensionless density that is literally a probability distribution",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    borderColor: "border-secondary/40",
  },
  {
    id: "centroid",
    icon: <MapPin className="h-5 w-5" />,
    label: "Centroid (1st Moment)",
    notation: "ϕ̄ = ∫ ϕ(z) f(z) dμ",
    formula: "Location where the resultant 'acts'",
    civilExample: "x̄ = ∫xw dx / R — line of action of beam load; center of pressure for slab loads",
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/40",
  },
  {
    id: "spread",
    icon: <Maximize2 className="h-5 w-5" />,
    label: "Spread (2nd Moment)",
    notation: "Σ = ∫ r rᵀ f dμ",
    formula: "r(z) = ϕ(z) − ϕ̄   →   Variance / Covariance",
    civilExample: "μ₂ = load spread → Var(M) = (L²/8)² Var(w) → feeds directly into Pf via β",
    color: "text-chart-posterior",
    bgColor: "bg-chart-posterior/10",
    borderColor: "border-chart-posterior/40",
  },
  {
    id: "shape",
    icon: <Waves className="h-5 w-5" />,
    label: "Shape (Higher Moments)",
    notation: "μₖ = ∫ (ϕ − ϕ̄)ᵏ f dμ",
    formula: "k=3 → Skewness (asymmetry),  k=4 → Kurtosis (tails)",
    civilExample: "Skewness shifts critical location; Kurtosis amplifies extreme event probability → Pf adjustment",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/40",
  },
];

export function MomentLadderFlowchart() {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggleStep = (id: string) => {
    setExpandedStep(prev => (prev === id ? null : id));
  };

  return (
    <div className="glass-card-compact p-5 mb-6">
      <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        The Moment Ladder Pipeline
      </h4>
      <p className="text-xs text-muted-foreground mb-5">
        Click any stage to see details. Every nonnegative engineering load follows this universal pipeline — from raw intensity to shape descriptors.
      </p>

      <div className="flex flex-col items-center gap-0">
        {ladderSteps.map((step, idx) => (
          <div key={step.id} className="w-full max-w-xl flex flex-col items-center">
            {/* Step Card */}
            <button
              onClick={() => toggleStep(step.id)}
              className={`
                w-full rounded-xl border-2 p-4 transition-all duration-200 text-left
                ${step.borderColor} ${step.bgColor}
                ${expandedStep === step.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                hover:shadow-md
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${step.bgColor} ${step.color}`}>
                    {step.icon}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${step.color}`}>{step.label}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">{step.notation}</div>
                  </div>
                </div>
                <div className={`${step.color}`}>
                  {expandedStep === step.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedStep === step.id && (
                <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-fade-in">
                  <div>
                    <span className="text-xs font-medium text-foreground">Formula: </span>
                    <span className="text-xs font-mono text-primary">{step.formula}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-foreground">Civil Engineering: </span>
                    <span className="text-xs text-muted-foreground">{step.civilExample}</span>
                  </div>
                </div>
              )}
            </button>

            {/* Arrow Connector */}
            {idx < ladderSteps.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <ArrowDown className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Outcome summary */}
      <div className="mt-5 p-3 rounded-lg bg-muted/30 border border-border/40 text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Result:</span>{" "}
          Statistical moments (M₁–M₄) ≡ Mechanical load descriptors. Changes propagate through{" "}
          <span className="font-mono text-primary">Var(M) → Var(σ) → β → Pf</span>.
        </p>
      </div>
    </div>
  );
}
