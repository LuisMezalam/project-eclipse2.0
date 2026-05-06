/**
 * InfluenceLines — shear, moment, and deflection influence line charts
 * with load markers and contributions table.
 */

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceArea } from "recharts";
import { Slider } from "@/components/ui/slider";
import { chartTooltipStyle, loadColors } from "./beamTypes";
import type { LoadType, InfluencePoint } from "@/lib/reliability";

interface LoadMarker {
  position: number;
  intensity: number;
  type: LoadType;
  label: string;
  endPosition?: number;
  color: string;
}

interface LoadContribution {
  label: string;
  color: string;
  shear: number;
  moment: number;
  type: LoadType;
  intensity: number;
}

interface DisplayUnits {
  force: { factor: number; unit: string };
  moment: { factor: number; unit: string };
  deflection: { factor: number; unit: string };
  length: { unit: string };
  distForce: { factor: number; unit: string };
}

interface InfluenceLinesProps {
  influenceData: InfluencePoint[];
  influenceMeasurePoint: number;
  setInfluenceMeasurePoint: (v: number) => void;
  beamLength: number;
  loadMarkers: LoadMarker[];
  loadMode: "single" | "hybrid";
  influenceEffects: { shear: number; moment: number };
  loadContributions: LoadContribution[];
  displayUnits: DisplayUnits;
}

/** Convert position in meters to display length */
function posToDisplay(posM: number, lengthUnit: string): number {
  return lengthUnit === "ft" ? posM / 0.3048 : posM;
}

export function InfluenceLines({
  influenceData, influenceMeasurePoint, setInfluenceMeasurePoint,
  beamLength, loadMarkers, loadMode, influenceEffects, loadContributions,
  displayUnits: du,
}: InfluenceLinesProps) {
  const isImperial = du.length.unit === "ft";
  const lu = du.length.unit;

  // Convert influence data positions to display units
  // shearAt is dimensionless, momentAt is in meters → display length, deflectionAt is in mm → display
  const displayData = influenceData.map(d => ({
    ...d,
    loadPosition: posToDisplay(d.loadPosition, lu),
    momentAt: isImperial ? d.momentAt / 0.3048 : d.momentAt,
    deflectionAt: isImperial ? d.deflectionAt / 25.4 : d.deflectionAt,
  }));

  const displayBeamLength = posToDisplay(beamLength, lu);
  const xm = (influenceMeasurePoint * displayBeamLength).toFixed(2);
  const deflUnit = isImperial ? "in" : "mm";
  const momentILUnit = lu; // IL(M) has length units

  // Convert load contributions to display units
  // shear: already in kN, moment: already in kN·m
  const displayContributions = loadContributions.map(c => ({
    ...c,
    shear: c.shear * du.force.factor * 1000,       // kN → N → display
    moment: c.moment * du.moment.factor * 1000,     // kN·m → N·m → display
    intensity: c.intensity,                          // raw N, convert below
  }));
  const displayEffects = {
    shear: influenceEffects.shear * du.force.factor * 1000,
    moment: influenceEffects.moment * du.moment.factor * 1000,
  };

  const displayMarkers = loadMarkers.map(m => ({
    ...m,
    position: posToDisplay(m.position, lu),
    endPosition: m.endPosition !== undefined ? posToDisplay(m.endPosition, lu) : undefined,
  }));

  const renderMarkers = (prefix: string) =>
    displayMarkers.map((marker, idx) =>
      marker.endPosition !== undefined ? (
        <ReferenceArea key={`${prefix}-area-${idx}`} x1={marker.position} x2={marker.endPosition}
          fill={marker.color} fillOpacity={0.2} stroke={marker.color} strokeOpacity={0.5}
          label={{ value: marker.label, fill: marker.color, fontSize: 9, position: "insideTop" }} />
      ) : (
        <ReferenceLine key={`${prefix}-marker-${idx}`} x={marker.position} stroke={marker.color} strokeWidth={2}
          label={{ value: marker.label, fill: marker.color, fontSize: 9, position: "top" }} />
      )
    );

  const chartProps = { margin: { top: 10, right: 10, left: 0, bottom: 0 } };

  const getIntensityDisplay = (contrib: LoadContribution) => {
    if (contrib.type === "concentrated" || contrib.type === "moving") {
      return `${(contrib.intensity * du.force.factor).toFixed(2)} ${du.force.unit}`;
    }
    return `${(contrib.intensity * du.distForce.factor).toFixed(2)} ${du.distForce.unit}`;
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Influence Lines</h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground">
            Measurement Point: {xm} {lu} ({(influenceMeasurePoint * 100).toFixed(0)}%)
          </label>
          <Slider value={[influenceMeasurePoint]} onValueChange={([v]) => setInfluenceMeasurePoint(v)}
            min={0.05} max={0.95} step={0.05} className="w-40" />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Shear IL */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Shear Influence Line at x = {xm} {lu}</h4>
          <div className="chart-container h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} {...chartProps}>
                <defs>
                  <linearGradient id="ilShearGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="loadPosition" stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `Load Position (${lu})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: "IL (V)", angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number) => [`${v.toFixed(3)}`, "IL(V)"]}
                  labelFormatter={(l) => `Load at ${Number(l).toFixed(2)} ${lu}`} />
                <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                <ReferenceLine x={influenceMeasurePoint * displayBeamLength} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" />
                {renderMarkers("shear")}
                <Area type="monotone" dataKey="shearAt" stroke="hsl(262 83% 58%)" strokeWidth={2} fill="url(#ilShearGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moment IL */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Moment Influence Line at x = {xm} {lu}</h4>
          <div className="chart-container h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} {...chartProps}>
                <defs>
                  <linearGradient id="ilMomentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="loadPosition" stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `Load Position (${lu})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `IL (M) ${momentILUnit}`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number) => [`${v.toFixed(3)} ${momentILUnit}`, "IL(M)"]}
                  labelFormatter={(l) => `Load at ${Number(l).toFixed(2)} ${lu}`} />
                <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                <ReferenceLine x={influenceMeasurePoint * displayBeamLength} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" />
                {renderMarkers("moment")}
                <Area type="monotone" dataKey="momentAt" stroke="hsl(45 93% 47%)" strokeWidth={2} fill="url(#ilMomentGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deflection IL */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Deflection Influence Line at x = {xm} {lu}</h4>
          <div className="chart-container h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} {...chartProps}>
                <defs>
                  <linearGradient id="ilDeflGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="loadPosition" stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `Load Position (${lu})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `IL (δ) ${deflUnit}`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number) => [`${v.toFixed(4)} ${deflUnit}/${du.force.unit}`, "IL(δ)"]}
                  labelFormatter={(l) => `Load at ${Number(l).toFixed(2)} ${lu}`} />
                <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                <ReferenceLine x={influenceMeasurePoint * displayBeamLength} stroke="hsl(0 84% 60%)" strokeDasharray="3 3" />
                {renderMarkers("defl")}
                <Area type="monotone" dataKey="deflectionAt" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#ilDeflGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {loadMode === "hybrid" && loadMarkers.length > 0 ? (
          loadMarkers.map((marker, idx) => (
            <div key={`legend-${idx}`} className="flex items-center gap-1">
              {marker.endPosition !== undefined ? (
                <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: marker.color, opacity: 0.4 }} />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: marker.color }} />
              )}
              <span style={{ color: marker.color }}>{marker.label}</span>
            </div>
          ))
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
              <span>Point loads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: "hsl(142 71% 45%)", opacity: 0.3 }} />
              <span>Distributed loads</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5" style={{ backgroundColor: "hsl(0 84% 60%)", borderTop: "2px dashed" }} />
          <span>Measurement point</span>
        </div>
        {loadMarkers.length > 0 && (
          <div className="ml-auto flex gap-4">
            <span className="text-chart-posterior">V at x<sub>m</sub> ≈ {displayEffects.shear.toFixed(2)} {du.force.unit}</span>
            <span className="text-primary">M at x<sub>m</sub> ≈ {displayEffects.moment.toFixed(2)} {du.moment.unit}</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground/70">
        Influence lines show how a unit load at different positions affects shear, moment, and deflection at the measurement point.
      </p>

      {/* Load Contributions Table */}
      {displayContributions.length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-border">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>Load Contributions at x = {xm} {lu}</span>
            <span className="text-xs font-normal text-muted-foreground">(via Influence Lines)</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Load</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Type</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Intensity</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">V contribution</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">M contribution</th>
                </tr>
              </thead>
              <tbody>
                {displayContributions.map((contrib, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: contrib.color }} />
                        <span style={{ color: contrib.color }} className="font-semibold">{contrib.label}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground capitalize">{contrib.type.replace("-", " ")}</td>
                    <td className="py-2 px-2 text-right font-mono">
                      {getIntensityDisplay(loadContributions[idx])}
                    </td>
                    <td className="py-2 px-2 text-right font-mono" style={{ color: contrib.shear !== 0 ? contrib.color : undefined }}>
                      {contrib.shear.toFixed(3)} {du.force.unit}
                    </td>
                    <td className="py-2 px-2 text-right font-mono" style={{ color: contrib.moment !== 0 ? contrib.color : undefined }}>
                      {contrib.moment.toFixed(3)} {du.moment.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={3} className="py-2 px-2 text-foreground">Total (Superposition)</td>
                  <td className="py-2 px-2 text-right font-mono text-chart-posterior">{displayEffects.shear.toFixed(3)} {du.force.unit}</td>
                  <td className="py-2 px-2 text-right font-mono text-primary">{displayEffects.moment.toFixed(3)} {du.moment.unit}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Values computed using influence line ordinates multiplied by load intensity (point loads) or integrated over load region (distributed loads).
          </p>
        </div>
      )}
    </div>
  );
}
