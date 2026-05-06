/**
 * DistributionOverlapChart — R-S interference visualization.
 */

import { useMemo } from "react";
import { Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ComposedChart, Legend } from "recharts";
import { normalPDF } from "@/lib/statistics";

const tooltipStyle = {
  backgroundColor: "hsl(222 47% 9%)",
  border: "1px solid hsl(217 33% 20%)",
  borderRadius: "8px",
  color: "hsl(210 40% 96%)",
};

interface DistributionOverlapChartProps {
  meanR: number;
  covR: number;
  meanS: number;
  covS: number;
}

export function DistributionOverlapChart({ meanR, covR, meanS, covS }: DistributionOverlapChartProps) {
  const distributionData = useMemo(() => {
    const stdR = meanR * covR;
    const stdS = meanS * covS;
    const data: { x: number; resistance: number; load: number; overlap: number }[] = [];
    const minX = Math.min(meanR - 4 * stdR, meanS - 4 * stdS);
    const maxX = Math.max(meanR + 4 * stdR, meanS + 4 * stdS);
    const step = (maxX - minX) / 200;

    for (let x = minX; x <= maxX; x += step) {
      const pdfR = normalPDF(x, meanR, stdR);
      const pdfS = normalPDF(x, meanS, stdS);
      data.push({ x, resistance: pdfR, load: pdfS, overlap: Math.min(pdfR, pdfS) });
    }
    return data;
  }, [meanR, covR, meanS, covS]);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">R-S Interference (Overlap Region)</h3>
      <div className="chart-container h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={distributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="resistanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(199 89% 48%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(340 82% 52%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(340 82% 52%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="overlapGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
            <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={12}
              tickFormatter={(v) => v.toFixed(0)}
              label={{ value: "Stress (MPa)", position: "bottom", fill: "hsl(215 20% 65%)", offset: -5 }} />
            <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Area type="monotone" dataKey="resistance" stroke="hsl(199 89% 48%)" strokeWidth={2} fill="url(#resistanceGrad)" name="Resistance R" />
            <Area type="monotone" dataKey="load" stroke="hsl(340 82% 52%)" strokeWidth={2} fill="url(#loadGrad)" name="Load S" />
            <Area type="monotone" dataKey="overlap" stroke="hsl(0 84% 60%)" strokeWidth={0} fill="url(#overlapGrad)" name="Failure Region" />
            <ReferenceLine x={meanR} stroke="hsl(199 89% 48%)" strokeDasharray="5 5" />
            <ReferenceLine x={meanS} stroke="hsl(340 82% 52%)" strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        The shaded overlap region represents structural configurations where failure may occur (S &gt; R).
      </p>
    </div>
  );
}
