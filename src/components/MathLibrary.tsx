import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KaTeXFormula } from "@/components/KaTeXFormula";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calculator, 
  Activity, 
  BarChart3, 
  Triangle, 
  Ruler, 
  TrendingUp, 
  Sigma,
  Percent,
  Target,
  Waves,
  Layers,
  Beaker
} from "lucide-react";
import { MomentCalculusLibrary } from "@/components/MomentCalculusLibrary";
import { LabExperiments } from "@/components/lab/LabExperiments";

interface FormulaProps {
  name: string;
  formula: string;
  latex?: string;
  description: string;
  variables?: { symbol: string; meaning: string }[];
  usedIn?: string[];
  category?: "core" | "advanced" | "specialized";
}

const Formula = ({ name, formula, latex, description, variables, usedIn, category = "core" }: FormulaProps) => (
  <div className="border border-border/50 rounded-lg p-4 bg-card/50 hover:bg-card/80 transition-colors">
    <div className="flex items-start justify-between gap-2 mb-2">
      <h4 className="font-semibold text-foreground">{name}</h4>
      <Badge variant={category === "core" ? "default" : category === "advanced" ? "secondary" : "outline"} className="text-xs">
        {category}
      </Badge>
    </div>
    <div className="bg-muted/50 rounded-md p-3 mb-3 overflow-x-auto">
      {latex ? (
        <KaTeXFormula latex={latex} className="text-primary" />
      ) : (
        <code className="font-mono text-sm text-primary whitespace-pre-wrap">{formula}</code>
      )}
    </div>
    <p className="text-sm text-muted-foreground mb-2">{description}</p>
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

interface MathLibraryProps {
  onSendToPf?: (data: { meanLoad: number; loadCoV: number; beamLength: number }) => void;
}

export const MathLibrary = ({ onSendToPf }: MathLibraryProps = {}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '?') {
        setShowAnswerKey(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="glass-card">
        <CardContent className="pt-4">
          <input
            type="text"
            placeholder="Search formulas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="reliability" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="reliability" className="text-xs sm:text-sm">
            <Target className="h-3 w-3 mr-1" />
            Reliability
          </TabsTrigger>
          <TabsTrigger value="statistics" className="text-xs sm:text-sm">
            <Sigma className="h-3 w-3 mr-1" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="beams" className="text-xs sm:text-sm">
            <Ruler className="h-3 w-3 mr-1" />
            Beams
          </TabsTrigger>
          <TabsTrigger value="trusses" className="text-xs sm:text-sm">
            <Triangle className="h-3 w-3 mr-1" />
            Trusses
          </TabsTrigger>
          <TabsTrigger value="dynamics" className="text-xs sm:text-sm">
            <Waves className="h-3 w-3 mr-1" />
            Dynamics
          </TabsTrigger>
          <TabsTrigger value="distributions" className="text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3 mr-1" />
            Distributions
          </TabsTrigger>
          <TabsTrigger value="optimization" className="text-xs sm:text-sm">
            <TrendingUp className="h-3 w-3 mr-1" />
            Optimization
          </TabsTrigger>
          <TabsTrigger value="moment-calculus" className="text-xs sm:text-sm">
            <Layers className="h-3 w-3 mr-1" />
            Moment Calculus
          </TabsTrigger>
          <TabsTrigger value="lab-experiments" className="text-xs sm:text-sm">
            <Beaker className="h-3 w-3 mr-1" />
            Lab Experiments
          </TabsTrigger>
        </TabsList>

        {/* Reliability Methods */}
        <TabsContent value="reliability" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Reliability Analysis Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="form">
                  <AccordionTrigger className="text-sm font-medium">First-Order Reliability Method (FORM)</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Reliability Index (β)"
                      formula="β = (μR - μS) / √(σR² + σS²)"
                      latex="\beta = \frac{\mu_R - \mu_S}{\sqrt{\sigma_R^2 + \sigma_S^2}}"
                      description="Measures the distance from the mean safety margin to the failure boundary in standard deviation units."
                      variables={[
                        { symbol: "μR", meaning: "Mean resistance" },
                        { symbol: "μS", meaning: "Mean load effect" },
                        { symbol: "σR", meaning: "Standard deviation of resistance" },
                        { symbol: "σS", meaning: "Standard deviation of load" }
                      ]}
                      usedIn={["Pf Analysis", "Static Loads", "Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Probability of Failure"
                      formula="Pf = Φ(-β)"
                      latex="P_f = \Phi(-\beta)"
                      description="The probability that the limit state function is violated, computed from the standard normal CDF."
                      variables={[
                        { symbol: "Φ", meaning: "Standard normal CDF" },
                        { symbol: "β", meaning: "Reliability index" }
                      ]}
                      usedIn={["Pf Analysis", "Static Loads", "Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Limit State Function"
                      formula="g(X) = R - S"
                      latex="g(\mathbf{X}) = R - S"
                      description="Failure occurs when g(X) ≤ 0, i.e., when load exceeds resistance."
                      variables={[
                        { symbol: "R", meaning: "Resistance (capacity)" },
                        { symbol: "S", meaning: "Load effect (demand)" }
                      ]}
                      usedIn={["All reliability tabs"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="fosm">
                  <AccordionTrigger className="text-sm font-medium">First-Order Second Moment (FOSM)</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="FOSM Reliability Index"
                      formula="βFOSM = μg / σg"
                      latex="\beta_{\text{FOSM}} = \frac{\mu_g}{\sigma_g}"
                      description="Uses only first two moments (mean and variance) of the limit state function."
                      variables={[
                        { symbol: "μg", meaning: "Mean of limit state function" },
                        { symbol: "σg", meaning: "Standard deviation of limit state" }
                      ]}
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Mean of Safety Margin"
                      formula="μg = μR - μS"
                      latex="\mu_g = \mu_R - \mu_S"
                      description="Expected value of the safety margin."
                      usedIn={["Pf Analysis", "Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Variance of Safety Margin"
                      formula="σg² = σR² + σS² (uncorrelated)"
                      latex="\sigma_g^2 = \sigma_R^2 + \sigma_S^2 \quad \text{(uncorrelated)}"
                      description="Combined variance assuming independence."
                      usedIn={["Pf Analysis", "Truss"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sorm">
                  <AccordionTrigger className="text-sm font-medium">Second-Order Reliability Method (SORM)</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Breitung's SORM Correction"
                      formula="Pf,SORM = Pf,FORM × ∏(1 + βκi)^(-1/2)"
                      latex="P_{f,\text{SORM}} = P_{f,\text{FORM}} \prod_{i=1}^{n-1} (1 + \beta \kappa_i)^{-1/2}"
                      description="Accounts for curvature of the limit state surface at the design point."
                      variables={[
                        { symbol: "κi", meaning: "Principal curvatures" },
                        { symbol: "β", meaning: "FORM reliability index" }
                      ]}
                      usedIn={["Pf Analysis", "Truss"]}
                      category="advanced"
                    />
                    <Formula
                      name="SORM Reliability Index"
                      formula="βSORM = -Φ⁻¹(Pf,SORM)"
                      latex="\beta_{\text{SORM}} = -\Phi^{-1}(P_{f,\text{SORM}})"
                      description="Back-calculate β from the SORM probability of failure."
                      usedIn={["Pf Analysis", "Truss"]}
                      category="advanced"
                    />
                    <Formula
                      name="Curvature Estimation"
                      formula="κ ≈ (σS/σR - 1) / (σR + σS)"
                      latex="\kappa \approx \frac{\sigma_S / \sigma_R - 1}{\sigma_R + \sigma_S}"
                      description="Simplified approximation for R-S type limit states."
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="torm">
                  <AccordionTrigger className="text-sm font-medium">Third-Order Reliability Method (TORM)</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="TORM Skewness Correction"
                      formula="βTORM = βSORM + (γ / 6) × (β² - 1)"
                      latex="\beta_{\text{TORM}} = \beta_{\text{SORM}} + \frac{\gamma}{6}(\beta^2 - 1)"
                      description="Adds third-order moment (skewness) correction to SORM."
                      variables={[
                        { symbol: "γ", meaning: "Skewness of limit state" },
                        { symbol: "βSORM", meaning: "SORM reliability index" }
                      ]}
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                    <Formula
                      name="Skewness of Safety Margin"
                      formula="γg = (γR × σR³ - γS × σS³) / σg³"
                      latex="\gamma_g = \frac{\gamma_R \sigma_R^3 - \gamma_S \sigma_S^3}{\sigma_g^3}"
                      description="Combined skewness for uncorrelated R and S."
                      variables={[
                        { symbol: "γR", meaning: "Skewness of resistance" },
                        { symbol: "γS", meaning: "Skewness of load" }
                      ]}
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="monte-carlo">
                  <AccordionTrigger className="text-sm font-medium">Monte Carlo Simulation</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Monte Carlo Pf Estimator"
                      formula="P̂f = Nf / N"
                      latex="\hat{P}_f = \frac{N_f}{N}"
                      description="Ratio of failure samples to total samples."
                      variables={[
                        { symbol: "Nf", meaning: "Number of failure samples" },
                        { symbol: "N", meaning: "Total number of samples" }
                      ]}
                      usedIn={["Pf Analysis", "Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Coefficient of Variation"
                      formula="CoV = √((1 - Pf) / (N × Pf))"
                      latex="\text{CoV} = \sqrt{\frac{1 - P_f}{N \cdot P_f}}"
                      description="Measures uncertainty in the Monte Carlo estimate."
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="95% Confidence Interval"
                      formula="Pf ± 1.96 × √(Pf(1-Pf)/N)"
                      latex="P_f \pm 1.96 \sqrt{\frac{P_f(1 - P_f)}{N}}"
                      description="Approximate confidence bounds for the probability estimate."
                      usedIn={["Pf Analysis", "Truss"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="importance-sampling">
                  <AccordionTrigger className="text-sm font-medium">Importance Sampling</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Importance Sampling Estimator"
                      formula="P̂f = (1/N) × Σ I[g(xi)≤0] × (f(xi) / h(xi))"
                      latex="\hat{P}_f = \frac{1}{N} \sum_{i=1}^{N} \mathbb{I}[g(\mathbf{x}_i) \leq 0] \cdot \frac{f(\mathbf{x}_i)}{h(\mathbf{x}_i)}"
                      description="Samples from proposal distribution h(x) and weights by likelihood ratio."
                      variables={[
                        { symbol: "f(x)", meaning: "Original PDF" },
                        { symbol: "h(x)", meaning: "Proposal (importance) PDF" },
                        { symbol: "I[·]", meaning: "Indicator function" }
                      ]}
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                    <Formula
                      name="Shifted Sampling Distribution"
                      formula="h(x) = N(x*; Σ)"
                      latex="h(\mathbf{x}) = \mathcal{N}(\mathbf{x}^*;\, \boldsymbol{\Sigma})"
                      description="Sample from normal distribution centered at the design point."
                      variables={[
                        { symbol: "x*", meaning: "Design point (FORM)" },
                        { symbol: "Σ", meaning: "Covariance matrix" }
                      ]}
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                    <Formula
                      name="Efficiency Gain"
                      formula="Efficiency = Var(MC) / Var(IS)"
                      description="Ratio of variances measuring improvement over crude Monte Carlo."
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="subset-simulation">
                  <AccordionTrigger className="text-sm font-medium">Subset Simulation</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Subset Simulation Pf"
                      formula="Pf = ∏ P(Fi | Fi-1)"
                      latex="P_f = \prod_{i=1}^{m} P(F_i \mid F_{i-1})"
                      description="Express rare event as product of conditional probabilities."
                      variables={[
                        { symbol: "Fi", meaning: "Intermediate failure event" },
                        { symbol: "P(Fi|Fi-1)", meaning: "Conditional probability ≈ 0.1" }
                      ]}
                      usedIn={["Truss"]}
                      category="specialized"
                    />
                    <Formula
                      name="Adaptive Threshold"
                      formula="bi = percentile(g(samples), p0 × 100)"
                      description="Set threshold so p0 fraction of samples exceed it."
                      variables={[
                        { symbol: "bi", meaning: "Threshold at level i" },
                        { symbol: "p0", meaning: "Target probability per level (typ. 0.1)" }
                      ]}
                      usedIn={["Truss"]}
                      category="specialized"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="statistics" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sigma className="h-5 w-5 text-primary" />
                Statistical Foundations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="moments">
                  <AccordionTrigger className="text-sm font-medium">Statistical Moments</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Mean (First Moment)"
                      formula="μ = E[X] = ∫ x × f(x) dx"
                      latex="\mu = \mathbb{E}[X] = \int x \, f(x) \, dx"
                      description="Expected value or center of the distribution."
                      usedIn={["All tabs"]}
                      category="core"
                    />
                    <Formula
                      name="Variance (Second Central Moment)"
                      formula="σ² = E[(X - μ)²] = E[X²] - μ²"
                      latex="\sigma^2 = \mathbb{E}[(X - \mu)^2] = \mathbb{E}[X^2] - \mu^2"
                      description="Measure of spread around the mean."
                      usedIn={["All tabs"]}
                      category="core"
                    />
                    <Formula
                      name="Skewness (Third Standardized Moment)"
                      formula="γ = E[(X - μ)³] / σ³"
                      latex="\gamma = \frac{\mathbb{E}[(X - \mu)^3]}{\sigma^3}"
                      description="Measure of asymmetry. γ > 0 indicates right tail, γ < 0 indicates left tail."
                      usedIn={["Stat Moments", "Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Kurtosis (Fourth Standardized Moment)"
                      formula="κ = E[(X - μ)⁴] / σ⁴"
                      latex="\kappa = \frac{\mathbb{E}[(X - \mu)^4]}{\sigma^4}"
                      description="Measure of tail heaviness. κ = 3 for normal; κ > 3 indicates heavy tails."
                      usedIn={["Stat Moments", "Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Coefficient of Variation"
                      formula="CoV = σ / μ"
                      latex="\text{CoV} = \frac{\sigma}{\mu}"
                      description="Dimensionless measure of relative variability."
                      usedIn={["All tabs"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="propagation">
                  <AccordionTrigger className="text-sm font-medium">Uncertainty Propagation</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Linear Transformation Mean"
                      formula="E[aX + b] = a × E[X] + b"
                      latex="\mathbb{E}[aX + b] = a \, \mathbb{E}[X] + b"
                      description="Mean of affine transformation."
                      usedIn={["Static Loads", "Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Linear Transformation Variance"
                      formula="Var(aX + b) = a² × Var(X)"
                      latex="\text{Var}(aX + b) = a^2 \, \text{Var}(X)"
                      description="Variance of affine transformation (additive constants don't affect variance)."
                      usedIn={["Static Loads", "Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Sum of Independent Variables"
                      formula="Var(X + Y) = Var(X) + Var(Y)"
                      latex="\text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y)"
                      description="Variances add for uncorrelated random variables."
                      usedIn={["Pf Analysis"]}
                      category="core"
                    />
                    <Formula
                      name="Taylor Series (First-Order)"
                      formula="E[g(X)] ≈ g(μX)"
                      latex="\mathbb{E}[g(X)] \approx g(\mu_X)"
                      description="Approximate mean of nonlinear function using linearization."
                      usedIn={["Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="Taylor Series Variance"
                      formula="Var(g(X)) ≈ (∂g/∂x)² × Var(X)"
                      latex="\text{Var}(g(X)) \approx \left(\frac{\partial g}{\partial x}\right)^2 \text{Var}(X)"
                      description="Approximate variance propagation for nonlinear functions."
                      usedIn={["Advanced"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bayesian">
                  <AccordionTrigger className="text-sm font-medium">Bayesian Inference</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Bayes' Theorem"
                      formula="p(θ|data) ∝ p(data|θ) × p(θ)"
                      latex="p(\theta \mid \text{data}) \propto p(\text{data} \mid \theta) \cdot p(\theta)"
                      description="Posterior is proportional to likelihood times prior."
                      variables={[
                        { symbol: "p(θ|data)", meaning: "Posterior probability" },
                        { symbol: "p(data|θ)", meaning: "Likelihood" },
                        { symbol: "p(θ)", meaning: "Prior probability" }
                      ]}
                      usedIn={["Inference", "MCMC"]}
                      category="core"
                    />
                    <Formula
                      name="Normal-Normal Conjugate Update"
                      formula="μposterior = (n×x̄/σ² + μprior/τ²) / (n/σ² + 1/τ²)"
                      latex="\mu_{\text{post}} = \frac{n\bar{x}/\sigma^2 + \mu_0/\tau^2}{n/\sigma^2 + 1/\tau^2}"
                      description="Closed-form posterior mean for normal likelihood and prior."
                      variables={[
                        { symbol: "n", meaning: "Sample size" },
                        { symbol: "x̄", meaning: "Sample mean" },
                        { symbol: "τ²", meaning: "Prior variance" }
                      ]}
                      usedIn={["Inference"]}
                      category="advanced"
                    />
                    <Formula
                      name="Metropolis-Hastings Acceptance"
                      formula="α = min(1, p(θ*)/p(θ) × q(θ|θ*)/q(θ*|θ))"
                      latex="\alpha = \min\!\left(1,\; \frac{p(\theta^*)}{p(\theta)} \cdot \frac{q(\theta \mid \theta^*)}{q(\theta^* \mid \theta)}\right)"
                      description="Accept proposal with probability α."
                      variables={[
                        { symbol: "θ*", meaning: "Proposed state" },
                        { symbol: "q", meaning: "Proposal distribution" }
                      ]}
                      usedIn={["MCMC"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="rigidized">
                  <AccordionTrigger className="text-sm font-medium">Rigidized Moment Equivalence</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Load Normalization"
                      formula="f(x) = w(x) / W"
                      latex="f(x) = \frac{w(x)}{W}, \quad W = \int w(x)\,dx"
                      description="Normalize nonnegative load field into probability density."
                      variables={[
                        { symbol: "w(x)", meaning: "Load intensity at x" },
                        { symbol: "W", meaning: "Total load (integral of w)" }
                      ]}
                      usedIn={["Stat Moments"]}
                      category="specialized"
                    />
                    <Formula
                      name="Statistical Centroid (1D)"
                      formula="x̄ = ∫ x × f(x) dx"
                      latex="\bar{x} = \int x \, f(x) \, dx"
                      description="First moment equals mechanical centroid when load is normalized."
                      usedIn={["Stat Moments", "Static Loads"]}
                      category="specialized"
                    />
                    <Formula
                      name="Variance ↔ Moment of Inertia"
                      formula="σ² ↔ I/A (scaled)"
                      latex="\sigma^2 \;\longleftrightarrow\; I/A \quad \text{(scaled)}"
                      description="Variance relates to spread of load, analogous to moment of inertia."
                      usedIn={["Stat Moments"]}
                      category="specialized"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beam Analysis */}
        <TabsContent value="beams" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                Beam Analysis Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="simply-supported">
                  <AccordionTrigger className="text-sm font-medium">Simply Supported Beam</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="UDL Maximum Moment"
                      formula="Mmax = wL² / 8"
                      latex="M_{\max} = \frac{wL^2}{8}"
                      description="Maximum bending moment at midspan under uniform distributed load."
                      variables={[
                        { symbol: "w", meaning: "Load intensity (N/m)" },
                        { symbol: "L", meaning: "Span length (m)" }
                      ]}
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="UDL Maximum Deflection"
                      formula="δmax = 5wL⁴ / (384EI)"
                      latex="\delta_{\max} = \frac{5wL^4}{384EI}"
                      description="Maximum deflection at midspan."
                      variables={[
                        { symbol: "E", meaning: "Elastic modulus (Pa)" },
                        { symbol: "I", meaning: "Moment of inertia (m⁴)" }
                      ]}
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="Point Load Moment"
                      formula="Mmax = Pab / L"
                      latex="M_{\max} = \frac{Pab}{L}"
                      description="Maximum moment under concentrated load at position a from left support."
                      variables={[
                        { symbol: "P", meaning: "Point load (N)" },
                        { symbol: "a, b", meaning: "Distances from supports" }
                      ]}
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="Point Load Deflection"
                      formula="δ = Pa²b² / (3EIL)"
                      latex="\delta = \frac{Pa^2b^2}{3EIL}"
                      description="Deflection at load point."
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cantilever">
                  <AccordionTrigger className="text-sm font-medium">Cantilever Beam</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="UDL Fixed-End Moment"
                      formula="M = wL² / 2"
                      latex="M = \frac{wL^2}{2}"
                      description="Maximum moment at fixed support."
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="UDL Tip Deflection"
                      formula="δmax = wL⁴ / (8EI)"
                      latex="\delta_{\max} = \frac{wL^4}{8EI}"
                      description="Maximum deflection at free end."
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="Point Load at Tip"
                      formula="Mmax = PL,  δmax = PL³ / (3EI)"
                      latex="M_{\max} = PL, \quad \delta_{\max} = \frac{PL^3}{3EI}"
                      description="Maximum moment and deflection for tip load."
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cross-section">
                  <AccordionTrigger className="text-sm font-medium">Cross-Section Properties</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Rectangular I"
                      formula="I = bh³ / 12"
                      latex="I = \frac{bh^3}{12}"
                      description="Moment of inertia for rectangular section about centroidal axis."
                      variables={[
                        { symbol: "b", meaning: "Width" },
                        { symbol: "h", meaning: "Height" }
                      ]}
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="Circular I"
                      formula="I = πd⁴ / 64"
                      latex="I = \frac{\pi d^4}{64}"
                      description="Moment of inertia for solid circular section."
                      variables={[
                        { symbol: "d", meaning: "Diameter" }
                      ]}
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="Section Modulus"
                      formula="S = I / c"
                      latex="S = \frac{I}{c}"
                      description="Relates bending moment to maximum stress."
                      variables={[
                        { symbol: "c", meaning: "Distance to extreme fiber" }
                      ]}
                      usedIn={["Static Loads"]}
                      category="core"
                    />
                    <Formula
                      name="Bending Stress"
                      formula="σ = M / S = Mc / I"
                      latex="\sigma = \frac{M}{S} = \frac{Mc}{I}"
                      description="Maximum bending stress in the section."
                      usedIn={["Static Loads", "Pf Analysis"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="influence-lines">
                  <AccordionTrigger className="text-sm font-medium">Influence Lines</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Shear Influence (Simple Beam)"
                      formula="IL_V(x) = (L-a)/L for x<a;  IL_V(x) = -a/L for x>a"
                      description="Influence line ordinate for shear at point a."
                      usedIn={["Static Loads"]}
                      category="advanced"
                    />
                    <Formula
                      name="Moment Influence (Simple Beam)"
                      formula="IL_M(x) = x(L-a)/L for x≤a;  IL_M(x) = a(L-x)/L for x>a"
                      description="Influence line ordinate for moment at point a."
                      usedIn={["Static Loads"]}
                      category="advanced"
                    />
                    <Formula
                      name="Maxwell-Betti Reciprocal"
                      formula="δij = δji"
                      description="Deflection at i due to load at j equals deflection at j due to load at i."
                      usedIn={["Static Loads"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="beam-capability">
                  <AccordionTrigger className="text-sm font-medium">Capability Matrix and Load Combinations</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Beam Capability Matrix"
                      formula="status(beam, load) ∈ {exact, approximate, envelope, planned}"
                      description="Classifies each beam/load pair by solver confidence so users know whether a case is a direct formula, a screening approximation, a moving-load envelope, or a planned future solver target."
                      variables={[
                        { symbol: "beam", meaning: "Boundary condition or structural idealization" },
                        { symbol: "load", meaning: "Applied load family" },
                        { symbol: "status", meaning: "Solver confidence level" }
                      ]}
                      usedIn={["Static Loads", "Reports"]}
                      category="advanced"
                    />
                    <Formula
                      name="Beam Analysis Health Gate"
                      formula="status = max(solver level, geometry validity, stress ratio, deflection ratio, Pf)"
                      description="Combines solver confidence, section validity, stress utilization, serviceability ratio, and reliability risk into a live Static Loads status check."
                      variables={[
                        { symbol: "stress ratio", meaning: "Maximum stress divided by yield strength" },
                        { symbol: "deflection ratio", meaning: "Maximum deflection divided by L/250" },
                        { symbol: "Pf", meaning: "FORM probability of failure for active demand" }
                      ]}
                      usedIn={["Static Loads", "Reliability", "Reports"]}
                      category="advanced"
                    />
                    <Formula
                      name="LRFD / ASD Load Combination"
                      formula="U = Σ γᵢQᵢ"
                      latex="U = \sum_i \gamma_i Q_i"
                      description="General factored-load expression used by LRFD, ASD, and serviceability presets."
                      variables={[
                        { symbol: "γᵢ", meaning: "Load factor" },
                        { symbol: "Qᵢ", meaning: "Nominal load component" },
                        { symbol: "U", meaning: "Factored load effect" }
                      ]}
                      usedIn={["Static Loads", "Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="Missing Static Beam Roadmap"
                      formula="next = {multi-span, settlement, thermal, axle train, elastic foundation}"
                      description="Priority structural cases not yet solved as full production-grade beam models."
                      usedIn={["Static Loads", "Library"]}
                      category="specialized"
                    />
                    <Formula
                      name="Expanded Beam Families"
                      formula="beam = {multi-span, gerber, elastic foundation, spring support, settlement, tapered, beam-column, composite}"
                      description="Beam type families now exposed in Static Loads with direct support schematics and documented solver status."
                      usedIn={["Static Loads", "Library"]}
                      category="specialized"
                    />
                    <Formula
                      name="Advanced Static Load Families"
                      formula="load = {axle train, settlement, thermal, prestress, patch, torsion, snow drift, hydrostatic, construction stage, harmonic equivalent}"
                      description="Specialized loads routed through equivalent point, moment, triangular, partial distributed, or envelope models until deeper dedicated solvers are added."
                      usedIn={["Static Loads", "Dynamic Loads", "Library"]}
                      category="specialized"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Truss Analysis */}
        <TabsContent value="trusses" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Triangle className="h-5 w-5 text-primary" />
                Truss Analysis Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="stiffness-method">
                  <AccordionTrigger className="text-sm font-medium">Matrix Stiffness Method</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Local Stiffness Matrix"
                      formula="k = (EA/L) × [1, -1; -1, 1]"
                      latex="\mathbf{k} = \frac{EA}{L} \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}"
                      description="Axial stiffness matrix for truss member in local coordinates."
                      variables={[
                        { symbol: "E", meaning: "Elastic modulus" },
                        { symbol: "A", meaning: "Cross-section area" },
                        { symbol: "L", meaning: "Member length" }
                      ]}
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Transformation Matrix"
                      formula="T = [c, s, 0, 0; 0, 0, c, s]"
                      latex="\mathbf{T} = \begin{bmatrix} c & s & 0 & 0 \\ 0 & 0 & c & s \end{bmatrix}"
                      description="Transform from local to global coordinates."
                      variables={[
                        { symbol: "c", meaning: "cos(θ)" },
                        { symbol: "s", meaning: "sin(θ)" }
                      ]}
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Global Stiffness Matrix"
                      formula="K = Tᵀ × k × T"
                      latex="\mathbf{K} = \mathbf{T}^T \mathbf{k} \, \mathbf{T}"
                      description="Transform local stiffness to global coordinates."
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="System Equation"
                      formula="F = K × u"
                      latex="\mathbf{F} = \mathbf{K} \, \mathbf{u}"
                      description="Relates global forces to global displacements."
                      usedIn={["Truss"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="member-forces">
                  <AccordionTrigger className="text-sm font-medium">Member Forces & Stress</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Member Axial Force"
                      formula="N = (EA/L) × (u₂ - u₁)"
                      latex="N = \frac{EA}{L}(u_2 - u_1)"
                      description="Axial force from relative displacement of end nodes."
                      variables={[
                        { symbol: "u₁, u₂", meaning: "Nodal displacements along member axis" }
                      ]}
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Axial Stress"
                      formula="σ = N / A"
                      latex="\sigma = \frac{N}{A}"
                      description="Uniform stress in truss member."
                      usedIn={["Truss"]}
                      category="core"
                    />
                    <Formula
                      name="Safety Factor"
                      formula="SF = σy / σ"
                      latex="\text{SF} = \frac{\sigma_y}{\sigma}"
                      description="Ratio of yield stress to actual stress."
                      usedIn={["Truss"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="system-reliability">
                  <AccordionTrigger className="text-sm font-medium">System Reliability</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Series System"
                      formula="Pf,sys = 1 - ∏(1 - Pf,i)"
                      latex="P_{f,\text{sys}} = 1 - \prod_{i=1}^{n}(1 - P_{f,i})"
                      description="System fails if any component fails (weakest link)."
                      usedIn={["Truss", "Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="Parallel System"
                      formula="Pf,sys = ∏ Pf,i"
                      latex="P_{f,\text{sys}} = \prod_{i=1}^{n} P_{f,i}"
                      description="System fails only if all components fail (redundant)."
                      usedIn={["Truss", "Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="First-Order Bounds"
                      formula="max(Pf,i) ≤ Pf,sys ≤ 1 - ∏(1 - Pf,i)"
                      latex="\max(P_{f,i}) \leq P_{f,\text{sys}} \leq 1 - \prod(1 - P_{f,i})"
                      description="Bounds for series system probability of failure."
                      usedIn={["Truss"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dynamics */}
        <TabsContent value="dynamics" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-primary" />
                Dynamic Analysis Formulas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="sdof">
                  <AccordionTrigger className="text-sm font-medium">SDOF Systems</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Equation of Motion"
                      formula="mẍ + cẋ + kx = F(t)"
                      latex="m\ddot{x} + c\dot{x} + kx = F(t)"
                      description="Governing equation for single-degree-of-freedom system."
                      variables={[
                        { symbol: "m", meaning: "Mass" },
                        { symbol: "c", meaning: "Damping coefficient" },
                        { symbol: "k", meaning: "Stiffness" }
                      ]}
                      usedIn={["Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Natural Frequency"
                      formula="ωn = √(k/m),  fn = ωn / (2π)"
                      latex="\omega_n = \sqrt{\frac{k}{m}}, \quad f_n = \frac{\omega_n}{2\pi}"
                      description="Undamped natural circular and cyclic frequencies."
                      usedIn={["Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Damping Ratio"
                      formula="ζ = c / (2√(km)) = c / (2mωn)"
                      latex="\zeta = \frac{c}{2\sqrt{km}} = \frac{c}{2m\omega_n}"
                      description="Ratio of actual to critical damping."
                      usedIn={["Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Damped Frequency"
                      formula="ωd = ωn × √(1 - ζ²)"
                      latex="\omega_d = \omega_n \sqrt{1 - \zeta^2}"
                      description="Natural frequency with damping (ζ < 1)."
                      usedIn={["Dynamic"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="modular-system-models">
                  <AccordionTrigger className="text-sm font-medium">Modular System Models</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Effective Modal System"
                      formula="m_eff = Gamma_m m; k_eff = Gamma_k k; c_eff = Gamma_c c"
                      latex="m_{eff}=\Gamma_m m,\quad k_{eff}=\Gamma_k k,\quad c_{eff}=\Gamma_c c"
                      description="Transforms base sliders into model-consistent effective properties using the selected system schematic, support model, excitation type, isolation layer, and participating modes."
                      variables={[
                        { symbol: "Gamma_m", meaning: "Mass participation modifier" },
                        { symbol: "Gamma_k", meaning: "System/support stiffness modifier" },
                        { symbol: "Gamma_c", meaning: "Damping/excitation/isolation modifier" }
                      ]}
                      usedIn={["Dynamic Loads", "Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="Mode Participation Expansion"
                      formula="x(t) ~= sum Gamma_i phi_i q_i(t)"
                      latex="x(t) \approx \sum_i \Gamma_i \phi_i q_i(t)"
                      description="Approximates a bridge, equipment mount, or building as one or more participating modal coordinates."
                      variables={[
                        { symbol: "Gamma_i", meaning: "Participation factor for mode i" },
                        { symbol: "phi_i", meaning: "Mode shape" },
                        { symbol: "q_i(t)", meaning: "Modal coordinate" }
                      ]}
                      usedIn={["Dynamic Loads"]}
                      category="advanced"
                    />
                    <Formula
                      name="Support Modularity"
                      formula="k_eff = alpha_support * k_model; c_eff = eta_support * c_model"
                      latex="k_{eff}=\alpha_{support}k_{model},\quad c_{eff}=\eta_{support}c_{model}"
                      description="Fixed, flexible, and isolated supports modify stiffness and damping before response is calculated."
                      variables={[
                        { symbol: "alpha_support", meaning: "Support stiffness factor" },
                        { symbol: "eta_support", meaning: "Support damping factor" }
                      ]}
                      usedIn={["Dynamic Loads"]}
                      category="advanced"
                    />
                    <Formula
                      name="Excitation Mapping"
                      formula="F_eff(t) = alpha_excitation * F0 * sin(Omega t)"
                      latex="F_{eff}(t)=\alpha_{excitation}F_0\sin(\Omega t)"
                      description="Harmonic, impulse, wind, and seismic selections adjust the effective forcing used by the workbench."
                      variables={[
                        { symbol: "alpha_excitation", meaning: "Excitation family load modifier" },
                        { symbol: "Omega", meaning: "Forcing circular frequency" }
                      ]}
                      usedIn={["Dynamic Loads", "Random"]}
                      category="advanced"
                    />
                    <Formula
                      name="Dynamic Scenario Comparison"
                      formula="case_i = {model, support, excitation, m_eff, k_eff, c_eff, DAF, x_max, beta, Pf}"
                      description="Saved dynamic cases preserve assumptions, effective properties, response metrics, and reliability outputs for comparison and report export."
                      variables={[
                        { symbol: "case_i", meaning: "Saved dynamic design case" },
                        { symbol: "x_max", meaning: "Maximum displacement response" },
                        { symbol: "Pf", meaning: "Probability of displacement limit failure" }
                      ]}
                      usedIn={["Dynamic Loads", "Reports"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="frequency-response">
                  <AccordionTrigger className="text-sm font-medium">Frequency Response</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Transfer Function Magnitude"
                      formula="|H(ω)|² = 1 / [(1-r²)² + (2ζr)²]"
                      latex="|H(\omega)|^2 = \frac{1}{(1 - r^2)^2 + (2\zeta r)^2}"
                      description="Amplification factor squared, where r = ω/ωn."
                      variables={[
                        { symbol: "r", meaning: "Frequency ratio ω/ωn" },
                        { symbol: "ζ", meaning: "Damping ratio" }
                      ]}
                      usedIn={["Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Resonant Amplification"
                      formula="|H(ωn)| ≈ 1 / (2ζ)"
                      latex="|H(\omega_n)| \approx \frac{1}{2\zeta}"
                      description="Peak response at resonance (lightly damped)."
                      usedIn={["Dynamic"]}
                      category="core"
                    />
                    <Formula
                      name="Phase Angle"
                      formula="φ = atan(2ζr / (1 - r²))"
                      latex="\varphi = \arctan\!\left(\frac{2\zeta r}{1 - r^2}\right)"
                      description="Phase lag between input and response."
                      usedIn={["Dynamic"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="random-vibration">
                  <AccordionTrigger className="text-sm font-medium">Random Vibration</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Output PSD"
                      formula="Sy(f) = |H(f)|² × Sx(f)"
                      latex="S_y(f) = |H(f)|^2 \, S_x(f)"
                      description="Response spectrum equals transfer function times input spectrum."
                      usedIn={["Dynamic"]}
                      category="advanced"
                    />
                    <Formula
                      name="Response Variance"
                      formula="σy² = ∫ Sy(f) df"
                      latex="\sigma_y^2 = \int_0^\infty S_y(f)\,df"
                      description="Total variance from area under response PSD."
                      usedIn={["Dynamic"]}
                      category="advanced"
                    />
                    <Formula
                      name="RMS Response"
                      formula="yrms = √(σy²)"
                      description="Root mean square of random response."
                      usedIn={["Dynamic"]}
                      category="advanced"
                    />
                    <Formula
                      name="Peak Factor"
                      formula="g = √(2 × ln(νT)) + 0.5772 / √(2 × ln(νT))"
                      description="Relates peak to RMS for Gaussian process."
                      variables={[
                        { symbol: "ν", meaning: "Mean zero-crossing rate" },
                        { symbol: "T", meaning: "Duration" }
                      ]}
                      usedIn={["Dynamic"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="spectra">
                  <AccordionTrigger className="text-sm font-medium">Spectral Models</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Kanai-Tajimi Earthquake"
                      formula="S(ω) = S₀ × (ωg⁴ + 4ζg²ωg²ω²) / [(ωg² - ω²)² + 4ζg²ωg²ω²]"
                      description="Filtered white noise model for ground motion."
                      variables={[
                        { symbol: "ωg", meaning: "Ground filter frequency" },
                        { symbol: "ζg", meaning: "Ground damping" },
                        { symbol: "S₀", meaning: "White noise intensity" }
                      ]}
                      usedIn={["Dynamic"]}
                      category="specialized"
                    />
                    <Formula
                      name="Davenport Wind Spectrum"
                      formula="S(f) = 4u*²L / (U × (1 + (fL/U)²)^(4/3))"
                      description="Along-wind turbulence spectrum."
                      variables={[
                        { symbol: "u*", meaning: "Friction velocity" },
                        { symbol: "L", meaning: "Integral length scale" },
                        { symbol: "U", meaning: "Mean wind speed" }
                      ]}
                      usedIn={["Dynamic"]}
                      category="specialized"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distributions */}
        <TabsContent value="distributions" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Probability Distributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="continuous">
                  <AccordionTrigger className="text-sm font-medium">Continuous Distributions</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Normal PDF"
                      formula="f(x) = (1/(σ√(2π))) × exp(-(x-μ)² / (2σ²))"
                      latex="f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)"
                      description="Gaussian/bell curve distribution."
                      variables={[
                        { symbol: "μ", meaning: "Mean" },
                        { symbol: "σ", meaning: "Standard deviation" }
                      ]}
                      usedIn={["Distributions", "All tabs"]}
                      category="core"
                    />
                    <Formula
                      name="Lognormal PDF"
                      formula="f(x) = (1/(xσln√(2π))) × exp(-(ln(x)-μln)² / (2σln²))"
                      latex="f(x) = \frac{1}{x\,\sigma_{\ln}\sqrt{2\pi}} \exp\!\left(-\frac{(\ln x - \mu_{\ln})^2}{2\sigma_{\ln}^2}\right)"
                      description="For positive variables with multiplicative uncertainty."
                      variables={[
                        { symbol: "μln", meaning: "Mean of ln(X)" },
                        { symbol: "σln", meaning: "Std of ln(X)" }
                      ]}
                      usedIn={["Pf Analysis"]}
                      category="core"
                    />
                    <Formula
                      name="Lognormal Parameters"
                      formula="σln² = ln(1 + σ²/μ²),  μln = ln(μ/√(1 + σ²/μ²))"
                      latex="\sigma_{\ln}^2 = \ln\!\left(1 + \frac{\sigma^2}{\mu^2}\right), \quad \mu_{\ln} = \ln\!\left(\frac{\mu}{\sqrt{1 + \sigma^2/\mu^2}}\right)"
                      description="Convert from mean/variance to log-space parameters."
                      usedIn={["Pf Analysis"]}
                      category="core"
                    />
                    <Formula
                      name="Gamma PDF"
                      formula="f(x) = (x^(α-1) × e^(-x/θ)) / (θ^α × Γ(α))"
                      latex="f(x) = \frac{x^{\alpha-1} e^{-x/\theta}}{\theta^\alpha \,\Gamma(\alpha)}"
                      description="Flexible positive distribution for load modeling."
                      variables={[
                        { symbol: "α", meaning: "Shape parameter" },
                        { symbol: "θ", meaning: "Scale parameter" }
                      ]}
                      usedIn={["Distributions"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="extreme-value">
                  <AccordionTrigger className="text-sm font-medium">Extreme Value Distributions</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Gumbel (Type I) CDF"
                      formula="F(x) = exp(-exp(-(x-μ)/β))"
                      latex="F(x) = \exp\!\left(-\exp\!\left(-\frac{x - \mu}{\beta}\right)\right)"
                      description="For maxima of unbounded distributions (e.g., wind, floods)."
                      variables={[
                        { symbol: "μ", meaning: "Location parameter" },
                        { symbol: "β", meaning: "Scale parameter" }
                      ]}
                      usedIn={["Distributions"]}
                      category="advanced"
                    />
                    <Formula
                      name="Weibull (Type III) CDF"
                      formula="F(x) = 1 - exp(-(x/λ)^k)"
                      latex="F(x) = 1 - \exp\!\left(-\left(\frac{x}{\lambda}\right)^k\right)"
                      description="For minima with lower bound (e.g., material strength)."
                      variables={[
                        { symbol: "k", meaning: "Shape parameter" },
                        { symbol: "λ", meaning: "Scale parameter" }
                      ]}
                      usedIn={["Distributions"]}
                      category="advanced"
                    />
                    <Formula
                      name="Fréchet (Type II) CDF"
                      formula="F(x) = exp(-((x-m)/s)^(-α))"
                      latex="F(x) = \exp\!\left(-\left(\frac{x - m}{s}\right)^{-\alpha}\right)"
                      description="For heavy-tailed maxima."
                      variables={[
                        { symbol: "α", meaning: "Shape (tail index)" },
                        { symbol: "s", meaning: "Scale" },
                        { symbol: "m", meaning: "Location (minimum)" }
                      ]}
                      usedIn={["Distributions"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="discrete">
                  <AccordionTrigger className="text-sm font-medium">Discrete Distributions</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Poisson PMF"
                      formula="P(X=k) = (λ^k × e^(-λ)) / k!"
                      latex="P(X=k) = \frac{\lambda^k e^{-\lambda}}{k!}"
                      description="Models count of rare events (e.g., earthquake arrivals)."
                      variables={[
                        { symbol: "λ", meaning: "Mean rate" },
                        { symbol: "k", meaning: "Number of events" }
                      ]}
                      usedIn={["Distributions"]}
                      category="core"
                    />
                    <Formula
                      name="Binomial PMF"
                      formula="P(X=k) = C(n,k) × p^k × (1-p)^(n-k)"
                      latex="P(X=k) = \binom{n}{k} p^k (1-p)^{n-k}"
                      description="Number of successes in n independent trials."
                      usedIn={["Distributions"]}
                      category="core"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization */}
        <TabsContent value="optimization" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Optimization Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                <AccordionItem value="rbdo">
                  <AccordionTrigger className="text-sm font-medium">Reliability-Based Design Optimization</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="RBDO Problem Formulation"
                      formula="min f(d)  s.t.  β(d) ≥ βtarget"
                      latex="\min_{\mathbf{d}} f(\mathbf{d}) \quad \text{s.t.} \quad \beta(\mathbf{d}) \geq \beta_{\text{target}}"
                      description="Minimize objective (cost/weight) while maintaining target reliability."
                      variables={[
                        { symbol: "d", meaning: "Design variables" },
                        { symbol: "f", meaning: "Objective function" },
                        { symbol: "βtarget", meaning: "Required reliability index" }
                      ]}
                      usedIn={["Truss", "Advanced"]}
                      category="specialized"
                    />
                    <Formula
                      name="Penalized Objective"
                      formula="L(d) = f(d) + ρ × max(0, βtarget - β)²"
                      latex="L(\mathbf{d}) = f(\mathbf{d}) + \rho \left[\max(0,\; \beta_{\text{target}} - \beta)\right]^2"
                      description="Convert constraint to penalty for gradient-based optimization."
                      variables={[
                        { symbol: "ρ", meaning: "Penalty parameter" }
                      ]}
                      usedIn={["Truss", "Advanced"]}
                      category="specialized"
                    />
                    <Formula
                      name="Sensitivity of β"
                      formula="∂β/∂d ≈ (β(d+Δd) - β(d)) / Δd"
                      latex="\frac{\partial \beta}{\partial d} \approx \frac{\beta(d + \Delta d) - \beta(d)}{\Delta d}"
                      description="Finite difference approximation for gradient."
                      usedIn={["Truss", "Advanced"]}
                      category="specialized"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gradient-methods">
                  <AccordionTrigger className="text-sm font-medium">Gradient-Based Methods</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Gradient Descent Update"
                      formula="d(k+1) = d(k) - α × ∇f(d(k))"
                      latex="\mathbf{d}^{(k+1)} = \mathbf{d}^{(k)} - \alpha \nabla f(\mathbf{d}^{(k)})"
                      description="Iteratively move in direction of steepest descent."
                      variables={[
                        { symbol: "α", meaning: "Step size (learning rate)" },
                        { symbol: "∇f", meaning: "Gradient of objective" }
                      ]}
                      usedIn={["Truss", "Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="HL-RF Algorithm"
                      formula="u(k+1) = (∇g·u - g) / |∇g|² × ∇g"
                      latex="\mathbf{u}^{(k+1)} = \frac{\nabla g \cdot \mathbf{u} - g}{|\nabla g|^2} \nabla g"
                      description="Hasofer-Lind, Rackwitz-Fiessler iteration for design point."
                      usedIn={["Advanced"]}
                      category="specialized"
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sensitivity">
                  <AccordionTrigger className="text-sm font-medium">Sensitivity Analysis</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <Formula
                      name="Importance Measure"
                      formula="αi² = (∂g/∂ui)² / Σ(∂g/∂uj)²"
                      latex="\alpha_i^2 = \frac{(\partial g / \partial u_i)^2}{\sum_j (\partial g / \partial u_j)^2}"
                      description="Fraction of variance attributable to variable i."
                      usedIn={["Advanced"]}
                      category="advanced"
                    />
                    <Formula
                      name="Elasticity"
                      formula="E = (∂β/∂p) × (p/β)"
                      latex="E = \frac{\partial \beta}{\partial p} \cdot \frac{p}{\beta}"
                      description="Percentage change in β for percentage change in parameter p."
                      usedIn={["Advanced"]}
                      category="advanced"
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Moment Calculus */}
        <TabsContent value="moment-calculus" className="space-y-4">
          <MomentCalculusLibrary onSendToPf={onSendToPf} />
        </TabsContent>

        {/* Lab Experiments */}
        <TabsContent value="lab-experiments" className="space-y-4">
          <LabExperiments showAnswerKey={showAnswerKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
