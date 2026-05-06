/**
 * MonteCarloPanel — MC simulation trigger + scatter plot.
 */

import { useState } from "react";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, ReferenceLine } from "recharts";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { monteCarloReliability, type ReliabilityResult } from "@/lib/reliability";

const tooltipStyle = {
  backgroundColor: "hsl(222 47% 9%)",
  border: "1px solid hsl(217 33% 20%)",
  borderRadius: "8px",
  color: "hsl(210 40% 96%)",
};

interface MonteCarloPanelProps {
  meanR: number;
  covR: number;
  meanS: number;
  covS: number;
  formResult: ReliabilityResult;
  mcResults: { pf: number; samples: { r: number; s: number; failed: boolean }[] } | null;
  onMcComplete: (results: { pf: number; samples: { r: number; s: number; failed: boolean }[] }) => void;
}

export function MonteCarloPanel({ meanR, covR, meanS, covS, formResult, mcResults, onMcComplete }: MonteCarloPanelProps) {
  const [isRunning, setIsRunning] = useState(false);

  const run = () => {
    setIsRunning(true);
    const stdR = meanR * covR;
    const stdS = meanS * covS;
    setTimeout(() => {
      const results = monteCarloReliability(meanR, stdR, meanS, stdS, 10000);
      onMcComplete(results);
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Monte Carlo Verification</h3>
          <p className="text-xs text-muted-foreground">10,000 random samples to verify FORM results</p>
        </div>
        <Button onClick={run} disabled={isRunning} variant="default" size="sm">
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? "Running..." : "Run Simulation"}
        </Button>
      </div>

      {mcResults && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">FORM P<sub>f</sub></div>
              <div className="text-lg font-bold font-mono text-foreground">{formResult.pf.toExponential(2)}</div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/20">
              <div className="text-xs text-muted-foreground">Monte Carlo P<sub>f</sub></div>
              <div className="text-lg font-bold font-mono text-secondary">{mcResults.pf.toExponential(2)}</div>
            </div>
          </div>

          <div className="chart-container h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="s" type="number" name="Load S" stroke="hsl(215 20% 65%)" fontSize={12}
                  label={{ value: "Load S (MPa)", position: "bottom", fill: "hsl(215 20% 65%)" }} />
                <YAxis dataKey="r" type="number" name="Resistance R" stroke="hsl(215 20% 65%)" fontSize={12}
                  label={{ value: "R (MPa)", angle: -90, position: "left", fill: "hsl(215 20% 65%)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter name="Safe" data={mcResults.samples.filter((s) => !s.failed)} fill="hsl(142 76% 36%)" opacity={0.5} />
                <Scatter name="Failed" data={mcResults.samples.filter((s) => s.failed)} fill="hsl(0 84% 60%)" opacity={0.8} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 800, y: 800 }]}
                  stroke="hsl(45 93% 47%)" strokeWidth={2} strokeDasharray="5 5" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            Points below the diagonal line (R = S) represent failure states. Green = safe, Red = failed.
          </p>
        </div>
      )}
    </div>
  );
}
