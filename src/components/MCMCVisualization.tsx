import { useState, useMemo, useEffect } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart, BarChart, Bar, ReferenceLine } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  generateMCMCTrace, 
  normalRandom, 
  effectiveSampleSize, 
  gelmanRubinRhat, 
  runningMean, 
  autocorrelation 
} from "@/lib/statistics";
import { Play, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react";

export function MCMCVisualization() {
  const [numSamples, setNumSamples] = useState(500);
  const [numChains, setNumChains] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [animatedSamples, setAnimatedSamples] = useState<number[]>([]);
  const [allChains, setAllChains] = useState<number[][]>([]);
  
  // Generate synthetic data
  const syntheticData = useMemo(() => {
    return Array.from({ length: 10 }, () => normalRandom(1000, 50));
  }, []);
  
  // Run MCMC for multiple chains
  const runAllChains = () => {
    const chains: number[][] = [];
    for (let c = 0; c < numChains; c++) {
      const result = generateMCMCTrace(1000, 50, 1000 + c * 50, 100, numSamples, syntheticData);
      chains.push(result.samples);
    }
    setAllChains(chains);
    return chains;
  };
  
  // Run MCMC
  const mcmcResult = useMemo(() => {
    return generateMCMCTrace(1000, 50, 1000, 100, numSamples, syntheticData);
  }, [numSamples, syntheticData]);
  
  // Animation effect
  useEffect(() => {
    if (isRunning && animatedSamples.length < mcmcResult.samples.length) {
      const timer = setTimeout(() => {
        const step = Math.min(10, mcmcResult.samples.length - animatedSamples.length);
        setAnimatedSamples(prev => [
          ...prev,
          ...mcmcResult.samples.slice(prev.length, prev.length + step)
        ]);
      }, 20);
      return () => clearTimeout(timer);
    } else if (animatedSamples.length >= mcmcResult.samples.length) {
      setIsRunning(false);
      runAllChains();
    }
  }, [isRunning, animatedSamples, mcmcResult.samples]);
  
  const traceData = animatedSamples.map((sample, i) => ({
    iteration: i,
    value: sample,
  }));
  
  // Histogram data
  const histogramData = useMemo(() => {
    if (animatedSamples.length < 10) return [];
    
    const burnIn = Math.floor(animatedSamples.length * 0.2);
    const postBurnIn = animatedSamples.slice(burnIn);
    
    const min = Math.min(...postBurnIn);
    const max = Math.max(...postBurnIn);
    const binCount = 30;
    const binWidth = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0);
    postBurnIn.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
      bins[binIndex]++;
    });
    
    return bins.map((count, i) => ({
      x: min + (i + 0.5) * binWidth,
      count: count / postBurnIn.length / binWidth,
    }));
  }, [animatedSamples]);
  
  // Convergence diagnostics
  const diagnostics = useMemo(() => {
    if (animatedSamples.length < 50) {
      return { ess: 0, rhat: 1, converged: false };
    }
    
    const burnIn = Math.floor(animatedSamples.length * 0.2);
    const postBurnIn = animatedSamples.slice(burnIn);
    const ess = effectiveSampleSize(postBurnIn);
    
    // R-hat from multiple chains
    let rhat = 1;
    if (allChains.length >= 2) {
      const postBurnInChains = allChains.map(chain => chain.slice(burnIn));
      rhat = gelmanRubinRhat(postBurnInChains);
    }
    
    const converged = rhat < 1.1 && ess > 100;
    
    return { ess, rhat, converged };
  }, [animatedSamples, allChains]);
  
  // Running mean data
  const runningMeanData = useMemo(() => {
    if (animatedSamples.length < 10) return [];
    const means = runningMean(animatedSamples);
    return means.map((mean, i) => ({ iteration: i, mean }));
  }, [animatedSamples]);
  
  // Autocorrelation data
  const acfData = useMemo(() => {
    if (animatedSamples.length < 50) return [];
    const burnIn = Math.floor(animatedSamples.length * 0.2);
    const postBurnIn = animatedSamples.slice(burnIn);
    return autocorrelation(postBurnIn, 40);
  }, [animatedSamples]);
  
  const handleStart = () => {
    setAnimatedSamples([]);
    setAllChains([]);
    setIsRunning(true);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setAnimatedSamples([]);
    setAllChains([]);
  };
  
  // Calculate posterior mean
  const posteriorMean = animatedSamples.length > 100 
    ? animatedSamples.slice(Math.floor(animatedSamples.length * 0.2)).reduce((a, b) => a + b, 0) / 
      (animatedSamples.length - Math.floor(animatedSamples.length * 0.2))
    : 0;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Metropolis-Hastings MCMC</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sampling from posterior distribution of μ with convergence diagnostics
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleStart} disabled={isRunning} variant="default" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Number of Samples: {numSamples}
            </label>
            <Slider
              value={[numSamples]}
              onValueChange={([v]) => setNumSamples(v)}
              min={100}
              max={2000}
              step={100}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Number of Chains: {numChains}
            </label>
            <Slider
              value={[numChains]}
              onValueChange={([v]) => setNumChains(v)}
              min={2}
              max={4}
              step={1}
              className="w-full"
            />
          </div>
        </div>
        
        {/* Trace Plot */}
        <div className="chart-container h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={traceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis 
                dataKey="iteration" 
                stroke="hsl(215 20% 65%)" 
                fontSize={12}
                label={{ value: 'Iteration', position: 'bottom', fill: 'hsl(215 20% 65%)' }}
              />
              <YAxis 
                stroke="hsl(215 20% 65%)" 
                fontSize={12}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(222 47% 9%)",
                  border: "1px solid hsl(217 33% 20%)",
                  borderRadius: "8px",
                  color: "hsl(210 40% 96%)",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(199 89% 48%)"
                strokeWidth={1}
                dot={false}
                animationDuration={0}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats with Diagnostics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center font-mono text-sm">
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-muted-foreground">Samples</div>
            <div className="text-lg text-foreground">{animatedSamples.length}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-muted-foreground">Acceptance Rate</div>
            <div className="text-lg text-foreground">
              {(mcmcResult.acceptanceRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <div className="text-muted-foreground">Posterior Mean</div>
            <div className="text-lg text-foreground">
              {posteriorMean.toFixed(2)}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${diagnostics.ess > 100 ? 'bg-accent/10 border border-accent/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <div className="text-muted-foreground">ESS</div>
            <div className={`text-lg ${diagnostics.ess > 100 ? 'text-accent' : 'text-destructive'}`}>
              {diagnostics.ess.toFixed(0)}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${diagnostics.rhat < 1.1 ? 'bg-accent/10 border border-accent/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <div className="text-muted-foreground">R-hat</div>
            <div className={`text-lg ${diagnostics.rhat < 1.1 ? 'text-accent' : 'text-destructive'}`}>
              {diagnostics.rhat.toFixed(3)}
            </div>
          </div>
        </div>
        
        {/* Convergence Status */}
        {animatedSamples.length > 50 && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${diagnostics.converged ? 'bg-accent/10 border border-accent/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            {diagnostics.converged ? (
              <>
                <CheckCircle className="w-4 h-4 text-accent" />
                <span className="text-sm text-accent">Chain has converged (R̂ &lt; 1.1, ESS &gt; 100)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">Chain may not have converged. Consider running longer or adjusting proposal.</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Diagnostics Tabs */}
      {animatedSamples.length > 50 && (
        <div className="glass-card p-6">
          <Tabs defaultValue="posterior" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="posterior">Posterior</TabsTrigger>
              <TabsTrigger value="running">Running Mean</TabsTrigger>
              <TabsTrigger value="acf">Autocorrelation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posterior">
              <h4 className="text-sm font-semibold mb-2 text-foreground">Posterior Distribution (after burn-in)</h4>
              <div className="chart-container h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={histogramData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                    <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12} tickFormatter={(v) => v.toFixed(0)} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                    <ReferenceLine x={posteriorMean} stroke="hsl(142 76% 36%)" strokeDasharray="5 5" />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(45 93% 47%)"
                      strokeWidth={2}
                      fill="url(#histGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            
            <TabsContent value="running">
              <h4 className="text-sm font-semibold mb-2 text-foreground">Running Mean (should stabilize)</h4>
              <div className="chart-container h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={runningMeanData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                    <XAxis dataKey="iteration" stroke="hsl(215 20% 65%)" fontSize={12} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                    />
                    <ReferenceLine y={posteriorMean} stroke="hsl(142 76% 36%)" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="mean" stroke="hsl(262 83% 58%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The running mean should stabilize around the true posterior mean. Large fluctuations indicate poor mixing.
              </p>
            </TabsContent>
            
            <TabsContent value="acf">
              <h4 className="text-sm font-semibold mb-2 text-foreground">Autocorrelation Function (should decay quickly)</h4>
              <div className="chart-container h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acfData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                    <XAxis dataKey="lag" stroke="hsl(215 20% 65%)" fontSize={12} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} domain={[-0.2, 1]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                      formatter={(value: number) => [value.toFixed(3), 'ACF']}
                    />
                    <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                    <Bar dataKey="acf" fill="hsl(199 89% 48%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ACF should decay to zero quickly. Slow decay indicates high autocorrelation and low ESS.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
