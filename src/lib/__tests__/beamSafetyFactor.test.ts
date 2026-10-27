import { describe, expect, it } from "vitest";
import {
  calculateCompositeSectionProperties,
  calculateLaminateBeamProperties,
  solveBeamResponse,
  type BeamSupportCondition,
  type LaminaMaterialProperties,
} from "@/lib/beamAnalysis";
import { reliabilityAnalysis } from "@/lib/reliability";

const L = 6;
const q = 10_000;
const E = 200e9;
const I = 1e-5;
const S = 1e-4;

function safetyFactor(resistanceMpa: number, maxStressPa: number) {
  return reliabilityAnalysis(resistanceMpa, 0.08, Math.abs(maxStressPa) / 1e6, 0.2).centralSafetyFactor;
}

describe("beam safety factor consistency", () => {
  it("matches analytical demand for common beam restraint conditions", () => {
    const cases: { beamType: "simply-supported" | "cantilever" | "fixed-fixed" | "propped-cantilever"; supports: BeamSupportCondition[]; expectedMoment: number }[] = [
      { beamType: "simply-supported", supports: [{ position: 0, type: "pin" }, { position: 1, type: "roller" }], expectedMoment: q * L ** 2 / 8 },
      { beamType: "cantilever", supports: [{ position: 0, type: "fixed" }], expectedMoment: q * L ** 2 / 2 },
      { beamType: "fixed-fixed", supports: [{ position: 0, type: "fixed" }, { position: 1, type: "fixed" }], expectedMoment: q * L ** 2 / 12 },
      { beamType: "propped-cantilever", supports: [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }], expectedMoment: q * L ** 2 / 8 },
    ];

    for (const { beamType, supports, expectedMoment } of cases) {
      const result = solveBeamResponse(beamType, [{ type: "udl", intensity: q }], L, E, I, supports,
        { includeEventSamples: true }, S);
      const expectedStress = expectedMoment / S;

      const actualMoment = Math.max(Math.abs(result.analysis.maxBendingMoment), Math.abs(result.analysis.minBendingMoment ?? 0));
      expect(actualMoment / expectedMoment).toBeCloseTo(1, 9);
      expect(result.analysis.maxStress / expectedStress).toBeCloseTo(1, 9);
      expect(safetyFactor(250, result.analysis.maxStress)).toBeCloseTo(250e6 / expectedStress, 8);
    }
  });

  it("matches directional moment resistance for layered composite sections", () => {
    const steelI = 0.2 * 0.3 ** 3 / 12;
    const section = calculateCompositeSectionProperties([
      {
        material: "beam steel", elasticModulus: 200e9,
        tensileStrength: 250e6, compressiveStrength: 250e6,
        area: 0.2 * 0.3, centroidY: 0.15, momentOfInertia: steelI, bottomY: 0, topY: 0.3,
      },
      {
        material: "concrete slab", elasticModulus: 30e9,
        tensileStrength: 3e6, compressiveStrength: 30e6,
        area: 0.9 * 0.12, centroidY: 0.36, momentOfInertia: 0.9 * 0.12 ** 3 / 12, bottomY: 0.3, topY: 0.42,
      },
    ], 200e9);
    const cases = [
      {
        supports: [{ position: 0, type: "pin" as const }, { position: 1, type: "roller" as const }],
        resistance: section.positiveMomentEquivalentStrength,
        momentResistance: section.positiveMomentEquivalentStrength * section.effectiveSectionModulus,
      },
      {
        supports: [{ position: 0, type: "fixed" as const }, { position: 1, type: "fixed" as const }],
        resistance: section.negativeMomentEquivalentStrength,
        momentResistance: section.negativeMomentEquivalentStrength * section.effectiveSectionModulus,
      },
    ];

    for (const { supports, resistance, momentResistance } of cases) {
      const result = solveBeamResponse("composite", [{ type: "udl", intensity: q }], L, E,
        section.transformedMomentOfInertia, supports, { includeEventSamples: true }, section.effectiveSectionModulus);
      const moment = Math.max(Math.abs(result.analysis.maxBendingMoment), Math.abs(result.analysis.minBendingMoment ?? 0));
      const expectedFactor = momentResistance / moment;

      expect(safetyFactor(resistance / 1e6, result.analysis.maxStress)).toBeCloseTo(expectedFactor, 8);
    }
  });

  it("matches directional first-ply moment resistance for laminate beams", () => {
    const weakMatrix: LaminaMaterialProperties = {
      E1: 135e9, E2: 10e9, G12: 5e9, nu12: 0.3,
      Xt: 1500e6, Xc: 1200e6, Yt: 40e6, Yc: 246e6, S12: 68e6,
    };
    const strongMatrix: LaminaMaterialProperties = { ...weakMatrix, Xt: 1900e6, Xc: 1700e6, Yt: 65e6, Yc: 310e6, S12: 90e6 };
    const laminate = calculateLaminateBeamProperties(0.1, [
      { material: "outer", angleDegrees: 0, thickness: 0.0005, properties: weakMatrix },
      { material: "inner", angleDegrees: 90, thickness: 0.0005, properties: strongMatrix },
      { material: "inner", angleDegrees: 90, thickness: 0.0005, properties: strongMatrix },
      { material: "outer", angleDegrees: 0, thickness: 0.0005, properties: weakMatrix },
    ]);
    const cases = [
      {
        supports: [{ position: 0, type: "pin" as const }, { position: 1, type: "roller" as const }],
        strength: laminate.positiveMomentEquivalentStrength,
        momentResistance: laminate.positiveMomentResistance,
      },
      {
        supports: [{ position: 0, type: "fixed" as const }, { position: 1, type: "fixed" as const }],
        strength: laminate.negativeMomentEquivalentStrength,
        momentResistance: laminate.negativeMomentResistance,
      },
    ];

    for (const { supports, strength, momentResistance } of cases) {
      const result = solveBeamResponse("composite", [{ type: "udl", intensity: q }], L, E,
        laminate.flexuralRigidity / E, supports, { includeEventSamples: true }, laminate.effectiveSectionModulus);
      const moment = Math.max(Math.abs(result.analysis.maxBendingMoment), Math.abs(result.analysis.minBendingMoment ?? 0));
      const factor = safetyFactor(strength / 1e6, result.analysis.maxStress);

      expect(factor).toBeCloseTo(momentResistance / moment, 8);
    }
  });
});
