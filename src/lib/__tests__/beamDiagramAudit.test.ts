import { describe, expect, it } from "vitest";
import { solveBeamResponse, type BeamSupportCondition, type LoadConfig } from "@/lib/beamAnalysis";

const L = 9.7536;
const B = 4.8768;
const C = 7.3152;
const q = 36.48475734301591 * 1000;
const P = 155.68775653411748 * 1000;
const E = 200e9;
const I = 1e-5;
const supports: BeamSupportCondition[] = [
  { position: 0, type: "fixed" },
  { position: 0.75, type: "roller" },
];
const analyticalLoads: LoadConfig[] = [
  { type: "partial-udl", intensity: q, startPosition: 0, endPosition: 0.5 },
  { type: "concentrated", intensity: P, position: 1 },
];

function integrateSimpson(fn: (x: number) => number, start: number, end: number, intervals = 2000) {
  const evenIntervals = intervals + (intervals % 2);
  const step = (end - start) / evenIntervals;
  let sum = fn(start) + fn(end);
  for (let index = 1; index < evenIntervals; index++) sum += (index % 2 === 0 ? 2 : 4) * fn(start + index * step);
  return sum * step / 3;
}

/** Independent unit-load/compatibility solution for a fixed beam with one prop. */
function continuousOracle(a = 0, loadEnd = B, point = L, intensity = q, pointLoad = P) {
  const momentFromLoads = (x: number) => {
    const pointMoment = x < point ? -pointLoad * (point - x) : 0;
    const distributedMoment = x < a
      ? -intensity * ((loadEnd - x) ** 2 - (a - x) ** 2) / 2
      : x < loadEnd
        ? -intensity * (loadEnd - x) ** 2 / 2
        : 0;
    return pointMoment + distributedMoment;
  };
  const numerator = integrateSimpson((x) => momentFromLoads(x) * (C - x), 0, C);
  const denominator = (C ** 3) / 3;
  const propReaction = -numerator / denominator;
  const distributedLoad = intensity * (loadEnd - a);
  const totalLoad = distributedLoad + pointLoad;
  const firstMoment = distributedLoad * (a + loadEnd) / 2 + pointLoad * point;
  const fixedReaction = totalLoad - propReaction;
  const fixedCouple = firstMoment - propReaction * C;
  const momentAt = (x: number) => {
    const distributedMoment = x <= a
      ? 0
      : x <= loadEnd
        ? intensity * (x - a) ** 2 / 2
        : intensity * (loadEnd - a) * (x - (a + loadEnd) / 2);
    return -fixedCouple + fixedReaction * x - distributedMoment - (x >= point ? pointLoad * (x - point) : 0) + (x >= C ? propReaction * (x - C) : 0);
  };
  const shearBeforeProp = fixedReaction - distributedLoad;
  const shearAfterProp = shearBeforeProp + propReaction;
  const candidates = [0, a, loadEnd, C, point, L];
  const root = a + fixedReaction / intensity;
  if (root >= a && root <= loadEnd) candidates.push(root);
  const moments = candidates.map((x) => momentAt(x));
  const shears = [fixedReaction, shearBeforeProp, shearAfterProp, 0];
  return {
    fixedReaction,
    propReaction,
    fixedCouple,
    totalLoad,
    centroid: firstMoment / totalLoad,
    maxShear: Math.max(...shears),
    minShear: Math.min(...shears),
    maxMoment: Math.max(...moments),
    minMoment: Math.min(...moments),
    maxMomentPosition: root,
    momentAt,
  };
}

/** Independent free-body solution for an ungrounded internal hinge at B. */
function hingedOracle(a = 0, loadEnd = B, point = L, intensity = q, pointLoad = P) {
  const distributedLoad = intensity * (loadEnd - a);
  const propReaction = pointLoad * (point - B) / (C - B);
  const rightHingeForce = pointLoad - propReaction;
  const leftHingeForce = -rightHingeForce;
  const fixedReaction = distributedLoad - leftHingeForce;
  const fixedCouple = distributedLoad * (a + loadEnd) / 2 - leftHingeForce * B;
  const root = a + fixedReaction / intensity;
  const maxMoment = -fixedCouple + fixedReaction * root - intensity * (root - a) ** 2 / 2;
  const minMoment = -pointLoad * (point - C);
  return {
    fixedReaction,
    propReaction,
    fixedCouple,
    hingeForce: rightHingeForce,
    totalLoad: distributedLoad + pointLoad,
    centroid: (distributedLoad * (a + loadEnd) / 2 + pointLoad * point) / (distributedLoad + pointLoad),
    maxShear: Math.max(fixedReaction, -rightHingeForce, propReaction + rightHingeForce),
    minShear: Math.min(fixedReaction - distributedLoad, rightHingeForce),
    maxMoment,
    minMoment,
    maxMomentPosition: root,
  };
}

/** Independent left-propped-cantilever plus right overhang solution for a grounded hinge at B. */
function groundedHingeOracle(a: number, loadEnd: number, point: number, intensity: number, pointLoad: number) {
  const distributedLoad = intensity * (loadEnd - a);
  const leftLoadMoment = (x: number) => x < a
    ? -intensity * ((loadEnd - x) ** 2 - (a - x) ** 2) / 2
    : x < loadEnd
      ? -intensity * (loadEnd - x) ** 2 / 2
      : 0;
  const leftPropReaction = -integrateSimpson((x) => leftLoadMoment(x) * (B - x), 0, B) / (B ** 3 / 3);
  const fixedReaction = distributedLoad - leftPropReaction;
  const fixedCouple = distributedLoad * (a + loadEnd) / 2 - leftPropReaction * B;
  const rightPropReaction = pointLoad * (point - B) / (C - B);
  const rightHingeReaction = pointLoad - rightPropReaction;
  const groundHingeReaction = leftPropReaction + rightHingeReaction;
  const maxMomentPosition = a + fixedReaction / intensity;
  const maxMoment = -fixedCouple + fixedReaction * maxMomentPosition - intensity * (maxMomentPosition - a) ** 2 / 2;
  return {
    fixedReaction,
    fixedCouple,
    groundHingeReaction,
    rightPropReaction,
    maxMoment,
    minMoment: -pointLoad * (point - C),
    maxShear: pointLoad,
    minShear: Math.min(fixedReaction - distributedLoad, rightHingeReaction),
  };
}

function closeRelative(actual: number, expected: number, tolerance = 1e-6) {
  if (expected === 0) {
    expect(Math.abs(actual)).toBeLessThan(tolerance);
    return;
  }
  expect(Math.abs(actual - expected) / Math.max(Math.abs(actual), Math.abs(expected))).toBeLessThan(tolerance);
}

describe("beam diagram forensic benchmarks", () => {
  it("keeps the default Gerber release layout stable and in equilibrium", () => {
    const result = solveBeamResponse("gerber", [{ type: "udl", intensity: 10_000 }], 6);
    expect(result.supportReactions).toHaveLength(2);
    closeRelative(result.supportReactions.reduce((sum, reaction) => sum + reaction.vertical, 0), result.analysis.totalLoad);
    expect(result.analysis.maxDeflection).toBeLessThan(1);
    const hinge = result.diagramData.reduce((nearest, point) => Math.abs(point.x - 3) < Math.abs(nearest.x - 3) ? point : nearest);
    closeRelative(hinge.moment * 1000, 0, 0.01);
    const rightMidspan = result.diagramData.reduce((nearest, point) => Math.abs(point.x - 4.5) < Math.abs(nearest.x - 4.5) ? point : nearest);
    closeRelative(rightMidspan.moment * 1000, 11_250);
    closeRelative(result.diagramData.at(-1)!.x, 6);
    closeRelative(result.diagramData.at(-1)!.moment * 1000, 0, 1e-3);
    expect(result.diagramData.every((point) => Number.isFinite(point.shear + point.moment + point.deflection))).toBe(true);
  });

  it("detects the pin-ended internal-release mechanism and reports the fallback", () => {
    const result = solveBeamResponse("gerber", [{ type: "udl", intensity: 10_000 }], 6, E, I, [
      { position: 0, type: "pin" },
      { position: 1, type: "roller" },
    ], { internalHinges: [0.5] });

    expect(result.supportFallback).toBe(true);
    expect(result.supportReactions).toHaveLength(2);
    closeRelative(result.supportReactions.reduce((sum, reaction) => sum + reaction.vertical, 0), result.analysis.totalLoad);
  });

  it("matches the independent compatibility solution for the continuous fixed-overhang beam", () => {
    const reference = continuousOracle();
    closeRelative(reference.fixedReaction, 67135.196601);
    closeRelative(reference.propReaction, 266481.424544);
    closeRelative(reference.fixedCouple, 3012.928774);
    closeRelative(reference.maxMoment, 58754.435885);
    closeRelative(reference.minMoment, -379629.025533);

    const result = solveBeamResponse("overhanging", analyticalLoads, L, E, I, supports, {
      numPoints: 400, includeEventSamples: true, includeExtremaSamples: true,
      extraSamplePositions: [1, 2, B, 5.5, C, 8.5],
    });
    expect(result.supportFallback).toBe(false);
    expect(result.supportReactions).toHaveLength(2);
    closeRelative(result.supportReactions[0].vertical, reference.fixedReaction);
    closeRelative(result.supportReactions[0].moment, reference.fixedCouple);
    closeRelative(result.supportReactions[1].vertical, reference.propReaction);
    closeRelative(result.analysis.totalLoad, reference.totalLoad);
    closeRelative(result.analysis.centroidX, reference.centroid);
    closeRelative(result.analysis.maxShear, reference.maxShear);
    closeRelative(result.analysis.minShear ?? 0, reference.minShear);
    closeRelative(result.analysis.maxBendingMoment, reference.maxMoment);
    closeRelative(result.analysis.minBendingMoment ?? 0, reference.minMoment);
    closeRelative(result.diagramData[0].moment * 1000, -reference.fixedCouple);
    closeRelative(result.diagramData.at(-1)!.shear * 1000, P);
    closeRelative(result.diagramData.at(-1)!.moment * 1000, 0, 1e-3);

    const at = (x: number) => result.diagramData.reduce((nearest, candidate) =>
      Math.abs(candidate.x - x) < Math.abs(nearest.x - x) ? candidate : nearest,
    );
    closeRelative((at(2).shear - at(1).shear) * 1000, -q);
    const vAtOne = at(1).shear * 1000;
    closeRelative((at(2).moment - at(1).moment) * 1000, vAtOne - q / 2);
    const peakMoment = Math.max(...result.diagramData.map((point) => point.moment * 1000));
    closeRelative(peakMoment, result.analysis.maxBendingMoment);
    const atC = at(C);
    expect(Math.abs(at(0).deflection)).toBeLessThan(1e-5);
    expect(Math.abs(atC.deflection)).toBeLessThan(1e-5);
  });

  it("models B as a true ungrounded internal hinge when released", () => {
    const reference = hingedOracle();
    closeRelative(reference.fixedReaction, 22241.108076);
    closeRelative(reference.propReaction, 311375.513068);
    closeRelative(reference.fixedCouple, -325396.307600);
    closeRelative(reference.maxMoment, 332175.397341);
    closeRelative(reference.minMoment, -379629.025533);

    const result = solveBeamResponse("gerber", analyticalLoads, L, E, I, supports, {
      numPoints: 400, includeEventSamples: true, includeExtremaSamples: true,
      internalHinges: [B / L],
    });
    expect(result.supportFallback).toBe(false);
    expect(result.supportReactions).toHaveLength(2);
    closeRelative(result.supportReactions[0].vertical, reference.fixedReaction);
    closeRelative(result.supportReactions[0].moment, reference.fixedCouple);
    closeRelative(result.supportReactions[1].vertical, reference.propReaction);
    closeRelative(result.analysis.maxShear, reference.maxShear);
    closeRelative(result.analysis.minShear ?? 0, reference.minShear);
    closeRelative(result.analysis.maxBendingMoment, reference.maxMoment);
    closeRelative(result.analysis.minBendingMoment ?? 0, reference.minMoment);
    const atB = result.diagramData.find((point) => Math.abs(point.x - B) < 1e-10)!;
    closeRelative(atB.moment * 1000, 0, 0.01);
    const leftOfB = result.diagramData.filter((point) => point.x < B).at(-1)!;
    const rightOfB = result.diagramData.find((point) => point.x > B)!;
    expect(Math.abs(leftOfB.moment)).toBeLessThan(0.01);
    expect(Math.abs(rightOfB.moment)).toBeLessThan(0.01);
    expect(Math.abs(leftOfB.deflection - rightOfB.deflection)).toBeLessThan(1e-3);
    closeRelative(result.diagramData[0].moment * 1000, -reference.fixedCouple);
    expect(result.supportReactions.some((reaction) => Math.abs(reaction.position - B) < 1e-8)).toBe(false);
    const peakMoment = Math.max(...result.diagramData.map((point) => point.moment * 1000));
    closeRelative(peakMoment, result.analysis.maxBendingMoment);
  });

  it("keeps a grounded hinge distinct from an internal release", () => {
    const groundedSupports: BeamSupportCondition[] = [
      { position: 0, type: "fixed" },
      { position: 0.5, type: "hinge" },
      { position: 0.75, type: "roller" },
    ];
    const result = solveBeamResponse("overhanging", analyticalLoads, L, E, I, groundedSupports);
    expect(result.supportReactions).toHaveLength(3);
    expect(result.supportReactions[1].vertical).not.toBeCloseTo(0, 1);
  });

  it("identifies the reported +60.9 kN·m fixture as a grounded hinge with the 5%/95% load offsets", () => {
    const forensicQ = 36_500;
    const forensicP = 155_700;
    const forensicStart = 0.05 * L;
    const forensicPoint = 0.95 * L;
    const forensicLoads: LoadConfig[] = [
      { type: "partial-udl", intensity: forensicQ, startPosition: 0.05, endPosition: 0.5 },
      { type: "concentrated", intensity: forensicP, position: 0.95 },
    ];
    const reference = groundedHingeOracle(forensicStart, B, forensicPoint, forensicQ, forensicP);
    const result = solveBeamResponse("overhanging", forensicLoads, L, E, I, [
      { position: 0, type: "fixed" },
      { position: 0.5, type: "hinge" },
      { position: 0.75, type: "roller" },
    ], { numPoints: 400, includeEventSamples: true, includeExtremaSamples: true });
    closeRelative(result.analysis.totalLoad, 315_902.88);
    closeRelative(result.analysis.centroidX, 5.927158109);
    closeRelative(result.supportReactions[0].vertical, reference.fixedReaction);
    closeRelative(result.supportReactions[0].moment, reference.fixedCouple);
    closeRelative(result.supportReactions[1].vertical, reference.groundHingeReaction);
    closeRelative(result.supportReactions[2].vertical, reference.rightPropReaction);
    closeRelative(result.analysis.maxShear, reference.maxShear);
    closeRelative(result.analysis.minShear ?? 0, reference.minShear);
    closeRelative(result.analysis.maxBendingMoment, reference.maxMoment);
    closeRelative(result.analysis.minBendingMoment ?? 0, reference.minMoment);
    closeRelative(reference.maxMoment, 60_878.703460);
  });

  it("preserves partial-load start at zero and a point load at the free tip", () => {
    const result = solveBeamResponse("overhanging", analyticalLoads, L, E, I, supports, {
      numPoints: 200, includeEventSamples: true, includeExtremaSamples: true,
    });
    closeRelative(result.analysis.totalLoad, q * B + P);
    closeRelative(result.analysis.centroidX, 5.85216);
    closeRelative(result.diagramData.at(-1)!.shear * 1000, P);
    closeRelative(result.diagramData.at(-1)!.moment * 1000, 0, 1e-3);
  });

  it("balances a point force coincident with an interior roller without a false span diagram", () => {
    const pointLoad = 25_000;
    const result = solveBeamResponse("overhanging", [
      { type: "concentrated", intensity: pointLoad, position: 0.75 },
    ], L, E, I, supports, { includeEventSamples: true, includeExtremaSamples: true });

    closeRelative(result.supportReactions[0].vertical, 0, 1e-3);
    closeRelative(result.supportReactions[1].vertical, pointLoad);
    closeRelative(result.analysis.maxShear, 0, 1e-3);
    closeRelative(result.analysis.minShear ?? 0, 0, 1e-3);
    closeRelative(result.analysis.maxBendingMoment, 0, 1e-3);
    closeRelative(result.analysis.minBendingMoment ?? 0, 0, 1e-3);
    expect(Math.abs(result.analysis.maxDeflection)).toBeLessThan(1e-6);
  });

  it("matches the simply-supported center-load and concentrated-couple sign checks", () => {
    const pointLoad = solveBeamResponse("simply-supported", [
      { type: "concentrated", intensity: 10_000, position: 0.5 },
    ], 4, E, I, undefined, { numPoints: 120, includeEventSamples: true, includeExtremaSamples: true });
    closeRelative(pointLoad.supportReactions[0].vertical, 5_000);
    closeRelative(pointLoad.supportReactions[1].vertical, 5_000);
    closeRelative(pointLoad.analysis.maxShear, 5_000);
    closeRelative(pointLoad.analysis.minShear ?? 0, -5_000);
    closeRelative(pointLoad.analysis.maxBendingMoment, 10_000);
    closeRelative(pointLoad.analysis.minBendingMoment ?? 0, 0, 1e-3);

    const appliedMoment = solveBeamResponse("simply-supported", [
      { type: "moment", intensity: 10_000, position: 0.5 },
    ], 4, E, I, undefined, { numPoints: 120, includeEventSamples: true, includeExtremaSamples: true });
    closeRelative(appliedMoment.supportReactions[0].vertical, 2_500);
    closeRelative(appliedMoment.supportReactions[1].vertical, -2_500);
    const before = appliedMoment.diagramData.filter((point) => point.x < 2).at(-1)!;
    const after = appliedMoment.diagramData.find((point) => point.x > 2)!;
    closeRelative((after.moment - before.moment) * 1000, -10_000, 2e-6);
    closeRelative((after.shear - before.shear) * 1000, 0, 1e-3);
  });

  it("scales force, moment, and deflection linearly with the applied loads", () => {
    const load: LoadConfig[] = [{ type: "udl", intensity: 10_000 }];
    const baseline = solveBeamResponse("simply-supported", load, 4, E, I, undefined, {
      numPoints: 100, includeExtremaSamples: true,
    });
    const tripled = solveBeamResponse("simply-supported", [{ ...load[0], intensity: 30_000 }], 4, E, I, undefined, {
      numPoints: 100, includeExtremaSamples: true,
    });
    closeRelative(tripled.analysis.totalLoad, 3 * baseline.analysis.totalLoad);
    closeRelative(tripled.analysis.maxShear, 3 * baseline.analysis.maxShear);
    closeRelative(tripled.analysis.maxBendingMoment, 3 * baseline.analysis.maxBendingMoment);
    closeRelative(tripled.analysis.maxDeflection, 3 * baseline.analysis.maxDeflection);
  });

  it("keeps reactions and diagrams converged as the FE mesh is refined", () => {
    const reference = continuousOracle();
    const meshResults = [20, 40, 80, 160].map((elementCount) => solveBeamResponse(
      "overhanging", analyticalLoads, L, E, I, supports,
      { elementCount, numPoints: 400, includeEventSamples: true, includeExtremaSamples: true },
    ));
    const deflections = meshResults.map((result) => result.analysis.maxDeflection);
    const deflectionRange = Math.max(...deflections) - Math.min(...deflections);

    for (const result of meshResults) {
      closeRelative(result.supportReactions[0].vertical, reference.fixedReaction);
      closeRelative(result.supportReactions[1].vertical, reference.propReaction);
      closeRelative(result.analysis.maxBendingMoment, reference.maxMoment);
      closeRelative(result.analysis.minBendingMoment ?? 0, reference.minMoment);
      expect(result.supportFallback).toBe(false);
    }
    expect(deflectionRange / Math.max(...deflections)).toBeLessThan(1e-4);
  });

  it("reproduces the earlier offset fixture independently for both connection models", () => {
    const forensicQ = 36_500;
    const forensicP = 155_700;
    const forensicStart = 0.05 * L;
    const forensicPoint = 0.95 * L;
    const forensicLoads: LoadConfig[] = [
      { type: "partial-udl", intensity: forensicQ, startPosition: 0.05, endPosition: 0.5 },
      { type: "concentrated", intensity: forensicP, position: 0.95 },
    ];
    const continuousReference = continuousOracle(forensicStart, B, forensicPoint, forensicQ, forensicP);
    const continuous = solveBeamResponse("overhanging", forensicLoads, L, E, I, supports, {
      numPoints: 400, includeEventSamples: true, includeExtremaSamples: true,
    });
    closeRelative(continuous.analysis.totalLoad, 315902.88);
    closeRelative(continuous.analysis.centroidX, 5.927158109);
    closeRelative(continuous.analysis.minShear ?? 0, continuousReference.minShear);
    closeRelative(continuous.analysis.maxBendingMoment, continuousReference.maxMoment);
    closeRelative(continuous.analysis.minBendingMoment ?? 0, continuousReference.minMoment);

    const hingedReference = hingedOracle(forensicStart, B, forensicPoint, forensicQ, forensicP);
    const hinged = solveBeamResponse("gerber", forensicLoads, L, E, I, supports, {
      numPoints: 400, includeEventSamples: true, includeExtremaSamples: true,
      internalHinges: [0.5],
    });
    closeRelative(hinged.analysis.totalLoad, 315902.88);
    closeRelative(hinged.analysis.centroidX, 5.927158109);
    closeRelative(hinged.analysis.minShear ?? 0, hingedReference.minShear);
    closeRelative(hinged.analysis.maxBendingMoment, hingedReference.maxMoment);
    closeRelative(hinged.analysis.minBendingMoment ?? 0, hingedReference.minMoment);
  });
});
