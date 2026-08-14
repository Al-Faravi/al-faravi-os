// src/features/workspace/WorkspaceCourseViewer.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, CheckCircle2, Save, Loader2, Target, 
  Layout, Menu, Circle, CheckCircle, Plus, X, Video, File
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
  
  // Multiple Notes States
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Add Resource States
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [targetModuleIndex, setTargetModuleIndex] = useState<number | null>(null);
  const [newResTitle, setNewResTitle] = useState('');
  const [newResType, setNewResType] = useState('youtube');
  const [newResUrl, setNewResUrl] = useState('');
  const [isAddingResource, setIsAddingResource] = useState(false);

  useEffect(() => {
    if (courseData) {
      if (courseData.content_data && courseData.content_data.modules) {
        setModules(courseData.content_data.modules);
        if (courseData.content_data.modules[0]?.contents?.[0]) {
          setActiveContent(courseData.content_data.modules[0].contents[0]);
        }
      }
      setLoading(false);
    }
  }, [courseData]);

  // Fetch all personal notes for active content
  useEffect(() => {
    if (activeContent) {
      fetchPersonalNotes(activeContent.id);
    }
  }, [activeContent]);

  // Update text area when active note changes
  useEffect(() => {
    if (activeNoteId && notes.length > 0) {
      const active = notes.find(n => n.id === activeNoteId);
      setNoteContent(active?.content_data?.text || '');
    } else {
      setNoteContent('');
    }
  }, [activeNoteId, notes]);

  const fetchPersonalNotes = async (contentId: string) => {
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    if (!user) return;
    
    const { data } = await workspaceSupabase
      .from('shared_contents')
      .select('*')
      .eq('content_type', 'personal_note')
      .eq('group_id', courseData.group_id)
      .filter('content_data->>contentId', 'eq', contentId)
      .filter('content_data->>userId', 'eq', user.id)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setNotes(data);
      if (!activeNoteId || !data.find(n => n.id === activeNoteId)) {
        setActiveNoteId(data[0].id);
      }
    } else {
      setNotes([]);
      setActiveNoteId(null);
    }
  };

  const handleCreateNewNote = async () => {
    if (!activeContent) return;
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    const newTitle = `Note ${notes.length + 1}`;
    
    const { data, error } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: courseData.group_id,
      title: newTitle,
      content_type: 'personal_note',
      content_data: { text: '', contentId: activeContent.id, userId: user?.id }
    }]).select().single();

    if (data) {
      setNotes([...notes, data]);
      setActiveNoteId(data.id);
    }
  };

  const handleSaveNote = async () => {
    if (!activeNoteId) return;
    setIsSavingNote(true);
    
    try {
      const { data: { user } } = await workspaceSupabase.auth.getUser();
      await workspaceSupabase.from('shared_contents')
        .update({ content_data: { text: noteContent, contentId: activeContent?.id, userId: user?.id } })
        .eq('id', activeNoteId);
        
      // Update local state
      setNotes(notes.map(n => n.id === activeNoteId ? { ...n, content_data: { ...n.content_data, text: noteContent } } : n));
    } catch (error: any) { 
      alert("Error saving note"); 
    } finally { 
      setIsSavingNote(false); 
    }
  };

  // --- Add Resource to Module Logic ---
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetModuleIndex === null || !newResTitle || !newResUrl) return;
    setIsAddingResource(true);

    const newContent: Content = {
      id: `res-${Date.now()}`,
      module_id: modules[targetModuleIndex].id,
      title: newResTitle,
      content_type: newResType,
      file_path_or_url: newResUrl,
      is_completed: false
    };

    const updatedModules = [...modules];
    if (!updatedModules[targetModuleIndex].contents) updatedModules[targetModuleIndex].contents = [];
    updatedModules[targetModuleIndex].contents.push(newContent);

    try {
      const updatedCourseData = { ...courseData.content_data, modules: updatedModules };
      
      // Update main row in Supabase
      const { error } = await workspaceSupabase.from('shared_contents')
        .update({ content_data: updatedCourseData })
        .eq('id', courseData.id);

      if (error) throw error;
      
      setModules(updatedModules);
      setIsAddResourceOpen(false);
      setNewResTitle('');
      setNewResUrl('');
    } catch (err) {
      alert("Error adding resource. You might not have permission to update this course.");
    } finally {
      setIsAddingResource(false);
    }
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
      mod.contents?.forEach(c => { total++; if (c.is_completed) completed++; });
    });
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    setCourse((prev: any) => ({ ...prev, progress_pct: pct }));
  };

  // --- Updated YouTube URL Embed Converter ---
  const getSafeEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    
    if (type === 'youtube' || url.includes('youtu')) {
      // এই Regex দুনিয়ার যেকোনো YouTube লিংক থেকে Video ID বের করতে পারে
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
      const match = url.match(regExp);
      
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
    }
    
    // পিডিএফ বা অন্যান্য ডিরেক্ট লিংকের জন্য
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
              <div className="flex justify-between items-center mb-2 px-2 border-b border-[#E2E8F0] pb-2 group">
                <h3 className="text-sm font-bold text-[#020F33] uppercase">{mod.title}</h3>
                {/* Add Resource Button */}
                <button 
                  onClick={() => { setTargetModuleIndex(mIdx); setIsAddResourceOpen(true); }} 
                  className="p-1 rounded bg-[#E2E8F0]/50 hover:bg-purple-100 text-[#475569] hover:text-purple-600 transition-colors"
                  title="Add Resource to Module"
                >
                  <Plus size={14}/>
                </button>
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
                    <button onClick={() => { setActiveContent(content); setShowMobileSidebar(false); }} className="flex-1 text-left flex items-start gap-2">
                      {content.content_type === 'pdf' ? <File size={16} className="shrink-0 mt-0.5 opacity-70"/> : <Video size={16} className="shrink-0 mt-0.5 opacity-70"/>}
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
      
      {/* Add Resource Modal */}
      {isAddResourceOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#020F33]/60 backdrop-blur-sm" onClick={() => setIsAddResourceOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl animate-in fade-in zoom-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg">Add Resource to Module</h3>
              <button onClick={() => setIsAddResourceOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase mb-1 block">Resource Title</label>
                <input type="text" value={newResTitle} onChange={(e)=>setNewResTitle(e.target.value)} placeholder="e.g. Extra Reference Video" className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none" required/>
              </div>
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase mb-1 block">Type</label>
                <select value={newResType} onChange={(e)=>setNewResType(e.target.value)} className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none">
                  <option value="youtube">YouTube Video</option>
                  <option value="video">Direct Video URL</option>
                  <option value="pdf">PDF Link</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#475569] uppercase mb-1 block">Link / URL</label>
                <input type="url" value={newResUrl} onChange={(e)=>setNewResUrl(e.target.value)} placeholder="https://..." className="w-full border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none" required/>
              </div>
              <button type="submit" disabled={isAddingResource} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">
                {isAddingResource ? 'Adding...' : 'Add Resource'}
              </button>
            </form>
          </div>
        </div>
      )}

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

      {/* Main Workspace Layout */}
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
              
              {/* Multiple Notes Tabs Header */}
              <div className="flex flex-col border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="p-2 md:p-3 flex justify-between items-center border-b border-[#E2E8F0]/50">
                  <h3 className="font-bold flex items-center gap-2 text-[#020F33] text-sm md:text-base">
                    <FileText size={16} className="text-purple-500" /> My Personal Notes
                  </h3>
                  <button onClick={handleSaveNote} disabled={isSavingNote || !activeNoteId} className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#020F33] hover:bg-purple-500 text-white transition-colors disabled:opacity-50">
                    {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save</>}
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="flex overflow-x-auto hide-scrollbar">
                  {notes.map((note, idx) => (
                    <button
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                        activeNoteId === note.id ? 'border-purple-500 text-purple-600 bg-purple-50/50' : 'border-transparent text-[#475569] hover:bg-[#E2E8F0]/30'
                      }`}
                    >
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
              
              <textarea 
                value={noteContent} 
                onChange={(e) => setNoteContent(e.target.value)} 
                disabled={!activeNoteId} 
                placeholder={activeNoteId ? "Write your notes here..." : (activeContent ? "Click '+ New Note' to start writing..." : "Select a lesson first...")} 
                className="flex-1 w-full p-4 md:p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-purple-500 text-[#020F33] text-sm md:text-base leading-relaxed disabled:bg-slate-50 disabled:opacity-50" 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}