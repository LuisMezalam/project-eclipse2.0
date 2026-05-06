import { describe, it, expect } from "vitest";
import {
  generateDiagramData,
  generateHybridDiagramData,
  generateEnvelopeData,
  type LoadConfig,
  type DiagramPoint,
  type EnvelopePoint,
} from "@/lib/beamAnalysis";

const L = 6;
const E = 200e9;
const I = 1e-5;
const N = 50;

const atX = (data: DiagramPoint[], target: number) =>
  data.reduce((best, p) => (Math.abs(p.x - target) < Math.abs(best.x - target) ? p : best));

const atXEnv = (data: EnvelopePoint[], target: number) =>
  data.reduce((best, p) => (Math.abs(p.x - target) < Math.abs(best.x - target) ? p : best));

// ============================================================
// Fixed-Fixed Beam — basic structural checks
// ============================================================

describe("generateDiagramData — fixed-fixed", () => {
  describe("UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const data = generateDiagramData("fixed-fixed", load, L, E, I, N);

    it("returns correct number of points", () => {
      expect(data).toHaveLength(N + 1);
    });

    it("produces non-zero shear values", () => {
      expect(data.some(p => Math.abs(p.shear) > 0.01)).toBe(true);
    });

    it("produces non-zero moment values", () => {
      expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
    });

    it("x ranges from 0 to L", () => {
      expect(data[0].x).toBeCloseTo(0, 6);
      expect(data[N].x).toBeCloseTo(L, 6);
    });
  });

  describe("Concentrated at midspan", () => {
    const load: LoadConfig = { type: "concentrated", intensity: 20000, position: 0.5 };
    const data = generateDiagramData("fixed-fixed", load, L, E, I, N);

    it("returns correct number of points", () => {
      expect(data).toHaveLength(N + 1);
    });

    it("produces non-zero moment values", () => {
      expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
    });
  });
});

// ============================================================
// Propped Cantilever
// ============================================================

describe("generateDiagramData — propped-cantilever", () => {
  describe("UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const data = generateDiagramData("propped-cantilever", load, L, E, I, N);

    it("returns correct number of points", () => {
      expect(data).toHaveLength(N + 1);
    });

    it("moment at fixed end is non-zero", () => {
      expect(Math.abs(data[0].moment)).toBeGreaterThan(0);
    });

    it("produces non-zero shear and moment", () => {
      expect(data.some(p => Math.abs(p.shear) > 0.01)).toBe(true);
      expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
    });

    it("deflection values are finite", () => {
      data.forEach(p => expect(isFinite(p.deflection)).toBe(true));
    });
  });
});

// ============================================================
// Overhanging Beam
// ============================================================

describe("generateDiagramData — overhanging", () => {
  describe("UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const data = generateDiagramData("overhanging", load, L, E, I, N);

    it("returns correct number of points", () => {
      expect(data).toHaveLength(N + 1);
    });

    it("has non-zero shear and moment", () => {
      expect(data.some(p => Math.abs(p.shear) > 0.01)).toBe(true);
      expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
    });
  });
});

// ============================================================
// Continuous Beam
// ============================================================

describe("generateDiagramData — continuous", () => {
  describe("UDL", () => {
    const load: LoadConfig = { type: "udl", intensity: 10000 };
    const data = generateDiagramData("continuous", load, L, E, I, N);

    it("returns correct number of points", () => {
      expect(data).toHaveLength(N + 1);
    });

    it("has negative moment at interior support", () => {
      const midData = atX(data, L / 2);
      expect(midData.moment).toBeLessThan(0);
    });

    it("produces non-zero shear and moment", () => {
      expect(data.some(p => Math.abs(p.shear) > 0.01)).toBe(true);
      expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
    });
  });
});

// ============================================================
// Cross-beam-type superposition integrity
// ============================================================

describe("Hybrid diagrams across beam types", () => {
  const beamTypes = ["simply-supported", "cantilever", "fixed-fixed"] as const;
  const udl: LoadConfig = { type: "udl", intensity: 5000 };
  const conc: LoadConfig = { type: "concentrated", intensity: 10000, position: 0.5 };

  for (const bt of beamTypes) {
    it(`${bt}: superposition holds for UDL + concentrated`, () => {
      const d1 = generateDiagramData(bt, udl, L, E, I, N);
      const d2 = generateDiagramData(bt, conc, L, E, I, N);
      const hybrid = generateHybridDiagramData(bt, [udl, conc], L, E, I, N);

      for (let i = 0; i <= N; i++) {
        expect(hybrid[i].shear).toBeCloseTo(d1[i].shear + d2[i].shear, 4);
        expect(hybrid[i].moment).toBeCloseTo(d1[i].moment + d2[i].moment, 4);
        expect(hybrid[i].deflection).toBeCloseTo(d1[i].deflection + d2[i].deflection, 4);
      }
    });
  }
});

// ============================================================
// Envelope across beam types
// ============================================================

describe("Envelope data — fixed-fixed", () => {
  const data = generateEnvelopeData("fixed-fixed", 10000, L, E, I, N, 20);

  it("maxShear >= minShear everywhere", () => {
    data.forEach(p => expect(p.maxShear).toBeGreaterThanOrEqual(p.minShear));
  });

  it("maxMoment >= minMoment everywhere", () => {
    data.forEach(p => expect(p.maxMoment).toBeGreaterThanOrEqual(p.minMoment));
  });

  it("envelope values are finite", () => {
    data.forEach(p => {
      expect(isFinite(p.maxShear)).toBe(true);
      expect(isFinite(p.maxMoment)).toBe(true);
    });
  });
});

// ============================================================
// Load types: partial-udl, trapezoidal, moment
// ============================================================

describe("generateDiagramData — additional load types", () => {
  it("partial-udl produces non-zero diagrams", () => {
    const load: LoadConfig = { type: "partial-udl", intensity: 10000, startPosition: 0.2, endPosition: 0.8 };
    const data = generateDiagramData("simply-supported", load, L, E, I, N);
    expect(data.some(p => Math.abs(p.shear) > 0.01)).toBe(true);
    expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
  });

  it("trapezoidal produces non-zero diagrams", () => {
    const load: LoadConfig = { type: "trapezoidal", intensity: 10000, startIntensity: 5000, endIntensity: 10000 };
    const data = generateDiagramData("simply-supported", load, L, E, I, N);
    expect(data.some(p => Math.abs(p.shear) > 0.01)).toBe(true);
    expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
  });

  it("moment load produces non-zero moment diagram", () => {
    const load: LoadConfig = { type: "moment", intensity: 10000, position: 0.5 };
    const data = generateDiagramData("simply-supported", load, L, E, I, N);
    expect(data.some(p => Math.abs(p.moment) > 0.01)).toBe(true);
  });
});
