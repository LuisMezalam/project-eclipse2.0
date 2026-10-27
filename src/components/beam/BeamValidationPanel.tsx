import { Activity, AlertTriangle, CheckCircle2, ChevronDown, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { BeamValidationSeverity, BeamValidationSummary } from "@/lib/beamValidation";

interface BeamValidationPanelProps {
  validation: BeamValidationSummary;
  supportFallback: boolean;
}

const statusConfig = {
  ready: {
    icon: CheckCircle2,
    badge: "default" as const,
    className: "border-accent/30 bg-accent/10 text-accent",
  },
  watch: {
    icon: AlertTriangle,
    badge: "secondary" as const,
    className: "border-chart-3/30 bg-chart-3/10 text-chart-3",
  },
  critical: {
    icon: ShieldAlert,
    badge: "destructive" as const,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

const issueConfig: Record<BeamValidationSeverity, { icon: typeof Info; className: string; label: string }> = {
  info: { icon: Info, className: "border-primary/20 bg-primary/5 text-primary", label: "Info" },
  warning: { icon: AlertTriangle, className: "border-chart-3/30 bg-chart-3/10 text-chart-3", label: "Warning" },
  critical: { icon: ShieldAlert, className: "border-destructive/30 bg-destructive/10 text-destructive", label: "Critical" },
};

function formatPercent(value: number) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : "n/a";
}

export function BeamValidationPanel({ validation, supportFallback }: BeamValidationPanelProps) {
  const displayStatus = supportFallback ? "critical" : validation.status;
  const StatusIcon = statusConfig[displayStatus].icon;
  const visibleIssues = [...validation.issues]
    .sort((a, b) => {
      const order: Record<BeamValidationSeverity, number> = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 5);

  return (
    <Collapsible>
      <section className="glass-card p-3" aria-labelledby="beam-health-title">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-primary" />
            <h3 id="beam-health-title" className="text-sm font-semibold text-foreground">Analysis health</h3>
            <Badge variant={statusConfig[displayStatus].badge} className="w-fit gap-1 px-2 py-0.5 text-[10px]">
              <StatusIcon className="h-3 w-3" />
              {supportFallback ? "Unstable supports" : validation.statusLabel}
            </Badge>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="rounded-md bg-muted/30 px-2.5 py-1">
              <span className="text-[10px] text-muted-foreground">Stress </span>
              <span className="font-mono text-xs font-semibold text-foreground">{formatPercent(validation.stressUtilization)}</span>
            </div>
            <div className="rounded-md bg-muted/30 px-2.5 py-1">
              <span className="text-[10px] text-muted-foreground">Deflection </span>
              <span className="font-mono text-xs font-semibold text-foreground">{formatPercent(validation.deflectionRatio)}</span>
            </div>
            {visibleIssues.length > 0 && (
              <CollapsibleTrigger asChild>
                <button type="button" className="group inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                  Details ({validation.issues.length})
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {supportFallback && (
          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            The selected support and release layout is unstable. Results use a stable fallback; add suitable restraints away from internal releases.
          </div>
        )}

        {visibleIssues.length === 0 && !supportFallback && (
          <p className="mt-1 text-[11px] text-muted-foreground">No active warnings for the current configuration.</p>
        )}

        {visibleIssues.length > 0 && (
          <CollapsibleContent className="mt-3 space-y-2 border-t border-border/50 pt-3">
            {visibleIssues.map((issue, index) => {
              const meta = issueConfig[issue.severity];
              const IssueIcon = meta.icon;
              return (
                <div key={`${issue.title}-${index}`} className={`rounded-lg border px-3 py-2 ${meta.className}`}>
                  <div className="flex items-start gap-2">
                    <IssueIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{issue.title}</span>
                        <span className="text-[10px] uppercase tracking-wide">{meta.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        )}
      </section>
    </Collapsible>
  );
}
