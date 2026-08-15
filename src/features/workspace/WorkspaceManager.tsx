// src/features/workspace/WorkspaceManager.tsx
import React, { useState, useEffect } from 'react';
import { workspaceAdmin, workspaceSupabase } from '../../lib/supabase'; // workspaceSupabase ইমপোর্ট করা হয়েছে
import { useNavigate } from 'react-router-dom';
import { Users, Plus, FolderOpen, MoreVertical, MessageSquare, UserPlus, X } from 'lucide-react'; // UserPlus এবং X আইকন যুক্ত করা হয়েছে

export default function WorkspaceManager() {
  // --- Existing States ---
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- New States for Add Friend ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);

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

  // --- New Logic for Creating Friend Account ---
  const handleCreateFriendAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await workspaceSupabase.auth.signUp({
      email: email,
      password: password,
    });
    
    if (error) {
      alert(error.message);
    } else {
      alert("Friend account created successfully!");
      setShowUserModal(false); // Modal বন্ধ করে দেওয়া হচ্ছে
      setEmail(''); // ফর্ম ক্লিয়ার করা হচ্ছে
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-[#F5F5F5] p-4 md:p-8 font-sans selection:bg-[#FF9D2E]/30 relative">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Area */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-[#292B2E] pb-6 gap-5">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <div className="p-3 bg-[#141516] border border-[#292B2E] rounded-xl text-[#FF9D2E] shadow-lg shadow-[#FF9D2E]/5">
                <Users size={28} />
              </div>
              Workspace Control
            </h1>
            <p className="text-[#A3A5A8] mt-2 font-medium">Manage your collaborative study groups and environments.</p>
          </div>

          {/* Action Buttons & Create Group Form */}
          <div className="flex flex-col md:flex-row w-full lg:w-auto gap-3">
            
            {/* New Add Friend Button */}
            <button 
              onClick={() => setShowUserModal(true)}
              className="bg-[#1D1E20] border border-[#292B2E] hover:border-[#FF9D2E] text-[#F5F5F5] hover:text-[#FF9D2E] px-5 py-3.5 md:py-0 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <UserPlus size={20} /> <span className="hidden sm:inline">Add Friend</span>
            </button>

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
                    <Users size={16} className="text-[#668CFF]" />
                    <span>{group.memberCount} Members</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#19C784] bg-[#19C784]/10 border border-[#19C784]/20 px-3 py-1.5 rounded-lg">
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

      {/* --- ADD FRIEND MODAL --- */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#18191A] border border-[#292B2E] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            
            {/* Close Modal Button */}
            <button 
              onClick={() => setShowUserModal(false)}
              className="absolute top-5 right-5 text-[#707277] hover:text-[#FF5B61] transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-[#F5F5F5] mb-2 flex items-center gap-2">
              <UserPlus size={24} className="text-[#FF9D2E]" />
              Add New User
            </h2>
            <p className="text-[#A3A5A8] text-sm mb-6">Create a new student account to grant them access to workspaces.</p>

            <form onSubmit={handleCreateFriendAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#A3A5A8] mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3.5 text-[#F5F5F5] outline-none transition-colors"
                  placeholder="student@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#A3A5A8] mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3.5 text-[#F5F5F5] outline-none transition-colors"
                  placeholder="Min. 6 characters"
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-[#FF9D2E] text-[#0D0E0F] hover:bg-[#FFAA3D] font-extrabold py-3.5 rounded-xl transition-colors mt-2"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal Animation Style */}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}