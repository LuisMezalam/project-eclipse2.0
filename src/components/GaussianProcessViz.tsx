import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Scatter, ScatterChart, Line, ComposedChart, ReferenceLine } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { gpPredict } from "@/lib/statistics";
import { Plus, Trash2 } from "lucide-react";

interface DataPoint {
  x: number;
  y: number;
}

export function GaussianProcessViz() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([
    { x: 1, y: 1 },
    { x: 3, y: 2 },
    { x: 5, y: -1 },
    { x: 7, y: 0.5 },
  ]);
  const [lengthScale, setLengthScale] = useState(1.5);
  const [variance, setVariance] = useState(1);
  
  // Generate GP predictions
  const gpData = useMemo(() => {
    if (dataPoints.length === 0) return [];
    
    const xTrain = dataPoints.map(p => p.x);
    const yTrain = dataPoints.map(p => p.y);
    const xTest = Array.from({ length: 100 }, (_, i) => i * 0.1);
    
    const { mean, std } = gpPredict(xTrain, yTrain, xTest, lengthScale, variance, 0.01);
    
    return xTest.map((x, i) => ({
      x,
      mean: mean[i],
      upper: mean[i] + 2 * std[i],
      lower: mean[i] - 2 * std[i],
      std: std[i],
    }));
  }, [dataPoints, lengthScale, variance]);
  
  const handleAddPoint = () => {
    const newX = Math.random() * 9 + 0.5;
    const newY = Math.sin(newX) + (Math.random() - 0.5) * 0.5;
    setDataPoints([...dataPoints, { x: newX, y: newY }]);
  };
  
  const handleClearPoints = () => {
    setDataPoints([]);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Gaussian Process Regression</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Bayesian non-parametric function estimation with uncertainty
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddPoint} variant="default" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Point
          </Button>
          <Button onClick={handleClearPoints} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Length Scale (ℓ): {lengthScale.toFixed(2)}
          </label>
          <Slider
            value={[lengthScale]}
            onValueChange={([v]) => setLengthScale(v)}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">
            Signal Variance (σ²): {variance.toFixed(2)}
          </label>
          <Slider
            value={[variance]}
            onValueChange={([v]) => setVariance(v)}
            min={0.1}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>
      </div>
      
      <div className="chart-container h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="uncertaintyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                <stop offset="50%" stopColor="hsl(142 76% 36%)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
            <XAxis 
              dataKey="x" 
              type="number"
              domain={[0, 10]}
              stroke="hsl(215 20% 65%)" 
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(215 20% 65%)" 
              fontSize={12}
              domain={[-4, 4]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(222 47% 9%)",
                border: "1px solid hsl(217 33% 20%)",
                borderRadius: "8px",
                color: "hsl(210 40% 96%)",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(3),
                name === "mean" ? "μ(x)" : name === "upper" ? "μ + 2σ" : "μ - 2σ"
              ]}
            />
            
            {/* Uncertainty band */}
            <Area
              data={gpData}
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#uncertaintyGradient)"
              animationDuration={500}
            />
            <Area
              data={gpData}
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="hsl(222 47% 6%)"
              animationDuration={500}
            />
            
            {/* Mean prediction */}
            <Line
              data={gpData}
              type="monotone"
              dataKey="mean"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
            
            {/* Upper bound line */}
            <Line
              data={gpData}
              type="monotone"
              dataKey="upper"
              stroke="hsl(142 76% 36%)"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={500}
            />
            
            {/* Lower bound line */}
            <Line
              data={gpData}
              type="monotone"
              dataKey="lower"
              stroke="hsl(142 76% 36%)"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={500}
            />
            
            {/* Data points */}
            <Scatter
              data={dataPoints}
              fill="hsl(199 89% 48%)"
              shape="circle"
            >
              {dataPoints.map((_, index) => (
                <circle key={index} r={6} />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 p-4 rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground font-mono">
          Kernel: k(x, x′) = σ² exp(−‖x − x′‖² / 2ℓ²)
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          The shaded region shows ±2σ (95% confidence interval)
        </p>
      </div>
    </div>
  );
}
