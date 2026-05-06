import { Badge } from "@/components/ui/badge";
import { Info, Activity, Wind, Building2, Car, Factory, Waves } from "lucide-react";
import { civilApplications, getApplicationParameters } from "@/lib/dynamicsFEA";
import { DynamicResponse } from "@/lib/reliability";

interface ApplicationsTabProps {
  selectedApplication: string;
  setSelectedApplication: (v: string) => void;
  response: DynamicResponse;
}

function getAppIcon(category: string) {
  switch (category) {
    case 'seismic': return <Activity className="w-4 h-4" />;
    case 'wind': return <Wind className="w-4 h-4" />;
    case 'vibration-serviceability': return <Building2 className="w-4 h-4" />;
    case 'traffic': return <Car className="w-4 h-4" />;
    case 'machine': return <Factory className="w-4 h-4" />;
    default: return <Waves className="w-4 h-4" />;
  }
}

export function ApplicationsTab({ selectedApplication, setSelectedApplication, response }: ApplicationsTabProps) {
  const currentApp = civilApplications.find(a => a.id === selectedApplication);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-2 text-foreground">Civil Engineering Applications</h3>
        <p className="text-sm text-muted-foreground">
          Direct applications of random dynamics and reliability concepts from CE 340 to real-world structural engineering problems.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {civilApplications.map(app => (
          <div
            key={app.id}
            className={`glass-card p-5 cursor-pointer transition-all hover:border-primary/50 ${selectedApplication === app.id ? 'border-primary border-2' : ''}`}
            onClick={() => setSelectedApplication(app.id)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/20">{getAppIcon(app.category)}</div>
              <h4 className="font-semibold text-foreground">{app.name}</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{app.description}</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freq. Range:</span>
                <span className="font-mono text-foreground">{app.typicalFrequencyRange[0]}-{app.typicalFrequencyRange[1]} Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Damping:</span>
                <span className="font-mono text-foreground">{(app.dampingRange[0] * 100).toFixed(0)}-{(app.dampingRange[1] * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentApp && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-primary/20">{getAppIcon(currentApp.category)}</div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{currentApp.name}</h3>
              <Badge variant="outline">{currentApp.category}</Badge>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">Critical Parameters</h4>
                <ul className="space-y-1">
                  {currentApp.criticalParameters.map((param, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />{param}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">Design Criteria</h4>
                <p className="text-sm text-muted-foreground">{currentApp.designCriteria}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">References</h4>
                <ul className="space-y-1">
                  {currentApp.references.map((ref, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{ref}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Application to Current System</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  For the current SDOF system (f<sub>n</sub> = {(response.naturalFrequency / (2 * Math.PI)).toFixed(2)} Hz),
                  this application is {currentApp.typicalFrequencyRange[0] <= response.naturalFrequency / (2 * Math.PI) &&
                    response.naturalFrequency / (2 * Math.PI) <= currentApp.typicalFrequencyRange[1]
                    ? <span className="text-accent font-semibold">within typical range</span>
                    : <span className="text-destructive font-semibold">outside typical range</span>}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Application Comparison Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground">Application</th>
                <th className="text-center p-2 text-muted-foreground">PSD Model</th>
                <th className="text-center p-2 text-muted-foreground">Freq. Range</th>
                <th className="text-center p-2 text-muted-foreground">Damping</th>
                <th className="text-center p-2 text-muted-foreground">Key Code</th>
              </tr>
            </thead>
            <tbody>
              {civilApplications.map(app => (
                <tr key={app.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-2 flex items-center gap-2">{getAppIcon(app.category)}{app.name}</td>
                  <td className="p-2 text-center font-mono text-primary">{getApplicationParameters(app.id).psdType}</td>
                  <td className="p-2 text-center font-mono">{app.typicalFrequencyRange[0]}-{app.typicalFrequencyRange[1]} Hz</td>
                  <td className="p-2 text-center font-mono">{(app.dampingRange[0] * 100).toFixed(0)}-{(app.dampingRange[1] * 100).toFixed(0)}%</td>
                  <td className="p-2 text-center text-xs text-muted-foreground">{app.designCriteria.split(',')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
