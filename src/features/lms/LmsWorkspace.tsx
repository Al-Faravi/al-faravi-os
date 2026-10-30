import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Loader2, Plus, FolderOpen, FileText, 
  Database, ChevronDown, ChevronUp, Trash2, 
  PlayCircle, UploadCloud, LayoutTemplate, 
  MonitorPlay, ExternalLink, ShieldAlert,
  Bold, Italic, List, ListOrdered, Baseline, 
  Calculator, Sigma, AlignLeft, X, Menu, Edit2
} from 'lucide-react';

export default function LmsWorkspace() {
  const { id } = useParams();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mobile Navigation & Responsive States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'notes' | 'materials' | 'syllabus'>('notes');

  // Active Topic States
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [topicResources, setTopicResources] = useState<any[]>([]);
  const [savingContent, setSavingContent] = useState(false);

  // Multi-Tab Notes States
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  
  // Floating Calculator State
  const [showCalculator, setShowCalculator] = useState(false);

  // Viewer State (In-App Player)
  const [previewResource, setPreviewResource] = useState<any>(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  // New Resource States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [resType, setResType] = useState('video_link');
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const { data: c } = await supabase.from('lms_courses').select('*').eq('id', id).single();
      if (c) setCourse(c);

      const { data: mods } = await supabase.from('lms_modules').select('*').eq('course_id', id).order('order_index');
      if (mods && mods.length > 0) {
        const { data: tops } = await supabase.from('lms_topics').select('*').in('module_id', mods.map(m => m.id)).order('order_index');
        const assembledModules = mods.map(m => ({
          ...m,
          topics: (tops || []).filter(t => t.module_id === m.id)
        }));
        setModules(assembledModules);
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ================= MODULE & TOPIC CRUD =================
  const addModule = async () => {
    const title = prompt("Enter Module / Phase Name:");
    if (!title) return;
    await supabase.from('lms_modules').insert([{ course_id: id, title, order_index: modules.length }]);
    fetchCourseData();
  };

  const addTopic = async (moduleId: string, currentTopicCount: number) => {
    const title = prompt("Enter Topic / Chapter Name:");
    if (!title) return;
    await supabase.from('lms_topics').insert([{ module_id: moduleId, title, order_index: currentTopicCount }]);
    fetchCourseData();
  };

  const deleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this entire module and all its topics?")) return;
    await supabase.from('lms_modules').delete().eq('id', moduleId);
    fetchCourseData();
  };

  const deleteTopic = async (topicId: string) => {
    if (!window.confirm("Delete this topic?")) return;
    await supabase.from('lms_topics').delete().eq('id', topicId);
    if (activeTopic?.id === topicId) setActiveTopic(null);
    fetchCourseData();
  };

  const moveModule = async (index: number, direction: 'up'|'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === modules.length - 1) return;
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newModules[index];
    newModules[index] = newModules[targetIndex];
    newModules[targetIndex] = temp;
    setModules(newModules); 
    const updates = newModules.map((m, i) => ({ id: m.id, order_index: i }));
    await supabase.from('lms_modules').upsert(updates);
  };

  const moveTopic = async (moduleIndex: number, topicIndex: number, direction: 'up'|'down') => {
    const mod = modules[moduleIndex];
    if (direction === 'up' && topicIndex === 0) return;
    if (direction === 'down' && topicIndex === mod.topics.length - 1) return;
    const newTopics = [...mod.topics];
    const targetIndex = direction === 'up' ? topicIndex - 1 : topicIndex + 1;
    const temp = newTopics[topicIndex];
    newTopics[topicIndex] = newTopics[targetIndex];
    newTopics[targetIndex] = temp;
    const newModules = [...modules];
    newModules[moduleIndex].topics = newTopics;
    setModules(newModules);
    const updates = newTopics.map((t, i) => ({ id: t.id, order_index: i }));
    await supabase.from('lms_topics').upsert(updates);
  };

  // ================= ACTIVE TOPIC WORKSPACE =================
  const openTopicPanel = async (topic: any) => {
    setActiveTopic(topic);
    setPreviewResource(null);
    setShowCalculator(false);
    setIsSidebarOpen(false);
    
    let parsedNotes = [];
    try {
      parsedNotes = JSON.parse(topic.content);
      if (!Array.isArray(parsedNotes)) throw new Error();
    } catch {
      parsedNotes = [{ id: Date.now().toString(), title: 'Main Note', body: topic.content || '' }];
    }
    setNotes(parsedNotes);
    setActiveNoteId(parsedNotes[0]?.id);
    
    const { data } = await supabase.from('lms_resources').select('*').eq('topic_id', topic.id).order('created_at');
    if (data) {
      setTopicResources(data);
      if (data.length > 0) {
        setPreviewResource(data[0]);
        setIframeLoading(true);
      }
    }
  };

  const saveTopicNotes = async () => {
    setSavingContent(true);
    const stringifiedNotes = JSON.stringify(notes);
    await supabase.from('lms_topics').update({ content: stringifiedNotes }).eq('id', activeTopic.id);
    const updatedModules = modules.map(m => ({
      ...m, topics: m.topics.map((t: any) => t.id === activeTopic.id ? { ...t, content: stringifiedNotes } : t)
    }));
    setModules(updatedModules);
    setSavingContent(false);
  };

  const addNewNote = () => {
    const newNote = { id: Date.now().toString(), title: `Note ${notes.length + 1}`, body: '' };
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
  };

  const renameNote = (id: string) => {
    const currentName = notes.find(n => n.id === id)?.title;
    const newName = prompt("Rename note tab:", currentName);
    if (newName) setNotes(notes.map(n => n.id === id ? { ...n, title: newName } : n));
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this note tab?")) return;
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    if (activeNoteId === id) setActiveNoteId(filtered[0]?.id || '');
  };

  const updateActiveNoteBody = (html: string) => {
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, body: html } : n));
  };

  const handleFileUpload = async (selectedFile: File) => {
    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('bcs_vault').upload(`lms_materials/${fileName}`, selectedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('bcs_vault').getPublicUrl(`lms_materials/${fileName}`);
      setResUrl(publicUrl);
      setFile(selectedFile);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle || !resUrl) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    const newRes = { user_id: user?.id, course_id: id, topic_id: activeTopic.id, title: resTitle, resource_type: resType, url: resUrl };
    const { data } = await supabase.from('lms_resources').insert([newRes]).select().single();
    if (data) {
      setTopicResources([...topicResources, data]);
      setPreviewResource(data);
      setIframeLoading(true);
    }
    setResTitle(''); setResUrl(''); setFile(null);
  };

  const deleteResource = async (resId: string) => {
    await supabase.from('lms_resources').delete().eq('id', resId);
    if (previewResource?.id === resId) setPreviewResource(null);
    const { data } = await supabase.from('lms_resources').select('*').eq('topic_id', activeTopic.id).order('created_at');
    if (data) setTopicResources(data);
  };

  const getEmbedInfo = (rawUrl: string, type: string) => {
    if (type === 'video_link' && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be'))) {
      const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
      if (ytMatch && ytMatch[1]) return { canEmbed: true, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
    }
    if (type === 'video_link' && rawUrl.includes('facebook.com')) {
      return { canEmbed: false, reason: 'Facebook blocks inline viewing.', embedUrl: rawUrl };
    }
    if (type === 'drive_link') {
      const driveEmbedUrl = rawUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
      return { canEmbed: true, embedUrl: driveEmbedUrl };
    }
    return { canEmbed: true, embedUrl: rawUrl };
  };

  const renderSyllabusList = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      {modules.map((module, mIdx) => (
        <div key={module.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-100 border-b border-slate-200 p-3 flex justify-between items-center group">
            <h2 className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
              <FolderOpen size={14} className="text-[#9333EA] shrink-0" /> 
              <span className="truncate">{module.title}</span>
            </h2>
            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => moveModule(mIdx, 'up')} className="text-slate-400 hover:text-[#9333EA] p-0.5"><ChevronUp size={14}/></button>
              <button onClick={() => moveModule(mIdx, 'down')} className="text-slate-400 hover:text-[#9333EA] p-0.5"><ChevronDown size={14}/></button>
              <button onClick={() => deleteModule(module.id)} className="text-slate-400 hover:text-rose-500 ml-1 p-0.5"><Trash2 size={12}/></button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {module.topics.map((topic: any, tIdx: number) => (
              <div key={topic.id} 
                onClick={() => {
                  openTopicPanel(topic);
                  if (mobileActiveTab === 'syllabus') setMobileActiveTab('notes');
                }}
                className={`p-3 flex justify-between items-center cursor-pointer transition-colors group ${activeTopic?.id === topic.id ? 'bg-[#9333EA]/10 border-l-4 border-[#9333EA]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                <div className="flex items-center gap-2 truncate pr-2">
                  <LayoutTemplate size={14} className={activeTopic?.id === topic.id ? 'text-[#9333EA] shrink-0' : 'text-slate-400 shrink-0'} />
                  <span className={`text-xs font-bold truncate ${activeTopic?.id === topic.id ? 'text-[#020F33]' : 'text-slate-600'}`}>{topic.title}</span>
                </div>
                <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => moveTopic(mIdx, tIdx, 'up')} className="text-slate-400 hover:text-[#9333EA] p-0.5"><ChevronUp size={12}/></button>
                  <button onClick={() => moveTopic(mIdx, tIdx, 'down')} className="text-slate-400 hover:text-[#9333EA] p-0.5"><ChevronDown size={12}/></button>
                  <button onClick={() => deleteTopic(topic.id)} className="text-slate-400 hover:text-rose-500 p-0.5"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
            <button onClick={() => addTopic(module.id, module.topics.length)} className="w-full p-2.5 text-[10px] uppercase font-bold text-slate-400 hover:text-[#9333EA] hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors">
              <Plus size={12} /> Add Topic
            </button>
          </div>
        </div>
      ))}
      <button onClick={addModule} className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-[#9333EA] hover:text-[#9333EA] hover:bg-white transition-all flex items-center justify-center gap-2">
        <Plus size={14} /> New Module
      </button>
    </div>
  );

  if (loading) return <div className="h-[100dvh] w-full flex items-center justify-center"><Loader2 className="animate-spin text-[#9333EA]" size={40} /></div>;
  if (!course) return <div className="text-center py-20 text-slate-500 font-bold">Course not found.</div>;

  return (
    <div className="h-[100dvh] w-full flex flex-col lg:flex-row overflow-hidden bg-white relative">
      
      {/* ================= MOBILE & TABLET TOP HEADER (10MS Style) ================= */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-700 hover:text-[#9333EA] active:scale-95 transition-transform">
            <Menu size={22} />
          </button>
          <div className="overflow-hidden">
            <h1 className="text-sm font-black text-[#020F33] truncate max-w-[220px] leading-tight">{course.title}</h1>
            {activeTopic && (
              <p className="text-[11px] font-bold text-[#9333EA] truncate">{activeTopic.title}</p>
            )}
          </div>
        </div>
        <Link to="/lms" className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#020F33] bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      {/* ================= MOBILE SLIDE-OVER DRAWER OVERLAY ================= */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-[#020F33]/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ================= LEFT SIDEBAR ================= */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-[320px] lg:w-[320px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-start">
          <div className="overflow-hidden pr-2">
            <Link to="/lms" className="hidden lg:inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#020F33] transition-colors mb-3">
              <ArrowLeft size={14} /> Back to LMS Hub
            </Link>
            <h1 className="text-lg lg:text-xl font-black text-[#020F33] leading-snug truncate">{course.title}</h1>
            <p className="text-[10px] font-bold text-[#9333EA] uppercase tracking-widest mt-1">Course Content</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:text-rose-500 bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        {renderSyllabusList()}
      </div>

      {/* ================= RIGHT SIDE: FULL SCREEN WORKSPACE ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        {!activeTopic ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <MonitorPlay size={64} className="mb-4 opacity-50 text-[#9333EA]" />
            <h2 className="text-xl font-bold text-slate-600 mb-2">LMS Theater Mode</h2>
            <p className="text-sm max-w-xs">Select a topic from the syllabus to start studying.</p>
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mt-6 bg-[#020F33] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#9333EA] hover:text-white transition-colors">
              Open Course Syllabus
            </button>
          </div>
        ) : (
          <>
            <div className="hidden lg:flex bg-white border-b border-slate-200 px-6 py-4 justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[#9333EA] uppercase tracking-wider">Active Workspace</span>
                <h2 className="text-lg font-black text-[#020F33]">{activeTopic.title}</h2>
              </div>
              {previewResource && (
                <a href={previewResource.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#9333EA] hover:underline flex items-center gap-1">
                  <ExternalLink size={14} /> Open Original
                </a>
              )}
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
              {/* ---------------- THEATER VIEWER ---------------- */}
              <div className="w-full h-[220px] sm:h-[300px] lg:h-full lg:flex-[2] xl:flex-[3] bg-[#0B1120] relative flex items-center justify-center overflow-hidden shrink-0 border-b lg:border-b-0">
                {!previewResource ? (
                  <div className="text-center text-slate-500 p-4">
                    <PlayCircle size={40} className="mx-auto mb-2 opacity-30 lg:w-12 lg:h-12" />
                    <p className="font-bold text-sm lg:text-base">No Resource Selected</p>
                    <p className="text-[11px] lg:text-xs mt-1">Select or add a video/PDF from the Materials section.</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const { canEmbed, reason, embedUrl } = getEmbedInfo(previewResource.url, previewResource.resource_type);
                      if (!canEmbed) {
                        return (
                          <div className="text-center p-6 max-w-md">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <ShieldAlert size={28} className="text-slate-400" />
                            </div>
                            <h3 className="text-base lg:text-xl font-black text-white mb-1">External Content</h3>
                            <p className="text-slate-400 text-xs lg:text-sm mb-4">{reason}</p>
                            <a href={previewResource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#9333EA] text-white px-5 py-2 rounded-lg font-bold text-xs lg:text-sm hover:bg-white hover:text-[#020F33] transition-colors">
                              <ExternalLink size={16} /> Open in New Tab
                            </a>
                          </div>
                        );
                      }
                      return (
                        <>
                          {iframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1120] z-10">
                              <Loader2 className="animate-spin text-[#9333EA] mb-2" size={36} />
                            </div>
                          )}
                          <iframe 
                            src={previewResource.resource_type === 'pdf' ? `${embedUrl}#toolbar=0` : embedUrl} 
                            onLoad={() => setIframeLoading(false)}
                            className="w-full h-full border-none bg-white" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Resource Viewer"
                          />
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* ---------------- MOBILE 10MS TAB SWITCHER ---------------- */}
              <div className="lg:hidden flex border-b border-slate-200 bg-white shrink-0 z-20">
                <button 
                  onClick={() => setMobileActiveTab('notes')}
                  className={`flex-1 py-2.5 text-xs font-black border-b-2 transition-colors flex items-center justify-center gap-1.5 ${mobileActiveTab === 'notes' ? 'border-[#9333EA] text-[#020F33] bg-[#9333EA]/5' : 'border-transparent text-slate-500'}`}
                >
                  <AlignLeft size={14} /> Notes ({notes.length})
                </button>
                <button 
                  onClick={() => setMobileActiveTab('materials')}
                  className={`flex-1 py-2.5 text-xs font-black border-b-2 transition-colors flex items-center justify-center gap-1.5 ${mobileActiveTab === 'materials' ? 'border-[#9333EA] text-[#020F33] bg-[#9333EA]/5' : 'border-transparent text-slate-500'}`}
                >
                  <Database size={14} /> Materials ({topicResources.length})
                </button>
                <button 
                  onClick={() => setMobileActiveTab('syllabus')}
                  className={`flex-1 py-2.5 text-xs font-black border-b-2 transition-colors flex items-center justify-center gap-1.5 ${mobileActiveTab === 'syllabus' ? 'border-[#9333EA] text-[#020F33] bg-[#9333EA]/5' : 'border-transparent text-slate-500'}`}
                >
                  <FolderOpen size={14} /> Syllabus
                </button>
              </div>

              {/* ---------------- TOOLS PANEL (Resources & Notes) ---------------- */}
              <div className="flex-1 lg:flex-none lg:w-[400px] xl:w-[450px] shrink-0 bg-white lg:border-l border-slate-200 flex flex-col overflow-hidden shadow-[-4px_0_15px_rgba(0,0,0,0.03)] relative z-20">
                
                {mobileActiveTab === 'syllabus' && (
                  <div className="lg:hidden flex-1 flex flex-col overflow-hidden bg-slate-50">
                    {renderSyllabusList()}
                  </div>
                )}

                {/* Resources Area */}
                <div className={`${mobileActiveTab === 'materials' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'} flex-col border-b border-slate-200 bg-slate-50 shrink-0 overflow-hidden`}>
                  <div className="p-4 flex-1 lg:max-h-[220px] overflow-y-auto custom-scrollbar">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <Database size={12}/> Attached Materials
                    </h3>
                    {topicResources.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium p-3 text-center border border-dashed border-slate-200 rounded-lg">No resources yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {topicResources.map(res => (
                          <div key={res.id} 
                            onClick={() => { setPreviewResource(res); setIframeLoading(true); }}
                            className={`flex justify-between items-center p-2.5 border rounded-lg cursor-pointer group transition-all
                              ${previewResource?.id === res.id ? 'bg-[#9333EA]/10 border-[#9333EA]' : 'bg-white border-slate-200 hover:border-[#9333EA]/50'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              {res.resource_type === 'pdf' ? <FileText size={14} className="text-rose-500 shrink-0"/> : <PlayCircle size={14} className="text-indigo-500 shrink-0"/>}
                              <span className={`text-xs font-bold truncate ${previewResource?.id === res.id ? 'text-[#9333EA]' : 'text-slate-700'}`}>{res.title}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteResource(res.id); }} className="text-slate-400 hover:text-rose-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Resource Form */}
                  <form onSubmit={handleAddResource} className="p-3 bg-white border-t border-slate-200 flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
                    <select value={resType} onChange={e => {setResType(e.target.value); setResUrl(''); setFile(null);}} className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] font-bold outline-none">
                      <option value="video_link">Video</option>
                      <option value="pdf">PDF</option>
                      <option value="drive_link">Drive Link</option>
                    </select>
                    {resType === 'pdf' ? (
                      <label className="flex-1 flex items-center justify-center gap-1 border border-dashed border-slate-300 bg-slate-50 rounded px-2 py-1.5 cursor-pointer hover:border-[#9333EA] min-w-[120px]">
                        {uploadingFile ? <Loader2 className="animate-spin" size={12} /> : <UploadCloud size={12} />}
                        <span className="text-[10px] font-bold text-slate-500 truncate">{file ? file.name : 'Choose File'}</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                      </label>
                    ) : (
                      <input type="url" required value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="Paste link URL..." className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-[#9333EA] min-w-[120px]" />
                    )}
                    <input type="text" required value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Title" className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[10px] outline-none focus:border-[#9333EA]" />
                    <button type="submit" disabled={uploadingFile} className="bg-[#020F33] text-white px-3 py-1.5 rounded hover:bg-[#9333EA] transition-colors"><Plus size={14}/></button>
                  </form>
                </div>

                {/* RICH MULTI-TAB NOTES AREA */}
                <div className={`${mobileActiveTab === 'notes' ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white overflow-hidden`}>
                  <div className="flex items-center bg-slate-100 overflow-x-auto border-b border-slate-200 custom-scrollbar shrink-0">
                    {notes.map(note => (
                      <div key={note.id} 
                        onClick={() => setActiveNoteId(note.id)}
                        onDoubleClick={() => renameNote(note.id)}
                        className={`group flex items-center gap-1.5 px-3.5 py-2.5 cursor-pointer border-r border-slate-200 min-w-max transition-colors
                          ${activeNoteId === note.id ? 'bg-white border-t-2 border-t-[#9333EA] text-[#020F33]' : 'text-slate-500 hover:bg-slate-50 border-t-2 border-t-transparent'}`}
                      >
                        <span className="text-[11px] font-black">{note.title}</span>
                        {activeNoteId === note.id && (
                          <button onClick={(e) => { e.stopPropagation(); renameNote(note.id); }} className="text-slate-300 hover:text-[#9333EA]">
                            <Edit2 size={10} />
                          </button>
                        )}
                        {notes.length > 1 && (
                          <button onClick={(e) => deleteNote(note.id, e)} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-slate-300 hover:text-rose-500">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={addNewNote} className="px-3.5 py-2.5 text-slate-400 hover:text-[#9333EA] hover:bg-slate-50 transition-colors">
                      <Plus size={14} />
                    </button>
                    
                    <div className="ml-auto px-2.5 shrink-0">
                      <button onClick={saveTopicNotes} disabled={savingContent} className="text-[10px] font-bold bg-[#020F33] text-white px-3 py-1.5 rounded hover:bg-[#9333EA] shadow-sm">
                        {savingContent ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>

                  {notes.map(note => note.id === activeNoteId && (
                    <RichEditor 
                      key={note.id} 
                      initialHtml={note.body} 
                      onChange={updateActiveNoteBody} 
                      onToggleCalc={() => setShowCalculator(!showCalculator)} 
                    />
                  ))}
                </div>

              </div>
              
              {/* FLOATING CALCULATOR */}
              {showCalculator && (
                <div className="fixed lg:absolute right-4 bottom-6 lg:right-[420px] xl:right-[470px] lg:bottom-10 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-4 w-64 z-50 animate-in slide-in-from-bottom-10 fade-in duration-200">
                  <FloatingCalculator onClose={() => setShowCalculator(false)} />
                </div>
              )}

            </div>
          </>
        )}
      </div>
      
    </div>
  );
}

// ================= FLOATING CALCULATOR UI =================
function FloatingCalculator({ onClose }: { onClose: () => void }) {
  const [calcInput, setCalcInput] = useState('');
  const handleBtn = (btn: string) => {
    if (btn === 'C') setCalcInput('');
    else if (btn === '=') {
      try {
        const sanitized = calcInput.replace(/[^0-9+\-*/().]/g, '');
        if (sanitized) setCalcInput(Function(`"use strict"; return (${sanitized})`)().toString());
      } catch(e) { setCalcInput('Error'); }
    } else setCalcInput(prev => prev === 'Error' ? btn : prev + btn);
  };
  const buttons = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-black text-slate-500 flex items-center gap-1"><Calculator size={14}/> Calculator</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-rose-500"><X size={14}/></button>
      </div>
      <div className="bg-slate-100 rounded-xl p-3 mb-3 text-right text-lg font-black text-[#020F33] overflow-hidden truncate h-12 flex items-center justify-end">{calcInput || '0'}</div>
      <div className="grid grid-cols-4 gap-2">
        {buttons.map(btn => (
          <button key={btn} onClick={() => handleBtn(btn)} className={`py-2 rounded-lg font-bold text-sm active:scale-95 ${btn === '=' ? 'col-span-2 bg-[#9333EA] text-white' : btn === 'C' ? 'text-rose-500 bg-rose-50' : ['/','*','-','+'].includes(btn) ? 'text-indigo-500 bg-indigo-50' : 'bg-white border text-slate-700 shadow-sm'}`}>{btn}</button>
        ))}
      </div>
    </div>
  );
}

// ================= CUSTOM RICH TEXT EDITOR COMPONENT =================
function RichEditor({ initialHtml, onChange, onToggleCalc }: { initialHtml: string, onChange: (html: string) => void, onToggleCalc: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showSymbols, setShowSymbols] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) editorRef.current.innerHTML = initialHtml;
  }, []);

  const handleFormat = (e: React.MouseEvent, cmd: string, val: string | undefined = undefined) => {
    e.preventDefault(); 
    document.execCommand(cmd, false, val);
    if(editorRef.current) { editorRef.current.focus(); onChange(editorRef.current.innerHTML); }
  };

  const insertSymbol = (e: React.MouseEvent, sym: string) => {
    e.preventDefault(); document.execCommand('insertText', false, sym);
    if(editorRef.current) onChange(editorRef.current.innerHTML);
    setShowSymbols(false);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-2 flex flex-wrap items-center gap-1 shadow-sm relative z-10 shrink-0">
        <button onMouseDown={(e) => handleFormat(e, 'bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 active:bg-slate-300"><Bold size={14}/></button>
        <button onMouseDown={(e) => handleFormat(e, 'italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 active:bg-slate-300"><Italic size={14}/></button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <button onMouseDown={(e) => handleFormat(e, 'insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 active:bg-slate-300"><List size={14}/></button>
        <button onMouseDown={(e) => handleFormat(e, 'insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 active:bg-slate-300"><ListOrdered size={14}/></button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <select onChange={(e) => { document.execCommand('fontSize', false, e.target.value); if(editorRef.current) { editorRef.current.focus(); onChange(editorRef.current.innerHTML); } }} className="text-[10px] font-bold border border-slate-200 rounded px-1.5 py-1 bg-white outline-none text-slate-700" defaultValue="3">
          <option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="6">Heading</option>
        </select>
        <div className="relative group flex items-center">
          <button onMouseDown={(e) => e.preventDefault()} className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center pointer-events-none relative z-10"><Baseline size={14}/></button>
          <input type="color" onMouseDown={(e) => e.preventDefault()} onChange={(e) => handleFormat(e as any, 'foreColor', e.target.value)} className="absolute opacity-0 inset-0 w-full h-full cursor-pointer z-20" />
        </div>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <div className="relative">
          <button onMouseDown={(e) => { e.preventDefault(); setShowSymbols(!showSymbols); }} className={`p-1.5 rounded text-slate-700 ${showSymbols ? 'bg-slate-200' : 'hover:bg-slate-200'}`}><Sigma size={14}/></button>
          {showSymbols && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-1 z-50 w-36">
              {['+', '-', '×', '÷', '=', '≠', '≈', '>', '<', '±', '√', 'π', 'θ', '∑', '∫', '∞'].map(sym => (
                <button key={sym} onMouseDown={(e) => insertSymbol(e, sym)} className="hover:bg-slate-100 rounded text-xs py-1.5 text-center font-black text-slate-700">{sym}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onToggleCalc} className="ml-auto p-1.5 bg-[#9333EA]/10 hover:bg-[#9333EA]/20 border border-[#9333EA]/30 rounded-lg text-[#9333EA] font-bold flex items-center gap-1.5"><Calculator size={14}/> <span className="text-[10px]">Open Calc</span></button>
      </div>
      <div ref={editorRef} contentEditable onInput={(e) => onChange(e.currentTarget.innerHTML)} className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#FDFCF7] outline-none text-slate-800 text-sm leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:cursor-text custom-scrollbar" style={{ minHeight: '200px' }} data-placeholder="Type your LMS notes here..." />
    </div>
  );
}