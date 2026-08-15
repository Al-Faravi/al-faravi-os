// src/features/workspace/WorkspaceManager.tsx
import React, { useState, useEffect } from 'react';
import { workspaceAdmin, workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, FolderOpen, MessageSquare, UserPlus, X, Activity, 
  Edit3, Trash2, CheckCircle2, Save, AlertTriangle
} from 'lucide-react';

export default function WorkspaceManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fName, setFName] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);

  // --- Group Edit States ---
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // --- Friend List Sidebar & Global CRUD States ---
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [editFName, setEditFName] = useState('');
  const [editFPassword, setEditFPassword] = useState('');

  useEffect(() => {
    fetchGroupsAndMembers();
    fetchFriendsList();
  }, []);

  // ==========================================
  // 1. READ OPERATIONS
  // ==========================================
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

  const fetchFriendsList = async () => {
    const { data } = await workspaceAdmin.from('group_members').select('email, friend_name, password_plain, last_active').order('created_at', { ascending: false });
    if (data) {
      const uniqueFriends = Array.from(new Map(data.filter(item => item.email).map(item => [item.email, item])).values());
      setAllFriends(uniqueFriends);
    }
  };

  // ==========================================
  // 2. CREATE OPERATIONS
  // ==========================================
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);
    const { error } = await workspaceAdmin.from('study_groups').insert([{ name: newGroupName }]);
    if (!error) {
      setNewGroupName('');
      fetchGroupsAndMembers();
    }
    setLoading(false);
  };

  const handleCreateFriendAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await workspaceSupabase.auth.signUp({ email, password });
    
    if (error && !error.message.includes('already registered')) {
      alert(error.message);
    } else {
      await workspaceAdmin.from('group_members').insert([{
        friend_name: fName, email: email.toLowerCase().trim(), password_plain: password
      }]);
      alert("Friend account created! You can now assign them to a group.");
      setShowUserModal(false);
      setEmail(''); setPassword(''); setFName('');
      fetchFriendsList();
    }
  };

  // ==========================================
  // 3. UPDATE OPERATIONS (Groups & Users)
  // ==========================================
  const handleUpdateGroup = async (id: string) => {
    if (!editingGroupName.trim()) return;
    await workspaceAdmin.from('study_groups').update({ name: editingGroupName }).eq('id', id);
    setEditingGroupId(null);
    fetchGroupsAndMembers();
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend) return;
    
    await workspaceAdmin.from('group_members').update({ 
      friend_name: editFName, 
      password_plain: editFPassword 
    }).eq('email', selectedFriend.email);
    
    setSelectedFriend(null);
    fetchFriendsList();
  };

  // ==========================================
  // 4. DELETE OPERATIONS (Groups & Users)
  // ==========================================
  const handleDeleteGroup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this group and all its contents?")) return;
    
    await workspaceAdmin.from('study_groups').delete().eq('id', id);
    fetchGroupsAndMembers();
  };

  const handleGlobalDeleteUser = async () => {
    if (!selectedFriend) return;
    if (!window.confirm(`⚠️ WARNING: This will permanently delete ${selectedFriend.friend_name} from all groups. Proceed?`)) return;
    
    await workspaceAdmin.from('group_members').delete().eq('email', selectedFriend.email);
    setSelectedFriend(null);
    fetchFriendsList();
    fetchGroupsAndMembers();
  };

  // --- Utilities ---
  const isFriendActive = (timestamp: string | null) => {
    if (!timestamp) return false;
    return (new Date().getTime() - new Date(timestamp).getTime()) < 300000;
  };

  const formatLastActive = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const mins = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-[#F5F5F5] font-sans selection:bg-[#FF9D2E]/30 flex relative">
      
      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 lg:pr-[340px] transition-all">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-[#292B2E] pb-6 gap-5">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center gap-3">
                <div className="p-3 bg-[#141516] border border-[#292B2E] rounded-xl text-[#FF9D2E] shadow-lg shadow-[#FF9D2E]/5">
                  <Users size={28} />
                </div>
                Workspace Control
              </h1>
              <p className="text-[#A3A5A8] mt-2 font-medium">100% Admin Control: Manage groups, content, and users.</p>
            </div>

            <div className="flex flex-col md:flex-row w-full lg:w-auto gap-3">
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
                  className="bg-[#FF9D2E] hover:bg-[#FFAA3D] text-[#0D0E0F] px-6 rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,157,46,0.2)] hover:shadow-[0_0_25px_rgba(255,170,61,0.4)] disabled:opacity-50"
                >
                  <Plus size={20} strokeWidth={3} /> <span className="hidden sm:inline">Create</span>
                </button>
              </form>
            </div>
          </div>

          {/* GROUP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div 
                key={group.id} 
                onClick={() => { if (editingGroupId !== group.id) navigate(`/workspace-manager/group/${group.id}`) }}
                className="bg-[#18191A] border border-[#292B2E] hover:border-[#FF9D2E] p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(255,157,46,0.08)] flex flex-col justify-between min-h-[210px] relative overflow-hidden"
              >
                {/* Group Action Buttons */}
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 bg-[#1D1E20] border border-[#292B2E] rounded-2xl flex items-center justify-center text-[#FF9D2E] group-hover:bg-[#FF9D2E] group-hover:text-[#0D0E0F] transition-all duration-300">
                    <FolderOpen size={26} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); setEditingGroupName(group.name); }} 
                      className="p-2 text-[#A3A5A8] hover:text-[#FF9D2E] bg-[#1D1E20] rounded-lg transition-colors"
                      title="Rename Group"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteGroup(group.id, e)} 
                      className="p-2 text-[#A3A5A8] hover:text-[#FF5B61] bg-[#1D1E20] rounded-lg transition-colors"
                      title="Delete Group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Group Name Editing */}
                <div className="mt-6">
                  {editingGroupId === group.id ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <input 
                        type="text" value={editingGroupName} onChange={e => setEditingGroupName(e.target.value)}
                        className="w-full bg-[#141516] border border-[#FF9D2E] rounded-xl p-2 outline-none font-bold text-[#F5F5F5]"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateGroup(group.id)} className="bg-[#19C784] text-white p-2 rounded-xl hover:bg-emerald-600"><CheckCircle2 size={18} /></button>
                      <button onClick={() => setEditingGroupId(null)} className="bg-[#292B2E] text-white p-2 rounded-xl hover:bg-gray-600"><X size={18} /></button>
                    </div>
                  ) : (
                    <h2 className="text-2xl font-bold text-[#F5F5F5] group-hover:text-[#FF9D2E] transition-colors leading-tight truncate">
                      {group.name}
                    </h2>
                  )}

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
      </div>

      {/* --- Global Friend List Side Panel --- */}
      <aside className="fixed top-0 right-0 w-[320px] h-full bg-[#141516] border-l border-[#292B2E] p-6 shadow-2xl hidden lg:flex flex-col z-40">
        <div className="flex justify-between items-center border-b border-[#292B2E] pb-4 mb-4">
          <h2 className="text-lg font-black text-[#F5F5F5] flex items-center gap-2">
            <Activity size={20} className="text-[#FF9D2E]" /> Global Users
          </h2>
          <span className="text-xs bg-[#292B2E] px-2 py-1 rounded-md text-[#A3A5A8]">{allFriends.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 hide-scrollbar pr-1">
          {allFriends.length === 0 ? (
            <p className="text-sm text-[#707277] text-center mt-10">No users found.</p>
          ) : (
            allFriends.map((f, idx) => {
              const active = isFriendActive(f.last_active);
              return (
                <div 
                  key={idx} 
                  onClick={() => { setSelectedFriend(f); setEditFName(f.friend_name); setEditFPassword(f.password_plain); }}
                  className="flex items-center justify-between p-3.5 bg-[#18191A] border border-[#292B2E] rounded-2xl hover:border-[#FF9D2E]/50 cursor-pointer transition-colors group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#FF9D2E] truncate">{f.friend_name || 'Member'}</p>
                    <p className="text-[11px] text-[#A3A5A8] truncate mt-0.5">{f.email}</p>
                  </div>
                  
                  <div className="flex flex-col items-end shrink-0 ml-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#707277]">{active ? 'Online' : 'Offline'}</span>
                      <div className={`w-3 h-3 rounded-full ${active ? 'bg-[#19C784] shadow-[0_0_8px_#19C784]' : 'bg-[#292B2E]'}`} />
                    </div>
                    <span className="text-[9px] font-medium text-[#A3A5A8]">{active ? 'Active now' : formatLastActive(f.last_active)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* --- GLOBAL USER EDIT/DELETE MODAL --- */}
      {selectedFriend && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#18191A] border border-[#FF9D2E]/30 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button onClick={() => setSelectedFriend(null)} className="absolute top-5 right-5 text-[#707277] hover:text-[#FF5B61]">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
              <Edit3 size={20} className="text-[#FF9D2E]" /> Edit User Profile
            </h2>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="text-xs text-[#A3A5A8] font-bold">Email (Read Only)</label>
                <input type="text" value={selectedFriend.email} disabled className="w-full bg-[#141516] border border-[#292B2E] rounded-xl p-3 text-[#707277] outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-[#A3A5A8] font-bold">Full Name</label>
                <input type="text" value={editFName} onChange={(e) => setEditFName(e.target.value)} required className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 text-white outline-none mt-1" />
              </div>
              <div>
                <label className="text-xs text-[#A3A5A8] font-bold">Workspace Password</label>
                <input type="text" value={editFPassword} onChange={(e) => setEditFPassword(e.target.value)} required className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 text-white outline-none mt-1" />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleGlobalDeleteUser} className="flex items-center justify-center gap-2 p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors" title="Delete Permanently">
                  <Trash2 size={20} />
                </button>
                <button type="submit" className="flex-1 bg-[#FF9D2E] text-black hover:bg-[#FFAA3D] font-extrabold p-3 rounded-xl transition-colors flex justify-center items-center gap-2">
                  <Save size={18} /> Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD NEW FRIEND MODAL --- */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#18191A] border border-[#292B2E] rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setShowUserModal(false)} className="absolute top-5 right-5 text-[#707277] hover:text-[#FF5B61]">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-[#F5F5F5] mb-2 flex items-center gap-2"><UserPlus size={24} className="text-[#FF9D2E]" /> Add New User</h2>
            <p className="text-[#A3A5A8] text-sm mb-6">Create a new student account to grant them access to workspaces.</p>

            <form onSubmit={handleCreateFriendAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#A3A5A8] mb-1">Full Name</label>
                <input type="text" required value={fName} onChange={(e) => setFName(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3.5 text-[#F5F5F5] outline-none transition-colors" placeholder="Student Name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#A3A5A8] mb-1">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3.5 text-[#F5F5F5] outline-none transition-colors" placeholder="student@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#A3A5A8] mb-1">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3.5 text-[#F5F5F5] outline-none transition-colors" placeholder="Min. 6 characters" />
              </div>
              <button type="submit" className="w-full bg-[#FF9D2E] text-[#0D0E0F] hover:bg-[#FFAA3D] font-extrabold py-3.5 rounded-xl transition-colors mt-2">
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}