/**
 * FORMEquations — reference formulas card.
 */

export function FORMEquations() {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">FORM Equations</h3>
      <div className="grid md:grid-cols-2 gap-4 font-mono text-sm">
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-primary mb-2">Limit State Function</div>
          <div className="text-muted-foreground">g(X) = R - S</div>
          <div className="text-xs mt-2 text-muted-foreground">Failure when g(X) &lt; 0</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-primary mb-2">Reliability Index</div>
          <div className="text-muted-foreground">β = (μ<sub>R</sub> - μ<sub>S</sub>) / √(σ<sub>R</sub>² + σ<sub>S</sub>²)</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-primary mb-2">Probability of Failure</div>
          <div className="text-muted-foreground">P<sub>f</sub> = Φ(-β)</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-primary mb-2">Central Safety Factor</div>
          <div className="text-muted-foreground">FS = μ<sub>R</sub> / μ<sub>S</sub></div>
        </div>
      </div>
    </div>
  );
}
