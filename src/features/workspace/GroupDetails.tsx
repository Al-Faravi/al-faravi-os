// src/features/workspace/GroupDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, workspaceAdmin, workspaceSupabase } from '../../lib/supabase';
import { 
  ArrowLeft, Download, RefreshCw, FileText, BookOpen, Plus, 
  X, Trash2, Edit3, Save, Users, UserPlus, Copy, CheckCircle2
} from 'lucide-react';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [adminId, setAdminId] = useState<string>('admin'); 
  const [group, setGroup] = useState<any>(null);
  
  // States
  const [contents, setContents] = useState<any[]>([]);
  const [lmsCourses, setLmsCourses] = useState<any[]>([]);
  const [bcsSubjects, setBcsSubjects] = useState<any[]>([]);
  const [selectedLms, setSelectedLms] = useState('');
  const [selectedBcs, setSelectedBcs] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Note CRUD States
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteTitle, setAdminNoteTitle] = useState('');
  const [adminNoteContent, setAdminNoteContent] = useState('');

  // --- Assigned Friends States ---
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetails();
    fetchMainOsData();
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setAdminId(data.user.id); });
  }, [groupId]);

  const fetchGroupDetails = async () => {
    const { data: gData } = await workspaceAdmin.from('study_groups').select('*').eq('id', groupId).single();
    if (gData) setGroup(gData);
    fetchGroupContents();
    fetchGroupMembers();
  };

  const fetchGroupContents = async () => {
    const { data } = await workspaceAdmin.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const fetchGroupMembers = async () => {
    const { data } = await workspaceAdmin.from('group_members').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setGroupMembers(data);
  };

  const fetchMainOsData = async () => {
    const { data: lms } = await supabase.from('lms_courses').select('id, title');
    if (lms) setLmsCourses(lms);
    const { data: bcs } = await supabase.from('bcs_subjects').select('id, title');
    if (bcs) setBcsSubjects(bcs);
  };

  // --- Assign Friend & Copy Feature ---
  const handleAssignFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName || !fEmail || !fPassword) return;
    setIsAssigning(true);
    try {
      // 1. Create User in Supabase Auth
      const { data: authData, error: authError } = await workspaceSupabase.auth.signUp({
        email: fEmail,
        password: fPassword,
      });

      if (authError && !authError.message.includes('already registered')) {
        throw authError;
      }

      // 2. Insert into group_members
      await workspaceAdmin.from('group_members').insert([{
        group_id: groupId,
        friend_name: fName,
        email: fEmail,
        password_plain: fPassword
      }]);

      setFName(''); setFEmail(''); setFPassword('');
      fetchGroupMembers();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCopyCredentials = (member: any) => {
    const appUrl = window.location.origin + '/workspace/login';
    const textToCopy = `🔐 Al_Faravi-os Premium Access\n\n📌 Link: ${appUrl}\n📧 Email: ${member.email}\n🔑 Password: ${member.password_plain}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveMember = async (id: string) => {
    if (!window.confirm("Remove this friend from the group?")) return;
    await workspaceAdmin.from('group_members').delete().eq('id', id);
    fetchGroupMembers();
  };

  // --- Delete & Sync Operations ---
  const handleDeleteContent = async (id: string, type: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type === 'shared_note' || type === 'personal_note' ? 'Note' : 'Course'} from the group?`)) return;
    await workspaceAdmin.from('shared_contents').delete().eq('id', id);
    if (selectedContent?.id === id) setSelectedContent(null);
    fetchGroupContents();
  };

  const handleSyncContent = async (item: any) => {
    setSyncingId(item.id);
    try {
      let updatedData = {};
      const originalId = item.content_data.id;
      const existingData = item.content_data;

      if (item.content_type === 'lms_course') {
        const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', originalId).single();
        const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', originalId);
        const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', modulesData?.map(m => m.id) || []);

        const existingModules = existingData.modules || [];
        const updatedModules = modulesData?.map(newMod => {
          const oldMod = existingModules.find((m: any) => m.id === newMod.id);
          const newContents = contentsData?.filter(c => c.module_id === newMod.id) || [];
          const mergedContents = newContents.map(newC => {
            const oldC = oldMod?.contents?.find((c: any) => c.id === newC.id);
            return { ...newC, is_completed: oldC ? oldC.is_completed : false };
          });
          const customContents = oldMod?.contents?.filter((oldC: any) => !newContents.some((newC: any) => newC.id === oldC.id)) || [];
          return { ...newMod, contents: [...mergedContents, ...customContents] };
        });
        updatedData = { ...courseData, progress_pct: existingData.progress_pct || 0, modules: updatedModules };
      } 
      else if (item.content_type === 'bcs_subject') {
        const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', originalId).single();
        const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', originalId);
        const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chaptersData?.map(c => c.id) || []);

        const existingChapters = existingData.chapters || [];
        const updatedChapters = chaptersData?.map(newChap => {
          const oldChap = existingChapters.find((c: any) => c.id === newChap.id);
          const newRes = resourcesData?.filter(r => r.chapter_id === newChap.id) || [];
          const mergedRes = newRes.map(nR => {
            const oldR = oldChap?.resources?.find((r: any) => r.id === nR.id);
            return { ...nR, is_completed: oldR ? oldR.is_completed : false };
          });
          const customRes = oldChap?.resources?.filter((oldR: any) => !newRes.some((nR: any) => nR.id === oldR.id)) || [];
          return { ...newChap, resources: [...mergedRes, ...customRes] };
        });
        updatedData = { ...subjectData, progress_pct: existingData.progress_pct || 0, chapters: updatedChapters };
      }
      await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', item.id);
      fetchGroupContents();
    } catch (error) { alert("Sync failed."); }
    setSyncingId(null);
  };

  // --- Note Operations ---
  const handleSaveAdminNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNoteTitle.trim() || !adminNoteContent.trim()) return;
    if (editingNoteId) {
      await workspaceAdmin.from('shared_contents').update({ title: adminNoteTitle, content_data: { text: adminNoteContent, authorName: 'Faravi (Admin)' } }).eq('id', editingNoteId);
    } else {
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: adminNoteTitle, content_type: 'shared_note', content_data: { text: adminNoteContent, authorName: 'Faravi (Admin)' } }]);
    }
    setShowNoteModal(false); fetchGroupContents();
  };

  // --- Import Courses ---
  const handleImportLms = async () => { 
    if (!selectedLms) return;
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', selectedLms).single();
      const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', selectedLms).order('created_at');
      const moduleIds = modulesData?.map(m => m.id) || [];
      const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', moduleIds).order('created_at');
      const fullCourse = { ...courseData, modules: modulesData?.map(mod => ({ ...mod, contents: contentsData?.filter(c => c.module_id === mod.id) || [] })) };
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: courseData.title, content_type: 'lms_course', content_data: fullCourse }]);
      setSelectedLms(''); fetchGroupContents();
    } catch (err) {} setLoading(false);
  };

  const handleImportBcs = async () => {
    if (!selectedBcs) return;
    setLoading(true);
    try {
      const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', selectedBcs).single();
      const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', selectedBcs).order('created_at');
      const chapterIds = chaptersData?.map(c => c.id) || [];
      const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chapterIds).order('created_at');
      const fullSyllabus = { ...subjectData, chapters: chaptersData?.map(chap => ({ ...chap, resources: resourcesData?.filter(r => r.chapter_id === chap.id) || [] })) };
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: subjectData.title, content_type: 'bcs_subject', content_data: fullSyllabus }]);
      setSelectedBcs(''); fetchGroupContents();
    } catch (err) {} setLoading(false);
  };

  const groupCourses = contents.filter(c => c.content_type === 'lms_course' || c.content_type === 'bcs_subject');
  const groupNotes = contents.filter(c => c.content_type === 'shared_note' || c.content_type === 'personal_note');

  if (selectedContent?.content_type === 'lms_course') return <WorkspaceCourseViewer courseData={selectedContent} onBack={() => setSelectedContent(null)} />;
  if (selectedContent?.content_type === 'bcs_subject') return <WorkspaceBcsViewer subjectData={selectedContent} onBack={() => setSelectedContent(null)} />;

  if (!group) return <div className="min-h-screen bg-[#0D0E0F] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-[#F5F5F5] font-sans pb-20 selection:bg-[#FF9D2E]/30 relative">
      
      <div className="sticky top-0 bg-[#0D0E0F]/80 backdrop-blur-xl border-b border-[#292B2E] z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/workspace-manager')} className="p-2.5 bg-[#141516] hover:bg-[#1D1E20] border border-[#292B2E] rounded-xl text-[#A3A5A8] transition-colors"><ArrowLeft size={20} /></button>
          <div><h1 className="text-2xl font-extrabold text-[#F5F5F5]">{group.name}</h1><p className="text-[#A3A5A8] text-sm">Full Admin Control Panel</p></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 mt-4 space-y-8">
        
        {/* --- Top Row: Import & Assign --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Import Courses */}
          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#292B2E] shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-white"><Download className="text-[#19C784]" /> Push Course to Group</h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select value={selectedLms} onChange={(e) => setSelectedLms(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-sm">
                    <option value="">-- Select LMS Course --</option>{lmsCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button onClick={handleImportLms} disabled={loading || !selectedLms} className="bg-[#19C784]/10 text-[#19C784] hover:bg-[#19C784]/20 border border-[#19C784]/20 px-4 rounded-xl font-bold transition-colors disabled:opacity-50"><Plus size={20}/></button>
                </div>
                <div className="flex gap-2">
                  <select value={selectedBcs} onChange={(e) => setSelectedBcs(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-sm">
                    <option value="">-- Select BCS Subject --</option>{bcsSubjects.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button onClick={handleImportBcs} disabled={loading || !selectedBcs} className="bg-[#668CFF]/10 text-[#668CFF] hover:bg-[#668CFF]/20 border border-[#668CFF]/20 px-4 rounded-xl font-bold transition-colors disabled:opacity-50"><Plus size={20}/></button>
                </div>
              </div>
            </div>
          </div>

          {/* Assign Friends */}
          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#292B2E] shadow-sm">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2 text-white"><UserPlus className="text-[#668CFF]" /> Assign Friend</h2>
            <form onSubmit={handleAssignFriend} className="space-y-3">
              <input type="text" placeholder="Friend's Name" value={fName} onChange={(e)=>setFName(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-2.5 text-sm outline-none text-white" required/>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" value={fEmail} onChange={(e)=>setFEmail(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-2.5 text-sm outline-none text-white" required/>
                <input type="text" placeholder="Password" value={fPassword} onChange={(e)=>setFPassword(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-2.5 text-sm outline-none text-white" required/>
              </div>
              <button type="submit" disabled={isAssigning} className="w-full bg-[#668CFF]/10 hover:bg-[#668CFF]/20 text-[#668CFF] border border-[#668CFF]/20 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                {isAssigning ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} Assign to Group
              </button>
            </form>
          </div>

        </div>

        {/* --- Assigned Members List --- */}
        <div className="bg-[#18191A] p-6 rounded-3xl border border-[#292B2E] shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Users className="text-[#FF9D2E]" size={20}/> Group Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupMembers.length === 0 ? (
              <p className="text-[#707277] col-span-full py-4">No friends assigned yet.</p>
            ) : (
              groupMembers.map((member) => (
                <div key={member.id} className="bg-[#141516] border border-[#292B2E] p-4 rounded-2xl flex justify-between items-start group hover:border-[#FF9D2E]/30 transition-colors">
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-sm text-[#F5F5F5] truncate">{member.friend_name || 'Member'}</p>
                    <p className="text-[11px] text-[#A3A5A8] truncate mt-0.5">{member.email}</p>
                    <p className="text-[11px] font-mono text-[#707277] mt-1">Pass: {member.password_plain || '***'}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => handleCopyCredentials(member)}
                      className={`p-1.5 rounded-lg border transition-all ${copiedId === member.id ? 'bg-[#19C784]/20 border-[#19C784]/50 text-[#19C784]' : 'bg-[#292B2E] border-transparent text-[#A3A5A8] hover:text-white'}`}
                      title="Copy Login Link & Details"
                    >
                      {copiedId === member.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={() => handleRemoveMember(member.id)} className="p-1.5 bg-[#292B2E] rounded-lg text-[#707277] hover:text-red-500 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- SPLIT LAYOUT: COURSES & NOTES --- */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          <div className="flex-1 w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><BookOpen className="text-[#19C784]" size={20}/> Courses inside Group</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupCourses.map(item => (
                <div key={item.id} onClick={() => setSelectedContent(item)} className="bg-[#18191A] border border-[#292B2E] hover:border-[#19C784]/60 p-5 rounded-3xl flex flex-col justify-between cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 rounded-xl bg-[#19C784]/10 text-[#19C784]"><BookOpen size={20} /></div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteContent(item.id, item.content_type); }} className="p-2 text-[#707277] hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                    <h3 className="font-bold text-lg leading-snug mb-4 group-hover:text-[#19C784] transition-colors">{item.title}</h3>
                  </div>
                  <div className="pt-3 border-t border-[#292B2E] flex justify-between items-center text-xs">
                    <span className="text-[#A3A5A8] font-medium group-hover:text-white">Click to Enter Lesson →</span>
                    <button onClick={(e) => { e.stopPropagation(); handleSyncContent(item); }} disabled={syncingId === item.id} className="p-1.5 text-[#707277] hover:text-[#FF9D2E] rounded-md"><RefreshCw size={14} className={syncingId === item.id ? 'animate-spin text-[#FF9D2E]' : ''} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[340px] shrink-0 bg-[#18191A] border border-[#292B2E] rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-white"><FileText size={18} className="text-[#FF9D2E]"/> Group Notes</h3>
              <button onClick={() => { setEditingNoteId(null); setAdminNoteTitle(''); setAdminNoteContent(''); setShowNoteModal(true); }} className="p-1.5 bg-[#FF9D2E]/10 text-[#FF9D2E] rounded-lg hover:bg-[#FF9D2E]/20"><Plus size={16} /></button>
            </div>
            <div className="space-y-3">
              {groupNotes.map(note => (
                <div key={note.id} className="p-3.5 bg-[#141516] rounded-xl border border-[#292B2E] hover:border-[#FF9D2E]/50 transition-colors flex justify-between items-center">
                  <div className="flex-1 pr-2">
                    <h4 className="font-bold text-sm text-white line-clamp-1">{note.title}</h4>
                    <p className="text-[11px] text-[#A3A5A8] mt-1 flex items-center gap-1.5"><span className="font-medium">{note.content_data?.authorName || 'User'}</span><span>•</span><span>{new Date(note.created_at).toLocaleDateString()}</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingNoteId(note.id); setAdminNoteTitle(note.title); setAdminNoteContent(note.content_data?.text || ''); setShowNoteModal(true); }} className="p-1.5 text-[#707277] hover:text-[#FF9D2E]"><Edit3 size={15}/></button>
                    <button onClick={() => handleDeleteContent(note.id, note.content_type)} className="p-1.5 text-[#707277] hover:text-red-500"><Trash2 size={15}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Admin Note Modal (Hidden for brevity, same as previous) */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-5"><h3 className="text-xl font-bold flex items-center gap-2 text-white"><FileText size={20} className="text-[#FF9D2E]"/> {editingNoteId ? 'Edit Group Note' : 'New Group Note'}</h3><button onClick={() => setShowNoteModal(false)} className="text-[#707277] hover:text-[#FF5B61]"><X size={20}/></button></div>
            <form onSubmit={handleSaveAdminNote} className="space-y-4">
              <input type="text" placeholder="Note Title..." value={adminNoteTitle} onChange={(e) => setAdminNoteTitle(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 outline-none font-bold text-white" required />
              <textarea placeholder="Write note content..." value={adminNoteContent} onChange={(e) => setAdminNoteContent(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-40 resize-none outline-none text-white" required />
              <div className="flex justify-end gap-3 pt-2"><button type="submit" className="bg-[#FF9D2E] text-black px-6 py-2.5 rounded-xl font-extrabold hover:bg-[#FFAA3D]"><Save size={16} className="inline mr-1" /> {editingNoteId ? 'Update' : 'Publish'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}