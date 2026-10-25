import { AlertTriangle, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KaTeXFormula } from "@/components/KaTeXFormula";
import { getFormulaById } from "@/lib/formulaLibrary";
import type { LaminatePlyStressCoefficients, LaminateSectionProperties } from "@/lib/reliability";

interface LaminateMechanicsPanelProps {
  section: LaminateSectionProperties;
  governingMoment: number;
  displayUnits: {
    force: { factor: number; unit: string };
    length: { factor: number; unit: string };
    moment: { factor: number; unit: string };
    stress: { factor: number; unit: string };
    rigidity: { factor: number; unit: string };
    sectionMod: { factor: number; unit: string };
  };
}

function failureIndex(stress: LaminatePlyStressCoefficients, allowables: { Xt: number; Xc: number; Yt: number; Yc: number; S12: number }) {
  return Math.max(
    Math.abs(stress.sigma1) / (stress.sigma1 >= 0 ? allowables.Xt : allowables.Xc),
    Math.abs(stress.sigma2) / (stress.sigma2 >= 0 ? allowables.Yt : allowables.Yc),
    Math.abs(stress.tau12) / allowables.S12,
  );
}

function MatrixView({ title, matrix, factor, unit }: { title: string; matrix: number[][]; factor: number; unit: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/60 p-3">
      <h4 className="mb-1 text-xs font-semibold text-foreground">[{title}] <span className="font-normal text-muted-foreground">({unit})</span></h4>
      <div className="grid grid-cols-3 gap-1 font-mono text-[10px] tabular-nums text-muted-foreground">
        {matrix.flatMap((row, i) => row.map((value, j) => (
          <span key={`${i}-${j}`} className="rounded bg-muted/30 px-1 py-1 text-right" title={`${title}${i + 1}${j + 1}`}>
            {(value * factor).toExponential(2)}
          </span>
        )))}
      </div>
    </div>
  );
}

export function LaminateMechanicsPanel({ section, governingMoment, displayUnits }: LaminateMechanicsPanelProps) {
  const formula = getFormulaById("laminated-composite-beam-clt");
  const momentMagnitude = Math.abs(governingMoment);
  const isPositiveMoment = governingMoment >= 0;
  const utilizationCoefficient = isPositiveMoment
    ? section.positiveMomentUtilizationCoefficient
    : section.negativeMomentUtilizationCoefficient;
  const rows = section.plies.flatMap((ply, index) => ([
    { ply, index, surface: "Bottom", z: ply.zBottom, coefficients: ply.bottomStressPerMoment },
    { ply, index, surface: "Top", z: ply.zTop, coefficients: ply.topStressPerMoment },
  ])).map(({ ply, index, surface, z, coefficients }) => {
    const stress = {
      sigma1: coefficients.sigma1 * governingMoment,
      sigma2: coefficients.sigma2 * governingMoment,
      tau12: coefficients.tau12 * governingMoment,
    };
    const utilization = failureIndex(stress, ply.properties);
    return {
      key: `${index}-${surface}`,
      plyNumber: index + 1,
      angle: ply.angleDegrees,
      surface,
      z,
      stress,
      utilization,
      strengthRatio: utilization > 0 ? 1 / utilization : Infinity,
    };
  });
  const controllingRow = rows.reduce((highest, row) => row.utilization > highest.utilization ? row : highest, rows[0]);
  const momentResistance = isPositiveMoment ? section.positiveMomentResistance : section.negativeMomentResistance;
  const curvature = governingMoment * section.unitMomentCurvature[0];
  const momentPerWidth = governingMoment / section.width;

  return (
    <Card className="glass-card border-primary/25">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          Laminate Beam Mechanics
          <Badge variant="outline" className="ml-auto text-[10px]">CLT · first-ply screen</Badge>
        </CardTitle>
        <CardDescription>
          Ply stiffness and orientation form the A, B, and D matrices. The full ABD response feeds the beam-axis EI; positive sagging maps to negative CLT Mx so the top plies are in compression.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {formula && (
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Material-to-moment equations from the Math Library</div>
            <div className="overflow-x-auto text-primary">
              {formula.latex ? <KaTeXFormula latex={formula.latex} /> : <code>{formula.formula}</code>}
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Ply sequence, bottom to top" value={section.plies.map((ply) => `${ply.angleDegrees}°`).join(" / ")} />
          <Metric label="Laminate width × thickness" value={`${(section.width * displayUnits.length.factor).toFixed(3)} × ${(section.totalThickness * displayUnits.length.factor).toFixed(4)} ${displayUnits.length.unit}`} />
          <Metric label="Effective beam flexural rigidity EI" value={`${(section.flexuralRigidity * displayUnits.rigidity.factor).toFixed(4)} ${displayUnits.rigidity.unit}`} />
          <Metric label="Applied moment per unit width Mₓ" value={`${(momentPerWidth * displayUnits.force.factor).toFixed(4)} ${displayUnits.force.unit}`} />
          <Metric label="Beam-axis curvature κₓ" value={`${curvature.toExponential(3)} 1/m`} />
          <Metric label="First-ply utilization" value={`${(momentMagnitude * utilizationCoefficient * 100).toFixed(2)}% · Ply ${controllingRow.plyNumber}`} />
          <Metric label="First-ply moment resistance" value={`${(momentResistance * displayUnits.moment.factor).toFixed(3)} ${displayUnits.moment.unit}`} />
          <Metric label="Effective elastic section modulus" value={`${(section.effectiveSectionModulus * displayUnits.sectionMod.factor).toExponential(3)} ${displayUnits.sectionMod.unit}`} />
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <MatrixView title="A extensional" matrix={section.extensionalStiffness} factor={displayUnits.force.factor / displayUnits.length.factor} unit={`${displayUnits.force.unit}/${displayUnits.length.unit}`} />
          <MatrixView title="B coupling" matrix={section.couplingStiffness} factor={displayUnits.force.factor} unit={displayUnits.force.unit} />
          <MatrixView title="D bending per width" matrix={section.bendingStiffness} factor={displayUnits.moment.factor} unit={displayUnits.moment.unit} />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[850px] text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Ply / angle</th>
                <th className="p-2 text-left font-medium">Surface</th>
                <th className="p-2 text-right font-medium">z ({displayUnits.length.unit})</th>
                <th className="p-2 text-right font-medium">σ₁ ({displayUnits.stress.unit})</th>
                <th className="p-2 text-right font-medium">σ₂ ({displayUnits.stress.unit})</th>
                <th className="p-2 text-right font-medium">τ₁₂ ({displayUnits.stress.unit})</th>
                <th className="p-2 text-right font-medium">Failure index</th>
                <th className="p-2 text-right font-medium">Strength ratio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={`border-t border-border/60 ${row.utilization >= 1 ? "bg-destructive/5" : ""}`}>
                  <td className="p-2">{row.plyNumber} / {row.angle}°</td>
                  <td className="p-2">{row.surface}</td>
                  <td className="p-2 text-right font-mono">{(row.z * displayUnits.length.factor).toFixed(4)}</td>
                  <td className="p-2 text-right font-mono">{(row.stress.sigma1 * displayUnits.stress.factor).toFixed(2)}</td>
                  <td className="p-2 text-right font-mono">{(row.stress.sigma2 * displayUnits.stress.factor).toFixed(2)}</td>
                  <td className="p-2 text-right font-mono">{(row.stress.tau12 * displayUnits.stress.factor).toFixed(2)}</td>
                  <td className={`p-2 text-right font-mono ${row.utilization >= 1 ? "text-destructive" : ""}`}>{row.utilization.toFixed(3)}</td>
                  <td className="p-2 text-right font-mono">{Number.isFinite(row.strengthRatio) ? row.strengthRatio.toFixed(3) : "∞"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p>
            This uses plane-stress Classical Lamination Theory with linear-elastic, perfectly bonded plies and zero membrane resultants under bending. The full ABD coupling is included; an unsymmetric layup can produce extension and twist as well as beam-axis curvature, so a single neutral axis is not used. The one-dimensional beam solver tracks vertical bending only; axial end restraint and beam-level twist are not solved. Strength is checked by maximum stress at each ply surface for first-ply failure. Transverse shear deformation, interlaminar failure, progressive damage, environmental effects, independent ply-allowable variability, and design-code factors are not included.
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
