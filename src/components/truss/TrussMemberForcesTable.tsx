import { type TrussMember, type MemberResult } from "@/lib/trussSolver";
import { type TrussDisplayUnits } from "./useTrussAnalysis";

interface TrussMemberForcesTableProps {
  members: TrussMember[];
  memberResults: MemberResult[];
  selectedMemberId: number | null;
  setSelectedMemberId: (v: number | null) => void;
  structureType: 'truss' | 'frame';
  du: TrussDisplayUnits;
}

export function TrussMemberForcesTable(p: TrussMemberForcesTableProps) {
  const du = p.du;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Member Forces</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-muted-foreground">Member</th>
              <th className="text-left py-2 px-3 text-muted-foreground">Nodes</th>
              <th className="text-right py-2 px-3 text-muted-foreground">Force ({du.force.unit})</th>
              <th className="text-right py-2 px-3 text-muted-foreground">Stress ({du.stress.unit})</th>
              <th className="text-center py-2 px-3 text-muted-foreground">Type</th>
              {p.structureType === 'frame' && <th className="text-center py-2 px-3 text-muted-foreground">Connection</th>}
            </tr>
          </thead>
          <tbody>
            {p.members.map(member => {
              const result = p.memberResults.find(r => r.memberId === member.id);
              if (!result) return null;
              return (
                <tr key={member.id} className={`border-b border-border/50 hover:bg-muted/20 cursor-pointer ${p.selectedMemberId === member.id ? 'bg-primary/10' : ''}`} onClick={() => p.setSelectedMemberId(member.id)}>
                  <td className="py-2 px-3 font-mono">{member.id}</td>
                  <td className="py-2 px-3">{member.startNode} → {member.endNode}</td>
                  <td className="py-2 px-3 text-right font-mono">{(result.force * du.force.factor).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono">{(result.stress * du.stress.factor).toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${result.type === 'tension' ? 'bg-green-500/20 text-green-400' : result.type === 'compression' ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                      {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                    </span>
                  </td>
                  {p.structureType === 'frame' && (
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${member.isRigid ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {member.isRigid ? 'Rigid' : 'Pin'}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
