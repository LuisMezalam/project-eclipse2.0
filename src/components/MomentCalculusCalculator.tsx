import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

type LoadType = "uniform" | "triangular" | "trapezoidal" | "parabolic" | "sinusoidal";

interface LoadConfig {
  type: LoadType;
  L: number;       // span length
  w0: number;      // intensity at x=0 (or magnitude for uniform)
  w1: number;      // intensity at x=L (trapezoidal) or peak (parabolic)
  peakPos: number;  // peak position fraction for triangular [0,1]
}

interface MomentResults {
  resultant: number;
  centroid: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  densityData: { x: number; w: number; f: number }[];
}

const loadDescriptions: Record<LoadType, string> = {
  uniform: "Constant intensity w₀ across the span",
  triangular: "Linearly varying from zero at one end to peak at adjustable location",
  trapezoidal: "Linear variation from w₀ at x=0 to w₁ at x=L",
  parabolic: "Quadratic distribution peaking at midspan: w(x) = w₀·4x(L−x)/L²",
  sinusoidal: "Half-sine distribution: w(x) = w₀·sin(πx/L)",
};

function computeLoadIntensity(x: number, config: LoadConfig): number {
  const { type, L, w0, w1, peakPos } = config;
  const t = x / L; // normalized position [0,1]

  switch (type) {
    case "uniform":
      return w0;
    case "triangular": {
      const peak = peakPos;
      if (t <= peak && peak > 0) return w0 * (t / peak);
      if (t > peak && peak < 1) return w0 * ((1 - t) / (1 - peak));
      return 0;
    }
    case "trapezoidal":
      return w0 + (w1 - w0) * t;
    case "parabolic":
      return w0 * 4 * t * (1 - t);
    case "sinusoidal":
      return w0 * Math.sin(Math.PI * t);
    default:
      return 0;
  }
}

function computeMoments(config: LoadConfig, nPoints: number = 200): MomentResults {
  const { L } = config;
  const dx = L / nPoints;
  const densityData: { x: number; w: number; f: number }[] = [];

  // Numerical integration using trapezoidal rule
  let I0 = 0;  // resultant
  let I1 = 0;  // first raw moment
  const wValues: number[] = [];

  for (let i = 0; i <= nPoints; i++) {
    const x = (i / nPoints) * L;
    const w = computeLoadIntensity(x, config);
    wValues.push(w);
    const weight = (i === 0 || i === nPoints) ? 0.5 : 1.0;
    I0 += w * weight * dx;
    I1 += x * w * weight * dx;
  }

  const centroid = I0 > 0 ? I1 / I0 : L / 2;

  // Second, third, fourth central moments
  let mu2 = 0, mu3 = 0, mu4 = 0;
  for (let i = 0; i <= nPoints; i++) {
    const x = (i / nPoints) * L;
    const w = wValues[i];
    const r = x - centroid;
    const fVal = I0 > 0 ? w / I0 : 0;
    const weight = (i === 0 || i === nPoints) ? 0.5 : 1.0;
    mu2 += r * r * fVal * weight * dx;
    mu3 += r * r * r * fVal * weight * dx;
    mu4 += r * r * r * r * fVal * weight * dx;
  }

  const stdDev = Math.sqrt(Math.max(0, mu2));
  const skewness = stdDev > 1e-12 ? mu3 / (stdDev * stdDev * stdDev) : 0;
  const kurtosis = mu2 > 1e-12 ? mu4 / (mu2 * mu2) : 0;

  // Build chart data
  for (let i = 0; i <= nPoints; i++) {
    const x = (i / nPoints) * L;
    const w = wValues[i];
    const f = I0 > 0 ? w / I0 : 0;
    densityData.push({ x: parseFloat(x.toFixed(4)), w: parseFloat(w.toFixed(4)), f: parseFloat(f.toFixed(6)) });
  }

  return { resultant: I0, centroid, variance: mu2, stdDev, skewness, kurtosis, densityData };
}

function ResultCard({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  const colorClass = accent === "primary" ? "text-primary" : accent === "accent" ? "text-accent" : accent === "destructive" ? "text-destructive" : accent === "secondary" ? "text-secondary" : "text-foreground";
  return (
    <div className="result-card p-3">
      <div className="result-label">{label}</div>
      <div className={`text-lg font-bold font-mono ${colorClass}`}>
        {value}
        {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

interface MomentCalculusCalculatorProps {
  onSendToPf?: (data: { meanLoad: number; loadCoV: number; beamLength: number }) => void;
}

export function MomentCalculusCalculator({ onSendToPf }: MomentCalculusCalculatorProps = {}) {
  const [config, setConfig] = useState<LoadConfig>({
    type: "uniform",
    L: 10,
    w0: 5,
    w1: 10,
    peakPos: 0.5,
  });

  const results = useMemo(() => computeMoments(config), [config]);

  const updateConfig = (patch: Partial<LoadConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
  };

  const showW1 = config.type === "trapezoidal";
  const showPeakPos = config.type === "triangular";

  const tailWarning = results.kurtosis > 3.5;
  const skewnessWarning = Math.abs(results.skewness) > 0.5;

  return (
    <Card className="glass-card-compact border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Interactive Moment Calculator
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define a load distribution and see the full moment ladder computed in real time: resultant → centroid → spread → shape.
        </p>
        {onSendToPf && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs border-primary/40 hover:bg-primary/10"
            onClick={() => {
              const meanW = results.resultant / config.L;
              const covW = meanW > 0 ? results.stdDev / meanW : 0.2;
              onSendToPf({ meanLoad: meanW / 1000, loadCoV: covW, beamLength: config.L });
            }}
          >
            <Send className="h-3 w-3 mr-1" />
            Send to P<sub>f</sub> Analysis
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Load Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Load Type</Label>
            <Select value={config.type} onValueChange={(v) => updateConfig({ type: v as LoadType })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uniform">Uniform (UDL)</SelectItem>
                <SelectItem value="triangular">Triangular</SelectItem>
                <SelectItem value="trapezoidal">Trapezoidal</SelectItem>
                <SelectItem value="parabolic">Parabolic</SelectItem>
                <SelectItem value="sinusoidal">Sinusoidal (Half-sine)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/70">{loadDescriptions[config.type]}</p>
          </div>

          {/* Span Length */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Span Length L (m)</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={1}
                max={30}
                step={0.5}
                value={[config.L]}
                onValueChange={([v]) => updateConfig({ L: v })}
                className="flex-1"
              />
              <Input
                type="number"
                min={0.5}
                max={100}
                step={0.5}
                value={config.L}
                onChange={(e) => updateConfig({ L: Math.max(0.5, parseFloat(e.target.value) || 0.5) })}
                className="w-20 h-9 text-sm text-center"
              />
            </div>
          </div>

          {/* Intensity w₀ */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {config.type === "trapezoidal" ? "Intensity w₀ at x=0 (N/m)" : "Peak Intensity w₀ (N/m)"}
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                min={0.1}
                max={50}
                step={0.1}
                value={[config.w0]}
                onValueChange={([v]) => updateConfig({ w0: v })}
                className="flex-1"
              />
              <Input
                type="number"
                min={0.01}
                step={0.1}
                value={config.w0}
                onChange={(e) => updateConfig({ w0: Math.max(0.01, parseFloat(e.target.value) || 0.01) })}
                className="w-20 h-9 text-sm text-center"
              />
            </div>
          </div>

          {/* w₁ for trapezoidal */}
          {showW1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Intensity w₁ at x=L (N/m)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={[config.w1]}
                  onValueChange={([v]) => updateConfig({ w1: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0.01}
                  step={0.1}
                  value={config.w1}
                  onChange={(e) => updateConfig({ w1: Math.max(0.01, parseFloat(e.target.value) || 0.01) })}
                  className="w-20 h-9 text-sm text-center"
                />
              </div>
            </div>
          )}

          {/* Peak position for triangular */}
          {showPeakPos && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Peak Position (fraction of L)</Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={0.05}
                  max={0.95}
                  step={0.01}
                  value={[config.peakPos]}
                  onValueChange={([v]) => updateConfig({ peakPos: v })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0.01}
                  max={0.99}
                  step={0.01}
                  value={config.peakPos}
                  onChange={(e) => updateConfig({ peakPos: Math.min(0.99, Math.max(0.01, parseFloat(e.target.value) || 0.5)) })}
                  className="w-20 h-9 text-sm text-center"
                />
              </div>
            </div>
          )}
        </div>

        {/* Chart: Load intensity + normalized density */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-primary inline-block rounded" /> w(x) — Intensity
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-secondary inline-block rounded" /> f(x) — Density
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-accent inline-block rounded" /> x̄ — Centroid
            </span>
          </div>
          <div className="rounded-lg border border-border/40 bg-card/50 p-2">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={results.densityData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="x"
                  tick={{ fontSize: 10 }}
                  label={{ value: "x (m)", position: "insideBottomRight", offset: -5, fontSize: 10 }}
                />
                <YAxis
                  yAxisId="intensity"
                  tick={{ fontSize: 10 }}
                  label={{ value: "w (N/m)", angle: -90, position: "insideLeft", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="density"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  label={{ value: "f(x)", angle: 90, position: "insideRight", fontSize: 10 }}
                />
                <RechartsTooltip
                  contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value: number, name: string) => [
                    typeof value === "number" ? value.toFixed(4) : value,
                    name === "w" ? "Intensity w(x)" : "Density f(x)",
                  ]}
                />
                <Area
                  yAxisId="intensity"
                  type="monotone"
                  dataKey="w"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                  strokeWidth={2}
                />
                <Area
                  yAxisId="density"
                  type="monotone"
                  dataKey="f"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary) / 0.1)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <ReferenceLine
                  yAxisId="intensity"
                  x={parseFloat(results.centroid.toFixed(4))}
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{ value: "x̄", position: "top", fontSize: 11, fill: "hsl(var(--accent))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><ResultCard label="Resultant I₀" value={results.resultant.toFixed(2)} unit="N" accent="primary" /></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Zeroth moment: total load ∫w dx</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><ResultCard label="Centroid x̄" value={results.centroid.toFixed(3)} unit="m" accent="accent" /></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">First moment / resultant: line of action</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><ResultCard label="Variance μ₂" value={results.variance.toFixed(4)} unit="m²" /></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Second central moment: load spread about centroid</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><ResultCard label="Std Dev σ" value={results.stdDev.toFixed(4)} unit="m" /></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">√variance: characteristic spread width</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><ResultCard label="Skewness γ₁" value={results.skewness.toFixed(4)} accent={skewnessWarning ? "secondary" : undefined} /></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Third standardized moment: asymmetry of the load</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div><ResultCard label="Kurtosis κ" value={results.kurtosis.toFixed(4)} accent={tailWarning ? "destructive" : undefined} /></div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Fourth standardized moment: tail heaviness (Gaussian = 3)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Diagnostics / Warnings */}
        {(tailWarning || skewnessWarning) && (
          <div className="space-y-1.5">
            {skewnessWarning && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-secondary/10 border border-secondary/30 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
                <span>
                  <strong>Skewness alert:</strong> |γ₁| = {Math.abs(results.skewness).toFixed(3)} &gt; 0.5 — critical location shifts from midspan.
                  Consider lognormal modeling for reliability.
                </span>
              </div>
            )}
            {tailWarning && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <span>
                  <strong>Tail-risk warning:</strong> κ = {results.kurtosis.toFixed(3)} &gt; 3.5 — heavier tails than Gaussian.
                  Normal-based β may underestimate P_f. Validate with Monte Carlo.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Propagation preview */}
        <PropagationPreview results={results} L={config.L} />
      </CardContent>
    </Card>
  );
}

function PropagationPreview({ results, L }: { results: MomentResults; L: number }) {
  const factor = (L * L) / 8;
  const E_M = (results.resultant / L) * factor; // E[w] * L²/8
  const Var_M = factor * factor * results.variance / (L * L); // (L²/8)² * Var(w/L)

  // Actually: E[M] = E[w]*L²/8, Var(M) = (L²/8)² * Var(w)
  // But w here has units N/m and we integrated w*dx to get resultant in N
  // E[w] = resultant / L, Var(w) needs load variance not spatial variance
  // For simplicity we show the spatial moments and the M propagation using E[w] = I0/L
  const meanW = results.resultant / L;
  const E_moment = meanW * factor;
  // For a random UDL, Var(M) = (L²/8)² * Var(w), where Var(w) is the variance of the load intensity as a random variable
  // Here we only have the spatial distribution, so we note this distinction

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
      <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] px-1.5">Preview</Badge>
        Moment Propagation: Load → Beam Response
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">Mean intensity:</span>
          <span className="font-mono text-foreground ml-1">E[w] = {meanW.toFixed(3)} N/m</span>
        </div>
        <div>
          <span className="text-muted-foreground">Midspan moment:</span>
          <span className="font-mono text-primary ml-1">E[M] = {E_moment.toFixed(2)} N·m</span>
        </div>
        <div>
          <span className="text-muted-foreground">Formula:</span>
          <span className="font-mono text-muted-foreground ml-1">E[M] = E[w]·L²/8</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-2 italic">
        Note: Var(M) requires treating w as a random variable; the spatial moments above describe the load shape.
        For random UDL: Var(M) = (L²/8)² · Var(w).
      </p>
    </div>
  );
}
