import { useState, useMemo, useCallback } from "react";
import { normalInverseCDF, reliabilityIndex, probabilityOfFailure } from "@/lib/reliability";

export type TrussUnitSystem = "metric" | "imperial";

export interface TrussDisplayUnits {
  system: TrussUnitSystem;
  force: { factor: number; unit: string };       // N → display
  stress: { factor: number; unit: string };       // Pa → display
  length: { factor: number; unit: string };       // m → display
  area: { factor: number; unit: string };         // m² → display
  modulus: { factor: number; unit: string };      // Pa → display (GPa or ksi)
  areaSmall: { factor: number; unit: string };    // m² → display (cm² or in²)
}
import { normalRandom } from "@/lib/statistics";
import {
  type TrussNode,
  type TrussMember,
  type PointLoad,
  type MemberResult,
  type MemberReliability,
  type TrussSystemReliability,
  type ImportanceSamplingResult,
  type SubsetSimulationResult,
  type RBDOResult,
  type SensitivityResult,
  type LRFDResult,
  LRFD_COMBINATIONS,
  DEFAULT_COV_BY_CATEGORY,
  DEFAULT_YIELD_STRENGTH,
  DEFAULT_YIELD_COV,
  DEFAULT_AREA_COV,
  DEFAULT_LOAD_COV,
  fosmReliabilityIndex,
  sormReliabilityIndex,
  tormReliabilityIndex,
  analyzeHigherOrderConvergence,
  calculateReliabilityMarginOfError,
  importanceSamplingMonteCarlo,
  subsetSimulationMonteCarlo,
  reliabilityBasedDesignOptimization,
} from "@/lib/trussSolver";

export function useTrussAnalysis() {
  const [nodes, setNodes] = useState<TrussNode[]>([
    { id: 1, x: 0, y: 0, supportType: 'pin', loadX: 0, loadY: 0 },
    { id: 2, x: 3, y: 0, supportType: 'roller', loadX: 0, loadY: 0 },
    { id: 3, x: 1.5, y: 2, supportType: 'none', loadX: 0, loadY: 0 },
  ]);

  const [members, setMembers] = useState<TrussMember[]>([
    { id: 1, startNode: 1, endNode: 2, area: 0.001, elasticModulus: 200e9, isRigid: false, yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV },
    { id: 2, startNode: 1, endNode: 3, area: 0.001, elasticModulus: 200e9, isRigid: false, yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV },
    { id: 3, startNode: 2, endNode: 3, area: 0.001, elasticModulus: 200e9, isRigid: false, yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV },
  ]);

  const [pointLoads, setPointLoads] = useState<PointLoad[]>([
    { id: 1, nodeId: 3, magnitude: 10000, angle: 0, magnitudeCoV: DEFAULT_LOAD_COV, category: 'live' }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [structureType, setStructureType] = useState<'truss' | 'frame'>('truss');
  const [trussType, setTrussType] = useState<'custom' | 'warren' | 'pratt' | 'howe'>('custom');
  const [spanLength, setSpanLength] = useState(6);
  const [height, setHeight] = useState(2);
  const [numPanels, setNumPanels] = useState(4);
  const [appliedLoad, setAppliedLoad] = useState(10000);

  // Reliability analysis state
  const [showReliability, setShowReliability] = useState(true);
  const [runMonteCarlo, setRunMonteCarlo] = useState(false);
  const [runImportanceSampling, setRunImportanceSampling] = useState(false);
  const [mcSamples, setMcSamples] = useState(5000);
  const [isSamples, setIsSamples] = useState(2000);
  const [mcTrigger, setMcTrigger] = useState(0);
  const [isTrigger, setIsTrigger] = useState(0);

  // LRFD and Sensitivity state
  const [enableLRFD, setEnableLRFD] = useState(true);
  const [selectedCombination, setSelectedCombination] = useState<string>('lc2');
  const [showSensitivity, setShowSensitivity] = useState(true);

  // Subset Simulation state
  const [runSubsetSimulation, setRunSubsetSimulation] = useState(false);
  const [ssSamplesPerLevel, setSsSamplesPerLevel] = useState(500);
  const [ssTrigger, setSsTrigger] = useState(0);

  // RBDO state
  const [enableRBDO, setEnableRBDO] = useState(false);
  const [rbdoTargetBeta, setRbdoTargetBeta] = useState(3.5);
  const [rbdoTrigger, setRbdoTrigger] = useState(0);

  // Unit system
  const [unitSystem, setUnitSystem] = useState<TrussUnitSystem>("metric");

  const du = useMemo<TrussDisplayUnits>(() => {
    if (unitSystem === "imperial") {
      return {
        system: "imperial",
        force:     { factor: 1 / 4448.22,   unit: "kip" },
        stress:    { factor: 1 / 6894760,   unit: "ksi" },
        length:    { factor: 1 / 0.3048,    unit: "ft" },
        area:      { factor: 1550.0031,     unit: "in²" },   // m² → in²
        modulus:   { factor: 1 / 6894760,   unit: "ksi" },
        areaSmall: { factor: 1550.0031,     unit: "in²" },
      };
    }
    return {
      system: "metric",
      force:     { factor: 1 / 1000,  unit: "kN" },
      stress:    { factor: 1 / 1e6,   unit: "MPa" },
      length:    { factor: 1,         unit: "m" },
      area:      { factor: 1e4,       unit: "cm²" },   // m² → cm²
      modulus:   { factor: 1 / 1e9,   unit: "GPa" },
      areaSmall: { factor: 1e4,       unit: "cm²" },
    };
  }, [unitSystem]);

  // Generate standard truss configurations
  const generateTruss = useCallback((type: string) => {
    const panelWidth = spanLength / numPanels;
    const newNodes: TrussNode[] = [];
    const newMembers: TrussMember[] = [];
    const newLoads: PointLoad[] = [];
    let nodeId = 1;
    let memberId = 1;

    for (let i = 0; i <= numPanels; i++) {
      let supportType: TrussNode['supportType'] = 'none';
      if (i === 0) supportType = 'pin';
      else if (i === numPanels) supportType = 'roller';
      newNodes.push({ id: nodeId++, x: i * panelWidth, y: 0, supportType, loadX: 0, loadY: 0 });
    }

    let topLoadNodeId = -1;
    if (type === 'warren') {
      for (let i = 0; i < numPanels; i++) {
        const nId = nodeId++;
        if (i === Math.floor(numPanels / 2)) topLoadNodeId = nId;
        newNodes.push({ id: nId, x: (i + 0.5) * panelWidth, y: height, supportType: 'none', loadX: 0, loadY: 0 });
      }
    } else {
      for (let i = 1; i < numPanels; i++) {
        const nId = nodeId++;
        if (i === Math.floor(numPanels / 2)) topLoadNodeId = nId;
        newNodes.push({ id: nId, x: i * panelWidth, y: height, supportType: 'none', loadX: 0, loadY: 0 });
      }
    }

    if (topLoadNodeId > 0) {
      newLoads.push({ id: 1, nodeId: topLoadNodeId, magnitude: appliedLoad, angle: 0, magnitudeCoV: DEFAULT_LOAD_COV, category: 'live' });
    }

    const bottomNodes = newNodes.filter(n => n.y === 0);
    const topNodes = newNodes.filter(n => n.y === height);

    for (let i = 0; i < bottomNodes.length - 1; i++) {
      newMembers.push({ id: memberId++, startNode: bottomNodes[i].id, endNode: bottomNodes[i + 1].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
    }
    for (let i = 0; i < topNodes.length - 1; i++) {
      newMembers.push({ id: memberId++, startNode: topNodes[i].id, endNode: topNodes[i + 1].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
    }

    if (type === 'warren') {
      for (let i = 0; i < topNodes.length; i++) {
        newMembers.push({ id: memberId++, startNode: bottomNodes[i].id, endNode: topNodes[i].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
        newMembers.push({ id: memberId++, startNode: topNodes[i].id, endNode: bottomNodes[i + 1].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
    } else if (type === 'pratt') {
      for (let i = 0; i < topNodes.length; i++) {
        newMembers.push({ id: memberId++, startNode: bottomNodes[i + 1].id, endNode: topNodes[i].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
      for (let i = 0; i < Math.floor(topNodes.length / 2); i++) {
        newMembers.push({ id: memberId++, startNode: bottomNodes[i].id, endNode: topNodes[i].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
      for (let i = Math.ceil(topNodes.length / 2); i < topNodes.length; i++) {
        newMembers.push({ id: memberId++, startNode: bottomNodes[i + 2].id, endNode: topNodes[i].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
    } else if (type === 'howe') {
      for (let i = 0; i < topNodes.length; i++) {
        newMembers.push({ id: memberId++, startNode: bottomNodes[i + 1].id, endNode: topNodes[i].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
      for (let i = 0; i < Math.floor(topNodes.length / 2); i++) {
        newMembers.push({ id: memberId++, startNode: topNodes[i].id, endNode: bottomNodes[i + 1].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
      for (let i = Math.ceil(topNodes.length / 2); i < topNodes.length; i++) {
        newMembers.push({ id: memberId++, startNode: topNodes[i].id, endNode: bottomNodes[i].id, area: 0.001, elasticModulus: 200e9, isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV });
      }
    }

    setNodes(newNodes);
    setMembers(newMembers);
    setPointLoads(newLoads);
  }, [spanLength, height, numPanels, appliedLoad, structureType]);

  // Method of joints analysis
  const memberResults = useMemo<MemberResult[]>(() => {
    const results: MemberResult[] = [];
    const totalLoad = pointLoads.reduce((sum, load) => sum + load.magnitude, 0);

    for (const member of members) {
      const n1 = nodes.find(n => n.id === member.startNode);
      const n2 = nodes.find(n => n.id === member.endNode);
      if (!n1 || !n2) continue;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const maxY = Math.max(...nodes.map(n => n.y));
      const isTopChord = n1.y === maxY && n2.y === maxY;
      const isBottomChord = n1.y === 0 && n2.y === 0;
      const isDiagonal = !isTopChord && !isBottomChord;

      let force = 0;
      if (isTopChord) {
        force = -totalLoad * spanLength / (8 * height);
      } else if (isBottomChord) {
        force = totalLoad * spanLength / (8 * height);
      } else if (isDiagonal) {
        force = totalLoad / (2 * Math.sin(Math.atan2(Math.abs(dy), Math.abs(dx))));
        if (Math.abs(n1.x + n2.x) / 2 < spanLength / 2) {
          force = -Math.abs(force);
        }
      }

      const stress = force / member.area;
      const strain = stress / member.elasticModulus;

      results.push({
        memberId: member.id,
        force,
        stress,
        strain,
        type: force > 100 ? 'tension' : force < -100 ? 'compression' : 'zero'
      });
    }
    return results;
  }, [nodes, members, spanLength, height, pointLoads]);

  // Truss System Reliability Analysis
  const trussReliability = useMemo<TrussSystemReliability>(() => {
    if (!showReliability || members.length === 0 || memberResults.length === 0) {
      return {
        systemType: 'series', systemBeta: 0, systemBetaFOSM: 0, systemBetaSORM: 0, systemBetaTORM: 0,
        systemPf: 1, systemPfFOSM: 1, systemPfSORM: 1, systemPfTORM: 1,
        boundsPf: { lower: 0, upper: 1 }, criticalPath: [], memberReliabilities: []
      };
    }

    const avgLoadCoV = pointLoads.length > 0
      ? pointLoads.reduce((sum, l) => sum + l.magnitudeCoV, 0) / pointLoads.length
      : DEFAULT_LOAD_COV;

    const memberReliabilities: MemberReliability[] = members.map(member => {
      const result = memberResults.find(r => r.memberId === member.id);
      if (!result) {
        return {
          memberId: member.id, meanStress: 0, stdStress: 0,
          meanStrength: member.yieldStrength, stdStrength: member.yieldStrength * member.yieldStrengthCoV,
          beta: 5, betaFOSM: 5, betaSORM: 5, betaTORM: 5,
          pf: 0, pfFOSM: 0, pfSORM: 0, pfTORM: 0,
          safetyFactor: Infinity, isCritical: false
        };
      }

      const meanStress = Math.abs(result.stress);
      const stressCoV = Math.sqrt(avgLoadCoV * avgLoadCoV + member.areaCoV * member.areaCoV);
      const stdStress = meanStress * stressCoV;
      const meanStrength = member.yieldStrength;
      const stdStrength = member.yieldStrength * member.yieldStrengthCoV;

      const beta = meanStress > 0 ? reliabilityIndex(meanStrength, stdStrength, meanStress, stdStress) : 5;
      const betaFOSM = meanStress > 0 ? fosmReliabilityIndex(meanStrength, member.yieldStrengthCoV, meanStress, stressCoV) : 5;
      const sormResult = meanStress > 0 ? sormReliabilityIndex(beta, meanStrength, stdStrength, meanStress, stdStress) : { betaSORM: 5, pfSORM: 0, curvature: 0 };
      const tormResult = meanStress > 0 ? tormReliabilityIndex(beta, meanStrength, stdStrength, meanStress, stdStress) : { betaTORM: 5, pfTORM: 0, thirdOrderCorrection: 0 };

      const pf = probabilityOfFailure(beta);
      const pfFOSM = probabilityOfFailure(betaFOSM);
      const safetyFactor = meanStress > 0 ? meanStrength / meanStress : Infinity;
      const marginOfError = meanStress > 0 ? calculateReliabilityMarginOfError(beta, meanStrength, stdStrength, meanStress, stdStress) : undefined;

      return {
        memberId: member.id, meanStress, stdStress, meanStrength, stdStrength,
        beta: Math.min(beta, 10), betaFOSM: Math.min(betaFOSM, 10),
        betaSORM: Math.min(sormResult.betaSORM, 10), betaTORM: Math.min(tormResult.betaTORM, 10),
        pf, pfFOSM, pfSORM: sormResult.pfSORM, pfTORM: tormResult.pfTORM,
        safetyFactor, isCritical: beta < 3.0, marginOfError
      };
    });

    const validReliabilities = memberReliabilities.filter(r => r.meanStress > 0);

    const pfUpperBound = Math.min(1, validReliabilities.reduce((sum, r) => sum + r.pf, 0));
    const pfLowerBound = validReliabilities.length > 0 ? Math.max(...validReliabilities.map(r => r.pf)) : 0;
    const pfIndependent = 1 - validReliabilities.reduce((prod, r) => prod * (1 - r.pf), 1);
    const systemPf = Math.min(1, (pfLowerBound + pfIndependent) / 2);
    const systemBeta = systemPf > 0 && systemPf < 1 ? -normalInverseCDF(systemPf) : (systemPf === 0 ? 5 : 0);

    const pfFOSMLowerBound = validReliabilities.length > 0 ? Math.max(...validReliabilities.map(r => r.pfFOSM)) : 0;
    const pfFOSMIndependent = 1 - validReliabilities.reduce((prod, r) => prod * (1 - r.pfFOSM), 1);
    const systemPfFOSM = Math.min(1, (pfFOSMLowerBound + pfFOSMIndependent) / 2);
    const systemBetaFOSM = systemPfFOSM > 0 && systemPfFOSM < 1 ? -normalInverseCDF(systemPfFOSM) : (systemPfFOSM === 0 ? 5 : 0);

    const pfSORMLowerBound = validReliabilities.length > 0 ? Math.max(...validReliabilities.map(r => r.pfSORM)) : 0;
    const pfSORMIndependent = 1 - validReliabilities.reduce((prod, r) => prod * (1 - r.pfSORM), 1);
    const systemPfSORM = Math.min(1, (pfSORMLowerBound + pfSORMIndependent) / 2);
    const systemBetaSORM = systemPfSORM > 0 && systemPfSORM < 1 ? -normalInverseCDF(systemPfSORM) : (systemPfSORM === 0 ? 5 : 0);

    const pfTORMLowerBound = validReliabilities.length > 0 ? Math.max(...validReliabilities.map(r => r.pfTORM)) : 0;
    const pfTORMIndependent = 1 - validReliabilities.reduce((prod, r) => prod * (1 - r.pfTORM), 1);
    const systemPfTORM = Math.min(1, (pfTORMLowerBound + pfTORMIndependent) / 2);
    const systemBetaTORM = systemPfTORM > 0 && systemPfTORM < 1 ? -normalInverseCDF(systemPfTORM) : (systemPfTORM === 0 ? 5 : 0);

    const sortedByBeta = [...validReliabilities].sort((a, b) => a.beta - b.beta);
    const criticalPath = sortedByBeta.slice(0, Math.min(3, sortedByBeta.length)).map(r => r.memberId);

    const criticalMember = sortedByBeta[0];
    const higherOrderAnalysis = criticalMember
      ? analyzeHigherOrderConvergence(criticalMember.beta, criticalMember.meanStrength, criticalMember.stdStrength, criticalMember.meanStress, criticalMember.stdStress)
      : undefined;

    const systemMarginOfError = criticalMember
      ? calculateReliabilityMarginOfError(systemBeta, criticalMember.meanStrength, criticalMember.stdStrength, criticalMember.meanStress, criticalMember.stdStress)
      : undefined;

    return {
      systemType: 'series',
      systemBeta: Math.max(0, Math.min(systemBeta, 10)),
      systemBetaFOSM: Math.max(0, Math.min(systemBetaFOSM, 10)),
      systemBetaSORM: Math.max(0, Math.min(systemBetaSORM, 10)),
      systemBetaTORM: Math.max(0, Math.min(systemBetaTORM, 10)),
      systemPf, systemPfFOSM, systemPfSORM, systemPfTORM,
      boundsPf: { lower: pfLowerBound, upper: pfUpperBound },
      criticalPath, memberReliabilities, higherOrderAnalysis, systemMarginOfError
    };
  }, [members, memberResults, pointLoads, showReliability]);

  // Monte Carlo Validation
  const mcResults = useMemo(() => {
    if (!runMonteCarlo || !showReliability || members.length === 0) return null;
    const _ = mcTrigger;
    let failureCount = 0;
    const convergenceHistory: { samples: number; pf: number }[] = [];
    const avgLoadCoV = pointLoads.length > 0
      ? pointLoads.reduce((sum, l) => sum + l.magnitudeCoV, 0) / pointLoads.length
      : DEFAULT_LOAD_COV;

    for (let i = 0; i < mcSamples; i++) {
      const loadFactor = normalRandom(1, avgLoadCoV);
      let systemFailed = false;
      for (const member of members) {
        const result = memberResults.find(r => r.memberId === member.id);
        if (!result || result.stress === 0) continue;
        const strength = normalRandom(member.yieldStrength, member.yieldStrength * member.yieldStrengthCoV);
        const areaFactor = normalRandom(1, member.areaCoV);
        const sampledStress = Math.abs(result.stress) * loadFactor / areaFactor;
        if (strength < sampledStress) { systemFailed = true; break; }
      }
      if (systemFailed) failureCount++;
      if ((i + 1) % Math.floor(mcSamples / 20) === 0 || i === mcSamples - 1) {
        convergenceHistory.push({ samples: i + 1, pf: failureCount / (i + 1) });
      }
    }

    const estimatedPf = failureCount / mcSamples;
    const estimatedBeta = estimatedPf > 0 && estimatedPf < 1 ? -normalInverseCDF(estimatedPf) : (estimatedPf === 0 ? 5 : 0);
    return { numSamples: mcSamples, failureCount, estimatedPf, estimatedBeta: Math.max(0, Math.min(estimatedBeta, 10)), convergenceHistory };
  }, [members, memberResults, pointLoads, mcSamples, mcTrigger, runMonteCarlo, showReliability]);

  // Importance Sampling
  const isResults = useMemo<ImportanceSamplingResult | null>(() => {
    if (!runImportanceSampling || !showReliability || members.length === 0 || memberResults.length === 0) return null;
    const _ = isTrigger;
    return importanceSamplingMonteCarlo(members, memberResults, pointLoads, isSamples, trussReliability.systemBeta);
  }, [members, memberResults, pointLoads, isSamples, isTrigger, runImportanceSampling, showReliability, trussReliability.systemBeta]);

  // LRFD
  const lrfdResults = useMemo<LRFDResult[]>(() => {
    if (!enableLRFD || !showReliability || members.length === 0 || memberResults.length === 0) return [];
    return LRFD_COMBINATIONS.map(combo => {
      let factoredLoad = 0;
      for (const load of pointLoads) {
        const factor = combo.factors[load.category] || 0;
        factoredLoad += load.magnitude * factor;
      }
      if (factoredLoad === 0) return { combinationId: combo.id, combinationName: combo.name, factoredLoad: 0, systemBeta: 5, systemPf: 0, isCritical: false, memberBetas: [] };

      const totalUnfactoredLoad = pointLoads.reduce((sum, l) => sum + l.magnitude, 0);
      const loadRatio = totalUnfactoredLoad > 0 ? factoredLoad / totalUnfactoredLoad : 1;
      const memberBetas: { memberId: number; beta: number }[] = [];

      for (const member of members) {
        const result = memberResults.find(r => r.memberId === member.id);
        if (!result || result.stress === 0) continue;
        const factoredStress = Math.abs(result.stress) * loadRatio;
        let weightedCoV = 0, totalWeight = 0;
        for (const load of pointLoads) {
          const factor = combo.factors[load.category] || 0;
          const weight = load.magnitude * factor;
          weightedCoV += weight * DEFAULT_COV_BY_CATEGORY[load.category];
          totalWeight += weight;
        }
        const avgCoV = totalWeight > 0 ? weightedCoV / totalWeight : DEFAULT_LOAD_COV;
        const stressCoV = Math.sqrt(avgCoV * avgCoV + member.areaCoV * member.areaCoV);
        const stdStress = factoredStress * stressCoV;
        const meanStrength = member.yieldStrength;
        const stdStrength = member.yieldStrength * member.yieldStrengthCoV;
        const beta = factoredStress > 0 ? reliabilityIndex(meanStrength, stdStrength, factoredStress, stdStress) : 5;
        memberBetas.push({ memberId: member.id, beta: Math.min(beta, 10) });
      }

      const validBetas = memberBetas.filter(b => b.beta < 10);
      const minBeta = validBetas.length > 0 ? Math.min(...validBetas.map(b => b.beta)) : 5;
      const systemPf = probabilityOfFailure(minBeta);
      return { combinationId: combo.id, combinationName: combo.name, factoredLoad, systemBeta: minBeta, systemPf, isCritical: minBeta < 3.0, memberBetas };
    }).filter(r => r.factoredLoad > 0);
  }, [enableLRFD, showReliability, members, memberResults, pointLoads]);

  const criticalLRFD = useMemo(() => {
    if (lrfdResults.length === 0) return null;
    return lrfdResults.reduce((min, curr) => curr.systemBeta < min.systemBeta ? curr : min, lrfdResults[0]);
  }, [lrfdResults]);

  // Sensitivity Analysis
  const sensitivityResults = useMemo<SensitivityResult[]>(() => {
    if (!showSensitivity || !showReliability || members.length === 0 || memberResults.length === 0) return [];
    const results: SensitivityResult[] = [];
    const delta = 0.05;

    for (const member of members) {
      const result = memberResults.find(r => r.memberId === member.id);
      if (!result || Math.abs(result.stress) < 1) continue;
      const meanStress = Math.abs(result.stress);
      const avgLoadCoV = pointLoads.length > 0 ? pointLoads.reduce((sum, l) => sum + l.magnitudeCoV, 0) / pointLoads.length : DEFAULT_LOAD_COV;
      const stressCoV = Math.sqrt(avgLoadCoV * avgLoadCoV + member.areaCoV * member.areaCoV);
      const stdStress = meanStress * stressCoV;

      const baseStrength = member.yieldStrength;
      const perturbedStrength = baseStrength * (1 + delta);
      const stdStrength = baseStrength * member.yieldStrengthCoV;
      const perturbedStdStrength = perturbedStrength * member.yieldStrengthCoV;
      const baseBetaMember = reliabilityIndex(baseStrength, stdStrength, meanStress, stdStress);
      const perturbedBetaStrength = reliabilityIndex(perturbedStrength, perturbedStdStrength, meanStress, stdStress);
      const dBetaStrength = (perturbedBetaStrength - baseBetaMember) / (delta * baseStrength);
      const elasticityStrength = ((perturbedBetaStrength - baseBetaMember) / baseBetaMember) / delta;
      results.push({ memberId: member.id, parameterName: `M${member.id} Yield Strength`, parameterType: 'yield_strength', baseValue: baseStrength / 1e6, sensitivity: dBetaStrength * 1e6, elasticity: elasticityStrength, importance: 0, direction: 'increase' });

      const baseArea = member.area;
      const perturbedArea = baseArea * (1 + delta);
      const perturbedStress = meanStress * baseArea / perturbedArea;
      const perturbedStressCoV = Math.sqrt(avgLoadCoV * avgLoadCoV + member.areaCoV * member.areaCoV);
      const perturbedStdStress = perturbedStress * perturbedStressCoV;
      const perturbedBetaArea = reliabilityIndex(baseStrength, stdStrength, perturbedStress, perturbedStdStress);
      const dBetaArea = (perturbedBetaArea - baseBetaMember) / (delta * baseArea);
      const elasticityArea = ((perturbedBetaArea - baseBetaMember) / baseBetaMember) / delta;
      results.push({ memberId: member.id, parameterName: `M${member.id} Cross-Section Area`, parameterType: 'area', baseValue: baseArea * 1e4, sensitivity: dBetaArea / 1e4, elasticity: elasticityArea, importance: 0, direction: 'increase' });

      const perturbedLoadCoV = avgLoadCoV * (1 + delta);
      const perturbedStressCoVLoad = Math.sqrt(perturbedLoadCoV * perturbedLoadCoV + member.areaCoV * member.areaCoV);
      const perturbedStdStressLoad = meanStress * perturbedStressCoVLoad;
      const perturbedBetaLoad = reliabilityIndex(baseStrength, stdStrength, meanStress, perturbedStdStressLoad);
      const dBetaLoad = (perturbedBetaLoad - baseBetaMember) / (delta * avgLoadCoV);
      const elasticityLoad = ((perturbedBetaLoad - baseBetaMember) / baseBetaMember) / delta;
      results.push({ memberId: member.id, parameterName: `M${member.id} Load Uncertainty`, parameterType: 'load', baseValue: avgLoadCoV * 100, sensitivity: dBetaLoad / 100, elasticity: elasticityLoad, importance: 0, direction: elasticityLoad > 0 ? 'increase' : 'decrease' });
    }

    const maxElasticity = Math.max(...results.map(r => Math.abs(r.elasticity)), 0.001);
    for (const r of results) r.importance = Math.abs(r.elasticity) / maxElasticity;
    results.sort((a, b) => b.importance - a.importance);
    return results;
  }, [showSensitivity, showReliability, members, memberResults, pointLoads, trussReliability.systemBeta]);

  const topSensitivityFactors = useMemo(() => sensitivityResults.slice(0, 10), [sensitivityResults]);

  // Subset Simulation
  const ssResults = useMemo<SubsetSimulationResult | null>(() => {
    if (!runSubsetSimulation || !showReliability || members.length === 0 || memberResults.length === 0) return null;
    const _ = ssTrigger;
    return subsetSimulationMonteCarlo(members, memberResults, pointLoads, ssSamplesPerLevel, 0.1);
  }, [members, memberResults, pointLoads, ssSamplesPerLevel, ssTrigger, runSubsetSimulation, showReliability]);

  // RBDO
  const rbdoResults = useMemo<RBDOResult | null>(() => {
    if (!enableRBDO || !showReliability || members.length === 0 || memberResults.length === 0) return null;
    const _ = rbdoTrigger;
    return reliabilityBasedDesignOptimization(members, memberResults, pointLoads, rbdoTargetBeta, 20, 0.05);
  }, [members, memberResults, pointLoads, rbdoTargetBeta, rbdoTrigger, enableRBDO, showReliability]);

  const applyRBDOResults = useCallback(() => {
    if (!rbdoResults?.success) return;
    setMembers(members.map(m => {
      const optimized = rbdoResults.optimizedAreas.find(a => a.memberId === m.id);
      return optimized ? { ...m, area: optimized.area } : m;
    }));
  }, [rbdoResults, members]);

  // Visualization bounds
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -1, maxX: 10, minY: -1, maxY: 5 };
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const padding = 1;
    return {
      minX: Math.min(...xs) - padding,
      maxX: Math.max(...xs) + padding || Math.min(...xs) + 1,
      minY: Math.min(...ys) - padding,
      maxY: Math.max(...ys) + padding || Math.min(...ys) + 1,
    };
  }, [nodes]);

  const svgWidth = 600;
  const svgHeight = 300;
  const rangeX = bounds.maxX - bounds.minX;
  const rangeY = bounds.maxY - bounds.minY;
  const scaleVal = Math.min(
    rangeX > 0 ? (svgWidth - 100) / rangeX : 1,
    rangeY > 0 ? (svgHeight - 60) / rangeY : 1
  );

  const toSvgX = (x: number) => { const r = (x - bounds.minX) * scaleVal + 50; return isFinite(r) ? r : 50; };
  const toSvgY = (y: number) => { const r = svgHeight - (y - bounds.minY) * scaleVal - 30; return isFinite(r) ? r : svgHeight / 2; };

  const addNode = () => {
    const newId = Math.max(...nodes.map(n => n.id), 0) + 1;
    setNodes([...nodes, { id: newId, x: spanLength / 2, y: height / 2, supportType: 'none', loadX: 0, loadY: 0 }]);
  };

  const addMember = () => {
    if (nodes.length < 2) return;
    const newId = Math.max(...members.map(m => m.id), 0) + 1;
    setMembers([...members, {
      id: newId, startNode: nodes[0].id, endNode: nodes[1].id, area: 0.001, elasticModulus: 200e9,
      isRigid: structureType === 'frame', yieldStrength: DEFAULT_YIELD_STRENGTH, yieldStrengthCoV: DEFAULT_YIELD_COV, areaCoV: DEFAULT_AREA_COV
    }]);
    setSelectedMemberId(newId);
  };

  const deleteMember = (id: number) => { setMembers(members.filter(m => m.id !== id)); if (selectedMemberId === id) setSelectedMemberId(null); };
  const deleteNode = (id: number) => { setNodes(nodes.filter(n => n.id !== id)); setMembers(members.filter(m => m.startNode !== id && m.endNode !== id)); setPointLoads(pointLoads.filter(l => l.nodeId !== id)); if (selectedNodeId === id) setSelectedNodeId(null); };
  const addPointLoad = () => { if (nodes.length === 0) return; const newId = Math.max(...pointLoads.map(l => l.id), 0) + 1; setPointLoads([...pointLoads, { id: newId, nodeId: nodes[0].id, magnitude: 10000, angle: 0, magnitudeCoV: DEFAULT_LOAD_COV, category: 'live' }]); };
  const deletePointLoad = (id: number) => { setPointLoads(pointLoads.filter(l => l.id !== id)); };

  const maxForce = Math.max(...memberResults.map(r => Math.abs(r.force)), 1);

  const loadColors = ['hsl(0 84% 60%)', 'hsl(280 84% 60%)', 'hsl(200 84% 60%)', 'hsl(40 84% 60%)', 'hsl(320 84% 60%)'];

  return {
    // State
    nodes, setNodes, members, setMembers, pointLoads, setPointLoads,
    selectedNodeId, setSelectedNodeId, selectedMemberId, setSelectedMemberId,
    structureType, setStructureType, trussType, setTrussType,
    spanLength, setSpanLength, height, setHeight, numPanels, setNumPanels,
    appliedLoad, setAppliedLoad,
    // Units
    unitSystem, setUnitSystem, du,
    // Reliability state
    showReliability, setShowReliability,
    runMonteCarlo, setRunMonteCarlo, runImportanceSampling, setRunImportanceSampling,
    mcSamples, setMcSamples, isSamples, setIsSamples,
    setMcTrigger, setIsTrigger,
    enableLRFD, setEnableLRFD, selectedCombination, setSelectedCombination,
    showSensitivity, setShowSensitivity,
    runSubsetSimulation, setRunSubsetSimulation,
    ssSamplesPerLevel, setSsSamplesPerLevel, setSsTrigger,
    enableRBDO, setEnableRBDO, rbdoTargetBeta, setRbdoTargetBeta, setRbdoTrigger,
    // Computed
    memberResults, trussReliability, mcResults, isResults,
    lrfdResults, criticalLRFD, sensitivityResults, topSensitivityFactors,
    ssResults, rbdoResults, applyRBDOResults,
    // Viz
    svgWidth, svgHeight, toSvgX, toSvgY, maxForce, loadColors,
    // Actions
    generateTruss, addNode, addMember, deleteMember, deleteNode, addPointLoad, deletePointLoad,
  };
}

export type TrussAnalysisState = ReturnType<typeof useTrussAnalysis>;
