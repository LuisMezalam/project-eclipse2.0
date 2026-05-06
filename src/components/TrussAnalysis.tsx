import {
  useTrussAnalysis,
  TrussConfigPanel,
  TrussDiagram,
  TrussMemberForcesTable,
  TrussReliabilityPanel,
} from "./truss";

export function TrussAnalysis() {
  const t = useTrussAnalysis();

  return (
    <div className="space-y-6">
      <TrussConfigPanel
        structureType={t.structureType} setStructureType={t.setStructureType}
        trussType={t.trussType} setTrussType={t.setTrussType}
        spanLength={t.spanLength} setSpanLength={t.setSpanLength}
        height={t.height} setHeight={t.setHeight}
        numPanels={t.numPanels} setNumPanels={t.setNumPanels}
        appliedLoad={t.appliedLoad} setAppliedLoad={t.setAppliedLoad}
        generateTruss={t.generateTruss}
        nodes={t.nodes} setNodes={t.setNodes}
        members={t.members} setMembers={t.setMembers}
        pointLoads={t.pointLoads} setPointLoads={t.setPointLoads}
        selectedNodeId={t.selectedNodeId} setSelectedNodeId={t.setSelectedNodeId}
        selectedMemberId={t.selectedMemberId} setSelectedMemberId={t.setSelectedMemberId}
        addNode={t.addNode} addMember={t.addMember} addPointLoad={t.addPointLoad}
        deleteNode={t.deleteNode} deleteMember={t.deleteMember} deletePointLoad={t.deletePointLoad}
        loadColors={t.loadColors}
        unitSystem={t.unitSystem} setUnitSystem={t.setUnitSystem} du={t.du}
      />

      <TrussDiagram
        nodes={t.nodes} members={t.members} memberResults={t.memberResults}
        pointLoads={t.pointLoads}
        selectedNodeId={t.selectedNodeId} setSelectedNodeId={t.setSelectedNodeId}
        selectedMemberId={t.selectedMemberId} setSelectedMemberId={t.setSelectedMemberId}
        structureType={t.structureType}
        svgWidth={t.svgWidth} svgHeight={t.svgHeight}
        toSvgX={t.toSvgX} toSvgY={t.toSvgY}
        maxForce={t.maxForce} loadColors={t.loadColors}
        du={t.du}
      />

      <TrussMemberForcesTable
        members={t.members} memberResults={t.memberResults}
        selectedMemberId={t.selectedMemberId} setSelectedMemberId={t.setSelectedMemberId}
        structureType={t.structureType}
        du={t.du}
      />

      {t.showReliability && (
        <TrussReliabilityPanel
          showReliability={t.showReliability} setShowReliability={t.setShowReliability}
          enableLRFD={t.enableLRFD} setEnableLRFD={t.setEnableLRFD}
          showSensitivity={t.showSensitivity} setShowSensitivity={t.setShowSensitivity}
          runMonteCarlo={t.runMonteCarlo} setRunMonteCarlo={t.setRunMonteCarlo}
          runImportanceSampling={t.runImportanceSampling} setRunImportanceSampling={t.setRunImportanceSampling}
          runSubsetSimulation={t.runSubsetSimulation} setRunSubsetSimulation={t.setRunSubsetSimulation}
          enableRBDO={t.enableRBDO} setEnableRBDO={t.setEnableRBDO}
          mcSamples={t.mcSamples} setMcSamples={t.setMcSamples}
          isSamples={t.isSamples} setIsSamples={t.setIsSamples}
          ssSamplesPerLevel={t.ssSamplesPerLevel} setSsSamplesPerLevel={t.setSsSamplesPerLevel}
          rbdoTargetBeta={t.rbdoTargetBeta} setRbdoTargetBeta={t.setRbdoTargetBeta}
          setMcTrigger={t.setMcTrigger} setIsTrigger={t.setIsTrigger}
          setSsTrigger={t.setSsTrigger} setRbdoTrigger={t.setRbdoTrigger}
          trussReliability={t.trussReliability}
          mcResults={t.mcResults} isResults={t.isResults}
          ssResults={t.ssResults} rbdoResults={t.rbdoResults}
          lrfdResults={t.lrfdResults} criticalLRFD={t.criticalLRFD}
          topSensitivityFactors={t.topSensitivityFactors}
          applyRBDOResults={t.applyRBDOResults}
          du={t.du}
        />
      )}
    </div>
  );
}
