import { useState, useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line, ReferenceLine } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  generateDesignSpectrum, 
  generateMCESpectrum,
  seismicHazardPresets,
  SeismicParameters
} from "@/lib/dynamicsFEA";
import { MapPin, AlertTriangle } from "lucide-react";

export function ResponseSpectrum() {
  const [selectedLocation, setSelectedLocation] = useState('Los Angeles, CA');
  const [customSs, setCustomSs] = useState(1.0);
  const [customS1, setCustomS1] = useState(0.4);
  const [siteClass, setSiteClass] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('D');
  const [TL, setTL] = useState(8);
  const [structurePeriod, setStructurePeriod] = useState(0.5);
  
  const isCustom = selectedLocation === 'Custom';
  
  const params: SeismicParameters = useMemo(() => {
    if (isCustom) {
      return { Ss: customSs, S1: customS1, siteClass, TL };
    }
    return seismicHazardPresets[selectedLocation];
  }, [selectedLocation, customSs, customS1, siteClass, TL, isCustom]);
  
  const designSpectrum = useMemo(() => generateDesignSpectrum(params), [params]);
  const mceSpectrum = useMemo(() => generateMCESpectrum(params), [params]);
  
  // Combined data for chart
  const spectrumData = useMemo(() => {
    return designSpectrum.map((point, i) => ({
      T: point.T,
      design: point.Sa,
      mce: mceSpectrum[i]?.Sa ?? 0,
      designSd: point.Sd,
      mceSd: mceSpectrum[i]?.Sd ?? 0
    }));
  }, [designSpectrum, mceSpectrum]);
  
  // Get Sa at structure period
  const getSpectralAcceleration = (T: number, spectrum: typeof designSpectrum) => {
    const closest = spectrum.reduce((prev, curr) => 
      Math.abs(curr.T - T) < Math.abs(prev.T - T) ? curr : prev
    );
    return closest.Sa;
  };
  
  const designSa = getSpectralAcceleration(structurePeriod, designSpectrum);
  const mceSa = getSpectralAcceleration(structurePeriod, mceSpectrum);
  
  // Seismic design category
  const getSDC = (SDS: number, SD1: number): string => {
    const maxS = Math.max(SDS, SD1);
    if (maxS >= 0.75) return 'D';
    if (maxS >= 0.5) return 'C';
    if (maxS >= 0.167) return 'B';
    return 'A';
  };
  
  const SDS = (2/3) * params.Ss * (siteClass === 'D' ? 1.1 : 1.0);
  const SD1 = (2/3) * params.S1 * (siteClass === 'D' ? 1.5 : 1.0);
  const sdc = getSDC(SDS, SD1);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Seismic Response Spectrum</h3>
            <p className="text-xs text-muted-foreground">ASCE 7-22 Design & MCE spectra</p>
          </div>
          <Badge variant={sdc === 'D' ? 'destructive' : sdc === 'C' ? 'secondary' : 'outline'}>
            SDC {sdc}
          </Badge>
        </div>
        
        {/* Location and Parameters */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(seismicHazardPresets).map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isCustom && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">S<sub>S</sub>: {customSs.toFixed(2)}g</label>
                <Slider
                  value={[customSs]}
                  onValueChange={([v]) => setCustomSs(v)}
                  min={0.1}
                  max={3.0}
                  step={0.05}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">S<sub>1</sub>: {customS1.toFixed(2)}g</label>
                <Slider
                  value={[customS1]}
                  onValueChange={([v]) => setCustomS1(v)}
                  min={0.05}
                  max={1.5}
                  step={0.05}
                />
              </div>
            </>
          )}
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Site Class</label>
            <Select value={siteClass} onValueChange={(v) => setSiteClass(v as 'A' | 'B' | 'C' | 'D' | 'E')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A - Hard Rock</SelectItem>
                <SelectItem value="B">B - Rock</SelectItem>
                <SelectItem value="C">C - Dense Soil</SelectItem>
                <SelectItem value="D">D - Stiff Soil</SelectItem>
                <SelectItem value="E">E - Soft Clay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Structure Period T: {structurePeriod.toFixed(2)}s</label>
            <Slider
              value={[structurePeriod]}
              onValueChange={([v]) => setStructurePeriod(v)}
              min={0.1}
              max={4.0}
              step={0.05}
            />
          </div>
        </div>
        
        {/* Key Results */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="text-xs text-muted-foreground">S<sub>DS</sub></div>
            <div className="text-xl font-bold text-primary font-mono">{SDS.toFixed(3)}g</div>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="text-xs text-muted-foreground">S<sub>D1</sub></div>
            <div className="text-xl font-bold text-primary font-mono">{SD1.toFixed(3)}g</div>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <div className="text-xs text-muted-foreground">Design S<sub>a</sub>(T)</div>
            <div className="text-xl font-bold text-accent font-mono">{designSa.toFixed(3)}g</div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="text-xs text-muted-foreground">MCE S<sub>a</sub>(T)</div>
            <div className="text-xl font-bold text-destructive font-mono">{mceSa.toFixed(3)}g</div>
          </div>
        </div>
        
        {/* Spectrum Chart */}
        <div className="chart-container h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={spectrumData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
              <defs>
                <linearGradient id="designGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(199 89% 48%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis 
                dataKey="T" 
                type="number"
                stroke="hsl(215 20% 65%)" 
                fontSize={12}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{ value: 'Period T (s)', position: 'bottom', fill: 'hsl(215 20% 65%)', offset: 0 }}
              />
              <YAxis 
                stroke="hsl(215 20% 65%)" 
                fontSize={12}
                label={{ value: 'Sa (g)', angle: -90, position: 'insideLeft', fill: 'hsl(215 20% 65%)', offset: 5 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                formatter={(value: number, name: string) => [value.toFixed(4) + 'g', name === 'design' ? 'Design' : 'MCE']}
                labelFormatter={(label) => `T = ${Number(label).toFixed(2)}s`}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Area 
                type="monotone" 
                dataKey="design" 
                stroke="hsl(199 89% 48%)" 
                strokeWidth={2} 
                fill="url(#designGrad)"
                name="Design Spectrum"
              />
              <Line 
                type="monotone" 
                dataKey="mce" 
                stroke="hsl(0 84% 60%)" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={false}
                name="MCE Spectrum"
              />
              <ReferenceLine 
                x={structurePeriod} 
                stroke="hsl(142 76% 36%)" 
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ value: `T=${structurePeriod}s`, fill: 'hsl(142 76% 36%)', fontSize: 10 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Warning for high seismicity */}
        {sdc === 'D' && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <strong className="text-destructive">High Seismic Zone:</strong> Structures require special seismic-resistant design. 
              Consider moment frames, braced frames, or shear walls. Consult ASCE 7-22 for detailed requirements.
            </div>
          </div>
        )}
      </div>
      
      {/* Displacement Spectrum */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Spectral Displacement</h3>
        <div className="chart-container h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={spectrumData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
              <XAxis dataKey="T" type="number" stroke="hsl(215 20% 65%)" fontSize={12} tickFormatter={(v: number) => v.toFixed(1)} />
              <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)" }}
                formatter={(value: number) => [value.toFixed(1) + ' mm', 'Sd']}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Line type="monotone" dataKey="designSd" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={false} name="Design Sd" />
              <Line type="monotone" dataKey="mceSd" stroke="hsl(0 84% 60%)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="MCE Sd" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}