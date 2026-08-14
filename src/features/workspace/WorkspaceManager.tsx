// src/features/workspace/WorkspaceManager.tsx
import React, { useState, useEffect } from 'react';
import { workspaceAdmin } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, FolderOpen, MoreVertical, MessageSquare } from 'lucide-react';

export default function WorkspaceManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroupsAndMembers();
  }, []);

  const fetchGroupsAndMembers = async () => {
    const { data: groupsData } = await workspaceAdmin.from('study_groups').select('*').order('created_at', { ascending: false });
    const { data: membersData } = await workspaceAdmin.from('group_members').select('group_id');
    
    if (groupsData) {
      const enrichedGroups = groupsData.map(group => ({
        ...group,
        memberCount: membersData?.filter(m => m.group_id === group.id).length || 0
      }));
      setGroups(enrichedGroups);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    setLoading(true);
    const { error } = await workspaceAdmin.from('study_groups').insert([{ name: newGroupName }]);
    if (!error) {
      setNewGroupName('');
      fetchGroupsAndMembers();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-[#F5F5F5] p-4 md:p-8 font-sans selection:bg-[#FF9D2E]/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#292B2E] pb-6 gap-5">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <div className="p-3 bg-[#141516] border border-[#292B2E] rounded-xl text-[#FF9D2E] shadow-lg shadow-[#FF9D2E]/5">
                <Users size={28} />
              </div>
              Workspace Control
            </h1>
            <p className="text-[#A3A5A8] mt-2 font-medium">Manage your collaborative study groups and environments.</p>
          </div>

          {/* Create Group Form */}
          <form onSubmit={handleCreateGroup} className="flex w-full md:w-auto gap-3">
            <input 
              type="text" placeholder="New Group Name..." 
              value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} 
              className="bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] focus:ring-1 focus:ring-[#FF9D2E]/50 rounded-xl p-3.5 text-[#F5F5F5] placeholder-[#707277] outline-none w-full md:w-64 transition-all shadow-inner" 
            />
            <button 
              type="submit" disabled={loading} 
              className="bg-[#FF9D2E] hover:bg-[#FFAA3D] active:bg-[#F58B1F] text-[#0D0E0F] px-6 rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,157,46,0.2)] hover:shadow-[0_0_25px_rgba(255,170,61,0.4)]"
            >
              <Plus size={20} strokeWidth={3} /> <span className="hidden sm:inline">Create</span>
            </button>
          </form>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div 
              key={group.id} 
              onClick={() => navigate(`/workspace-manager/group/${group.id}`)}
              className="bg-[#18191A] border border-[#292B2E] hover:border-[#FF9D2E] p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(255,157,46,0.08)] flex flex-col justify-between min-h-[210px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-[#1D1E20] border border-[#292B2E] rounded-2xl flex items-center justify-center text-[#FF9D2E] group-hover:bg-[#FF9D2E] group-hover:text-[#0D0E0F] transition-all duration-300">
                  <FolderOpen size={26} />
                </div>
                <button className="text-[#707277] hover:text-[#F5F5F5] p-2 transition-colors"><MoreVertical size={20} /></button>
              </div>
              
              <div className="mt-6">
                <h2 className="text-2xl font-bold text-[#F5F5F5] group-hover:text-[#FF9D2E] transition-colors leading-tight truncate">
                  {group.name}
                </h2>
                
                <div className="flex items-center justify-between mt-5 pt-5 border-t border-[#292B2E]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#A3A5A8]">
                    {/* ETH-like Blue used here for members */}
                    <Users size={16} className="text-[#668CFF]" />
                    <span>{group.memberCount} Members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#19C784] bg-[#19C784]/10 border border-[#19C784]/20 px-3 py-1.5 rounded-lg">
                    {/* Success Green for Active status */}
                    <MessageSquare size={13} /> Active
                  </div>
                </div>
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-[#292B2E] bg-[#141516] rounded-3xl">
              <Users size={56} className="mx-auto text-[#707277] mb-5" />
              <h3 className="text-[#F5F5F5] font-bold text-xl mb-2">No Groups Found</h3>
              <p className="text-[#A3A5A8] font-medium">Create a new study group to get started.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}