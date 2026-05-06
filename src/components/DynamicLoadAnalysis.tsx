import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyzeDynamicResponse,
  generateFrequencyResponse,
  generateTimeHistory,
  reliabilityAnalysis,
} from "@/lib/reliability";
import {
  performFEAAnalysis,
  spectralAnalysis,
  getApplicationParameters,
  firstPassageReliability,
  computeHigherOrderMoments,
  propagateVariance,
  PSDType,
} from "@/lib/dynamicsFEA";
import { AIRecommendations } from "./AIRecommendations";
import { ResponseSpectrum } from "./ResponseSpectrum";
import { useSharedParameters } from "@/contexts/SharedParametersContext";
import { SDOFTab, FEATab, RandomExcitationTab, ApplicationsTab } from "./dynamic";
import {
  computeEffectiveDynamicSystem,
  type DynamicExcitationType,
  type DynamicSupportModel,
  type DynamicSystemModelId,
} from "@/lib/dynamicSystemModels";

export function DynamicLoadAnalysis() {
  const ctx = useSharedParameters();

  // System parameters
  const [mass, setMass] = useState(1000);
  const [stiffness, setStiffness] = useState(100000);
  const [damping, setDamping] = useState(500);
  const [systemModel, setSystemModel] = useState<DynamicSystemModelId>("sdof");
  const [supportModel, setSupportModel] = useState<DynamicSupportModel>("fixed");
  const [excitationType, setExcitationType] = useState<DynamicExcitationType>("harmonic");
  const [activeModes, setActiveModes] = useState(1);
  const [isolationEnabled, setIsolationEnabled] = useState(false);

  // Excitation
  const [forceAmplitude, setForceAmplitude] = useState(5000);
  const [forceFrequency, setForceFrequency] = useState(8);

  // Failure
  const [maxAllowableDisp, setMaxAllowableDisp] = useState(0.05);
  const [dispCOV, setDispCOV] = useState(0.15);
  const [allowableCOV, setAllowableCOV] = useState(0.1);

  // FEA
  const [numElements, setNumElements] = useState(10);
  const [beamLength, setBeamLength] = useState(6);
  const [EI, setEI] = useState(1e6);

  // Random excitation
  const [psdIntensity, setPsdIntensity] = useState(0.01);
  const [selectedApplication, setSelectedApplication] = useState('seismic');

  // Sync from context
  useEffect(() => {
    if (ctx.isSynced) {
      setForceAmplitude(ctx.loadMean * 1000);
      if (ctx.loadMean > 0) setDispCOV(Math.sqrt(ctx.loadVariance) / ctx.loadMean);
    }
  }, [ctx.isSynced, ctx.loadMean, ctx.loadVariance]);

  // Computed values
  const effectiveSystem = useMemo(() => computeEffectiveDynamicSystem({
    modelId: systemModel,
    supportModel,
    excitationType,
    mass,
    stiffness,
    damping,
    forceAmplitude,
    activeModes,
    isolationEnabled,
  }), [systemModel, supportModel, excitationType, mass, stiffness, damping, forceAmplitude, activeModes, isolationEnabled]);

  const response = useMemo(() => analyzeDynamicResponse(effectiveSystem.mass, effectiveSystem.stiffness, effectiveSystem.damping, effectiveSystem.forceAmplitude, forceFrequency), [effectiveSystem, forceFrequency]);
  const freqResponseData = useMemo(() => generateFrequencyResponse(effectiveSystem.mass, effectiveSystem.stiffness, effectiveSystem.damping, 3), [effectiveSystem.mass, effectiveSystem.stiffness, effectiveSystem.damping]);
  const timeHistoryData = useMemo(() => generateTimeHistory(effectiveSystem.mass, effectiveSystem.stiffness, effectiveSystem.damping, effectiveSystem.forceAmplitude, forceFrequency, 5, 0.02), [effectiveSystem, forceFrequency]);
  const reliability = useMemo(() => reliabilityAnalysis(maxAllowableDisp * 1000, allowableCOV, response.maxDisplacement * 1000, dispCOV), [maxAllowableDisp, allowableCOV, response.maxDisplacement, dispCOV]);

  const feaResult = useMemo(() => performFEAAnalysis(beamLength, numElements, [{ position: beamLength / 2, force: -forceAmplitude / 1000 }], [{ position: 0, type: 'pinned' }, { position: beamLength, type: 'roller' }], EI), [beamLength, numElements, forceAmplitude, EI]);

  const spectralResult = useMemo(() => {
    const appParams = getApplicationParameters(selectedApplication);
    return spectralAnalysis(mass, stiffness, damping, appParams.psdType, { ...appParams.defaultParams, S0: psdIntensity });
  }, [mass, stiffness, damping, selectedApplication, psdIntensity]);

  const randomReliability = useMemo(() => {
    const wn = Math.sqrt(effectiveSystem.stiffness / effectiveSystem.mass);
    const zeta = effectiveSystem.damping / (2 * Math.sqrt(effectiveSystem.stiffness * effectiveSystem.mass));
    const zeroRate = (wn / (2 * Math.PI)) * Math.sqrt(1 - zeta * zeta);
    return firstPassageReliability(spectralResult.rmsResponse, maxAllowableDisp, zeroRate, 3600);
  }, [spectralResult, maxAllowableDisp, effectiveSystem]);

  const higherMoments = useMemo(() => computeHigherOrderMoments([5, 10, 15, 20], [0.1, 0.4, 0.3, 0.2]), []);

  const varianceProp = useMemo(() => propagateVariance(forceAmplitude, Math.pow(forceAmplitude * dispCOV, 2), higherMoments.skewness, higherMoments.kurtosis, response.dynamicAmplificationFactor), [forceAmplitude, dispCOV, higherMoments, response.dynamicAmplificationFactor]);

  const currentR = forceFrequency / response.naturalFrequency;
  const nearResonance = Math.abs(currentR - 1) < 0.2;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sdof" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="sdof">SDOF</TabsTrigger>
          <TabsTrigger value="fea">FEA</TabsTrigger>
          <TabsTrigger value="random">Random</TabsTrigger>
          <TabsTrigger value="spectrum">Response Spectrum</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="sdof" className="space-y-6">
          <SDOFTab
            mass={mass} setMass={setMass}
            stiffness={stiffness} setStiffness={setStiffness}
            damping={damping} setDamping={setDamping}
            systemModel={systemModel} setSystemModel={setSystemModel}
            supportModel={supportModel} setSupportModel={setSupportModel}
            excitationType={excitationType} setExcitationType={setExcitationType}
            activeModes={activeModes} setActiveModes={setActiveModes}
            isolationEnabled={isolationEnabled} setIsolationEnabled={setIsolationEnabled}
            effectiveSystem={effectiveSystem}
            forceAmplitude={forceAmplitude} setForceAmplitude={setForceAmplitude}
            forceFrequency={forceFrequency} setForceFrequency={setForceFrequency}
            maxAllowableDisp={maxAllowableDisp} setMaxAllowableDisp={setMaxAllowableDisp}
            dispCOV={dispCOV} setDispCOV={setDispCOV}
            allowableCOV={allowableCOV} setAllowableCOV={setAllowableCOV}
            response={response} reliability={reliability}
            freqResponseData={freqResponseData} timeHistoryData={timeHistoryData}
            currentR={currentR} nearResonance={nearResonance}
            isSynced={ctx.isSynced}
            onSyncLoadMean={ctx.setLoadMean}
            onSyncLoadVariance={ctx.setLoadVariance}
            loadMean={ctx.loadMean}
          />
        </TabsContent>

        <TabsContent value="fea" className="space-y-6">
          <FEATab
            numElements={numElements} setNumElements={setNumElements}
            beamLength={beamLength} setBeamLength={setBeamLength}
            EI={EI} setEI={setEI}
            forceAmplitude={forceAmplitude}
            feaResult={feaResult}
          />
        </TabsContent>

        <TabsContent value="random" className="space-y-6">
          <RandomExcitationTab
            selectedApplication={selectedApplication} setSelectedApplication={setSelectedApplication}
            psdIntensity={psdIntensity} setPsdIntensity={setPsdIntensity}
            maxAllowableDisp={maxAllowableDisp}
            spectralResult={spectralResult}
            randomReliability={randomReliability}
            varianceProp={varianceProp}
            higherMoments={higherMoments}
          />
        </TabsContent>

        <TabsContent value="spectrum" className="space-y-6">
          <ResponseSpectrum />
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <ApplicationsTab
            selectedApplication={selectedApplication}
            setSelectedApplication={setSelectedApplication}
            response={response}
          />
        </TabsContent>
      </Tabs>

      <div className="glass-card p-6">
        <AIRecommendations
          analysisType="dynamic"
            parameters={{
            mass: effectiveSystem.mass,
            stiffness: effectiveSystem.stiffness,
            damping: response.dampingRatio,
            forceAmplitude: effectiveSystem.forceAmplitude,
            frequency: forceFrequency,
            displacementLimit: maxAllowableDisp,
            reliabilityIndex: reliability.beta,
            pof: reliability.pf,
            rmsResponse: spectralResult.rmsResponse,
            expectedMaxResponse: spectralResult.expectedMaxResponse,
            selectedApplication,
          }}
        />
      </div>
    </div>
  );
}
