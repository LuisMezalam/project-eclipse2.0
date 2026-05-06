import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  BarChart3,
  BookOpen,
  Download,
  FileJson,
  Save,
  Settings2,
  Target,
} from "lucide-react";
import { useSharedParameters } from "@/contexts/SharedParametersContext";
import {
  analyzeDecisionScenario,
  assumptionLedger,
  decisionPresets,
  decisionReportSections,
  riskLabel,
  sensitivityRanking,
  targetOptimization,
  type DecisionScenario,
} from "@/lib/decisionSupport";
import { exportToReport } from "@/lib/exportUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SavedScenario extends DecisionScenario {
  id: string;
  savedAt: string;
  beta: number;
  pf: number;
}

const storageKey = "msd-native-decision-workspaces-v1";

function loadSavedScenarios(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]") as SavedScenario[];
  } catch {
    return [];
  }
}

function saveScenarios(scenarios: SavedScenario[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(scenarios));
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatPf(value: number) {
  return value < 0.001 ? value.toExponential(2) : `${(value * 100).toFixed(3)}%`;
}

function scenarioFromShared(ctx: ReturnType<typeof useSharedParameters>): DecisionScenario {
  return {
    projectName: "Unified framework design review",
    meanR: ctx.resistanceMean,
    covR: ctx.resistanceCoV,
    meanS: ctx.derivedStressMean / 1e6,
    covS: ctx.derivedStressCoV,
    correlation: 0,
    degradationRate: 0.006,
    serviceYears: 25,
    targetBeta: 3.5,
    unit: "MPa",
  };
}

export function DecisionSupportWorkbench() {
  const ctx = useSharedParameters();
  const [scenario, setScenario] = useState<DecisionScenario>(() => scenarioFromShared(ctx));
  const [saved, setSaved] = useState<SavedScenario[]>(loadSavedScenarios);

  const result = useMemo(() => analyzeDecisionScenario(scenario), [scenario]);
  const sensitivity = useMemo(() => sensitivityRanking(scenario), [scenario]);
  const optimization = useMemo(() => targetOptimization(scenario), [scenario]);
  const ledger = useMemo(() => assumptionLedger(scenario), [scenario]);
  const topScore = sensitivity[0]?.score || 1;

  const updateNumber = (key: keyof DecisionScenario, value: number) => {
    setScenario((current) => ({ ...current, [key]: value }));
  };

  const applyToSharedParameters = () => {
    ctx.setResistanceMean(scenario.meanR);
    ctx.setResistanceCoV(scenario.covR);
    ctx.setLoadMean(Math.max(1, scenario.meanS / 10));
    ctx.setLoadVariance(Math.pow(Math.max(0.01, scenario.meanS * scenario.covS / 10), 2));
    ctx.setSyncEnabled(true);
    ctx.setCrossRefOpen(true);
    toast.success("Decision scenario applied to shared parameters");
  };

  const saveScenario = () => {
    const next = [
      {
        ...scenario,
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        beta: result.beta,
        pf: result.pf,
      },
      ...saved,
    ].slice(0, 10);
    setSaved(next);
    saveScenarios(next);
    toast.success("Project snapshot saved");
  };

  const deleteScenario = (id: string) => {
    const next = saved.filter((item) => item.id !== id);
    setSaved(next);
    saveScenarios(next);
  };

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Native Decision Workbench
            </CardTitle>
            <CardDescription>
              Project presets, assumption ledger, sensitivity ranking, target reliability actions, and report export now live in the base app.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={result.beta >= scenario.targetBeta ? "default" : "destructive"}>
              {result.beta >= scenario.targetBeta ? "Target met" : "Target gap"}
            </Badge>
            <Badge variant="outline">{riskLabel(result.pf)} risk</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="analyze" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="analyze" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-base">Scenario Inputs</CardTitle>
                  <CardDescription>Use a preset, edit directly, or apply the scenario back into the shared framework.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="decision-project-name">
                      Project name
                    </label>
                    <Input
                      id="decision-project-name"
                      value={scenario.projectName}
                      onChange={(event) => setScenario((current) => ({ ...current, projectName: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <NumberField label="Resistance mean" value={scenario.meanR} unit={scenario.unit} onChange={(value) => updateNumber("meanR", value)} />
                    <NumberField label="Load mean" value={scenario.meanS} unit={scenario.unit} onChange={(value) => updateNumber("meanS", value)} />
                    <NumberField label="Resistance COV" value={scenario.covR} step={0.005} onChange={(value) => updateNumber("covR", value)} />
                    <NumberField label="Load COV" value={scenario.covS} step={0.005} onChange={(value) => updateNumber("covS", value)} />
                    <NumberField label="Degradation / year" value={scenario.degradationRate} step={0.001} onChange={(value) => updateNumber("degradationRate", value)} />
                    <NumberField label="Service years" value={scenario.serviceYears} onChange={(value) => updateNumber("serviceYears", value)} />
                    <NumberField label="Target beta" value={scenario.targetBeta} step={0.05} onChange={(value) => updateNumber("targetBeta", value)} />
                    <NumberField label="Correlation note" value={scenario.correlation} step={0.01} onChange={(value) => updateNumber("correlation", value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={applyToSharedParameters}>
                      <Target className="h-4 w-4" />
                      Apply to Framework
                    </Button>
                    <Button variant="outline" onClick={saveScenario}>
                      <Save className="h-4 w-4" />
                      Save Snapshot
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="FORM beta" value={result.beta.toFixed(3)} />
                  <Metric label="FORM Pf" value={formatPf(result.pf)} />
                  <Metric label="SORM Pf" value={formatPf(result.pfSorm ?? result.pf)} />
                  <Metric label="Safety factor" value={result.centralSafetyFactor.toFixed(2)} />
                </div>
                <Card className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">Design Read</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <p>
                      Current scenario is <span className="font-semibold text-foreground">{riskLabel(result.pf).toLowerCase()} risk</span> with a
                      safety margin of {result.meanSafetyMargin.toFixed(1)} {scenario.unit}.
                    </p>
                    <p>
                      Target beta check: {result.beta.toFixed(2)} / {scenario.targetBeta.toFixed(2)}.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {decisionPresets.map((preset) => (
                <Button
                  key={preset.projectName}
                  variant="outline"
                  className="h-auto justify-start p-4 text-left"
                  onClick={() => setScenario(preset)}
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{preset.projectName}</span>
                    <span className="text-xs text-muted-foreground">{preset.category} - {preset.notes}</span>
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <div className="flex flex-col gap-3">
              {saved.length === 0 && (
                <Card className="bg-muted/20">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No saved snapshots yet. Use Save Snapshot from the Analyze tab.
                  </CardContent>
                </Card>
              )}
              {saved.map((item) => (
                <Card key={item.id} className="bg-muted/20">
                  <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{item.projectName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.savedAt).toLocaleString()} - beta {item.beta.toFixed(2)} - Pf {formatPf(item.pf)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setScenario(item)}>
                        <Archive className="h-4 w-4" />
                        Load
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteScenario(item.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assumptions" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="h-4 w-4" />
                    Assumption Ledger
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {ledger.map(([label, value]) => (
                    <div key={label} className="rounded-md border border-border/60 p-3">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
                      <div className="mt-1 text-sm text-foreground">{value}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    Sensitivity Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {sensitivity.map((item, index) => (
                    <div key={item.key} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{index + 1}. {item.label}</span>
                        <span className="text-xs text-muted-foreground">{formatPf(item.swing)} swing</span>
                      </div>
                      <Progress value={Math.min(100, (item.score / topScore) * 100)} className="h-2" />
                      <div className="text-xs text-muted-foreground">{item.direction}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="optimize" className="mt-4">
            <Card className="bg-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Target Reliability Actions
                </CardTitle>
                <CardDescription>{optimization.summary}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {(optimization.actions.length
                  ? optimization.actions
                  : [{ title: "Maintain current design", detail: "Current scenario already satisfies the target beta.", value: 1 }]
                ).map((action) => (
                  <Card key={action.title} className="bg-background/60">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{action.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                      {action.detail}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="mt-4">
            <Card className="bg-muted/20">
              <CardHeader>
                <CardTitle className="text-base">Report and Data Export</CardTitle>
                <CardDescription>Export the decision support package alongside the existing per-tab reports.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button onClick={() => exportToReport(decisionReportSections(scenario), "decision_support_report")}>
                  <Download className="h-4 w-4" />
                  Text Report
                </Button>
                <Button variant="outline" onClick={() => downloadJson("decision_scenario.json", scenario)}>
                  <FileJson className="h-4 w-4" />
                  Scenario JSON
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{unit ? ` (${unit})` : ""}
      </label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-muted/20">
      <CardContent className="p-4">
        <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 font-mono text-2xl font-bold text-primary">{value}</div>
      </CardContent>
    </Card>
  );
}
