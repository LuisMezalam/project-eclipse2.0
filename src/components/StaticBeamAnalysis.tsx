/**
 * StaticBeamAnalysis — thin orchestrator.
 *
 * All state and computation logic lives in useBeamAnalysis hook.
 * Configuration UI is in BeamConfigPanel.
 * Display sections are in src/components/beam/.
 */

import { AIRecommendations } from "./AIRecommendations";
import {
  useBeamAnalysis, BeamConfigPanel,
  BeamSchematic, BeamResultsGrid, SupportReactionsPanel, BeamValidationPanel, ReliabilityPanel,
  ShearMomentDiagrams, DeflectionCurve, CrossSectionPropertiesDisplay,
  EnvelopeDiagrams, InfluenceLines } from
"./beam";
import { BeamCapabilityPanel } from "./beam/BeamCapabilityPanel";
import { CompositeSectionMechanicsPanel } from "./beam/CompositeSectionMechanicsPanel";
import { LaminateMechanicsPanel } from "./beam/LaminateMechanicsPanel";

export function StaticBeamAnalysis() {
  const b = useBeamAnalysis();
  const du = b.displayUnits;
  const governingMoment = Math.abs(b.beamResult.maxBendingMoment) >= Math.abs(b.beamResult.minBendingMoment ?? 0)
    ? b.beamResult.maxBendingMoment
    : (b.beamResult.minBendingMoment ?? 0);

  return (
    <div className="space-y-6">
      <BeamConfigPanel b={b} />
      <BeamCapabilityPanel beamType={b.beamType} loadType={b.loadType} />
      <BeamValidationPanel validation={b.validation} supportFallback={b.supportFallback} />

      <BeamSchematic
        beamType={b.beamType} compositeModel={b.compositeModel} laminateLayup={b.laminateLayup} loadType={b.loadType} loadMode={b.loadMode}
        hybridLoads={b.hybridLoads}
        beamLength={b.beamLength} lengthUnit={b.lengthUnit}
        convertLengthToDisplay={b.convertLengthToDisplay}
        concentratedPosition={b.concentratedPosition} movingPosition={b.movingPosition}
        momentPosition={b.momentPosition} partialStart={b.partialStart} partialEnd={b.partialEnd}
        trapStartIntensity={b.trapStartIntensity} trapEndIntensity={b.trapEndIntensity}
        triangularPeak={b.triangularPeak} forceAngle={b.forceAngle}
        loadIntensity={b.loadIntensity} supports={b.supports} internalHinges={b.internalHinges}
        selfWeightIncluded={b.includeSelfWeight} />
      

      <CrossSectionPropertiesDisplay
        crossSectionType={b.analysisCrossSectionType}
        sectionProps={b.analysisSectionProps}
        displayUnits={du}
        composite={Boolean(b.compositeSection)}
        laminate={Boolean(b.laminateSection)}
      />

      {b.laminateSection && (
        <LaminateMechanicsPanel
          section={b.laminateSection}
          governingMoment={governingMoment}
          displayUnits={du}
        />
      )}

      {b.compositeSection && (
        <CompositeSectionMechanicsPanel
          section={b.compositeSection}
          slabWidth={b.compositeSlabWidth}
          slabThickness={b.compositeSlabThickness}
          beamElasticModulus={b.elasticModulus}
          slabElasticModulus={b.compositeSlabElasticModulus}
          governingMoment={governingMoment}
          displayUnits={du}
        />
      )}

      <BeamResultsGrid
        beamResult={b.beamResult}
        yieldStrength={b.analysisYieldStrength}
        beamLength={b.beamLength}
        displayUnits={du}
        composite={Boolean(b.compositeSection || b.laminateSection)}
      />

      <SupportReactionsPanel
        supportReactions={b.supportReactions}
        supports={b.supports}
        beamLength={b.beamLength}
        appliedLoad={b.beamResult.totalLoad}
        displayUnits={du}
        supportFallback={b.supportFallback}
      />

      <ReliabilityPanel reliability={b.reliability} beamResult={b.beamResult}
      yieldStrength={b.analysisYieldStrength} strengthCOV={b.strengthCOV} loadCOV={b.loadCOV} loadInverted={b.loadInverted}
      composite={Boolean(b.compositeSection || b.laminateSection)}
      displayUnits={du} />

      <ShearMomentDiagrams
        diagramData={b.diagramData}
        lengthUnit={du.length.unit}
        forceUnit={du.force.unit}
        momentUnit={du.moment.unit}
        posFactor={du.diagramPos}
        shearFactor={du.diagramShear}
        momentFactor={du.diagramMoment}
      />

      <DeflectionCurve
        diagramData={b.diagramData}
        beamLength={b.beamLength}
        deflectionLocation={b.beamResult.deflectionLocation}
        lengthUnit={du.length.unit}
        deflectionUnit={du.deflection.unit}
        deflectionFactor={du.diagramDefl}
        posFactor={du.diagramPos}
      />

      <InfluenceLines
        influenceData={b.influenceData} influenceMeasurePoint={b.influenceMeasurePoint}
        setInfluenceMeasurePoint={b.setInfluenceMeasurePoint} beamLength={b.beamLength}
        loadMarkers={b.loadMarkers} loadMode={b.loadMode}
        influenceEffects={b.influenceEffects} loadContributions={b.loadContributions}
        displayUnits={du} />

      {b.hasMovingLoad && <EnvelopeDiagrams envelopeData={b.envelopeData} displayUnits={du} />}

    </div>);

}
