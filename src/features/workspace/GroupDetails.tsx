// src/features/workspace/GroupDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, workspaceAdmin } from '../../lib/supabase';
import { ArrowLeft, Send, Link as LinkIcon, Download } from 'lucide-react';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    fetchGroupDetails();
    fetchMainOsCourses();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    const { data } = await workspaceAdmin.from('study_groups').select('*').eq('id', groupId).single();
    if (data) setGroup(data);
  };

  const fetchMainOsCourses = async () => {
    const { data } = await supabase.from('lms_courses').select('id, title');
    if (data) setMyCourses(data);
  };

  const handleImportCourse = async () => {
    if (!selectedCourse) return;
    try {
      const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', selectedCourse).single();
      await workspaceAdmin.from('shared_contents').insert([{
        group_id: groupId,
        title: courseData.title,
        content_type: 'lms_course',
        content_data: courseData
      }]);
      alert('Course successfully imported to this group!');
    } catch (err) {
      alert('Error importing course');
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !invitePassword) return;
    
    try {
      const { data: authData } = await workspaceAdmin.auth.admin.createUser({
        email: inviteEmail,
        password: invitePassword,
        email_confirm: true
      });

      if (authData.user) {
        await workspaceAdmin.from('workspace_profiles').insert([{ id: authData.user.id, email: inviteEmail }]);
        await workspaceAdmin.from('group_members').insert([{ group_id: groupId, user_id: authData.user.id, role: 'member' }]);
        
        // Link Generation for easy sharing
        const loginUrl = `${window.location.origin}/workspace/login`;
        const text = `Join my study group: ${group?.name}\nLink: ${loginUrl}\nEmail: ${inviteEmail}\nPass: ${invitePassword}`;
        setGeneratedLink(text);
        
        setInviteEmail(''); setInvitePassword('');
      }
    } catch (err) {
      alert('Error creating invite.');
    }
  };

  if (!group) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 text-white max-w-6xl mx-auto space-y-8">
      <button onClick={() => navigate('/workspace-manager')} className="flex items-center gap-2 text-gray-400 hover:text-white">
        <ArrowLeft className="w-5 h-5" /> Back to Workspaces
      </button>

      <h1 className="text-3xl font-bold text-blue-500 border-b border-gray-800 pb-4">{group.name} - Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Course Import Section */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Download className="text-green-400" /> Import Courses / Subjects</h2>
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white mb-4">
            <option value="">-- Select Course from Main OS --</option>
            {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button onClick={handleImportCourse} className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold flex justify-center gap-2">
            <Download className="w-5 h-5" /> Import to Group
          </button>
        </div>

        {/* Invite Member Section */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Send className="text-purple-400" /> Invite Friends</h2>
          <form onSubmit={handleGenerateInvite} className="space-y-3">
            <input type="email" placeholder="Friend's Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2" required />
            <input type="text" placeholder="Set Temporary Password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2" required />
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-bold">Generate Access</button>
          </form>

          {generatedLink && (
            <div className="mt-4 p-4 bg-gray-900 border border-purple-500 rounded-lg relative">
              <h3 className="text-sm text-gray-400 mb-2">Copy & send this to your friend:</h3>
              <pre className="text-xs text-green-400 whitespace-pre-wrap">{generatedLink}</pre>
              <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="absolute top-2 right-2 text-gray-400 hover:text-white">
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}