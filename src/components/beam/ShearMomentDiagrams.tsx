/**
 * ShearMomentDiagrams — side-by-side shear & moment Recharts.
 */

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { chartTooltipStyle } from "./beamTypes";

interface DiagramPoint {
  x: number;
  shear: number;
  moment: number;
  deflection: number;
}

interface ShearMomentDiagramsProps {
  diagramData: DiagramPoint[];
  lengthUnit?: string;
  forceUnit?: string;
  momentUnit?: string;
  posFactor?: number;
  shearFactor?: number;
  momentFactor?: number;
}

export function ShearMomentDiagrams({
  diagramData, lengthUnit = "m", forceUnit = "kN", momentUnit = "kN·m",
  posFactor = 1, shearFactor = 1, momentFactor = 1,
}: ShearMomentDiagramsProps) {
  const displayData = diagramData.map(d => ({
    x: +(d.x * posFactor).toFixed(4),
    shear: d.shear * shearFactor,
    moment: d.moment * momentFactor,
  }));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Shear */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Shear Force Diagram</h3>
        <div className="chart-container h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="shearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12}
                label={{ value: `Position (${lengthUnit})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 10 }} />
              <YAxis stroke="hsl(215 20% 65%)" fontSize={12}
                label={{ value: `V (${forceUnit})`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${v.toFixed(2)} ${forceUnit}`, "V(x)"]}
                labelFormatter={(l) => `x = ${Number(l).toFixed(2)} ${lengthUnit}`} />
              <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
              <Area type="monotone" dataKey="shear" stroke="hsl(262 83% 58%)" strokeWidth={2} fill="url(#shearGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Moment */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Bending Moment Diagram</h3>
        <div className="chart-container h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="momentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12}
                label={{ value: `Position (${lengthUnit})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 10 }} />
              <YAxis stroke="hsl(215 20% 65%)" fontSize={12}
                label={{ value: `M (${momentUnit})`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle}
                formatter={(v: number) => [`${v.toFixed(2)} ${momentUnit}`, "M(x)"]}
                labelFormatter={(l) => `x = ${Number(l).toFixed(2)} ${lengthUnit}`} />
              <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
              <Area type="monotone" dataKey="moment" stroke="hsl(45 93% 47%)" strokeWidth={2} fill="url(#momentGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
