/**
 * EnvelopeDiagrams — moving load envelopes for shear, moment, and deflection.
 */

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { chartTooltipStyle } from "./beamTypes";
import type { EnvelopePoint } from "@/lib/reliability";

interface DisplayUnits {
  force: { factor: number; unit: string };
  moment: { factor: number; unit: string };
  deflection: { factor: number; unit: string };
  length: { unit: string };
}

interface EnvelopeDiagramsProps {
  envelopeData: EnvelopePoint[];
  displayUnits: DisplayUnits;
}

export function EnvelopeDiagrams({ envelopeData, displayUnits: du }: EnvelopeDiagramsProps) {
  const isImperial = du.length.unit === "ft";
  const lu = du.length.unit;

  // Envelope data: x in m, shear in kN, moment in kN·m, deflection in mm
  // For imperial: kN → kip (×0.224809), kN·m → kip·ft (×0.737562), mm → in (÷25.4), m → ft
  const shearFactor = isImperial ? 0.224809 : 1;
  const momentFactor = isImperial ? 0.737562 : 1;
  const deflFactor = isImperial ? 1 / 25.4 : 1;
  const posFactor = isImperial ? 1 / 0.3048 : 1;
  const deflUnit = isImperial ? "in" : "mm";

  const displayData = envelopeData.map(d => ({
    x: +(d.x * posFactor).toFixed(4),
    maxShear: d.maxShear * shearFactor,
    minShear: d.minShear * shearFactor,
    maxMoment: d.maxMoment * momentFactor,
    minMoment: d.minMoment * momentFactor,
    maxDeflection: d.maxDeflection * deflFactor,
    minDeflection: d.minDeflection * deflFactor,
  }));

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Moving Load Envelope Diagrams</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Envelope shows max/min values at each point as the load traverses the beam.
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        {/* Shear Envelope */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Shear Force Envelope</h4>
          <div className="chart-container h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="envShearMaxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(262 83% 58%)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="envShearMinGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `Position (${lu})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `V (${du.force.unit})`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number, name: string) => [`${v.toFixed(2)} ${du.force.unit}`, name === "maxShear" ? "V_max" : "V_min"]}
                  labelFormatter={(l) => `x = ${Number(l).toFixed(2)} ${lu}`} />
                <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                <Area type="monotone" dataKey="maxShear" stroke="hsl(262 83% 58%)" strokeWidth={2} fill="url(#envShearMaxGrad)" name="maxShear" />
                <Area type="monotone" dataKey="minShear" stroke="hsl(0 84% 60%)" strokeWidth={2} fill="url(#envShearMinGrad)" name="minShear" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moment Envelope */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Bending Moment Envelope</h4>
          <div className="chart-container h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="envMomentMaxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 93% 47%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(45 93% 47%)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="envMomentMinGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `Position (${lu})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `M (${du.moment.unit})`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number, name: string) => [`${v.toFixed(2)} ${du.moment.unit}`, name === "maxMoment" ? "M_max" : "M_min"]}
                  labelFormatter={(l) => `x = ${Number(l).toFixed(2)} ${lu}`} />
                <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                <Area type="monotone" dataKey="maxMoment" stroke="hsl(45 93% 47%)" strokeWidth={2} fill="url(#envMomentMaxGrad)" name="maxMoment" />
                <Area type="monotone" dataKey="minMoment" stroke="hsl(0 84% 60%)" strokeWidth={2} fill="url(#envMomentMinGrad)" name="minMoment" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deflection Envelope */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Deflection Envelope</h4>
          <div className="chart-container h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="envDeflMaxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="envDeflMinGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="hsl(199 89% 48%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="x" stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `Position (${lu})`, position: "bottom", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={10}
                  label={{ value: `δ (${deflUnit})`, angle: -90, position: "insideLeft", fill: "hsl(215 20% 65%)", fontSize: 9 }} />
                <Tooltip contentStyle={chartTooltipStyle}
                  formatter={(v: number, name: string) => [`${v.toFixed(3)} ${deflUnit}`, name === "maxDeflection" ? "δ_max" : "δ_min"]}
                  labelFormatter={(l) => `x = ${Number(l).toFixed(2)} ${lu}`} />
                <ReferenceLine y={0} stroke="hsl(215 20% 65%)" />
                <Area type="monotone" dataKey="maxDeflection" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#envDeflMaxGrad)" name="maxDeflection" />
                <Area type="monotone" dataKey="minDeflection" stroke="hsl(199 89% 48%)" strokeWidth={2} fill="url(#envDeflMinGrad)" name="minDeflection" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-chart-posterior/10 border border-chart-posterior/30">
          <div className="text-xs text-muted-foreground">Max Shear</div>
          <div className="text-lg font-semibold text-chart-posterior">{Math.max(...displayData.map(d => d.maxShear)).toFixed(2)} {du.force.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="text-xs text-muted-foreground">Min Shear</div>
          <div className="text-lg font-semibold text-destructive">{Math.min(...displayData.map(d => d.minShear)).toFixed(2)} {du.force.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">Max Moment</div>
          <div className="text-lg font-semibold text-primary">{Math.max(...displayData.map(d => d.maxMoment)).toFixed(2)} {du.moment.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="text-xs text-muted-foreground">Min Moment</div>
          <div className="text-lg font-semibold text-destructive">{Math.min(...displayData.map(d => d.minMoment)).toFixed(2)} {du.moment.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
          <div className="text-xs text-muted-foreground">Max Deflection</div>
          <div className="text-lg font-semibold text-accent">{Math.max(...displayData.map(d => d.maxDeflection)).toFixed(3)} {deflUnit}</div>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">Min Deflection</div>
          <div className="text-lg font-semibold text-primary">{Math.min(...displayData.map(d => d.minDeflection)).toFixed(3)} {deflUnit}</div>
        </div>
      </div>
    </div>
  );
}
