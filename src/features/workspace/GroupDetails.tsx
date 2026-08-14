import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, workspaceAdmin } from '../../lib/supabase';
import { ArrowLeft, Send, Link as LinkIcon, Download, BookOpen, Target } from 'lucide-react';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<any>(null);
  
  // Content States
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [myBcsSubjects, setMyBcsSubjects] = useState<any[]>([]);
  const [selectedBcsSubject, setSelectedBcsSubject] = useState('');
  
  // Invite States
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    fetchGroupDetails();
    fetchMainOsData(); // LMS এবং BCS ডাটা একসাথে ফেচ করবে
  }, [groupId]);

  const fetchGroupDetails = async () => {
    const { data } = await workspaceAdmin.from('study_groups').select('*').eq('id', groupId).single();
    if (data) setGroup(data);
  };

  const fetchMainOsData = async () => {
    // 1. Fetch LMS Courses
    const { data: lmsData } = await supabase.from('lms_courses').select('id, title');
    if (lmsData) setMyCourses(lmsData);

    // 2. Fetch BCS Subjects
    const { data: bcsData } = await supabase.from('bcs_subjects').select('id, title');
    if (bcsData) setMyBcsSubjects(bcsData);
  };

  // --- LMS Import Logic ---
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
      alert('LMS Course successfully imported to this group!');
      setSelectedCourse('');
    } catch (err) {
      alert('Error importing course');
    }
  };

  // --- BCS Subject Import Logic ---
  const handleImportBcsSubject = async () => {
    if (!selectedBcsSubject) return;
    try {
      const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', selectedBcsSubject).single();
      
      // Chapter এবং Resource সহ পুরো ডাটাটা নিয়ে আসা
      const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', selectedBcsSubject);
      const chapterIds = chaptersData?.map(c => c.id) || [];
      
      let resourcesData: any[] = [];
      if (chapterIds.length > 0) {
        const { data: rData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chapterIds);
        resourcesData = rData || [];
      }
      
      const fullSyllabus = chaptersData?.map(chap => ({
        ...chap,
        resources: resourcesData?.filter(r => r.chapter_id === chap.id) || []
      }));

      const finalData = { ...subjectData, chapters: fullSyllabus };

      await workspaceAdmin.from('shared_contents').insert([{
        group_id: groupId,
        title: subjectData.title,
        content_type: 'bcs_subject', // টাইপ আলাদা করে দেওয়া হলো
        content_data: finalData
      }]);
      alert('BCS Subject successfully imported!');
      setSelectedBcsSubject('');
    } catch (err) {
      alert('Error importing BCS subject');
    }
  };

  // --- Invite Members Logic ---
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

  if (!group) return <div className="p-8 text-white flex justify-center mt-20">Loading...</div>;

  return (
    <div className="p-8 text-white max-w-6xl mx-auto space-y-8">
      <button onClick={() => navigate('/workspace-manager')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" /> Back to Workspaces
      </button>

      <h1 className="text-3xl font-bold text-[#02C2D5] border-b border-gray-800 pb-4">{group.name} - Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Content Import Section (LMS & BCS) */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white border-b border-gray-700 pb-3">
            <Download className="text-green-400" /> Push Content to Group
          </h2>
          
          {/* LMS Import UI */}
          <div className="mb-6 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
            <label className="flex items-center gap-2 text-sm font-semibold text-purple-400 mb-2">
              <BookOpen size={16} /> Import LMS Course
            </label>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white mb-3 focus:outline-none focus:border-purple-500">
              <option value="">-- Select LMS Course --</option>
              {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button onClick={handleImportCourse} disabled={!selectedCourse} className={`w-full py-2.5 rounded-lg font-bold flex justify-center gap-2 transition-all ${selectedCourse ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
              <Download className="w-5 h-5" /> Push LMS Course
            </button>
          </div>

          {/* BCS Import UI */}
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#02C2D5] mb-2">
              <Target size={16} /> Import BCS Subject
            </label>
            <select value={selectedBcsSubject} onChange={(e) => setSelectedBcsSubject(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white mb-3 focus:outline-none focus:border-[#02C2D5]">
              <option value="">-- Select BCS Subject --</option>
              {myBcsSubjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <button onClick={handleImportBcsSubject} disabled={!selectedBcsSubject} className={`w-full py-2.5 rounded-lg font-bold flex justify-center gap-2 transition-all ${selectedBcsSubject ? 'bg-[#02C2D5] hover:bg-[#0298A6] text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
              <Download className="w-5 h-5" /> Push BCS Subject
            </button>
          </div>
        </div>

        {/* Invite Member Section */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white border-b border-gray-700 pb-3">
            <Send className="text-amber-400" /> Invite Friends
          </h2>
          <form onSubmit={handleGenerateInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Guest Email</label>
              <input type="email" placeholder="friend@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-amber-500 text-white" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Set Temporary Password</label>
              <input type="text" placeholder="e.g. guest1234" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-amber-500 text-white" required />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 py-3 rounded-lg font-bold transition-colors">
              Generate Access Token
            </button>
          </form>

          {generatedLink && (
            <div className="mt-6 p-4 bg-gray-900 border border-amber-500/50 rounded-xl relative group">
              <h3 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wide">Copy & Send This:</h3>
              <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">{generatedLink}</pre>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  alert('Copied to clipboard!');
                }} 
                className="absolute top-3 right-3 text-gray-400 hover:text-white bg-gray-800 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy to clipboard"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}