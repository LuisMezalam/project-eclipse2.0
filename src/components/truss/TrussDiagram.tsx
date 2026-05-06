import { type TrussNode, type TrussMember, type PointLoad, type MemberResult } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "./useTrussAnalysis";

interface TrussDiagramProps {
  nodes: TrussNode[];
  members: TrussMember[];
  memberResults: MemberResult[];
  pointLoads: PointLoad[];
  selectedNodeId: number | null;
  setSelectedNodeId: (v: number | null) => void;
  selectedMemberId: number | null;
  setSelectedMemberId: (v: number | null) => void;
  structureType: 'truss' | 'frame';
  svgWidth: number;
  svgHeight: number;
  toSvgX: (x: number) => number;
  toSvgY: (y: number) => number;
  maxForce: number;
  loadColors: string[];
  du: TrussDisplayUnits;
}

export function TrussDiagram(p: TrussDiagramProps) {
  const du = p.du;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {p.structureType === 'frame' ? 'Frame' : 'Truss'} Diagram
      </h3>
      <div className="bg-muted/20 rounded-lg overflow-hidden">
        <svg width="100%" height={p.svgHeight} viewBox={`0 0 ${p.svgWidth} ${p.svgHeight}`} preserveAspectRatio="xMidYMid meet" className="w-full">
          {/* Members */}
          {p.members.map(member => {
            const n1 = p.nodes.find(n => n.id === member.startNode);
            const n2 = p.nodes.find(n => n.id === member.endNode);
            if (!n1 || !n2) return null;
            const result = p.memberResults.find(r => r.memberId === member.id);
            const forceRatio = result ? Math.abs(result.force) / p.maxForce : 0;
            let strokeColor = 'hsl(var(--muted-foreground))';
            if (result?.type === 'tension') strokeColor = 'hsl(142 76% 36%)';
            if (result?.type === 'compression') strokeColor = 'hsl(0 84% 60%)';
            const isSelected = p.selectedMemberId === member.id;
            return (
              <g key={member.id}>
                <line x1={p.toSvgX(n1.x)} y1={p.toSvgY(n1.y)} x2={p.toSvgX(n2.x)} y2={p.toSvgY(n2.y)} stroke={isSelected ? 'hsl(var(--primary))' : strokeColor} strokeWidth={isSelected ? 4 : 2 + forceRatio * 4} className="transition-all duration-300 cursor-pointer" onClick={() => p.setSelectedMemberId(member.id)} />
                {p.structureType === 'frame' && member.isRigid && (
                  <>
                    <rect x={p.toSvgX(n1.x) - 4} y={p.toSvgY(n1.y) - 4} width={8} height={8} className="fill-foreground" transform={`rotate(45 ${p.toSvgX(n1.x)} ${p.toSvgY(n1.y)})`} />
                    <rect x={p.toSvgX(n2.x) - 4} y={p.toSvgY(n2.y) - 4} width={8} height={8} className="fill-foreground" transform={`rotate(45 ${p.toSvgX(n2.x)} ${p.toSvgY(n2.y)})`} />
                  </>
                )}
                <text x={(p.toSvgX(n1.x) + p.toSvgX(n2.x)) / 2} y={(p.toSvgY(n1.y) + p.toSvgY(n2.y)) / 2 - 5} textAnchor="middle" className="fill-muted-foreground text-[8px]">M{member.id}</text>
              </g>
            );
          })}

          {/* Nodes */}
          {p.nodes.map(node => (
            <g key={node.id}>
              <circle cx={p.toSvgX(node.x)} cy={p.toSvgY(node.y)} r={p.selectedNodeId === node.id ? 10 : 8} className={`cursor-pointer transition-all ${p.selectedNodeId === node.id ? 'fill-primary stroke-primary-foreground' : 'fill-foreground stroke-background'}`} strokeWidth={2} onClick={() => { p.setSelectedNodeId(node.id); p.setSelectedMemberId(null); }} />
              {node.supportType === 'pin' && <polygon points={`${p.toSvgX(node.x)},${p.toSvgY(node.y) + 8} ${p.toSvgX(node.x) - 10},${p.toSvgY(node.y) + 22} ${p.toSvgX(node.x) + 10},${p.toSvgY(node.y) + 22}`} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />}
              {node.supportType === 'roller' && (
                <>
                  <polygon points={`${p.toSvgX(node.x)},${p.toSvgY(node.y) + 8} ${p.toSvgX(node.x) - 10},${p.toSvgY(node.y) + 18} ${p.toSvgX(node.x) + 10},${p.toSvgY(node.y) + 18}`} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
                  <circle cx={p.toSvgX(node.x) - 5} cy={p.toSvgY(node.y) + 22} r={4} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1} />
                  <circle cx={p.toSvgX(node.x) + 5} cy={p.toSvgY(node.y) + 22} r={4} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1} />
                </>
              )}
              {node.supportType === 'fixed' && (
                <>
                  <rect x={p.toSvgX(node.x) - 12} y={p.toSvgY(node.y) + 8} width={24} height={6} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
                  {[-10, -4, 2, 8].map((offset, i) => (
                    <line key={i} x1={p.toSvgX(node.x) + offset} y1={p.toSvgY(node.y) + 14} x2={p.toSvgX(node.x) + offset - 4} y2={p.toSvgY(node.y) + 22} className="stroke-muted-foreground" strokeWidth={1.5} />
                  ))}
                </>
              )}
              {node.supportType === 'hinge' && <circle cx={p.toSvgX(node.x)} cy={p.toSvgY(node.y)} r={12} className="fill-none stroke-muted-foreground" strokeWidth={2} strokeDasharray="4 2" />}
              <text x={p.toSvgX(node.x)} y={p.toSvgY(node.y) - 15} textAnchor="middle" className="fill-foreground text-[10px] font-medium">{node.id}</text>
            </g>
          ))}

          {/* Point Load arrows */}
          {p.pointLoads.map((load, index) => {
            const node = p.nodes.find(n => n.id === load.nodeId);
            if (!node) return null;
            const angleRad = (load.angle * Math.PI) / 180;
            const arrowLength = 40;
            const endX = p.toSvgX(node.x) + arrowLength * Math.sin(angleRad);
            const endY = p.toSvgY(node.y) - arrowLength * Math.cos(angleRad);
            const color = p.loadColors[index % p.loadColors.length];
            return (
              <g key={load.id}>
                <line x1={endX} y1={endY} x2={p.toSvgX(node.x)} y2={p.toSvgY(node.y) - 12} stroke={color} strokeWidth={2.5} />
                <polygon points={`${p.toSvgX(node.x) - 6 * Math.cos(angleRad)},${p.toSvgY(node.y) - 12 - 6 * Math.sin(angleRad)} ${p.toSvgX(node.x)},${p.toSvgY(node.y) - 8} ${p.toSvgX(node.x) + 6 * Math.cos(angleRad)},${p.toSvgY(node.y) - 12 + 6 * Math.sin(angleRad)}`} fill={color} />
                <text x={endX + 5} y={endY - 5} className="text-[9px] font-medium" fill={color}>{(load.magnitude * du.force.factor).toFixed(1)} {du.force.unit}</text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${p.svgWidth - 130}, 20)`}>
            <rect width={120} height={p.structureType === 'frame' ? 80 : 60} className="fill-background/80 stroke-border" rx={4} />
            <line x1={10} y1={18} x2={40} y2={18} stroke="hsl(142 76% 36%)" strokeWidth={3} />
            <text x={48} y={22} className="fill-foreground text-[10px]">Tension</text>
            <line x1={10} y1={38} x2={40} y2={38} stroke="hsl(0 84% 60%)" strokeWidth={3} />
            <text x={48} y={42} className="fill-foreground text-[10px]">Compression</text>
            {p.structureType === 'frame' && (
              <>
                <rect x={10} y={52} width={8} height={8} className="fill-foreground" transform="rotate(45 14 56)" />
                <text x={48} y={62} className="fill-foreground text-[10px]">Rigid Joint</text>
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
