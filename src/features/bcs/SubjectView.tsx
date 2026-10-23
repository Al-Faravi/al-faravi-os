import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Loader2, Plus, FolderOpen, FileText, 
  Video, Database, ChevronDown, ChevronUp, Trash2, 
  AlignLeft, PlayCircle, UploadCloud, LayoutTemplate, 
  MonitorPlay, ExternalLink, ShieldAlert
} from 'lucide-react';

export default function SubjectView() {
  const { id } = useParams();
  const [subject, setSubject] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Topic Panel States
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [topicResources, setTopicResources] = useState<any[]>([]);
  const [topicContent, setTopicContent] = useState('');
  const [savingContent, setSavingContent] = useState(false);

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
    setTopicContent(topic.content || '');
    setPreviewResource(null);
    
    const { data } = await supabase.from('bcs_resources').select('*').eq('topic_id', topic.id).order('created_at');
    if (data) {
      setTopicResources(data);
      if (data.length > 0) {
        setPreviewResource(data[0]); // Auto-open first resource
        setIframeLoading(true);
      }
    }
  };

  const fetchTopicResources = async (topicId: string) => {
    const { data } = await supabase.from('bcs_resources').select('*').eq('topic_id', topicId).order('created_at');
    if (data) setTopicResources(data);
  };

  const saveTopicContent = async () => {
    setSavingContent(true);
    await supabase.from('bcs_topics').update({ content: topicContent }).eq('id', activeTopic.id);
    const updatedModules = modules.map(m => ({
      ...m, topics: m.topics.map((t: any) => t.id === activeTopic.id ? { ...t, content: topicContent } : t)
    }));
    setModules(updatedModules);
    setSavingContent(false);
  };

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
      setPreviewResource(data); // Instantly view newly added resource
      setIframeLoading(true);
    }

    setResTitle(''); setResUrl(''); setFile(null);
  };

  const deleteResource = async (resId: string) => {
    await supabase.from('bcs_resources').delete().eq('id', resId);
    if (previewResource?.id === resId) setPreviewResource(null);
    fetchTopicResources(activeTopic.id);
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
      
      {/* ================= LEFT SIDEBAR: SYLLABUS BUILDER (Fixed Width) ================= */}
      <div className="w-[320px] shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col h-full overflow-hidden hidden md:flex">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <Link to="/bcs" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#020F33] transition-colors mb-3">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-xl font-black text-[#020F33] leading-snug">{subject.title}</h1>
          <p className="text-[10px] font-bold text-[#02C2D5] uppercase tracking-widest mt-1">Course Content</p>
        </div>

        {/* Modules List (Scrollable) */}
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
            {/* Workspace Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[#02C2D5] uppercase tracking-wider">Active Workspace</span>
                <h2 className="text-lg font-black text-[#020F33]">{activeTopic.title}</h2>
              </div>
            </div>

            {/* Split View: Left (Theater Viewer) & Right (Tools Panel) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* ---------------- LEFT: THEATER VIEWER (Takes most space) ---------------- */}
              <div className="flex-[3] bg-[#0B1120] relative flex items-center justify-center overflow-hidden">
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
                              <p className="text-slate-400 text-sm font-medium">Loading Learning Material...</p>
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

              {/* ---------------- RIGHT: TOOLS PANEL (Resources, Add Form, Notes) ---------------- */}
              <div className="w-[350px] lg:w-[400px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto shadow-[-4px_0_15px_rgba(0,0,0,0.03)]">
                
                {/* 1. Attached Materials List */}
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Database size={14} className="text-[#02C2D5]" /> Attached Materials
                  </h3>
                  
                  {topicResources.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">No resources yet. Add a video or PDF below.</p>
                  ) : (
                    <div className="space-y-2">
                      {topicResources.map(res => (
                        <div key={res.id} 
                          onClick={() => { setPreviewResource(res); setIframeLoading(true); }}
                          className={`flex justify-between items-center p-3 border rounded-xl cursor-pointer group transition-all
                            ${previewResource?.id === res.id ? 'bg-[#02C2D5]/10 border-[#02C2D5]' : 'bg-white border-slate-200 hover:border-[#02C2D5]/50'}`}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            {res.resource_type === 'pdf' ? <FileText size={16} className="text-rose-500 shrink-0"/> : <PlayCircle size={16} className="text-indigo-500 shrink-0"/>}
                            <span className={`text-sm font-bold truncate ${previewResource?.id === res.id ? 'text-[#02C2D5]' : 'text-slate-700'}`}>{res.title}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteResource(res.id); }} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Add New Resource Form */}
                <form onSubmit={handleAddResource} className="p-5 border-b border-slate-100 bg-slate-50">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1"><Plus size={12}/> Add Document / Video</h3>
                  <div className="space-y-2">
                    <select value={resType} onChange={e => {setResType(e.target.value); setResUrl(''); setFile(null);}} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-[#02C2D5]">
                      <option value="video_link">YouTube / Video URL</option>
                      <option value="pdf">Upload PDF Document</option>
                      <option value="drive_link">Google Drive Link</option>
                    </select>
                    <input type="text" required value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="Title (e.g. Class 1 Video)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#02C2D5]" />
                    
                    {resType === 'pdf' ? (
                      <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 bg-white rounded-lg py-2 cursor-pointer hover:border-[#02C2D5]">
                        {uploadingFile ? <Loader2 className="animate-spin text-[#02C2D5]" size={14} /> : <UploadCloud size={14} className="text-slate-500" />}
                        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">{file ? file.name : 'Choose PDF File'}</span>
                        <input type="file" className="hidden" accept=".pdf" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                      </label>
                    ) : (
                      <input type="url" required value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="Paste URL here..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#02C2D5]" />
                    )}
                    <button type="submit" disabled={uploadingFile} className="w-full bg-[#020F33] text-white font-bold py-2 rounded-lg text-xs hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors">
                      Attach to Chapter
                    </button>
                  </div>
                </form>

                {/* 3. Blank Page / Notes Area */}
                <div className="p-5 flex-1 flex flex-col bg-white">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <AlignLeft size={14} className="text-[#02C2D5]"/> Chapter Notes
                    </h3>
                    <button onClick={saveTopicContent} disabled={savingContent} className="text-[10px] font-bold bg-[#020F33] text-white px-2 py-1 rounded hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors">
                      {savingContent ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                  <textarea 
                    value={topicContent} 
                    onChange={(e) => setTopicContent(e.target.value)}
                    placeholder="Type your summary, important points, or thoughts here..."
                    className="flex-1 w-full p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl outline-none resize-none text-slate-700 text-sm leading-relaxed font-medium focus:border-yellow-300 transition-colors shadow-inner"
                  />
                </div>

              </div>
            </div>
          </>
        )}
      </div>
      
    </div>
  );
}