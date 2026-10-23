import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Play, ArrowDown, Link2, Check } from "lucide-react";
import { type TrussNode, type TrussMember, type PointLoad, type LoadCategory, DEFAULT_COV_BY_CATEGORY } from "@/lib/trussSolver";
import { type TrussDisplayUnits, type TrussUnitSystem } from "./useTrussAnalysis";

interface TrussConfigPanelProps {
  structureType: 'truss' | 'frame';
  setStructureType: (v: 'truss' | 'frame') => void;
  trussType: 'custom' | 'warren' | 'pratt' | 'howe';
  setTrussType: (v: 'custom' | 'warren' | 'pratt' | 'howe') => void;
  spanLength: number; setSpanLength: (v: number) => void;
  height: number; setHeight: (v: number) => void;
  numPanels: number; setNumPanels: (v: number) => void;
  appliedLoad: number; setAppliedLoad: (v: number) => void;
  generateTruss: (type: string) => void;
  nodes: TrussNode[]; setNodes: (v: TrussNode[]) => void;
  members: TrussMember[]; setMembers: (v: TrussMember[]) => void;
  pointLoads: PointLoad[]; setPointLoads: (v: PointLoad[]) => void;
  selectedNodeId: number | null; setSelectedNodeId: (v: number | null) => void;
  selectedMemberId: number | null; setSelectedMemberId: (v: number | null) => void;
  addNodeAt: (x: number, y: number) => void;
  startMemberConnection: () => void; finishMemberConnection: () => void;
  memberConnectionMode: boolean; connectionStartNodeId: number | null; builderNotice: string | null;
  addPointLoad: () => void;
  deleteNode: (id: number) => void; deleteMember: (id: number) => void; deletePointLoad: (id: number) => void;
  loadColors: string[];
  unitSystem: TrussUnitSystem; setUnitSystem: (v: TrussUnitSystem) => void;
  du: TrussDisplayUnits;
}

type TrussTemplate = TrussConfigPanelProps["trussType"];

export function TrussConfigPanel(p: TrussConfigPanelProps) {
  const du = p.du;
  const [newNodeX, setNewNodeX] = useState(p.spanLength / 2);
  const [newNodeY, setNewNodeY] = useState(p.height / 2);

  useEffect(() => {
    setNewNodeX(p.spanLength / 2);
    setNewNodeY(p.height / 2);
  }, [p.spanLength, p.height]);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          {p.structureType === 'frame' ? 'Frame' : 'Truss'} Configuration
        </h3>
        <Select value={p.unitSystem} onValueChange={(v) => p.setUnitSystem(v as TrussUnitSystem)}>
          <SelectTrigger className="w-[140px] bg-muted/30 border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-background border-border">
            <SelectItem value="metric">Metric (SI)</SelectItem>
            <SelectItem value="imperial">Imperial (US)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Structure Type</label>
            <Select value={p.structureType} onValueChange={(v) => p.setStructureType(v as 'truss' | 'frame')}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="truss">Truss (Pin Joints)</SelectItem>
                <SelectItem value="frame">Frame (Rigid Joints)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {p.structureType === 'frame' ? 'Rigid connections transfer moments between members' : 'Pin joints allow rotation, members carry only axial forces'}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Configuration Template</label>
            <Select value={p.trussType} onValueChange={(v) => p.setTrussType(v as TrussTemplate)}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-background border-border">
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="warren">Warren {p.structureType === 'frame' ? 'Frame' : 'Truss'}</SelectItem>
                <SelectItem value="pratt">Pratt {p.structureType === 'frame' ? 'Frame' : 'Truss'}</SelectItem>
                <SelectItem value="howe">Howe {p.structureType === 'frame' ? 'Frame' : 'Truss'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {p.trussType !== 'custom' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Span ({du.length.unit})</label><Input type="number" min={4 * du.length.factor} max={20 * du.length.factor} step="any" value={(p.spanLength * du.length.factor).toFixed(3)} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) p.setSpanLength(Math.max(4, Math.min(20, value / du.length.factor))); }} className="bg-muted/30" /></div>
                <div><label className="text-xs text-muted-foreground">Height ({du.length.unit})</label><Input type="number" min={1 * du.length.factor} max={6 * du.length.factor} step="any" value={(p.height * du.length.factor).toFixed(3)} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) p.setHeight(Math.max(1, Math.min(6, value / du.length.factor))); }} className="bg-muted/30" /></div>
                <div><label className="text-xs text-muted-foreground">Panels</label><Input type="number" min={2} max={8} step={1} value={p.numPanels} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) p.setNumPanels(Math.max(2, Math.min(8, Math.round(value)))); }} className="bg-muted/30" /></div>
                <div><label className="text-xs text-muted-foreground">Default Load ({du.force.unit})</label><Input type="number" min={0} step="any" value={(p.appliedLoad * du.force.factor).toFixed(2)} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) p.setAppliedLoad(Math.max(0, value / du.force.factor)); }} className="bg-muted/30" /></div>
              </div>
              <Button onClick={() => p.generateTruss(p.trussType)} className="w-full"><Play className="h-4 w-4 mr-2" />Generate {p.structureType === 'frame' ? 'Frame' : 'Truss'}</Button>
            </>
          )}
          <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">Quick Builder</h4>
              <p className="mt-1 text-xs text-muted-foreground">Add nodes by coordinate, then click two nodes in the diagram to connect them. Generated layouts can be edited too.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">New node X ({du.length.unit})</label><Input type="number" step="any" value={(newNodeX * du.length.factor).toFixed(3)} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) setNewNodeX(value / du.length.factor); }} className="bg-muted/30" /></div>
              <div><label className="text-xs text-muted-foreground">New node Y ({du.length.unit})</label><Input type="number" step="any" value={(newNodeY * du.length.factor).toFixed(3)} onChange={(e) => { const value = Number(e.target.value); if (Number.isFinite(value)) setNewNodeY(value / du.length.factor); }} className="bg-muted/30" /></div>
            </div>
            <Button onClick={() => p.addNodeAt(newNodeX, newNodeY)} variant="outline" size="sm" className="w-full"><Plus className="h-4 w-4 mr-1" />Add Node at Coordinates</Button>
            {p.memberConnectionMode ? (
              <Button onClick={p.finishMemberConnection} variant="secondary" size="sm" className="w-full"><Check className="h-4 w-4 mr-1" />Done Connecting</Button>
            ) : (
              <Button onClick={p.startMemberConnection} variant="outline" size="sm" className="w-full"><Link2 className="h-4 w-4 mr-1" />Connect Members</Button>
            )}
            <Button onClick={p.addPointLoad} variant="outline" size="sm" className="w-full"><ArrowDown className="h-4 w-4 mr-1" />Add Load at Selected Node</Button>
            {p.builderNotice && <p className={`text-xs ${p.memberConnectionMode ? 'text-primary' : 'text-muted-foreground'}`} role="status">{p.builderNotice}</p>}
          </div>
        </div>

        {/* Middle Column - Node/Member Properties */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Selected Node Properties</h4>
          {p.selectedNodeId ? (() => {
            const node = p.nodes.find(n => n.id === p.selectedNodeId);
            if (!node) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">X Position ({du.length.unit})</label><Input type="number" value={(node.x * du.length.factor).toFixed(2)} onChange={(e) => p.setNodes(p.nodes.map(n => n.id === p.selectedNodeId ? { ...n, x: (parseFloat(e.target.value) || 0) / du.length.factor } : n))} className="bg-muted/30" /></div>
                  <div><label className="text-xs text-muted-foreground">Y Position ({du.length.unit})</label><Input type="number" value={(node.y * du.length.factor).toFixed(2)} onChange={(e) => p.setNodes(p.nodes.map(n => n.id === p.selectedNodeId ? { ...n, y: (parseFloat(e.target.value) || 0) / du.length.factor } : n))} className="bg-muted/30" /></div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Support Type</label>
                  <Select value={node.supportType} onValueChange={(v) => p.setNodes(p.nodes.map(n => n.id === p.selectedNodeId ? { ...n, supportType: v as TrussNode['supportType'] } : n))}>
                    <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="none">None (Free)</SelectItem>
                      <SelectItem value="pin">Pin Support</SelectItem>
                      <SelectItem value="roller">Roller Support</SelectItem>
                      <SelectItem value="lateral-pin">Lateral Pin (X restrained)</SelectItem>
                      <SelectItem value="fixed">Fixed Support</SelectItem>
                      <SelectItem value="hinge">Hinge</SelectItem>
                    </SelectContent>
                  </Select>
                  {node.supportType === 'lateral-pin' && <p className="mt-1 text-xs text-muted-foreground">Restrains horizontal (X) movement; vertical (Y) movement remains free.</p>}
                </div>
                <Button variant="destructive" size="sm" onClick={() => p.deleteNode(p.selectedNodeId!)}><Trash2 className="h-4 w-4 mr-1" />Delete Node</Button>
              </div>
            );
          })() : <p className="text-sm text-muted-foreground">Click on a node to edit its properties</p>}

          <h4 className="text-sm font-medium text-foreground mt-6">Selected Member Properties</h4>
          {p.selectedMemberId ? (() => {
            const member = p.members.find(m => m.id === p.selectedMemberId);
            if (!member) return null;
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Start Node</label>
                    <Select value={member.startNode.toString()} onValueChange={(v) => p.setMembers(p.members.map(m => m.id === p.selectedMemberId ? { ...m, startNode: parseInt(v) } : m))}>
                      <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border">{p.nodes.map(n => <SelectItem key={n.id} value={n.id.toString()}>Node {n.id} ({(n.x * du.length.factor).toFixed(1)}, {(n.y * du.length.factor).toFixed(1)})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">End Node</label>
                    <Select value={member.endNode.toString()} onValueChange={(v) => p.setMembers(p.members.map(m => m.id === p.selectedMemberId ? { ...m, endNode: parseInt(v) } : m))}>
                      <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border">{p.nodes.map(n => <SelectItem key={n.id} value={n.id.toString()}>Node {n.id} ({(n.x * du.length.factor).toFixed(1)}, {(n.y * du.length.factor).toFixed(1)})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Area ({du.areaSmall.unit})</label><Input type="number" step="0.01" value={(member.area * du.areaSmall.factor).toFixed(4)} onChange={(e) => p.setMembers(p.members.map(m => m.id === p.selectedMemberId ? { ...m, area: (parseFloat(e.target.value) || 0.001) / du.areaSmall.factor } : m))} className="bg-muted/30" /></div>
                  <div><label className="text-xs text-muted-foreground">E ({du.modulus.unit})</label><Input type="number" value={(member.elasticModulus * du.modulus.factor).toFixed(1)} onChange={(e) => p.setMembers(p.members.map(m => m.id === p.selectedMemberId ? { ...m, elasticModulus: (parseFloat(e.target.value) || 200) / du.modulus.factor } : m))} className="bg-muted/30" /></div>
                </div>
                {p.structureType === 'frame' && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={member.isRigid} onChange={(e) => p.setMembers(p.members.map(m => m.id === p.selectedMemberId ? { ...m, isRigid: e.target.checked } : m))} />
                    Rigid Connection (transfers moment)
                  </label>
                )}
                <Button variant="destructive" size="sm" onClick={() => p.deleteMember(p.selectedMemberId!)}><Trash2 className="h-4 w-4 mr-1" />Delete Member</Button>
              </div>
            );
          })() : <p className="text-sm text-muted-foreground">Click on a member to edit its properties</p>}
        </div>

        {/* Right Column - Point Loads */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Point Loads</h4>
            <Button onClick={p.addPointLoad} variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {p.pointLoads.map((load, index) => (
              <div key={load.id} className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: `${p.loadColors[index % p.loadColors.length]}20`, color: p.loadColors[index % p.loadColors.length] }}>Load {load.id}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => p.deletePointLoad(load.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Node</label>
                    <Select value={load.nodeId.toString()} onValueChange={(v) => p.setPointLoads(p.pointLoads.map(l => l.id === load.id ? { ...l, nodeId: parseInt(v) } : l))}>
                      <SelectTrigger className="bg-muted/30 border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border">{p.nodes.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.id}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs text-muted-foreground">Force ({du.force.unit})</label><Input type="number" value={(load.magnitude * du.force.factor).toFixed(2)} onChange={(e) => p.setPointLoads(p.pointLoads.map(l => l.id === load.id ? { ...l, magnitude: (parseFloat(e.target.value) || 0) / du.force.factor } : l))} className="bg-muted/30 h-8 text-xs" /></div>
                  <div><label className="text-xs text-muted-foreground">Angle (°)</label><Input type="number" value={load.angle} onChange={(e) => p.setPointLoads(p.pointLoads.map(l => l.id === load.id ? { ...l, angle: parseFloat(e.target.value) || 0 } : l))} className="bg-muted/30 h-8 text-xs" /></div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type (LRFD)</label>
                    <Select value={load.category} onValueChange={(v) => p.setPointLoads(p.pointLoads.map(l => l.id === load.id ? { ...l, category: v as LoadCategory, magnitudeCoV: DEFAULT_COV_BY_CATEGORY[v as LoadCategory] } : l))}>
                      <SelectTrigger className="bg-muted/30 border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem value="dead">Dead (D)</SelectItem>
                        <SelectItem value="live">Live (L)</SelectItem>
                        <SelectItem value="wind">Wind (W)</SelectItem>
                        <SelectItem value="snow">Snow (S)</SelectItem>
                        <SelectItem value="earthquake">Earthquake (E)</SelectItem>
                        <SelectItem value="rain">Rain (R)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            {p.pointLoads.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No loads defined. Click "Add" to create a point load.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
