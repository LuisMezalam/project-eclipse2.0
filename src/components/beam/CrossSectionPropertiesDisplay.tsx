/** Compact summary of calculated cross-section properties. */

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
  composite?: boolean;
  laminate?: boolean;
}

export function CrossSectionPropertiesDisplay({ crossSectionType, sectionProps, displayUnits, composite = false, laminate = false }: Props) {
  const du = displayUnits ?? {
    area: { factor: 1e4, unit: "cm²" },
    inertia: { factor: 1e8, unit: "cm⁴" },
    sectionMod: { factor: 1e6, unit: "cm³" },
    radius: { factor: 100, unit: "cm" },
  };

  const title = laminate
    ? "Laminate gross properties"
    : composite
      ? "Primary beam properties"
      : "Cross-section properties";
  const metrics = [
    { label: "Area A", value: `${(sectionProps.area * du.area.factor).toFixed(2)} ${du.area.unit}` },
    { label: "Moment of inertia I", value: `${(sectionProps.momentOfInertia * du.inertia.factor).toFixed(2)} ${du.inertia.unit}`, accent: "text-primary" },
    { label: "Polar moment J", value: `${(sectionProps.polarMomentOfInertia * du.inertia.factor).toFixed(2)} ${du.inertia.unit}`, accent: "text-accent" },
    { label: "Section modulus S", value: `${(sectionProps.sectionModulus * du.sectionMod.factor).toFixed(2)} ${du.sectionMod.unit}` },
    { label: "Radius of gyration r", value: `${(sectionProps.radiusOfGyration * du.radius.factor).toFixed(2)} ${du.radius.unit}` },
  ];

  return (
    <section className="glass-card p-3 md:p-4" aria-label={`${title} - ${getCrossSectionLabel(crossSectionType)}`}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">· {getCrossSectionLabel(crossSectionType)}</span>
      </h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-md bg-muted/25 px-3 py-2">
            <dt className="text-[10px] leading-tight text-muted-foreground">{metric.label}</dt>
            <dd className={`mt-1 truncate font-mono text-sm font-semibold text-foreground ${metric.accent ?? ""}`} title={metric.value}>
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
