import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Area, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Boxes, Download, Gauge, Layers3, Play, Save, SlidersHorizontal, Trash2, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { DynamicResponse } from "@/lib/reliability";
import { exportToReport, type ReportSection } from "@/lib/exportUtils";
import {
  dynamicSystemPresets,
  excitationFactors,
  getDynamicSystemPreset,
  supportModelFactors,
  type DynamicExcitationType,
  type DynamicSupportModel,
  type DynamicSystemModelId,
  type EffectiveDynamicSystem,
} from "@/lib/dynamicSystemModels";

interface DynamicScenarioSnapshot {
  id: string;
  name: string;
  savedAt: string;
  systemModel: DynamicSystemModelId;
  supportModel: DynamicSupportModel;
  excitationType: DynamicExcitationType;
  activeModes: number;
  isolationEnabled: boolean;
  mass: number;
  stiffness: number;
  damping: number;
  forceAmplitude: number;
  forceFrequency: number;
  maxAllowableDisp: number;
  response: DynamicResponse;
  reliability: { beta: number; pf: number };
  effectiveSystem: EffectiveDynamicSystem;
}

interface SDOFTabProps {
  mass: number;
  setMass: (v: number) => void;
  stiffness: number;
  setStiffness: (v: number) => void;
  damping: number;
  setDamping: (v: number) => void;
  systemModel: DynamicSystemModelId;
  setSystemModel: (v: DynamicSystemModelId) => void;
  supportModel: DynamicSupportModel;
  setSupportModel: (v: DynamicSupportModel) => void;
  excitationType: DynamicExcitationType;
  setExcitationType: (v: DynamicExcitationType) => void;
  activeModes: number;
  setActiveModes: (v: number) => void;
  isolationEnabled: boolean;
  setIsolationEnabled: (v: boolean) => void;
  effectiveSystem: EffectiveDynamicSystem;
  forceAmplitude: number;
  setForceAmplitude: (v: number) => void;
  forceFrequency: number;
  setForceFrequency: (v: number) => void;
  maxAllowableDisp: number;
  setMaxAllowableDisp: (v: number) => void;
  dispCOV: number;
  setDispCOV: (v: number) => void;
  allowableCOV: number;
  setAllowableCOV: (v: number) => void;
  response: DynamicResponse;
  reliability: { beta: number; pf: number };
  freqResponseData: { r: number; DAF: number }[];
  timeHistoryData: { t: number; x: number; F: number }[];
  currentR: number;
  nearResonance: boolean;
  isSynced: boolean;
  onSyncLoadMean: (v: number) => void;
  onSyncLoadVariance: (v: number) => void;
  loadMean: number;
}

const dynamicScenarioStorageKey = "msd-dynamic-scenarios-v1";

const responseChartStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
};

function loadDynamicScenarios(): DynamicScenarioSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(dynamicScenarioStorageKey) || "[]") as DynamicScenarioSnapshot[];
  } catch {
    return [];
  }
}

function persistDynamicScenarios(scenarios: DynamicScenarioSnapshot[]) {
  window.localStorage.setItem(dynamicScenarioStorageKey, JSON.stringify(scenarios));
}

function formatPf(value: number) {
  return value < 0.001 ? value.toExponential(2) : `${(value * 100).toFixed(3)}%`;
}

function buildDynamicReport(snapshot: DynamicScenarioSnapshot, comparison: DynamicScenarioSnapshot[]): ReportSection[] {
  return [
    {
      title: "Dynamic Scenario Summary",
      description: "Current modular dynamic system, effective properties, and response reliability.",
      data: [
        { label: "Scenario", value: snapshot.name },
        { label: "System model", value: getDynamicSystemPreset(snapshot.systemModel).label },
        { label: "Support model", value: supportModelFactors[snapshot.supportModel].label },
        { label: "Excitation", value: excitationFactors[snapshot.excitationType].label },
        { label: "Participating modes", value: snapshot.activeModes },
        { label: "Isolation", value: snapshot.isolationEnabled ? "Enabled" : "Disabled" },
      ],
    },
    {
      title: "Effective Dynamic Properties",
      description: "Base inputs transformed through model, support, excitation, isolation, and mode participation factors.",
      data: [
        { label: "Effective mass", value: snapshot.effectiveSystem.mass, unit: "kg", precision: 1 },
        { label: "Effective stiffness", value: snapshot.effectiveSystem.stiffness / 1000, unit: "kN/m", precision: 2 },
        { label: "Effective damping", value: snapshot.effectiveSystem.damping, unit: "N*s/m", precision: 1 },
        { label: "Effective force", value: snapshot.effectiveSystem.forceAmplitude / 1000, unit: "kN", precision: 2 },
        { label: "Forcing frequency", value: snapshot.forceFrequency, unit: "rad/s", precision: 2 },
      ],
    },
    {
      title: "Response and Reliability",
      data: [
        { label: "Natural frequency", value: snapshot.response.naturalFrequency, unit: "rad/s", precision: 3 },
        { label: "Damping ratio", value: snapshot.response.dampingRatio, precision: 4 },
        { label: "DAF", value: snapshot.response.dynamicAmplificationFactor, precision: 3 },
        { label: "Max displacement", value: snapshot.response.maxDisplacement * 1000, unit: "mm", precision: 2 },
        { label: "Reliability beta", value: snapshot.reliability.beta, precision: 3 },
        { label: "Probability of failure", value: formatPf(snapshot.reliability.pf) },
      ],
    },
    {
      title: "Scenario Comparison",
      description: "Saved design cases available for side-by-side screening.",
      table: {
        headers: ["Scenario", "Model", "Support", "Excitation", "DAF", "Disp mm", "Beta", "Pf"],
        rows: comparison.map((item) => [
          item.name,
          getDynamicSystemPreset(item.systemModel).label,
          supportModelFactors[item.supportModel].label,
          excitationFactors[item.excitationType].label,
          item.response.dynamicAmplificationFactor.toFixed(2),
          (item.response.maxDisplacement * 1000).toFixed(1),
          item.reliability.beta.toFixed(2),
          formatPf(item.reliability.pf),
        ]),
      },
    },
  ];
}

function MetricCard({ label, value, detail, status }: { label: string; value: string; detail?: string; status?: "good" | "warn" | "bad" }) {
  return (
    <Card className={status === "bad" ? "border-destructive/60" : status === "warn" ? "border-primary/60" : ""}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={status === "bad" ? "mt-1 font-mono text-2xl font-bold text-destructive" : "mt-1 font-mono text-2xl font-bold text-foreground"}>
          {value}
        </div>
        {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}

function SystemSchematic({
  systemModel,
  supportModel,
  excitationType,
  activeModes,
  isolationEnabled,
  response,
  currentR,
}: {
  systemModel: DynamicSystemModelId;
  supportModel: DynamicSupportModel;
  excitationType: DynamicExcitationType;
  activeModes: number;
  isolationEnabled: boolean;
  response: DynamicResponse;
  currentR: number;
}) {
  const preset = getDynamicSystemPreset(systemModel);
  const massShift = Math.max(-22, Math.min(34, response.maxDisplacement * 2800));
  const resonancePulse = Math.abs(currentR - 1) < 0.2;
  const massBlocks = systemModel === "building" ? Math.min(activeModes + 1, 5) : systemModel === "bridge" ? 3 : 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Boxes className="h-5 w-5 text-primary" />
              Reactive System Schematic
            </CardTitle>
            <CardDescription>{preset.loadPath}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{supportModelFactors[supportModel].label}</Badge>
            <Badge variant="outline">{excitationFactors[excitationType].label}</Badge>
            {isolationEnabled ? <Badge>Isolation active</Badge> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative min-h-[300px] overflow-hidden rounded-lg border bg-muted/20">
          <svg viewBox="0 0 900 300" className="h-[300px] w-full">
            <defs>
              <linearGradient id="massFill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              </linearGradient>
              <linearGradient id="supportFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            <rect x="54" y="44" width="26" height="212" rx="5" fill="url(#supportFill)" />
            <line x1="80" y1="255" x2="815" y2="255" stroke="hsl(var(--border))" strokeWidth="3" />

            {isolationEnabled || supportModel === "isolated" ? (
              <>
                <rect x="152" y="235" width="235" height="20" rx="7" fill="hsl(var(--accent))" opacity="0.35" />
                <path d="M170 245 C190 225 210 265 230 245 C250 225 270 265 290 245 C310 225 330 265 350 245" fill="none" stroke="hsl(var(--accent))" strokeWidth="4" />
              </>
            ) : null}

            <path d="M80 142 L108 142 L121 108 L145 176 L169 108 L193 176 L217 108 L241 176 L254 142 L292 142" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
            <rect x="112" y="177" width="118" height="34" rx="8" fill="none" stroke="hsl(var(--secondary-foreground))" strokeWidth="4" opacity="0.75" />
            <line x1="80" y1="194" x2="112" y2="194" stroke="hsl(var(--secondary-foreground))" strokeWidth="4" opacity="0.75" />
            <line x1="230" y1="194" x2="292" y2="194" stroke="hsl(var(--secondary-foreground))" strokeWidth="4" opacity="0.75" />

            {Array.from({ length: massBlocks }).map((_, index) => {
              const x = 312 + massShift + index * 78;
              const y = systemModel === "building" ? 196 - index * 42 : systemModel === "bridge" ? 132 + Math.sin(index) * 18 : 114;
              const height = systemModel === "building" ? 34 : 88;
              return (
                <g key={index}>
                  {systemModel === "building" && index > 0 ? (
                    <line x1={x + 31} y1={y + height} x2={x - 47} y2={y + height + 42} stroke="hsl(var(--border))" strokeWidth="4" />
                  ) : null}
                  <rect
                    x={x}
                    y={y}
                    width={systemModel === "bridge" ? 92 : 64}
                    height={height}
                    rx="8"
                    fill="url(#massFill)"
                    stroke={resonancePulse ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    strokeWidth={resonancePulse ? 5 : 3}
                  />
                  <text x={x + (systemModel === "bridge" ? 46 : 32)} y={y + height / 2 + 5} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="16" fontWeight="700">
                    {systemModel === "building" ? `m${index + 1}` : "m"}
                  </text>
                </g>
              );
            })}

            {excitationType === "seismic" ? (
              <path d="M120 266 C170 244 218 286 268 266 C318 244 366 286 416 266 C466 244 514 286 564 266" fill="none" stroke="hsl(var(--destructive))" strokeWidth="4" />
            ) : (
              <g>
                <line x1="730" y1="150" x2="618" y2="150" stroke="hsl(var(--destructive))" strokeWidth="6" />
                <path d="M618 150 L641 137 L641 163 Z" fill="hsl(var(--destructive))" />
                <text x="742" y="155" fill="hsl(var(--destructive))" fontSize="18" fontWeight="700">F(t)</text>
              </g>
            )}

            <text x="130" y="92" fill="hsl(var(--primary))" fontSize="14" fontWeight="700">k</text>
            <text x="130" y="225" fill="hsl(var(--foreground))" fontSize="14" fontWeight="700">c</text>
            <text x="612" y="44" fill="hsl(var(--muted-foreground))" fontSize="13">{preset.description}</text>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

export function SDOFTab({
  mass, setMass,
  stiffness, setStiffness,
  damping, setDamping,
  systemModel, setSystemModel,
  supportModel, setSupportModel,
  excitationType, setExcitationType,
  activeModes, setActiveModes,
  isolationEnabled, setIsolationEnabled,
  effectiveSystem,
  forceAmplitude, setForceAmplitude,
  forceFrequency, setForceFrequency,
  maxAllowableDisp, setMaxAllowableDisp,
  dispCOV, setDispCOV,
  allowableCOV, setAllowableCOV,
  response, reliability,
  freqResponseData, timeHistoryData,
  currentR, nearResonance,
  isSynced, onSyncLoadMean, onSyncLoadVariance, loadMean,
}: SDOFTabProps) {
  const [scenarioName, setScenarioName] = useState("Dynamic design case");
  const [savedScenarios, setSavedScenarios] = useState<DynamicScenarioSnapshot[]>(loadDynamicScenarios);
  const preset = getDynamicSystemPreset(systemModel);
  const displacementRatio = Math.min(100, (response.maxDisplacement / maxAllowableDisp) * 100);
  const dampingPercent = Math.min(100, response.dampingRatio * 100);
  const frequencyHz = response.naturalFrequency / (2 * Math.PI);
  const currentSnapshot = useMemo<DynamicScenarioSnapshot>(() => ({
    id: "current",
    name: scenarioName.trim() || "Dynamic design case",
    savedAt: new Date().toISOString(),
    systemModel,
    supportModel,
    excitationType,
    activeModes,
    isolationEnabled,
    mass,
    stiffness,
    damping,
    forceAmplitude,
    forceFrequency,
    maxAllowableDisp,
    response,
    reliability,
    effectiveSystem,
  }), [scenarioName, systemModel, supportModel, excitationType, activeModes, isolationEnabled, mass, stiffness, damping, forceAmplitude, forceFrequency, maxAllowableDisp, response, reliability, effectiveSystem]);
  const comparisonScenarios = useMemo(() => [currentSnapshot, ...savedScenarios].slice(0, 6), [currentSnapshot, savedScenarios]);

  const saveCurrentScenario = () => {
    const next = [{ ...currentSnapshot, id: crypto.randomUUID(), savedAt: new Date().toISOString() }, ...savedScenarios].slice(0, 8);
    setSavedScenarios(next);
    persistDynamicScenarios(next);
    toast.success("Dynamic scenario saved");
  };

  const deleteScenario = (id: string) => {
    const next = savedScenarios.filter((scenario) => scenario.id !== id);
    setSavedScenarios(next);
    persistDynamicScenarios(next);
  };

  const exportCurrentReport = () => {
    exportToReport(buildDynamicReport(currentSnapshot, comparisonScenarios), "dynamic-load-scenario-report");
    toast.success("Dynamic report exported");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              System Builder
            </CardTitle>
            <CardDescription>Customize the model before it feeds the response and reliability calculations.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">System model</label>
              <Select value={systemModel} onValueChange={(value) => setSystemModel(value as DynamicSystemModelId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {dynamicSystemPresets.map((model) => (
                      <SelectItem key={model.id} value={model.id}>{model.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{preset.description}</p>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">Support model</label>
              <Select value={supportModel} onValueChange={(value) => setSupportModel(value as DynamicSupportModel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(supportModelFactors).map(([key, support]) => (
                      <SelectItem key={key} value={key}>{support.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">Excitation type</label>
              <Select value={excitationType} onValueChange={(value) => setExcitationType(value as DynamicExcitationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(excitationFactors).map(([key, excitation]) => (
                      <SelectItem key={key} value={key}>{excitation.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Isolation layer</div>
                <div className="text-xs text-muted-foreground">Adds damping and softens the base stiffness.</div>
              </div>
              <Switch checked={isolationEnabled} onCheckedChange={setIsolationEnabled} />
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Participating modes: {activeModes}</label>
                <Slider value={[activeModes]} onValueChange={([v]) => setActiveModes(v)} min={1} max={6} step={1} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mass m: {mass} kg</label>
                <Slider value={[mass]} onValueChange={([v]) => setMass(v)} min={100} max={5000} step={100} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Stiffness k: {(stiffness / 1000).toFixed(0)} kN/m</label>
                <Slider value={[stiffness]} onValueChange={([v]) => setStiffness(v)} min={10000} max={500000} step={5000} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Damping c: {damping} N*s/m</label>
                <Slider value={[damping]} onValueChange={([v]) => setDamping(v)} min={0} max={5000} step={100} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <SystemSchematic
            systemModel={systemModel}
            supportModel={supportModel}
            excitationType={excitationType}
            activeModes={activeModes}
            isolationEnabled={isolationEnabled}
            response={response}
            currentR={currentR}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Natural frequency" value={`${response.naturalFrequency.toFixed(2)} rad/s`} detail={`${frequencyHz.toFixed(2)} Hz`} />
            <MetricCard label="Damping ratio" value={`${(response.dampingRatio * 100).toFixed(1)}%`} detail={`critical damping use: ${dampingPercent.toFixed(1)}%`} />
            <MetricCard label="Frequency ratio" value={currentR.toFixed(2)} detail={nearResonance ? "near resonance" : "away from resonance"} status={nearResonance ? "bad" : "good"} />
            <MetricCard label="DAF" value={response.dynamicAmplificationFactor.toFixed(2)} detail="dynamic amplification" status={response.dynamicAmplificationFactor > 3 ? "warn" : "good"} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Live Load and Limit Controls
          </CardTitle>
          <CardDescription>Changes here immediately update the schematic, amplification, time history, and failure probability.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-primary">Excitation</h4>
              <div>
                <label className="text-xs text-muted-foreground">Base force F0: {(forceAmplitude / 1000).toFixed(1)} kN</label>
                <Slider
                  value={[forceAmplitude]}
                  onValueChange={([v]) => {
                    setForceAmplitude(v);
                    if (isSynced) onSyncLoadMean(v / 1000);
                  }}
                  min={1000}
                  max={20000}
                  step={500}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Forcing frequency: {forceFrequency.toFixed(1)} rad/s</label>
                <Slider value={[forceFrequency]} onValueChange={([v]) => setForceFrequency(v)} min={1} max={30} step={0.5} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-semibold text-primary">Reliability limits</h4>
              <div>
                <label className="text-xs text-muted-foreground">Max allowable: {(maxAllowableDisp * 1000).toFixed(0)} mm</label>
                <Slider value={[maxAllowableDisp]} onValueChange={([v]) => setMaxAllowableDisp(v)} min={0.01} max={0.2} step={0.005} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Demand COV: {(dispCOV * 100).toFixed(0)}%</label>
                  <Slider
                    value={[dispCOV]}
                    onValueChange={([v]) => {
                      setDispCOV(v);
                      if (isSynced && loadMean > 0) onSyncLoadVariance(Math.pow(v * loadMean, 2));
                    }}
                    min={0.05}
                    max={0.4}
                    step={0.02}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Capacity COV: {(allowableCOV * 100).toFixed(0)}%</label>
                  <Slider value={[allowableCOV]} onValueChange={([v]) => setAllowableCOV(v)} min={0.05} max={0.3} step={0.02} />
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Effective model</div>
                  <p className="mt-1 text-xs text-muted-foreground">Base parameters are transformed by the selected system, support, excitation, and modes.</p>
                </div>
                {nearResonance ? <Badge variant="destructive">Resonance watch</Badge> : <Badge variant="outline">Stable range</Badge>}
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>m_eff</span><span className="font-mono text-foreground">{effectiveSystem.mass.toFixed(0)} kg</span></div>
                <div className="flex justify-between"><span>k_eff</span><span className="font-mono text-foreground">{(effectiveSystem.stiffness / 1000).toFixed(1)} kN/m</span></div>
                <div className="flex justify-between"><span>c_eff</span><span className="font-mono text-foreground">{effectiveSystem.damping.toFixed(0)} N*s/m</span></div>
                <div className="flex justify-between"><span>F_eff</span><span className="font-mono text-foreground">{(effectiveSystem.forceAmplitude / 1000).toFixed(1)} kN</span></div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForceFrequency(response.naturalFrequency);
                }}
              >
                <Play className="h-4 w-4" />
                Tune to resonance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Max displacement</div>
            <div className={response.maxDisplacement > maxAllowableDisp ? "mt-1 font-mono text-3xl font-bold text-destructive" : "mt-1 font-mono text-3xl font-bold text-primary"}>
              {(response.maxDisplacement * 1000).toFixed(1)} mm
            </div>
            <Progress value={displacementRatio} className="mt-3" />
            <div className="mt-2 text-xs text-muted-foreground">Allowable: {(maxAllowableDisp * 1000).toFixed(0)} mm</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Reliability index beta</div>
            <div className="mt-1 font-mono text-3xl font-bold text-foreground">{reliability.beta.toFixed(3)}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Displacement limit state
            </div>
          </CardContent>
        </Card>
        <Card className={reliability.pf > 0.01 ? "border-destructive/60" : ""}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pf displacement</div>
            <div className={reliability.pf > 0.01 ? "mt-1 font-mono text-3xl font-bold text-destructive" : "mt-1 font-mono text-3xl font-bold text-primary"}>
              {reliability.pf.toExponential(2)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Demand and capacity uncertainty included
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                Scenario Comparison and Report
              </CardTitle>
              <CardDescription>Save design cases, compare response risk, and export the current dynamic analysis package.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={saveCurrentScenario}>
                <Save className="h-4 w-4" />
                Save Case
              </Button>
              <Button type="button" onClick={exportCurrentReport}>
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[280px_1fr]">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="dynamic-scenario-name">Scenario name</label>
              <input
                id="dynamic-scenario-name"
                value={scenarioName}
                onChange={(event) => setScenarioName(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-2 rounded-lg border p-3 text-xs text-muted-foreground sm:grid-cols-4">
              <div><span className="block text-foreground">Current DAF</span>{response.dynamicAmplificationFactor.toFixed(2)}</div>
              <div><span className="block text-foreground">Current disp</span>{(response.maxDisplacement * 1000).toFixed(1)} mm</div>
              <div><span className="block text-foreground">Current beta</span>{reliability.beta.toFixed(2)}</div>
              <div><span className="block text-foreground">Current Pf</span>{formatPf(reliability.pf)}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-left font-medium">Scenario</th>
                  <th className="p-3 text-left font-medium">Model</th>
                  <th className="p-3 text-left font-medium">Support</th>
                  <th className="p-3 text-left font-medium">Excitation</th>
                  <th className="p-3 text-right font-medium">DAF</th>
                  <th className="p-3 text-right font-medium">Disp</th>
                  <th className="p-3 text-right font-medium">Beta</th>
                  <th className="p-3 text-right font-medium">Pf</th>
                  <th className="p-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {comparisonScenarios.map((scenario) => (
                  <tr key={scenario.id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{scenario.name}</div>
                      <div className="text-xs text-muted-foreground">{scenario.id === "current" ? "live case" : new Date(scenario.savedAt).toLocaleString()}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{getDynamicSystemPreset(scenario.systemModel).label}</td>
                    <td className="p-3 text-muted-foreground">{supportModelFactors[scenario.supportModel].label}</td>
                    <td className="p-3 text-muted-foreground">{excitationFactors[scenario.excitationType].label}</td>
                    <td className="p-3 text-right font-mono">{scenario.response.dynamicAmplificationFactor.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">{(scenario.response.maxDisplacement * 1000).toFixed(1)} mm</td>
                    <td className="p-3 text-right font-mono">{scenario.reliability.beta.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">{formatPf(scenario.reliability.pf)}</td>
                    <td className="p-3 text-right">
                      {scenario.id !== "current" ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => deleteScenario(scenario.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant="outline">Live</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Waves className="h-5 w-5 text-primary" />
              Frequency Response Function
            </CardTitle>
            <CardDescription>Current operating point and resonance update with every system change.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={freqResponseData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="frfGradDynamicWorkbench" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="r" type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => v.toFixed(2)} label={{ value: "Frequency ratio", position: "bottom", fill: "hsl(var(--muted-foreground))", offset: -5 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: "DAF", angle: -90, position: "left", fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={responseChartStyle} formatter={(v: number) => [v.toFixed(3), "DAF"]} labelFormatter={(l) => `r = ${Number(l).toFixed(2)}`} />
                  <Area type="monotone" dataKey="DAF" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#frfGradDynamicWorkbench)" />
                  <ReferenceLine x={currentR} stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" />
                  <ReferenceLine x={1} stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers3 className="h-5 w-5 text-primary" />
              Time History Response
            </CardTitle>
            <CardDescription>Displacement and applied force are generated from the effective system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeHistoryData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="t" type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v: number) => v.toFixed(1)} label={{ value: "Time (s)", position: "bottom", fill: "hsl(var(--muted-foreground))", offset: -5 }} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={responseChartStyle} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="x" stroke="hsl(var(--primary))" strokeWidth={1.75} dot={false} name="Displacement (m)" />
                  <Line yAxisId="right" type="monotone" dataKey="F" stroke="hsl(var(--destructive))" strokeWidth={1} dot={false} name="Force (N)" opacity={0.55} />
                  <ReferenceLine yAxisId="left" y={maxAllowableDisp} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                  <ReferenceLine yAxisId="left" y={-maxAllowableDisp} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
