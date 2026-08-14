// src/features/workspace/GroupDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, workspaceAdmin } from '../../lib/supabase';
import { 
  ArrowLeft, Download, RefreshCw, FileText, BookOpen, Plus, 
  X, Trash2, Edit3, Save 
} from 'lucide-react';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [adminId, setAdminId] = useState<string>('admin'); 
  const [group, setGroup] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [contents, setContents] = useState<any[]>([]);
  
  // Viewer Navigation State for Admin
  const [selectedContent, setSelectedContent] = useState<any>(null);

  const [lmsCourses, setLmsCourses] = useState<any[]>([]);
  const [bcsSubjects, setBcsSubjects] = useState<any[]>([]);
  
  const [selectedLms, setSelectedLms] = useState('');
  const [selectedBcs, setSelectedBcs] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Note CRUD States for Admin
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteTitle, setAdminNoteTitle] = useState('');
  const [adminNoteContent, setAdminNoteContent] = useState('');

  useEffect(() => {
    fetchGroupDetails();
    fetchMainOsData();
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setAdminId(data.user.id); });
  }, [groupId]);

  const fetchGroupDetails = async () => {
    const { data: gData } = await workspaceAdmin.from('study_groups').select('*').eq('id', groupId).single();
    if (gData) setGroup(gData);
    const { data: mData } = await workspaceAdmin.from('group_members').select('id').eq('group_id', groupId);
    if (mData) setMemberCount(mData.length);
    fetchGroupContents();
  };

  const fetchGroupContents = async () => {
    const { data } = await workspaceAdmin.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const fetchMainOsData = async () => {
    const { data: lms } = await supabase.from('lms_courses').select('id, title');
    if (lms) setLmsCourses(lms);
    const { data: bcs } = await supabase.from('bcs_subjects').select('id, title');
    if (bcs) setBcsSubjects(bcs);
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
      if (item.content_type === 'lms_course') {
        const originalId = item.content_data.id;
        const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', originalId).single();
        const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', originalId);
        const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', modulesData?.map(m => m.id) || []);
        updatedData = { ...courseData, modules: modulesData?.map(mod => ({ ...mod, contents: contentsData?.filter(c => c.module_id === mod.id) || [] })) };
      } else if (item.content_type === 'bcs_subject') {
        const originalId = item.content_data.id;
        const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', originalId).single();
        const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', originalId);
        const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chaptersData?.map(c => c.id) || []);
        updatedData = { ...subjectData, chapters: chaptersData?.map(chap => ({ ...chap, resources: resourcesData?.filter(r => r.chapter_id === chap.id) || [] })) };
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
      await workspaceAdmin.from('shared_contents').update({
        title: adminNoteTitle, content_data: { text: adminNoteContent, authorName: 'Faravi (Admin)' }
      }).eq('id', editingNoteId);
    } else {
      await workspaceAdmin.from('shared_contents').insert([{
        group_id: groupId, title: adminNoteTitle, content_type: 'shared_note', content_data: { text: adminNoteContent, authorName: 'Faravi (Admin)' }
      }]);
    }
    setShowNoteModal(false);
    fetchGroupContents();
  };

  const openEditNote = (note: any) => {
    setEditingNoteId(note.id);
    setAdminNoteTitle(note.title);
    setAdminNoteContent(note.content_data?.text || '');
    setShowNoteModal(true);
  };

  const openNewNote = () => {
    setEditingNoteId(null); setAdminNoteTitle(''); setAdminNoteContent(''); setShowNoteModal(true);
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

  // Filter Courses vs Notes
  const groupCourses = contents.filter(c => c.content_type === 'lms_course' || c.content_type === 'bcs_subject');
  const groupNotes = contents.filter(c => c.content_type === 'shared_note' || c.content_type === 'personal_note');

  // --- Render Viewers If Selected ---
  if (selectedContent?.content_type === 'lms_course') {
    return <WorkspaceCourseViewer courseData={selectedContent} onBack={() => setSelectedContent(null)} />;
  }
  if (selectedContent?.content_type === 'bcs_subject') {
    return <WorkspaceBcsViewer subjectData={selectedContent} onBack={() => setSelectedContent(null)} />;
  }

  if (!group) return (
    <div className="min-h-screen bg-[#0D0E0F] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-[#F5F5F5] font-sans pb-20 selection:bg-[#FF9D2E]/30 relative">
      
      {/* Header */}
      <div className="sticky top-0 bg-[#0D0E0F]/80 backdrop-blur-xl border-b border-[#292B2E] z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/workspace-manager')} className="p-2.5 bg-[#141516] hover:bg-[#1D1E20] border border-[#292B2E] rounded-xl text-[#A3A5A8] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#F5F5F5]">{group.name}</h1>
            <p className="text-[#A3A5A8] text-sm">Full Admin Control Panel</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 mt-4 space-y-6">
        
        {/* Push to Group Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#292B2E] shadow-sm">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Download className="text-[#19C784]" /> Push Course to Group
            </h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select value={selectedLms} onChange={(e) => setSelectedLms(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none">
                  <option value="">-- Select LMS Course --</option>
                  {lmsCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button onClick={handleImportLms} disabled={loading || !selectedLms} className="bg-[#19C784]/10 text-[#19C784] hover:bg-[#19C784]/20 border border-[#19C784]/20 px-4 rounded-xl font-bold transition-colors disabled:opacity-50">
                  <Plus size={20}/>
                </button>
              </div>

              <div className="flex gap-2">
                <select value={selectedBcs} onChange={(e) => setSelectedBcs(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none">
                  <option value="">-- Select BCS Subject --</option>
                  {bcsSubjects.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button onClick={handleImportBcs} disabled={loading || !selectedBcs} className="bg-[#668CFF]/10 text-[#668CFF] hover:bg-[#668CFF]/20 border border-[#668CFF]/20 px-4 rounded-xl font-bold transition-colors disabled:opacity-50">
                  <Plus size={20}/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- SPLIT LAYOUT: COURSES & NOTES --- */}
        <div className="flex flex-col lg:flex-row gap-6 items-start mt-8">
          
          {/* Assigned Courses (Clickable Cards with Sync & Delete) */}
          <div className="flex-1 w-full">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <BookOpen className="text-[#19C784]" size={20}/> Courses inside Group
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupCourses.length === 0 ? (
                <div className="col-span-full py-12 text-center border border-dashed border-[#292B2E] bg-[#141516] rounded-3xl">
                  <p className="text-[#707277]">No courses pushed to this group yet.</p>
                </div>
              ) : (
                groupCourses.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedContent(item)}
                    className="bg-[#18191A] border border-[#292B2E] hover:border-[#19C784]/60 p-5 rounded-3xl flex flex-col justify-between cursor-pointer group transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 rounded-xl bg-[#19C784]/10 text-[#19C784]">
                          <BookOpen size={20} />
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteContent(item.id, item.content_type); }} 
                          className="p-2 text-[#707277] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                          title="Remove Course"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                      <h3 className="font-bold text-lg leading-snug mb-4 group-hover:text-[#19C784] transition-colors">{item.title}</h3>
                    </div>

                    <div className="pt-3 border-t border-[#292B2E] flex justify-between items-center text-xs">
                      <span className="text-[#A3A5A8] font-medium group-hover:text-white transition-colors">Click to Enter Lesson →</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSyncContent(item); }}
                        disabled={syncingId === item.id}
                        className="p-1.5 text-[#707277] hover:text-[#FF9D2E] rounded-md transition-colors"
                        title="Sync with latest updates"
                      >
                        <RefreshCw size={14} className={syncingId === item.id ? 'animate-spin text-[#FF9D2E]' : ''} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Group Important Notes */}
          <div className="w-full lg:w-[340px] shrink-0 bg-[#18191A] border border-[#292B2E] rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-white">
                <FileText size={18} className="text-[#FF9D2E]"/> Group Notes
              </h3>
              <button onClick={openNewNote} className="p-1.5 bg-[#FF9D2E]/10 text-[#FF9D2E] rounded-lg hover:bg-[#FF9D2E]/20 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              {groupNotes.length === 0 ? (
                <p className="text-sm text-[#707277] text-center py-4">No notes created yet.</p>
              ) : (
                groupNotes.map(note => (
                  <div key={note.id} className="p-3.5 bg-[#141516] rounded-xl border border-[#292B2E] hover:border-[#FF9D2E]/50 transition-colors flex justify-between items-center">
                    <div className="flex-1 pr-2">
                      <h4 className="font-bold text-sm text-white line-clamp-1">{note.title}</h4>
                      <p className="text-[11px] text-[#A3A5A8] mt-1 flex items-center gap-1.5">
                        <span className="font-medium">{note.content_data?.authorName || 'User'}</span>
                        <span>•</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditNote(note)} className="p-1.5 text-[#707277] hover:text-[#FF9D2E] transition-colors"><Edit3 size={15}/></button>
                      <button onClick={() => handleDeleteContent(note.id, note.content_type)} className="p-1.5 text-[#707277] hover:text-red-500 transition-colors"><Trash2 size={15}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Admin Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                <FileText size={20} className="text-[#FF9D2E]"/> {editingNoteId ? 'Edit Group Note' : 'New Group Note'}
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-[#707277] hover:text-[#FF5B61]"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveAdminNote} className="space-y-4">
              <input type="text" placeholder="Note Title..." value={adminNoteTitle} onChange={(e) => setAdminNoteTitle(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 outline-none font-bold text-white" required />
              <textarea placeholder="Write note content..." value={adminNoteContent} onChange={(e) => setAdminNoteContent(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-40 resize-none outline-none text-white" required />
              <div className="flex justify-end gap-3 pt-2">
                <button type="submit" className="bg-[#FF9D2E] text-black px-6 py-2.5 rounded-xl font-extrabold hover:bg-[#FFAA3D]">
                  <Save size={16} className="inline mr-1" /> {editingNoteId ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}