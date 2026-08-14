// src/features/workspace/WorkspaceCourseViewer.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, CheckCircle2, Save, Loader2, Target, 
  Layout, Menu, Circle, CheckCircle, Plus, X, Video, File, Trash2
} from 'lucide-react';

// ... (আগের ইন্টারফেসগুলো)
interface Content { id: string; module_id: string; title: string; content_type: string; file_path_or_url: string; is_completed: boolean; }
interface Module { id: string; title: string; contents: Content[]; }

export default function WorkspaceCourseViewer({ courseData, onBack }: { courseData: any; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(courseData);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  
  // Multiple Notes States (Updated for Custom Naming)
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (courseData?.content_data?.modules) {
      setModules(courseData.content_data.modules);
      if (courseData.content_data.modules[0]?.contents?.[0]) setActiveContent(courseData.content_data.modules[0].contents[0]);
      setLoading(false);
    }
  }, [courseData]);

  useEffect(() => { if (activeContent) fetchPersonalNotes(activeContent.id); }, [activeContent]);

  useEffect(() => {
    if (activeNoteId && notes.length > 0) {
      const active = notes.find(n => n.id === activeNoteId);
      setNoteTitle(active?.title || '');
      setNoteContent(active?.content_data?.text || '');
    } else {
      setNoteTitle('');
      setNoteContent('');
    }
  }, [activeNoteId, notes]);

  const fetchPersonalNotes = async (contentId: string) => {
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    if (!user) return;
    const { data } = await workspaceSupabase.from('shared_contents').select('*').eq('content_type', 'personal_note').eq('group_id', courseData.group_id).filter('content_data->>contentId', 'eq', contentId).filter('content_data->>userId', 'eq', user.id).order('created_at', { ascending: true });
    
    if (data && data.length > 0) {
      setNotes(data);
      if (!activeNoteId || !data.find(n => n.id === activeNoteId)) setActiveNoteId(data[0].id);
    } else { setNotes([]); setActiveNoteId(null); }
  };

  const handleCreateNewNote = async () => {
    const customName = prompt("Enter a name for your new note:", `Note ${notes.length + 1}`);
    if (!customName || !activeContent) return;

    const { data: { user } } = await workspaceSupabase.auth.getUser();
    const nickname = localStorage.getItem(`nickname_${user?.id}`) || 'Member'; // Get Nickname
    
    const { data } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: courseData.group_id, 
      title: customName, 
      content_type: 'personal_note', 
      content_data: { text: '', contentId: activeContent.id, userId: user?.id, authorName: nickname }
    }]).select().single();

    if (data) { setNotes([...notes, data]); setActiveNoteId(data.id); }
  };

  const handleSaveNote = async () => {
    if (!activeNoteId || !noteTitle.trim()) return alert("Note title cannot be empty!");
    setIsSavingNote(true);
    try {
      const { data: { user } } = await workspaceSupabase.auth.getUser();
      const nickname = localStorage.getItem(`nickname_${user?.id}`) || 'Member'; // Get Nickname
      
      await workspaceSupabase.from('shared_contents').update({ 
        title: noteTitle, 
        content_data: { text: noteContent, contentId: activeContent?.id, userId: user?.id, authorName: nickname } 
      }).eq('id', activeNoteId);
      
      setNotes(notes.map(n => n.id === activeNoteId ? { ...n, title: noteTitle, content_data: { ...n.content_data, text: noteContent } } : n));
    } catch (error) { alert("Error saving note"); } 
    finally { setIsSavingNote(false); }
  };

  const handleDeleteNote = async () => {
    if (!activeNoteId || !window.confirm("Are you sure you want to delete this note?")) return;
    await workspaceSupabase.from('shared_contents').delete().eq('id', activeNoteId);
    setNotes(notes.filter(n => n.id !== activeNoteId));
    setActiveNoteId(notes.length > 1 ? notes[0].id : null);
  };

  // ... (toggleContentCompletion and getSafeEmbedUrl unchanged)
  const toggleContentCompletion = (contentId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const newModules = modules.map(mod => ({
      ...mod, contents: mod.contents.map(c => c.id === contentId ? { ...c, is_completed: newStatus } : c)
    }));
    setModules(newModules);
    if (activeContent?.id === contentId) setActiveContent({ ...activeContent, is_completed: newStatus });
    let total = 0; let completed = 0;
    newModules.forEach(mod => mod.contents?.forEach(c => { total++; if (c.is_completed) completed++; }));
    setCourse((prev: any) => ({ ...prev, progress_pct: total === 0 ? 0 : Math.round((completed / total) * 100) }));
  };

  const getSafeEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube' || url.includes('youtu')) {
      const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
      if (match && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}`;
    }
    return url;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-purple-500" size={40} /></div>;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#020F33] overflow-hidden fixed inset-0 z-[100]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] px-3 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between shrink-0 shadow-sm gap-3">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors shrink-0"><ArrowLeft size={18} className="text-[#475569]" /></button>
          <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 bg-[#F8FAFC] text-[#020F33] rounded-xl border border-[#E2E8F0] shrink-0"><Menu size={18} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm md:text-lg leading-tight truncate">{courseData.title}</h1>
          </div>
        </div>
        <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] shrink-0">
          <button onClick={() => setViewMode('media')} className={`px-2 py-1.5 rounded-md text-xs font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><MonitorPlay size={14} /></button>
          <button onClick={() => setViewMode('split')} className={`px-2 py-1.5 rounded-md text-xs font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><Columns size={14} /></button>
          <button onClick={() => setViewMode('notes')} className={`px-2 py-1.5 rounded-md text-xs font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><FileText size={14} /></button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex-col overflow-hidden shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]"><h2 className="font-bold flex items-center gap-2 text-[#020F33]"><Layout size={18} className="text-purple-600"/> Modules</h2></div>
          <div className="p-3 overflow-y-auto flex-1">
            {modules.map((mod, mIdx) => (
              <div key={mIdx} className="mb-5">
                <h3 className="text-sm font-bold text-[#020F33] uppercase mb-2 px-2 border-b border-[#E2E8F0] pb-2">{mod.title}</h3>
                <div className="space-y-1">
                  {mod.contents?.map((content, cIdx) => (
                    <div key={cIdx} className={`flex items-start gap-2 p-2 rounded-xl transition-all ${activeContent?.title === content.title ? 'bg-[#020F33] text-white shadow-md' : 'hover:bg-[#F8FAFC]'}`}>
                      <button onClick={() => toggleContentCompletion(content.id || cIdx.toString(), content.is_completed)} className={`mt-1 shrink-0 ${content.is_completed ? 'text-[#A3D803]' : (activeContent?.title === content.title ? 'text-slate-400' : 'text-[#CBD5E1] hover:text-purple-500')}`}>
                        {content.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                      </button>
                      <button onClick={() => setActiveContent(content)} className="flex-1 text-left flex items-start gap-2">
                        {content.content_type === 'pdf' ? <File size={16} className="shrink-0 mt-0.5 opacity-70"/> : <Video size={16} className="shrink-0 mt-0.5 opacity-70"/>}
                        <span className="text-sm font-medium leading-snug line-clamp-2">{content.title}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Video / Note Area */}
        <main className={`flex-1 flex overflow-hidden bg-[#F8FAFC] p-2 md:p-4 gap-2 md:gap-4 ${viewMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] relative ${viewMode === 'split' ? 'h-2/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              {activeContent && (
                <iframe className="w-full h-full min-h-[200px]" src={getSafeEmbedUrl(activeContent.file_path_or_url, activeContent.content_type)} allowFullScreen></iframe>
              )}
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'notes') && (
            <div className={`flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'h-3/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              <div className="flex flex-col border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex overflow-x-auto hide-scrollbar pt-2 px-2">
                  {notes.map(note => (
                    <button key={note.id} onClick={() => setActiveNoteId(note.id)} className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeNoteId === note.id ? 'border-purple-500 text-purple-600 bg-purple-50/50' : 'border-transparent text-[#475569] hover:bg-[#E2E8F0]/30'}`}>
                      {note.title}
                    </button>
                  ))}
                  {activeContent && (
                    <button onClick={handleCreateNewNote} className="px-4 py-2 text-sm font-bold text-purple-600 flex items-center gap-1 hover:bg-purple-50/50 whitespace-nowrap">
                      <Plus size={14}/> New Note
                    </button>
                  )}
                </div>
              </div>
              
              {activeNoteId ? (
                <div className="flex flex-col flex-1">
                  <div className="p-3 border-b border-[#E2E8F0] flex gap-2 items-center">
                    <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Note Title" className="flex-1 text-lg font-bold outline-none bg-transparent text-[#020F33]" />
                    <button onClick={handleDeleteNote} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                    <button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 bg-[#020F33] hover:bg-purple-500 text-white disabled:opacity-50">
                      {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                  </div>
                  <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your notes here..." className="flex-1 w-full p-4 resize-none outline-none text-[#020F33] leading-relaxed" />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 p-6 text-center">
                  Select a lesson and click "+ New Note" to start writing separately!
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}