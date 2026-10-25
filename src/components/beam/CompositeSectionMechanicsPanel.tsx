import { AlertTriangle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KaTeXFormula } from "@/components/KaTeXFormula";
import { getFormulaById } from "@/lib/formulaLibrary";
import type { CompositeSectionProperties } from "@/lib/reliability";

interface CompositeSectionMechanicsPanelProps {
  section: CompositeSectionProperties;
  slabWidth: number;
  slabThickness: number;
  beamElasticModulus: number;
  slabElasticModulus: number;
  governingMoment: number;
  displayUnits: {
    area: { factor: number; unit: string };
    length: { factor: number; unit: string };
    inertia: { factor: number; unit: string };
    sectionMod: { factor: number; unit: string };
    rigidity: { factor: number; unit: string };
    moment: { factor: number; unit: string };
    stress: { factor: number; unit: string };
  };
}

export function CompositeSectionMechanicsPanel({
  section,
  slabWidth,
  slabThickness,
  beamElasticModulus,
  slabElasticModulus,
  governingMoment,
  displayUnits,
}: CompositeSectionMechanicsPanelProps) {
  const formula = getFormulaById("composite-section-elastic");
  const momentMagnitude = Math.abs(governingMoment);
  const isPositiveMoment = governingMoment >= 0;
  const rows = section.layers.flatMap((layer) => ([
    { layer, y: layer.topY, coefficient: layer.topStressCoefficient, label: "Top fiber" },
    { layer, y: layer.bottomY, coefficient: layer.bottomStressCoefficient, label: "Bottom fiber" },
  ])).map(({ layer, y, coefficient, label }) => {
    const aboveNeutralAxis = y > section.elasticNeutralAxis;
    const isCompression = isPositiveMoment ? aboveNeutralAxis : !aboveNeutralAxis;
    const stressLimit = isCompression ? layer.compressiveStrength : layer.tensileStrength;
    const stress = momentMagnitude * coefficient;
    return {
      key: `${layer.material}-${label}`,
      material: layer.material,
      fiber: label,
      state: isCompression ? "Compression" : "Tension",
      stress,
      stressLimit,
      utilization: stress / stressLimit,
    };
  });
  const controllingRow = rows.reduce((highest, row) => row.utilization > highest.utilization ? row : highest);

  return (
    <Card className="glass-card border-primary/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          Composite Section Mechanics
          <Badge variant="outline" className="ml-auto text-[10px]">Elastic transformed section</Badge>
        </CardTitle>
        <CardDescription>
          Each material contributes to the neutral axis and flexural rigidity according to its modulus and area.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formula && (
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Library equations used by this analysis</div>
            <div className="overflow-x-auto text-primary">
              {formula.latex ? <KaTeXFormula latex={formula.latex} /> : <code>{formula.formula}</code>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{formula.description}</p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Composite material area" value={`${(section.area * displayUnits.area.factor).toFixed(3)} ${displayUnits.area.unit}`} />
          <Metric label="Elastic neutral axis from beam bottom" value={`${(section.elasticNeutralAxis * displayUnits.length.factor).toFixed(3)} ${displayUnits.length.unit}`} />
          <Metric label="Overall composite depth" value={`${(section.totalDepth * displayUnits.length.factor).toFixed(3)} ${displayUnits.length.unit}`} />
          <Metric label="Modular ratio Eslab / Ebeam" value={(slabElasticModulus / Math.max(beamElasticModulus, 1e-9)).toFixed(3)} />
          <Metric label="Composite flexural rigidity EI" value={`${(section.flexuralRigidity * displayUnits.rigidity.factor).toFixed(3)} ${displayUnits.rigidity.unit}`} />
          <Metric label="Transformed I (beam material reference)" value={`${(section.transformedMomentOfInertia * displayUnits.inertia.factor).toFixed(3)} ${displayUnits.inertia.unit}`} />
          <Metric label="Effective section modulus" value={`${(section.effectiveSectionModulus * displayUnits.sectionMod.factor).toFixed(3)} ${displayUnits.sectionMod.unit}`} />
          <Metric label="Effective slab width × thickness" value={`${(slabWidth * displayUnits.length.factor).toFixed(3)} × ${(slabThickness * displayUnits.length.factor).toFixed(3)} ${displayUnits.length.unit}`} />
          <Metric label="Moment used for layer stresses" value={`${(governingMoment * displayUnits.moment.factor).toFixed(3)} ${displayUnits.moment.unit}`} />
          <Metric label="Controlling fiber utilization" value={`${(controllingRow.utilization * 100).toFixed(1)}% · ${controllingRow.material}`} />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Fiber</th>
                <th className="p-2 text-left font-medium">Material</th>
                <th className="p-2 text-left font-medium">Stress state</th>
                <th className="p-2 text-right font-medium">Stress</th>
                <th className="p-2 text-right font-medium">Input limit</th>
                <th className="p-2 text-right font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border/60">
                  <td className="p-2">{row.fiber}</td>
                  <td className="p-2">{row.material}</td>
                  <td className="p-2">{row.state}</td>
                  <td className="p-2 text-right font-mono">{(row.stress * displayUnits.stress.factor).toFixed(3)} {displayUnits.stress.unit}</td>
                  <td className="p-2 text-right font-mono">{(row.stressLimit * displayUnits.stress.factor).toFixed(3)} {displayUnits.stress.unit}</td>
                  <td className={`p-2 text-right font-mono ${row.utilization >= 1 ? "text-destructive" : ""}`}>{(row.utilization * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            Assumes the entered slab width is already the effective width, with a centered, fully bonded slab, no interface slip, and an uncracked linear-elastic section. The reliability screen applies one resistance CoV to the governing material-equivalent stress limit; it does not model independent material variability. It does not derive code effective width or check connector capacity, creep/shrinkage, staged construction, lateral stability, or code flexural strength. Use project-specific tensile and compressive limits; this is a mechanics screen, not a design-code check.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
