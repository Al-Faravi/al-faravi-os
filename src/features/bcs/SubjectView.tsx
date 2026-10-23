import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Loader2, Plus, FolderOpen, FileText, 
  Database, ChevronDown, ChevronUp, Trash2, 
  PlayCircle, UploadCloud, LayoutTemplate, 
  MonitorPlay, ExternalLink, ShieldAlert,
  Bold, Italic, List, ListOrdered, Baseline, Calculator, Sigma, Type, AlignLeft
} from 'lucide-react';

export default function SubjectView() {
  const { id } = useParams();
  const [subject, setSubject] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Topic States
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [topicResources, setTopicResources] = useState<any[]>([]);
  const [savingContent, setSavingContent] = useState(false);

  // Multi-Tab Notes States
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');

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
    fetchSubjectData();
  }, [id]);

  const fetchSubjectData = async () => {
    setLoading(true);
    try {
      const { data: sub } = await supabase.from('bcs_subjects').select('*').eq('id', id).single();
      if (sub) setSubject(sub);

      const { data: mods } = await supabase.from('bcs_modules').select('*').eq('subject_id', id).order('order_index');
      if (mods && mods.length > 0) {
        const { data: tops } = await supabase.from('bcs_topics').select('*').in('module_id', mods.map(m => m.id)).order('order_index');
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
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('bcs_modules').insert([{ subject_id: id, title, order_index: modules.length }]);
    fetchSubjectData();
  };

  const addTopic = async (moduleId: string, currentTopicCount: number) => {
    const title = prompt("Enter Topic / Chapter Name:");
    if (!title) return;
    await supabase.from('bcs_topics').insert([{ module_id: moduleId, title, order_index: currentTopicCount }]);
    fetchSubjectData();
  };

  const deleteModule = async (moduleId: string) => {
    if (!window.confirm("Delete this entire module and all its topics?")) return;
    await supabase.from('bcs_modules').delete().eq('id', moduleId);
    fetchSubjectData();
  };

  const deleteTopic = async (topicId: string) => {
    if (!window.confirm("Delete this topic?")) return;
    await supabase.from('bcs_topics').delete().eq('id', topicId);
    if (activeTopic?.id === topicId) setActiveTopic(null);
    fetchSubjectData();
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
    await supabase.from('bcs_modules').upsert(updates);
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
    await supabase.from('bcs_topics').upsert(updates);
  };

  // ================= ACTIVE TOPIC WORKSPACE =================
  const openTopicPanel = async (topic: any) => {
    setActiveTopic(topic);
    setPreviewResource(null);
    
    // Parse Multi-Tab Notes JSON
    let parsedNotes = [];
    try {
      parsedNotes = JSON.parse(topic.content);
      if (!Array.isArray(parsedNotes)) throw new Error();
    } catch {
      // Fallback for old plain text
      parsedNotes = [{ id: Date.now().toString(), title: 'Main Note', body: topic.content || '' }];
    }
    setNotes(parsedNotes);
    setActiveNoteId(parsedNotes[0]?.id);
    
    // Fetch Resources
    const { data } = await supabase.from('bcs_resources').select('*').eq('topic_id', topic.id).order('created_at');
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
    await supabase.from('bcs_topics').update({ content: stringifiedNotes }).eq('id', activeTopic.id);
    const updatedModules = modules.map(m => ({
      ...m, topics: m.topics.map((t: any) => t.id === activeTopic.id ? { ...t, content: stringifiedNotes } : t)
    }));
    setModules(updatedModules);
    setSavingContent(false);
  };

  // --- Note Tab Helpers ---
  const addNewNote = () => {
    const newNote = { id: Date.now().toString(), title: `Note ${notes.length + 1}`, body: '' };
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
  };

  const renameNote = (id: string) => {
    const currentName = notes.find(n => n.id === id)?.title;
    const newName = prompt("Rename note tab:", currentName);
    if (newName) {
      setNotes(notes.map(n => n.id === id ? { ...n, title: newName } : n));
    }
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


  // ================= RESOURCES =================
  const handleFileUpload = async (selectedFile: File) => {
    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('bcs_vault').upload(`bcs_materials/${fileName}`, selectedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('bcs_vault').getPublicUrl(`bcs_materials/${fileName}`);
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
    
    const newRes = {
      user_id: user?.id,
      subject_id: id,
      topic_id: activeTopic.id,
      title: resTitle,
      resource_type: resType,
      url: resUrl
    };

    const { data } = await supabase.from('bcs_resources').insert([newRes]).select().single();
    if (data) {
      setTopicResources([...topicResources, data]);
      setPreviewResource(data);
      setIframeLoading(true);
    }

    setResTitle(''); setResUrl(''); setFile(null);
  };

  const deleteResource = async (resId: string) => {
    await supabase.from('bcs_resources').delete().eq('id', resId);
    if (previewResource?.id === resId) setPreviewResource(null);
    const { data } = await supabase.from('bcs_resources').select('*').eq('topic_id', activeTopic.id).order('created_at');
    if (data) setTopicResources(data);
  };

  // --- SMART PREVIEW HELPERS ---
  const getEmbedInfo = (rawUrl: string, type: string) => {
    if (type === 'video_link' && (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be'))) {
      const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
      if (ytMatch && ytMatch[1]) return { canEmbed: true, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
    }
    if (type === 'video_link' && rawUrl.includes('facebook.com')) {
      return { canEmbed: false, reason: 'Facebook blocks inline viewing. Open securely via the button below.', embedUrl: rawUrl };
    }
    if (type === 'drive_link') {
      const driveEmbedUrl = rawUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
      return { canEmbed: true, embedUrl: driveEmbedUrl };
    }
    return { canEmbed: true, embedUrl: rawUrl };
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;
  if (!subject) return <div className="text-center py-20 text-slate-500 font-bold">Subject not found.</div>;

  return (
    <div className="h-[100vh] w-full flex overflow-hidden bg-white">
      
      {/* ================= LEFT SIDEBAR ================= */}
      <div className="w-[320px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden hidden md:flex">
        
        <div className="p-4 border-b border-slate-200 bg-white">
          <Link to="/bcs" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#020F33] transition-colors mb-3">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-xl font-black text-[#020F33] leading-snug">{subject.title}</h1>
          <p className="text-[10px] font-bold text-[#02C2D5] uppercase tracking-widest mt-1">Course Content</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {modules.map((module, mIdx) => (
            <div key={module.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 border-b border-slate-200 p-3 flex justify-between items-center group">
                <h2 className="text-xs font-black text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                  <FolderOpen size={14} className="text-[#02C2D5]" /> {module.title}
                </h2>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveModule(mIdx, 'up')} className="text-slate-400 hover:text-[#02C2D5]"><ChevronUp size={14}/></button>
                  <button onClick={() => moveModule(mIdx, 'down')} className="text-slate-400 hover:text-[#02C2D5]"><ChevronDown size={14}/></button>
                  <button onClick={() => deleteModule(module.id)} className="text-slate-400 hover:text-rose-500 ml-1"><Trash2 size={12}/></button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {module.topics.map((topic: any, tIdx: number) => (
                  <div key={topic.id} 
                    onClick={() => openTopicPanel(topic)}
                    className={`p-3 flex justify-between items-center cursor-pointer transition-colors group ${activeTopic?.id === topic.id ? 'bg-[#02C2D5]/10 border-l-4 border-[#02C2D5]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                    <div className="flex items-center gap-2 truncate pr-2">
                      <LayoutTemplate size={14} className={activeTopic?.id === topic.id ? 'text-[#02C2D5]' : 'text-slate-400'} />
                      <span className={`text-xs font-bold truncate ${activeTopic?.id === topic.id ? 'text-[#020F33]' : 'text-slate-600'}`}>{topic.title}</span>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => moveTopic(mIdx, tIdx, 'up')} className="text-slate-400 hover:text-[#02C2D5] p-0.5"><ChevronUp size={12}/></button>
                      <button onClick={() => moveTopic(mIdx, tIdx, 'down')} className="text-slate-400 hover:text-[#02C2D5] p-0.5"><ChevronDown size={12}/></button>
                      <button onClick={() => deleteTopic(topic.id)} className="text-slate-400 hover:text-rose-500 p-0.5"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addTopic(module.id, module.topics.length)} className="w-full p-2.5 text-[10px] uppercase font-bold text-slate-400 hover:text-[#02C2D5] hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors">
                  <Plus size={12} /> Add Chapter
                </button>
              </div>
            </div>
          ))}
          <button onClick={addModule} className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold hover:border-[#02C2D5] hover:text-[#02C2D5] hover:bg-white transition-all flex items-center justify-center gap-2">
            <Plus size={14} /> New Phase / Module
          </button>
        </div>
      </div>


      {/* ================= RIGHT SIDE: FULL SCREEN WORKSPACE ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        {!activeTopic ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MonitorPlay size={64} className="mb-4 opacity-50 text-[#02C2D5]" />
            <h2 className="text-xl font-bold text-slate-600 mb-2">Theater Learning Mode</h2>
            <p className="text-sm">Select a topic from the syllabus on the left to start studying.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[#02C2D5] uppercase tracking-wider">Active Workspace</span>
                <h2 className="text-lg font-black text-[#020F33]">{activeTopic.title}</h2>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              
              {/* ---------------- THEATER VIEWER ---------------- */}
              <div className="flex-[2] xl:flex-[3] bg-[#0B1120] relative flex items-center justify-center overflow-hidden">
                {!previewResource ? (
                  <div className="text-center text-slate-500">
                    <PlayCircle size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-bold">No Resource Selected</p>
                    <p className="text-xs mt-1">Select a video or PDF from the right panel to view it here.</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const { canEmbed, reason, embedUrl } = getEmbedInfo(previewResource.url, previewResource.resource_type);
                      if (!canEmbed) {
                        return (
                          <div className="text-center p-8 max-w-md">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                              <ShieldAlert size={32} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">External Content</h3>
                            <p className="text-slate-400 text-sm mb-6">{reason}</p>
                            <a href={previewResource.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#02C2D5] text-[#020F33] px-6 py-2.5 rounded-lg font-bold hover:bg-white transition-colors">
                              <ExternalLink size={18} /> Open in New Tab
                            </a>
                          </div>
                        );
                      }
                      return (
                        <>
                          {iframeLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1120] z-10">
                              <Loader2 className="animate-spin text-[#02C2D5] mb-4" size={40} />
                            </div>
                          )}
                          <iframe 
                            src={previewResource.resource_type === 'pdf' ? `${embedUrl}#toolbar=0` : embedUrl} 
                            onLoad={() => setIframeLoading(false)}
                            className="w-full h-full border-none bg-white" 
                            allowFullScreen
                          />
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* ---------------- TOOLS PANEL (Resources & Notes) ---------------- */}
              <div className="w-[400px] xl:w-[450px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-[-4px_0_15px_rgba(0,0,0,0.03)]">
                
                {/* 1. Resources Area */}
                <div className="max-h-[40%] flex flex-col border-b border-slate-200 bg-slate-50">
                  <div className="p-4 flex-1 overflow-y-auto">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <Database size={12}/> Attached Materials
                    </h3>
                    {topicResources.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium p-2">No resources yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {topicResources.map(res => (
                          <div key={res.id} 
                            onClick={() => { setPreviewResource(res); setIframeLoading(true); }}
                            className={`flex justify-between items-center p-2.5 border rounded-lg cursor-pointer group transition-all
                              ${previewResource?.id === res.id ? 'bg-[#02C2D5]/10 border-[#02C2D5]' : 'bg-white border-slate-200 hover:border-[#02C2D5]/50'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                              {res.resource_type === 'pdf' ? <FileText size={14} className="text-rose-500 shrink-0"/> : <PlayCircle size={14} className="text-indigo-500 shrink-0"/>}
                              <span className={`text-xs font-bold truncate ${previewResource?.id === res.id ? 'text-[#02C2D5]' : 'text-slate-700'}`}>{res.title}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteResource(res.id); }} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Resource Form (Compact) */}
                  <form onSubmit={handleAddResource} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                    <select value={resType} onChange={e => {setResType(e.target.value); setResUrl(''); setFile(null);}} className="bg-slate-50 border border-slate-200 rounded px-2 text-[10px] font-bold outline-none">
                      <option value="video_link">Video</option>
                      <option value="pdf">PDF</option>
                    </select>
                    {resType === 'pdf' ? (
                      <label className="flex-1 flex items-center justify-center gap-1 border border-dashed border-slate-300 bg-slate-50 rounded px-2 cursor-pointer">
                        {uploadingFile ? <Loader2 className="animate-spin" size={12} /> : <UploadCloud size={12} />}
                        <span className="text-[10px] font-bold text-slate-500 truncate">{file ? file.name : 'Choose File'}</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                      </label>
                    ) : (
                      <input type="url" required value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="URL..." className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 text-xs outline-none" />
                    )}
                    <input type="text" required value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Title" className="w-20 bg-slate-50 border border-slate-200 rounded px-2 text-[10px] outline-none" />
                    <button type="submit" disabled={uploadingFile} className="bg-[#020F33] text-white px-2 rounded hover:bg-[#02C2D5]"><Plus size={14}/></button>
                  </form>
                </div>

                {/* 2. RICH MULTI-TAB NOTES AREA */}
                <div className="flex-1 flex flex-col bg-white">
                  
                  {/* Tabs Row */}
                  <div className="flex items-center bg-slate-100 overflow-x-auto border-b border-slate-200">
                    {notes.map(note => (
                      <div key={note.id} 
                        onClick={() => setActiveNoteId(note.id)}
                        onDoubleClick={() => renameNote(note.id)}
                        className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r border-slate-200 min-w-max transition-colors
                          ${activeNoteId === note.id ? 'bg-white border-t-2 border-t-[#02C2D5] text-[#020F33]' : 'text-slate-500 hover:bg-slate-50 border-t-2 border-t-transparent'}`}
                      >
                        <span className="text-[11px] font-black">{note.title}</span>
                        {notes.length > 1 && (
                          <button onClick={(e) => deleteNote(note.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={addNewNote} className="px-4 py-2.5 text-slate-400 hover:text-[#02C2D5] hover:bg-slate-50 transition-colors">
                      <Plus size={14} />
                    </button>
                    
                    <div className="ml-auto px-3">
                      <button onClick={saveTopicNotes} disabled={savingContent} className="text-[10px] font-bold bg-[#020F33] text-white px-3 py-1.5 rounded hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors shadow-sm">
                        {savingContent ? 'Saving...' : 'Save Notes'}
                      </button>
                    </div>
                  </div>

                  {/* Rich Text Editor Component for Active Note */}
                  {notes.map(note => note.id === activeNoteId && (
                    <RichEditor key={note.id} initialHtml={note.body} onChange={updateActiveNoteBody} />
                  ))}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
      
    </div>
  );
}

// ================= CUSTOM RICH TEXT & MATH EDITOR COMPONENT =================
function RichEditor({ initialHtml, onChange }: { initialHtml: string, onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, []);

  const exec = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if(editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertText = (text: string) => {
    document.execCommand('insertText', false, text);
    if(editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // The Magic AI Calculator
  const handleCalculate = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const text = selection.toString();
      try {
        // Evaluate safely removing anything that isn't a math symbol
        const sanitized = text.replace(/[^0-9+\-*/().]/g, '');
        if(sanitized) {
          const result = Function('"use strict";return (' + sanitized + ')')();
          document.execCommand('insertHTML', false, `&nbsp;<strong style="color:#02C2D5;">= ${result}</strong>&nbsp;`);
          if(editorRef.current) onChange(editorRef.current.innerHTML);
        }
      } catch(e) {
        alert('Invalid Math Expression! Select something like "50 * 5"');
      }
    } else {
      alert("Highlight a math expression (e.g., 250*4) and click this to calculate.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="bg-slate-50 border-b border-slate-100 p-2 flex flex-wrap items-center gap-1">
        
        {/* Formatting */}
        <button onClick={() => exec('bold')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bold"><Bold size={14}/></button>
        <button onClick={() => exec('italic')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Italic"><Italic size={14}/></button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        
        {/* Lists */}
        <button onClick={() => exec('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Bullet List"><List size={14}/></button>
        <button onClick={() => exec('insertOrderedList')} className="p-1.5 hover:bg-slate-200 rounded text-slate-700" title="Numbered List"><ListOrdered size={14}/></button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        
        {/* Fonts & Colors */}
        <select onChange={(e) => exec('fontSize', e.target.value)} className="text-[10px] border border-slate-200 rounded px-1 py-1 bg-white outline-none">
          <option value="3">Normal</option>
          <option value="1">Small</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>
        <div className="relative group">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700 flex items-center"><Baseline size={14}/></button>
          <input type="color" onChange={(e) => exec('foreColor', e.target.value)} className="absolute opacity-0 inset-0 w-full h-full cursor-pointer" title="Text Color" />
        </div>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>

        {/* Math & Calculator Magic */}
        <button onClick={handleCalculate} className="p-1.5 hover:bg-[#02C2D5]/20 bg-[#02C2D5]/10 rounded text-[#02C2D5] font-bold flex items-center gap-1" title="Select math and click to calculate!">
          <Calculator size={14}/> <span className="text-[10px]">Calc</span>
        </button>
        
        {/* Math Symbols Dropdown */}
        <div className="relative group">
          <button className="p-1.5 hover:bg-slate-200 rounded text-slate-700"><Sigma size={14}/></button>
          <div className="absolute top-full left-0 mt-1 bg-white border shadow-lg rounded-lg p-2 hidden group-hover:grid grid-cols-4 gap-1 z-50 w-32">
            {['+', '-', '×', '÷', '=', '≠', '≈', '>', '<', '±', '√', 'π', 'θ', '∑', '∫', '∞'].map(sym => (
              <button key={sym} onClick={() => insertText(sym)} className="hover:bg-slate-100 rounded text-xs py-1 text-center font-black text-slate-700">
                {sym}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Editable Area */}
      {/* Editable Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="flex-1 overflow-y-auto p-4 bg-[#FDFCF7] outline-none text-slate-800 text-sm leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:cursor-text"
        style={{ minHeight: '200px' }}
        data-placeholder="Type your rich notes here..."
      />
    </div>
  );
}