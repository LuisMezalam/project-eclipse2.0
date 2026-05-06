import { describe, it, expect } from "vitest";
import {
  calculateCrossSectionProperties,
  type CrossSectionDimensions,
} from "@/lib/beamAnalysis";

describe("calculateCrossSectionProperties", () => {
  it("rectangular section: A = bh, I = bh³/12", () => {
    const dims: CrossSectionDimensions = { type: "rectangular", width: 0.1, height: 0.2 };
    const props = calculateCrossSectionProperties(dims);
    expect(props.area).toBeCloseTo(0.02, 6);
    expect(props.momentOfInertia).toBeCloseTo((0.1 * 0.2 ** 3) / 12, 10);
    expect(props.sectionModulus).toBeCloseTo(props.momentOfInertia / 0.1, 10);
    expect(props.radiusOfGyration).toBeCloseTo(Math.sqrt(props.momentOfInertia / props.area), 10);
  });

  it("circular section: A = πr², I = πd⁴/64", () => {
    const d = 0.15;
    const props = calculateCrossSectionProperties({ type: "circular", diameter: d });
    expect(props.area).toBeCloseTo(Math.PI * (d / 2) ** 2, 8);
    expect(props.momentOfInertia).toBeCloseTo((Math.PI * d ** 4) / 64, 12);
    expect(props.polarMomentOfInertia).toBeCloseTo((Math.PI * d ** 4) / 32, 12);
  });

  it("I-beam section areas sum correctly", () => {
    const dims: CrossSectionDimensions = {
      type: "i-beam",
      flangeWidth: 0.15,
      flangeThickness: 0.015,
      height: 0.3,
      webThickness: 0.01,
    };
    const props = calculateCrossSectionProperties(dims);
    const hw = 0.3 - 2 * 0.015;
    const expectedArea = 2 * 0.15 * 0.015 + hw * 0.01;
    expect(props.area).toBeCloseTo(expectedArea, 8);
    expect(props.momentOfInertia).toBeGreaterThan(0);
    expect(props.sectionModulus).toBeGreaterThan(0);
  });

  it("hollow circular: I_outer - I_inner", () => {
    const d = 0.2, di = 0.15;
    const props = calculateCrossSectionProperties({ type: "hollow-circular", diameter: d, innerDiameter: di });
    const expectedI = (Math.PI * (d ** 4 - di ** 4)) / 64;
    expect(props.momentOfInertia).toBeCloseTo(expectedI, 12);
  });
});
