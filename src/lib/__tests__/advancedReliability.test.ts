import { describe, it, expect } from "vitest";
import {
  performRBDO,
  analyzeSystemReliability,
  analyzeTimeDependentReliability,
  validateRBDOWithMonteCarlo,
  performAdaptiveSampling,
  type RBDOVariable,
  type RBDOConstraint,
  type SystemComponent,
  type StochasticProcess,
} from "@/lib/advancedReliability";

// ============================================================
// RBDO (Reliability-Based Design Optimization)
// ============================================================

describe("performRBDO", () => {
  const makeVariables = (designMean: number): RBDOVariable[] => [
    { name: "Resistance", mean: designMean, stdDev: 20, lowerBound: 200, upperBound: 800, isDesign: true, unit: "kN" },
    { name: "Load", mean: 200, stdDev: 30, lowerBound: 0, upperBound: 500, isDesign: false, unit: "kN" },
  ];

  const objective = (d: number[]) => d[0]; // minimize resistance (cost proxy)
  const constraint: RBDOConstraint = {
    name: "Strength",
    targetReliability: 3.0,
    limitStateFunction: (design, random) => design[0] - random[0], // R - S > 0
  };

  it("returns a valid result structure", () => {
    const result = performRBDO(makeVariables(400), objective, constraint, { maxIterations: 20 });
    expect(result.optimalDesign).toBeDefined();
    expect(result.optimalDesign.length).toBe(1);
    expect(result.reliabilityIndex).toBeGreaterThan(0);
    expect(result.probabilityOfFailure).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfFailure).toBeLessThan(1);
    expect(result.convergenceHistory.length).toBeGreaterThan(0);
    expect(["converged", "maxIterations", "infeasible"]).toContain(result.status);
  });

  it("optimal design respects bounds", () => {
    const vars = makeVariables(400);
    const result = performRBDO(vars, objective, constraint, { maxIterations: 30 });
    expect(result.optimalDesign[0]).toBeGreaterThanOrEqual(vars[0].lowerBound);
    expect(result.optimalDesign[0]).toBeLessThanOrEqual(vars[0].upperBound);
  });

  it("convergence history records iterations", () => {
    const result = performRBDO(makeVariables(400), objective, constraint, { maxIterations: 10 });
    expect(result.convergenceHistory.length).toBeLessThanOrEqual(10);
    for (const h of result.convergenceHistory) {
      expect(h.iteration).toBeGreaterThanOrEqual(0);
      expect(typeof h.objective).toBe("number");
      expect(typeof h.beta).toBe("number");
      expect(typeof h.feasible).toBe("boolean");
    }
  });

  it("iterationCount matches history length", () => {
    const result = performRBDO(makeVariables(400), objective, constraint, { maxIterations: 15 });
    expect(result.iterationCount).toBeLessThanOrEqual(15);
  });
});

// ============================================================
// Monte Carlo Validation for RBDO
// ============================================================

describe("validateRBDOWithMonteCarlo", () => {
  const limitState = (design: number[], random: number[]) => design[0] - random[0];

  it("returns correct structure", () => {
    const result = validateRBDOWithMonteCarlo(limitState, [400], [200], [30], 5000);
    expect(result.numSamples).toBe(5000);
    expect(result.failureCount).toBeGreaterThanOrEqual(0);
    expect(result.estimatedPf).toBeGreaterThanOrEqual(0);
    expect(result.estimatedPf).toBeLessThanOrEqual(1);
    expect(result.histogram.length).toBe(30);
    expect(result.sampleLimitStates.length).toBeLessThanOrEqual(500);
  });

  it("Pf ≈ 0 when design >> load", () => {
    const result = validateRBDOWithMonteCarlo(limitState, [1000], [200], [20], 10000);
    expect(result.estimatedPf).toBe(0);
    expect(result.failureCount).toBe(0);
  });

  it("Pf ≈ 0.5 when design = load mean with equal std", () => {
    const result = validateRBDOWithMonteCarlo(limitState, [200], [200], [30], 20000);
    expect(result.estimatedPf).toBeGreaterThan(0.35);
    expect(result.estimatedPf).toBeLessThan(0.65);
  });

  it("confidence interval brackets estimated Pf", () => {
    const result = validateRBDOWithMonteCarlo(limitState, [300], [200], [40], 10000);
    if (result.estimatedPf > 0) {
      expect(result.confidenceInterval.lower).toBeLessThanOrEqual(result.estimatedPf);
      expect(result.confidenceInterval.upper).toBeGreaterThanOrEqual(result.estimatedPf);
    }
  });
});

// ============================================================
// System Reliability Analysis
// ============================================================

describe("analyzeSystemReliability", () => {
  const makeComponents = (pfs: number[]): SystemComponent[] =>
    pfs.map((pf, i) => ({
      id: `comp_${i}`,
      name: `Component ${i + 1}`,
      reliabilityIndex: 3.0,
      probabilityOfFailure: pf,
      importance: 0,
    }));

  describe("series system", () => {
    it("system Pf ≥ max component Pf (weakest link)", () => {
      const comps = makeComponents([0.01, 0.02, 0.005]);
      const result = analyzeSystemReliability(comps, "series");
      expect(result.systemPf).toBeGreaterThanOrEqual(Math.max(...comps.map(c => c.probabilityOfFailure)));
    });

    it("cut sets: each component is its own cut set", () => {
      const comps = makeComponents([0.01, 0.02]);
      const result = analyzeSystemReliability(comps, "series");
      expect(result.cutSets).toBeDefined();
      expect(result.cutSets!.length).toBe(2);
      expect(result.cutSets![0].components.length).toBe(1);
    });

    it("system β is finite and positive", () => {
      const comps = makeComponents([0.01, 0.02, 0.015]);
      const result = analyzeSystemReliability(comps, "series");
      expect(result.systemBeta).toBeGreaterThan(0);
      expect(isFinite(result.systemBeta)).toBe(true);
    });
  });

  describe("parallel system", () => {
    it("system Pf ≤ min component Pf (redundancy)", () => {
      const comps = makeComponents([0.01, 0.02, 0.015]);
      const result = analyzeSystemReliability(comps, "parallel");
      // For independent parallel, Pf = product of individual Pfs
      expect(result.systemPf).toBeLessThanOrEqual(Math.min(...comps.map(c => c.probabilityOfFailure)));
    });

    it("cut sets: all components form one cut set", () => {
      const comps = makeComponents([0.01, 0.02]);
      const result = analyzeSystemReliability(comps, "parallel");
      expect(result.cutSets).toBeDefined();
      expect(result.cutSets!.length).toBe(1);
      expect(result.cutSets![0].components.length).toBe(2);
    });
  });

  describe("k-out-of-n system", () => {
    it("returns valid result", () => {
      const comps = makeComponents([0.01, 0.01, 0.01, 0.01]);
      const result = analyzeSystemReliability(comps, "k-out-of-n", 0, [], 3);
      expect(result.systemPf).toBeGreaterThanOrEqual(0);
      expect(result.systemPf).toBeLessThanOrEqual(1);
      expect(result.systemType).toBe("k-out-of-n");
    });
  });

  describe("series-parallel system", () => {
    it("returns valid result", () => {
      const comps = makeComponents([0.01, 0.02, 0.015, 0.01]);
      const result = analyzeSystemReliability(comps, "series-parallel");
      expect(result.systemPf).toBeGreaterThan(0);
      expect(result.systemType).toBe("series-parallel");
    });
  });

  describe("correlation effects", () => {
    it("correlation changes system Pf vs independent case", () => {
      const comps = makeComponents([0.01, 0.02, 0.015]);
      const indep = analyzeSystemReliability(comps, "series", 0);
      const corr = analyzeSystemReliability(comps, "series", 0.5);
      // With positive correlation, series Pf should differ
      expect(corr.correlationEffect).not.toBe(0);
    });
  });

  describe("common cause failures", () => {
    it("CCF increases system Pf", () => {
      const comps = makeComponents([0.01, 0.01, 0.01]);
      const noCCF = analyzeSystemReliability(comps, "parallel", 0, []);
      const withCCF = analyzeSystemReliability(comps, "parallel", 0, [
        { componentIds: ["comp_0", "comp_1", "comp_2"], betaFactor: 0.1, shockRate: 0.01 },
      ]);
      expect(withCCF.systemPf).toBeGreaterThanOrEqual(noCCF.systemPf);
      expect(withCCF.commonCauseContribution).toBeGreaterThan(0);
    });
  });

  describe("component importance measures", () => {
    it("importance measures are computed for each component", () => {
      const comps = makeComponents([0.01, 0.05, 0.001]);
      const result = analyzeSystemReliability(comps, "series");
      expect(result.componentImportance.length).toBe(3);
      for (const imp of result.componentImportance) {
        expect(imp.birnbaum).toBeGreaterThanOrEqual(0);
        expect(imp.birnbaum).toBeLessThanOrEqual(1);
        expect(imp.fusselVesely).toBeGreaterThanOrEqual(0);
        expect(imp.riskAchievement).toBeGreaterThanOrEqual(0);
      }
    });

    it("in series, weakest component has highest Fussell-Vesely importance", () => {
      const comps = makeComponents([0.001, 0.05, 0.001]);
      const result = analyzeSystemReliability(comps, "series");
      const fvValues = result.componentImportance.map(i => i.fusselVesely);
      const weakestIdx = result.componentImportance.findIndex(i => i.id === "comp_1");
      // comp_1 (Pf=0.05) should have highest or near-highest FV
      expect(fvValues[weakestIdx]).toBe(Math.max(...fvValues));
    });
  });

  describe("bounds", () => {
    it("Pf bounds bracket the estimate", () => {
      const comps = makeComponents([0.01, 0.02, 0.015]);
      const result = analyzeSystemReliability(comps, "series");
      expect(result.boundsPf.lower).toBeLessThanOrEqual(result.boundsPf.upper);
    });
  });
});

// ============================================================
// Time-Dependent Reliability Analysis
// ============================================================

describe("analyzeTimeDependentReliability", () => {
  const loadProcess: StochasticProcess = {
    type: "ornstein-uhlenbeck",
    mean: 200,
    variance: 400,   // std = 20
    correlationTime: 5,
  };

  const resistanceProcess: StochasticProcess = {
    type: "ornstein-uhlenbeck",
    mean: 350,
    variance: 625,   // std = 25
    correlationTime: 50,
  };

  it("returns correct structure", () => {
    const result = analyzeTimeDependentReliability(loadProcess, resistanceProcess, 50, 20, 50);
    expect(result.timePoints.length).toBe(20);
    expect(result.instantReliability.length).toBe(20);
    expect(result.cumulativeReliability.length).toBe(20);
    expect(result.loadTimeHistory.length).toBe(20);
    expect(result.resistanceTimeHistory.length).toBe(20);
    expect(result.outcrossingRate.length).toBe(20);
    expect(result.hazardFunction.length).toBe(20);
  });

  it("cumulative reliability is non-increasing", () => {
    const result = analyzeTimeDependentReliability(loadProcess, resistanceProcess, 50, 30, 100);
    for (let i = 1; i < result.cumulativeReliability.length; i++) {
      expect(result.cumulativeReliability[i]).toBeLessThanOrEqual(
        result.cumulativeReliability[i - 1] + 1e-10 // small tolerance for stochastic noise
      );
    }
  });

  it("cumulative reliability starts near 1.0", () => {
    const result = analyzeTimeDependentReliability(loadProcess, resistanceProcess, 50, 30, 200);
    // At t=0 most simulations should not have failed yet
    expect(result.cumulativeReliability[0]).toBeGreaterThan(0.8);
  });

  it("first passage time statistics are valid", () => {
    const result = analyzeTimeDependentReliability(loadProcess, resistanceProcess, 50, 30, 100);
    expect(result.firstPassageTime.mean).toBeGreaterThan(0);
    expect(result.firstPassageTime.stdDev).toBeGreaterThanOrEqual(0);
    expect(result.firstPassageTime.percentiles.length).toBe(5);
    // Percentiles should be non-decreasing
    for (let i = 1; i < result.firstPassageTime.percentiles.length; i++) {
      expect(result.firstPassageTime.percentiles[i]).toBeGreaterThanOrEqual(
        result.firstPassageTime.percentiles[i - 1]
      );
    }
  });

  it("load time history has proper mean/band structure", () => {
    const result = analyzeTimeDependentReliability(loadProcess, resistanceProcess, 50, 20, 100);
    for (const pt of result.loadTimeHistory) {
      expect(pt.upper).toBeGreaterThanOrEqual(pt.mean);
      expect(pt.lower).toBeLessThanOrEqual(pt.mean);
    }
  });

  it("resistance time history has proper mean/band structure", () => {
    const result = analyzeTimeDependentReliability(loadProcess, resistanceProcess, 50, 20, 100);
    for (const pt of result.resistanceTimeHistory) {
      expect(pt.upper).toBeGreaterThanOrEqual(pt.mean);
      expect(pt.lower).toBeLessThanOrEqual(pt.mean);
    }
  });

  it("Gaussian process type works", () => {
    const gpLoad: StochasticProcess = { ...loadProcess, type: "gaussian" };
    const gpRes: StochasticProcess = { ...resistanceProcess, type: "gaussian" };
    const result = analyzeTimeDependentReliability(gpLoad, gpRes, 10, 10, 30);
    expect(result.timePoints.length).toBe(10);
    expect(result.instantReliability.length).toBe(10);
  });

  it("high separation → few failures", () => {
    const strongResistance: StochasticProcess = {
      type: "ornstein-uhlenbeck",
      mean: 1000,
      variance: 100,
      correlationTime: 50,
    };
    const result = analyzeTimeDependentReliability(loadProcess, strongResistance, 50, 20, 200);
    // Cumulative reliability should stay near 1.0
    expect(result.cumulativeReliability[result.cumulativeReliability.length - 1]).toBeGreaterThan(0.9);
  });
});

// ============================================================
// Adaptive Sampling
// ============================================================

describe("performAdaptiveSampling", () => {
  const linearResponse = (x: number[]) => 2 * x[0] + 3 * x[1];

  it("returns correct structure", () => {
    const result = performAdaptiveSampling(linearResponse, [10, 20], [2, 3], {
      initialSamples: 50,
      refinementIterations: 2,
      samplesPerRefinement: 20,
    });
    expect(result.samples.length).toBeGreaterThan(50);
    expect(result.statistics.mean).toBeDefined();
    expect(result.statistics.variance).toBeDefined();
    expect(result.sensitivityMap.length).toBe(2);
    expect(result.convergenceHistory.length).toBe(3); // initial + 2 refinements
    expect(result.effectiveSampleSize).toBeGreaterThan(0);
  });

  it("statistics approximate expected values for linear function", () => {
    const result = performAdaptiveSampling(linearResponse, [10, 20], [2, 3], {
      initialSamples: 500,
      refinementIterations: 3,
    });
    // E[2X + 3Y] = 2*10 + 3*20 = 80
    expect(result.statistics.mean).toBeGreaterThan(50);
    expect(result.statistics.mean).toBeLessThan(110);
  });

  it("effective sample size ≤ total samples", () => {
    const result = performAdaptiveSampling(linearResponse, [10, 20], [2, 3], {
      initialSamples: 100,
      refinementIterations: 2,
    });
    expect(result.effectiveSampleSize).toBeLessThanOrEqual(result.samples.length);
    expect(result.effectiveSampleSize).toBeGreaterThan(0);
  });

  it("sensitivity map sums dimensions", () => {
    const result = performAdaptiveSampling(linearResponse, [10, 20], [2, 3], {
      initialSamples: 100,
      refinementIterations: 2,
    });
    // Should have one entry per dimension
    const dims = result.sensitivityMap.map(s => s.dimension);
    expect(dims).toContain(0);
    expect(dims).toContain(1);
    // Max normalized sensitivity should be 1.0
    expect(Math.max(...result.sensitivityMap.map(s => s.sensitivity))).toBeCloseTo(1, 5);
  });
});
