import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, ReferenceLine, Legend, Cell } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalCDF } from "@/lib/reliability";
import { Plus, Trash2, Calculator, Link2, Sigma, TrendingUp, Layers, Zap } from "lucide-react";
import { 
  computePCECoefficients, 
  evaluatePCE, 
  pceStatistics, 
  generatePCEResponseSurface,
  pceMonteCarlo,
  pceSensitivityIndices,
  hermitePolynomial,
  computeMultiDimPCECoefficients,
  multiDimPCEStatistics,
  multiDimSobolIndices,
  multiDimPCEMonteCarlo,
  generate2DResponseSurface,
  adaptivePCE,
  sparseAdaptivePCE,
  pceTermImportance,
  computePCEBootstrapCI,
  computePCEAnalyticalCI,
  type MultiIndex,
  type PCEInputVariable,
  type AdaptivePCEResult,
  type PCEConfidenceIntervals
} from "@/lib/statistics";
import { useSharedParameters } from "@/contexts/SharedParametersContext";

interface LoadLevel {
  load: number;       // kN/m
  probability: number;
}

interface StatisticalMoments {
  mean: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  momentVariance: number;
}

export function StatisticalMomentAnalysis() {
  const ctx = useSharedParameters();

  const [beamLength, setBeamLength] = useState(6); // m
  const [loadLevels, setLoadLevels] = useState<LoadLevel[]>([
    { load: 5, probability: 0.1 },
    { load: 10, probability: 0.4 },
    { load: 15, probability: 0.3 },
    { load: 20, probability: 0.2 },
  ]);
  const [criticalLoad, setCriticalLoad] = useState(350); // kN
  const [analysisType, setAnalysisType] = useState<"1d" | "2d">("1d");
  const [pceOrder, setPceOrder] = useState(4);
  const [showPCE, setShowPCE] = useState(true);
  const [pceDimension, setPceDimension] = useState<"1d" | "multi" | "adaptive">("1d");
  const [adaptiveMaxOrder, setAdaptiveMaxOrder] = useState(6);
  const [useSparse, setUseSparse] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  
  // Multi-dimensional PCE input variables
  const [multiDimInputs, setMultiDimInputs] = useState<PCEInputVariable[]>([
    { name: "Load w", mean: 12, stdDev: 3, unit: "kN/m" },
    { name: "E (Modulus)", mean: 200, stdDev: 10, unit: "GPa" },
    { name: "I (Inertia)", mean: 8000, stdDev: 400, unit: "cm⁴" },
  ]);

  // Derive effective values from context when synced
  const effectiveBeamLength = ctx.isSynced ? ctx.beamLength : beamLength;
  const effectiveCriticalLoad = ctx.isSynced ? ctx.resistanceMean : criticalLoad;

  // When synced, derive load levels from context moments
  useEffect(() => {
    if (ctx.isSynced) {
      const mean = ctx.loadMean;
      const stdDev = Math.sqrt(ctx.loadVariance);
      const newLevels: LoadLevel[] = [
        { load: Math.max(1, mean - 1.5 * stdDev), probability: 0.15 },
        { load: Math.max(1, mean - 0.5 * stdDev), probability: 0.35 },
        { load: mean + 0.5 * stdDev, probability: 0.35 },
        { load: mean + 1.5 * stdDev, probability: 0.15 },
      ];
      setLoadLevels(newLevels);
    }
  }, [ctx.isSynced, ctx.loadMean, ctx.loadVariance]);

  // Normalize probabilities
  const normalizedLevels = useMemo(() => {
    const totalProb = loadLevels.reduce((sum, l) => sum + l.probability, 0);
    return loadLevels.map(l => ({
      ...l,
      probability: l.probability / totalProb
    }));
  }, [loadLevels]);

  // Calculate statistical moments based on Meza (2025) paper
  const moments: StatisticalMoments = useMemo(() => {
    // First moment: Mean (Eq. 5 in paper)
    const mean = normalizedLevels.reduce((sum, l) => sum + l.load * l.probability, 0);
    
    // Second central moment: Variance (Eq. 6)
    const variance = normalizedLevels.reduce(
      (sum, l) => sum + l.probability * Math.pow(l.load - mean, 2), 
      0
    );
    const stdDev = Math.sqrt(variance);
    
    // Third central moment: Skewness (Eq. 8)
    const m3 = normalizedLevels.reduce(
      (sum, l) => sum + l.probability * Math.pow(l.load - mean, 3), 
      0
    );
    const skewness = m3 / Math.pow(stdDev, 3);
    
    // Fourth central moment: Kurtosis (Eq. 9)
    const m4 = normalizedLevels.reduce(
      (sum, l) => sum + l.probability * Math.pow(l.load - mean, 4), 
      0
    );
    const kurtosis = m4 / Math.pow(variance, 2);
    
    // Moment variance for beam (Eq. 7): Var(M) = L²/8 × Var(w)
    const momentVariance = (Math.pow(beamLength, 2) / 8) * variance;
    
    return { mean, variance, stdDev, skewness, kurtosis, momentVariance };
  }, [normalizedLevels, beamLength]);

  // Push local moments back to context when NOT synced (bidirectional sync)
  useEffect(() => {
    if (!ctx.isSynced) {
      ctx.setLoadMean(moments.mean);
      ctx.setLoadVariance(moments.variance);
      ctx.setLoadSkewness(moments.skewness);
      ctx.setLoadKurtosis(moments.kurtosis);
    }
  }, [moments, ctx.isSynced]);
  const reliability = useMemo(() => {
    const totalLoad = moments.mean * beamLength; // kN (total load on beam)
    const loadStdDev = moments.stdDev * beamLength;
    const beta = (criticalLoad - totalLoad) / loadStdDev;
    const pf = normalCDF(-beta);
    return { totalLoad, loadStdDev, beta, pf };
  }, [moments, beamLength, criticalLoad]);

  // Polynomial Chaos Expansion (PCE) for uncertainty propagation
  const pceResults = useMemo(() => {
    // Define response function: bending moment as function of normalized load uncertainty
    // M = wL²/8, where w = mean + stdDev * xi (xi is standard normal)
    const responseFunction = (xi: number): number => {
      const w = moments.mean + moments.stdDev * xi;
      return (w * Math.pow(beamLength, 2)) / 8; // Maximum bending moment
    };
    
    // Compute PCE coefficients
    const coefficients = computePCECoefficients(responseFunction, pceOrder, 5);
    
    // Get statistics from PCE
    const stats = pceStatistics(coefficients);
    
    // Generate response surface
    const responseSurface = generatePCEResponseSurface(coefficients, 80);
    
    // Monte Carlo validation
    const mcValidation = pceMonteCarlo(coefficients, 5000);
    
    // Sensitivity indices
    const sensitivity = pceSensitivityIndices(coefficients);
    
    // Generate histogram from MC samples
    const histogramBins = 30;
    const minVal = Math.min(...mcValidation.samples);
    const maxVal = Math.max(...mcValidation.samples);
    const binWidth = (maxVal - minVal) / histogramBins;
    const histogram: { bin: number; count: number; density: number }[] = [];
    
    for (let i = 0; i < histogramBins; i++) {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = mcValidation.samples.filter(s => s >= binStart && s < binEnd).length;
      histogram.push({
        bin: binStart + binWidth / 2,
        count,
        density: count / (mcValidation.samples.length * binWidth)
      });
    }
    
    // Hermite polynomial basis visualization
    const basisData: { xi: number; H0: number; H1: number; H2: number; H3: number; H4: number }[] = [];
    for (let i = 0; i <= 60; i++) {
      const xi = -3 + (6 * i) / 60;
      basisData.push({
        xi,
        H0: hermitePolynomial(0, xi),
        H1: hermitePolynomial(1, xi),
        H2: hermitePolynomial(2, xi),
        H3: hermitePolynomial(3, xi),
        H4: hermitePolynomial(4, xi)
      });
    }
    
    return {
      coefficients,
      stats,
      responseSurface,
      mcValidation,
      sensitivity,
      histogram,
      basisData
    };
  }, [moments, beamLength, pceOrder]);

  // Multi-dimensional PCE for multiple uncertain inputs
  const multiDimPCEResults = useMemo(() => {
    const dim = multiDimInputs.length;
    const maxOrder = Math.min(pceOrder, 3); // Limit order for multi-dim
    
    // Response function: deflection δ = wL⁴/(8EI) considering all uncertainties
    // xi = [ξ_w, ξ_E, ξ_I] are standard normal variables
    const responseFunction = (xi: number[]): number => {
      const w = multiDimInputs[0].mean + multiDimInputs[0].stdDev * xi[0]; // Load (kN/m)
      const E = multiDimInputs[1].mean + multiDimInputs[1].stdDev * xi[1]; // Modulus (GPa)
      const I = multiDimInputs[2].mean + multiDimInputs[2].stdDev * xi[2]; // Inertia (cm⁴)
      
      // Convert units: E to kN/m², I to m⁴
      const E_kNm2 = E * 1e6; // GPa to kN/m²
      const I_m4 = I * 1e-8; // cm⁴ to m⁴
      
      // Maximum deflection for simply supported beam with UDL
      const delta = (5 * w * Math.pow(beamLength, 4)) / (384 * E_kNm2 * I_m4);
      return delta * 1000; // Convert to mm
    };
    
    // Compute multi-dim PCE
    const { coefficients, multiIndices } = computeMultiDimPCECoefficients(
      responseFunction,
      dim,
      maxOrder,
      4 // Reduced quad order for performance
    );
    
    // Statistics
    const stats = multiDimPCEStatistics(coefficients, multiIndices);
    
    // Sobol indices
    const sobol = multiDimSobolIndices(coefficients, multiIndices, dim);
    
    // Monte Carlo validation
    const mcValidation = multiDimPCEMonteCarlo(coefficients, multiIndices, dim, 3000);
    
    // 2D response surface (fixing third variable at mean)
    const surface2D = generate2DResponseSurface(coefficients, multiIndices, 20);
    
    // Format coefficients for display
    const coeffDisplay = multiIndices.map((mi, idx) => ({
      index: mi.indices.join(','),
      order: mi.totalOrder,
      value: coefficients[idx],
      label: `c_{${mi.indices.join(',')}}`
    })).slice(0, 15); // Limit display
    
    // Generate histogram
    const histogramBins = 25;
    const minVal = Math.min(...mcValidation.samples);
    const maxVal = Math.max(...mcValidation.samples);
    const binWidth = (maxVal - minVal) / histogramBins;
    const histogram: { bin: number; count: number }[] = [];
    
    for (let i = 0; i < histogramBins; i++) {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = mcValidation.samples.filter(s => s >= binStart && s < binEnd).length;
      histogram.push({ bin: binStart + binWidth / 2, count });
    }
    
    return {
      coefficients,
      multiIndices,
      stats,
      sobol,
      mcValidation,
      surface2D,
      coeffDisplay,
      histogram,
      dim
    };
  }, [multiDimInputs, beamLength, pceOrder]);

  // Adaptive PCE with cross-validation order selection
  const adaptivePCEResults = useMemo(() => {
    const dim = multiDimInputs.length;
    
    // Response function: deflection δ = 5wL⁴/(384EI)
    const responseFunction = (xi: number[]): number => {
      const w = multiDimInputs[0].mean + multiDimInputs[0].stdDev * xi[0];
      const E = multiDimInputs[1].mean + multiDimInputs[1].stdDev * xi[1];
      const I = multiDimInputs[2].mean + multiDimInputs[2].stdDev * xi[2];
      
      const E_kNm2 = E * 1e6;
      const I_m4 = I * 1e-8;
      
      const delta = (5 * w * Math.pow(beamLength, 4)) / (384 * E_kNm2 * I_m4);
      return delta * 1000; // mm
    };
    
    // Run adaptive or sparse adaptive PCE
    const result = useSparse 
      ? sparseAdaptivePCE(responseFunction, dim, adaptiveMaxOrder, 0.01)
      : adaptivePCE(responseFunction, dim, adaptiveMaxOrder, 1, 0.01, false);
    
    // Get term importance
    const termImportance = pceTermImportance(result.coefficients, result.multiIndices);
    
    // Monte Carlo validation
    const mcValidation = multiDimPCEMonteCarlo(result.coefficients, result.multiIndices, dim, 3000);
    
    // Generate histogram from MC samples
    const histogramBins = 25;
    const minVal = Math.min(...mcValidation.samples);
    const maxVal = Math.max(...mcValidation.samples);
    const binWidth = (maxVal - minVal) / histogramBins;
    const histogram: { bin: number; count: number }[] = [];
    
    for (let i = 0; i < histogramBins; i++) {
      const binStart = minVal + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = mcValidation.samples.filter(s => s >= binStart && s < binEnd).length;
      histogram.push({ bin: binStart + binWidth / 2, count });
    }
    
    // Format coefficients for display
    const coeffDisplay = result.multiIndices.map((mi, idx) => ({
      index: mi.indices.join(','),
      order: mi.totalOrder,
      value: result.coefficients[idx],
    })).slice(0, 12);
    
    // Compute confidence intervals
    const bootstrapCI = computePCEBootstrapCI(
      result.coefficients, 
      result.multiIndices, 
      dim, 
      300, // numBootstrap
      150, // samplesPerBootstrap
      confidenceLevel
    );
    
    // Analytical CI (using effective quadrature points)
    const numQuadPoints = Math.pow(5, dim); // Tensor product quadrature
    const analyticalCI = computePCEAnalyticalCI(
      result.coefficients,
      result.multiIndices,
      numQuadPoints,
      confidenceLevel
    );
    
    return {
      ...result,
      termImportance,
      mcValidation,
      histogram,
      coeffDisplay,
      dim,
      bootstrapCI,
      analyticalCI
    };
  }, [multiDimInputs, beamLength, adaptiveMaxOrder, useSparse, confidenceLevel]);

  // Generate PDF visualization data
  const pdfData = useMemo(() => {
    const points: { x: number; pdf: number; cdf: number }[] = [];
    const minLoad = Math.min(...normalizedLevels.map(l => l.load)) - 5;
    const maxLoad = Math.max(...normalizedLevels.map(l => l.load)) + 5;
    
    for (let x = minLoad; x <= maxLoad; x += 0.5) {
      // Approximate continuous PDF using normal kernel density estimation
      let pdf = 0;
      const h = moments.stdDev * 0.5; // bandwidth
      normalizedLevels.forEach(l => {
        pdf += l.probability * Math.exp(-Math.pow(x - l.load, 2) / (2 * h * h)) / (h * Math.sqrt(2 * Math.PI));
      });
      
      // CDF approximation
      let cdf = 0;
      normalizedLevels.forEach(l => {
        if (x >= l.load) cdf += l.probability;
      });
      
      points.push({ x, pdf: pdf * 10, cdf });
    }
    return points;
  }, [normalizedLevels, moments]);

  // Bar chart data for discrete probabilities
  const discreteData = normalizedLevels.map(l => ({
    load: `${l.load} kN/m`,
    probability: l.probability,
    contribution: l.probability * l.load
  }));

  const addLoadLevel = () => {
    const maxLoad = Math.max(...loadLevels.map(l => l.load));
    setLoadLevels([...loadLevels, { load: maxLoad + 5, probability: 0.1 }]);
  };

  const removeLoadLevel = (index: number) => {
    if (loadLevels.length > 2) {
      setLoadLevels(loadLevels.filter((_, i) => i !== index));
    }
  };

  const updateLoadLevel = (index: number, field: keyof LoadLevel, value: number) => {
    const updated = [...loadLevels];
    updated[index] = { ...updated[index], [field]: value };
    setLoadLevels(updated);
  };

  const getSkewnessInterpretation = () => {
    if (moments.skewness > 0.5) return { text: "Positive (heavy tail toward higher loads)", color: "text-destructive" };
    if (moments.skewness < -0.5) return { text: "Negative (heavy tail toward lower loads)", color: "text-primary" };
    return { text: "Approximately symmetric", color: "text-accent" };
  };

  const getKurtosisInterpretation = () => {
    if (moments.kurtosis > 3) return { text: "Leptokurtic (extreme events more likely)", color: "text-destructive" };
    if (moments.kurtosis < 3) return { text: "Platykurtic (extreme events less likely)", color: "text-primary" };
    return { text: "Mesokurtic (normal-like)", color: "text-accent" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-2 text-foreground">Statistical Moment Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Based on Meza (2025): Higher-order moments in probabilistic structural design connecting 
          statistical moments (variance, skewness, kurtosis) to mechanical behavior.
        </p>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Load Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Load Levels & Probabilities</label>
              <Button variant="outline" size="sm" onClick={addLoadLevel}>
                <Plus className="h-4 w-4 mr-1" /> Add Level
              </Button>
            </div>
            
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {loadLevels.map((level, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Load (kN/m)</label>
                    <Slider
                      value={[level.load]}
                      onValueChange={([v]) => updateLoadLevel(index, 'load', v)}
                      min={1}
                      max={50}
                      step={1}
                    />
                    <span className="text-xs font-mono">{level.load}</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Probability</label>
                    <Slider
                      value={[level.probability]}
                      onValueChange={([v]) => updateLoadLevel(index, 'probability', v)}
                      min={0.01}
                      max={1}
                      step={0.01}
                    />
                    <span className="text-xs font-mono">{(level.probability * 100).toFixed(0)}%</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeLoadLevel(index)}
                    disabled={loadLevels.length <= 2}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground">Beam Length L: {beamLength} m</label>
              <Slider
                value={[beamLength]}
                onValueChange={([v]) => {
                  setBeamLength(v);
                  if (ctx.isSynced) ctx.setBeamLength(v);
                }}
                min={2}
                max={20}
                step={0.5}
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground">Critical Load P<sub>cr</sub>: {criticalLoad} kN</label>
              <Slider
                value={[criticalLoad]}
                onValueChange={([v]) => {
                  setCriticalLoad(v);
                  if (ctx.isSynced) ctx.setResistanceMean(v);
                }}
                min={100}
                max={1000}
                step={10}
              />
            </div>
          </div>
          
          {/* Probability Distribution */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Discrete Probability Distribution</label>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={discreteData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                <XAxis dataKey="load" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => [(value * 100).toFixed(1) + '%', 'Probability']}
                />
                <Bar dataKey="probability" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Statistical Moments Results */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Statistical Moments (Meza 2025)
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Mean */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="text-xs text-muted-foreground">Mean (M₁)</div>
            <div className="text-lg font-bold font-mono text-primary">{moments.mean.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">kN/m</div>
            <div className="text-[10px] mt-1 text-muted-foreground">E[w] = Σpᵢwᵢ</div>
          </div>
          
          {/* Variance */}
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
            <div className="text-xs text-muted-foreground">Variance (M₂)</div>
            <div className="text-lg font-bold font-mono text-accent">{moments.variance.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">(kN/m)²</div>
            <div className="text-[10px] mt-1 text-muted-foreground">σ² = Σpᵢ(wᵢ-μ)²</div>
          </div>
          
          {/* Std Dev */}
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Std. Deviation</div>
            <div className="text-lg font-bold font-mono text-foreground">{moments.stdDev.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">kN/m</div>
            <div className="text-[10px] mt-1 text-muted-foreground">σ = √Var</div>
          </div>
          
          {/* Skewness */}
          <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/30">
            <div className="text-xs text-muted-foreground">Skewness (M₃)</div>
            <div className={`text-lg font-bold font-mono ${getSkewnessInterpretation().color}`}>
              {moments.skewness.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">dimensionless</div>
            <div className="text-[10px] mt-1 text-muted-foreground">γ₁ = M₃/σ³</div>
          </div>
          
          {/* Kurtosis */}
          <div className="p-4 rounded-lg bg-chart-4/10 border border-chart-4/30">
            <div className="text-xs text-muted-foreground">Kurtosis (M₄)</div>
            <div className={`text-lg font-bold font-mono ${getKurtosisInterpretation().color}`}>
              {moments.kurtosis.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">dimensionless</div>
            <div className="text-[10px] mt-1 text-muted-foreground">γ₂ = M₄/σ⁴</div>
          </div>
          
          {/* Moment Variance */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="text-xs text-muted-foreground">Moment Var</div>
            <div className="text-lg font-bold font-mono text-destructive">{moments.momentVariance.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">(kN·m)²</div>
            <div className="text-[10px] mt-1 text-muted-foreground">Var(M) = L²σ²/8</div>
          </div>
        </div>
        
        {/* Interpretations */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="p-3 rounded bg-muted/30">
            <span className="text-sm font-medium">Skewness Interpretation:</span>
            <span className={`ml-2 text-sm ${getSkewnessInterpretation().color}`}>
              {getSkewnessInterpretation().text}
            </span>
          </div>
          <div className="p-3 rounded bg-muted/30">
            <span className="text-sm font-medium">Kurtosis Interpretation:</span>
            <span className={`ml-2 text-sm ${getKurtosisInterpretation().color}`}>
              {getKurtosisInterpretation().text}
            </span>
          </div>
        </div>
      </div>

      {/* Mechanical Equivalence */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Rigidized Moment Equivalence</h3>
        <p className="text-sm text-muted-foreground mb-4">
          When load distribution w(x) is normalized as probability density f(x) = w(x)/W, 
          statistical and mechanical moments become equivalent.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <div className="text-sm font-semibold text-primary mb-2">Variance ↔ Moment of Inertia</div>
            <div className="font-mono text-xs text-foreground">I = ∫(x-x̄)² w(x) dx</div>
            <p className="text-xs text-muted-foreground mt-2">
              Governs natural frequencies and beam stiffness
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <div className="text-sm font-semibold text-accent mb-2">Skewness ↔ Asymmetric Effects</div>
            <div className="font-mono text-xs text-foreground">M₃ = ∫(x-x̄)³ w(x) dx</div>
            <p className="text-xs text-muted-foreground mt-2">
              Induces asymmetric vibrations and torsional effects
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <div className="text-sm font-semibold text-destructive mb-2">Kurtosis ↔ Extreme Loads</div>
            <div className="font-mono text-xs text-foreground">M₄ = ∫(x-x̄)⁴ w(x) dx</div>
            <p className="text-xs text-muted-foreground mt-2">
              Identifies extreme load concentrations and failure zones
            </p>
          </div>
        </div>
      </div>

      {/* Polynomial Chaos Expansion */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sigma className="h-5 w-5" />
            Polynomial Chaos Expansion (PCE)
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Order p:</label>
              <Select value={pceOrder.toString()} onValueChange={(v) => setPceOrder(parseInt(v))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map(o => (
                    <SelectItem key={o} value={o.toString()}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant={showPCE ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowPCE(!showPCE)}
            >
              {showPCE ? "Hide Details" : "Show Details"}
            </Button>
          </div>
        </div>

        <Tabs value={pceDimension} onValueChange={(v) => setPceDimension(v as "1d" | "multi" | "adaptive")} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="1d" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Single Input (1D)
            </TabsTrigger>
            <TabsTrigger value="multi" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Multi-Dimensional
            </TabsTrigger>
            <TabsTrigger value="adaptive" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Adaptive PCE
            </TabsTrigger>
          </TabsList>

          {/* 1D PCE Tab */}
          <TabsContent value="1d">
            <p className="text-sm text-muted-foreground mb-4">
              PCE represents the response M(ξ) as a sum of orthogonal Hermite polynomials: 
              <span className="font-mono"> M(ξ) = Σ cₚHₚ(ξ)</span>, enabling efficient uncertainty propagation.
            </p>

            {/* PCE Coefficients */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {pceResults.coefficients.map((coeff, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border ${idx === 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/20 border-border'}`}
                >
                  <div className="text-xs text-muted-foreground">c₍{idx}₎</div>
                  <div className="text-sm font-bold font-mono text-foreground">{coeff.toFixed(3)}</div>
                  <div className="text-[10px] text-muted-foreground">H₍{idx}₎ term</div>
                </div>
              ))}
            </div>

            {showPCE && (
              <>
                {/* PCE Statistics vs Direct Calculation */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      PCE Statistics (Analytical)
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-primary/10 border border-primary/30">
                        <div className="text-xs text-muted-foreground">Mean (c₀)</div>
                        <div className="text-lg font-bold font-mono text-primary">{pceResults.stats.mean.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">kN·m</div>
                      </div>
                      <div className="p-3 rounded bg-accent/10 border border-accent/30">
                        <div className="text-xs text-muted-foreground">Std Dev</div>
                        <div className="text-lg font-bold font-mono text-accent">{pceResults.stats.stdDev.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">kN·m</div>
                      </div>
                      <div className="p-3 rounded bg-muted/30">
                        <div className="text-xs text-muted-foreground">Variance</div>
                        <div className="text-sm font-bold font-mono">{pceResults.stats.variance.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">(kN·m)²</div>
                      </div>
                      <div className="p-3 rounded bg-muted/30">
                        <div className="text-xs text-muted-foreground">CoV</div>
                        <div className="text-sm font-bold font-mono">
                          {((pceResults.stats.stdDev / pceResults.stats.mean) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Monte Carlo Validation (N=5000)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-chart-2/10 border border-chart-2/30">
                        <div className="text-xs text-muted-foreground">MC Mean</div>
                        <div className="text-lg font-bold font-mono">{pceResults.mcValidation.mean.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">kN·m</div>
                      </div>
                      <div className="p-3 rounded bg-chart-4/10 border border-chart-4/30">
                        <div className="text-xs text-muted-foreground">MC Std Dev</div>
                        <div className="text-lg font-bold font-mono">{Math.sqrt(pceResults.mcValidation.variance).toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">kN·m</div>
                      </div>
                      <div className="p-3 rounded bg-muted/30 col-span-2">
                        <div className="text-xs text-muted-foreground">Mean Error</div>
                        <div className="text-sm font-bold font-mono">
                          {Math.abs(pceResults.stats.mean - pceResults.mcValidation.mean).toFixed(4)} kN·m
                          ({(Math.abs(pceResults.stats.mean - pceResults.mcValidation.mean) / pceResults.mcValidation.mean * 100).toFixed(3)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visualizations */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Response Surface */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Response Surface M(ξ)</label>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={pceResults.responseSurface}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis 
                          dataKey="xi" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'ξ (std normal)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'M (kN·m)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [value.toFixed(2) + ' kN·m', 'Moment']}
                        />
                        <ReferenceLine y={pceResults.stats.mean} stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                        <Line 
                          type="monotone" 
                          dataKey="response" 
                          stroke="hsl(var(--accent))" 
                          dot={false}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Output Distribution Histogram */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Output Distribution (MC Samples)</label>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={pceResults.histogram}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis 
                          dataKey="bin" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => v.toFixed(0)}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number, name: string) => [
                            name === 'count' ? value : value.toFixed(4),
                            name === 'count' ? 'Count' : 'Density'
                          ]}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hermite Polynomial Basis */}
                <div className="mt-6">
                  <label className="text-sm font-medium text-foreground mb-2 block">Hermite Polynomial Basis Functions</label>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={pceResults.basisData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                      <XAxis 
                        dataKey="xi" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        domain={[-10, 10]}
                      />
                      <Tooltip 
                        contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="H0" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} name="H₀" />
                      <Line type="monotone" dataKey="H1" stroke="hsl(var(--accent))" dot={false} strokeWidth={2} name="H₁" />
                      <Line type="monotone" dataKey="H2" stroke="hsl(var(--chart-2))" dot={false} strokeWidth={2} name="H₂" />
                      <Line type="monotone" dataKey="H3" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2} name="H₃" />
                      <Line type="monotone" dataKey="H4" stroke="hsl(var(--chart-4))" dot={false} strokeWidth={2} name="H₄" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Sensitivity Indices */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Variance Contribution by Polynomial Order</h4>
                  <div className="flex gap-2 flex-wrap">
                    {pceResults.sensitivity.map((s, idx) => (
                      <div 
                        key={idx}
                        className="px-3 py-2 rounded bg-muted/30 border border-border"
                        style={{ 
                          background: `linear-gradient(90deg, hsl(var(--primary) / ${Math.min(s * 100, 100)}%) 0%, transparent 100%)` 
                        }}
                      >
                        <span className="text-xs text-muted-foreground">H₍{idx + 1}₎:</span>
                        <span className="ml-1 text-sm font-mono font-bold">{(s * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Shows contribution of each polynomial term to total output variance. Higher-order terms capture nonlinearity.
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Multi-Dimensional PCE Tab */}
          <TabsContent value="multi">
            <p className="text-sm text-muted-foreground mb-4">
              Multi-dimensional PCE with tensor-product Hermite polynomials: 
              <span className="font-mono"> Y(ξ) = Σ c<sub>α</sub>Ψ<sub>α</sub>(ξ)</span>, where α is a multi-index.
              Response: beam deflection δ = 5wL⁴/(384EI) with uncertain load, modulus, and inertia.
            </p>

            {/* Input Variables Configuration */}
            <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Uncertain Input Variables ({multiDimInputs.length}D)
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                {multiDimInputs.map((input, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-xs font-medium text-foreground">{input.name}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Mean</label>
                        <div className="flex items-center gap-1">
                          <Slider
                            value={[input.mean]}
                            onValueChange={([v]) => {
                              const updated = [...multiDimInputs];
                              updated[idx] = { ...updated[idx], mean: v };
                              setMultiDimInputs(updated);
                            }}
                            min={idx === 0 ? 1 : idx === 1 ? 100 : 2000}
                            max={idx === 0 ? 30 : idx === 1 ? 300 : 15000}
                            step={idx === 0 ? 0.5 : idx === 1 ? 5 : 100}
                            className="flex-1"
                          />
                          <span className="text-xs font-mono w-14 text-right">{input.mean}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Std Dev</label>
                        <div className="flex items-center gap-1">
                          <Slider
                            value={[input.stdDev]}
                            onValueChange={([v]) => {
                              const updated = [...multiDimInputs];
                              updated[idx] = { ...updated[idx], stdDev: v };
                              setMultiDimInputs(updated);
                            }}
                            min={idx === 0 ? 0.5 : idx === 1 ? 5 : 100}
                            max={idx === 0 ? 10 : idx === 1 ? 50 : 2000}
                            step={idx === 0 ? 0.1 : idx === 1 ? 1 : 50}
                            className="flex-1"
                          />
                          <span className="text-xs font-mono w-14 text-right">{input.stdDev}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      CoV: {((input.stdDev / input.mean) * 100).toFixed(1)}% | Unit: {input.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-dim PCE Coefficients */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">PCE Coefficients (showing first 15 terms)</h4>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                {multiDimPCEResults.coeffDisplay.map((c, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 rounded border text-center ${c.order === 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/20 border-border'}`}
                  >
                    <div className="text-[10px] text-muted-foreground">α=({c.index})</div>
                    <div className="text-xs font-bold font-mono">{c.value.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total terms: {multiDimPCEResults.multiIndices.length} | Multi-index α = (α₁, α₂, α₃) for (w, E, I)
              </p>
            </div>

            {showPCE && (
              <>
                {/* Statistics and Sobol Indices */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Output Statistics (Deflection δ)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-primary/10 border border-primary/30">
                        <div className="text-xs text-muted-foreground">Mean</div>
                        <div className="text-lg font-bold font-mono text-primary">{multiDimPCEResults.stats.mean.toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                      <div className="p-3 rounded bg-accent/10 border border-accent/30">
                        <div className="text-xs text-muted-foreground">Std Dev</div>
                        <div className="text-lg font-bold font-mono text-accent">{multiDimPCEResults.stats.stdDev.toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                      <div className="p-3 rounded bg-chart-2/10 border border-chart-2/30">
                        <div className="text-xs text-muted-foreground">MC Mean</div>
                        <div className="text-sm font-bold font-mono">{multiDimPCEResults.mcValidation.mean.toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                      <div className="p-3 rounded bg-chart-4/10 border border-chart-4/30">
                        <div className="text-xs text-muted-foreground">MC Std Dev</div>
                        <div className="text-sm font-bold font-mono">{Math.sqrt(multiDimPCEResults.mcValidation.variance).toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                    </div>
                  </div>

                  {/* Sobol Sensitivity Indices */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Sobol Sensitivity Indices</h4>
                    <div className="space-y-3">
                      {multiDimInputs.map((input, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{input.name}</span>
                            <span className="font-mono">
                              S₁: {(multiDimPCEResults.sobol.firstOrder[idx] * 100).toFixed(1)}% | 
                              Sₜ: {(multiDimPCEResults.sobol.totalOrder[idx] * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-4 bg-muted/30 rounded overflow-hidden flex">
                            <div 
                              className="h-full bg-primary/70"
                              style={{ width: `${multiDimPCEResults.sobol.firstOrder[idx] * 100}%` }}
                            />
                            <div 
                              className="h-full bg-accent/50"
                              style={{ width: `${(multiDimPCEResults.sobol.totalOrder[idx] - multiDimPCEResults.sobol.firstOrder[idx]) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      S₁ = First-order (main effect) | Sₜ = Total order (includes interactions)
                    </p>
                  </div>
                </div>

                {/* 2D Response Surface and Histogram */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 2D Response Surface as Scatter with color */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      2D Response Surface (ξ₁ vs ξ₂, ξ₃=0)
                    </label>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis 
                          type="number" 
                          dataKey="xi1" 
                          name="ξ₁" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'ξ₁ (Load)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="xi2" 
                          name="ξ₂"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'ξ₂ (E)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <ZAxis type="number" dataKey="response" range={[20, 200]} name="δ" />
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number, name: string) => [value.toFixed(3), name === 'response' ? 'δ (mm)' : name]}
                        />
                        <Scatter data={multiDimPCEResults.surface2D} fill="hsl(var(--primary))">
                          {multiDimPCEResults.surface2D.map((entry, index) => {
                            const normalized = (entry.response - multiDimPCEResults.stats.mean) / (multiDimPCEResults.stats.stdDev * 3);
                            const hue = Math.max(0, Math.min(120, 60 - normalized * 60));
                            return <Cell key={index} fill={`hsl(${hue}, 70%, 50%)`} />;
                          })}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Output Histogram */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Output Distribution (MC Samples)</label>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={multiDimPCEResults.histogram}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis 
                          dataKey="bin" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => v.toFixed(1)}
                          label={{ value: 'δ (mm)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [value, 'Count']}
                        />
                        <ReferenceLine x={multiDimPCEResults.stats.mean} stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                        <Bar dataKey="count" fill="hsl(var(--accent))" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Interpretation */}
                <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border">
                  <h4 className="text-sm font-semibold mb-2">Interpretation</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <strong className="text-foreground">Dominant Uncertainty:</strong>{' '}
                      {multiDimInputs[multiDimPCEResults.sobol.totalOrder.indexOf(Math.max(...multiDimPCEResults.sobol.totalOrder))].name}{' '}
                      contributes {(Math.max(...multiDimPCEResults.sobol.totalOrder) * 100).toFixed(1)}% to output variance.
                    </div>
                    <div>
                      <strong className="text-foreground">Interaction Effects:</strong>{' '}
                      {((1 - multiDimPCEResults.sobol.firstOrder.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}% of variance 
                      comes from parameter interactions.
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Adaptive PCE Tab */}
          <TabsContent value="adaptive">
            <p className="text-sm text-muted-foreground mb-4">
              Adaptive PCE automatically selects the optimal polynomial order using Leave-One-Out Cross-Validation (LOO-CV). 
              The Q² coefficient measures predictive accuracy, with higher values indicating better generalization.
            </p>

            {/* Configuration */}
            <div className="mb-6 p-4 rounded-lg bg-muted/20 border border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Adaptive Configuration
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Max Polynomial Order</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[adaptiveMaxOrder]}
                      onValueChange={([v]) => setAdaptiveMaxOrder(v)}
                      min={2}
                      max={8}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-8">{adaptiveMaxOrder}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useSparse"
                    checked={useSparse}
                    onChange={(e) => setUseSparse(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <label htmlFor="useSparse" className="text-xs text-muted-foreground">
                    Use Sparse PCE (truncate small coefficients)
                  </label>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Confidence Level</label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[confidenceLevel * 100]}
                      onValueChange={([v]) => setConfidenceLevel(v / 100)}
                      min={80}
                      max={99}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-10">{(confidenceLevel * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Inputs:</strong> Load, Modulus, Inertia | 
                <strong className="text-foreground ml-2">Output:</strong> Beam deflection δ (mm)
              </div>
            </div>

            {/* Optimal Order Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Cross-Validation Order Selection</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="text-xs text-muted-foreground">Optimal Polynomial Order</div>
                  <div className="text-3xl font-bold font-mono text-primary">{adaptivePCEResults.optimalOrder}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Selected from orders 1 to {adaptiveMaxOrder}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">CV Error by Order</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={adaptivePCEResults.cvErrors}>
                      <XAxis dataKey="order" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number, name: string) => [
                          name === 'error' ? value.toFixed(4) : (value * 100).toFixed(1) + '%',
                          name === 'error' ? 'LOO-CV Error' : 'Q²'
                        ]}
                      />
                      <Bar dataKey="q2" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]}>
                        {adaptivePCEResults.cvErrors.map((entry, index) => (
                          <Cell 
                            key={index} 
                            fill={entry.order === adaptivePCEResults.optimalOrder 
                              ? 'hsl(var(--accent))' 
                              : 'hsl(var(--primary))'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Q² Values Table */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Q² Coefficient by Order</h4>
              <div className="flex flex-wrap gap-2">
                {adaptivePCEResults.cvErrors.map((cv) => (
                  <div 
                    key={cv.order}
                    className={`px-3 py-2 rounded-lg border ${
                      cv.order === adaptivePCEResults.optimalOrder 
                        ? 'bg-accent/20 border-accent' 
                        : 'bg-muted/20 border-border'
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">p = {cv.order}</div>
                    <div className="text-sm font-bold font-mono">{(cv.q2 * 100).toFixed(2)}%</div>
                    <div className="text-[10px] text-muted-foreground">ε = {cv.error.toFixed(4)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Q² = 1 - (SS_res / SS_tot). Higher Q² indicates better predictive accuracy. 
                Optimal order balances accuracy and model complexity.
              </p>
            </div>

            {showPCE && (
              <>
                {/* PCE Coefficients */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3">
                    Optimal PCE Coefficients 
                    {useSparse && <span className="text-accent ml-2">(Sparse: {adaptivePCEResults.coefficients.length} terms)</span>}
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {adaptivePCEResults.coeffDisplay.map((c, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded border text-center ${c.order === 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/20 border-border'}`}
                      >
                        <div className="text-[10px] text-muted-foreground">α=({c.index})</div>
                        <div className="text-xs font-bold font-mono">{c.value.toFixed(3)}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total PCE terms: {adaptivePCEResults.multiIndices.length}
                    {useSparse && ` (reduced from full expansion)`}
                  </p>
                </div>

                {/* Statistics and Term Importance */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Output Statistics (Deflection δ)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-primary/10 border border-primary/30">
                        <div className="text-xs text-muted-foreground">PCE Mean</div>
                        <div className="text-lg font-bold font-mono text-primary">{adaptivePCEResults.stats.mean.toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                      <div className="p-3 rounded bg-accent/10 border border-accent/30">
                        <div className="text-xs text-muted-foreground">PCE Std Dev</div>
                        <div className="text-lg font-bold font-mono text-accent">{adaptivePCEResults.stats.stdDev.toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                      <div className="p-3 rounded bg-chart-2/10 border border-chart-2/30">
                        <div className="text-xs text-muted-foreground">MC Mean</div>
                        <div className="text-sm font-bold font-mono">{adaptivePCEResults.mcValidation.mean.toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                      <div className="p-3 rounded bg-chart-4/10 border border-chart-4/30">
                        <div className="text-xs text-muted-foreground">MC Std Dev</div>
                        <div className="text-sm font-bold font-mono">{Math.sqrt(adaptivePCEResults.mcValidation.variance).toFixed(3)}</div>
                        <div className="text-[10px] text-muted-foreground">mm</div>
                      </div>
                    </div>
                  </div>

                  {/* Term Importance */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Top Contributing Terms</h4>
                    <div className="space-y-2">
                      {adaptivePCEResults.termImportance.slice(0, 5).map((term, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-16">α={term.index}</span>
                          <div className="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(term.importance * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono w-14 text-right">{(term.importance * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contribution to total output variance by polynomial term
                    </p>
                  </div>
                </div>

                {/* Confidence Intervals Section */}
                <div className="mb-6 p-4 rounded-lg bg-muted/10 border border-border">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    📊 {(confidenceLevel * 100).toFixed(0)}% Confidence Intervals (Bootstrap)
                  </h4>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Mean CI */}
                    <div className="p-3 rounded bg-primary/10 border border-primary/30">
                      <div className="text-xs text-muted-foreground">Mean</div>
                      <div className="text-lg font-bold font-mono text-primary">
                        {adaptivePCEResults.bootstrapCI.mean.value.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        CI: [{adaptivePCEResults.bootstrapCI.mean.lower.toFixed(3)}, {adaptivePCEResults.bootstrapCI.mean.upper.toFixed(3)}]
                      </div>
                      <div className="mt-1 h-1 bg-muted/30 rounded overflow-hidden relative">
                        <div 
                          className="absolute h-full bg-primary/50"
                          style={{ 
                            left: `${((adaptivePCEResults.bootstrapCI.mean.lower - adaptivePCEResults.bootstrapCI.percentiles.p5) / 
                                   (adaptivePCEResults.bootstrapCI.percentiles.p95 - adaptivePCEResults.bootstrapCI.percentiles.p5)) * 100}%`,
                            width: `${((adaptivePCEResults.bootstrapCI.mean.upper - adaptivePCEResults.bootstrapCI.mean.lower) / 
                                    (adaptivePCEResults.bootstrapCI.percentiles.p95 - adaptivePCEResults.bootstrapCI.percentiles.p5)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Std Dev CI */}
                    <div className="p-3 rounded bg-accent/10 border border-accent/30">
                      <div className="text-xs text-muted-foreground">Std Dev</div>
                      <div className="text-lg font-bold font-mono text-accent">
                        {adaptivePCEResults.bootstrapCI.stdDev.value.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        CI: [{adaptivePCEResults.bootstrapCI.stdDev.lower.toFixed(3)}, {adaptivePCEResults.bootstrapCI.stdDev.upper.toFixed(3)}]
                      </div>
                    </div>
                    
                    {/* Percentiles */}
                    <div className="p-3 rounded bg-chart-2/10 border border-chart-2/30">
                      <div className="text-xs text-muted-foreground">Output Percentiles</div>
                      <div className="text-sm font-mono mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P5:</span>
                          <span>{adaptivePCEResults.bootstrapCI.percentiles.p5.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P50:</span>
                          <span className="font-bold">{adaptivePCEResults.bootstrapCI.percentiles.p50.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P95:</span>
                          <span>{adaptivePCEResults.bootstrapCI.percentiles.p95.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytical CI */}
                    <div className="p-3 rounded bg-chart-3/10 border border-chart-3/30">
                      <div className="text-xs text-muted-foreground">Analytical CI (SE-based)</div>
                      <div className="text-sm font-mono mt-1 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SE(μ):</span>
                          <span>{adaptivePCEResults.analyticalCI.mean.se.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">μ ±:</span>
                          <span>{(adaptivePCEResults.analyticalCI.mean.upper - adaptivePCEResults.analyticalCI.mean.value).toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Prediction Bands Chart */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Prediction Bands (ξ₁ varying, others sampled)
                      </label>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={adaptivePCEResults.bootstrapCI.predictionBands}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                          <XAxis 
                            dataKey="xi" 
                            type="number"
                            domain={[-3, 3]}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            label={{ value: 'ξ₁ (Load uncertainty)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          />
                          <YAxis 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            label={{ value: 'δ (mm)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          />
                          <Tooltip 
                            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            formatter={(value: number, name: string) => [
                              value.toFixed(3) + ' mm', 
                              name === 'mean' ? 'Mean' : name === 'upper' ? 'Upper CI' : 'Lower CI'
                            ]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="upper" 
                            stroke="none" 
                            fill="hsl(var(--primary))" 
                            fillOpacity={0.2}
                            name="Upper CI"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="lower" 
                            stroke="none" 
                            fill="hsl(var(--background))" 
                            fillOpacity={1}
                            name="Lower CI"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="mean" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={false}
                            name="Mean"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="upper" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Upper CI"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="lower" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="Lower CI"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Bootstrap Distribution */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Bootstrap Mean Distribution (N={adaptivePCEResults.bootstrapCI.bootstrapMeans.length})
                      </label>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={(() => {
                          const means = [...adaptivePCEResults.bootstrapCI.bootstrapMeans].sort((a, b) => a - b);
                          const bins = 20;
                          const min = means[0];
                          const max = means[means.length - 1];
                          const binWidth = (max - min) / bins;
                          const histogram: { bin: number; count: number }[] = [];
                          for (let i = 0; i < bins; i++) {
                            const start = min + i * binWidth;
                            const end = start + binWidth;
                            const count = means.filter(m => m >= start && m < end).length;
                            histogram.push({ bin: start + binWidth / 2, count });
                          }
                          return histogram;
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                          <XAxis 
                            dataKey="bin" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(v) => v.toFixed(2)}
                          />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                            formatter={(value: number) => [value, 'Count']}
                          />
                          <ReferenceLine 
                            x={adaptivePCEResults.bootstrapCI.mean.value} 
                            stroke="hsl(var(--primary))" 
                            strokeDasharray="5 5" 
                          />
                          <ReferenceLine 
                            x={adaptivePCEResults.bootstrapCI.mean.lower} 
                            stroke="hsl(var(--destructive))" 
                            strokeDasharray="3 3" 
                          />
                          <ReferenceLine 
                            x={adaptivePCEResults.bootstrapCI.mean.upper} 
                            stroke="hsl(var(--destructive))" 
                            strokeDasharray="3 3" 
                          />
                          <Bar dataKey="count" fill="hsl(var(--chart-2))" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Blue dashed: mean | Red dashed: {(confidenceLevel * 100).toFixed(0)}% CI bounds
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Bootstrap resampling provides non-parametric confidence intervals. The prediction bands show 
                    uncertainty as the load input (ξ₁) varies while other inputs are randomly sampled.
                  </p>
                </div>

                {/* Convergence and Distribution */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Convergence History */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Statistics Convergence</label>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={adaptivePCEResults.convergenceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis 
                          dataKey="order" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'Polynomial Order', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          label={{ value: 'δ (mm)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [value.toFixed(4) + ' mm', '']}
                        />
                        <Legend wrapperStyle={{ paddingTop: 16 }} />
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
                          dataKey="stdDev" 
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          name="Std Dev"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Output Distribution */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Output Distribution (MC)</label>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={adaptivePCEResults.histogram}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis 
                          dataKey="bin" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => v.toFixed(1)}
                          label={{ value: 'δ (mm)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          formatter={(value: number) => [value, 'Count']}
                        />
                        <ReferenceLine x={adaptivePCEResults.stats.mean} stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                        <Bar dataKey="count" fill="hsl(var(--accent))" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Interpretation */}
                <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border">
                  <h4 className="text-sm font-semibold mb-2">Adaptive PCE Summary</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                    <div>
                      <strong className="text-foreground">Optimal Order:</strong> p = {adaptivePCEResults.optimalOrder} selected 
                      with Q² = {(adaptivePCEResults.cvErrors.find(c => c.order === adaptivePCEResults.optimalOrder)?.q2 || 0 * 100).toFixed(2)}%
                    </div>
                    <div>
                      <strong className="text-foreground">Model Complexity:</strong> {adaptivePCEResults.coefficients.length} terms 
                      {useSparse && ' (sparse truncation applied)'}
                    </div>
                    <div>
                      <strong className="text-foreground">Validation Error:</strong> {' '}
                      {Math.abs(adaptivePCEResults.stats.mean - adaptivePCEResults.mcValidation.mean).toFixed(4)} mm 
                      ({((Math.abs(adaptivePCEResults.stats.mean - adaptivePCEResults.mcValidation.mean) / adaptivePCEResults.mcValidation.mean) * 100).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reliability Analysis */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Reliability-Based Design (Eq. 17-18)</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="p-4 rounded-lg bg-muted/20 mb-4">
              <div className="font-mono text-sm mb-2">β = (P<sub>cr</sub> - μ<sub>P</sub>) / σ<sub>P</sub></div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Total Load μ<sub>P</sub>:</div>
                <div className="font-mono">{reliability.totalLoad.toFixed(2)} kN</div>
                <div>Load Std Dev σ<sub>P</sub>:</div>
                <div className="font-mono">{reliability.loadStdDev.toFixed(2)} kN</div>
                <div>Critical Load P<sub>cr</sub>:</div>
                <div className="font-mono">{criticalLoad} kN</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${reliability.beta >= 2 ? 'bg-primary/20 border-primary' : reliability.beta >= 1.5 ? 'bg-accent/20 border-accent' : 'bg-destructive/20 border-destructive'} border`}>
                <div className="text-xs text-muted-foreground">Reliability Index β</div>
                <div className="text-2xl font-bold font-mono">{reliability.beta.toFixed(3)}</div>
                <div className="text-xs mt-1">
                  {reliability.beta >= 3 ? "Very Safe" : reliability.beta >= 2 ? "Safe" : reliability.beta >= 1.5 ? "Marginal" : "Unsafe"}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${reliability.pf < 0.01 ? 'bg-primary/20 border-primary' : reliability.pf < 0.05 ? 'bg-accent/20 border-accent' : 'bg-destructive/20 border-destructive'} border`}>
                <div className="text-xs text-muted-foreground">Probability of Failure</div>
                <div className="text-2xl font-bold font-mono">{(reliability.pf * 100).toFixed(3)}%</div>
                <div className="text-xs mt-1">P<sub>f</sub> = Φ(-β)</div>
              </div>
            </div>
          </div>
          
          {/* Load Distribution Curve */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Load Distribution (Kernel Density)</label>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={pdfData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                <XAxis 
                  dataKey="x" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  label={{ value: 'Load (kN/m)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <ReferenceLine x={moments.mean} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: 'μ', fill: 'hsl(var(--primary))' }} />
                <Area 
                  type="monotone" 
                  dataKey="pdf" 
                  stroke="hsl(var(--accent))" 
                  fill="hsl(var(--accent))" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Design Recommendations */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Design Recommendations</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {moments.skewness > 0.5 && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/30 text-sm">
              <strong>⚠️ Positive Skewness:</strong> Heavy tail toward higher loads. Consider increased safety factors 
              and reinforcement near supports for concentrated load scenarios.
            </div>
          )}
          {moments.kurtosis > 3 && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/30 text-sm">
              <strong>⚠️ High Kurtosis:</strong> Extreme load events more likely. Design for leptokurtic distribution 
              with enhanced damping and fatigue resistance.
            </div>
          )}
          {reliability.beta < 2 && (
            <div className="p-3 rounded bg-destructive/10 border border-destructive/30 text-sm">
              <strong>⚠️ Low Reliability:</strong> β = {reliability.beta.toFixed(2)} is below typical target of 3.0. 
              Consider increasing member capacity or reducing load variability.
            </div>
          )}
          {moments.variance > 30 && (
            <div className="p-3 rounded bg-accent/10 border border-accent/30 text-sm">
              <strong>ℹ️ High Variance:</strong> Load dispersion is significant. The moment variance 
              Var(M) = {moments.momentVariance.toFixed(1)} (kN·m)² may require probabilistic design approach.
            </div>
          )}
          {reliability.beta >= 3 && moments.kurtosis <= 3 && moments.skewness < 0.5 && (
            <div className="p-3 rounded bg-primary/10 border border-primary/30 text-sm">
              <strong>✓ Stable Design:</strong> Low skewness, normal kurtosis, and adequate reliability index 
              suggest standard safety factors are appropriate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
