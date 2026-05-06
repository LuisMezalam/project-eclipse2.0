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
  BeamSchematic, BeamResultsGrid, BeamValidationPanel, ReliabilityPanel,
  ShearMomentDiagrams, DeflectionCurve, CrossSectionPropertiesDisplay,
  LoadFormulas, EquationsPanel, EnvelopeDiagrams, InfluenceLines } from
"./beam";
import { BeamCapabilityPanel } from "./beam/BeamCapabilityPanel";

export function StaticBeamAnalysis() {
  const b = useBeamAnalysis();
  const du = b.displayUnits;

  return (
    <div className="space-y-6">
      <BeamConfigPanel b={b} />
      <BeamCapabilityPanel beamType={b.beamType} loadType={b.loadType} />
      <BeamValidationPanel validation={b.validation} />

      <BeamSchematic
        beamType={b.beamType} loadType={b.loadType} loadMode={b.loadMode}
        hybridLoads={b.hybridLoads}
        beamLength={b.beamLength} lengthUnit={b.lengthUnit}
        convertLengthToDisplay={b.convertLengthToDisplay}
        concentratedPosition={b.concentratedPosition} movingPosition={b.movingPosition}
        momentPosition={b.momentPosition} partialStart={b.partialStart} partialEnd={b.partialEnd}
        trapStartIntensity={b.trapStartIntensity} trapEndIntensity={b.trapEndIntensity}
        triangularPeak={b.triangularPeak} forceAngle={b.forceAngle}
        loadIntensity={b.loadIntensity} supports={b.supports} />
      

      <LoadFormulas beamType={b.beamType} loadType={b.loadType} loadMode={b.loadMode} beamResult={b.beamResult} displayUnits={du} forceAngle={b.forceAngle} hybridLoads={b.hybridLoads} />

      <CrossSectionPropertiesDisplay
        crossSectionType={b.crossSectionType}
        sectionProps={b.sectionProps}
        displayUnits={du}
      />

      <BeamResultsGrid
        beamResult={b.beamResult}
        yieldStrength={b.yieldStrength}
        beamLength={b.beamLength}
        displayUnits={du}
      />

      <ReliabilityPanel reliability={b.reliability} beamResult={b.beamResult}
      yieldStrength={b.yieldStrength} strengthCOV={b.strengthCOV} loadCOV={b.loadCOV} loadInverted={b.loadInverted}
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

      <EquationsPanel loadType={b.loadType} />

      
    </div>);

}
