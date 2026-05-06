import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line, ComposedChart } from "recharts";
import { Slider } from "@/components/ui/slider";
import { normalPDF } from "@/lib/statistics";

export function BayesianInferenceViz() {
  const [priorMean, setPriorMean] = useState(1000);
  const [priorStd, setPriorStd] = useState(100);
  const [observedMean, setObservedMean] = useState(990);
  const [observedStd] = useState(50);
  const [numObservations, setNumObservations] = useState(5);
  
  // Calculate posterior parameters
  const posterior = useMemo(() => {
    const priorPrecision = 1 / (priorStd * priorStd);
    const likelihoodPrecision = numObservations / (observedStd * observedStd);
    
    const posteriorPrecision = priorPrecision + likelihoodPrecision;
    const posteriorVariance = 1 / posteriorPrecision;
    const posteriorMean = posteriorVariance * (priorPrecision * priorMean + likelihoodPrecision * observedMean);
    const posteriorStd = Math.sqrt(posteriorVariance);
    
    return { mean: posteriorMean, std: posteriorStd };
  }, [priorMean, priorStd, observedMean, observedStd, numObservations]);
  
  // Generate distribution data
  const distributionData = useMemo(() => {
    const data: { x: number; prior: number; likelihood: number; posterior: number }[] = [];
    const xMin = Math.min(priorMean, observedMean, posterior.mean) - 3 * Math.max(priorStd, observedStd, posterior.std);
    const xMax = Math.max(priorMean, observedMean, posterior.mean) + 3 * Math.max(priorStd, observedStd, posterior.std);
    const step = (xMax - xMin) / 200;
    
    for (let x = xMin; x <= xMax; x += step) {
      data.push({
        x,
        prior: normalPDF(x, priorMean, priorStd),
        likelihood: normalPDF(x, observedMean, observedStd / Math.sqrt(numObservations)),
        posterior: normalPDF(x, posterior.mean, posterior.std),
      });
    }
    return data;
  }, [priorMean, priorStd, observedMean, observedStd, numObservations, posterior]);

  return (
    <div className="glass-card p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-foreground">Bayesian Inference</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Posterior ∝ Prior × Likelihood
        </p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Prior μ₀: {priorMean}
          </label>
          <Slider
            value={[priorMean]}
            onValueChange={([v]) => setPriorMean(v)}
            min={800}
            max={1200}
            step={10}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Prior σ₀: {priorStd}
          </label>
          <Slider
            value={[priorStd]}
            onValueChange={([v]) => setPriorStd(v)}
            min={10}
            max={200}
            step={10}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Data X̄: {observedMean}
          </label>
          <Slider
            value={[observedMean]}
            onValueChange={([v]) => setObservedMean(v)}
            min={800}
            max={1200}
            step={10}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            n (samples): {numObservations}
          </label>
          <Slider
            value={[numObservations]}
            onValueChange={([v]) => setNumObservations(v)}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />
        </div>
      </div>
      
      <div className="chart-container h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={distributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(199 89% 48%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="likelihoodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(340 82% 52%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(340 82% 52%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="posteriorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
            <XAxis 
              dataKey="x" 
              stroke="hsl(215 20% 65%)" 
              fontSize={12}
              tickFormatter={(v) => v.toFixed(0)}
            />
            <YAxis 
              stroke="hsl(215 20% 65%)" 
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(222 47% 9%)",
                border: "1px solid hsl(217 33% 20%)",
                borderRadius: "8px",
                color: "hsl(210 40% 96%)",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(5),
                name === "prior" ? "Prior" : name === "likelihood" ? "Likelihood" : "Posterior"
              ]}
              labelFormatter={(label) => `μ = ${Number(label).toFixed(1)}`}
            />
            <Legend 
              wrapperStyle={{ color: "hsl(210 40% 96%)" }}
            />
            
            <Area
              type="monotone"
              dataKey="prior"
              stroke="hsl(199 89% 48%)"
              strokeWidth={2}
              fill="url(#priorGradient)"
              name="Prior"
              animationDuration={500}
            />
            <Area
              type="monotone"
              dataKey="likelihood"
              stroke="hsl(340 82% 52%)"
              strokeWidth={2}
              fill="url(#likelihoodGradient)"
              name="Likelihood"
              animationDuration={500}
            />
            <Area
              type="monotone"
              dataKey="posterior"
              stroke="hsl(45 93% 47%)"
              strokeWidth={3}
              fill="url(#posteriorGradient)"
              name="Posterior"
              animationDuration={500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(199 89% 48% / 0.15)" }}>
          <div className="text-xs text-muted-foreground">Prior</div>
          <div className="font-mono text-sm text-foreground">
            N({priorMean}, {priorStd}²)
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(340 82% 52% / 0.15)" }}>
          <div className="text-xs text-muted-foreground">Likelihood</div>
          <div className="font-mono text-sm text-foreground">
            N({observedMean}, {(observedStd / Math.sqrt(numObservations)).toFixed(1)}²)
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: "hsl(45 93% 47% / 0.15)" }}>
          <div className="text-xs text-muted-foreground">Posterior</div>
          <div className="font-mono text-sm text-foreground">
            N({posterior.mean.toFixed(1)}, {posterior.std.toFixed(1)}²)
          </div>
        </div>
      </div>
    </div>
  );
}
