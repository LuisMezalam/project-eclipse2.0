import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { generateNormalData, generateGammaData, generatePoissonData } from "@/lib/statistics";

interface DistributionChartProps {
  type: "normal" | "gamma" | "poisson";
  params: {
    mu?: number;
    sigma?: number;
    alpha?: number;
    theta?: number;
    lambda?: number;
  };
  color: string;
  title: string;
}

export function DistributionChart({ type, params, color, title }: DistributionChartProps) {
  const data = useMemo(() => {
    switch (type) {
      case "normal":
        return generateNormalData(params.mu ?? 0, params.sigma ?? 1, 150);
      case "gamma":
        return generateGammaData(params.alpha ?? 2, params.theta ?? 2, 150);
      case "poisson":
        return generatePoissonData(params.lambda ?? 5, 20);
      default:
        return [];
    }
  }, [type, params]);

  const gradientId = `gradient-${type}`;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
      <div className="chart-container h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
            <XAxis 
              dataKey="x" 
              stroke="hsl(215 20% 65%)" 
              fontSize={12}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis 
              stroke="hsl(215 20% 65%)" 
              fontSize={12}
              tickFormatter={(v) => v.toFixed(3)}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(222 47% 9%)",
                border: "1px solid hsl(217 33% 20%)",
                borderRadius: "8px",
                color: "hsl(210 40% 96%)",
              }}
              formatter={(value: number) => [value.toFixed(4), "f(x)"]}
              labelFormatter={(label) => `x = ${Number(label).toFixed(2)}`}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 font-mono text-sm text-muted-foreground">
        {type === "normal" && (
          <span>μ = {params.mu}, σ = {params.sigma}</span>
        )}
        {type === "gamma" && (
          <span>α = {params.alpha}, θ = {params.theta}</span>
        )}
        {type === "poisson" && (
          <span>λ = {params.lambda}</span>
        )}
      </div>
    </div>
  );
}
