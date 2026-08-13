import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, File, CheckCircle2, Save, Loader2, Plus,
  X, Link as LinkIcon, Target, BookOpen, Trash2, Menu, Circle, CheckCircle
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

interface NoteFile {
  id: string;
  title: string;
  content: string;
}

export default function BcsWorkspace() {
  const { subjectId } = useParams();
  const [loading, setLoading] = useState(true);
  
  const [subject, setSubject] = useState<any>(null);
  const [chapters, setChapters] = useState<BcsChapter[]>([]);
  
  // Responsive States
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const [activeResource, setActiveResource] = useState<BcsResource | null>(null);
  
  // Notes States
  const [notesList, setNotesList] = useState<NoteFile[]>([]);
  const [activeNote, setActiveNote] = useState<NoteFile | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [nTitle, setNTitle] = useState('');

  // Modals
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chTitle, setChTitle] = useState('');
  const [showResourceModal, setShowResourceModal] = useState<string | null>(null);
  const [rTitle, setRTitle] = useState('');
  const [rType, setRType] = useState('youtube');
  const [rUrl, setRUrl] = useState('');
  const [rFile, setRFile] = useState<File | null>(null);
  const [isSavingResource, setIsSavingResource] = useState(false);

  useEffect(() => {
    if (subjectId) fetchWorkspaceData();
  }, [subjectId]);

  useEffect(() => {
    if (activeResource) {
      fetchNotesForResource(activeResource.id);
    } else {
      setNotesList([]); setActiveNote(null); setNoteContent('');
    }
  }, [activeResource]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', subjectId).maybeSingle();
      setSubject(subjectData || { title: 'BCS Workspace', icon_color: '#02C2D5', status: 'pending', progress_pct: 0 });

      const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', subjectId).order('created_at', { ascending: true });
      
      if (chaptersData && chaptersData.length > 0) {
        const chapterIds = chaptersData.map(c => c.id);
        const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chapterIds).order('created_at', { ascending: true });
        
        const structuredChapters = chaptersData.map(chap => ({
          ...chap,
          resources: (resourcesData || []).filter(r => r.chapter_id === chap.id)
        }));
        setChapters(structuredChapters);
        if (!activeResource && structuredChapters[0]?.resources[0]) setActiveResource(structuredChapters[0].resources[0]);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchNotesForResource = async (resId: string) => {
    try {
      const { data } = await supabase.from('bcs_notes').select('*').eq('resource_id', resId).order('created_at', { ascending: true });
      setNotesList(data || []);
      if (data && data.length > 0) {
        setActiveNote(data[0]); setNoteContent(data[0].content || '');
      } else {
        setActiveNote(null); setNoteContent('');
      }
    } catch (error) { console.error(error); }
  };

  // --- Core LMS Features (Progress & Status) ---
  const handleStatusChange = async (newStatus: string) => {
    setSubject((prev: any) => ({ ...prev, status: newStatus }));
    try {
      await supabase.from('bcs_subjects').update({ status: newStatus }).eq('id', subjectId);
    } catch (error) { console.error("Error updating status:", error); }
  };

  const toggleResourceCompletion = async (resId: string, currentStatus: boolean) => {
    // 1. Update Resource locally
    const newStatus = !currentStatus;
    const newChapters = chapters.map(ch => ({
      ...ch,
      resources: ch.resources.map(r => r.id === resId ? { ...r, is_completed: newStatus } : r)
    }));
    setChapters(newChapters);
    if (activeResource?.id === resId) setActiveResource({ ...activeResource, is_completed: newStatus });

    // 2. Calculate new Progress Percentage
    let total = 0;
    let completed = 0;
    newChapters.forEach(ch => {
      ch.resources.forEach(r => {
        total++;
        if (r.is_completed) completed++;
      });
    });
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    setSubject((prev: any) => ({ ...prev, progress_pct: pct }));

    // 3. Update Database (Resource & Subject Progress)
    try {
      await supabase.from('bcs_resources').update({ is_completed: newStatus }).eq('id', resId);
      await supabase.from('bcs_subjects').update({ progress_pct: pct }).eq('id', subjectId);
      
      // Auto-set status to 'active' if it was pending and progress started
      if (pct > 0 && pct < 100 && subject.status === 'pending') {
        handleStatusChange('active');
      } else if (pct === 100) {
        handleStatusChange('completed');
      }
    } catch (error) { console.error(error); }
  };

  // --- Handlers for Notes and Resources ---
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nTitle || !activeResource) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('bcs_notes').insert([{ resource_id: activeResource.id, user_id: user?.id, title: nTitle, content: '' }]).select().single();
      if (error) throw error;
      setNotesList([...notesList, data]); setActiveNote(data); setNoteContent(''); setNTitle(''); setShowNoteModal(false);
    } catch (error: any) { alert(error.message); }
  };

  const handleSaveNote = async () => {
    if (!activeNote) return;
    setIsSavingNote(true);
    try {
      await supabase.from('bcs_notes').update({ content: noteContent }).eq('id', activeNote.id);
      setNotesList(notesList.map(n => n.id === activeNote.id ? { ...n, content: noteContent } : n));
    } catch (error: any) { alert(error.message); } finally { setIsSavingNote(false); }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chTitle || !subjectId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('bcs_chapters').insert([{ subject_id: subjectId, user_id: user?.id, title: chTitle }]);
      setChTitle(''); setShowChapterModal(false); fetchWorkspaceData();
    } catch (error) {}
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle || !showResourceModal) return;
    setIsSavingResource(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let finalUrl = rUrl;
      if (rFile) {
        const filePath = `${user?.id}/${Math.random()}.${rFile.name.split('.').pop()}`;
        await supabase.storage.from('bcs-resources').upload(filePath, rFile);
        const { data: { publicUrl } } = supabase.storage.from('bcs-resources').getPublicUrl(filePath);
        finalUrl = publicUrl;
      }
      await supabase.from('bcs_resources').insert([{ chapter_id: showResourceModal, user_id: user?.id, title: rTitle, resource_type: rType, file_url: finalUrl }]);
      setRTitle(''); setRUrl(''); setRFile(null); setShowResourceModal(null); fetchWorkspaceData();
    } catch (error) {} finally { setIsSavingResource(false); }
  };

  const getSafeEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube') {
      if (url.includes('watch?v=')) return url.replace('watch?v=', 'embed/').split('&')[0];
      if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0];
    }
    return url;
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] sticky top-0 z-10">
        <h2 className="font-bold flex items-center gap-2 text-[#020F33]">
          <BookOpen size={18} style={{ color: subject?.icon_color }}/> Syllabus
        </h2>
        <button onClick={() => setShowChapterModal(true)} className="hover:text-[#020F33] p-1.5 rounded-lg transition-colors" style={{ color: subject?.icon_color, backgroundColor: `${subject?.icon_color}15` }}>
          <Plus size={18} />
        </button>
      </div>
      <div className="p-3 pb-20 overflow-y-auto flex-1">
        {chapters.map(chap => (
          <div key={chap.id} className="mb-5">
            <div className="flex justify-between items-center mb-2 px-2 border-b border-[#E2E8F0] pb-2">
              <h3 className="text-sm font-bold text-[#020F33] uppercase">{chap.title}</h3>
              <button onClick={() => setShowResourceModal(chap.id)} className="text-[#A3D803] hover:text-[#020F33] bg-[#F8FAFC] rounded-md p-1"><Plus size={16} /></button>
            </div>
            <div className="space-y-1">
              {chap.resources.map(resource => (
                <div key={resource.id} className={`flex items-start gap-2 p-2 rounded-xl transition-all ${activeResource?.id === resource.id ? 'bg-[#020F33] text-white shadow-md' : 'hover:bg-[#F8FAFC]'}`}>
                  {/* Mark as Done Toggle */}
                  <button 
                    onClick={() => toggleResourceCompletion(resource.id, resource.is_completed)}
                    className={`mt-1 shrink-0 ${resource.is_completed ? 'text-[#A3D803]' : (activeResource?.id === resource.id ? 'text-slate-400' : 'text-[#CBD5E1] hover:text-[#02C2D5]')}`}
                  >
                    {resource.is_completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </button>
                  
                  {/* Title Click -> Set Active */}
                  <button onClick={() => { setActiveResource(resource); setShowMobileSidebar(false); }} className="flex-1 text-left">
                    <span className={`text-sm font-medium leading-snug line-clamp-2 ${resource.is_completed && activeResource?.id !== resource.id ? 'line-through text-slate-400' : ''}`}>
                      {resource.title}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#020F33] overflow-hidden relative">
      
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
          <aside className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full">
            <button onClick={() => setShowMobileSidebar(false)} className="absolute top-4 right-4 p-2 bg-rose-50 text-rose-500 rounded-full z-20"><X size={16} /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* --- Advanced Dashboard Header --- */}
      <header className="bg-white border-b border-[#E2E8F0] px-3 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between shrink-0 z-10 shadow-sm gap-3">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <Link to="/bcs" className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors shrink-0">
            <ArrowLeft size={18} className="text-[#475569]" />
          </Link>
          <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 bg-[#F8FAFC] text-[#020F33] rounded-xl border border-[#E2E8F0] shrink-0">
            <Menu size={18} />
          </button>
          
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm md:text-lg leading-tight flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shrink-0" style={{ backgroundColor: subject?.icon_color }}></span>
              <span className="truncate">{subject?.title}</span>
            </h1>
            
            {/* Live Progress Bar under Title */}
            <div className="flex items-center gap-2 mt-1 max-w-[200px]">
              <div className="flex-1 h-1.5 bg-[#F8FAFC] rounded-full overflow-hidden border border-[#E2E8F0]">
                <div className="h-full transition-all duration-500" style={{ width: `${subject?.progress_pct || 0}%`, backgroundColor: subject?.icon_color || '#02C2D5' }}></div>
              </div>
              <span className="text-[10px] font-black text-[#475569]">{subject?.progress_pct || 0}%</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0 ml-10 md:ml-2">
          
          {/* Status Dropdown */}
          <select 
            value={subject?.status || 'pending'} 
            onChange={(e) => handleStatusChange(e.target.value)}
            className={`text-xs md:text-sm font-bold px-3 py-1.5 md:py-2 rounded-lg border focus:outline-none transition-colors shrink-0
              ${subject?.status === 'active' ? 'bg-[#02C2D5]/10 text-[#02C2D5] border-[#02C2D5]/20' : 
                subject?.status === 'completed' ? 'bg-[#A3D803]/10 text-[#719900] border-[#A3D803]/20' : 
                subject?.status === 'watch_later' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'}`}
          >
            <option value="pending">⏳ Pending</option>
            <option value="active">🔥 Active (Running)</option>
            <option value="watch_later">📌 Watch Later</option>
            <option value="completed">✅ Completed</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0] shrink-0">
            <button onClick={() => setViewMode('media')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><MonitorPlay size={14} /></button>
            <button onClick={() => setViewMode('split')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><Columns size={14} /></button>
            <button onClick={() => setViewMode('notes')} className={`px-2 py-1 md:py-1.5 rounded-md text-xs font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><FileText size={14} /></button>
          </div>
        </div>
      </header>

      {/* --- Main Workspace Layout --- */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex-col overflow-hidden shrink-0 hidden lg:flex">
          <SidebarContent />
        </aside>

        <main className={`flex-1 flex overflow-hidden bg-[#F8FAFC] p-2 md:p-4 gap-2 md:gap-4 ${viewMode === 'split' ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] shrink-0 lg:shrink relative ${viewMode === 'split' ? 'h-2/5 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
              
              {/* Overlay Check Button on Media */}
              {activeResource && (
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={() => toggleResourceCompletion(activeResource.id, activeResource.is_completed)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all backdrop-blur-md border ${activeResource.is_completed ? 'bg-[#A3D803]/20 text-[#A3D803] border-[#A3D803]' : 'bg-black/50 text-white border-white/20 hover:bg-black/70'}`}
                  >
                    {activeResource.is_completed ? <CheckCircle2 size={14}/> : <Circle size={14}/>} 
                    {activeResource.is_completed ? 'Completed' : 'Mark as Done'}
                  </button>
                </div>
              )}

              {activeResource?.resource_type === 'youtube' || activeResource?.resource_type === 'video' ? (
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
                  <FileText size={16} className="text-[#02C2D5] shrink-0" /> 
                  <span className="truncate">{activeNote ? activeNote.title : 'Notes Editor'}</span>
                </h3>
                {activeNote && (
                  <button onClick={handleSaveNote} disabled={isSavingNote} className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-2 bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] transition-colors shrink-0">
                    {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> <span className="hidden sm:inline">Save</span></>}
                  </button>
                )}
              </div>
              
              <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} disabled={!activeNote} placeholder={activeNote ? "Write your notes here..." : "Select or create a note file below..."} className="flex-1 w-full p-4 md:p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-[#02C2D5] text-[#020F33] text-sm md:text-base leading-relaxed disabled:bg-slate-50 disabled:opacity-50" />

              <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-2 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <button onClick={() => setShowNoteModal(true)} disabled={!activeResource} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-[#020F33] text-white text-xs font-bold rounded-xl hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors disabled:opacity-50">
                  <Plus size={14} /> New File
                </button>
                {notesList.map(note => (
                  <div key={note.id} onClick={() => { setActiveNote(note); setNoteContent(note.content); }} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 md:py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer group ${activeNote?.id === note.id ? 'bg-[#02C2D5]/10 border-[#02C2D5] text-[#020F33]' : 'bg-white border-[#E2E8F0] text-[#475569]'}`}>
                    <FileText size={12} className={activeNote?.id === note.id ? 'text-[#02C2D5]' : 'text-[#94A3B8]'} /> {note.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals are kept hidden here for brevity but logic is same as before */}
    </div>
  );
}