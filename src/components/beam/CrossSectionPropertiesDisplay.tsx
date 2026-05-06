/**
 * Cross-section properties summary cards.
 */

import type { CrossSectionProperties, CrossSectionType } from "@/lib/reliability";
import { getCrossSectionLabel } from "./beamTypes";

interface DisplayUnits {
  area: { factor: number; unit: string };
  inertia: { factor: number; unit: string };
  sectionMod: { factor: number; unit: string };
  radius: { factor: number; unit: string };
}

interface Props {
  crossSectionType: CrossSectionType;
  sectionProps: CrossSectionProperties;
  displayUnits?: DisplayUnits;
}

export function CrossSectionPropertiesDisplay({ crossSectionType, sectionProps, displayUnits }: Props) {
  const du = displayUnits ?? {
    area: { factor: 1e4, unit: "cm²" },
    inertia: { factor: 1e8, unit: "cm⁴" },
    sectionMod: { factor: 1e6, unit: "cm³" },
    radius: { factor: 100, unit: "cm" },
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Cross-Section Properties - {getCrossSectionLabel(crossSectionType)}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Area A</div>
          <div className="text-lg font-bold font-mono text-foreground">{(sectionProps.area * du.area.factor).toFixed(2)} {du.area.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">Moment of Inertia I</div>
          <div className="text-lg font-bold font-mono text-primary">{(sectionProps.momentOfInertia * du.inertia.factor).toFixed(2)} {du.inertia.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
          <div className="text-xs text-muted-foreground">Polar Moment J</div>
          <div className="text-lg font-bold font-mono text-accent">{(sectionProps.polarMomentOfInertia * du.inertia.factor).toFixed(2)} {du.inertia.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Section Modulus S</div>
          <div className="text-lg font-bold font-mono text-foreground">{(sectionProps.sectionModulus * du.sectionMod.factor).toFixed(2)} {du.sectionMod.unit}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground">Radius of Gyration r</div>
          <div className="text-lg font-bold font-mono text-foreground">{(sectionProps.radiusOfGyration * du.radius.factor).toFixed(2)} {du.radius.unit}</div>
        </div>
      </div>
    </div>
  );
}
