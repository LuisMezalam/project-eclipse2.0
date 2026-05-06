/**
 * DeflectionCurve — deflection chart with L/250 serviceability limit.
 */

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { chartTooltipStyle } from "./beamTypes";

interface DeflectionCurveProps {
  diagramData: { x: number; deflection: number }[];
  beamLength: number;
  deflectionLocation: number;
  lengthUnit?: string;
  deflectionUnit?: string;
  deflectionFactor?: number;
  posFactor?: number;
}

export function DeflectionCurve({
  diagramData, beamLength, deflectionLocation,
  lengthUnit = "m", deflectionUnit = "mm", deflectionFactor = 1,
  posFactor = 1,
}: DeflectionCurveProps) {
  // Convert data to display units
  // diagramData: x in meters, deflection in mm
  const displayData = diagramData.map(d => ({
    x: +(d.x * posFactor).toFixed(4),
    deflection: d.deflection * deflectionFactor,
  }));

  // Service limit: L/250 in display deflection unit
  // beamLength is in meters, L/250 in meters → mm (×1000) then × deflectionFactor
  const serviceLimitMM = (beamLength / 250) * 1000; // mm
  const serviceLimit = serviceLimitMM * deflectionFactor;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Deflection Curve</h3>
      <div className="chart-container h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="deflectionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
            <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12}
              label={{ value: `Position (${lengthUnit})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 10 }} />
            <YAxis stroke="hsl(215 20% 65%)" fontSize={12}
              label={{ value: `δ (${deflectionUnit})`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 10 }} />
            <Tooltip contentStyle={chartTooltipStyle}
              formatter={(v: number) => [`${v.toFixed(3)} ${deflectionUnit}`, "δ(x)"]}
              labelFormatter={(l) => `x = ${Number(l).toFixed(2)} ${lengthUnit}`} />
            <ReferenceLine y={0} stroke="hsl(215 20% 65%)" strokeDasharray="5 5" />
            <ReferenceLine y={serviceLimit} stroke="hsl(0 84% 60%)" strokeDasharray="5 5"
              label={{ value: "L/250 limit", fill: "hsl(0 84% 60%)", fontSize: 10, position: "right" }} />
            <Line type="monotone" dataKey="deflection" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={false}
              fill="url(#deflectionGrad)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent" />
          <span>Deflection curve</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-destructive border-dashed" style={{ borderTop: "2px dashed" }} />
          <span>L/250 serviceability limit ({serviceLimit.toFixed(deflectionUnit === "in" ? 3 : 1)} {deflectionUnit})</span>
        </div>
        <div className="ml-auto">Max at x = {(deflectionLocation * posFactor).toFixed(2)} {lengthUnit}</div>
      </div>
    </div>
  );
}
