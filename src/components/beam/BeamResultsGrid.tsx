/**
 * BeamResultsGrid — summary metrics cards for beam analysis.
 */

import type { BeamAnalysis } from "@/lib/reliability";

interface DisplayUnits {
  force: { factor: number; unit: string };
  moment: { factor: number; unit: string };
  stress: { factor: number; unit: string };
  deflection: { factor: number; unit: string };
  length: { factor: number; unit: string };
  yieldUnit: string;
  yieldFactor: number;
}

interface BeamResultsGridProps {
  beamResult: BeamAnalysis;
  yieldStrength: number;
  beamLength: number;
  displayUnits?: DisplayUnits;
  composite?: boolean;
}

export function BeamResultsGrid({ beamResult, yieldStrength, beamLength, displayUnits, composite = false }: BeamResultsGridProps) {
  const du: DisplayUnits = displayUnits ?? {
    force: { factor: 1 / 1000, unit: "kN" },
    moment: { factor: 1 / 1000, unit: "kN·m" },
    stress: { factor: 1 / 1e6, unit: "MPa" },
    deflection: { factor: 1000, unit: "mm" },
    length: { factor: 1, unit: "m" },
    yieldUnit: "MPa",
    yieldFactor: 1,
  };

  const stressDisplay = beamResult.maxStress * du.stress.factor;
  const yieldDisplay = yieldStrength * du.yieldFactor;
  const deflDisplay = beamResult.maxDeflection * du.deflection.factor;
  const minDeflDisplay = (beamResult.minDeflection ?? 0) * du.deflection.factor;
  const serviceLimitDisplay = (beamLength / 250) * du.deflection.factor;
  const deflectionExceedsLimit = Math.max(Math.abs(deflDisplay), Math.abs(minDeflDisplay)) > serviceLimitDisplay;

  const metrics = [
    { label: "Total Load W", value: `${(beamResult.totalLoad * du.force.factor).toFixed(1)} ${du.force.unit}` },
    { label: "Centroid x̄", value: `${(beamResult.centroidX * du.length.factor).toFixed(2)} ${du.length.unit}` },
    { label: "Max Shear Vmax", value: `${(beamResult.maxShear * du.force.factor).toFixed(1)} ${du.force.unit}` },
    { label: "Min Shear Vmin", value: `${((beamResult.minShear ?? 0) * du.force.factor).toFixed(1)} ${du.force.unit}` },
    { label: "Max Moment Mmax", value: `${(beamResult.maxBendingMoment * du.moment.factor).toFixed(1)} ${du.moment.unit}` },
    { label: "Min Moment Mmin", value: `${((beamResult.minBendingMoment ?? 0) * du.moment.factor).toFixed(1)} ${du.moment.unit}` },
    { label: "Max Deflection Dmax", value: `${deflDisplay.toFixed(2)} ${du.deflection.unit}`, alert: deflectionExceedsLimit },
    { label: "Min Deflection Dmin", value: `${minDeflDisplay.toFixed(2)} ${du.deflection.unit}`, alert: deflectionExceedsLimit },
    { label: composite ? "Max Material Stress σmax" : "Max Stress σmax", value: `${stressDisplay.toFixed(1)} ${du.stress.unit}`, alert: stressDisplay > yieldDisplay },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="glass-card p-4">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className={`text-xl font-bold font-mono ${metric.alert ? "text-destructive" : "text-foreground"}`}>
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
