import { describe, it, expect } from "vitest";
import {
  analyzeSimplySupported,
  analyzeCantilever,
  type LoadConfig,
} from "@/lib/beamAnalysis";

const L = 6;
const S = 1e-4;
const E = 200e9;
const I = 1e-5;

describe("Stress = M / S", () => {
  it("maxStress computed from maxBendingMoment and sectionModulus", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const result = analyzeSimplySupported(load, L, S, E, I);
    expect(result.maxStress).toBeCloseTo(result.maxBendingMoment / S, 2);
  });
});

describe("Monotonicity properties", () => {
  it("increasing UDL intensity increases moment", () => {
    const r1 = analyzeSimplySupported({ type: "udl", intensity: 5000 }, L, S, E, I);
    const r2 = analyzeSimplySupported({ type: "udl", intensity: 15000 }, L, S, E, I);
    expect(r2.maxBendingMoment).toBeGreaterThan(r1.maxBendingMoment);
  });

  it("increasing beam length increases deflection (UDL, L⁴ dependence)", () => {
    const r1 = analyzeSimplySupported({ type: "udl", intensity: 10000 }, 4, S, E, I);
    const r2 = analyzeSimplySupported({ type: "udl", intensity: 10000 }, 8, S, E, I);
    expect(r2.maxDeflection).toBeGreaterThan(r1.maxDeflection);
    const ratio = r2.maxDeflection / r1.maxDeflection;
    expect(ratio).toBeCloseTo(16, 0);
  });

  it("cantilever deflection > simply supported for same UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const rSS = analyzeSimplySupported(load, L, S, E, I);
    const rC = analyzeCantilever(load, L, S, E, I);
    expect(rC.maxDeflection).toBeGreaterThan(rSS.maxDeflection);
  });

  it("cantilever moment > simply supported moment for same UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const rSS = analyzeSimplySupported(load, L, S, E, I);
    const rC = analyzeCantilever(load, L, S, E, I);
    expect(rC.maxBendingMoment).toBeGreaterThan(rSS.maxBendingMoment);
  });
});
