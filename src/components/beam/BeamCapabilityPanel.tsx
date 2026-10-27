import type { BeamType, LoadType } from "@/lib/reliability";
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardList, Construction, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  beamCapabilityMatrix,
  beamTypeLabels,
  getCapability,
  loadCombinationPresets,
  loadTypeLabels,
  type CapabilityLevel,
} from "@/lib/beamCapability";

interface BeamCapabilityPanelProps {
  beamType: BeamType;
  loadType: LoadType;
}

const capabilityConfig: Record<CapabilityLevel, { label: string; icon: typeof CheckCircle2; badge: "default" | "secondary" | "outline" | "destructive" }> = {
  exact: { label: "FE", icon: CheckCircle2, badge: "default" },
  approximate: { label: "Approx", icon: AlertTriangle, badge: "secondary" },
  envelope: { label: "Envelope", icon: Route, badge: "outline" },
  planned: { label: "Planned", icon: Construction, badge: "destructive" },
};

export function BeamCapabilityPanel({ beamType, loadType }: BeamCapabilityPanelProps) {
  const activeCapability = getCapability(beamType, loadType);
  const ActiveIcon = capabilityConfig[activeCapability.level].icon;
  const loadTypes = Object.keys(loadTypeLabels) as LoadType[];

  return (
    <Collapsible className="glass-card border border-primary/30">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="p-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                Solver capability
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {beamTypeLabels[beamType]} + {loadTypeLabels[loadType]} — {activeCapability.note}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={capabilityConfig[activeCapability.level].badge} className="w-fit">
                <ActiveIcon className="mr-1 h-3 w-3" />
                {capabilityConfig[activeCapability.level].label}
              </Badge>
              <CollapsibleTrigger asChild>
                <button type="button" className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  Coverage <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left font-medium">Beam</th>
                    {loadTypes.map((type) => (
                      <th key={type} className="p-3 text-center font-medium">{loadTypeLabels[type]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {beamCapabilityMatrix.map((row) => (
                    <tr key={row.beamType} className="border-t">
                      <td className="p-3 font-medium text-foreground">{row.label}</td>
                      {loadTypes.map((type) => {
                        const cell = row.loads[type];
                        const config = capabilityConfig[cell?.level ?? "planned"];
                        return (
                          <td key={type} className="p-2 text-center">
                            <Badge variant={config.badge} className="text-[10px]">
                              {config.label}
                            </Badge>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {loadCombinationPresets.map((preset) => (
                <div key={preset.id} className="rounded-lg border bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">{preset.name}</div>
                    <Badge variant="outline" className="text-[10px]">{preset.standard}</Badge>
                  </div>
                  <div className="mt-2 font-mono text-sm text-primary">{preset.expression}</div>
                  <p className="mt-2 text-xs text-muted-foreground">{preset.useCase}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
