import { Slider } from "@/components/ui/slider";
import { FEAResult } from "@/lib/dynamicsFEA";

interface FEATabProps {
  numElements: number;
  setNumElements: (v: number) => void;
  beamLength: number;
  setBeamLength: (v: number) => void;
  EI: number;
  setEI: (v: number) => void;
  forceAmplitude: number;
  feaResult: FEAResult;
}

export function FEATab({
  numElements, setNumElements,
  beamLength, setBeamLength,
  EI, setEI,
  forceAmplitude,
  feaResult,
}: FEATabProps) {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-semibold mb-6 text-foreground">Finite Element Discretization</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Based on CE 340 Section 4: Higher-order moments enhance FE simulations through variance-constrained load inputs and mesh refinement guidance.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="text-xs text-muted-foreground">Number of Elements: {numElements}</label>
            <Slider value={[numElements]} onValueChange={([v]) => setNumElements(v)} min={4} max={20} step={1} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Beam Length: {beamLength} m</label>
            <Slider value={[beamLength]} onValueChange={([v]) => setBeamLength(v)} min={2} max={12} step={0.5} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Flexural Rigidity EI: {(EI / 1e6).toFixed(2)} MN·m²</label>
            <Slider value={[EI]} onValueChange={([v]) => setEI(v)} min={1e5} max={1e7} step={1e5} />
          </div>
        </div>
      </div>

      {/* Mesh Visualization */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Beam Mesh & Deformed Shape</h3>
        <div className="relative h-48 bg-muted/20 rounded-lg overflow-hidden p-4">
          <svg viewBox={`-20 -60 ${beamLength * 60 + 40} 120`} className="w-full h-full">
            <line x1="0" y1="0" x2={beamLength * 60} y2="0" stroke="hsl(215 20% 40%)" strokeWidth="3" strokeDasharray="4 2" />
            {feaResult.nodes.map((node, i) => (
              <g key={i}>
                <circle cx={node.x * 60} cy={-node.displacement * 5000} r="5" fill={node.isFixed || node.isRoller ? "hsl(45 93% 47%)" : "hsl(199 89% 48%)"} stroke="hsl(210 40% 96%)" strokeWidth="1" />
                <text x={node.x * 60} y="25" textAnchor="middle" fontSize="10" fill="hsl(215 20% 65%)">{i}</text>
                {node.isRoller && (
                  <g>
                    <circle cx={node.x * 60} cy="15" r="4" fill="none" stroke="hsl(45 93% 47%)" strokeWidth="2" />
                    <line x1={node.x * 60 - 8} y1="22" x2={node.x * 60 + 8} y2="22" stroke="hsl(45 93% 47%)" strokeWidth="2" />
                  </g>
                )}
              </g>
            ))}
            <path d={`M ${feaResult.nodes.map((n, i) => `${i === 0 ? '' : 'L '}${n.x * 60},${-n.displacement * 5000}`).join(' ')}`} fill="none" stroke="hsl(199 89% 48%)" strokeWidth="3" />
            <g transform={`translate(${beamLength * 30}, -40)`}>
              <line x1="0" y1="-20" x2="0" y2="0" stroke="hsl(0 84% 60%)" strokeWidth="2" />
              <polygon points="-5,-5 5,-5 0,5" fill="hsl(0 84% 60%)" />
              <text x="10" y="-10" fontSize="10" fill="hsl(0 84% 60%)">{(forceAmplitude / 1000).toFixed(1)} kN</text>
            </g>
          </svg>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Dashed line = undeformed. Solid blue = deformed shape (exaggerated). Yellow = supports.
        </p>
      </div>

      {/* Mode Shapes */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Modal Analysis (First 3 Modes)</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {feaResult.modeShapes.map((mode, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-muted/30">
              <div className="text-sm font-semibold text-primary mb-2">Mode {idx + 1}</div>
              <div className="text-lg font-mono text-foreground">{mode.frequency.toFixed(2)} Hz</div>
              <div className="h-16 mt-2">
                <svg viewBox={`0 -1.5 ${mode.shape.length} 3`} className="w-full h-full">
                  <line x1="0" y1="0" x2={mode.shape.length - 1} y2="0" stroke="hsl(215 20% 30%)" strokeWidth="0.05" />
                  <path d={`M ${mode.shape.map((v, i) => `${i},${-v}`).join(' L ')}`} fill="none" stroke={`hsl(${199 + idx * 40} 89% 48%)`} strokeWidth="0.1" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Internal Forces */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Element Internal Forces</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-muted-foreground">Element</th>
                <th className="text-right p-2 text-muted-foreground">Shear (N)</th>
                <th className="text-right p-2 text-muted-foreground">Moment (N·m)</th>
              </tr>
            </thead>
            <tbody>
              {feaResult.internalForces.slice(0, 6).map((forces) => (
                <tr key={forces.element} className="border-b border-border/50">
                  <td className="p-2 font-mono">{forces.element}</td>
                  <td className="p-2 text-right font-mono text-primary">{forces.shear[0].toFixed(1)} / {forces.shear[1].toFixed(1)}</td>
                  <td className="p-2 text-right font-mono text-accent">{forces.moment[0].toFixed(1)} / {forces.moment[1].toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FEA Theory */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">FEA Theory (CE 340)</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-primary mb-2 font-semibold">Euler-Bernoulli Element</div>
            <div className="text-muted-foreground font-mono text-xs">[K]e = (EI/L³) × [12, 6L, -12, 6L; 6L, 4L², -6L, 2L²; ...]</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-primary mb-2 font-semibold">Variance Guidance</div>
            <div className="text-muted-foreground">High load variance → Finer mesh at high-stress regions</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-primary mb-2 font-semibold">Skewness Effect</div>
            <div className="text-muted-foreground">Asymmetric loads → Refine mesh near load concentration</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="text-primary mb-2 font-semibold">Kurtosis Warning</div>
            <div className="text-muted-foreground">High kurtosis → Dense mesh at potential failure zones</div>
          </div>
        </div>
      </div>
    </div>
  );
}
