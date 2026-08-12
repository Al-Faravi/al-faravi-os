import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, File, CheckCircle2, Save, Loader2, Plus,
  X, Link as LinkIcon, Target, BookOpen, Trash2
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
  
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [activeResource, setActiveResource] = useState<BcsResource | null>(null);
  
  // Notes States
  const [notesList, setNotesList] = useState<NoteFile[]>([]);
  const [activeNote, setActiveNote] = useState<NoteFile | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [nTitle, setNTitle] = useState('');

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

  // যখন কোনো ভিডিও/রিসোর্সে ক্লিক করা হবে, তখন তার সব নোটস ফেচ হবে
  useEffect(() => {
    if (activeResource) {
      fetchNotesForResource(activeResource.id);
    } else {
      setNotesList([]);
      setActiveNote(null);
      setNoteContent('');
    }
  }, [activeResource]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', subjectId).maybeSingle();
      setSubject(subjectData || { title: 'BCS Workspace', icon_color: '#02C2D5' });

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
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotesForResource = async (resId: string) => {
    try {
      const { data, error } = await supabase.from('bcs_notes').select('*').eq('resource_id', resId).order('created_at', { ascending: true });
      if (error) throw error;
      
      setNotesList(data || []);
      if (data && data.length > 0) {
        setActiveNote(data[0]);
        setNoteContent(data[0].content || '');
      } else {
        setActiveNote(null);
        setNoteContent('');
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    }
  };

  // --- CRUD For Notes ---
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nTitle || !activeResource) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('bcs_notes').insert([{
        resource_id: activeResource.id,
        user_id: user?.id,
        title: nTitle,
        content: ''
      }]).select().single();
      
      if (error) throw error;
      setNotesList([...notesList, data]);
      setActiveNote(data);
      setNoteContent('');
      setNTitle('');
      setShowNoteModal(false);
    } catch (error: any) {
      alert("Error creating note: " + error.message);
    }
  };

  const handleSaveNote = async () => {
    if (!activeNote) return;
    setIsSavingNote(true);
    try {
      const { error } = await supabase.from('bcs_notes').update({ content: noteContent }).eq('id', activeNote.id);
      if (error) throw error;
      
      // Update local list
      setNotesList(notesList.map(n => n.id === activeNote.id ? { ...n, content: noteContent } : n));
    } catch (error: any) {
      alert("Error saving note: " + error.message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note file?")) return;
    try {
      await supabase.from('bcs_notes').delete().eq('id', noteId);
      const newList = notesList.filter(n => n.id !== noteId);
      setNotesList(newList);
      if (activeNote?.id === noteId) {
        setActiveNote(newList[0] || null);
        setNoteContent(newList[0]?.content || '');
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- Handlers for Chapters and Resources ---
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

      await supabase.from('bcs_resources').insert([{
        chapter_id: showResourceModal, user_id: user?.id, title: rTitle, resource_type: rType, file_url: finalUrl
      }]);
      setRTitle(''); setRUrl(''); setRFile(null); setShowResourceModal(null); fetchWorkspaceData();
    } catch (error) {} finally { setIsSavingResource(false); }
  };

  const getResourceIcon = (type: string, isCompleted: boolean) => {
    if (isCompleted) return <CheckCircle2 size={16} />;
    if (type === 'youtube' || type === 'video') return <PlayCircle size={16} />;
    if (type === 'pdf' || type === 'doc') return <File size={16} />;
    return <LinkIcon size={16} />;
  };

  const getSafeEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (type === 'youtube') {
      if (url.includes('watch?v=')) return url.replace('watch?v=', 'embed/').split('&')[0];
      if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0];
    }
    return url;
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#020F33] overflow-hidden relative">
      {/* Header */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/bcs" className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors"><ArrowLeft size={20} className="text-[#475569]" /></Link>
          <div>
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: subject?.icon_color }}></span>
              {subject?.title}
            </h1>
          </div>
        </div>
        <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
          <button onClick={() => setViewMode('media')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><MonitorPlay size={16} /> Media</button>
          <button onClick={() => setViewMode('split')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><Columns size={16} /> Split</button>
          <button onClick={() => setViewMode('notes')} className={`p-2 rounded-md flex items-center gap-2 text-sm font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white' : 'text-[#475569]'}`}><FileText size={16} /> Notes</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Syllabus) */}
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col overflow-y-auto shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] sticky top-0 z-10">
            <h2 className="font-bold flex items-center gap-2"><BookOpen size={18} style={{ color: subject?.icon_color }}/> Syllabus</h2>
            <button onClick={() => setShowChapterModal(true)} className="hover:text-[#020F33] p-1.5 rounded-lg" style={{ color: subject?.icon_color, backgroundColor: `${subject?.icon_color}15` }}><Plus size={18} /></button>
          </div>
          <div className="p-3 pb-20">
            {chapters.map(chap => (
              <div key={chap.id} className="mb-5">
                <div className="flex justify-between items-center mb-2 px-2 border-b border-[#E2E8F0] pb-2">
                  <h3 className="text-sm font-bold text-[#020F33] uppercase">{chap.title}</h3>
                  <button onClick={() => setShowResourceModal(chap.id)} className="text-[#A3D803] hover:text-[#020F33] bg-[#F8FAFC] rounded-md p-1"><Plus size={16} /></button>
                </div>
                <div className="space-y-1">
                  {chap.resources.map(resource => (
                    <button key={resource.id} onClick={() => setActiveResource(resource)} className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all ${activeResource?.id === resource.id ? 'bg-[#020F33] text-white' : 'hover:bg-[#F8FAFC]'}`}>
                      <div className={`mt-0.5 ${activeResource?.id === resource.id ? 'text-[#02C2D5]' : 'text-[#475569]'}`}>{getResourceIcon(resource.resource_type, resource.is_completed)}</div>
                      <span className="text-sm font-medium leading-snug line-clamp-2">{resource.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#F8FAFC] p-4 gap-4">
          {/* Media Player Pane */}
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'md:w-1/2' : 'w-full'}`}>
              {activeResource?.resource_type === 'youtube' || activeResource?.resource_type === 'video' ? (
                <iframe className="w-full h-full min-h-[300px]" src={getSafeEmbedUrl(activeResource.file_url, activeResource.resource_type)} allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>
              ) : activeResource?.resource_type === 'pdf' ? (
                <iframe className="w-full h-full bg-white" src={activeResource.file_url}></iframe>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white p-6"><Target size={64} className="opacity-20 mb-4" /><p className="font-bold">Media Viewer</p></div>
              )}
            </div>
          )}

          {/* Notes Pane with File Terminal */}
          {(viewMode === 'split' || viewMode === 'notes') && (
            <div className={`flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'md:w-1/2' : 'w-full'}`}>
              
              {/* Notes Editor Header */}
              <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-[#020F33]"><FileText size={18} className="text-[#02C2D5]" /> {activeNote ? activeNote.title : 'Notes Editor'}</h3>
                </div>
                {activeNote && (
                  <button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] transition-colors">
                    {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Note</>}
                  </button>
                )}
              </div>
              
              {/* Text Area */}
              <textarea 
                value={noteContent} 
                onChange={(e) => setNoteContent(e.target.value)} 
                disabled={!activeNote} 
                placeholder={activeNote ? "Write your study notes here..." : "Select or create a note file below..."} 
                className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-[#02C2D5] text-[#020F33] leading-relaxed disabled:bg-slate-50 disabled:opacity-50" 
              />

              {/* Bottom Files Terminal */}
              <div className="h-16 bg-[#F8FAFC] border-t border-[#E2E8F0] p-2 flex items-center gap-2 overflow-x-auto">
                <button 
                  onClick={() => setShowNoteModal(true)} 
                  disabled={!activeResource}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#020F33] text-white text-xs font-bold rounded-xl hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors disabled:opacity-50"
                >
                  <Plus size={14} /> New File
                </button>
                
                {/* Render Note Chips */}
                {notesList.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => { setActiveNote(note); setNoteContent(note.content); }}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer group ${activeNote?.id === note.id ? 'bg-[#02C2D5]/10 border-[#02C2D5] text-[#020F33]' : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#02C2D5]'}`}
                  >
                    <FileText size={14} className={activeNote?.id === note.id ? 'text-[#02C2D5]' : 'text-[#94A3B8]'} /> 
                    {note.title}
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity ml-1">
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* New Note File Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4">
          <form onSubmit={handleCreateNote} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Create Note File</h3>
              <button type="button" onClick={() => setShowNoteModal(false)} className="text-[#475569] hover:text-rose-500"><X size={20}/></button>
            </div>
            <input type="text" required autoFocus value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="e.g. Math Shortcuts" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none font-medium" />
            <button type="submit" className="w-full bg-[#020F33] text-white py-3 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33]">Create File</button>
          </form>
        </div>
      )}

      {/* OTHER EXISTING MODALS (Chapter & Resource) - Kept brief for space, assume same as before */}
      {showChapterModal && ( /* Chapter Modal Code... */
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4">
          <form onSubmit={handleAddChapter} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Syllabus Chapter</h3>
              <button type="button" onClick={() => setShowChapterModal(false)} className="text-[#475569] hover:text-rose-500"><X size={20}/></button>
            </div>
            <input type="text" required autoFocus value={chTitle} onChange={e => setChTitle(e.target.value)} placeholder="e.g. প্রাচীন যুগ" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none" />
            <button type="submit" className="w-full bg-[#020F33] text-white py-3 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33]">Create Chapter</button>
          </form>
        </div>
      )}

      {showResourceModal && ( /* Resource Modal Code... */
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm flex justify-center items-center z-[999] p-4">
          <form onSubmit={handleAddResource} className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Study Material</h3>
              <button type="button" onClick={() => { setShowResourceModal(null); setRFile(null); }} className="text-[#475569] hover:text-rose-500"><X size={20}/></button>
            </div>
            <div className="space-y-4 mb-6">
              <div><label className="block text-xs font-bold text-[#475569] mb-1">Title</label><input type="text" required value={rTitle} onChange={e => setRTitle(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-[#475569] mb-1">Type</label><select value={rType} onChange={e => setRType(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5"><option value="youtube">YouTube</option><option value="pdf">PDF</option></select></div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#475569] mb-1">{rType === 'youtube' ? 'YouTube URL' : 'Upload File / URL'}</label>
                  {rType === 'youtube' ? <input type="url" required value={rUrl} onChange={e => setRUrl(e.target.value)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5" /> : 
                  <div className="flex flex-col gap-2">
                    <input type="file" onChange={e => setRFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:bg-[#020F33] file:text-white" />
                    <input type="url" value={rUrl} onChange={e => setRUrl(e.target.value)} placeholder="Or paste link..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm" />
                  </div>}
                </div>
              </div>
            </div>
            <button type="submit" disabled={isSavingResource} className="w-full bg-[#020F33] text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">{isSavingResource ? <Loader2 size={18} className="animate-spin"/> : 'Save Material'}</button>
          </form>
        </div>
      )}
    </div>
  );
}