import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, Wind, Building2, Car, Factory, Waves } from "lucide-react";
import { civilApplications, SpectralAnalysisResult } from "@/lib/dynamicsFEA";

interface RandomExcitationTabProps {
  selectedApplication: string;
  setSelectedApplication: (v: string) => void;
  psdIntensity: number;
  setPsdIntensity: (v: number) => void;
  maxAllowableDisp: number;
  spectralResult: SpectralAnalysisResult;
  randomReliability: { expectedCrossings: number; pfFirstCrossing: number; beta: number; modeFactorB: number };
  varianceProp: {
    inputMean: number; inputVariance: number; inputSkewness: number; inputKurtosis: number;
    outputMean: number; outputVariance: number; outputCOV: number; amplificationFactor: number;
  };
  higherMoments: {
    excessKurtosis: number;
    interpretation: { dispersion: string; asymmetry: string; tailedness: string };
  };
}

function getAppIcon(category: string) {
  switch (category) {
    case 'seismic': return <Activity className="w-4 h-4" />;
    case 'wind': return <Wind className="w-4 h-4" />;
    case 'vibration-serviceability': return <Building2 className="w-4 h-4" />;
    case 'traffic': return <Car className="w-4 h-4" />;
    case 'machine': return <Factory className="w-4 h-4" />;
    default: return <Waves className="w-4 h-4" />;
  }
}

export function RandomExcitationTab({
  selectedApplication, setSelectedApplication,
  psdIntensity, setPsdIntensity,
  maxAllowableDisp,
  spectralResult, randomReliability,
  varianceProp, higherMoments,
}: RandomExcitationTabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-2 text-foreground">Dynamics Under Random Excitation</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Based on CE 340 Section 5: Response variance from spectral analysis with PSD filtering through transfer function.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Excitation Type</label>
            <Select value={selectedApplication} onValueChange={setSelectedApplication}>
              <SelectTrigger><SelectValue placeholder="Select excitation" /></SelectTrigger>
              <SelectContent>
                {civilApplications.map(app => (
                  <SelectItem key={app.id} value={app.id}>
                    <div className="flex items-center gap-2">{getAppIcon(app.category)}{app.name}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">PSD Intensity S₀: {psdIntensity.toFixed(4)}</label>
            <Slider value={[psdIntensity]} onValueChange={([v]) => setPsdIntensity(v)} min={0.001} max={0.1} step={0.001} />
          </div>
          <div className="flex items-end">
            <Badge variant={spectralResult.rmsResponse > maxAllowableDisp ? "destructive" : "secondary"}>
              RMS Response: {(spectralResult.rmsResponse * 1000).toFixed(2)} mm
            </Badge>
          </div>
        </div>
      </div>

      {/* Spectral Results */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Response Variance</div>
          <div className="text-xl font-bold font-mono text-foreground">{spectralResult.responseVariance.toExponential(2)} m²</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-muted-foreground">RMS Response</div>
          <div className="text-xl font-bold font-mono text-primary">{(spectralResult.rmsResponse * 1000).toFixed(2)} mm</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Peak Factor</div>
          <div className="text-xl font-bold font-mono text-accent">{spectralResult.peakFactor.toFixed(2)}</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Expected Max</div>
          <div className={`text-xl font-bold font-mono ${spectralResult.expectedMaxResponse > maxAllowableDisp ? 'text-destructive' : 'text-accent'}`}>
            {(spectralResult.expectedMaxResponse * 1000).toFixed(2)} mm
          </div>
        </div>
      </div>

      {/* First-Passage Reliability */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">First-Passage Reliability (1 hour)</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Expected Crossings</div>
            <div className="text-lg font-mono text-foreground">{randomReliability.expectedCrossings.toFixed(2)}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">First-Passage P<sub>f</sub></div>
            <div className={`text-lg font-mono ${randomReliability.pfFirstCrossing > 0.01 ? 'text-destructive' : 'text-accent'}`}>
              {randomReliability.pfFirstCrossing.toExponential(2)}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Reliability Index β</div>
            <div className="text-lg font-mono text-primary">{randomReliability.beta.toFixed(3)}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Mode Factor B</div>
            <div className="text-lg font-mono text-foreground">{randomReliability.modeFactorB.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* PSD Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Input PSD</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spectralResult.frequencies.map((f, i) => ({ f, S: spectralResult.inputPSD[i] }))} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="f" type="number" stroke="hsl(215 20% 65%)" fontSize={10} tickFormatter={(v: number) => v.toFixed(1)} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10} tickFormatter={(v) => v.toExponential(1)} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px" }} formatter={(v: number) => [v.toExponential(3), "S_F(f)"]} />
                <Area type="monotone" dataKey="S" stroke="hsl(340 82% 52%)" fill="hsl(340 82% 52%)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Output PSD (Response)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spectralResult.frequencies.map((f, i) => ({ f, S: spectralResult.outputPSD[i] }))} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="f" type="number" stroke="hsl(215 20% 65%)" fontSize={10} tickFormatter={(v: number) => v.toFixed(1)} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10} tickFormatter={(v) => v.toExponential(1)} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px" }} formatter={(v: number) => [v.toExponential(3), "S_X(f)"]} />
                <Area type="monotone" dataKey="S" stroke="hsl(199 89% 48%)" fill="hsl(199 89% 48%)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Variance Propagation */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Variance Propagation (Theorem 4)</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">Input Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Mean: </span><span className="font-mono">{varianceProp.inputMean.toFixed(1)} N</span></div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Variance: </span><span className="font-mono">{varianceProp.inputVariance.toExponential(2)}</span></div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Skewness: </span><span className="font-mono">{varianceProp.inputSkewness.toFixed(2)}</span></div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Kurtosis: </span><span className="font-mono">{varianceProp.inputKurtosis.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-accent">Output Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Mean: </span><span className="font-mono">{varianceProp.outputMean.toFixed(1)} N</span></div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Variance: </span><span className="font-mono">{varianceProp.outputVariance.toExponential(2)}</span></div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">COV: </span><span className="font-mono">{(varianceProp.outputCOV * 100).toFixed(1)}%</span></div>
              <div className="p-2 rounded bg-muted/30"><span className="text-muted-foreground">Amplification: </span><span className="font-mono">{varianceProp.amplificationFactor.toFixed(2)}×</span></div>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/30 font-mono text-sm">
          Var[r] = ∫|H(ω)|²S<sub>F</sub>(ω) dω / 2π — Heavy tails in F<sub>ext</sub> increase extreme response probability
        </div>
      </div>

      {/* Higher-Order Moments */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Higher-Order Moments Analysis</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Dispersion</div>
            <div className="text-sm text-foreground">{higherMoments.interpretation.dispersion}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Asymmetry</div>
            <div className="text-sm text-foreground">{higherMoments.interpretation.asymmetry}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Tailedness</div>
            <div className="text-sm text-foreground">{higherMoments.interpretation.tailedness}</div>
          </div>
        </div>
        {higherMoments.excessKurtosis > 1 && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/20 border border-destructive/50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">High kurtosis detected: Enhanced damping recommended for extreme dynamic responses</span>
          </div>
        )}
      </div>
    </div>
  );
}
