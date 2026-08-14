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
    // Admin ক্লায়েন্ট দিয়ে গ্রুপ এবং তাদের মেম্বার সংখ্যা আনা হচ্ছে
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
    <div className="min-h-screen bg-[#020F33] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Users size={28} /></div>
              My Study Groups
            </h1>
            <p className="text-gray-400 mt-2 font-medium">Manage your collaborative workspaces and push courses.</p>
          </div>

          {/* Create Group Form */}
          <form onSubmit={handleCreateGroup} className="flex w-full md:w-auto gap-2">
            <input 
              type="text" placeholder="New Group Name..." 
              value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} 
              className="bg-white/5 border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3 text-white outline-none w-full md:w-64 transition-all" 
            />
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
              <Plus size={20} /> <span className="hidden sm:inline">Create</span>
            </button>
          </form>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div 
              key={group.id} 
              onClick={() => navigate(`/workspace-manager/group/${group.id}`)}
              className="bg-white/5 border border-white/10 hover:border-blue-500/50 p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between min-h-[200px]"
            >
              <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:text-white group-hover:from-blue-500 group-hover:to-purple-500 transition-all">
                  <FolderOpen size={28} />
                </div>
                <button className="text-gray-500 hover:text-white p-2"><MoreVertical size={20} /></button>
              </div>
              
              <div className="mt-6">
                <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">{group.name}</h2>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                    <Users size={16} className="text-purple-400" />
                    <span>{group.memberCount} Members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-lg">
                    <MessageSquare size={14} /> Active
                  </div>
                </div>
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/10 rounded-3xl">
              <Users size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 font-bold text-lg">No study groups created yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}