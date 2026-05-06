import { Activity, AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BeamValidationSeverity, BeamValidationSummary } from "@/lib/beamValidation";

interface BeamValidationPanelProps {
  validation: BeamValidationSummary;
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

function MetricTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-foreground">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

export function BeamValidationPanel({ validation }: BeamValidationPanelProps) {
  const StatusIcon = statusConfig[validation.status].icon;
  const visibleIssues = [...validation.issues]
    .sort((a, b) => {
      const order: Record<BeamValidationSeverity, number> = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 5);

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Analysis Health Check
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Solver route, model caveats, strength, serviceability, and reliability checks for the active beam state.
          </p>
        </div>
        <Badge variant={statusConfig[validation.status].badge} className="w-fit gap-1.5">
          <StatusIcon className="h-3.5 w-3.5" />
          {validation.statusLabel}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Solver Route" value={validation.solverLabel} detail={validation.solverNote} />
        <MetricTile label="Stress Utilization" value={formatPercent(validation.stressUtilization)} detail="Demand stress / yield strength" />
        <MetricTile label="Deflection Check" value={formatPercent(validation.deflectionRatio)} detail="Max deflection / L/250" />
        <MetricTile label="FORM beta" value={Number.isFinite(validation.reliabilityBeta) ? validation.reliabilityBeta.toFixed(3) : "n/a"} detail={`Pf ${Number.isFinite(validation.probabilityOfFailure) ? validation.probabilityOfFailure.toExponential(2) : "n/a"}`} />
        <MetricTile label="Safety Factor" value={Number.isFinite(validation.safetyFactor) ? validation.safetyFactor.toFixed(2) : "n/a"} detail={`${validation.criticalCount} critical, ${validation.warningCount} warnings`} />
      </div>

      <div className="mt-5 space-y-2">
        {visibleIssues.length === 0 ? (
          <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
            No active warnings for the current configuration.
          </div>
        ) : (
          visibleIssues.map((issue, index) => {
            const meta = issueConfig[issue.severity];
            const IssueIcon = meta.icon;
            return (
              <div key={`${issue.title}-${index}`} className={`rounded-lg border p-3 ${meta.className}`}>
                <div className="flex items-start gap-3">
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
          })
        )}
      </div>
    </div>
  );
}
