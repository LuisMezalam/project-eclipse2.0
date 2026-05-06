import { describe, it, expect } from "vitest";
import {
  analyzeCantilever,
  type LoadConfig,
} from "@/lib/beamAnalysis";

const L = 6;
const S = 1e-4;
const E = 200e9;
const I = 1e-5;

describe("analyzeCantilever — UDL", () => {
  const load: LoadConfig = { type: "udl", intensity: 10000 };
  const result = analyzeCantilever(load, L, S, E, I);

  it("totalLoad = w·L", () => {
    expect(result.totalLoad).toBeCloseTo(10000 * L, 2);
  });

  it("maxMoment = wL²/2 (at fixed end)", () => {
    expect(result.maxBendingMoment).toBeCloseTo((10000 * L ** 2) / 2, 2);
  });

  it("maxShear = wL (full reaction at fixed end)", () => {
    expect(result.maxShear).toBeCloseTo(10000 * L, 2);
  });

  it("maxDeflection = wL⁴/(8EI) at free end", () => {
    expect(result.maxDeflection).toBeCloseTo((10000 * L ** 4) / (8 * E * I), 10);
  });

  it("deflection at free end", () => {
    expect(result.deflectionLocation).toBeCloseTo(L, 6);
  });

  it("momentAtSupport equals maxBendingMoment", () => {
    expect(result.momentAtSupport).toBeCloseTo(result.maxBendingMoment, 2);
  });
});

describe("analyzeCantilever — Concentrated at free end", () => {
  const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 1 };
  const result = analyzeCantilever(load, L, S, E, I);

  it("maxMoment = P·L", () => {
    expect(result.maxBendingMoment).toBeCloseTo(20000 * L, 2);
  });

  it("maxShear = P", () => {
    expect(result.maxShear).toBeCloseTo(20000, 2);
  });

  it("maxDeflection = PL³/(3EI)", () => {
    expect(result.maxDeflection).toBeCloseTo((20000 * L ** 3) / (3 * E * I), 10);
  });
});

describe("analyzeCantilever — Concentrated at midspan", () => {
  const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 0.5 };
  const result = analyzeCantilever(load, L, S, E, I);

  it("maxMoment = P·a where a = L/2", () => {
    expect(result.maxBendingMoment).toBeCloseTo(20000 * L / 2, 2);
  });
});

describe("analyzeCantilever — Moving load", () => {
  it("at free end matches concentrated at free end", () => {
    const moving: LoadConfig = { type: "moving", intensity: 15000, movingStep: 1 };
    const conc: LoadConfig = { type: "concentrated", intensity: 15000, position: 1 };
    const rM = analyzeCantilever(moving, L, S, E, I);
    const rC = analyzeCantilever(conc, L, S, E, I);
    expect(rM.maxBendingMoment).toBeCloseTo(rC.maxBendingMoment, 2);
  });

  it("moment increases as load moves toward free end", () => {
    const r1 = analyzeCantilever({ type: "moving", intensity: 10000, movingStep: 0.25 }, L, S, E, I);
    const r2 = analyzeCantilever({ type: "moving", intensity: 10000, movingStep: 0.75 }, L, S, E, I);
    expect(Math.abs(r2.maxBendingMoment)).toBeGreaterThan(Math.abs(r1.maxBendingMoment));
  });
});
