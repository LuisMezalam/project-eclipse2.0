import { describe, expect, it } from "vitest";
import { calculateLaminateBeamProperties, solveBeamResponse, type BeamSupportCondition, type BeamType, type LoadConfig } from "@/lib/beamAnalysis";

const beamTypes: BeamType[] = [
  "simply-supported", "cantilever", "fixed-fixed", "propped-cantilever", "overhanging",
  "continuous", "multi-span", "gerber", "elastic-foundation", "spring-supported",
  "settlement", "tapered", "beam-column", "composite",
];

const L = 6;
const material = {
  E1: 181e9, E2: 10.3e9, G12: 7.17e9, nu12: 0.28,
  Xt: 1500e6, Xc: 1500e6, Yt: 40e6, Yc: 246e6, S12: 68e6,
};
const laminate = calculateLaminateBeamProperties(0.9, [0, 45, -45, 90, 90, -45, 45, 0].map((angleDegrees) => ({
  material: "test laminate", angleDegrees, thickness: 0.00025, properties: material,
})));
const loads: LoadConfig[] = [
  { type: "udl", intensity: 4500 },
  { type: "concentrated", intensity: 8500, position: 0.371 },
  { type: "partial-udl", intensity: 1250, startPosition: 0.17, endPosition: 0.73 },
  { type: "triangular", intensity: 900, triStartPosition: 0.11, triEndPosition: 0.82 },
  { type: "trapezoidal", intensity: 500, startIntensity: 200, endIntensity: 1100 },
  { type: "parabolic", intensity: 700 },
  { type: "moment", intensity: 2100, position: 0.63, inverted: true },
  { type: "udl", intensity: 16_000 * laminate.area }, // laminate self-weight
];

function maxRelativeDifference(actual: number[], expected: number[]) {
  const scale = Math.max(1e-12, ...actual.map(Math.abs), ...expected.map(Math.abs));
  return Math.max(...actual.map((value, index) => Math.abs(value - expected[index]))) / scale;
}

function peakMagnitude(values: number[]) {
  return Math.max(...values.map(Math.abs));
}

function relativeDifference(left: number, right: number) {
  return Math.abs(left - right) / Math.max(1e-12, Math.abs(left), Math.abs(right));
}

describe("hybrid V/M/D diagram audit across beam types", () => {
  it("reverses hybrid shear, moment, deflection, and reactions when load direction is inverted", () => {
    const downwardLoads: LoadConfig[] = [
      { type: "partial-udl", intensity: 8_000, startPosition: 0.1, endPosition: 0.7 },
      { type: "concentrated", intensity: 12_000, position: 0.83 },
    ];
    const supports: BeamSupportCondition[] = [
      { position: 0, type: "pin" },
      { position: 1, type: "roller" },
    ];
    const options = { numPoints: 120, includeEventSamples: true, includeExtremaSamples: true };
    const downward = solveBeamResponse("simply-supported", downwardLoads, L, 200e9, 1e-5, supports, options);
    const upward = solveBeamResponse("simply-supported", downwardLoads.map((load) => ({ ...load, inverted: true })), L, 200e9, 1e-5, supports, options);

    expect(upward.diagramData).toHaveLength(downward.diagramData.length);
    for (const [index, point] of downward.diagramData.entries()) {
      const reversed = upward.diagramData[index];
      expect(reversed.x).toBeCloseTo(point.x, 12);
      expect(reversed.shear).toBeCloseTo(-point.shear, 8);
      expect(reversed.moment).toBeCloseTo(-point.moment, 8);
      expect(reversed.deflection).toBeCloseTo(-point.deflection, 8);
    }
    for (const [index, reaction] of downward.supportReactions.entries()) {
      expect(upward.supportReactions[index].vertical).toBeCloseTo(-reaction.vertical, 5);
      expect(upward.supportReactions[index].moment).toBeCloseTo(-reaction.moment, 5);
    }
  });

  it("matches hybrid superposition and reported peaks in every beam type", () => {
    for (const beamType of beamTypes) {
      const E = beamType === "composite" ? material.E1 : 200e9;
      const I = beamType === "composite" ? laminate.flexuralRigidity / E : 1e-5;
      const options = { numPoints: 400, elementCount: 80, includeEventSamples: true, includeExtremaSamples: true };
      const hybrid = solveBeamResponse(beamType, loads, L, E, I, undefined, options);
      const singles = loads.map((load) => solveBeamResponse(beamType, [load], L, E, I, undefined, {
        ...options,
        extraSamplePositions: hybrid.diagramData.map((point) => point.x),
      }));
      const sampleAt = (response: typeof hybrid, x: number) => response.diagramData.reduce((closest, candidate) =>
        Math.abs(candidate.x - x) < Math.abs(closest.x - x) ? candidate : closest,
      );
      const expected = hybrid.diagramData.map((point) => ({
        shear: singles.reduce((sum, response) => sum + sampleAt(response, point.x).shear, 0),
        moment: singles.reduce((sum, response) => sum + sampleAt(response, point.x).moment, 0),
        deflection: singles.reduce((sum, response) => sum + sampleAt(response, point.x).deflection, 0),
      }));
      const sumExpected = (key: "shear" | "moment" | "deflection") => expected.map((point) => point[key]);
      const actual = (key: "shear" | "moment" | "deflection") => hybrid.diagramData.map((point) => point[key]);
      const context = `${beamType} beam`;

      expect(maxRelativeDifference(actual("shear"), sumExpected("shear")), `${context}: hybrid V superposition`).toBeLessThan(1e-6);
      expect(maxRelativeDifference(actual("moment"), sumExpected("moment")), `${context}: hybrid M superposition`).toBeLessThan(1e-6);
      expect(maxRelativeDifference(actual("deflection"), sumExpected("deflection")), `${context}: hybrid D superposition`).toBeLessThan(2e-6);

      const chartShear = peakMagnitude(actual("shear"));
      const chartMoment = peakMagnitude(actual("moment"));
      const chartDeflection = peakMagnitude(actual("deflection"));
      const summaryShear = Math.max(Math.abs(hybrid.analysis.maxShear), Math.abs(hybrid.analysis.minShear ?? 0)) / 1000;
      const summaryMoment = Math.max(Math.abs(hybrid.analysis.maxBendingMoment), Math.abs(hybrid.analysis.minBendingMoment ?? 0)) / 1000;
      const summaryDeflection = Math.max(Math.abs(hybrid.analysis.maxDeflection), Math.abs(hybrid.analysis.minDeflection ?? 0)) * 1000;

      expect(relativeDifference(summaryShear, chartShear), `${context}: V diagram peak matches summary`).toBeLessThan(1e-6);
      expect(relativeDifference(summaryMoment, chartMoment), `${context}: M diagram peak matches summary`).toBeLessThan(1e-6);
      expect(relativeDifference(summaryDeflection, chartDeflection), `${context}: D diagram peak matches summary`).toBeLessThan(2e-6);
    }
  });

  it("keeps hybrid composite diagrams aligned for custom support conditions", () => {
    const supportLayouts: BeamSupportCondition[][] = [
      [{ position: 0.1, type: "fixed" }, { position: 0.9, type: "roller" }],
      [{ position: 0.08, type: "pin" }, { position: 0.5, type: "pin" }, { position: 0.92, type: "roller" }],
      [{ position: 0.1, type: "pin" }, { position: 0.52, type: "hinge" }, { position: 0.9, type: "roller" }],
      [{ position: 0.12, type: "fixed" }, { position: 0.88, type: "fixed" }],
    ];
    const options = { numPoints: 400, elementCount: 80, includeEventSamples: true, includeExtremaSamples: true };

    for (const [index, supports] of supportLayouts.entries()) {
      const response = solveBeamResponse("composite", loads, L, material.E1, laminate.flexuralRigidity / material.E1, supports, options);
      const chartV = peakMagnitude(response.diagramData.map((point) => point.shear));
      const chartM = peakMagnitude(response.diagramData.map((point) => point.moment));
      const chartD = peakMagnitude(response.diagramData.map((point) => point.deflection));
      const summaryV = Math.max(Math.abs(response.analysis.maxShear), Math.abs(response.analysis.minShear ?? 0)) / 1000;
      const summaryM = Math.max(Math.abs(response.analysis.maxBendingMoment), Math.abs(response.analysis.minBendingMoment ?? 0)) / 1000;
      const summaryD = Math.max(Math.abs(response.analysis.maxDeflection), Math.abs(response.analysis.minDeflection ?? 0)) * 1000;
      const context = `custom composite support layout ${index + 1}`;

      expect(response.supportFallback, context).toBe(false);
      expect(relativeDifference(summaryV, chartV), `${context}: V peak`).toBeLessThan(1e-6);
      expect(relativeDifference(summaryM, chartM), `${context}: M peak`).toBeLessThan(1e-6);
      expect(relativeDifference(summaryD, chartD), `${context}: D peak`).toBeLessThan(2e-6);
    }
  });

  it("reports analytically correct moments at fixed supports", () => {
    const q = 10_000;
    const cases: { beamType: BeamType; supports: BeamSupportCondition[]; expectedMoment: number }[] = [
      { beamType: "cantilever", supports: [{ position: 0, type: "fixed" }], expectedMoment: q * L ** 2 / 2 },
      { beamType: "fixed-fixed", supports: [{ position: 0, type: "fixed" }, { position: 1, type: "fixed" }], expectedMoment: q * L ** 2 / 12 },
      { beamType: "propped-cantilever", supports: [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }], expectedMoment: q * L ** 2 / 8 },
      { beamType: "settlement", supports: [{ position: 0, type: "fixed" }, { position: 1, type: "roller" }], expectedMoment: q * L ** 2 / 8 },
      { beamType: "composite", supports: [{ position: 0, type: "fixed" }], expectedMoment: q * L ** 2 / 2 },
    ];

    for (const { beamType, supports, expectedMoment } of cases) {
      const response = solveBeamResponse(beamType, [{ type: "udl", intensity: q }], L,
        beamType === "composite" ? material.E1 : 200e9,
        beamType === "composite" ? laminate.flexuralRigidity / material.E1 : 1e-5,
        supports,
        { numPoints: 400, elementCount: 80, includeEventSamples: true, includeExtremaSamples: true },
      );
      const fixedReactions = response.supportReactions.filter((reaction) =>
        supports.some((support) => support.type === "fixed" && Math.abs(support.position * L - reaction.position) < 1e-8),
      );

      expect(response.supportFallback, `${beamType}: should use requested/default supports`).toBe(false);
      expect(fixedReactions.length, `${beamType}: fixed support reaction count`).toBeGreaterThan(0);
      for (const reaction of fixedReactions) {
        expect(relativeDifference(Math.abs(reaction.moment), expectedMoment), `${beamType}: fixed reaction moment`).toBeLessThan(1e-6);
      }

      if (beamType === "cantilever" || (beamType === "composite" && supports.length === 1)) {
        expect(relativeDifference(Math.abs(response.diagramData[0].moment * 1000), expectedMoment), `${beamType}: fixed-end diagram moment`).toBeLessThan(1e-6);
        expect(Math.abs(response.diagramData.at(-1)!.moment), `${beamType}: free-end moment`).toBeLessThan(1e-6);
      }
    }
  });
});
