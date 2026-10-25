import { describe, expect, it } from "vitest";
import katex from "katex";
import { calculateCompositeSectionProperties, calculateLaminateBeamProperties, solveBeamResponse } from "@/lib/beamAnalysis";
import { getFormulaById } from "@/lib/formulaLibrary";

const isotropicPly = {
  E1: 70e9,
  E2: 70e9,
  G12: 70e9 / (2 * (1 + 0.3)),
  nu12: 0.3,
  Xt: 300e6,
  Xc: 300e6,
  Yt: 300e6,
  Yc: 300e6,
  S12: 300e6,
};

const orthotropicPly = {
  E1: 135e9,
  E2: 10e9,
  G12: 5e9,
  nu12: 0.3,
  Xt: 1500e6,
  Xc: 1200e6,
  Yt: 40e6,
  Yc: 246e6,
  S12: 68e6,
};

describe("calculateCompositeSectionProperties", () => {
  it("matches a single rectangle when adjacent layers use the same material", () => {
    const width = 0.2;
    const beamHeight = 0.3;
    const slabThickness = 0.1;
    const modulus = 200e9;
    const props = calculateCompositeSectionProperties([
      {
        material: "beam",
        elasticModulus: modulus,
        tensileStrength: 250e6,
        compressiveStrength: 250e6,
        area: width * beamHeight,
        centroidY: beamHeight / 2,
        momentOfInertia: width * beamHeight ** 3 / 12,
        bottomY: 0,
        topY: beamHeight,
      },
      {
        material: "slab",
        elasticModulus: modulus,
        tensileStrength: 250e6,
        compressiveStrength: 250e6,
        area: width * slabThickness,
        centroidY: beamHeight + slabThickness / 2,
        momentOfInertia: width * slabThickness ** 3 / 12,
        bottomY: beamHeight,
        topY: beamHeight + slabThickness,
      },
    ], modulus);
    const combinedI = width * (beamHeight + slabThickness) ** 3 / 12;

    expect(props.elasticNeutralAxis).toBeCloseTo((beamHeight + slabThickness) / 2, 12);
    expect(props.transformedMomentOfInertia).toBeCloseTo(combinedI, 12);
    expect(props.flexuralRigidity).toBeCloseTo(modulus * combinedI, 4);
    expect(props.effectiveSectionModulus).toBeCloseTo(combinedI / ((beamHeight + slabThickness) / 2), 12);
    expect(props.positiveMomentEquivalentStrength).toBeCloseTo(250e6, 0);
    expect(props.negativeMomentEquivalentStrength).toBeCloseTo(250e6, 0);
  });

  it("uses the modulus-weighted neutral axis and direction-specific material limits", () => {
    const props = calculateCompositeSectionProperties([
      {
        material: "steel",
        elasticModulus: 200e9,
        tensileStrength: 250e6,
        compressiveStrength: 250e6,
        area: 0.006,
        centroidY: 0.15,
        momentOfInertia: 1.8e-5,
        bottomY: 0,
        topY: 0.3,
      },
      {
        material: "concrete",
        elasticModulus: 30e9,
        tensileStrength: 3e6,
        compressiveStrength: 30e6,
        area: 0.108,
        centroidY: 0.36,
        momentOfInertia: 1.62e-4,
        bottomY: 0.3,
        topY: 0.42,
      },
    ], 200e9);
    const expectedNeutralAxis = (200e9 * 0.006 * 0.15 + 30e9 * 0.108 * 0.36) / (200e9 * 0.006 + 30e9 * 0.108);

    expect(props.elasticNeutralAxis).toBeCloseTo(expectedNeutralAxis, 12);
    expect(props.referenceElasticModulus * props.transformedMomentOfInertia).toBeCloseTo(props.flexuralRigidity, 3);
    expect(props.negativeMomentEquivalentStrength).toBeLessThan(props.positiveMomentEquivalentStrength);
    expect(props.layers.find((layer) => layer.material === "concrete")?.maxStressCoefficient).toBeGreaterThan(0);
  });

  it("feeds transformed flexural rigidity into the beam response without changing V or M", () => {
    const baseElasticModulus = 200e9;
    const baseInertia = 1.8e-5;
    const composite = calculateCompositeSectionProperties([
      {
        material: "steel",
        elasticModulus: baseElasticModulus,
        tensileStrength: 250e6,
        compressiveStrength: 250e6,
        area: 0.006,
        centroidY: 0.15,
        momentOfInertia: baseInertia,
        bottomY: 0,
        topY: 0.3,
      },
      {
        material: "concrete",
        elasticModulus: 30e9,
        tensileStrength: 3e6,
        compressiveStrength: 30e6,
        area: 0.108,
        centroidY: 0.36,
        momentOfInertia: 1.62e-4,
        bottomY: 0.3,
        topY: 0.42,
      },
    ], baseElasticModulus);
    const load = [{ type: "udl" as const, intensity: 1000 }];
    const baseline = solveBeamResponse("simply-supported", load, 4, baseElasticModulus, baseInertia);
    const transformed = solveBeamResponse("composite", load, 4, baseElasticModulus, composite.transformedMomentOfInertia);
    const referenceFlexuralRigidity = baseElasticModulus * baseInertia;

    expect(transformed.analysis.maxDeflection).toBeLessThan(baseline.analysis.maxDeflection);
    expect(baseline.analysis.maxDeflection / transformed.analysis.maxDeflection).toBeCloseTo(
      composite.flexuralRigidity / referenceFlexuralRigidity,
      5,
    );
    expect(transformed.analysis.maxShear).toBeCloseTo(baseline.analysis.maxShear, 4);
    expect(transformed.analysis.maxBendingMoment).toBeCloseTo(baseline.analysis.maxBendingMoment, 4);
  });
});

describe("calculateLaminateBeamProperties", () => {
  it("transforms an orthotropic ply stiffness and integrates the CLT A and D terms", () => {
    const thickness = 0.001;
    const { E1, E2, G12, nu12 } = orthotropicPly;
    const denominator = 1 - nu12 ** 2 * E2 / E1;
    const Q11 = E1 / denominator;
    const Q22 = E2 / denominator;
    const Q12 = nu12 * E2 / denominator;
    const expectedQbar11 = 0.25 * Q11 + 0.5 * (Q12 + 2 * G12) + 0.25 * Q22;
    const expectedQbar16 = 0.25 * (Q11 - Q22);
    const section = calculateLaminateBeamProperties(0.1, [{
      material: "orthotropic check",
      angleDegrees: 45,
      thickness,
      properties: orthotropicPly,
    }]);

    expect(section.extensionalStiffness[0][0]).toBeCloseTo(expectedQbar11 * thickness, 3);
    expect(section.extensionalStiffness[0][2]).toBeCloseTo(expectedQbar16 * thickness, 3);
    expect(section.bendingStiffness[0][0]).toBeCloseTo(expectedQbar11 * thickness ** 3 / 12, 9);
  });

  it("reduces a single isotropic ply to the rectangular-beam EI and section modulus", () => {
    const width = 0.1;
    const thickness = 0.02;
    const section = calculateLaminateBeamProperties(width, [{
      material: "isotropic check",
      angleDegrees: 0,
      thickness,
      properties: isotropicPly,
    }]);

    expect(section.extensionalStiffness[0][0]).toBeCloseTo((isotropicPly.E1 / (1 - 0.3 ** 2)) * thickness, 3);
    expect(section.couplingStiffness[0][0]).toBeCloseTo(0, 6);
    expect(section.bendingStiffness[0][0]).toBeCloseTo((isotropicPly.E1 / (1 - 0.3 ** 2)) * thickness ** 3 / 12, 6);
    expect(section.flexuralRigidity).toBeCloseTo(isotropicPly.E1 * width * thickness ** 3 / 12, 4);
    expect(section.effectiveSectionModulus).toBeCloseTo(width * thickness ** 2 / 6, 12);
    expect(section.plies[0].topStressPerMoment.sigma1).toBeLessThan(0);
    expect(section.plies[0].bottomStressPerMoment.sigma1).toBeGreaterThan(0);
    expect(section.positiveMomentEquivalentStrength).toBeCloseTo(300e6, 0);
    expect(section.negativeMomentEquivalentStrength).toBeCloseTo(300e6, 0);

    const rotated = calculateLaminateBeamProperties(width, [{
      material: "isotropic check",
      angleDegrees: 45,
      thickness,
      properties: isotropicPly,
    }]);
    expect(rotated.flexuralRigidity).toBeCloseTo(section.flexuralRigidity, 4);
  });

  it("integrates the ABD coupling terms for unsymmetric angle plies", () => {
    const section = calculateLaminateBeamProperties(0.08, [
      { material: "lamina", angleDegrees: 0, thickness: 0.00025, properties: orthotropicPly },
      { material: "lamina", angleDegrees: 45, thickness: 0.00025, properties: orthotropicPly },
    ]);
    const symmetric = calculateLaminateBeamProperties(0.08, [
      { material: "lamina", angleDegrees: 0, thickness: 0.00025, properties: orthotropicPly },
      { material: "lamina", angleDegrees: 45, thickness: 0.00025, properties: orthotropicPly },
      { material: "lamina", angleDegrees: 45, thickness: 0.00025, properties: orthotropicPly },
      { material: "lamina", angleDegrees: 0, thickness: 0.00025, properties: orthotropicPly },
    ]);

    expect(Math.abs(section.couplingStiffness[0][0]) + Math.abs(section.couplingStiffness[0][2])).toBeGreaterThan(0);
    expect(symmetric.couplingStiffness.flat().every((value) => Math.abs(value) < 1e-8)).toBe(true);
  });

  it("uses the ABD-derived EI in deflection while preserving load-only shear and moment", () => {
    const width = 0.1;
    const plyThickness = 0.00025;
    const laminate = calculateLaminateBeamProperties(width, [0, 90, 90, 0].map((angleDegrees) => ({
      material: "lamina",
      angleDegrees,
      thickness: plyThickness,
      properties: isotropicPly,
    })));
    const reference = solveBeamResponse("simply-supported", [{ type: "udl", intensity: 1000 }], 4, 70e9, width * (4 * plyThickness) ** 3 / 12);
    const solved = solveBeamResponse("composite", [{ type: "udl", intensity: 1000 }], 4, 70e9, laminate.flexuralRigidity / 70e9);

    expect(solved.analysis.maxDeflection).toBeCloseTo(
      reference.analysis.maxDeflection * (70e9 * width * (4 * plyThickness) ** 3 / 12) / laminate.flexuralRigidity,
      5,
    );
    expect(solved.analysis.maxShear).toBeCloseTo(reference.analysis.maxShear, 4);
    expect(solved.analysis.maxBendingMoment).toBeCloseTo(reference.analysis.maxBendingMoment, 4);
  });
});

describe("laminated composite formula", () => {
  it("renders the CLT equations in the Math Library without a KaTeX error", () => {
    const formula = getFormulaById("laminated-composite-beam-clt");
    expect(formula?.latex).toBeTruthy();
    const html = katex.renderToString(formula!.latex!, { throwOnError: false });
    expect(html).not.toContain("katex-error");
  });
});
