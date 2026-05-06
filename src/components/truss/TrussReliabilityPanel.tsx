import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import {
  type TrussSystemReliability,
  type ImportanceSamplingResult,
  type SubsetSimulationResult,
  type RBDOResult,
  type SensitivityResult,
  type LRFDResult,
} from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "./useTrussAnalysis";
import {
  SystemTab,
  MembersTab,
  LRFDTab,
  SensitivityTab,
  MonteCarloTab,
  ImportanceSamplingTab,
  SubsetSimulationTab,
  RBDOTab,
} from "./reliability";

interface TrussReliabilityPanelProps {
  showReliability: boolean; setShowReliability: (v: boolean) => void;
  enableLRFD: boolean; setEnableLRFD: (v: boolean) => void;
  showSensitivity: boolean; setShowSensitivity: (v: boolean) => void;
  runMonteCarlo: boolean; setRunMonteCarlo: (v: boolean) => void;
  runImportanceSampling: boolean; setRunImportanceSampling: (v: boolean) => void;
  runSubsetSimulation: boolean; setRunSubsetSimulation: (v: boolean) => void;
  enableRBDO: boolean; setEnableRBDO: (v: boolean) => void;
  mcSamples: number; setMcSamples: (v: number) => void;
  isSamples: number; setIsSamples: (v: number) => void;
  ssSamplesPerLevel: number; setSsSamplesPerLevel: (v: number) => void;
  rbdoTargetBeta: number; setRbdoTargetBeta: (v: number) => void;
  setMcTrigger: (fn: (v: number) => number) => void;
  setIsTrigger: (fn: (v: number) => number) => void;
  setSsTrigger: (fn: (v: number) => number) => void;
  setRbdoTrigger: (fn: (v: number) => number) => void;
  trussReliability: TrussSystemReliability;
  mcResults: { numSamples: number; failureCount: number; estimatedPf: number; estimatedBeta: number; convergenceHistory: { samples: number; pf: number }[] } | null;
  isResults: ImportanceSamplingResult | null;
  ssResults: SubsetSimulationResult | null;
  rbdoResults: RBDOResult | null;
  lrfdResults: LRFDResult[];
  criticalLRFD: LRFDResult | null;
  topSensitivityFactors: SensitivityResult[];
  applyRBDOResults: () => void;
  du: TrussDisplayUnits;
}

export function TrussReliabilityPanel(p: TrussReliabilityPanelProps) {
  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-primary" />Truss Reliability Analysis
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          {[
            ['Reliability', p.showReliability, p.setShowReliability],
            ['LRFD', p.enableLRFD, p.setEnableLRFD],
            ['Sensitivity', p.showSensitivity, p.setShowSensitivity],
            ['MC', p.runMonteCarlo, p.setRunMonteCarlo],
            ['IS', p.runImportanceSampling, p.setRunImportanceSampling],
            ['SS', p.runSubsetSimulation, p.setRunSubsetSimulation],
            ['RBDO', p.enableRBDO, p.setEnableRBDO],
          ].map(([label, checked, onChange]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{label as string}</span>
              <Switch checked={checked as boolean} onCheckedChange={onChange as (v: boolean) => void} />
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="system" className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {p.enableLRFD && <TabsTrigger value="lrfd">LRFD</TabsTrigger>}
          {p.showSensitivity && <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>}
          {p.runMonteCarlo && <TabsTrigger value="monte-carlo">Monte Carlo</TabsTrigger>}
          {p.runImportanceSampling && <TabsTrigger value="importance-sampling">Importance Sampling</TabsTrigger>}
          {p.runSubsetSimulation && <TabsTrigger value="subset-simulation">Subset Simulation</TabsTrigger>}
          {p.enableRBDO && <TabsTrigger value="rbdo">RBDO</TabsTrigger>}
        </TabsList>

        <TabsContent value="system">
          <SystemTab trussReliability={p.trussReliability} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab trussReliability={p.trussReliability} du={p.du} />
        </TabsContent>

        {p.enableLRFD && (
          <TabsContent value="lrfd">
            <LRFDTab lrfdResults={p.lrfdResults} criticalLRFD={p.criticalLRFD} du={p.du} />
          </TabsContent>
        )}

        {p.showSensitivity && (
          <TabsContent value="sensitivity">
            <SensitivityTab topSensitivityFactors={p.topSensitivityFactors} du={p.du} />
          </TabsContent>
        )}

        {p.runMonteCarlo && p.mcResults && (
          <TabsContent value="monte-carlo">
            <MonteCarloTab
              mcSamples={p.mcSamples} setMcSamples={p.setMcSamples}
              setMcTrigger={p.setMcTrigger}
              mcResults={p.mcResults} trussReliability={p.trussReliability}
            />
          </TabsContent>
        )}

        {p.runImportanceSampling && p.isResults && (
          <TabsContent value="importance-sampling">
            <ImportanceSamplingTab
              isSamples={p.isSamples} setIsSamples={p.setIsSamples}
              setIsTrigger={p.setIsTrigger}
              isResults={p.isResults} trussReliability={p.trussReliability}
            />
          </TabsContent>
        )}

        {p.runSubsetSimulation && p.ssResults && (
          <TabsContent value="subset-simulation">
            <SubsetSimulationTab
              ssSamplesPerLevel={p.ssSamplesPerLevel} setSsSamplesPerLevel={p.setSsSamplesPerLevel}
              setSsTrigger={p.setSsTrigger}
              ssResults={p.ssResults} trussReliability={p.trussReliability}
            />
          </TabsContent>
        )}

        {p.enableRBDO && (
          <TabsContent value="rbdo">
            <RBDOTab
              rbdoTargetBeta={p.rbdoTargetBeta} setRbdoTargetBeta={p.setRbdoTargetBeta}
              setRbdoTrigger={p.setRbdoTrigger}
              rbdoResults={p.rbdoResults} applyRBDOResults={p.applyRBDOResults}
              du={p.du}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
