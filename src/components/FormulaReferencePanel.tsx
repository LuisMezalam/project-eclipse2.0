import { AlertTriangle, BookOpen, CheckCircle2, ListChecks, Sigma } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KaTeXFormula } from "@/components/KaTeXFormula";
import { getFormulasForTab, toolDefinitions, type ToolTabId } from "@/lib/formulaLibrary";

interface FormulaReferencePanelProps {
  tabId: ToolTabId;
  className?: string;
}

const importanceLabel = {
  core: "Core",
  advanced: "Advanced",
  specialized: "Specialized",
} as const;

export function FormulaReferencePanel({ tabId, className = "" }: FormulaReferencePanelProps) {
  const tool = toolDefinitions[tabId];
  const formulas = getFormulasForTab(tabId);
  const primaryFormulas = formulas.slice(0, 4);
  const watchpoints = Array.from(new Set(formulas.flatMap((formula) => formula.watchpoints))).slice(0, 4);

  if (!tool || formulas.length === 0) {
    return null;
  }

  return (
    <Card className={`glass-card max-w-6xl mx-auto mb-6 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BookOpen className="h-4 w-4 text-primary" />
              Library-Powered Method Map
            </CardTitle>
            <CardDescription className="mt-1">
              {tool.purpose}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {formulas.slice(0, 5).map((formula) => (
              <Badge key={formula.id} variant="outline" className="text-[10px]">
                {formula.name}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="formulas" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="formulas" className="text-xs">
              <Sigma className="mr-1 h-3 w-3" />
              Formulas
            </TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs">
              <ListChecks className="mr-1 h-3 w-3" />
              Workflow
            </TabsTrigger>
            <TabsTrigger value="checks" className="text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Checks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="formulas" className="mt-0">
            <div className="grid gap-3 md:grid-cols-2">
              {primaryFormulas.map((formula) => (
                <div key={formula.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{formula.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{formula.description}</p>
                    </div>
                    <Badge variant={formula.importance === "core" ? "default" : "secondary"} className="text-[10px]">
                      {importanceLabel[formula.importance]}
                    </Badge>
                  </div>
                  <div className="mb-3 rounded-md bg-muted/50 p-2 overflow-x-auto">
                    {formula.latex ? (
                      <KaTeXFormula latex={formula.latex} className="text-primary" />
                    ) : (
                      <code className="font-mono text-xs text-primary">{formula.formula}</code>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formula.outputs.map((output) => (
                      <Badge key={output} variant="outline" className="text-[10px]">
                        {output}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workflow" className="mt-0">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <h4 className="mb-3 text-sm font-semibold text-foreground">Analysis Flow</h4>
                <div className="grid gap-2">
                  {tool.workflow.map((step, index) => (
                    <div key={step} className="flex items-center gap-2 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <h4 className="mb-3 text-sm font-semibold text-foreground">Decision Outputs</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tool.decisionOutputs.map((output) => (
                    <div key={output} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      <span>{output}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checks" className="mt-0">
            <div className="grid gap-2 md:grid-cols-2">
              {watchpoints.map((watchpoint) => (
                <div key={watchpoint} className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-muted-foreground">{watchpoint}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
