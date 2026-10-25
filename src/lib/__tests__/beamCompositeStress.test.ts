import { describe, expect, it } from "vitest";
import { calculateLaminateBeamProperties, solveBeamResponse, type LaminaMaterialProperties, type LaminatePlyInput, type LoadConfig } from "@/lib/beamAnalysis";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const angles = [-90, -60, -45, -30, -15, 0, 15, 30, 45, 60, 90, 135];

function materialFor(random: () => number, isotropic: boolean): LaminaMaterialProperties {
  const E1 = (45 + 180 * random()) * 1e9;
  const nu12 = 0.2 + 0.18 * random();
  const E2 = isotropic ? E1 : (3 + 28 * random()) * 1e9;
  const G12 = isotropic ? E1 / (2 * (1 + nu12)) : (2 + 16 * random()) * 1e9;
  return {
    E1,
    E2,
    G12,
    nu12,
    Xt: (700 + 1800 * random()) * 1e6,
    Xc: (500 + 1600 * random()) * 1e6,
    Yt: (25 + 90 * random()) * 1e6,
    Yc: (100 + 350 * random()) * 1e6,
    S12: (35 + 130 * random()) * 1e6,
  };
}

function buildLayup(index: number, random: () => number): LaminatePlyInput[] {
  const count = 1 + (index % 10);
  const isotropic = index % 10 === 0;
  const plyThickness = index % 20 === 0
    ? 1e-5 + random() * 2e-5
    : 0.00008 + random() * 0.0025;
  const makePly = (angleDegrees: number, properties: LaminaMaterialProperties): LaminatePlyInput => ({
    material: isotropic ? "isotropic stress case" : "orthotropic stress case",
    angleDegrees,
    thickness: plyThickness,
    properties,
  });

  if (index % 4 === 0 || index % 4 === 1) {
    const lower: LaminatePlyInput[] = Array.from({ length: Math.floor(count / 2) }, () =>
      makePly(angles[Math.floor(random() * angles.length)], materialFor(random, isotropic)));
    const center = count % 2 === 1
      ? [makePly(angles[Math.floor(random() * angles.length)], materialFor(random, isotropic))]
      : [];
    return [...lower, ...center, ...lower.slice().reverse()];
  }

  if (index % 4 === 2) {
    return Array.from({ length: count }, (_, plyIndex) => {
      const angle = angles[(plyIndex * 3 + index) % angles.length];
      const sign = plyIndex % 2 === 0 ? 1 : -1;
      return makePly(sign * angle, materialFor(random, isotropic));
    });
  }

  const angle = angles[index % angles.length];
  return Array.from({ length: count }, () => makePly(angle, materialFor(random, isotropic)));
}

function finiteNumbers(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(finiteNumbers);
  if (value && typeof value === "object") return Object.values(value).flatMap(finiteNumbers);
  return [];
}

function loadFor(index: number, random: () => number) {
  const intensity = 100 + 19_900 * random();
  const start = 0.05 + 0.3 * random();
  const end = 0.7 + 0.3 * random();
  switch (index % 5) {
    case 0:
      return [{ type: "udl" as const, intensity }];
    case 1:
      return [{ type: "concentrated" as const, intensity: intensity * 0.5, position: 0.05 + 0.9 * random() }];
    case 2:
      return [{ type: "triangular" as const, intensity, triStartPosition: start, triEndPosition: end, peakPosition: (index % 2) as 0 | 1 }];
    case 3:
      return [{ type: "partial-udl" as const, intensity, startPosition: start, endPosition: end }];
    default:
      return [{ type: "trapezoidal" as const, intensity, startIntensity: intensity * 0.25, endIntensity: intensity * 1.5 }];
  }
}

describe("composite laminate 100-case stress run", () => {
  it("keeps CLT properties and beam results valid across 100 varied cases", () => {
    const random = seededRandom(0x5eedc0de);

    for (let index = 0; index < 100; index++) {
      const plies = buildLayup(index, random);
      const width = index % 20 === 0 ? 0.01 + random() * 0.01 : 0.025 + 1.25 * random();
      const length = 0.5 + 19.5 * random();
      const section = calculateLaminateBeamProperties(width, plies);
      const context = `scenario ${index + 1}: ${plies.length} plies, b=${width}, h=${section.totalThickness}`;

      expect(section.totalThickness, context).toBeCloseTo(plies.reduce((sum, ply) => sum + ply.thickness, 0), 14);
      expect(section.area, context).toBeCloseTo(width * section.totalThickness, 14);
      expect(section.flexuralRigidity, context).toBeGreaterThan(0);
      expect(section.positiveMomentResistance, context).toBeGreaterThan(0);
      expect(section.negativeMomentResistance, context).toBeGreaterThan(0);
      expect(finiteNumbers(section).every(Number.isFinite), context).toBe(true);
      for (const stiffness of [section.extensionalStiffness, section.couplingStiffness, section.bendingStiffness]) {
        for (let row = 0; row < 3; row++) {
          for (let column = 0; column < 3; column++) {
            const scale = Math.max(1, Math.abs(stiffness[row][column]), Math.abs(stiffness[column][row]));
            expect(Math.abs(stiffness[row][column] - stiffness[column][row]) / scale, context).toBeLessThan(1e-12);
          }
        }
      }

      if (index % 4 < 2) {
        const couplingMagnitude = Math.max(...section.couplingStiffness.flat().map(Math.abs));
        const stiffnessScale = Math.max(...section.extensionalStiffness.flat().map(Math.abs), 1);
        expect(couplingMagnitude / (stiffnessScale * section.totalThickness), context).toBeLessThan(1e-12);
      }

      if (index % 10 === 0) {
        const referenceE = plies[0].properties.E1;
        const expectedEI = referenceE * width * section.totalThickness ** 3 / 12;
        expect(section.flexuralRigidity / expectedEI, context).toBeCloseTo(1, 9);
      }

      const loads: LoadConfig[] = loadFor(index, random);
      if (index % 3 === 0) {
        const laminateUnitWeight = 12_000 + 10_000 * random();
        loads.push({ type: "udl", intensity: laminateUnitWeight * section.area });
      }
      const inertia = section.flexuralRigidity / plies[0].properties.E1;
      const response = solveBeamResponse("composite", loads, length, plies[0].properties.E1, inertia, undefined, { elementCount: 24 }, section.effectiveSectionModulus);
      const scaledResponse = solveBeamResponse("composite", loads, length, plies[0].properties.E1, inertia * 2, undefined, { elementCount: 24 }, section.effectiveSectionModulus);
      expect(finiteNumbers(response).every(Number.isFinite), context).toBe(true);
      expect(response.supportFallback, context).toBe(false);
      expect(response.supportReactions.length, context).toBeGreaterThan(0);
      const reactionSum = response.supportReactions.reduce((sum, reaction) => sum + reaction.vertical, 0);
      expect(Math.abs(reactionSum - response.analysis.totalLoad) / Math.max(1, Math.abs(response.analysis.totalLoad)), context).toBeLessThan(1e-7);
      const endMomentNm = Math.abs((response.diagramData.at(-1)?.moment ?? 0) * 1000);
      expect(endMomentNm / Math.max(1, Math.abs(response.analysis.totalLoad * length)), context).toBeLessThan(1e-7);
      expect(response.analysis.maxShear, context).toBeCloseTo(scaledResponse.analysis.maxShear, 6);
      expect(response.analysis.maxBendingMoment, context).toBeCloseTo(scaledResponse.analysis.maxBendingMoment, 6);
      const deflection = Math.max(Math.abs(response.analysis.maxDeflection), Math.abs(response.analysis.minDeflection ?? 0));
      const scaledDeflection = Math.max(Math.abs(scaledResponse.analysis.maxDeflection), Math.abs(scaledResponse.analysis.minDeflection ?? 0));
      expect(deflection / scaledDeflection, context).toBeCloseTo(2, 5);
    }
  });
});
