/**
 * BeamConfigPanel — configuration UI for beam type, loads, supports,
 * cross-section, and material properties.
 */

import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Layers, Settings2, ArrowDownUp } from "lucide-react";
import { CrossSectionDiagram } from "../CrossSectionDiagram";
import { LoadTypeDiagram } from "../LoadTypeDiagram";
import { HybridLoadBuilder } from "../HybridLoadBuilder";
import { ExportButton } from "../ExportButton";
import type { useBeamAnalysis } from "./useBeamAnalysis";
import {
  type DistributedForceUnit,
  type ForceUnit,
  type LengthUnit,
  type SupportType,
} from "./beamTypes";
import type { BeamType, CrossSectionType, LoadType } from "@/lib/reliability";

type BeamHook = ReturnType<typeof useBeamAnalysis>;

interface BeamConfigPanelProps {
  b: BeamHook;
}

export function BeamConfigPanel({ b }: BeamConfigPanelProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">Static Beam Configuration</h3>
        <div className="flex items-center gap-4">
          <ExportButton getReportData={b.getBeamReportData} getCSVData={b.getBeamCSVData} filename="beam_analysis" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Units:</span>
            <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
              <Button variant={b.unitSystem === "metric" ? "default" : "ghost"} size="sm" onClick={() => b.setUnitSystem("metric")} className="h-7 px-3">Metric</Button>
              <Button variant={b.unitSystem === "imperial" ? "default" : "ghost"} size="sm" onClick={() => b.setUnitSystem("imperial")} className="h-7 px-3">Imperial</Button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => b.setShowSupportEditor(!b.showSupportEditor)} className="gap-2">
            <Settings2 className="h-4 w-4" /> Supports
          </Button>
        </div>
      </div>

      {/* Support Editor */}
      {b.showSupportEditor && (
        <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-border/50">
          <h4 className="text-sm font-medium mb-3 text-foreground">Support Configuration</h4>
          <div className="space-y-3">
            {b.supports.map((support, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20">Support {idx + 1}</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Position: {b.convertLengthToDisplay(support.position * b.beamLength).toFixed(2)} {b.lengthUnit}</label>
                  <Slider value={[support.position]} onValueChange={([v]) => { const n = [...b.supports]; n[idx] = { ...n[idx], position: v }; b.setSupports(n); }} min={0} max={1} step={0.05} />
                </div>
                <Select value={support.type} onValueChange={(v) => { const n = [...b.supports]; n[idx] = { ...n[idx], type: v as SupportType }; b.setSupports(n); }}>
                  <SelectTrigger className="w-28 bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pin">Pin</SelectItem>
                    <SelectItem value="roller">Roller</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="hinge">Hinge</SelectItem>
                  </SelectContent>
                </Select>
                {b.supports.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => b.setSupports(b.supports.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-destructive hover:text-destructive">×</Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => b.setSupports([...b.supports, { position: 0.5, type: "pin" }])} className="mt-2">+ Add Support</Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left column: beam + load config */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Beam Type</label>
              <Select value={b.beamType} onValueChange={(v) => b.setBeamType(v as BeamType)}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simply-supported">Simply Supported</SelectItem>
                  <SelectItem value="cantilever">Cantilever</SelectItem>
                  <SelectItem value="fixed-fixed">Fixed-Fixed</SelectItem>
                  <SelectItem value="propped-cantilever">Propped Cantilever</SelectItem>
                  <SelectItem value="overhanging">Overhanging</SelectItem>
                  <SelectItem value="continuous">Continuous (2-Span)</SelectItem>
                  <SelectItem value="multi-span">Arbitrary Multi-Span</SelectItem>
                  <SelectItem value="gerber">Gerber / Internal Hinge</SelectItem>
                  <SelectItem value="elastic-foundation">Elastic Foundation</SelectItem>
                  <SelectItem value="spring-supported">Spring-Supported</SelectItem>
                  <SelectItem value="settlement">Support Settlement Beam</SelectItem>
                  <SelectItem value="tapered">Tapered / Non-Prismatic</SelectItem>
                  <SelectItem value="beam-column">Beam-Column</SelectItem>
                  <SelectItem value="composite">Composite Beam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Load Mode</label>
              <div className="flex gap-2">
                <Button variant={b.loadMode === "single" ? "default" : "outline"} size="sm" onClick={() => b.setLoadMode("single")} className="flex-1">Single</Button>
                <Button variant={b.loadMode === "hybrid" ? "default" : "outline"} size="sm" onClick={() => b.setLoadMode("hybrid")} className="flex-1">
                  <Layers className="h-4 w-4 mr-1" /> Hybrid
                </Button>
              </div>
            </div>
          </div>

          {b.loadMode === "single" ? (
            <SingleLoadControls b={b} />
          ) : (
            <div className="space-y-4">
              <HybridLoadBuilder loads={b.hybridLoads} onLoadsChange={b.setHybridLoads} beamLength={b.beamLength} />
              <div>
                <label className="text-xs text-muted-foreground">Beam Length L: {b.convertLengthToDisplay(b.beamLength).toFixed(2)} {b.lengthUnit}</label>
                <Slider value={[b.beamLength]} onValueChange={([v]) => b.setBeamLength(v)} min={2} max={12} step={0.5} />
              </div>
              {b.hybridLoads.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <LoadTypeDiagram beamType={b.beamType} hybridLoads={b.hybridLoads} beamLength={b.beamLength} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: cross-section */}
        <div className="space-y-4">
          <CrossSectionControls b={b} />
        </div>
      </div>
    </div>
  );
}

/** Single-load mode controls */
function SingleLoadControls({ b }: { b: BeamHook }) {
  const du = b.displayUnits;
  const lUnit = du.length.unit;
  const isPointLike = b.loadType === "concentrated" || b.loadType === "moving" || b.loadType === "axle-train" || b.loadType === "torsional" || b.loadType === "harmonic-equivalent";
  const isMomentLike = b.loadType === "moment" || b.loadType === "support-settlement" || b.loadType === "thermal-gradient";

  return (
    <>
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Load Type</label>
        <Select value={b.loadType} onValueChange={(v) => b.setLoadType(v as LoadType)}>
          <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="udl">Uniform (UDL)</SelectItem>
            <SelectItem value="concentrated">Concentrated</SelectItem>
            <SelectItem value="triangular">Triangular</SelectItem>
            <SelectItem value="partial-udl">Partial UDL</SelectItem>
            <SelectItem value="trapezoidal">Trapezoidal</SelectItem>
            <SelectItem value="parabolic">Parabolic</SelectItem>
            <SelectItem value="moment">Applied Moment</SelectItem>
            <SelectItem value="moving">Moving</SelectItem>
            <SelectItem value="parametric">Parametric f(x)</SelectItem>
            <SelectItem value="axle-train">Vehicle Axle Train</SelectItem>
            <SelectItem value="support-settlement">Support Settlement</SelectItem>
            <SelectItem value="thermal-gradient">Thermal Gradient</SelectItem>
            <SelectItem value="prestress">Prestress / PT Equivalent</SelectItem>
            <SelectItem value="patch">Patch / Wheel Contact</SelectItem>
            <SelectItem value="torsional">Eccentric / Torsional</SelectItem>
            <SelectItem value="snow-drift">Snow Drift</SelectItem>
            <SelectItem value="hydrostatic">Hydrostatic / Soil Pressure</SelectItem>
            <SelectItem value="construction-stage">Construction Stage</SelectItem>
            <SelectItem value="harmonic-equivalent">Harmonic Static Equivalent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Load Intensity */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Load Intensity</label>
        <div className="flex gap-2">
          <Input type="number" value={b.convertForceToDisplay(b.loadIntensity).toFixed(2)}
            onChange={(e) => { const v = b.convertForceFromDisplay(parseFloat(e.target.value) || 0); b.setLoadIntensity(v); if (b.ctx.isSynced) b.ctx.setLoadMean(v / 1000); }}
            className="flex-1 bg-muted/30 border-border" />
          <Select value={(isPointLike || isMomentLike) ? b.forceUnit : b.distributedForceUnit}
            onValueChange={(v) => { if (isPointLike || isMomentLike) b.setForceUnit(v as ForceUnit); else b.setDistributedForceUnit(v as DistributedForceUnit); }}>
            <SelectTrigger className="w-24 bg-muted/30 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {isPointLike ? (
                <>{["N","kN","MN","lbf","kip"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</>
              ) : isMomentLike ? (
                <>{["N","kN","lbf","kip"].map(u => <SelectItem key={u} value={u}>{u}·{u === "lbf" || u === "kip" ? "ft" : "m"}</SelectItem>)}</>
              ) : (
                <>{["N/m","kN/m","MN/m","lbf/ft","kip/ft"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</>
              )}
            </SelectContent>
          </Select>
        </div>
        <Slider value={[b.loadIntensity]} onValueChange={([v]) => { b.setLoadIntensity(v); if (b.ctx.isSynced) b.ctx.setLoadMean(v / 1000); }}
          min={1000} max={isPointLike ? 50000 : 20000} step={500} />
      </div>

      {/* Invert */}
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5"><ArrowDownUp className="h-3.5 w-3.5" /> Invert Load (upward)</label>
        <Button variant={b.loadInverted ? "default" : "outline"} size="sm" onClick={() => b.setLoadInverted(!b.loadInverted)} className="h-7 px-3 text-xs">
          {b.loadInverted ? "Inverted ↑" : "Normal ↓"}
        </Button>
      </div>

      {/* Force Angle */}
      {isPointLike && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Force Angle: {b.forceAngle}° from vertical</label>
          <div className="flex gap-2 items-center">
            <Slider value={[b.forceAngle]} onValueChange={([v]) => b.setForceAngle(v)} min={-90} max={90} step={5} className="flex-1" />
            <Input type="number" value={b.forceAngle} onChange={(e) => b.setForceAngle(Math.max(-90, Math.min(90, parseFloat(e.target.value) || 0)))} className="w-16 bg-muted/30 border-border text-center" />
            <span className="text-xs text-muted-foreground">°</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Vertical: P<sub>v</sub> = {(b.loadIntensity * Math.cos(b.forceAngle * Math.PI / 180) * du.force.factor).toFixed(2)} {du.force.unit} |
            Horizontal: P<sub>h</sub> = {(b.loadIntensity * Math.sin(b.forceAngle * Math.PI / 180) * du.force.factor).toFixed(2)} {du.force.unit}
          </p>
        </div>
      )}

      {/* Beam Length */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Beam Length</label>
        <div className="flex gap-2">
          <Input type="number" value={b.convertLengthToDisplay(b.beamLength).toFixed(2)}
            onChange={(e) => { const v = b.convertLengthFromDisplay(parseFloat(e.target.value) || 0); b.setBeamLength(Math.max(0.5, Math.min(20, v))); if (b.ctx.isSynced) b.ctx.setBeamLength(v); }}
            className="flex-1 bg-muted/30 border-border" />
          <Select value={b.lengthUnit} onValueChange={(v) => b.setLengthUnit(v as LengthUnit)}>
            <SelectTrigger className="w-20 bg-muted/30 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{["m","mm","ft","in"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Slider value={[b.beamLength]} onValueChange={([v]) => { b.setBeamLength(v); if (b.ctx.isSynced) b.ctx.setBeamLength(v); }} min={2} max={12} step={0.5} />
      </div>

      {/* Load-specific controls */}
      {b.loadType === "concentrated" && (
        <div>
          <label className="text-xs text-muted-foreground">Load Position: {b.convertLengthToDisplay(b.concentratedPosition * b.beamLength).toFixed(2)} {lUnit} ({(b.concentratedPosition * 100).toFixed(0)}%)</label>
          <Slider value={[b.concentratedPosition]} onValueChange={([v]) => b.setConcentratedPosition(v)} min={0.1} max={0.9} step={0.05} />
        </div>
      )}

      {b.loadType === "triangular" && (() => {
        const baseLen = (b.triEnd - b.triStart) * b.beamLength;
        const slopeAngle = baseLen > 0 ? Math.atan2(b.loadIntensity / 1000, baseLen) * (180 / Math.PI) : 45;
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Peak Position</label>
              <Select value={String(b.triangularPeak)} onValueChange={(v) => b.setTriangularPeak(Number(v) as 0 | 1)}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Peak at Left (Decreasing)</SelectItem>
                  <SelectItem value="1">Peak at Right (Increasing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Slope Angle: {slopeAngle.toFixed(1)}°</label>
              <Slider value={[slopeAngle]} onValueChange={([angle]) => {
                const rad = Math.max(angle, 1) * Math.PI / 180;
                const desiredBase = (b.loadIntensity / 1000) / Math.tan(rad);
                const ratio = Math.max(0.1, Math.min(1, desiredBase / b.beamLength));
                if (b.triangularPeak === 0) b.setTriEnd(Math.min(1, b.triStart + ratio));
                else b.setTriStart(Math.max(0, b.triEnd - ratio));
              }} min={5} max={85} step={1} />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Base: {b.convertLengthToDisplay(b.triStart * b.beamLength).toFixed(2)} {lUnit} to {b.convertLengthToDisplay(b.triEnd * b.beamLength).toFixed(2)} {lUnit}</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Start</span>
                  <Slider value={[b.triStart]} onValueChange={([v]) => b.setTriStart(Math.min(v, b.triEnd - 0.1))} min={0} max={0.9} step={0.05} />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">End</span>
                  <Slider value={[b.triEnd]} onValueChange={([v]) => b.setTriEnd(Math.max(v, b.triStart + 0.1))} min={0.1} max={1} step={0.05} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {b.loadType === "partial-udl" && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Load Range: {b.convertLengthToDisplay(b.partialStart * b.beamLength).toFixed(2)} {lUnit} to {b.convertLengthToDisplay(b.partialEnd * b.beamLength).toFixed(2)} {lUnit}</label>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-xs text-muted-foreground">Start</span><Slider value={[b.partialStart]} onValueChange={([v]) => b.setPartialStart(Math.min(v, b.partialEnd - 0.1))} min={0} max={0.9} step={0.05} /></div>
            <div><span className="text-xs text-muted-foreground">End</span><Slider value={[b.partialEnd]} onValueChange={([v]) => b.setPartialEnd(Math.max(v, b.partialStart + 0.1))} min={0.1} max={1} step={0.05} /></div>
          </div>
        </div>
      )}

      {b.loadType === "trapezoidal" && (
        <div className="space-y-2">
          <div><label className="text-xs text-muted-foreground">Start Intensity: {(b.trapStartIntensity * du.distForce.factor).toFixed(1)} {du.distForce.unit}</label><Slider value={[b.trapStartIntensity]} onValueChange={([v]) => b.setTrapStartIntensity(v)} min={1000} max={20000} step={500} /></div>
          <div><label className="text-xs text-muted-foreground">End Intensity: {(b.trapEndIntensity * du.distForce.factor).toFixed(1)} {du.distForce.unit}</label><Slider value={[b.trapEndIntensity]} onValueChange={([v]) => b.setTrapEndIntensity(v)} min={1000} max={20000} step={500} /></div>
        </div>
      )}

      {b.loadType === "moment" && (
        <div><label className="text-xs text-muted-foreground">Moment Position: {b.convertLengthToDisplay(b.momentPosition * b.beamLength).toFixed(2)} {lUnit}</label><Slider value={[b.momentPosition]} onValueChange={([v]) => b.setMomentPosition(v)} min={0.1} max={0.9} step={0.05} /></div>
      )}

      {b.loadType === "moving" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Load Position: {b.convertLengthToDisplay(b.movingPosition * b.beamLength).toFixed(2)} {lUnit}</label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => b.setIsAnimating(!b.isAnimating)}>{b.isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
              <Button size="sm" variant="outline" onClick={() => { b.setIsAnimating(false); b.setMovingPosition(0); }}><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </div>
          <Slider value={[b.movingPosition]} onValueChange={([v]) => { b.setIsAnimating(false); b.setMovingPosition(v); }} min={0} max={1} step={0.02} />
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/30">
        <LoadTypeDiagram beamType={b.beamType} hybridLoads={[b.loadConfig]} beamLength={b.beamLength} />
      </div>
    </>
  );
}

/** Cross-section type selector + dimension sliders + material properties */
function CrossSectionControls({ b }: { b: BeamHook }) {
  const du = b.displayUnits;
  const df = b.dimFactor;
  const dUnit = b.dimUnit;

  return (
    <>
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">Cross-Section Type</label>
        <Select value={b.crossSectionType} onValueChange={(v) => b.setCrossSectionType(v as CrossSectionType)}>
          <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rectangular">Rectangular</SelectItem>
            <SelectItem value="circular">Circular</SelectItem>
            <SelectItem value="hollow-rectangular">Hollow Rectangular</SelectItem>
            <SelectItem value="hollow-circular">Hollow Circular (Pipe)</SelectItem>
            <SelectItem value="i-beam">I-Beam / Wide Flange</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {b.crossSectionType === "rectangular" && (
        <>
          <div><label className="text-xs text-muted-foreground">Width b: {(b.sectionWidth * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionWidth * df]} onValueChange={([v]) => b.setSectionWidth(b.dimToInternal(v))} min={b.isImperial ? 2 : 50} max={b.isImperial ? 20 : 500} step={b.isImperial ? 0.25 : 10} /></div>
          <div><label className="text-xs text-muted-foreground">Height h: {(b.sectionHeight * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionHeight * df]} onValueChange={([v]) => b.setSectionHeight(b.dimToInternal(v))} min={b.isImperial ? 4 : 100} max={b.isImperial ? 32 : 800} step={b.isImperial ? 0.25 : 10} /></div>
        </>
      )}
      {b.crossSectionType === "circular" && (
        <div><label className="text-xs text-muted-foreground">Diameter d: {(b.sectionDiameter * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionDiameter * df]} onValueChange={([v]) => b.setSectionDiameter(b.dimToInternal(v))} min={b.isImperial ? 2 : 50} max={b.isImperial ? 20 : 500} step={b.isImperial ? 0.25 : 10} /></div>
      )}
      {b.crossSectionType === "hollow-rectangular" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">Outer W: {(b.sectionWidth * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionWidth * df]} onValueChange={([v]) => b.setSectionWidth(b.dimToInternal(v))} min={b.isImperial ? 2 : 50} max={b.isImperial ? 16 : 400} step={b.isImperial ? 0.25 : 10} /></div>
            <div><label className="text-xs text-muted-foreground">Outer H: {(b.sectionHeight * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionHeight * df]} onValueChange={([v]) => b.setSectionHeight(b.dimToInternal(v))} min={b.isImperial ? 4 : 100} max={b.isImperial ? 24 : 600} step={b.isImperial ? 0.25 : 10} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">Inner W: {(b.innerWidth * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.innerWidth * df]} onValueChange={([v]) => b.setInnerWidth(b.dimToInternal(v))} min={b.isImperial ? 1 : 30} max={b.sectionWidth * df - (b.isImperial ? 0.5 : 20)} step={b.isImperial ? 0.25 : 10} /></div>
            <div><label className="text-xs text-muted-foreground">Inner H: {(b.innerHeight * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.innerHeight * df]} onValueChange={([v]) => b.setInnerHeight(b.dimToInternal(v))} min={b.isImperial ? 2 : 60} max={b.sectionHeight * df - (b.isImperial ? 0.5 : 20)} step={b.isImperial ? 0.25 : 10} /></div>
          </div>
        </>
      )}
      {b.crossSectionType === "hollow-circular" && (
        <>
          <div><label className="text-xs text-muted-foreground">Outer Diameter: {(b.sectionDiameter * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionDiameter * df]} onValueChange={([v]) => b.setSectionDiameter(b.dimToInternal(v))} min={b.isImperial ? 2 : 50} max={b.isImperial ? 20 : 500} step={b.isImperial ? 0.25 : 10} /></div>
          <div><label className="text-xs text-muted-foreground">Inner Diameter: {(b.innerDiameter * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.innerDiameter * df]} onValueChange={([v]) => b.setInnerDiameter(b.dimToInternal(v))} min={b.isImperial ? 1 : 30} max={b.sectionDiameter * df - (b.isImperial ? 0.25 : 10)} step={b.isImperial ? 0.25 : 10} /></div>
        </>
      )}
      {b.crossSectionType === "i-beam" && (
        <>
          <div><label className="text-xs text-muted-foreground">Total Height: {(b.sectionHeight * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.sectionHeight * df]} onValueChange={([v]) => b.setSectionHeight(b.dimToInternal(v))} min={b.isImperial ? 6 : 150} max={b.isImperial ? 32 : 800} step={b.isImperial ? 0.25 : 10} /></div>
          <div><label className="text-xs text-muted-foreground">Flange Width: {(b.flangeWidth * df).toFixed(b.isImperial ? 2 : 0)} {dUnit}</label><Slider value={[b.flangeWidth * df]} onValueChange={([v]) => b.setFlangeWidth(b.dimToInternal(v))} min={b.isImperial ? 2 : 50} max={b.isImperial ? 16 : 400} step={b.isImperial ? 0.25 : 10} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-muted-foreground">Flange t: {(b.flangeThickness * df).toFixed(b.isImperial ? 3 : 0)} {dUnit}</label><Slider value={[b.flangeThickness * df]} onValueChange={([v]) => b.setFlangeThickness(b.dimToInternal(v))} min={b.isImperial ? 0.2 : 5} max={b.isImperial ? 2 : 50} step={b.isImperial ? 0.05 : 1} /></div>
            <div><label className="text-xs text-muted-foreground">Web t: {(b.webThickness * df).toFixed(b.isImperial ? 3 : 0)} {dUnit}</label><Slider value={[b.webThickness * df]} onValueChange={([v]) => b.setWebThickness(b.dimToInternal(v))} min={b.isImperial ? 0.2 : 5} max={b.isImperial ? 1.2 : 30} step={b.isImperial ? 0.05 : 1} /></div>
          </div>
        </>
      )}

      <div><label className="text-xs text-muted-foreground">Yield Strength σ<sub>y</sub>: {(b.yieldStrength * du.yieldFactor).toFixed(b.isImperial ? 1 : 0)} {du.yieldUnit}</label><Slider value={[b.yieldStrength]} onValueChange={([v]) => { b.setYieldStrength(v); if (b.ctx.isSynced) b.ctx.setResistanceMean(v); }} min={200} max={500} step={10} /></div>

      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-xs text-muted-foreground">Strength COV: {(b.strengthCOV * 100).toFixed(0)}%</label><Slider value={[b.strengthCOV]} onValueChange={([v]) => { b.setStrengthCOV(v); if (b.ctx.isSynced) b.ctx.setResistanceCoV(v); }} min={0.05} max={0.2} step={0.01} /></div>
        <div><label className="text-xs text-muted-foreground">Load COV: {(b.loadCOV * 100).toFixed(0)}%</label><Slider value={[b.loadCOV]} onValueChange={([v]) => { b.setLoadCOV(v); if (b.ctx.isSynced) b.ctx.setLoadVariance(Math.pow(v * b.ctx.loadMean, 2)); }} min={0.1} max={0.4} step={0.02} /></div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/30">
        <CrossSectionDiagram type={b.crossSectionType} width={b.sectionWidth} height={b.sectionHeight}
          diameter={b.sectionDiameter} innerWidth={b.innerWidth} innerHeight={b.innerHeight}
          innerDiameter={b.innerDiameter} flangeWidth={b.flangeWidth} flangeThickness={b.flangeThickness}
          webThickness={b.webThickness} />
      </div>
    </>
  );
}
