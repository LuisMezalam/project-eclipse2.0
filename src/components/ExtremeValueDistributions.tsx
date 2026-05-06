import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line } from "recharts";
import { SliderWithInput } from "@/components/SliderWithInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  generateGumbelData, 
  generateWeibullData, 
  generateFrechetData,
  gumbelCDF,
  weibullCDF,
  frechetCDF
} from "@/lib/statistics";

interface ExtremeValueProps {
  gumbelMu: number;
  gumbelBeta: number;
  weibullK: number;
  weibullLambda: number;
  frechetAlpha: number;
  frechetS: number;
  onGumbelMuChange: (v: number) => void;
  onGumbelBetaChange: (v: number) => void;
  onWeibullKChange: (v: number) => void;
  onWeibullLambdaChange: (v: number) => void;
  onFrechetAlphaChange: (v: number) => void;
  onFrechetSChange: (v: number) => void;
}

export function ExtremeValueDistributions({
  gumbelMu,
  gumbelBeta,
  weibullK,
  weibullLambda,
  frechetAlpha,
  frechetS,
  onGumbelMuChange,
  onGumbelBetaChange,
  onWeibullKChange,
  onWeibullLambdaChange,
  onFrechetAlphaChange,
  onFrechetSChange
}: ExtremeValueProps) {
  
  const gumbelData = useMemo(() => generateGumbelData(gumbelMu, gumbelBeta, 150), [gumbelMu, gumbelBeta]);
  const weibullData = useMemo(() => generateWeibullData(weibullK, weibullLambda, 150), [weibullK, weibullLambda]);
  const frechetData = useMemo(() => generateFrechetData(frechetAlpha, frechetS, 0, 150), [frechetAlpha, frechetS]);
  
  // Combined comparison data
  const comparisonData = useMemo(() => {
    const points: { x: number; gumbel: number; weibull: number; frechet: number }[] = [];
    const maxX = Math.max(gumbelMu + 5 * gumbelBeta, weibullLambda * 3, frechetS * 4);
    const step = maxX / 100;
    
    for (let x = step; x <= maxX; x += step) {
      points.push({
        x,
        gumbel: gumbelCDF(x, gumbelMu, gumbelBeta),
        weibull: weibullCDF(x, weibullK, weibullLambda),
        frechet: frechetCDF(x, frechetAlpha, frechetS)
      });
    }
    return points;
  }, [gumbelMu, gumbelBeta, weibullK, weibullLambda, frechetAlpha, frechetS]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-2 text-foreground">Extreme Value Distributions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Essential for modeling rare events: annual maximum wind speeds, peak flood levels, extreme temperatures.
        </p>
        
        <Tabs defaultValue="gumbel" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="gumbel">Gumbel (Type I)</TabsTrigger>
            <TabsTrigger value="weibull">Weibull (Type III)</TabsTrigger>
            <TabsTrigger value="frechet">Fréchet (Type II)</TabsTrigger>
          </TabsList>
          
          {/* Gumbel Distribution */}
          <TabsContent value="gumbel" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SliderWithInput label="Location μ" value={gumbelMu} onChange={onGumbelMuChange} min={0} max={20} step={0.5} precision={1} />
              <SliderWithInput label="Scale β" value={gumbelBeta} onChange={onGumbelBetaChange} min={0.5} max={5} step={0.1} precision={1} />
            </div>
            <div className="chart-container h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gumbelData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gumbelGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                  <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12} tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                    formatter={(value: number) => [value.toFixed(4), "f(x)"]}
                  />
                  <Area type="monotone" dataKey="y" stroke="hsl(45 93% 47%)" strokeWidth={2} fill="url(#gumbelGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>Use case:</strong> Annual maximum wind speeds, extreme temperatures. Unbounded upper tail.
            </div>
          </TabsContent>
          
          {/* Weibull Distribution */}
          <TabsContent value="weibull" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SliderWithInput label="Shape k" value={weibullK} onChange={onWeibullKChange} min={0.5} max={5} step={0.1} precision={1} />
              <SliderWithInput label="Scale λ" value={weibullLambda} onChange={onWeibullLambdaChange} min={1} max={10} step={0.5} precision={1} />
            </div>
            <div className="chart-container h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weibullData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weibullGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(340 82% 52%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(340 82% 52%)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                  <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12} tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                    formatter={(value: number) => [value.toFixed(4), "f(x)"]}
                  />
                  <Area type="monotone" dataKey="y" stroke="hsl(340 82% 52%)" strokeWidth={2} fill="url(#weibullGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>Use case:</strong> Material fatigue life, minimum strengths. Bounded lower tail (at zero).
            </div>
          </TabsContent>
          
          {/* Fréchet Distribution */}
          <TabsContent value="frechet" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SliderWithInput label="Shape α" value={frechetAlpha} onChange={onFrechetAlphaChange} min={1} max={10} step={0.5} precision={1} />
              <SliderWithInput label="Scale s" value={frechetS} onChange={onFrechetSChange} min={0.5} max={5} step={0.1} precision={1} />
            </div>
            <div className="chart-container h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={frechetData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="frechetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                  <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12} tickFormatter={(v) => v.toFixed(1)} />
                  <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                    formatter={(value: number) => [value.toFixed(4), "f(x)"]}
                  />
                  <Area type="monotone" dataKey="y" stroke="hsl(262 83% 58%)" strokeWidth={2} fill="url(#frechetGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground">
              <strong>Use case:</strong> Heavy-tailed maxima (financial losses, earthquake magnitudes). Power-law tail decay.
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* CDF Comparison */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">CDF Comparison</h3>
        <div className="chart-container h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={comparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12} tickFormatter={(v) => v.toFixed(1)} />
              <YAxis stroke="hsl(215 20% 65%)" fontSize={12} domain={[0, 1]} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                formatter={(value: number) => [value.toFixed(4), "F(x)"]}
              />
              <Legend />
              <Line type="monotone" dataKey="gumbel" stroke="hsl(45 93% 47%)" strokeWidth={2} dot={false} name="Gumbel" />
              <Line type="monotone" dataKey="weibull" stroke="hsl(340 82% 52%)" strokeWidth={2} dot={false} name="Weibull" />
              <Line type="monotone" dataKey="frechet" stroke="hsl(262 83% 58%)" strokeWidth={2} dot={false} name="Fréchet" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          The CDF shows how quickly each distribution approaches 1. Fréchet has the heaviest tail (slowest approach).
        </p>
      </div>
    </div>
  );
}