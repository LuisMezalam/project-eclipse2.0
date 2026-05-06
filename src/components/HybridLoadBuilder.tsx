import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Copy, ChevronDown, Play, Pause, RotateCcw, ArrowDownUp } from "lucide-react";
import { LoadConfig, LoadType } from "@/lib/reliability";

interface HybridLoadBuilderProps {
  loads: LoadConfig[];
  onLoadsChange: (loads: LoadConfig[]) => void;
  beamLength: number;
}

const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  udl: 'Uniform (UDL)',
  concentrated: 'Point Load',
  triangular: 'Triangular',
  'partial-udl': 'Partial UDL',
  trapezoidal: 'Trapezoidal',
  parabolic: 'Parabolic',
  moment: 'Applied Moment',
  moving: 'Moving Load',
  parametric: 'Parametric f(x)',
  'axle-train': 'Vehicle Axle Train',
  'support-settlement': 'Support Settlement',
  'thermal-gradient': 'Thermal Gradient',
  prestress: 'Prestress / PT Equivalent',
  patch: 'Patch / Wheel Contact',
  torsional: 'Eccentric / Torsional',
  'snow-drift': 'Snow Drift',
  hydrostatic: 'Hydrostatic / Soil Pressure',
  'construction-stage': 'Construction Stage',
  'harmonic-equivalent': 'Harmonic Static Equivalent',
};

const LOAD_COMBINATIONS = [
  { name: 'Dead + Live', factors: [{ loadIndex: 0, factor: 1.2 }, { loadIndex: 1, factor: 1.6 }] },
  { name: 'Dead + Live + Wind', factors: [{ loadIndex: 0, factor: 1.2 }, { loadIndex: 1, factor: 1.0 }, { loadIndex: 2, factor: 0.5 }] },
  { name: 'Dead + Seismic', factors: [{ loadIndex: 0, factor: 1.0 }, { loadIndex: 1, factor: 1.4 }] },
];

export function HybridLoadBuilder({ loads, onLoadsChange, beamLength }: HybridLoadBuilderProps) {
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [openLoadIndex, setOpenLoadIndex] = useState<number | null>(0);
  const [animatingLoadIndex, setAnimatingLoadIndex] = useState<number | null>(null);

  // Animation for moving loads
  useEffect(() => {
    if (animatingLoadIndex === null) return;
    
    const load = loads[animatingLoadIndex];
    if (!load || (load.type !== 'moving' && load.type !== 'axle-train')) {
      setAnimatingLoadIndex(null);
      return;
    }
    
    const interval = setInterval(() => {
      const newLoads = [...loads];
      const currentStep = newLoads[animatingLoadIndex].movingStep || 0;
      const nextStep = currentStep + 0.02;
      newLoads[animatingLoadIndex] = { 
        ...newLoads[animatingLoadIndex], 
        movingStep: nextStep > 1 ? 0 : nextStep 
      };
      onLoadsChange(newLoads);
    }, 50);
    
    return () => clearInterval(interval);
  }, [animatingLoadIndex, loads, onLoadsChange]);

  const addLoad = () => {
    const newLoad: LoadConfig = {
      type: 'udl',
      intensity: 5000,
      position: 0.5,
      peakPosition: 0,
      startPosition: 0.25,
      endPosition: 0.75,
      slope: 1000,
      intercept: 2000,
      movingStep: 0.5,
      inverted: false,
      triStartPosition: 0,
      triEndPosition: 1,
      forceAngle: 0,
    };
    const newLoads = [...loads, newLoad];
    onLoadsChange(newLoads);
    setOpenLoadIndex(newLoads.length - 1);
  };

  const updateLoad = (index: number, updates: Partial<LoadConfig>) => {
    const newLoads = [...loads];
    newLoads[index] = { ...newLoads[index], ...updates };
    onLoadsChange(newLoads);
  };

  const removeLoad = (index: number) => {
    if (animatingLoadIndex === index) setAnimatingLoadIndex(null);
    onLoadsChange(loads.filter((_, i) => i !== index));
    if (openLoadIndex === index) setOpenLoadIndex(null);
  };

  const duplicateLoad = (index: number) => {
    const newLoads = [...loads];
    newLoads.splice(index + 1, 0, { ...loads[index] });
    onLoadsChange(newLoads);
    setOpenLoadIndex(index + 1);
  };

  const getLoadUnit = (type: LoadType) => {
    if (type === 'support-settlement' || type === 'thermal-gradient') return 'kN-m';
    if (type === 'moment') return 'kN·m';
    if (type === 'concentrated' || type === 'moving' || type === 'axle-train' || type === 'torsional' || type === 'harmonic-equivalent') return 'kN';
    return 'kN/m';
  };

  const applyCombination = (combinationName: string) => {
    setSelectedCombination(combinationName);
  };

  const renderLoadControls = (load: LoadConfig, index: number) => {
    return (
      <div className="space-y-3 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <Select
              value={load.type}
              onValueChange={(v) => {
                updateLoad(index, { type: v as LoadType });
                if (v !== 'moving' && v !== 'axle-train' && animatingLoadIndex === index) {
                  setAnimatingLoadIndex(null);
                }
              }}
            >
              <SelectTrigger className="bg-muted/30 border-border h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOAD_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Intensity ({getLoadUnit(load.type)})
            </label>
            <Input
              type="number"
              value={(load.intensity / 1000).toFixed(1)}
              onChange={(e) => updateLoad(index, { intensity: parseFloat(e.target.value) * 1000 || 0 })}
              className="bg-muted/30 h-8 text-xs"
            />
          </div>
        </div>

        {/* Type-specific controls */}
        {(load.type === 'concentrated' || load.type === 'moment' || load.type === 'torsional' || load.type === 'harmonic-equivalent' || load.type === 'support-settlement' || load.type === 'thermal-gradient') && (
          <div>
            <label className="text-xs text-muted-foreground">
              Position: {((load.position || 0.5) * beamLength).toFixed(2)}m
            </label>
            <Slider
              value={[load.position || 0.5]}
              onValueChange={([v]) => updateLoad(index, { position: v })}
              min={0.05}
              max={0.95}
              step={0.05}
              className="mt-1"
            />
          </div>
        )}

        {(load.type === 'moving' || load.type === 'axle-train') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                Position: {((load.movingStep || 0.5) * beamLength).toFixed(2)}m
              </label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAnimatingLoadIndex(animatingLoadIndex === index ? null : index)}
                  className="h-7 w-7 p-0"
                >
                  {animatingLoadIndex === index ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (animatingLoadIndex === index) setAnimatingLoadIndex(null);
                    updateLoad(index, { movingStep: 0 });
                  }}
                  className="h-7 w-7 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              value={[load.movingStep || 0.5]}
              onValueChange={([v]) => {
                if (animatingLoadIndex === index) setAnimatingLoadIndex(null);
                updateLoad(index, { movingStep: v });
              }}
              min={0}
              max={1}
              step={0.02}
            />
          </div>
        )}

        {/* Force Angle — available for concentrated and moving loads */}
        {(load.type === 'concentrated' || load.type === 'moving' || load.type === 'axle-train' || load.type === 'torsional' || load.type === 'harmonic-equivalent') && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Force Angle: {load.forceAngle || 0}° from vertical
            </label>
            <div className="flex gap-2 items-center">
              <Slider
                value={[load.forceAngle || 0]}
                onValueChange={([v]) => updateLoad(index, { forceAngle: v })}
                min={-90}
                max={90}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                value={load.forceAngle || 0}
                onChange={(e) => updateLoad(index, { forceAngle: Math.max(-90, Math.min(90, parseFloat(e.target.value) || 0)) })}
                className="w-14 bg-muted/30 h-8 text-xs text-center"
              />
              <span className="text-xs text-muted-foreground">°</span>
            </div>
            <p className="text-xs text-muted-foreground">
              P<sub>v</sub> = {(load.intensity / 1000 * Math.cos((load.forceAngle || 0) * Math.PI / 180)).toFixed(2)} kN | 
              P<sub>h</sub> = {(load.intensity / 1000 * Math.sin((load.forceAngle || 0) * Math.PI / 180)).toFixed(2)} kN
            </p>
          </div>
        )}

        {(load.type === 'partial-udl' || load.type === 'patch' || load.type === 'prestress') && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Start: {((load.startPosition || 0.25) * 100).toFixed(0)}%</label>
              <Slider
                value={[load.startPosition || 0.25]}
                onValueChange={([v]) => updateLoad(index, { startPosition: v })}
                min={0}
                max={(load.endPosition || 0.75) - 0.1}
                step={0.05}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End: {((load.endPosition || 0.75) * 100).toFixed(0)}%</label>
              <Slider
                value={[load.endPosition || 0.75]}
                onValueChange={([v]) => updateLoad(index, { endPosition: v })}
                min={(load.startPosition || 0.25) + 0.1}
                max={1}
                step={0.05}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {load.type === 'trapezoidal' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Start: {((load.startIntensity || 5000) / 1000).toFixed(1)} kN/m</label>
              <Slider
                value={[load.startIntensity || 5000]}
                onValueChange={([v]) => updateLoad(index, { startIntensity: v })}
                min={1000}
                max={20000}
                step={500}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End: {((load.endIntensity || 2500) / 1000).toFixed(1)} kN/m</label>
              <Slider
                value={[load.endIntensity || 2500]}
                onValueChange={([v]) => updateLoad(index, { endIntensity: v })}
                min={1000}
                max={20000}
                step={500}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {load.type === 'parametric' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">f(x) = mx + b (N/m)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">m: {load.slope || 1000}</label>
                <Slider
                  value={[load.slope || 1000]}
                  onValueChange={([v]) => updateLoad(index, { slope: v })}
                  min={-5000}
                  max={5000}
                  step={100}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">b: {load.intercept || 2000}</label>
                <Slider
                  value={[load.intercept || 2000]}
                  onValueChange={([v]) => updateLoad(index, { intercept: v })}
                  min={0}
                  max={10000}
                  step={500}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {(load.type === 'triangular' || load.type === 'snow-drift' || load.type === 'hydrostatic') && (() => {
          const baseLen = ((load.triEndPosition ?? 1) - (load.triStartPosition ?? 0)) * beamLength;
          const slopeAngle = baseLen > 0 ? Math.atan2(load.intensity / 1000, baseLen) * (180 / Math.PI) : 45;
          return (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Peak Position</label>
              <Select
                value={String(load.peakPosition || 0)}
                onValueChange={(v) => updateLoad(index, { peakPosition: Number(v) as 0 | 1 })}
              >
                <SelectTrigger className="bg-muted/30 border-border h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Peak at Left</SelectItem>
                  <SelectItem value="1">Peak at Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Slope Angle: {slopeAngle.toFixed(1)}°
              </label>
              <Slider
                value={[slopeAngle]}
                onValueChange={([angle]) => {
                  const rad = Math.max(angle, 1) * Math.PI / 180;
                  const desiredBase = (load.intensity / 1000) / Math.tan(rad);
                  const ratio = Math.max(0.1, Math.min(1, desiredBase / beamLength));
                  const peak = load.peakPosition || 0;
                  if (peak === 0) {
                    updateLoad(index, { triEndPosition: Math.min(1, (load.triStartPosition ?? 0) + ratio) });
                  } else {
                    updateLoad(index, { triStartPosition: Math.max(0, (load.triEndPosition ?? 1) - ratio) });
                  }
                }}
                min={5}
                max={85}
                step={1}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Base: {((load.triStartPosition ?? 0) * beamLength).toFixed(2)}m to {((load.triEndPosition ?? 1) * beamLength).toFixed(2)}m
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <span className="text-xs text-muted-foreground">Start</span>
                  <Slider
                    value={[load.triStartPosition ?? 0]}
                    onValueChange={([v]) => updateLoad(index, { triStartPosition: Math.min(v, (load.triEndPosition ?? 1) - 0.1) })}
                    min={0}
                    max={0.9}
                    step={0.05}
                  />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">End</span>
                  <Slider
                    value={[load.triEndPosition ?? 1]}
                    onValueChange={([v]) => updateLoad(index, { triEndPosition: Math.max(v, (load.triStartPosition ?? 0) + 0.1) })}
                    min={0.1}
                    max={1}
                    step={0.05}
                  />
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Invert toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowDownUp className="h-3 w-3" />
            Invert (upward)
          </label>
          <Button
            variant={load.inverted ? "default" : "outline"}
            size="sm"
            onClick={() => updateLoad(index, { inverted: !load.inverted })}
            className="h-6 px-2 text-xs"
          >
            {load.inverted ? "↑" : "↓"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">Load Cases</h4>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {loads.length}
          </span>
        </div>
        <Button onClick={addLoad} variant="outline" size="sm" className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {/* Load Combinations - Only show when 2+ loads */}
      {loads.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {LOAD_COMBINATIONS.slice(0, Math.min(loads.length, 3)).map((combo) => (
            <Button
              key={combo.name}
              variant={selectedCombination === combo.name ? "default" : "outline"}
              size="sm"
              onClick={() => applyCombination(combo.name)}
              className="h-6 text-xs px-2"
            >
              {combo.name}
            </Button>
          ))}
          {selectedCombination && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCombination(null)}
              className="h-6 text-xs px-2 text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Individual Loads - Collapsible */}
      <div className="space-y-2">
        {loads.map((load, index) => {
          const combo = selectedCombination 
            ? LOAD_COMBINATIONS.find(c => c.name === selectedCombination)
            : null;
          const factor = combo?.factors.find(f => f.loadIndex === index)?.factor || 1;
          const isOpen = openLoadIndex === index;
          
          return (
            <Collapsible
              key={index}
              open={isOpen}
              onOpenChange={(open) => setOpenLoadIndex(open ? index : null)}
            >
              <div className="bg-muted/20 rounded-lg border border-border/50 overflow-hidden">
                <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="text-xs font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                      L{index + 1}
                    </span>
                    <span className="text-sm text-foreground">{LOAD_TYPE_LABELS[load.type]}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(load.intensity / 1000).toFixed(1)} {getLoadUnit(load.type)})
                    </span>
                    {factor !== 1 && (
                      <span className="text-xs text-chart-posterior font-medium">
                        ×{factor}
                      </span>
                    )}
                    {load.inverted && (
                      <span className="text-xs text-chart-posterior font-medium">↑</span>
                    )}
                    {animatingLoadIndex === index && (
                      <span className="text-xs text-chart-posterior animate-pulse">●</span>
                    )}
                  </CollapsibleTrigger>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateLoad(index)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLoad(index)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="px-3 pb-3 border-t border-border/30">
                    {renderLoadControls(load, index)}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {loads.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border border-dashed border-border/50 rounded-lg">
          <p className="text-sm">No loads defined</p>
          <p className="text-xs mt-1">Click "Add" to create a load case</p>
        </div>
      )}
    </div>
  );
}
