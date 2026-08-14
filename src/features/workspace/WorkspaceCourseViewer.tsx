// src/features/workspace/WorkspaceCourseViewer.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, CheckCircle2, Save, Loader2, Target, 
  Layout, Menu, Circle, CheckCircle, Plus, X 
} from 'lucide-react';

interface Content {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  file_path_or_url: string;
  is_completed: boolean;
}

interface Module {
  id: string;
  title: string;
  contents: Content[];
}

export default function WorkspaceCourseViewer({ 
  courseData, 
  onBack 
}: { 
  courseData: any; 
  onBack: () => void 
}) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(courseData);
  const [modules, setModules] = useState<Module[]>([]);
  
  // Responsive States
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeContent, setActiveContent] = useState<Content | null>(null);
  
  // Note States (Guest only edits their own notes)
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (courseData) {
      // Parse modules from the JSON data pushed from Main OS
      if (courseData.content_data && courseData.content_data.modules) {
        setModules(courseData.content_data.modules);
        if (courseData.content_data.modules[0]?.contents?.[0]) {
          setActiveContent(courseData.content_data.modules[0].contents[0]);
        }
      }
      setLoading(false);
    }
  }, [courseData]);

  // Fetch Guest's personal note for this specific content
  useEffect(() => {
    if (activeContent) {
      fetchPersonalNote(activeContent.id);
    }
  }, [activeContent]);

  const fetchPersonalNote = async (contentId: string) => {
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    if (!user) return;
    
    // We use shared_contents to store personal notes by adding user_id in the JSON
    const { data } = await workspaceSupabase
      .from('shared_contents')
      .select('*')
      .eq('content_type', 'personal_note')
      .eq('group_id', courseData.group_id)
      .filter('content_data->>contentId', 'eq', contentId)
      .filter('content_data->>userId', 'eq', user.id)
      .single();

    if (data) {
      setNoteId(data.id);
      setNoteContent(data.content_data.text || '');
    } else {
      setNoteId(null);
      setNoteContent('');
    }
  };

  const handleSaveNote = async () => {
    if (!activeContent) return;
    setIsSavingNote(true);
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    
    try {
      if (noteId) {
        // Update existing note
        await workspaceSupabase.from('shared_contents')
          .update({ content_data: { text: noteContent, contentId: activeContent.id, userId: user?.id } })
          .eq('id', noteId);
      } else {
        // Insert new note
        const { data, error } = await workspaceSupabase.from('shared_contents').insert([{
          group_id: courseData.group_id,
          title: `Note for: ${activeContent.title}`,
          content_type: 'personal_note',
          content_data: { text: noteContent, contentId: activeContent.id, userId: user?.id }
        }]).select().single();
        if (data) setNoteId(data.id);
      }
    } catch (error: any) { alert("Error saving note"); }
    finally { setIsSavingNote(false); }
  };

  // Toggle Completion (Stored locally for Guest session)
  const toggleContentCompletion = (contentId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const newModules = modules.map(mod => ({
      ...mod,
      contents: mod.contents.map(c => c.id === contentId ? { ...c, is_completed: newStatus } : c)
    }));
    setModules(newModules);
    if (activeContent?.id === contentId) setActiveContent({ ...activeContent, is_completed: newStatus });
    
    // Calculate Progress
    let total = 0; let completed = 0;
    newModules.forEach(mod => {
      mod.contents.forEach(c => { total++; if (c.is_completed) completed++; });
    });
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    setCourse((prev: any) => ({ ...prev, progress_pct: pct }));
  };

  const getSafeEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube' || url.includes('youtu')) {
      if (url.includes('watch?v=')) return url.replace('watch?v=', 'embed/').split('&')[0];
      if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0];
    }
    return url;
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] sticky top-0 z-10">
        <h2 className="font-bold flex items-center gap-2 text-[#020F33]">
          <Layout size={18} className="text-purple-600"/> Modules
        </h2>
      </div>
      <div className="p-3 pb-20 overflow-y-auto flex-1">
        {modules.length === 0 ? (
          <p className="text-slate-500 text-sm text-center mt-10">No modules uploaded yet.</p>
        ) : (
          modules.map((mod, mIdx) => (
            <div key={mod.id || mIdx} className="mb-5">
              <div className="flex justify-between items-center mb-2 px-2 border-b border-[#E2E8F0] pb-2">
                <h3 className="text-sm font-bold text-[#020F33] uppercase">{mod.title}</h3>
              </div>
              <div className="space-y-1">
                {mod.contents?.map((content, cIdx) => (
                  <div key={content.id || cIdx} className={`flex items-start gap-2 p-2 rounded-xl transition-all ${activeContent?.title === content.title ? 'bg-[#020F33] text-white shadow-md' : 'hover:bg-[#F8FAFC]'}`}>
                    <button 
                      onClick={() => toggleContentCompletion(content.id || cIdx.toString(), content.is_completed)}
                      className={`mt-1 shrink-0 ${content.is_completed ? 'text-[#A3D803]' : (activeContent?.title === content.title ? 'text-slate-400' : 'text-[#CBD5E1] hover:text-purple-500')}`}
                    >
                      {content.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                    </button>
                    <button onClick={() => { setActiveContent(content); setShowMobileSidebar(false); }} className="flex-1 text-left">
                      <span className={`text-sm font-medium leading-snug line-clamp-2 ${content.is_completed && activeContent?.title !== content.title ? 'line-through text-slate-400' : ''}`}>
                        {content.title}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-purple-500" size={40} /></div>;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#020F33] overflow-hidden fixed inset-0 z-[100]">
      
      {/* Mobile Sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
          <aside className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left">
            <button onClick={() => setShowMobileSidebar(false)} className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 rounded-full z-20"><X size={16} /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Header (Exact Match to your OS) */}
      <header className="bg-white border-b border-[#E2E8F0] px-3 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between shrink-0 shadow-sm gap-3">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors shrink-0">
            <ArrowLeft size={18} className="text-[#475569]" />
          </button>
          <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 bg-[#F8FAFC] text-[#020F33] rounded-xl border border-[#E2E8F0] shrink-0">
            <Menu size={18} />
          </button>
          
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm md:text-lg leading-tight truncate">{courseData.title}</h1>
            <div className="flex items-center gap-2 mt-1 max-w-[200px]">
              <div className="flex-1 h-1.5 bg-[#F8FAFC] rounded-full overflow-hidden border border-[#E2E8F0]">
                <div className="h-full transition-all duration-500 bg-purple-500" style={{ width: `${course?.progress_pct || 0}%` }}></div>
              </div>
              <span className="text-[10px] font-black text-[#475569]">{course?.progress_pct || 0}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0 ml-10 md:ml-2">
          {/* Status Badge (Read Only for Guests) */}
          <div className="text-xs md:text-sm font-bold px-3 py-1.5 md:py-2 rounded-lg border bg-purple-50 text-purple-600 border-purple-200">
            🔥 Active (Learning)
          </div>

          <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] shrink-0">
            <button onClick={() => setViewMode('media')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><MonitorPlay size={14} /></button>
            <button onClick={() => setViewMode('split')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><Columns size={14} /></button>
            <button onClick={() => setViewMode('notes')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><FileText size={14} /></button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout (Exact Match) */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex-col overflow-hidden shrink-0 hidden lg:flex">
          <SidebarContent />
        </aside>

        <main className={`flex-1 flex overflow-hidden bg-[#F8FAFC] p-2 md:p-4 gap-2 md:gap-4 ${viewMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] shrink-0 lg:shrink relative ${viewMode === 'split' ? 'h-2/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              {activeContent && (
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => toggleContentCompletion(activeContent.id || activeContent.title, activeContent.is_completed)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all backdrop-blur-md border ${activeContent.is_completed ? 'bg-[#A3D803]/20 text-[#A3D803] border-[#A3D803]' : 'bg-black/50 text-white border-white/20 hover:bg-black/70'}`}
                  >
                    {activeContent.is_completed ? <CheckCircle2 size={14}/> : <Circle size={14}/>} 
                    {activeContent.is_completed ? 'Completed' : 'Mark as Done'}
                  </button>
                </div>
              )}

              {activeContent?.content_type === 'youtube' || activeContent?.content_type === 'video' || activeContent?.file_path_or_url?.includes('youtu') ? (
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
                <h3 className="font-bold flex items-center gap-2 text-[#020F33] text-sm md:text-base truncate pr-2">
                  <FileText size={16} className="text-purple-500 shrink-0" /> 
                  <span className="truncate">My Personal Notes</span>
                </h3>
                {activeContent && (
                  <button onClick={handleSaveNote} disabled={isSavingNote} className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 bg-[#020F33] hover:bg-purple-500 text-white transition-colors shrink-0">
                    {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> <span className="hidden sm:inline">Save</span></>}
                  </button>
                )}
              </div>
              
              <textarea 
                value={noteContent} 
                onChange={(e) => setNoteContent(e.target.value)} 
                disabled={!activeContent} 
                placeholder={activeContent ? "Write personal notes for this lesson here..." : "Select a lesson first..."} 
                className="flex-1 w-full p-4 md:p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-purple-500 text-[#020F33] text-sm md:text-base leading-relaxed disabled:bg-slate-50 disabled:opacity-50" 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}