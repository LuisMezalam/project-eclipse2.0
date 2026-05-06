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
}

export function BeamResultsGrid({ beamResult, yieldStrength, beamLength, displayUnits }: BeamResultsGridProps) {
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
  const serviceLimitDisplay = (beamLength / 250) * du.deflection.factor;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="glass-card p-4">
        <div className="text-xs text-muted-foreground">Total Load W</div>
        <div className="text-xl font-bold font-mono text-foreground">{(beamResult.totalLoad * du.force.factor).toFixed(1)} {du.force.unit}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-xs text-muted-foreground">Centroid x̄</div>
        <div className="text-xl font-bold font-mono text-foreground">{(beamResult.centroidX * du.length.factor).toFixed(2)} {du.length.unit}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-xs text-muted-foreground">Max Shear V<sub>max</sub></div>
        <div className="text-xl font-bold font-mono text-foreground">{(beamResult.maxShear * du.force.factor).toFixed(1)} {du.force.unit}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-xs text-muted-foreground">Max Moment M<sub>max</sub></div>
        <div className="text-xl font-bold font-mono text-foreground">{(beamResult.maxBendingMoment * du.moment.factor).toFixed(1)} {du.moment.unit}</div>
      </div>
      <div className="glass-card p-4">
        <div className="text-xs text-muted-foreground">Max Stress σ<sub>max</sub></div>
        <div className={`text-xl font-bold font-mono ${stressDisplay > yieldDisplay ? "text-destructive" : "text-foreground"}`}>
          {stressDisplay.toFixed(1)} {du.stress.unit}
        </div>
      </div>
      <div className="glass-card p-4">
        <div className="text-xs text-muted-foreground">Max Deflection δ<sub>max</sub></div>
        <div className={`text-xl font-bold font-mono ${deflDisplay > serviceLimitDisplay ? "text-destructive" : "text-accent"}`}>
          {deflDisplay.toFixed(2)} {du.deflection.unit}
        </div>
      </div>
    </div>
  );
}
