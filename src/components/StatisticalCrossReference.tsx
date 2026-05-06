import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ArrowRight, Link2, TrendingUp, Activity, BarChart3, Sigma } from "lucide-react";
import { normalCDF } from "@/lib/reliability";

interface CrossReferenceProps {
  // Shared statistical parameters
  loadMean: number;
  loadVariance: number;
  loadSkewness: number;
  loadKurtosis: number;
  beamLength: number;
  resistanceMean: number;
  resistanceCoV: number;
}

export function StatisticalCrossReference({
  loadMean,
  loadVariance,
  loadSkewness,
  loadKurtosis,
  beamLength,
  resistanceMean,
  resistanceCoV,
}: CrossReferenceProps) {
  // Compute cross-tab relationships based on Meza (2025)
  const crossEffects = useMemo(() => {
    const loadStdDev = Math.sqrt(loadVariance);
    const loadCoV = loadStdDev / loadMean;
    
    // Moment variance: Var(M) = L²/8 × Var(w) - Eq. 7
    const momentVariance = (beamLength * beamLength / 8) * loadVariance;
    const momentStdDev = Math.sqrt(momentVariance);
    
    // Max moment for simply-supported beam with UDL
    const maxMoment = (loadMean * beamLength * beamLength) / 8;
    
    // Stress variance propagation (assuming S = M/Z)
    const sectionModulus = 1e-4; // Typical value m³
    const stressMean = maxMoment / sectionModulus;
    const stressVariance = momentVariance / (sectionModulus * sectionModulus);
    const stressStdDev = Math.sqrt(stressVariance);
    
    // Reliability index: β = (μR - μS) / √(σR² + σS²)
    const resistanceStdDev = resistanceMean * resistanceCoV;
    const beta = (resistanceMean - stressMean) / Math.sqrt(resistanceStdDev * resistanceStdDev + stressVariance);
    const pf = normalCDF(-beta);
    
    // Dynamic effects: natural frequency affected by mass distribution (2nd moment)
    // Higher variance in mass → lower effective stiffness
    const dynamicAmplification = 1 + 0.1 * (loadVariance / (loadMean * loadMean));
    
    // Skewness effect: asymmetric load distribution shifts critical point
    const criticalPointShift = loadSkewness * beamLength * 0.05;
    
    // Kurtosis effect: extreme event probability
    // Higher kurtosis → heavier tails → more extreme events
    const extremeEventMultiplier = 1 + (loadKurtosis - 3) * 0.1;
    const adjustedPf = pf * Math.max(0.5, extremeEventMultiplier);
    
    // Truss effect: member force variance from joint load variance
    const memberForceVariance = loadVariance * 1.2; // Amplified through structure
    
    return {
      loadStdDev,
      loadCoV,
      momentVariance,
      momentStdDev,
      maxMoment,
      stressMean,
      stressStdDev,
      beta,
      pf,
      dynamicAmplification,
      criticalPointShift,
      extremeEventMultiplier,
      adjustedPf,
      memberForceVariance,
    };
  }, [loadMean, loadVariance, loadSkewness, loadKurtosis, beamLength, resistanceMean, resistanceCoV]);

  const connections = [
    {
      from: "Stat Moments",
      to: "Static Loads",
      icon: <Sigma className="h-4 w-4" />,
      formula: "Var(M) = L²σ²/8",
      description: "Load variance propagates to moment uncertainty",
      value: `σ_w = ${crossEffects.loadStdDev.toFixed(2)} → σ_M = ${crossEffects.momentStdDev.toFixed(2)} kN·m`,
      color: "text-primary",
    },
    {
      from: "Static Loads",
      to: "Pf Analysis",
      icon: <TrendingUp className="h-4 w-4" />,
      formula: "β = (μR - μS) / √(σR² + σS²)",
      description: "Stress variance enters reliability calculation",
      value: `β = ${crossEffects.beta.toFixed(3)} → Pf = ${(crossEffects.pf * 100).toFixed(4)}%`,
      color: "text-accent",
    },
    {
      from: "Stat Moments",
      to: "Dynamic Loads",
      icon: <Activity className="h-4 w-4" />,
      formula: "DAF ∝ 1 + Var(m)/μ²",
      description: "Mass distribution variance affects dynamic response",
      value: `DAF factor = ${crossEffects.dynamicAmplification.toFixed(3)}`,
      color: "text-chart-2",
    },
    {
      from: "Skewness (M₃)",
      to: "Critical Location",
      icon: <ArrowRight className="h-4 w-4" />,
      formula: "Δx_crit = γ₁ · L · 0.05",
      description: "Asymmetric loads shift max moment location",
      value: `Shift = ${(crossEffects.criticalPointShift * 1000).toFixed(1)} mm from center`,
      color: "text-chart-4",
    },
    {
      from: "Kurtosis (M₄)",
      to: "Extreme Events",
      icon: <BarChart3 className="h-4 w-4" />,
      formula: "Pf_adj = Pf × (1 + (γ₂-3)×0.1)",
      description: "Heavy tails increase extreme load probability",
      value: `Multiplier = ${crossEffects.extremeEventMultiplier.toFixed(2)}× → Pf_adj = ${(crossEffects.adjustedPf * 100).toFixed(4)}%`,
      color: "text-destructive",
    },
    {
      from: "Stat Moments",
      to: "Truss",
      icon: <Link2 className="h-4 w-4" />,
      formula: "Var(F) = K² × Var(P)",
      description: "Joint load variance amplifies through members",
      value: `σ²_F = ${crossEffects.memberForceVariance.toFixed(2)} (kN)²`,
      color: "text-chart-posterior",
    },
  ];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Unified Statistical Framework</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Based on Meza (2025), statistical moments (M₁-M₄) propagate through all structural analyses. 
        Changes to load distribution parameters affect beam response, reliability, and dynamic behavior simultaneously.
      </p>

      {/* Current Parameters Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">Mean Load (M₁)</div>
          <div className="text-lg font-bold font-mono text-primary">{loadMean.toFixed(1)} kN/m</div>
        </div>
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
          <div className="text-xs text-muted-foreground">Variance (M₂)</div>
          <div className="text-lg font-bold font-mono text-accent">{loadVariance.toFixed(2)} (kN/m)²</div>
        </div>
        <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/30">
          <div className="text-xs text-muted-foreground">Skewness (M₃)</div>
          <div className="text-lg font-bold font-mono text-chart-2">{loadSkewness.toFixed(2)}</div>
        </div>
        <div className="p-3 rounded-lg bg-chart-4/10 border border-chart-4/30">
          <div className="text-xs text-muted-foreground">Kurtosis (M₄)</div>
          <div className="text-lg font-bold font-mono text-chart-4">{loadKurtosis.toFixed(2)}</div>
        </div>
      </div>

      {/* Cross-Reference Connections */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground mb-3">Cross-Tab Propagation Effects</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn, idx) => (
            <Card key={idx} className="p-4 bg-muted/20 border-border/50 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className={conn.color}>{conn.icon}</span>
                <div className="flex items-center gap-1 text-xs font-medium">
                  <span className="text-muted-foreground">{conn.from}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{conn.to}</span>
                </div>
              </div>
              <div className="font-mono text-xs text-primary mb-1">{conn.formula}</div>
              <p className="text-xs text-muted-foreground mb-2">{conn.description}</p>
              <div className={`text-xs font-mono ${conn.color}`}>{conn.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <div className="mt-6 p-4 rounded-lg bg-muted/10 border border-border/50">
        <h4 className="text-sm font-medium text-foreground mb-3">Information Flow</h4>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <div className="px-3 py-2 rounded bg-primary/20 text-primary font-medium">Load Distribution w(x)</div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-2 rounded bg-accent/20 text-accent font-medium">Statistical Moments M₁-M₄</div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <div className="px-3 py-1 rounded bg-chart-2/20 text-chart-2 font-medium">Beam Response</div>
            <div className="px-3 py-1 rounded bg-chart-4/20 text-chart-4 font-medium">Truss Forces</div>
            <div className="px-3 py-1 rounded bg-destructive/20 text-destructive font-medium">Dynamic DAF</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-2 rounded bg-destructive/20 text-destructive font-medium">Reliability β, P<sub>f</sub></div>
        </div>
      </div>

      {/* Key Insight */}
      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground">
          <strong className="text-primary">Key Insight:</strong> When you modify load parameters in the Stat Moments tab, 
          the variance propagates to moment uncertainty (Var(M) = L²σ²/8), which then affects stress variability 
          and ultimately the probability of failure. Similarly, skewness shifts critical locations while kurtosis 
          amplifies tail probabilities—demonstrating the unified statistical-mechanical framework.
        </p>
      </div>
    </div>
  );
}