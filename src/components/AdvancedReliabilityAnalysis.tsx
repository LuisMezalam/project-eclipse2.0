import { useState, useMemo } from "react";
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, 
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, 
  ReferenceLine, Legend, ScatterChart, Scatter, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Target, Activity, Clock, TrendingDown, Zap, AlertTriangle, CheckCircle2, Layers, Link2 } from "lucide-react";
import { 
  performRBDO, 
  performAdaptiveSampling, 
  analyzeTimeDependentReliability,
  generateStochasticPaths,
  validateRBDOWithMonteCarlo,
  analyzeSystemReliability,
  type RBDOVariable, 
  type RBDOConstraint,
  type StochasticProcess,
  type SystemComponent,
  type CommonCauseGroup
} from "@/lib/advancedReliability";

export function AdvancedReliabilityAnalysis() {
  const [activeTab, setActiveTab] = useState<"rbdo" | "adaptive" | "time-dependent" | "system">("rbdo");
  
  // RBDO State
  const [targetBeta, setTargetBeta] = useState(3.0);
  const [beamLength, setBeamLength] = useState(6);
  const [designLoad, setDesignLoad] = useState(15);
  const [designInertia, setDesignInertia] = useState(8000);
  const [runRBDO, setRunRBDO] = useState(0);
  
  // Adaptive Sampling State
  const [numInitialSamples, setNumInitialSamples] = useState(100);
  const [numRefinements, setNumRefinements] = useState(5);
  const [runAdaptive, setRunAdaptive] = useState(0);
  
  // Time-Dependent State
  const [timeSpan, setTimeSpan] = useState(50);
  const [loadCorrelation, setLoadCorrelation] = useState(5);
  const [loadVariance, setLoadVariance] = useState(4);
  const [resistanceDecay, setResistanceDecay] = useState(0.02);
  const [processType, setProcessType] = useState<"gaussian" | "ornstein-uhlenbeck">("gaussian");
  const [runTimeDep, setRunTimeDep] = useState(0);
  
  // Monte Carlo Validation State
  const [mcSamples, setMcSamples] = useState(5000);
  const [showMCValidation, setShowMCValidation] = useState(true);
  
  // System Reliability State
  const [numComponents, setNumComponents] = useState(4);
  const [systemType, setSystemType] = useState<"series" | "parallel" | "series-parallel" | "k-out-of-n">("series");
  const [kValue, setKValue] = useState(2);
  const [componentBeta, setComponentBeta] = useState(3.0);
  const [componentBetaVariation, setComponentBetaVariation] = useState(0.3);
  const [correlationCoeff, setCorrelationCoeff] = useState(0.3);
  const [enableCCF, setEnableCCF] = useState(false);
  const [ccfBetaFactor, setCcfBetaFactor] = useState(0.1);
  const [runSystem, setRunSystem] = useState(0);

  // RBDO Analysis
  const rbdoResults = useMemo(() => {
    // Trigger recomputation
    const _ = runRBDO;
    
    const variables: RBDOVariable[] = [
      { 
        name: "Load w", 
        mean: designLoad, 
        stdDev: designLoad * 0.15, 
        lowerBound: 5, 
        upperBound: 30, 
        isDesign: true,
        unit: "kN/m"
      },
      { 
        name: "Inertia I", 
        mean: designInertia, 
        stdDev: designInertia * 0.05, 
        lowerBound: 4000, 
        upperBound: 20000, 
        isDesign: true,
        unit: "cm⁴"
      },
      { 
        name: "Modulus E", 
        mean: 200, 
        stdDev: 10, 
        lowerBound: 180, 
        upperBound: 220, 
        isDesign: false,
        unit: "GPa"
      }
    ];
    
    // Objective: minimize cost (proportional to inertia)
    const objectiveFunction = (design: number[]): number => {
      const loadCost = design[0] * 0.1; // Higher load = more reinforcement needed
      const inertiaCost = design[1] * 0.001; // Material cost
      return loadCost + inertiaCost;
    };
    
    // Constraint: deflection limit state
    const constraint: RBDOConstraint = {
      name: "Deflection Limit",
      targetReliability: targetBeta,
      limitStateFunction: (designVars: number[], randomVars: number[]): number => {
        const w = designVars[0]; // Load
        const I = designVars[1] * 1e-8; // Convert cm⁴ to m⁴
        const E = randomVars[0] * 1e6; // Convert GPa to kN/m²
        
        // Maximum deflection for simply supported beam
        const delta = (5 * w * Math.pow(beamLength, 4)) / (384 * E * I);
        const allowable = beamLength / 360; // L/360 limit
        
        // g < 0 is failure
        return allowable - delta;
      }
    };
    
    return performRBDO(variables, objectiveFunction, constraint, {
      maxIterations: 50,
      stepSize: 0.05,
      tolerance: 1e-3
    });
  }, [targetBeta, beamLength, designLoad, designInertia, runRBDO]);

  // Monte Carlo Validation for RBDO
  const mcValidation = useMemo(() => {
    if (!showMCValidation) return null;
    
    const limitStateFunction = (designVars: number[], randomVars: number[]): number => {
      const w = designVars[0];
      const I = designVars[1] * 1e-8;
      const E = randomVars[0] * 1e6;
      const delta = (5 * w * Math.pow(beamLength, 4)) / (384 * E * I);
      const allowable = beamLength / 360;
      return allowable - delta;
    };
    
    return validateRBDOWithMonteCarlo(
      limitStateFunction,
      rbdoResults.optimalDesign,
      [200], // Random variable means (E)
      [10],  // Random variable stdDevs
      mcSamples
    );
  }, [rbdoResults.optimalDesign, beamLength, mcSamples, showMCValidation]);

  // Adaptive Sampling Analysis
  const adaptiveResults = useMemo(() => {
    const _ = runAdaptive;
    
    const means = [designLoad, 200, designInertia];
    const stdDevs = [designLoad * 0.15, 10, designInertia * 0.05];
    
    // Response: beam deflection
    const responseFunction = (x: number[]): number => {
      const w = x[0];
      const E = x[1] * 1e6;
      const I = x[2] * 1e-8;
      return (5 * w * Math.pow(beamLength, 4)) / (384 * E * I) * 1000; // mm
    };
    
    return performAdaptiveSampling(responseFunction, means, stdDevs, {
      initialSamples: numInitialSamples,
      refinementIterations: numRefinements,
      samplesPerRefinement: 30
    });
  }, [designLoad, designInertia, beamLength, numInitialSamples, numRefinements, runAdaptive]);

  // Time-Dependent Reliability Analysis
  const timeDepResults = useMemo(() => {
    const _ = runTimeDep;
    
    const loadProcess: StochasticProcess = {
      type: processType,
      mean: designLoad,
      variance: loadVariance,
      correlationTime: loadCorrelation
    };
    
    // Resistance with degradation over time
    const resistanceProcess: StochasticProcess = {
      type: processType,
      mean: designLoad * 2 * (1 - resistanceDecay * timeSpan / 2), // Degrading mean
      variance: loadVariance * 0.5,
      correlationTime: loadCorrelation * 2
    };
    
    return analyzeTimeDependentReliability(
      loadProcess,
      resistanceProcess,
      timeSpan,
      80,
      300
    );
  }, [designLoad, loadVariance, loadCorrelation, resistanceDecay, timeSpan, processType, runTimeDep]);

  // Stochastic paths for visualization
  const stochasticPaths = useMemo(() => {
    const loadProcess: StochasticProcess = {
      type: processType,
      mean: designLoad,
      variance: loadVariance,
      correlationTime: loadCorrelation
    };
    
    return generateStochasticPaths(loadProcess, timeSpan, 8, 60);
  }, [designLoad, loadVariance, loadCorrelation, timeSpan, processType]);

  // System Reliability Analysis
  const systemResults = useMemo(() => {
    const _ = runSystem;
    
    // Generate components with varying reliability
    const components: SystemComponent[] = Array.from({ length: numComponents }, (_, i) => {
      const beta = componentBeta + (Math.random() - 0.5) * 2 * componentBetaVariation;
      const pf = 1 - (1 / (1 + Math.exp(-beta * 0.8))); // Approximate normalCDF(-beta)
      return {
        id: `comp_${i + 1}`,
        name: `Component ${i + 1}`,
        reliabilityIndex: beta,
        probabilityOfFailure: Math.max(1e-6, Math.min(0.5, pf)),
        importance: 0
      };
    });
    
    // Common cause failure groups
    const commonCauseGroups: CommonCauseGroup[] = enableCCF ? [
      {
        componentIds: components.slice(0, Math.ceil(numComponents / 2)).map(c => c.id),
        betaFactor: ccfBetaFactor,
        shockRate: 0.01
      }
    ] : [];
    
    return analyzeSystemReliability(
      components,
      systemType,
      correlationCoeff,
      commonCauseGroups,
      kValue
    );
  }, [numComponents, systemType, kValue, componentBeta, componentBetaVariation, correlationCoeff, enableCCF, ccfBetaFactor, runSystem]);

  // Component data for radar chart
  const componentRadarData = useMemo(() => {
    return systemResults.componentImportance.map((imp, idx) => ({
      component: `C${idx + 1}`,
      birnbaum: imp.birnbaum * 100,
      fusselVesely: imp.fusselVesely * 100,
      riskAchievement: Math.min(imp.riskAchievement, 10) * 10
    }));
  }, [systemResults]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-2 text-foreground">Advanced Reliability Analysis</h3>
        <p className="text-sm text-muted-foreground">
          RBDO with MC validation, adaptive sampling, time-dependent reliability, and system reliability analysis.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="rbdo" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            RBDO
          </TabsTrigger>
          <TabsTrigger value="adaptive" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Adaptive
          </TabsTrigger>
          <TabsTrigger value="time-dependent" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time-Dep
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* RBDO Tab */}
        <TabsContent value="rbdo">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Reliability-Based Design Optimization
              </h4>
              <Button onClick={() => setRunRBDO(r => r + 1)} variant="outline" size="sm">
                Run RBDO
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Find optimal design parameters (load capacity, section properties) while maintaining 
              target reliability β ≥ {targetBeta.toFixed(1)}.
            </p>

            {/* Configuration */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
              <div>
                <label className="text-xs text-muted-foreground">Target Reliability β</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[targetBeta]}
                    onValueChange={([v]) => setTargetBeta(v)}
                    min={1.5}
                    max={4.5}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{targetBeta.toFixed(1)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Beam Length (m)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[beamLength]}
                    onValueChange={([v]) => setBeamLength(v)}
                    min={3}
                    max={12}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{beamLength}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Initial Load (kN/m)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[designLoad]}
                    onValueChange={([v]) => setDesignLoad(v)}
                    min={5}
                    max={30}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{designLoad}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Initial Inertia (cm⁴)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[designInertia]}
                    onValueChange={([v]) => setDesignInertia(v)}
                    min={4000}
                    max={20000}
                    step={500}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-16">{designInertia}</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Optimal Design */}
              <div className="space-y-4">
                <h5 className="text-sm font-semibold">Optimal Design</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-lg border ${
                    rbdoResults.status === 'converged' ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'
                  }`}>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="flex items-center gap-2">
                      {rbdoResults.status === 'converged' ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm font-semibold capitalize">{rbdoResults.status}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="text-xs text-muted-foreground">Iterations</div>
                    <div className="text-lg font-bold font-mono">{rbdoResults.iterationCount}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground">Optimal Load</div>
                    <div className="text-lg font-bold font-mono text-foreground">
                      {rbdoResults.optimalDesign[0]?.toFixed(2)} <span className="text-xs font-normal">kN/m</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground">Optimal Inertia</div>
                    <div className="text-lg font-bold font-mono text-foreground">
                      {rbdoResults.optimalDesign[1]?.toFixed(0)} <span className="text-xs font-normal">cm⁴</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-4 rounded-lg border ${
                    rbdoResults.reliabilityIndex >= targetBeta ? 'bg-primary/20 border-primary' : 'bg-destructive/20 border-destructive'
                  }`}>
                    <div className="text-xs text-muted-foreground">Achieved β</div>
                    <div className="text-2xl font-bold font-mono">{rbdoResults.reliabilityIndex.toFixed(3)}</div>
                    <div className="text-xs">Target: {targetBeta.toFixed(1)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30">
                    <div className="text-xs text-muted-foreground">P<sub>f</sub></div>
                    <div className="text-lg font-bold font-mono">
                      {(rbdoResults.probabilityOfFailure * 100).toFixed(4)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Convergence Plot */}
              <div>
                <h5 className="text-sm font-semibold mb-3">Convergence History</h5>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={rbdoResults.convergenceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis 
                      dataKey="iteration" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      label={{ value: 'Iteration', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      label={{ value: 'Objective', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      label={{ value: 'β', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 16 }} />
                    <ReferenceLine yAxisId="right" y={targetBeta} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="objective" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      name="Objective"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="beta" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={false}
                      name="β"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sensitivity */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <h5 className="text-sm font-semibold mb-2">Design Sensitivity (∂β/∂x)</h5>
              <div className="flex gap-4">
                {['Load w', 'Inertia I'].map((name, idx) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{name}:</span>
                    <span className={`text-sm font-mono ${
                      rbdoResults.sensitivityToDesign[idx] > 0 ? 'text-primary' : 'text-destructive'
                    }`}>
                      {rbdoResults.sensitivityToDesign[idx]?.toFixed(4) || '0.0000'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Positive sensitivity: increasing parameter increases reliability. 
                Negative: increasing parameter decreases reliability.
              </p>
            </div>

            {/* Monte Carlo Validation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-chart-2" />
                  Monte Carlo Validation
                </h5>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Enable MC</span>
                  <Switch 
                    checked={showMCValidation} 
                    onCheckedChange={setShowMCValidation}
                  />
                </div>
              </div>
              
              {showMCValidation && mcValidation && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">MC Samples</label>
                      <Slider
                        value={[mcSamples]}
                        onValueChange={([v]) => setMcSamples(v)}
                        min={1000}
                        max={50000}
                        step={1000}
                      />
                    </div>
                    <span className="text-sm font-mono w-16">{mcSamples}</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* MC Results */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30">
                          <div className="text-xs text-muted-foreground">MC P<sub>f</sub></div>
                          <div className="text-lg font-bold font-mono text-chart-2">
                            {(mcValidation.estimatedPf * 100).toFixed(4)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ±{(mcValidation.coefficientOfVariation * mcValidation.estimatedPf * 100 * 1.96).toFixed(4)}%
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                          <div className="text-xs text-muted-foreground">MC β</div>
                          <div className="text-lg font-bold font-mono text-accent">
                            {mcValidation.estimatedBeta.toFixed(3)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            FORM: {rbdoResults.reliabilityIndex.toFixed(3)}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30 border border-border">
                          <div className="text-xs text-muted-foreground">Failures</div>
                          <div className="text-lg font-bold font-mono">
                            {mcValidation.failureCount} / {mcValidation.numSamples}
                          </div>
                        </div>
                        <div className={`p-4 rounded-lg border ${
                          Math.abs(mcValidation.estimatedBeta - rbdoResults.reliabilityIndex) < 0.2 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'bg-destructive/10 border-destructive/30'
                        }`}>
                          <div className="text-xs text-muted-foreground">Validation</div>
                          <div className="flex items-center gap-2">
                            {Math.abs(mcValidation.estimatedBeta - rbdoResults.reliabilityIndex) < 0.2 ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="text-sm font-semibold">
                              Δβ = {(mcValidation.estimatedBeta - rbdoResults.reliabilityIndex).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-muted/10 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">95% Confidence Interval for P<sub>f</sub></div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono">{(mcValidation.confidenceInterval.lower * 100).toFixed(4)}%</span>
                          <div className="flex-1 h-2 bg-muted/30 rounded relative">
                            <div 
                              className="absolute h-full bg-chart-2 rounded"
                              style={{
                                left: `${(mcValidation.confidenceInterval.lower / (mcValidation.confidenceInterval.upper * 1.5)) * 100}%`,
                                width: `${((mcValidation.confidenceInterval.upper - mcValidation.confidenceInterval.lower) / (mcValidation.confidenceInterval.upper * 1.5)) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono">{(mcValidation.confidenceInterval.upper * 100).toFixed(4)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Limit State Histogram */}
                    <div>
                      <h6 className="text-xs font-semibold mb-2">Limit State Distribution g(X)</h6>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={mcValidation.histogram}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                          <XAxis 
                            dataKey="bin" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                            tickFormatter={(v) => v.toFixed(2)}
                          />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            formatter={(value: number) => [value, 'Count']}
                          />
                          <ReferenceLine x={0} stroke="hsl(var(--destructive))" strokeWidth={2} />
                          <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.7}>
                            {mcValidation.histogram.map((entry, index) => (
                              <Cell 
                                key={index} 
                                fill={entry.bin < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Red bars: failure region (g &lt; 0)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Adaptive Sampling Tab */}
        <TabsContent value="adaptive">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                Sensitivity-Driven Adaptive Sampling
              </h4>
              <Button onClick={() => setRunAdaptive(r => r + 1)} variant="outline" size="sm">
                Run Analysis
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Concentrates sampling points in high-sensitivity regions of the input space 
              for more efficient uncertainty quantification.
            </p>

            {/* Configuration */}
            <div className="grid md:grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
              <div>
                <label className="text-xs text-muted-foreground">Initial Samples</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[numInitialSamples]}
                    onValueChange={([v]) => setNumInitialSamples(v)}
                    min={50}
                    max={300}
                    step={25}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{numInitialSamples}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Refinement Iterations</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[numRefinements]}
                    onValueChange={([v]) => setNumRefinements(v)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{numRefinements}</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Statistics and Sensitivity */}
              <div className="space-y-4">
                <h5 className="text-sm font-semibold">Adaptive Sampling Results</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-xs text-muted-foreground">Mean Response</div>
                    <div className="text-lg font-bold font-mono text-primary">
                      {adaptiveResults.statistics.mean.toFixed(3)} mm
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="text-xs text-muted-foreground">Std Dev</div>
                    <div className="text-lg font-bold font-mono text-accent">
                      {adaptiveResults.statistics.stdDev.toFixed(3)} mm
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground">Total Samples</div>
                    <div className="text-lg font-bold font-mono">{adaptiveResults.samples.length}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30">
                    <div className="text-xs text-muted-foreground">Effective N</div>
                    <div className="text-lg font-bold font-mono">
                      {adaptiveResults.effectiveSampleSize.toFixed(0)}
                    </div>
                  </div>
                </div>

                {/* Sensitivity Map */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border">
                  <h6 className="text-xs font-semibold mb-3">Input Sensitivity Ranking</h6>
                  <div className="space-y-2">
                    {adaptiveResults.sensitivityMap.slice(0, 3).map((s, idx) => (
                      <div key={s.dimension} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-20">
                          {['Load', 'Modulus', 'Inertia'][s.dimension]}:
                        </span>
                        <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
                          <div 
                            className={`h-full ${idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-accent' : 'bg-chart-2'}`}
                            style={{ width: `${s.sensitivity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-12">{(s.sensitivity * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Convergence */}
              <div>
                <h5 className="text-sm font-semibold mb-3">Convergence History</h5>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={adaptiveResults.convergenceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis 
                      dataKey="iteration" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="mean" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Mean"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="variance" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Variance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Refined Regions */}
            {adaptiveResults.refinedRegions.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/20 border border-border">
                <h5 className="text-sm font-semibold mb-2">Refined Sampling Regions</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {adaptiveResults.refinedRegions.slice(0, 4).map((region, idx) => (
                    <div key={idx} className="p-2 rounded bg-accent/10 border border-accent/30 text-xs">
                      <div className="text-muted-foreground">Region {idx + 1}</div>
                      <div className="font-mono">Importance: {region.importance.toFixed(3)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Time-Dependent Tab */}
        <TabsContent value="time-dependent">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-chart-2" />
                Time-Dependent Reliability Analysis
              </h4>
              <Button onClick={() => setRunTimeDep(r => r + 1)} variant="outline" size="sm">
                Run Analysis
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Analyzes reliability under stochastic load processes with temporal correlation 
              and resistance degradation over time.
            </p>

            {/* Configuration */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
              <div>
                <label className="text-xs text-muted-foreground">Time Span (years)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[timeSpan]}
                    onValueChange={([v]) => setTimeSpan(v)}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{timeSpan}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Correlation Time (years)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[loadCorrelation]}
                    onValueChange={([v]) => setLoadCorrelation(v)}
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{loadCorrelation}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Load Variance</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[loadVariance]}
                    onValueChange={([v]) => setLoadVariance(v)}
                    min={1}
                    max={10}
                    step={0.5}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{loadVariance}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Degradation Rate (%/yr)</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[resistanceDecay * 100]}
                    onValueChange={([v]) => setResistanceDecay(v / 100)}
                    min={0}
                    max={5}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">{(resistanceDecay * 100).toFixed(1)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Process Type</label>
                <Select value={processType} onValueChange={(v) => setProcessType(v as typeof processType)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gaussian">Gaussian Process</SelectItem>
                    <SelectItem value="ornstein-uhlenbeck">Ornstein-Uhlenbeck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* First Passage Time Statistics */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="text-xs text-muted-foreground">Mean First Passage Time</div>
                <div className="text-xl font-bold font-mono text-primary">
                  {timeDepResults.firstPassageTime.mean.toFixed(1)}
                  <span className="text-sm font-normal ml-1">years</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                <div className="text-xs text-muted-foreground">FPT Std Dev</div>
                <div className="text-xl font-bold font-mono text-accent">
                  {timeDepResults.firstPassageTime.stdDev.toFixed(1)}
                  <span className="text-sm font-normal ml-1">years</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30">
                <div className="text-xs text-muted-foreground">P(survival at t={timeSpan})</div>
                <div className="text-xl font-bold font-mono">
                  {(timeDepResults.cumulativeReliability[timeDepResults.cumulativeReliability.length - 1] * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="text-xs text-muted-foreground">Crossings Detected</div>
                <div className="text-xl font-bold font-mono">
                  {timeDepResults.crossingEvents.length}
                </div>
              </div>
            </div>

            {/* FPT Percentiles */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <h5 className="text-sm font-semibold mb-2">First Passage Time Percentiles</h5>
              <div className="flex flex-wrap gap-4">
                {['P5', 'P25', 'P50', 'P75', 'P95'].map((label, idx) => (
                  <div key={label} className="text-center">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-sm font-mono font-semibold">
                      {timeDepResults.firstPassageTime.percentiles[idx].toFixed(1)} yr
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Histories */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Load and Resistance Paths */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Stochastic Load Paths (Mean ± 2σ)
                </label>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timeDepResults.loadTimeHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      label={{ value: 'Time (years)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Area 
                      type="monotone" 
                      dataKey="upper" 
                      stroke="transparent" 
                      fill="hsl(var(--destructive))" 
                      fillOpacity={0.1}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="lower" 
                      stroke="transparent" 
                      fill="hsl(var(--background))" 
                      fillOpacity={1}
                    />
                    <Line type="monotone" dataKey="mean" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cumulative Reliability */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Cumulative Reliability R(t)
                </label>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timeDepResults.timePoints.map((t, i) => ({
                    time: t,
                    reliability: timeDepResults.cumulativeReliability[i]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      label={{ value: 'Time (years)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[0, 1]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Tooltip 
                      contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, 'R(t)']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="reliability" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <ReferenceLine y={0.95} stroke="hsl(var(--accent))" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Beta(t) and Hazard */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Instantaneous Reliability Index */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Instantaneous Reliability β(t)
                </label>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={timeDepResults.timePoints.map((t, i) => ({
                    time: t,
                    beta: Math.min(10, timeDepResults.instantReliability[i])
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      domain={[0, 'auto']}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <ReferenceLine y={3} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="beta" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Sample Paths */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Sample Load Paths (Stochastic Realizations)
                </label>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stochasticPaths}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    {Array.from({ length: 8 }, (_, i) => (
                      <Line 
                        key={i}
                        type="monotone" 
                        dataKey={`path${i}`} 
                        stroke={`hsl(${i * 45}, 60%, 50%)`} 
                        strokeWidth={1}
                        dot={false}
                        strokeOpacity={0.6}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interpretation */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <h5 className="text-sm font-semibold mb-2">Analysis Interpretation</h5>
              <div className="grid md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">Process Type:</strong>{' '}
                  {processType === 'gaussian' 
                    ? 'Gaussian Process with squared exponential covariance'
                    : 'Ornstein-Uhlenbeck mean-reverting process'}
                </div>
                <div>
                  <strong className="text-foreground">Degradation Effect:</strong>{' '}
                  Resistance decreases by {(resistanceDecay * 100).toFixed(1)}%/year, 
                  total {(resistanceDecay * timeSpan * 100).toFixed(0)}% over service life.
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* System Reliability Tab */}
        <TabsContent value="system">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="h-5 w-5 text-chart-2" />
                System Reliability Analysis
              </h4>
              <Button onClick={() => setRunSystem(r => r + 1)} variant="outline" size="sm">
                Analyze System
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Series/parallel structural systems with component correlation and common cause failures.
            </p>

            {/* Configuration */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 rounded-lg bg-muted/20 border border-border">
              <div>
                <label className="text-xs text-muted-foreground">System Type</label>
                <Select value={systemType} onValueChange={(v) => setSystemType(v as typeof systemType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="series">Series</SelectItem>
                    <SelectItem value="parallel">Parallel</SelectItem>
                    <SelectItem value="series-parallel">Series-Parallel</SelectItem>
                    <SelectItem value="k-out-of-n">K-out-of-N</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Components: {numComponents}</label>
                <Slider value={[numComponents]} onValueChange={([v]) => setNumComponents(v)} min={2} max={8} step={1} className="mt-2" />
              </div>
              {systemType === 'k-out-of-n' && (
                <div>
                  <label className="text-xs text-muted-foreground">K Value: {kValue}</label>
                  <Slider value={[kValue]} onValueChange={([v]) => setKValue(v)} min={1} max={numComponents} step={1} className="mt-2" />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Component β: {componentBeta.toFixed(1)}</label>
                <Slider value={[componentBeta]} onValueChange={([v]) => setComponentBeta(v)} min={1.5} max={5} step={0.1} className="mt-2" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Correlation: {correlationCoeff.toFixed(2)}</label>
                <Slider value={[correlationCoeff]} onValueChange={([v]) => setCorrelationCoeff(v)} min={0} max={0.9} step={0.05} className="mt-2" />
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <Switch checked={enableCCF} onCheckedChange={setEnableCCF} />
                  <span className="text-xs">CCF (β={ccfBetaFactor})</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="text-sm font-semibold">System Results</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-xs text-muted-foreground">System P<sub>f</sub></div>
                    <div className="text-xl font-bold font-mono text-primary">{(systemResults.systemPf * 100).toFixed(4)}%</div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="text-xs text-muted-foreground">System β</div>
                    <div className="text-xl font-bold font-mono text-accent">{systemResults.systemBeta.toFixed(3)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-foreground">P<sub>f</sub> Bounds</div>
                    <div className="text-sm font-mono">[{(systemResults.boundsPf.lower * 100).toFixed(4)}%, {(systemResults.boundsPf.upper * 100).toFixed(4)}%]</div>
                  </div>
                  <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30">
                    <div className="text-xs text-muted-foreground">Correlation Effect</div>
                    <div className="text-lg font-bold font-mono">{(systemResults.correlationEffect * 100).toFixed(1)}%</div>
                  </div>
                </div>
                {enableCCF && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="text-xs text-muted-foreground">Common Cause Contribution</div>
                    <div className="text-sm font-mono">{(systemResults.commonCauseContribution * 100).toFixed(2)}%</div>
                  </div>
                )}
              </div>
              
              {/* Component Importance */}
              <div>
                <h5 className="text-sm font-semibold mb-3">Component Importance</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={componentRadarData}>
                    <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <PolarAngleAxis dataKey="component" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
                    <Radar name="Birnbaum" dataKey="birnbaum" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Radar name="Fussell-Vesely" dataKey="fusselVesely" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Diagram */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <h5 className="text-sm font-semibold mb-3">System Configuration: {systemType.toUpperCase()}</h5>
              <div className="flex items-center justify-center gap-2 py-4">
                {systemType === 'series' && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: numComponents }, (_, i) => (
                      <div key={i} className="flex items-center">
                        <div className="w-12 h-8 rounded bg-primary/20 border border-primary flex items-center justify-center text-xs font-mono">C{i+1}</div>
                        {i < numComponents - 1 && <div className="w-4 h-0.5 bg-primary" />}
                      </div>
                    ))}
                  </div>
                )}
                {systemType === 'parallel' && (
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: numComponents }, (_, i) => (
                      <div key={i} className="w-12 h-6 rounded bg-accent/20 border border-accent flex items-center justify-center text-xs font-mono">C{i+1}</div>
                    ))}
                  </div>
                )}
                {(systemType === 'series-parallel' || systemType === 'k-out-of-n') && (
                  <div className="text-sm text-muted-foreground text-center">
                    {systemType === 'k-out-of-n' ? `${kValue} of ${numComponents} components must survive` : 'Series of parallel subsystems'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
