import { describe, it, expect } from "vitest";
import {
  analyzeSimplySupported,
  type LoadConfig,
} from "@/lib/beamAnalysis";

const L = 6;
const S = 1e-4;
const E = 200e9;
const I = 1e-5;

describe("analyzeSimplySupported — UDL", () => {
  const load: LoadConfig = { type: "udl", intensity: 10000 };
  const result = analyzeSimplySupported(load, L, S, E, I);

  it("totalLoad = w·L", () => {
    expect(result.totalLoad).toBeCloseTo(10000 * L, 2);
  });

  it("centroid at midspan", () => {
    expect(result.centroidX).toBeCloseTo(L / 2, 6);
  });

  it("maxMoment = wL²/8", () => {
    expect(result.maxBendingMoment).toBeCloseTo((10000 * L ** 2) / 8, 2);
  });

  it("maxShear = wL/2", () => {
    expect(result.maxShear).toBeCloseTo((10000 * L) / 2, 2);
  });

  it("maxDeflection = 5wL⁴/(384EI)", () => {
    expect(result.maxDeflection).toBeCloseTo((5 * 10000 * L ** 4) / (384 * E * I), 10);
  });

  it("deflection at midspan", () => {
    expect(result.deflectionLocation).toBeCloseTo(L / 2, 6);
  });
});

describe("analyzeSimplySupported — Concentrated at midspan", () => {
  const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 0.5 };
  const result = analyzeSimplySupported(load, L, S, E, I);

  it("totalLoad = P", () => {
    expect(result.totalLoad).toBeCloseTo(20000, 2);
  });

  it("maxMoment = PL/4 at midspan", () => {
    expect(result.maxBendingMoment).toBeCloseTo((20000 * L) / 4, 2);
  });

  it("maxShear = P/2", () => {
    expect(result.maxShear).toBeCloseTo(20000 / 2, 2);
  });
});

describe("analyzeSimplySupported — Concentrated at quarter-point", () => {
  const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 0.25 };
  const result = analyzeSimplySupported(load, L, S, E, I);

  it("maxMoment = P·a·b/L", () => {
    const a = 0.25 * L, b = 0.75 * L;
    expect(result.maxBendingMoment).toBeCloseTo((20000 * a * b) / L, 2);
  });
});

describe("analyzeSimplySupported — Moving load", () => {
  it("at midspan matches concentrated at midspan", () => {
    const moving: LoadConfig = { type: "moving", intensity: 15000, movingStep: 0.5 };
    const conc: LoadConfig = { type: "concentrated", intensity: 15000, position: 0.5 };
    const rMoving = analyzeSimplySupported(moving, L, S, E, I);
    const rConc = analyzeSimplySupported(conc, L, S, E, I);
    expect(rMoving.maxBendingMoment).toBeCloseTo(rConc.maxBendingMoment, 2);
    expect(rMoving.maxShear).toBeCloseTo(rConc.maxShear, 2);
    expect(rMoving.maxDeflection).toBeCloseTo(rConc.maxDeflection, 10);
  });

  it("moment varies with position", () => {
    const r1 = analyzeSimplySupported({ type: "moving", intensity: 10000, movingStep: 0.25 }, L, S, E, I);
    const r2 = analyzeSimplySupported({ type: "moving", intensity: 10000, movingStep: 0.5 }, L, S, E, I);
    expect(r2.maxBendingMoment).toBeGreaterThan(r1.maxBendingMoment);
  });
});

describe("analyzeSimplySupported — Triangular load", () => {
  const load: LoadConfig = { type: "triangular", intensity: 10000, peakPosition: 0 };
  const result = analyzeSimplySupported(load, L, S, E, I);

  it("totalLoad = wL/2", () => {
    expect(result.totalLoad).toBeCloseTo((10000 * L) / 2, 2);
  });

  it("centroid at L/3 for left peak", () => {
    expect(result.centroidX).toBeCloseTo(L / 3, 6);
  });

  it("maxMoment = wL²/(9√3)", () => {
    expect(result.maxBendingMoment).toBeCloseTo((10000 * L ** 2) / (9 * Math.sqrt(3)), 2);
  });
});

describe("analyzeSimplySupported — Inverted load", () => {
  it("inverted UDL flips sign of totalLoad", () => {
    const normal = analyzeSimplySupported({ type: "udl", intensity: 10000 }, L, S, E, I);
    const inverted = analyzeSimplySupported({ type: "udl", intensity: 10000, inverted: true }, L, S, E, I);
    expect(inverted.totalLoad).toBeCloseTo(-normal.totalLoad, 2);
  });
});
