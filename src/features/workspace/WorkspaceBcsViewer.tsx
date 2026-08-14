// src/features/workspace/WorkspaceBcsViewer.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, CheckCircle2, Save, Loader2, Target, 
  BookOpen, Menu, Circle, CheckCircle, Plus, X 
} from 'lucide-react';

interface BcsResource {
  id: string;
  chapter_id: string;
  title: string;
  resource_type: string;
  file_url: string;
  is_completed: boolean;
}

interface BcsChapter {
  id: string;
  title: string;
  resources: BcsResource[];
}

export default function WorkspaceBcsViewer({ 
  subjectData, 
  onBack 
}: { 
  subjectData: any; 
  onBack: () => void 
}) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<any>(subjectData);
  const [chapters, setChapters] = useState<BcsChapter[]>([]);
  
  // Responsive States
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeResource, setActiveResource] = useState<BcsResource | null>(null);
  
  // Personal Notes States
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (subjectData && subjectData.content_data) {
      const parsedChapters = subjectData.content_data.chapters || [];
      setChapters(parsedChapters);
      if (parsedChapters[0]?.resources?.[0]) {
        setActiveResource(parsedChapters[0].resources[0]);
      }
      setLoading(false);
    }
  }, [subjectData]);

  useEffect(() => {
    if (activeResource) fetchPersonalNote(activeResource.id);
  }, [activeResource]);

  const fetchPersonalNote = async (resourceId: string) => {
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    if (!user) return;
    
    const { data } = await workspaceSupabase
      .from('shared_contents')
      .select('*')
      .eq('content_type', 'personal_note')
      .eq('group_id', subjectData.group_id)
      .filter('content_data->>resourceId', 'eq', resourceId)
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
    if (!activeResource) return;
    setIsSavingNote(true);
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    
    try {
      if (noteId) {
        await workspaceSupabase.from('shared_contents')
          .update({ content_data: { text: noteContent, resourceId: activeResource.id, userId: user?.id } })
          .eq('id', noteId);
      } else {
        const { data } = await workspaceSupabase.from('shared_contents').insert([{
          group_id: subjectData.group_id,
          title: `Note for: ${activeResource.title}`,
          content_type: 'personal_note',
          content_data: { text: noteContent, resourceId: activeResource.id, userId: user?.id }
        }]).select().single();
        if (data) setNoteId(data.id);
      }
    } catch (error: any) { alert("Error saving note"); }
    finally { setIsSavingNote(false); }
  };

  const toggleResourceCompletion = (resId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const newChapters = chapters.map(ch => ({
      ...ch,
      resources: ch.resources.map(r => (r.id || r.title) === resId ? { ...r, is_completed: newStatus } : r)
    }));
    setChapters(newChapters);
    if ((activeResource?.id || activeResource?.title) === resId) setActiveResource({ ...activeResource, is_completed: newStatus } as any);
    
    let total = 0; let completed = 0;
    newChapters.forEach(ch => {
      ch.resources.forEach(r => { total++; if (r.is_completed) completed++; });
    });
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    setSubject((prev: any) => ({ ...prev, progress_pct: pct }));
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
          <BookOpen size={18} style={{ color: subjectData.content_data?.icon_color || '#02C2D5' }}/> Syllabus
        </h2>
      </div>
      <div className="p-3 pb-20 overflow-y-auto flex-1">
        {chapters.length === 0 ? (
          <p className="text-slate-500 text-sm text-center mt-10">No chapters found.</p>
        ) : (
          chapters.map((chap, cIdx) => (
            <div key={chap.id || cIdx} className="mb-5">
              <div className="flex justify-between items-center mb-2 px-2 border-b border-[#E2E8F0] pb-2">
                <h3 className="text-sm font-bold text-[#020F33] uppercase">{chap.title}</h3>
              </div>
              <div className="space-y-1">
                {chap.resources?.map((resource, rIdx) => (
                  <div key={resource.id || rIdx} className={`flex items-start gap-2 p-2 rounded-xl transition-all ${activeResource?.title === resource.title ? 'bg-[#020F33] text-white shadow-md' : 'hover:bg-[#F8FAFC]'}`}>
                    <button 
                      onClick={() => toggleResourceCompletion(resource.id || resource.title, resource.is_completed)}
                      className={`mt-1 shrink-0 ${resource.is_completed ? 'text-[#A3D803]' : (activeResource?.title === resource.title ? 'text-slate-400' : 'text-[#CBD5E1] hover:text-[#02C2D5]')}`}
                    >
                      {resource.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                    </button>
                    <button onClick={() => { setActiveResource(resource); setShowMobileSidebar(false); }} className="flex-1 text-left">
                      <span className={`text-sm font-medium leading-snug line-clamp-2 ${resource.is_completed && activeResource?.title !== resource.title ? 'line-through text-slate-400' : ''}`}>
                        {resource.title}
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;

  const iconColor = subjectData.content_data?.icon_color || '#02C2D5';

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

      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] px-3 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between shrink-0 shadow-sm gap-3">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors shrink-0">
            <ArrowLeft size={18} className="text-[#475569]" />
          </button>
          <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 bg-[#F8FAFC] text-[#020F33] rounded-xl border border-[#E2E8F0] shrink-0">
            <Menu size={18} />
          </button>
          
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm md:text-lg leading-tight flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0" style={{ backgroundColor: iconColor }}></span>
              <span className="truncate">{subjectData.title}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 max-w-[200px]">
              <div className="flex-1 h-1.5 bg-[#F8FAFC] rounded-full overflow-hidden border border-[#E2E8F0]">
                <div className="h-full transition-all duration-500" style={{ width: `${subject?.progress_pct || 0}%`, backgroundColor: iconColor }}></div>
              </div>
              <span className="text-[10px] font-black text-[#475569]">{subject?.progress_pct || 0}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0 ml-10 md:ml-2">
          <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] shrink-0">
            <button onClick={() => setViewMode('media')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><MonitorPlay size={14} /></button>
            <button onClick={() => setViewMode('split')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><Columns size={14} /></button>
            <button onClick={() => setViewMode('notes')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><FileText size={14} /></button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex-col overflow-hidden shrink-0 hidden lg:flex">
          <SidebarContent />
        </aside>

        <main className={`flex-1 flex overflow-hidden bg-[#F8FAFC] p-2 md:p-4 gap-2 md:gap-4 ${viewMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] shrink-0 lg:shrink relative ${viewMode === 'split' ? 'h-2/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              
              {activeResource && (
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => toggleResourceCompletion(activeResource.id || activeResource.title, activeResource.is_completed)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all backdrop-blur-md border ${activeResource.is_completed ? 'bg-[#A3D803]/20 text-[#A3D803] border-[#A3D803]' : 'bg-black/50 text-white border-white/20 hover:bg-black/70'}`}
                  >
                    {activeResource.is_completed ? <CheckCircle2 size={14}/> : <Circle size={14}/>} 
                    {activeResource.is_completed ? 'Completed' : 'Mark as Done'}
                  </button>
                </div>
              )}

              {activeResource?.resource_type === 'youtube' || activeResource?.resource_type === 'video' || activeResource?.file_url?.includes('youtu') ? (
                <iframe className="w-full h-full min-h-[200px]" src={getSafeEmbedUrl(activeResource.file_url, activeResource.resource_type)} allowFullScreen></iframe>
              ) : activeResource?.resource_type === 'pdf' ? (
                <iframe className="w-full h-full bg-white min-h-[300px]" src={activeResource.file_url}></iframe>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white p-6"><Target size={48} className="opacity-20 mb-4" /><p className="font-bold text-center">Select material from syllabus</p></div>
              )}
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'notes') && (
            <div className={`flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'h-3/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              <div className="p-3 md:p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="font-bold flex items-center gap-2 text-[#020F33] text-sm md:text-base truncate pr-2">
                  <FileText size={16} style={{ color: iconColor }} className="shrink-0" /> 
                  <span className="truncate">Personal Notes</span>
                </h3>
                {activeResource && (
                  <button onClick={handleSaveNote} disabled={isSavingNote} className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 bg-[#020F33] text-white hover:opacity-80 transition-colors shrink-0">
                    {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> <span className="hidden sm:inline">Save</span></>}
                  </button>
                )}
              </div>
              
              <textarea 
                value={noteContent} 
                onChange={(e) => setNoteContent(e.target.value)} 
                disabled={!activeResource} 
                placeholder={activeResource ? "Write your notes for this topic here..." : "Select a topic first..."} 
                className="flex-1 w-full p-4 md:p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 text-[#020F33] text-sm md:text-base leading-relaxed disabled:bg-slate-50 disabled:opacity-50"
                style={{ '--tw-ring-color': iconColor } as any}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}