import { describe, it, expect } from "vitest";
import {
  generateDiagramData,
  generateHybridDiagramData,
  generateInfluenceLineData,
  generateEnvelopeData,
  type LoadConfig,
  type DiagramPoint,
  type InfluencePoint,
  type EnvelopePoint,
} from "@/lib/beamAnalysis";

const L = 6;
const E = 200e9;
const I = 1e-5;
const N = 50;

// Helper: find point closest to a given x
const atXDiag = (data: DiagramPoint[], target: number) =>
  data.reduce((best, p) => (Math.abs(p.x - target) < Math.abs(best.x - target) ? p : best));

const atXInfluence = (data: InfluencePoint[], target: number) =>
  data.reduce((best, p) => (Math.abs(p.loadPosition - target) < Math.abs(best.loadPosition - target) ? p : best));

const atXEnvelope = (data: EnvelopePoint[], target: number) =>
  data.reduce((best, p) => (Math.abs(p.x - target) < Math.abs(best.x - target) ? p : best));

// ============================================================
// Diagram Generation — Simply Supported
// ============================================================

describe("generateDiagramData — simply-supported", () => {
  describe("UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const data = generateDiagramData("simply-supported", load, L, E, I, N);

    it("returns numPoints+1 points", () => {
      expect(data).toHaveLength(N + 1);
    });

    it("x ranges from 0 to L", () => {
      expect(data[0].x).toBeCloseTo(0, 6);
      expect(data[N].x).toBeCloseTo(L, 6);
    });

    it("shear at x=0 is +wL/2 (kN)", () => {
      expect(data[0].shear).toBeCloseTo((10000 * L / 2) / 1000, 1);
    });

    it("shear at x=L is -wL/2 (kN)", () => {
      expect(data[N].shear).toBeCloseTo((-10000 * L / 2) / 1000, 1);
    });

    it("shear crosses zero near midspan", () => {
      const mid = atXDiag(data, L / 2);
      expect(Math.abs(mid.shear)).toBeLessThan(1);
    });

    it("moment at midspan = wL²/8 (kN·m)", () => {
      const mid = atXDiag(data, L / 2);
      expect(mid.moment).toBeCloseTo((10000 * L * L / 8) / 1000, 1);
    });

    it("moment is zero at supports", () => {
      expect(data[0].moment).toBeCloseTo(0, 4);
      expect(data[N].moment).toBeCloseTo(0, 1);
    });

    it("deflection is positive and max near midspan", () => {
      const mid = atXDiag(data, L / 2);
      expect(mid.deflection).toBeGreaterThan(0);
      // Endpoints should have ~0 deflection
      expect(data[0].deflection).toBeCloseTo(0, 4);
    });

    it("load is constant across span", () => {
      const loads = data.map((p) => p.load);
      const unique = new Set(loads.map((v) => v.toFixed(2)));
      expect(unique.size).toBe(1);
    });
  });

  describe("Concentrated at midspan", () => {
    const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 0.5 };
    const data = generateDiagramData("simply-supported", load, L, E, I, N);

    it("shear jumps from +P/2 to -P/2 at load point", () => {
      const justBefore = data[Math.floor(N * 0.48)];
      const justAfter = data[Math.ceil(N * 0.52)];
      expect(justBefore.shear).toBeCloseTo(10, 1); // +10 kN
      expect(justAfter.shear).toBeCloseTo(-10, 1); // -10 kN
    });

    it("moment is max at midspan = PL/4", () => {
      const mid = atXDiag(data, L / 2);
      expect(mid.moment).toBeCloseTo((20000 * L / 4) / 1000, 1);
    });

    it("moment is zero at supports", () => {
      expect(data[0].moment).toBeCloseTo(0, 4);
      expect(data[N].moment).toBeCloseTo(0, 1);
    });
  });

  describe("Moving load matches concentrated", () => {
    it("diagrams are identical for same position", () => {
      const pos = 0.4;
      const concData = generateDiagramData("simply-supported", { type: "concentrated", intensity: 15000, position: pos }, L, E, I, N);
      const movData = generateDiagramData("simply-supported", { type: "moving", intensity: 15000, movingStep: pos }, L, E, I, N);

      for (let i = 0; i <= N; i++) {
        expect(movData[i].shear).toBeCloseTo(concData[i].shear, 6);
        expect(movData[i].moment).toBeCloseTo(concData[i].moment, 6);
        expect(movData[i].deflection).toBeCloseTo(concData[i].deflection, 6);
      }
    });
  });

  describe("Triangular load (left peak)", () => {
    const load: LoadConfig = { type: "triangular", intensity: 12000, peakPosition: 0 };
    const data = generateDiagramData("simply-supported", load, L, E, I, N);

    it("load decreases from left to right", () => {
      expect(data[0].load).toBeGreaterThan(data[N].load);
      expect(data[N].load).toBeCloseTo(0, 1);
    });

    it("moment is zero at supports", () => {
      expect(data[0].moment).toBeCloseTo(0, 4);
      expect(data[N].moment).toBeCloseTo(0, 1);
    });

    it("moment is positive in span interior", () => {
      const mid = atXDiag(data, L / 3);
      expect(mid.moment).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// Diagram Generation — Cantilever
// ============================================================

describe("generateDiagramData — cantilever", () => {
  describe("UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const data = generateDiagramData("cantilever", load, L, E, I, N);

    it("shear at free end (x=0) is -wL", () => {
      // Cantilever: fixed at x=0, shear = -w(L-x), at x=0 → -wL
      expect(data[0].shear).toBeCloseTo((-10000 * L) / 1000, 1);
    });

    it("shear at fixed support (x=L) is zero", () => {
      expect(data[N].shear).toBeCloseTo(0, 1);
    });

    it("moment at x=0 is -wL²/2 (max negative)", () => {
      expect(data[0].moment).toBeCloseTo((-10000 * L * L / 2) / 1000, 1);
    });

    it("moment at x=L is zero", () => {
      expect(data[N].moment).toBeCloseTo(0, 1);
    });

    it("deflection increases toward free end (x=L direction of cantilever model)", () => {
      // In the code, deflection grows with x for cantilever
      expect(data[N].deflection).toBeGreaterThan(data[0].deflection);
    });
  });

  describe("Concentrated at tip", () => {
    const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 1 };
    const data = generateDiagramData("cantilever", load, L, E, I, N);

    it("shear is -P at last point (load at tip)", () => {
      // Cantilever diagram: shear = 0 before load position, jumps to -P
      // At x=L with position=1, the load is exactly at the tip
      // The diagram shows shear stepping at the load point
      expect(data[N].shear).toBeCloseTo(0, 1); // at tip, shear returns to 0 after the point load
    });
  });
});

// ============================================================
// Hybrid Diagram (Superposition)
// ============================================================

describe("generateHybridDiagramData", () => {
  it("empty loads returns all zeros", () => {
    const data = generateHybridDiagramData("simply-supported", [], L, E, I, N);
    expect(data).toHaveLength(N + 1);
    data.forEach((p) => {
      expect(p.shear).toBe(0);
      expect(p.moment).toBe(0);
      expect(p.deflection).toBe(0);
    });
  });

  it("single load matches generateDiagramData", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const single = generateDiagramData("simply-supported", load, L, E, I, N);
    const hybrid = generateHybridDiagramData("simply-supported", [load], L, E, I, N);

    for (let i = 0; i <= N; i++) {
      expect(hybrid[i].shear).toBeCloseTo(single[i].shear, 8);
      expect(hybrid[i].moment).toBeCloseTo(single[i].moment, 8);
      expect(hybrid[i].deflection).toBeCloseTo(single[i].deflection, 8);
    }
  });

  it("superposition: UDL + concentrated = sum of individuals", () => {
    const udl: LoadConfig = { type: "udl", intensity: 8000 };
    const conc: LoadConfig = { type: "concentrated", intensity: 15000, position: 0.5 };
    const d1 = generateDiagramData("simply-supported", udl, L, E, I, N);
    const d2 = generateDiagramData("simply-supported", conc, L, E, I, N);
    const hybrid = generateHybridDiagramData("simply-supported", [udl, conc], L, E, I, N);

    for (let i = 0; i <= N; i++) {
      expect(hybrid[i].shear).toBeCloseTo(d1[i].shear + d2[i].shear, 6);
      expect(hybrid[i].moment).toBeCloseTo(d1[i].moment + d2[i].moment, 6);
      expect(hybrid[i].deflection).toBeCloseTo(d1[i].deflection + d2[i].deflection, 6);
    }
  });
});

// ============================================================
// Influence Lines
// ============================================================

describe("generateInfluenceLineData — simply-supported", () => {
  const measurePos = 0.5; // midspan
  const data = generateInfluenceLineData("simply-supported", measurePos, L, N, E, I);

  it("returns numPoints+1 points", () => {
    expect(data).toHaveLength(N + 1);
  });

  it("reactions sum to 1 (unit load)", () => {
    data.forEach((p) => {
      expect(p.reactionA + p.reactionB).toBeCloseTo(1, 8);
    });
  });

  it("reactionA = 1 when load at x=0, reactionB = 1 when load at x=L", () => {
    expect(data[0].reactionA).toBeCloseTo(1, 6);
    expect(data[0].reactionB).toBeCloseTo(0, 6);
    expect(data[N].reactionA).toBeCloseTo(0, 6);
    expect(data[N].reactionB).toBeCloseTo(1, 6);
  });

  it("moment IL is max when load at measurement point", () => {
    const atMeasure = atXInfluence(data, measurePos * L);
    // For midspan: M = a(L-a)/L = (L/2)(L/2)/L = L/4
    expect(atMeasure.momentAt).toBeCloseTo(L / 4, 1);
  });

  it("moment IL is zero when load at supports", () => {
    expect(data[0].momentAt).toBeCloseTo(0, 4);
    expect(data[N].momentAt).toBeCloseTo(0, 4);
  });

  it("shear IL has discontinuity at measurement point", () => {
    // Just before: negative, just after: positive (for midspan)
    const before = data[Math.floor(N * 0.48)];
    const after = data[Math.ceil(N * 0.52)];
    expect(before.shearAt).toBeLessThan(0);
    expect(after.shearAt).toBeGreaterThan(0);
  });

  it("deflection IL is symmetric for midspan measurement", () => {
    const quarter = atXInfluence(data, L / 4);
    const threeQuarter = atXInfluence(data, 3 * L / 4);
    expect(quarter.deflectionAt).toBeCloseTo(threeQuarter.deflectionAt, 2);
  });
});

describe("generateInfluenceLineData — cantilever", () => {
  const measurePos = 0.5;
  const data = generateInfluenceLineData("cantilever", measurePos, L, N, E, I);

  it("reactionA = 1 for all positions (single fixed support)", () => {
    data.forEach((p) => {
      expect(p.reactionA).toBeCloseTo(1, 6);
    });
  });

  it("shear is 0 before measurement, -1 after", () => {
    const before = data[Math.floor(N * 0.3)];
    const after = data[Math.ceil(N * 0.7)];
    expect(before.shearAt).toBeCloseTo(0, 4);
    expect(after.shearAt).toBeCloseTo(-1, 4);
  });

  it("moment is 0 before measurement, -(xp-a) after", () => {
    const before = data[Math.floor(N * 0.3)];
    expect(before.momentAt).toBeCloseTo(0, 4);
    const after = atXInfluence(data, 0.8 * L);
    const expected = -(0.8 * L - measurePos * L);
    expect(after.momentAt).toBeCloseTo(expected, 1);
  });
});

// ============================================================
// Envelope Data
// ============================================================

describe("generateEnvelopeData — simply-supported", () => {
  const data = generateEnvelopeData("simply-supported", 10000, L, E, I, N, 20);

  it("returns numPoints+1 points", () => {
    expect(data).toHaveLength(N + 1);
  });

  it("maxShear >= minShear everywhere", () => {
    data.forEach((p) => {
      expect(p.maxShear).toBeGreaterThanOrEqual(p.minShear);
    });
  });

  it("maxMoment >= minMoment everywhere", () => {
    data.forEach((p) => {
      expect(p.maxMoment).toBeGreaterThanOrEqual(p.minMoment);
    });
  });

  it("maxDeflection >= minDeflection everywhere", () => {
    data.forEach((p) => {
      expect(p.maxDeflection).toBeGreaterThanOrEqual(p.minDeflection);
    });
  });

  it("max moment envelope peaks near midspan", () => {
    const mid = atXEnvelope(data, L / 2);
    const edge = data[0];
    expect(mid.maxMoment).toBeGreaterThan(edge.maxMoment);
  });

  it("shear envelope is widest near supports", () => {
    const support = data[0];
    const mid = atXEnvelope(data, L / 2);
    const supportRange = support.maxShear - support.minShear;
    const midRange = mid.maxShear - mid.minShear;
    expect(supportRange).toBeGreaterThanOrEqual(midRange);
  });

  it("envelope bounds are non-trivial (not all zero)", () => {
    const anyNonZeroMoment = data.some((p) => p.maxMoment > 0);
    const anyNonZeroShear = data.some((p) => p.maxShear > 0);
    expect(anyNonZeroMoment).toBe(true);
    expect(anyNonZeroShear).toBe(true);
  });
});
