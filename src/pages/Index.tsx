import { toast } from "sonner";
import { DistributionChart } from "@/components/DistributionChart";
import { MCMCVisualization } from "@/components/MCMCVisualization";
import { GaussianProcessViz } from "@/components/GaussianProcessViz";
import { BayesianInferenceViz } from "@/components/BayesianInferenceViz";
import { ProbabilityOfFailure } from "@/components/ProbabilityOfFailure";
import { StaticBeamAnalysis } from "@/components/StaticBeamAnalysis";
import { DynamicLoadAnalysis } from "@/components/DynamicLoadAnalysis";
import { StatisticalMomentAnalysis } from "@/components/StatisticalMomentAnalysis";
import { TrussAnalysis } from "@/components/TrussAnalysis";
import { StatisticalCrossReference } from "@/components/StatisticalCrossReference";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExtremeValueDistributions } from "@/components/ExtremeValueDistributions";
import { ResponseSpectrum } from "@/components/ResponseSpectrum";
import { AdvancedReliabilityAnalysis } from "@/components/AdvancedReliabilityAnalysis";
import { MathLibrary } from "@/components/MathLibrary";
import { DecisionSupportWorkbench } from "@/components/DecisionSupportWorkbench";
import { FormulaReferencePanel } from "@/components/FormulaReferencePanel";
import { GlobalProjectWorkbench } from "@/components/GlobalProjectWorkbench";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { SliderWithInput } from "@/components/SliderWithInput";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  SharedParametersProvider,
  useSharedParameters,
} from "@/contexts/SharedParametersContext";
import {
  ChevronDown,
  Link2,
  AlertTriangle,
  Ruler,
  Triangle,
  BarChart3,
  Activity,
  PieChart,
  Brain,
  GitBranch,
  Shield,
  BookOpen,
} from "lucide-react";

/** Inner component that consumes the shared context */
function IndexContent() {
  const ctx = useSharedParameters();

  // Distribution parameters (local — not shared across tabs)
  const [normalMu, setNormalMu] = useState(0);
  const [normalSigma, setNormalSigma] = useState(1);
  const [gammaAlpha, setGammaAlpha] = useState(2);
  const [gammaTheta, setGammaTheta] = useState(2);
  const [poissonLambda, setPoissonLambda] = useState(5);

  // Extreme value distribution parameters (local)
  const [gumbelMu, setGumbelMu] = useState(10);
  const [gumbelBeta, setGumbelBeta] = useState(2);
  const [weibullK, setWeibullK] = useState(2);
  const [weibullLambda, setWeibullLambda] = useState(5);
  const [frechetAlpha, setFrechetAlpha] = useState(3);
  const [frechetS, setFrechetS] = useState(2);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(199_89%_48%/0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 relative">
          <div className="absolute top-4 right-4 md:top-6 md:right-6">
            <ThemeToggle />
          </div>
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2 md:mb-3 tracking-tight">
              Structural Reliability
              <span className="block text-primary mt-1 md:mt-2">Analysis System</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Interactive probability of failure prediction using Bayesian methods and Unified Statistical Moment Calculus.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 pb-12 md:pb-16">
        <Tabs value={ctx.activeTab} onValueChange={ctx.setActiveTab} className="space-y-6">
          {/* Navigation Tabs with Icons */}
          <TabsList className="nav-tabs w-full max-w-6xl mx-auto justify-start md:justify-center overflow-x-auto scrollbar-hide">
            <TabsTrigger value="reliability" className="nav-tab">
              <AlertTriangle className="nav-tab-icon" />
              <span className="hidden sm:inline">P<sub>f</sub> Analysis</span>
              <span className="sm:hidden">P<sub>f</sub></span>
            </TabsTrigger>
            <TabsTrigger value="static" className="nav-tab">
              <Ruler className="nav-tab-icon" />
              <span className="hidden sm:inline">Static Loads</span>
              <span className="sm:hidden">Static</span>
            </TabsTrigger>
            <TabsTrigger value="truss" className="nav-tab">
              <Triangle className="nav-tab-icon" />
              <span className="hidden sm:inline">Truss</span>
              <span className="sm:hidden">Truss</span>
            </TabsTrigger>
            <TabsTrigger value="moments" className="nav-tab">
              <BarChart3 className="nav-tab-icon" />
              <span className="hidden sm:inline">Stat Moments</span>
              <span className="sm:hidden">Moments</span>
            </TabsTrigger>
            <TabsTrigger value="dynamic" className="nav-tab">
              <Activity className="nav-tab-icon" />
              <span className="hidden sm:inline">Dynamic Loads</span>
              <span className="sm:hidden">Dynamic</span>
            </TabsTrigger>
            <TabsTrigger value="distributions" className="nav-tab">
              <PieChart className="nav-tab-icon" />
              <span className="hidden sm:inline">Distributions</span>
              <span className="sm:hidden">Dist</span>
            </TabsTrigger>
            <TabsTrigger value="inference" className="nav-tab">
              <Brain className="nav-tab-icon" />
              <span className="hidden sm:inline">Inference</span>
              <span className="sm:hidden">Bayes</span>
            </TabsTrigger>
            <TabsTrigger value="mcmc" className="nav-tab">
              <GitBranch className="nav-tab-icon" />
              <span className="hidden sm:inline">MCMC</span>
              <span className="sm:hidden">MCMC</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="nav-tab">
              <Shield className="nav-tab-icon" />
              <span className="hidden sm:inline">Advanced</span>
              <span className="sm:hidden">Adv</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="nav-tab">
              <BookOpen className="nav-tab-icon" />
              <span className="hidden sm:inline">Library</span>
              <span className="sm:hidden">Lib</span>
            </TabsTrigger>
          </TabsList>

          {/* Sync Status Indicator */}
          {ctx.isSynced && (
            <div className="w-full max-w-6xl mx-auto">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-xs font-medium text-primary">Synced</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: `E[w] = ${ctx.loadMean} kN/m`, key: 'mean' },
                    { label: `Var = ${ctx.loadVariance} (kN/m)²`, key: 'var' },
                    { label: `γ₁ = ${ctx.loadSkewness.toFixed(2)}`, key: 'skew' },
                    { label: `κ = ${ctx.loadKurtosis.toFixed(2)}`, key: 'kurt' },
                    { label: `L = ${ctx.beamLength} m`, key: 'len' },
                    { label: `μR = ${ctx.resistanceMean} MPa`, key: 'res' },
                    { label: `CoV_R = ${(ctx.resistanceCoV * 100).toFixed(0)}%`, key: 'cov' },
                  ].map((p) => (
                    <span
                      key={p.key}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-mono text-primary whitespace-nowrap"
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                  <Link2 className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    → Pf, Static, Moments, Dynamic
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Cross-Reference Section */}
          <Collapsible open={ctx.crossRefOpen} onOpenChange={ctx.setCrossRefOpen} className="w-full max-w-6xl mx-auto">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between gap-2 bg-muted/20 border-primary/30 hover:bg-primary/10 h-auto py-3"
              >
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-left">Unified Statistical Framework — Cross-Tab Connections</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 ${ctx.crossRefOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {/* Shared Parameter Controls */}
              <div className="glass-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h4 className="section-subheader m-0">Shared Statistical Parameters</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Sync to tabs</span>
                    <Switch
                      checked={ctx.syncEnabled}
                      onCheckedChange={ctx.setSyncEnabled}
                      className="data-[state=checked]:bg-primary"
                    />
                    {ctx.syncEnabled && (
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="param-group">
                    <label className="param-label">Mean Load: <span className="param-value">{ctx.loadMean}</span> kN/m</label>
                    <Slider value={[ctx.loadMean]} onValueChange={([v]) => ctx.setLoadMean(v)} min={1} max={50} step={1} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Variance: <span className="param-value">{ctx.loadVariance}</span> (kN/m)²</label>
                    <Slider value={[ctx.loadVariance]} onValueChange={([v]) => ctx.setLoadVariance(v)} min={1} max={100} step={1} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Skewness: <span className="param-value">{ctx.loadSkewness.toFixed(2)}</span></label>
                    <Slider value={[ctx.loadSkewness]} onValueChange={([v]) => ctx.setLoadSkewness(v)} min={-2} max={2} step={0.1} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Kurtosis: <span className="param-value">{ctx.loadKurtosis.toFixed(2)}</span></label>
                    <Slider value={[ctx.loadKurtosis]} onValueChange={([v]) => ctx.setLoadKurtosis(v)} min={1} max={10} step={0.1} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Beam Length: <span className="param-value">{ctx.beamLength}</span> m</label>
                    <Slider value={[ctx.beamLength]} onValueChange={([v]) => ctx.setBeamLength(v)} min={2} max={20} step={0.5} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Resistance μ: <span className="param-value">{ctx.resistanceMean}</span> MPa</label>
                    <Slider value={[ctx.resistanceMean]} onValueChange={([v]) => ctx.setResistanceMean(v)} min={100} max={500} step={10} />
                  </div>
                  <div className="param-group">
                    <label className="param-label">Resistance CoV: <span className="param-value">{(ctx.resistanceCoV * 100).toFixed(0)}%</span></label>
                    <Slider value={[ctx.resistanceCoV]} onValueChange={([v]) => ctx.setResistanceCoV(v)} min={0.05} max={0.3} step={0.01} />
                  </div>
                </div>
              </div>
              <GlobalProjectWorkbench />
              <DecisionSupportWorkbench />
              <StatisticalCrossReference
                loadMean={ctx.loadMean}
                loadVariance={ctx.loadVariance}
                loadSkewness={ctx.loadSkewness}
                loadKurtosis={ctx.loadKurtosis}
                beamLength={ctx.beamLength}
                resistanceMean={ctx.resistanceMean}
                resistanceCoV={ctx.resistanceCoV}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Probability of Failure Tab */}
          <TabsContent value="reliability" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Probability of Failure</h2>
              <p className="text-sm text-muted-foreground">
                First-Order Reliability Method (FORM) with Monte Carlo verification using β = (μ<sub>R</sub> - μ<sub>S</sub>) / √(σ<sub>R</sub>² + σ<sub>S</sub>²).
              </p>
              {ctx.isSynced && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                  <Link2 className="h-3 w-3" /> Synced with cross-reference
                </div>
              )}
            </div>
            <FormulaReferencePanel tabId="reliability" />
            <ProbabilityOfFailure />
          </TabsContent>

          {/* Static Analysis Tab */}
          <TabsContent value="static" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Static Beam Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Rigidized moment equivalence with influence lines and envelope diagrams for moving loads.
              </p>
              {ctx.isSynced && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                  <Link2 className="h-3 w-3" /> Synced
                </div>
              )}
            </div>
            <FormulaReferencePanel tabId="static" />
            <StaticBeamAnalysis />
          </TabsContent>

          {/* Truss Analysis Tab */}
          <TabsContent value="truss" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Truss Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Matrix stiffness methods with load uncertainty propagation through equilibrium equations.
              </p>
            </div>
            <FormulaReferencePanel tabId="truss" />
            <TrussAnalysis />
          </TabsContent>

          {/* Statistical Moment Analysis Tab */}
          <TabsContent value="moments" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Statistical Moment Analysis</h2>
              <p className="text-sm text-muted-foreground">
                Higher-order moments (variance, skewness, kurtosis) and their mechanical equivalence.
              </p>
              {ctx.isSynced && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                  <Link2 className="h-3 w-3" /> Synced
                </div>
              )}
            </div>
            <FormulaReferencePanel tabId="moments" />
            <StatisticalMomentAnalysis />
          </TabsContent>

          {/* Dynamic Analysis Tab */}
          <TabsContent value="dynamic" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Dynamic Load Analysis</h2>
              <p className="text-sm text-muted-foreground">
                SDOF vibration, FEA discretization, random excitation dynamics, and civil engineering applications.
              </p>
              {ctx.isSynced && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                  <Link2 className="h-3 w-3" /> Synced
                </div>
              )}
            </div>
            <FormulaReferencePanel tabId="dynamic" />
            <DynamicLoadAnalysis />
          </TabsContent>

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="space-y-6 animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Probability Distributions</h2>
              <p className="text-sm text-muted-foreground">
                Normal, Gamma, and Poisson distributions for reliability analysis.
              </p>
            </div>
            <FormulaReferencePanel tabId="distributions" />

            {/* Normal Distribution */}
            <div className="space-y-4">
              <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Normal Distribution Parameters</h3>
                <div className="grid grid-cols-2 gap-6">
                  <SliderWithInput label="Mean (μ)" value={normalMu} onChange={setNormalMu} min={-5} max={5} step={0.1} precision={1} />
                  <SliderWithInput label="Std Dev (σ)" value={normalSigma} onChange={setNormalSigma} min={0.1} max={3} step={0.1} precision={1} />
                </div>
              </div>
              <DistributionChart type="normal" params={{ mu: normalMu, sigma: normalSigma }} color="hsl(199 89% 48%)" title="Normal Distribution N(μ, σ²)" />
            </div>

            {/* Gamma and Poisson */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <SliderWithInput label="α" value={gammaAlpha} onChange={setGammaAlpha} min={0.5} max={10} step={0.5} precision={1} />
                    <SliderWithInput label="θ" value={gammaTheta} onChange={setGammaTheta} min={0.5} max={5} step={0.5} precision={1} />
                  </div>
                </div>
                <DistributionChart type="gamma" params={{ alpha: gammaAlpha, theta: gammaTheta }} color="hsl(142 76% 36%)" title="Gamma Distribution Γ(α, θ)" />
              </div>

              <div className="space-y-4">
                <div className="glass-card p-4">
                  <SliderWithInput label="λ" value={poissonLambda} onChange={setPoissonLambda} min={1} max={15} step={0.5} precision={1} />
                </div>
                <DistributionChart type="poisson" params={{ lambda: poissonLambda }} color="hsl(262 83% 58%)" title="Poisson Distribution P(λ)" />
              </div>
            </div>

            {/* Extreme Value Distributions */}
            <ExtremeValueDistributions
              gumbelMu={gumbelMu}
              gumbelBeta={gumbelBeta}
              weibullK={weibullK}
              weibullLambda={weibullLambda}
              frechetAlpha={frechetAlpha}
              frechetS={frechetS}
              onGumbelMuChange={setGumbelMu}
              onGumbelBetaChange={setGumbelBeta}
              onWeibullKChange={setWeibullK}
              onWeibullLambdaChange={setWeibullLambda}
              onFrechetAlphaChange={setFrechetAlpha}
              onFrechetSChange={setFrechetS}
            />
          </TabsContent>

          {/* Bayesian Inference Tab */}
          <TabsContent value="inference" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Bayesian Inference</h2>
              <p className="text-sm text-muted-foreground">
                Update prior beliefs using observed data via Bayes theorem with evolving posterior moments.
              </p>
            </div>
            <FormulaReferencePanel tabId="inference" />
            <BayesianInferenceViz />
          </TabsContent>

          {/* MCMC Tab */}
          <TabsContent value="mcmc" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Metropolis-Hastings MCMC</h2>
              <p className="text-sm text-muted-foreground">
                Sample from complex posteriors to estimate higher-order moments for tail behavior analysis.
              </p>
            </div>
            <FormulaReferencePanel tabId="mcmc" />
            <MCMCVisualization />
          </TabsContent>

          {/* Advanced Reliability Tab */}
          <TabsContent value="advanced" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Advanced Reliability Analysis</h2>
              <p className="text-sm text-muted-foreground">
                RBDO with Monte Carlo validation, sensitivity-driven adaptive sampling, time-dependent reliability, and system reliability for series/parallel structures.
              </p>
            </div>
            <FormulaReferencePanel tabId="advanced" />
            <AdvancedReliabilityAnalysis />
          </TabsContent>

          {/* Math Library Tab */}
          <TabsContent value="library" className="animate-fade-in">
            <div className="text-center mb-6 max-w-3xl mx-auto">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">Mathematical Reference Library</h2>
              <p className="text-sm text-muted-foreground">
                Complete organized collection of analytical formulas used across all analysis modules.
              </p>
            </div>
            <MathLibrary
              onSendToPf={(data) => {
                ctx.setLoadMean(data.meanLoad);
                ctx.setLoadVariance(Math.pow(data.meanLoad * data.loadCoV, 2));
                ctx.setBeamLength(data.beamLength);
                ctx.setSyncEnabled(true);
                ctx.setCrossRefOpen(true);
                ctx.setActiveTab("reliability");
                toast.success("Load moments sent to Pf Analysis", {
                  description: `E[w] = ${data.meanLoad.toFixed(3)} kN/m, CoV = ${(data.loadCoV * 100).toFixed(1)}%, L = ${data.beamLength} m`,
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 md:px-6 text-center text-xs text-muted-foreground">
          <p>Interactive probability of failure prediction using Bayesian methods and Unified Statistical Moment Calculus.</p>
          <p className="mt-1 font-mono">Luis A. Meza IV | Interactive Structural Reliability Analysis</p>
        </div>
      </footer>
    </div>
  );
}

/** Root component wraps content in the SharedParametersProvider */
const Index = () => (
  <SharedParametersProvider>
    <IndexContent />
  </SharedParametersProvider>
);

export default Index;
