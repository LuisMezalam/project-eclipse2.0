import { type TrussNode, type TrussMember, type PointLoad, type MemberResult } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "./useTrussAnalysis";

interface TrussDiagramProps {
  nodes: TrussNode[];
  members: TrussMember[];
  memberResults: MemberResult[];
  pointLoads: PointLoad[];
  selectedNodeId: number | null;
  selectedMemberId: number | null;
  setSelectedMemberId: (v: number | null) => void;
  memberConnectionMode: boolean;
  connectionStartNodeId: number | null;
  onNodeClick: (id: number) => void;
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
  const loadColorByCategory: Record<PointLoad["category"], string> = {
    dead: "hsl(215 15% 58%)",
    live: "hsl(199 89% 48%)",
    wind: "hsl(262 83% 58%)",
    snow: "hsl(173 80% 40%)",
    earthquake: "hsl(0 84% 60%)",
    rain: "hsl(45 93% 47%)",
  };
  const aggregatedLoads = new Map<string, { nodeId: number; category: PointLoad["category"]; horizontal: number; downward: number }>();
  for (const load of p.pointLoads) {
    const key = `${load.nodeId}:${load.category}`;
    const current = aggregatedLoads.get(key) ?? { nodeId: load.nodeId, category: load.category, horizontal: 0, downward: 0 };
    const angle = load.angle * Math.PI / 180;
    current.horizontal += load.magnitude * Math.sin(angle);
    current.downward += load.magnitude * Math.cos(angle);
    aggregatedLoads.set(key, current);
  }
  const diagramLoads = [...aggregatedLoads.values()].map((load) => ({
    ...load,
    magnitude: Math.hypot(load.horizontal, load.downward),
    angle: Math.atan2(load.horizontal, load.downward) * 180 / Math.PI,
  })).filter((load) => load.magnitude > 1e-8);
  const maxLoadMagnitude = Math.max(...diagramLoads.map((load) => load.magnitude), 1);

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
                <line x1={p.toSvgX(n1.x)} y1={p.toSvgY(n1.y)} x2={p.toSvgX(n2.x)} y2={p.toSvgY(n2.y)} stroke={isSelected ? 'hsl(var(--primary))' : strokeColor} strokeWidth={isSelected ? 4 : 2 + forceRatio * 4} className={`transition-all duration-300 ${p.memberConnectionMode ? 'cursor-crosshair' : 'cursor-pointer'}`} onClick={() => { if (!p.memberConnectionMode) p.setSelectedMemberId(member.id); }} />
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
              {p.connectionStartNodeId === node.id && p.memberConnectionMode && <circle cx={p.toSvgX(node.x)} cy={p.toSvgY(node.y)} r={14} className="fill-none stroke-primary" strokeWidth={2} strokeDasharray="3 2" />}
              <circle cx={p.toSvgX(node.x)} cy={p.toSvgY(node.y)} r={p.selectedNodeId === node.id ? 10 : 8} className={`${p.memberConnectionMode ? 'cursor-crosshair' : 'cursor-pointer'} transition-all ${p.selectedNodeId === node.id || (p.memberConnectionMode && p.connectionStartNodeId === node.id) ? 'fill-primary stroke-primary-foreground' : 'fill-foreground stroke-background'}`} strokeWidth={2} onClick={() => p.onNodeClick(node.id)} />
              {node.supportType === 'pin' && <polygon points={`${p.toSvgX(node.x)},${p.toSvgY(node.y) + 8} ${p.toSvgX(node.x) - 10},${p.toSvgY(node.y) + 22} ${p.toSvgX(node.x) + 10},${p.toSvgY(node.y) + 22}`} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />}
              {node.supportType === 'roller' && (
                <>
                  <polygon points={`${p.toSvgX(node.x)},${p.toSvgY(node.y) + 8} ${p.toSvgX(node.x) - 10},${p.toSvgY(node.y) + 18} ${p.toSvgX(node.x) + 10},${p.toSvgY(node.y) + 18}`} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
                  <circle cx={p.toSvgX(node.x) - 5} cy={p.toSvgY(node.y) + 22} r={4} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1} />
                  <circle cx={p.toSvgX(node.x) + 5} cy={p.toSvgY(node.y) + 22} r={4} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1} />
                </>
              )}
              {node.supportType === 'lateral-pin' && (
                <g>
                  <title>Lateral pin: horizontal displacement restrained</title>
                  <polygon points={`${p.toSvgX(node.x) - 8},${p.toSvgY(node.y)} ${p.toSvgX(node.x) - 22},${p.toSvgY(node.y) - 10} ${p.toSvgX(node.x) - 22},${p.toSvgY(node.y) + 10}`} className="fill-muted-foreground/60 stroke-muted-foreground" strokeWidth={1.5} />
                  <line x1={p.toSvgX(node.x) - 24} y1={p.toSvgY(node.y) - 14} x2={p.toSvgX(node.x) - 24} y2={p.toSvgY(node.y) + 14} className="stroke-muted-foreground" strokeWidth={2} />
                  {[-10, -3, 4, 11].map(offset => <line key={offset} x1={p.toSvgX(node.x) - 24} y1={p.toSvgY(node.y) + offset} x2={p.toSvgX(node.x) - 29} y2={p.toSvgY(node.y) + offset - 5} className="stroke-muted-foreground" strokeWidth={1} />)}
                </g>
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
          {diagramLoads.map((load) => {
            const node = p.nodes.find(n => n.id === load.nodeId);
            if (!node) return null;
            const angleRad = (load.angle * Math.PI) / 180;
            const arrowLength = 24 + 26 * Math.sqrt(load.magnitude / maxLoadMagnitude);
            const endX = p.toSvgX(node.x) + arrowLength * Math.sin(angleRad);
            const endY = p.toSvgY(node.y) - arrowLength * Math.cos(angleRad);
            const color = loadColorByCategory[load.category];
            const sameNodeLoads = diagramLoads.filter((candidate) => candidate.nodeId === load.nodeId);
            const localIndex = sameNodeLoads.findIndex((candidate) => candidate.category === load.category);
            const headX = p.toSvgX(node.x) + (localIndex - (sameNodeLoads.length - 1) / 2) * 8;
            const headY = p.toSvgY(node.y) - 12;
            const lineLength = Math.hypot(headX - endX, headY - endY) || 1;
            const dirX = (headX - endX) / lineLength;
            const dirY = (headY - endY) / lineLength;
            const baseX = headX - 8 * dirX;
            const baseY = headY - 8 * dirY;
            const sideX = -dirY * 4;
            const sideY = dirX * 4;
            const categoryLabel = load.category === "live" ? "L" : load.category.toUpperCase().slice(0, 1);
            return (
              <g key={`${load.nodeId}-${load.category}`}>
                <title>{`${load.category} load at Node ${load.nodeId}: ${(load.magnitude * du.force.factor).toFixed(2)} ${du.force.unit}`}</title>
                <line x1={endX} y1={endY} x2={headX} y2={headY} stroke={color} strokeWidth={load.category === "live" ? 3 : 2.5} strokeDasharray={load.category === "live" ? "6 2" : undefined} />
                <polygon points={`${headX},${headY} ${baseX + sideX},${baseY + sideY} ${baseX - sideX},${baseY - sideY}`} fill={color} />
                <text x={endX + 5} y={endY - 5} className="text-[9px] font-semibold" fill={color} stroke="hsl(var(--background))" strokeWidth="2" paintOrder="stroke">
                  {categoryLabel} {(load.magnitude * du.force.factor).toFixed(1)} {du.force.unit}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${p.svgWidth - 130}, 20)`}>
            <rect width={120} height={p.structureType === 'frame' ? 100 : 80} className="fill-background/90 stroke-border" rx={4} />
            <line x1={10} y1={18} x2={40} y2={18} stroke="hsl(142 76% 36%)" strokeWidth={3} />
            <text x={48} y={22} className="fill-foreground text-[10px]">Tension</text>
            <line x1={10} y1={38} x2={40} y2={38} stroke="hsl(0 84% 60%)" strokeWidth={3} />
            <text x={48} y={42} className="fill-foreground text-[10px]">Compression</text>
            {p.pointLoads.some((load) => load.category === "live") && (
              <>
                <line x1={10} y1={58} x2={40} y2={58} stroke={loadColorByCategory.live} strokeWidth={3} strokeDasharray="6 2" />
                <text x={48} y={62} className="fill-foreground text-[10px]">Live load (L)</text>
              </>
            )}
            {p.structureType === 'frame' && (
              <>
                <rect x={10} y={72} width={8} height={8} className="fill-foreground" transform="rotate(45 14 76)" />
                <text x={48} y={82} className="fill-foreground text-[10px]">Rigid Joint</text>
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
