/**
 * BeamConfigPanel — configuration UI for beam type, loads, supports,
 * cross-section, and material properties.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw, Layers, Settings2, ArrowDownUp } from "lucide-react";
import { BeamNumberField } from "./BeamNumberField";
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
                  <BeamNumberField
                    label="Position"
                    value={b.convertLengthToDisplay(support.position * b.beamLength)}
                    unit={b.lengthUnit}
                    min={0}
                    max={b.convertLengthToDisplay(b.beamLength)}
                    step={0.01}
                    onChange={(v) => {
                      const n = [...b.supports];
                      n[idx] = { ...n[idx], position: b.convertLengthFromDisplay(v) / b.beamLength };
                      b.setSupports(n);
                    }}
                  />
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
              <HybridLoadBuilder
                loads={b.hybridLoads}
                onLoadsChange={b.setHybridLoads}
                beamLength={b.beamLength}
                supportPositions={b.supports.map((support) => support.position)}
              />
              <div>
                <BeamNumberField
                  label="Beam Length L"
                  value={b.convertLengthToDisplay(b.beamLength)}
                  unit={b.lengthUnit}
                  min={b.convertLengthToDisplay(0.01)}
                  step={0.01}
                  onChange={(v) => b.setBeamLength(b.convertLengthFromDisplay(v))}
                />
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
          {b.beamType === "composite" && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Composite model</label>
              <Select value={b.compositeModel} onValueChange={(value) => b.setCompositeModel(value as "laminate" | "layered")}>
                <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laminate">Fiber laminate (Classical Lamination Theory)</SelectItem>
                  <SelectItem value="layered">Bonded isotropic layers (steel + slab)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {b.beamType !== "composite" ? <CrossSectionControls b={b} /> : b.compositeModel === "laminate"
            ? <LaminateSectionControls b={b} />
            : <><CrossSectionControls b={b} /><CompositeSectionControls b={b} /></>}
          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={b.includeSelfWeight}
                onChange={(event) => b.setIncludeSelfWeight(event.currentTarget.checked)}
                className="h-4 w-4 accent-primary"
              />
              Include beam self-weight
            </label>
            <BeamNumberField
              label={b.beamType === "composite" && b.compositeModel === "laminate" ? "Lamina unit weight γ" : b.beamType === "composite" ? "Primary material unit weight γ₁" : "Material unit weight γ"}
              value={(b.beamType === "composite" && b.compositeModel === "laminate" ? b.laminateUnitWeight : b.materialUnitWeight) * b.displayUnits.unitWeight.factor}
              unit={b.displayUnits.unitWeight.unit}
              min={0}
              step={0.1}
              precision={2}
              onChange={(value) => {
                if (b.beamType === "composite" && b.compositeModel === "laminate") b.setLaminateUnitWeight(value / b.displayUnits.unitWeight.factor);
                else b.setMaterialUnitWeight(value / b.displayUnits.unitWeight.factor);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {b.includeSelfWeight
                ? `Adds ${(
                    b.selfWeightIntensity * b.displayUnits.distForce.factor
                  ).toFixed(3)} ${b.displayUnits.distForce.unit} downward as a full-span load. It is included in the response diagrams.`
                : b.beamType === "composite" && b.compositeModel === "laminate"
                  ? `Enabled self-weight uses γ × laminate width × total ply thickness (${(b.selfWeightIntensity * b.displayUnits.distForce.factor).toFixed(3)} ${b.displayUnits.distForce.unit}).`
                  : b.beamType === "composite"
                  ? `For composite sections, self-weight uses γ₁Abeam + γ₂Aslab. Set each material unit weight to match your project.`
                  : `Steel default: ${(77000 * b.displayUnits.unitWeight.factor).toFixed(2)} ${b.displayUnits.unitWeight.unit}. Set γ for your material; enabled self-weight uses γ × section area as a full-span dead load.`}
            </p>
          </div>
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
        <div className="flex gap-2 items-end">
          <BeamNumberField
            label="Load Intensity"
            value={b.convertForceToDisplay(b.loadIntensity)}
            min={0}
            step={0.01}
            className="flex-1"
            onChange={(displayValue) => {
              const value = b.convertForceFromDisplay(displayValue);
              b.setLoadIntensity(value);
              if (b.ctx.isSynced) b.ctx.setLoadMean(value / 1000);
            }}
          />
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
          <BeamNumberField
            label="Force Angle from vertical"
            value={b.forceAngle}
            unit="°"
            min={-90}
            max={90}
            step={1}
            precision={1}
            onChange={b.setForceAngle}
          />
          <p className="text-xs text-muted-foreground">
            Vertical: P<sub>v</sub> = {(b.loadIntensity * Math.cos(b.forceAngle * Math.PI / 180) * du.force.factor).toFixed(2)} {du.force.unit} |
            Horizontal: P<sub>h</sub> = {(b.loadIntensity * Math.sin(b.forceAngle * Math.PI / 180) * du.force.factor).toFixed(2)} {du.force.unit}
          </p>
        </div>
      )}

      {/* Beam Length */}
      <div className="flex gap-2 items-end">
        <BeamNumberField
          label="Beam Length L"
          value={b.convertLengthToDisplay(b.beamLength)}
          unit={b.lengthUnit}
          min={b.convertLengthToDisplay(0.01)}
          step={0.01}
          precision={3}
          className="flex-1"
          onChange={(displayValue) => {
            const value = b.convertLengthFromDisplay(displayValue);
            b.setBeamLength(value);
            if (b.ctx.isSynced) b.ctx.setBeamLength(value);
          }}
        />
        <div className="space-y-1">
          <span className="block text-xs text-muted-foreground">Length unit</span>
          <Select value={b.lengthUnit} onValueChange={(v) => b.setLengthUnit(v as LengthUnit)}>
            <SelectTrigger className="w-20 bg-muted/30 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{["m","mm","ft","in"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Load-specific controls */}
      {b.loadType === "concentrated" && (
        <BeamNumberField
          label={`Load Position (${(b.concentratedPosition * 100).toFixed(0)}% along beam)`}
          value={b.convertLengthToDisplay(b.concentratedPosition * b.beamLength)}
          unit={lUnit}
          min={0}
          max={b.convertLengthToDisplay(b.beamLength)}
          step={0.01}
          onChange={(v) => b.setConcentratedPosition(b.convertLengthFromDisplay(v) / b.beamLength)}
        />
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
              <BeamNumberField
                label="Slope Angle"
                value={slopeAngle}
                unit="°"
                min={5}
                max={85}
                step={0.1}
                precision={1}
                onChange={(angle) => {
                  const rad = Math.max(angle, 1) * Math.PI / 180;
                  const desiredBase = (b.loadIntensity / 1000) / Math.tan(rad);
                  const ratio = Math.max(0.1, Math.min(1, desiredBase / b.beamLength));
                  if (b.triangularPeak === 0) b.setTriEnd(Math.min(1, b.triStart + ratio));
                  else b.setTriStart(Math.max(0, b.triEnd - ratio));
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <BeamNumberField
                  label="Base start"
                  value={b.convertLengthToDisplay(b.triStart * b.beamLength)}
                  unit={lUnit}
                  min={0}
                  max={b.convertLengthToDisplay((b.triEnd - 0.1) * b.beamLength)}
                  step={0.01}
                  onChange={(v) => b.setTriStart(b.convertLengthFromDisplay(v) / b.beamLength)}
                />
                <BeamNumberField
                  label="Base end"
                  value={b.convertLengthToDisplay(b.triEnd * b.beamLength)}
                  unit={lUnit}
                  min={b.convertLengthToDisplay((b.triStart + 0.1) * b.beamLength)}
                  max={b.convertLengthToDisplay(b.beamLength)}
                  step={0.01}
                  onChange={(v) => b.setTriEnd(b.convertLengthFromDisplay(v) / b.beamLength)}
                />
              </div>
            </div>
          </div>
        );
      })()}

      {b.loadType === "partial-udl" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <BeamNumberField
              label="Load start"
              value={b.convertLengthToDisplay(b.partialStart * b.beamLength)}
              unit={lUnit}
              min={0}
              max={b.convertLengthToDisplay((b.partialEnd - 0.1) * b.beamLength)}
              step={0.01}
              onChange={(v) => b.setPartialStart(b.convertLengthFromDisplay(v) / b.beamLength)}
            />
            <BeamNumberField
              label="Load end"
              value={b.convertLengthToDisplay(b.partialEnd * b.beamLength)}
              unit={lUnit}
              min={b.convertLengthToDisplay((b.partialStart + 0.1) * b.beamLength)}
              max={b.convertLengthToDisplay(b.beamLength)}
              step={0.01}
              onChange={(v) => b.setPartialEnd(b.convertLengthFromDisplay(v) / b.beamLength)}
            />
          </div>
        </div>
      )}

      {b.loadType === "trapezoidal" && (
        <div className="space-y-2">
          <BeamNumberField
            label="Start Intensity"
            value={b.trapStartIntensity * du.distForce.factor}
            unit={du.distForce.unit}
            min={0}
            step={0.01}
            onChange={(v) => b.setTrapStartIntensity(v / du.distForce.factor)}
          />
          <BeamNumberField
            label="End Intensity"
            value={b.trapEndIntensity * du.distForce.factor}
            unit={du.distForce.unit}
            min={0}
            step={0.01}
            onChange={(v) => b.setTrapEndIntensity(v / du.distForce.factor)}
          />
        </div>
      )}

      {b.loadType === "moment" && (
        <BeamNumberField
          label="Moment Position"
          value={b.convertLengthToDisplay(b.momentPosition * b.beamLength)}
          unit={lUnit}
          min={0}
          max={b.convertLengthToDisplay(b.beamLength)}
          step={0.01}
          onChange={(v) => b.setMomentPosition(b.convertLengthFromDisplay(v) / b.beamLength)}
        />
      )}

      {b.loadType === "moving" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Moving load position</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => b.setIsAnimating(!b.isAnimating)}>{b.isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
              <Button size="sm" variant="outline" onClick={() => { b.setIsAnimating(false); b.setMovingPosition(0); }}><RotateCcw className="h-4 w-4" /></Button>
            </div>
          </div>
          <BeamNumberField
            label="Position"
            value={b.convertLengthToDisplay(b.movingPosition * b.beamLength)}
            unit={lUnit}
            min={0}
            max={b.convertLengthToDisplay(b.beamLength)}
            step={0.01}
            onChange={(v) => {
              b.setIsAnimating(false);
              b.setMovingPosition(b.convertLengthFromDisplay(v) / b.beamLength);
            }}
          />
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/30">
        <LoadTypeDiagram beamType={b.beamType} hybridLoads={[b.loadConfig]} beamLength={b.beamLength} />
      </div>
    </>
  );
}

function LaminateSectionControls({ b }: { b: BeamHook }) {
  const metric = !b.isImperial;
  const modulusFactor = b.isImperial ? 1 / 6894760 : 1e-9;
  const modulusUnit = b.isImperial ? "ksi" : "GPa";
  const material = b.laminateMaterial;
  const modulusField = (label: string, key: "E1" | "E2" | "G12") => (
    <BeamNumberField
      label={label}
      value={material[key] * modulusFactor}
      unit={modulusUnit}
      min={0.001}
      step={0.1}
      precision={2}
      onChange={(value) => b.updateLaminateMaterial(key, value / modulusFactor)}
    />
  );
  const strengthField = (label: string, key: "Xt" | "Xc" | "Yt" | "Yc" | "S12") => (
    <BeamNumberField
      label={label}
      value={material[key] * b.displayUnits.stress.factor}
      unit={b.displayUnits.stress.unit}
      min={0.001}
      step={0.1}
      precision={1}
      onChange={(value) => b.updateLaminateMaterial(key, value / b.displayUnits.stress.factor)}
    />
  );

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Laminated composite section</h4>
        <p className="mt-1 text-xs text-muted-foreground">Ply angles are measured from the beam axis and listed bottom to top. The same orthotropic lamina properties apply to every ply.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BeamNumberField label="Laminate width b" value={b.sectionWidth * b.dimFactor} unit={b.dimUnit} min={metric ? 10 : 0.4} step={metric ? 1 : 0.05} onChange={(value) => b.setSectionWidth(b.dimToInternal(value))} />
        <BeamNumberField label="Ply thickness tₖ" value={b.laminatePlyThickness * b.dimFactor} unit={b.dimUnit} min={metric ? 0.01 : 0.0004} step={metric ? 0.01 : 0.0004} precision={4} onChange={(value) => b.setLaminatePlyThickness(b.dimToInternal(value))} />
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Ply angle sequence, bottom to top (degrees)</span>
        <Input
          value={b.laminateLayup}
          aria-label="Ply angle sequence, bottom to top"
          placeholder="0, 45, -45, 90, 90, -45, 45, 0"
          onChange={(event) => b.setLaminateLayup(event.currentTarget.value)}
          className="bg-muted/30 border-border font-mono"
        />
        {!b.laminateLayupValid && <span className="text-xs text-destructive">Enter 1 to 64 numeric ply angles, separated by commas or spaces.</span>}
      </label>
      <div className="border-t border-border/50 pt-3">
        <h5 className="mb-2 text-xs font-semibold text-foreground">Lamina elastic constants</h5>
        <div className="grid grid-cols-2 gap-3">
          {modulusField("Fiber-direction modulus E₁", "E1")}
          {modulusField("Transverse modulus E₂", "E2")}
          {modulusField("In-plane shear modulus G₁₂", "G12")}
          <BeamNumberField label="Major Poisson ratio ν₁₂" value={material.nu12} min={-0.49} max={0.49} step={0.01} precision={3} onChange={(value) => b.updateLaminateMaterial("nu12", value)} />
        </div>
      </div>
      <div className="border-t border-border/50 pt-3">
        <h5 className="mb-2 text-xs font-semibold text-foreground">Maximum-stress allowables</h5>
        <div className="grid grid-cols-2 gap-3">
          {strengthField("Fiber tension Xₜ", "Xt")}
          {strengthField("Fiber compression X꜀", "Xc")}
          {strengthField("Transverse tension Yₜ", "Yt")}
          {strengthField("Transverse compression Y꜀", "Yc")}
          {strengthField("In-plane shear S₁₂", "S12")}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Defaults are editable T300/N5208 example values from the supplied composite reference. Replace them with your material data. The model assumes plane-stress, linear-elastic plies, perfect bonding, and no transverse shear; strength results are a first-ply maximum-stress screen.</p>
    </div>
  );
}

function CompositeSectionControls({ b }: { b: BeamHook }) {
  const metric = !b.isImperial;
  const modulusFactor = b.isImperial ? 145.0377 : 1; // GPa to ksi
  const modulusUnit = b.isImperial ? "ksi" : "GPa";
  const dUnit = b.dimUnit;
  const dimensionStep = metric ? 1 : 0.05;

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Composite slab / layer</h4>
        <p className="mt-1 text-xs text-muted-foreground">A centered rectangular layer sits on top of the selected beam section. Enter the effective slab width for your case; the app does not derive code effective width. Defaults are typical steel and concrete elastic values.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BeamNumberField label="Effective slab width bₑff" value={b.compositeSlabWidth * b.dimFactor} unit={dUnit} min={metric ? 100 : 4} step={dimensionStep} onChange={(value) => b.setCompositeSlabWidth(b.dimToInternal(value))} />
        <BeamNumberField label="Slab thickness tₛ" value={b.compositeSlabThickness * b.dimFactor} unit={dUnit} min={metric ? 20 : 0.75} step={dimensionStep} onChange={(value) => b.setCompositeSlabThickness(b.dimToInternal(value))} />
      </div>
      <BeamNumberField
        label="Slab elastic modulus Eₛ"
        value={b.compositeSlabElasticModulus * modulusFactor}
        unit={modulusUnit}
        min={1}
        step={0.1}
        precision={2}
        onChange={(value) => b.setCompositeSlabElasticModulus(value / modulusFactor)}
      />
      <div className="grid grid-cols-2 gap-3">
        <BeamNumberField label="Slab compression limit" value={b.compositeSlabCompressiveStrength * b.displayUnits.yieldFactor} unit={b.displayUnits.yieldUnit} min={0.1} step={0.1} onChange={(value) => b.setCompositeSlabCompressiveStrength(value / b.displayUnits.yieldFactor)} />
        <BeamNumberField label="Slab tension limit" value={b.compositeSlabTensileStrength * b.displayUnits.yieldFactor} unit={b.displayUnits.yieldUnit} min={0.1} step={0.1} onChange={(value) => b.setCompositeSlabTensileStrength(value / b.displayUnits.yieldFactor)} />
      </div>
      <BeamNumberField
        label="Slab material unit weight γ₂"
        value={b.compositeSlabUnitWeight * b.displayUnits.unitWeight.factor}
        unit={b.displayUnits.unitWeight.unit}
        min={0}
        step={0.1}
        precision={2}
        onChange={(value) => b.setCompositeSlabUnitWeight(value / b.displayUnits.unitWeight.factor)}
      />
      <p className="text-[11px] text-muted-foreground">Strength limits are used for an elastic utilization screen. Concrete cracking, shear connectors, slip, effective slab width, creep, and code strength design are not modeled.</p>
    </div>
  );
}

/** Cross-section type selector, dimension inputs, and material properties */
function CrossSectionControls({ b }: { b: BeamHook }) {
  const du = b.displayUnits;
  const df = b.dimFactor;
  const dUnit = b.dimUnit;
  const metric = !b.isImperial;
  const widthMin = metric ? 50 : 2;
  const heightMin = metric ? 100 : 4;
  const dimensionStep = metric ? 1 : 0.05;
  const innerWidthMin = metric ? 30 : 1;
  const innerHeightMin = metric ? 60 : 2;
  const wallClearance = metric ? 20 : 0.5;

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
          <BeamNumberField label="Width b" value={b.sectionWidth * df} unit={dUnit} min={widthMin} step={dimensionStep} onChange={(v) => b.setSectionWidth(b.dimToInternal(v))} />
          <BeamNumberField label="Height h" value={b.sectionHeight * df} unit={dUnit} min={heightMin} step={dimensionStep} onChange={(v) => b.setSectionHeight(b.dimToInternal(v))} />
        </>
      )}
      {b.crossSectionType === "circular" && (
        <BeamNumberField label="Diameter d" value={b.sectionDiameter * df} unit={dUnit} min={widthMin} step={dimensionStep} onChange={(v) => b.setSectionDiameter(b.dimToInternal(v))} />
      )}
      {b.crossSectionType === "hollow-rectangular" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <BeamNumberField
              label="Outer width"
              value={b.sectionWidth * df}
              unit={dUnit}
              min={widthMin}
              step={dimensionStep}
              onChange={(v) => {
                b.setSectionWidth(b.dimToInternal(v));
                const maxInnerWidth = v - wallClearance;
                if (b.innerWidth * df > maxInnerWidth) b.setInnerWidth(b.dimToInternal(Math.max(innerWidthMin, maxInnerWidth)));
              }}
            />
            <BeamNumberField
              label="Outer height"
              value={b.sectionHeight * df}
              unit={dUnit}
              min={heightMin}
              step={dimensionStep}
              onChange={(v) => {
                b.setSectionHeight(b.dimToInternal(v));
                const maxInnerHeight = v - wallClearance;
                if (b.innerHeight * df > maxInnerHeight) b.setInnerHeight(b.dimToInternal(Math.max(innerHeightMin, maxInnerHeight)));
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <BeamNumberField label="Inner width" value={b.innerWidth * df} unit={dUnit} min={innerWidthMin} max={b.sectionWidth * df - wallClearance} step={dimensionStep} onChange={(v) => b.setInnerWidth(b.dimToInternal(v))} />
            <BeamNumberField label="Inner height" value={b.innerHeight * df} unit={dUnit} min={innerHeightMin} max={b.sectionHeight * df - wallClearance} step={dimensionStep} onChange={(v) => b.setInnerHeight(b.dimToInternal(v))} />
          </div>
        </>
      )}
      {b.crossSectionType === "hollow-circular" && (
        <>
          <BeamNumberField
            label="Outer diameter"
            value={b.sectionDiameter * df}
            unit={dUnit}
            min={widthMin}
            step={dimensionStep}
            onChange={(v) => {
              b.setSectionDiameter(b.dimToInternal(v));
              const maxInnerDiameter = v - (metric ? 10 : 0.25);
              if (b.innerDiameter * df > maxInnerDiameter) b.setInnerDiameter(b.dimToInternal(Math.max(innerWidthMin, maxInnerDiameter)));
            }}
          />
          <BeamNumberField label="Inner diameter" value={b.innerDiameter * df} unit={dUnit} min={innerWidthMin} max={b.sectionDiameter * df - (metric ? 10 : 0.25)} step={dimensionStep} onChange={(v) => b.setInnerDiameter(b.dimToInternal(v))} />
        </>
      )}
      {b.crossSectionType === "i-beam" && (
        <>
          <BeamNumberField
            label="Total height"
            value={b.sectionHeight * df}
            unit={dUnit}
            min={metric ? 150 : 6}
            step={dimensionStep}
            onChange={(v) => {
              b.setSectionHeight(b.dimToInternal(v));
              const maxFlangeThickness = v / 2 - (metric ? 5 : 0.2);
              if (b.flangeThickness * df > maxFlangeThickness) b.setFlangeThickness(b.dimToInternal(Math.max(metric ? 5 : 0.2, maxFlangeThickness)));
            }}
          />
          <BeamNumberField
            label="Flange width"
            value={b.flangeWidth * df}
            unit={dUnit}
            min={widthMin}
            step={dimensionStep}
            onChange={(v) => {
              b.setFlangeWidth(b.dimToInternal(v));
              const maxWebThickness = v - (metric ? 5 : 0.2);
              if (b.webThickness * df > maxWebThickness) b.setWebThickness(b.dimToInternal(Math.max(metric ? 5 : 0.2, maxWebThickness)));
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <BeamNumberField label="Flange thickness" value={b.flangeThickness * df} unit={dUnit} min={metric ? 5 : 0.2} max={b.sectionHeight * df / 2 - (metric ? 5 : 0.2)} step={metric ? 1 : 0.05} onChange={(v) => b.setFlangeThickness(b.dimToInternal(v))} />
            <BeamNumberField label="Web thickness" value={b.webThickness * df} unit={dUnit} min={metric ? 5 : 0.2} max={b.flangeWidth * df - (metric ? 5 : 0.2)} step={metric ? 1 : 0.05} onChange={(v) => b.setWebThickness(b.dimToInternal(v))} />
          </div>
        </>
      )}

      <BeamNumberField
        label={b.beamType === "composite" ? "Primary beam elastic modulus E₁" : "Elastic modulus E"}
        value={b.elasticModulus * (b.isImperial ? 145.0377 : 1)}
        unit={b.isImperial ? "ksi" : "GPa"}
        min={1}
        step={0.1}
        precision={2}
        onChange={(value) => b.setElasticModulus(value / (b.isImperial ? 145.0377 : 1))}
      />

      <BeamNumberField
        label={b.beamType === "composite" ? <>Primary beam strength limit σ<sub>y,1</sub></> : <>Yield Strength σ<sub>y</sub></>}
        value={b.yieldStrength * du.yieldFactor}
        unit={du.yieldUnit}
        min={1}
        step={1}
        onChange={(displayValue) => {
          const value = displayValue / du.yieldFactor;
          b.setYieldStrength(value);
          if (b.ctx.isSynced) b.ctx.setResistanceMean(value);
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <BeamNumberField label="Strength COV" value={b.strengthCOV * 100} unit="%" min={0} step={0.1} onChange={(v) => { const cov = v / 100; b.setStrengthCOV(cov); if (b.ctx.isSynced) b.ctx.setResistanceCoV(cov); }} />
        <BeamNumberField label="Load COV" value={b.loadCOV * 100} unit="%" min={0} step={0.1} onChange={(v) => { const cov = v / 100; b.setLoadCOV(cov); if (b.ctx.isSynced) b.ctx.setLoadVariance(Math.pow(cov * b.ctx.loadMean, 2)); }} />
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
