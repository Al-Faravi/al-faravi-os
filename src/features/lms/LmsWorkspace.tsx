import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, File, CheckCircle2, Save, Loader2, Plus,
  X, Link as LinkIcon, Target, Layout, Trash2, Menu, Circle, CheckCircle, Video, Edit3
} from 'lucide-react';

interface Content { id: string; module_id: string; title: string; content_type: string; file_path_or_url: string; is_completed: boolean; }
interface Module { id: string; title: string; contents: Content[]; }
interface NoteFile { id: string; title: string; content: string; }

export default function LmsWorkspace() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  
  const [notesList, setNotesList] = useState<NoteFile[]>([]);
  const [activeNote, setActiveNote] = useState<NoteFile | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [nTitle, setNTitle] = useState('');

  // Modals States (Create & Edit)
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null); // For Update

  const [showContentModal, setShowContentModal] = useState<string | null>(null); // holds module_id
  const [cTitle, setCTitle] = useState('');
  const [cType, setCType] = useState('youtube');
  const [cUrl, setCUrl] = useState('');
  const [isSavingResource, setIsSavingResource] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null); // For Update

  useEffect(() => { if (courseId) fetchWorkspaceData(); }, [courseId]);

  useEffect(() => {
    if (activeContent) { fetchNotesForContent(activeContent.id); } 
    else { setNotesList([]); setActiveNote(null); setNoteContent(''); }
  }, [activeContent]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', courseId).maybeSingle();
      setCourse(courseData || { title: 'Workspace', status: 'pending', progress_pct: 0 });

      const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
      
      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map(m => m.id);
        const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', moduleIds).order('created_at', { ascending: true });
        
        const structuredModules = modulesData.map(mod => ({
          ...mod, contents: (contentsData || []).filter(c => c.module_id === mod.id)
        }));
        setModules(structuredModules);
        
        // Only set active content if there isn't one already or if it was deleted
        if (!activeContent || !contentsData?.find(c => c.id === activeContent.id)) {
            if(structuredModules[0]?.contents[0]) {
               setActiveContent(structuredModules[0].contents[0]);
            } else {
               setActiveContent(null);
            }
        }
      } else {
         setModules([]);
         setActiveContent(null);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchNotesForContent = async (contentId: string) => {
    try {
      const { data } = await supabase.from('lms_notes').select('*').eq('content_id', contentId).order('created_at', { ascending: true });
      setNotesList(data || []);
      if (data && data.length > 0) { setActiveNote(data[0]); setNoteContent(data[0].content || ''); } 
      else { setActiveNote(null); setNoteContent(''); }
    } catch (error) { console.error(error); }
  };

  const handleStatusChange = async (newStatus: string) => {
    setCourse((prev: any) => ({ ...prev, status: newStatus }));
    try { await supabase.from('lms_courses').update({ status: newStatus }).eq('id', courseId); } 
    catch (error) { console.error(error); }
  };

  const toggleContentCompletion = async (contentId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const newModules = modules.map(mod => ({
      ...mod, contents: mod.contents.map(c => c.id === contentId ? { ...c, is_completed: newStatus } : c)
    }));
    setModules(newModules);
    if (activeContent?.id === contentId) setActiveContent({ ...activeContent, is_completed: newStatus });

    let total = 0; let completed = 0;
    newModules.forEach(mod => { mod.contents.forEach(c => { total++; if (c.is_completed) completed++; }); });
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    setCourse((prev: any) => ({ ...prev, progress_pct: pct }));

    try {
      await supabase.from('lms_contents').update({ is_completed: newStatus }).eq('id', contentId);
      await supabase.from('lms_courses').update({ progress_pct: pct }).eq('id', courseId);
      if (pct > 0 && pct < 100 && course.status === 'pending') handleStatusChange('active');
      else if (pct === 100) handleStatusChange('completed');
    } catch (error) { console.error(error); }
  };

  // --- MODULE CRUD ---
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle || !courseId) return;
    try {
      if (editingModuleId) {
        // UPDATE Module
        await supabase.from('lms_modules').update({ title: mTitle }).eq('id', editingModuleId);
      } else {
        // CREATE Module
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('lms_modules').insert([{ course_id: courseId, user_id: user?.id, title: mTitle }]);
      }
      setMTitle(''); setEditingModuleId(null); setShowModuleModal(false); fetchWorkspaceData();
    } catch (error) { alert("Error saving module"); }
  };

  const openEditModule = (mod: Module) => {
      setMTitle(mod.title); setEditingModuleId(mod.id); setShowModuleModal(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
      if(!window.confirm("Are you sure you want to delete this module and all its resources?")) return;
      try {
          await supabase.from('lms_modules').delete().eq('id', moduleId);
          fetchWorkspaceData();
      } catch (error) { alert("Error deleting module"); }
  };

  // --- CONTENT/RESOURCE CRUD ---
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle || !cUrl) return;
    setIsSavingResource(true);
    try {
      if (editingContentId) {
          // UPDATE Content
          await supabase.from('lms_contents').update({ title: cTitle, content_type: cType, file_path_or_url: cUrl }).eq('id', editingContentId);
      } else {
          // CREATE Content
          if(!showContentModal) return; // need module id
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('lms_contents').insert([{ module_id: showContentModal, user_id: user?.id, title: cTitle, content_type: cType, file_path_or_url: cUrl }]);
      }
      
      setCTitle(''); setCUrl(''); setEditingContentId(null); setShowContentModal(null); fetchWorkspaceData();
    } catch (error) { alert("Error saving resource"); } 
    finally { setIsSavingResource(false); }
  };

  const openEditContent = (content: Content) => {
      setCTitle(content.title); setCUrl(content.file_path_or_url); setCType(content.content_type); 
      setEditingContentId(content.id); setShowContentModal(content.module_id);
  };

  const handleDeleteContent = async (contentId: string) => {
      if(!window.confirm("Delete this resource?")) return;
      try {
          await supabase.from('lms_contents').delete().eq('id', contentId);
          fetchWorkspaceData();
      } catch(error) { alert("Error deleting resource"); }
  }


  // --- Note Logic ---
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nTitle || !activeContent) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('lms_notes').insert([{ content_id: activeContent.id, user_id: user?.id, title: nTitle, content: '' }]).select().single();
      if (error) throw error;
      setNotesList([...notesList, data]); setActiveNote(data); setNoteContent(''); setNTitle(''); setShowNoteModal(false);
    } catch (error: any) { alert(error.message); }
  };

  const handleSaveNote = async () => {
    if (!activeNote) return;
    setIsSavingNote(true);
    try {
      await supabase.from('lms_notes').update({ content: noteContent }).eq('id', activeNote.id);
      setNotesList(notesList.map(n => n.id === activeNote.id ? { ...n, content: noteContent } : n));
    } catch (error: any) { alert(error.message); } finally { setIsSavingNote(false); }
  };


  const getSafeEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube' || url.includes('youtu')) {
      const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
      if (match && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] sticky top-0 z-10">
        <h2 className="font-bold flex items-center gap-2 text-[#020F33]"><Layout size={18} className="text-purple-600"/> Modules</h2>
        <button onClick={() => { setMTitle(''); setEditingModuleId(null); setShowModuleModal(true); }} className="hover:text-white p-1.5 rounded-lg transition-colors text-purple-600 bg-purple-100 hover:bg-purple-600">
          <Plus size={18} />
        </button>
      </div>
      <div className="p-3 pb-20 overflow-y-auto flex-1">
        {modules.map(mod => (
          <div key={mod.id} className="mb-5">
            <div className="flex justify-between items-center mb-2 px-2 border-b border-[#E2E8F0] pb-2 group">
              <h3 className="text-sm font-bold text-[#020F33] uppercase flex-1">{mod.title}</h3>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => openEditModule(mod)} className="text-[#475569] hover:text-blue-500 bg-[#E2E8F0]/50 hover:bg-blue-100 rounded-md p-1"><Edit3 size={14} /></button>
                 <button onClick={() => handleDeleteModule(mod.id)} className="text-[#475569] hover:text-red-500 bg-[#E2E8F0]/50 hover:bg-red-100 rounded-md p-1"><Trash2 size={14} /></button>
                 <button onClick={() => { setCTitle(''); setCUrl(''); setCType('youtube'); setEditingContentId(null); setShowContentModal(mod.id); }} className="text-[#475569] hover:text-purple-600 bg-[#E2E8F0]/50 hover:bg-purple-100 rounded-md p-1"><Plus size={14} /></button>
              </div>
            </div>
            <div className="space-y-1">
              {mod.contents.map(content => (
                <div key={content.id} className={`flex items-start gap-2 p-2 rounded-xl transition-all group/item ${activeContent?.id === content.id ? 'bg-[#020F33] text-white shadow-md' : 'hover:bg-[#F8FAFC]'}`}>
                  <button onClick={() => toggleContentCompletion(content.id, content.is_completed)} className={`mt-1 shrink-0 ${content.is_completed ? 'text-[#A3D803]' : (activeContent?.id === content.id ? 'text-slate-400' : 'text-[#CBD5E1] hover:text-purple-500')}`}>
                    {content.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </button>
                  <button onClick={() => { setActiveContent(content); setShowMobileSidebar(false); }} className="flex-1 text-left flex items-start gap-2">
                    {content.content_type === 'pdf' ? <File size={16} className="shrink-0 mt-0.5 opacity-70"/> : <Video size={16} className="shrink-0 mt-0.5 opacity-70"/>}
                    <span className={`text-sm font-medium leading-snug line-clamp-2 ${content.is_completed && activeContent?.id !== content.id ? 'line-through text-slate-400' : ''}`}>{content.title}</span>
                  </button>
                  
                  {/* Resource Actions (Edit/Delete) */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 shrink-0">
                     <button onClick={() => openEditContent(content)} className="text-slate-400 hover:text-blue-400 p-0.5"><Edit3 size={12}/></button>
                     <button onClick={() => handleDeleteContent(content.id)} className="text-slate-400 hover:text-red-400 p-0.5"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-purple-500" size={40} /></div>;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#020F33] overflow-hidden relative">
      
      {/* --- ADD/EDIT MODULE MODAL --- */}
      {showModuleModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">{editingModuleId ? 'Edit Module' : 'Create New Module'}</h3><button onClick={() => setShowModuleModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button></div>
            <form onSubmit={handleSaveModule} className="space-y-4">
              <input type="text" value={mTitle} onChange={(e)=>setMTitle(e.target.value)} placeholder="e.g. Chapter 1: Basic" className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none" required/>
              <button type="submit" className="w-full bg-[#020F33] text-white font-bold py-3 rounded-xl hover:bg-purple-600 transition-colors">{editingModuleId ? 'Save Changes' : 'Create Module'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT CONTENT MODAL --- */}
      {showContentModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">{editingContentId ? 'Edit Resource' : 'Add Resource'}</h3><button onClick={() => setShowContentModal(null)} className="text-slate-400 hover:text-red-500"><X size={20}/></button></div>
            <form onSubmit={handleSaveContent} className="space-y-4">
              <input type="text" value={cTitle} onChange={(e)=>setCTitle(e.target.value)} placeholder="Resource Title" className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none" required/>
              <select value={cType} onChange={(e)=>setCType(e.target.value)} className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none"><option value="youtube">YouTube Video</option><option value="video">Direct Video URL</option><option value="pdf">PDF Link</option></select>
              <input type="url" value={cUrl} onChange={(e)=>setCUrl(e.target.value)} placeholder="Link URL..." className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none" required/>
              <button type="submit" disabled={isSavingResource} className="w-full bg-[#020F33] text-white font-bold py-3 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50">{isSavingResource ? 'Saving...' : editingContentId ? 'Update Resource' : 'Save Resource'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD NOTE MODAL --- */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-lg">New Note File</h3><button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button></div>
            <form onSubmit={handleCreateNote} className="space-y-4">
              <input type="text" value={nTitle} onChange={(e)=>setNTitle(e.target.value)} placeholder="Note Title (e.g. Physics Formula)" className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none" required/>
              <button type="submit" className="w-full bg-[#020F33] text-white font-bold py-3 rounded-xl hover:bg-purple-600 transition-colors">Create Note</button>
            </form>
          </div>
        </div>
      )}

      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
          <aside className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full"><button onClick={() => setShowMobileSidebar(false)} className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 rounded-full z-20"><X size={16} /></button><SidebarContent /></aside>
        </div>
      )}

      <header className="bg-white border-b border-[#E2E8F0] px-3 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between shrink-0 z-10 shadow-sm gap-3">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Link to="/lms" className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors shrink-0"><ArrowLeft size={18} className="text-[#475569]" /></Link>
          <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 bg-[#F8FAFC] text-[#020F33] rounded-xl border border-[#E2E8F0] shrink-0"><Menu size={18} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm md:text-lg leading-tight flex items-center gap-2 truncate"><span className="truncate">{course?.title || 'Workspace'}</span></h1>
            <div className="flex items-center gap-2 mt-1 max-w-[200px]"><div className="flex-1 h-1.5 bg-[#F8FAFC] rounded-full overflow-hidden border border-[#E2E8F0]"><div className="h-full transition-all duration-500 bg-purple-500" style={{ width: `${course?.progress_pct || 0}%` }}></div></div><span className="text-[10px] font-black text-[#475569]">{course?.progress_pct || 0}%</span></div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0 ml-10 md:ml-2">
          <select value={course?.status || 'pending'} onChange={(e) => handleStatusChange(e.target.value)} className={`text-xs md:text-sm font-bold px-3 py-1.5 md:py-2 rounded-lg border focus:outline-none transition-colors shrink-0 ${course?.status === 'active' ? 'bg-purple-50 text-purple-600 border-purple-200' : course?.status === 'completed' ? 'bg-[#A3D803]/10 text-[#719900] border-[#A3D803]/20' : course?.status === 'watch_later' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'}`}>
            <option value="pending">⏳ Pending</option><option value="active">🔥 Active (Learning)</option><option value="watch_later">📌 Watch Later</option><option value="completed">✅ Mastered</option>
          </select>
          <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] shrink-0">
            <button onClick={() => setViewMode('media')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><MonitorPlay size={14} /></button>
            <button onClick={() => setViewMode('split')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><Columns size={14} /></button>
            <button onClick={() => setViewMode('notes')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><FileText size={14} /></button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex-col overflow-hidden shrink-0 hidden lg:flex"><SidebarContent /></aside>
        <main className={`flex-1 flex overflow-hidden bg-[#F8FAFC] p-2 md:p-4 gap-2 md:gap-4 ${viewMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] shrink-0 lg:shrink relative ${viewMode === 'split' ? 'h-2/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              {activeContent && (
                <div className="absolute top-4 right-4 z-10"><button onClick={() => toggleContentCompletion(activeContent.id, activeContent.is_completed)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all backdrop-blur-md border ${activeContent.is_completed ? 'bg-[#A3D803]/20 text-[#A3D803] border-[#A3D803]' : 'bg-black/50 text-white border-white/20 hover:bg-black/70'}`}>{activeContent.is_completed ? <CheckCircle2 size={14}/> : <Circle size={14}/>} {activeContent.is_completed ? 'Completed' : 'Mark as Done'}</button></div>
              )}
              {activeContent?.content_type === 'youtube' || activeContent?.content_type === 'video' ? (
                <iframe className="w-full h-full min-h-[200px]" src={getSafeEmbedUrl(activeContent.file_path_or_url, activeContent.content_type)} allowFullScreen></iframe>
              ) : activeContent?.content_type === 'pdf' ? (
                <iframe className="w-full h-full bg-white min-h-[300px]" src={activeContent.file_path_or_url}></iframe>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white p-6"><Target size={48} className="opacity-20 mb-4" /><p className="font-bold text-center">Select material from modules</p></div>
              )}
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'notes') && (
            <div className={`flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'h-3/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              <div className="p-3 md:p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="font-bold flex items-center gap-2 text-[#020F33] text-sm md:text-base truncate pr-2"><FileText size={16} className="text-purple-500 shrink-0" /> <span className="truncate">{activeNote ? activeNote.title : 'Notes Editor'}</span></h3>
                {activeNote && <button onClick={handleSaveNote} disabled={isSavingNote} className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 bg-[#020F33] hover:bg-purple-600 text-white transition-colors shrink-0">{isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> <span className="hidden sm:inline">Save</span></>}</button>}
              </div>
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} disabled={!activeNote} placeholder={activeNote ? "Write your notes here..." : "Select or create a note file below..."} className="flex-1 w-full p-4 md:p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-purple-500 text-[#020F33] text-sm md:text-base leading-relaxed disabled:bg-slate-50 disabled:opacity-50" />
              <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <button onClick={() => setShowNoteModal(true)} disabled={!activeContent} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-[#020F33] text-white text-xs font-bold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"><Plus size={14} /> New Note</button>
                {notesList.map(note => (<div key={note.id} onClick={() => { setActiveNote(note); setNoteContent(note.content); }} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer group ${activeNote?.id === note.id ? 'bg-purple-100 border-purple-400 text-[#020F33]' : 'bg-white border-[#E2E8F0] text-[#475569]'}`}><FileText size={12} className={activeNote?.id === note.id ? 'text-purple-600' : 'text-[#94A3B8]'} /> {note.title}</div>))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}