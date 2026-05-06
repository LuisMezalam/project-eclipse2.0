import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Gauge, Layers3, RotateCcw, Save, Trash2 } from "lucide-react";
import { useSharedParameters } from "@/contexts/SharedParametersContext";
import {
  applyGlobalSnapshot,
  buildGlobalSnapshot,
  formatGlobalPf,
  getGlobalRiskDrivers,
  globalReportSections,
  type GlobalProjectSnapshot,
} from "@/lib/globalProject";
import { exportToReport } from "@/lib/exportUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const storageKey = "msd-global-project-scenarios-v1";

function loadSnapshots(): GlobalProjectSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "[]") as GlobalProjectSnapshot[];
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots: GlobalProjectSnapshot[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(snapshots));
}

export function GlobalProjectWorkbench() {
  const ctx = useSharedParameters();
  const [projectName, setProjectName] = useState("Whole-system reliability review");
  const [saved, setSaved] = useState<GlobalProjectSnapshot[]>(loadSnapshots);
  const current = useMemo(() => buildGlobalSnapshot(ctx, projectName), [ctx, projectName]);
  const riskDrivers = useMemo(() => getGlobalRiskDrivers(current), [current]);

  const saveCurrent = () => {
    const next = [current, ...saved].slice(0, 10);
    setSaved(next);
    saveSnapshots(next);
    toast.success("Whole-system scenario saved");
  };

  const deleteSnapshot = (id: string) => {
    const next = saved.filter((snapshot) => snapshot.id !== id);
    setSaved(next);
    saveSnapshots(next);
  };

  const exportReport = () => {
    exportToReport(globalReportSections(current, saved), "whole-system-reliability-report");
    toast.success("Whole-system report exported");
  };

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers3 className="h-5 w-5 text-primary" />
              Whole-System Scenario Manager
            </CardTitle>
            <CardDescription>
              Save and compare the shared framework state across every analysis tab, then export a unified engineering report.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={current.beta >= 3.5 ? "default" : "destructive"}>
              beta {current.beta.toFixed(2)}
            </Badge>
            <Badge variant="outline">Pf {formatGlobalPf(current.pf)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 lg:grid-cols-[320px_1fr_auto] lg:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="global-project-name">Project scenario name</label>
            <Input id="global-project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
          </div>
          <div className="grid gap-2 rounded-lg border p-3 text-xs text-muted-foreground sm:grid-cols-4">
            <div><span className="block text-foreground">Load</span>{current.loadMean.toFixed(1)} kN/m</div>
            <div><span className="block text-foreground">Span</span>{current.beamLength.toFixed(1)} m</div>
            <div><span className="block text-foreground">Resistance</span>{current.resistanceMean.toFixed(0)} MPa</div>
            <div><span className="block text-foreground">Stress demand</span>{(current.derivedStressMean / 1e6).toFixed(1)} MPa</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveCurrent}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button onClick={exportReport}>
              <Download className="h-4 w-4" />
              Report
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-4 w-4 text-primary" />
                Cross-Tab Risk Drivers
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {riskDrivers.map((driver) => (
                <div key={driver.label} className="rounded-lg border bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">{driver.label}</div>
                    <div className="font-mono text-sm text-primary">{driver.score.toFixed(0)}</div>
                  </div>
                  <Progress value={driver.score} className="mt-2" />
                  <p className="mt-2 text-xs text-muted-foreground">{driver.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="text-base">Saved Whole-System Scenarios</CardTitle>
              <CardDescription>Restoring a snapshot pushes its parameters back into the shared framework.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left font-medium">Scenario</th>
                      <th className="p-3 text-right font-medium">Load</th>
                      <th className="p-3 text-right font-medium">Span</th>
                      <th className="p-3 text-right font-medium">Beta</th>
                      <th className="p-3 text-right font-medium">Pf</th>
                      <th className="p-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[current, ...saved].slice(0, 8).map((snapshot) => (
                      <tr key={snapshot.id} className="border-t">
                        <td className="p-3">
                          <div className="font-medium text-foreground">{snapshot.name}</div>
                          <div className="text-xs text-muted-foreground">{snapshot.id === current.id ? "live state" : new Date(snapshot.savedAt).toLocaleString()}</div>
                        </td>
                        <td className="p-3 text-right font-mono">{snapshot.loadMean.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono">{snapshot.beamLength.toFixed(1)}</td>
                        <td className="p-3 text-right font-mono">{snapshot.beta.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono">{formatGlobalPf(snapshot.pf)}</td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {snapshot.id === current.id ? (
                              <Badge variant="outline">Live</Badge>
                            ) : (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => applyGlobalSnapshot(ctx, snapshot)}>
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteSnapshot(snapshot.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
