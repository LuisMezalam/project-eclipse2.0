import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Play, ArrowDown } from "lucide-react";
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
  addNode: () => void; addMember: () => void; addPointLoad: () => void;
  deleteNode: (id: number) => void; deleteMember: (id: number) => void; deletePointLoad: (id: number) => void;
  loadColors: string[];
  unitSystem: TrussUnitSystem; setUnitSystem: (v: TrussUnitSystem) => void;
  du: TrussDisplayUnits;
}

type TrussTemplate = TrussConfigPanelProps["trussType"];

export function TrussConfigPanel(p: TrussConfigPanelProps) {
  const du = p.du;
  const isImp = du.system === "imperial";

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
              <div><label className="text-xs text-muted-foreground">Span Length: {(p.spanLength * du.length.factor).toFixed(1)} {du.length.unit}</label><Slider value={[p.spanLength]} onValueChange={([v]) => p.setSpanLength(v)} min={4} max={20} step={1} /></div>
              <div><label className="text-xs text-muted-foreground">Height: {(p.height * du.length.factor).toFixed(1)} {du.length.unit}</label><Slider value={[p.height]} onValueChange={([v]) => p.setHeight(v)} min={1} max={6} step={0.5} /></div>
              <div><label className="text-xs text-muted-foreground">Number of Panels: {p.numPanels}</label><Slider value={[p.numPanels]} onValueChange={([v]) => p.setNumPanels(v)} min={2} max={8} step={1} /></div>
              <div><label className="text-xs text-muted-foreground">Default Load: {(p.appliedLoad * du.force.factor).toFixed(1)} {du.force.unit}</label><Slider value={[p.appliedLoad]} onValueChange={([v]) => p.setAppliedLoad(v)} min={5000} max={100000} step={5000} /></div>
              <Button onClick={() => p.generateTruss(p.trussType)} className="w-full"><Play className="h-4 w-4 mr-2" />Generate {p.structureType === 'frame' ? 'Frame' : 'Truss'}</Button>
            </>
          )}
          {p.trussType === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={p.addNode} variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Node</Button>
              <Button onClick={p.addMember} variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Member</Button>
              <Button onClick={p.addPointLoad} variant="outline" size="sm"><ArrowDown className="h-4 w-4 mr-1" />Add Load</Button>
            </div>
          )}
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
                      <SelectItem value="fixed">Fixed Support</SelectItem>
                      <SelectItem value="hinge">Hinge</SelectItem>
                    </SelectContent>
                  </Select>
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
