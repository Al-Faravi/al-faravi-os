import React, { useState, useEffect } from 'react';
import { supabase, workspaceAdmin } from '../../lib/supabase'; // workspaceAdmin ইমপোর্ট করা হলো
import { Users, Send, Plus, RefreshCw, UserPlus } from 'lucide-react';

export default function WorkspaceManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteGroup, setInviteGroup] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
    fetchMyCourses();
  }, []);

  const fetchGroups = async () => {
    // Admin ক্লায়েন্ট দিয়ে ডাটা আনা হচ্ছে (RLS বাইপাস হবে)
    const { data } = await workspaceAdmin.from('study_groups').select('*');
    if (data) setGroups(data);
  };

  const fetchMyCourses = async () => {
    const { data } = await supabase.from('lms_courses').select('*');
    if (data) setMyCourses(data);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    setLoading(true);
    // Admin ক্লায়েন্ট দিয়ে গ্রুপ তৈরি
    const { error } = await workspaceAdmin.from('study_groups').insert([{ name: newGroupName }]);
    if (!error) {
      setNewGroupName('');
      fetchGroups();
      alert('✅ Study Group Created!');
    } else {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const handlePushCourse = async () => {
    if (!selectedCourse || !selectedGroup) return;
    setLoading(true);
    try {
      const { data: courseData, error: fetchError } = await supabase
        .from('lms_courses').select('*').eq('id', selectedCourse).single();
      if (fetchError) throw fetchError;

      // Admin ক্লায়েন্ট দিয়ে ডাটা পুশ
      const { error: pushError } = await workspaceAdmin
        .from('shared_contents').insert([{
          group_id: selectedGroup,
          title: courseData.title || 'Untitled',
          content_type: 'lms_course',
          content_data: courseData
        }]);
      if (pushError) throw pushError;
      alert('🚀 Course Pushed Successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  const handleInviteFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !invitePassword || !inviteGroup) return;
    setLoading(true);

    try {
      // 🌟 Admin API দিয়ে ইউজার তৈরি (যাতে আপনি নিজে লগআউট না হয়ে যান)
      const { data: authData, error: authError } = await workspaceAdmin.auth.admin.createUser({
        email: inviteEmail,
        password: invitePassword,
        email_confirm: true // অটোমেটিক ভেরিফাই করে দেবে
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (userId) {
        // প্রোফাইল এবং মেম্বার লিস্ট আপডেট
        await workspaceAdmin.from('workspace_profiles').insert([
          { id: userId, email: inviteEmail, full_name: inviteName }
        ]);

        await workspaceAdmin.from('group_members').insert([
          { group_id: inviteGroup, user_id: userId, role: 'member' }
        ]);
        
        alert(`🎉 ${inviteName} has been invited successfully!`);
        setInviteName(''); setInviteEmail(''); setInvitePassword('');
      }
    } catch (error: any) {
      alert('Error inviting friend: ' + error.message);
    }
    setLoading(false);
  };

  return (
    // ... (আপনার আগের return-এর ভেতরের UI কোড হুবহু একই থাকবে)
    <div className="p-8 text-white max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-gray-700 pb-4">
        <Users className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Workspace Manager</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* অংশ ১: Create Group */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" /> New Group
          </h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <input type="text" placeholder="Group Name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white" />
            <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 w-full py-2 rounded-lg font-semibold">Create</button>
          </form>
        </div>

        {/* অংশ ২: Invite Friend */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" /> Invite Friend
          </h2>
          <form onSubmit={handleInviteFriend} className="space-y-3">
            <input type="text" placeholder="Friend's Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white" required />
            <input type="email" placeholder="Email Address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white" required />
            <input type="text" placeholder="Set a Password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white" required />
            <select value={inviteGroup} onChange={(e) => setInviteGroup(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white" required>
              <option value="">-- Assign Group --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 w-full py-2 rounded-lg font-semibold">Invite to Workspace</button>
          </form>
        </div>

        {/* অংশ ৩: Push Course */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" /> Push Data
          </h2>
          <div className="space-y-3">
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white">
              <option value="">-- Select Course --</option>
              {myCourses.map(c => <option key={c.id} value={c.id}>{c.title || 'Untitled'}</option>)}
            </select>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white">
              <option value="">-- Target Group --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={handlePushCourse} disabled={loading} className="bg-blue-600 hover:bg-blue-700 w-full py-2 rounded-lg font-semibold flex justify-center items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Push
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}