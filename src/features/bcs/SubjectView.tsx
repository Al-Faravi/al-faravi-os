import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Loader2, Plus, FolderOpen, FileText, 
  Video, Database, ChevronDown, ChevronUp, Trash2, 
  AlignLeft, PlayCircle, UploadCloud, X, LayoutTemplate
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

  // New Resource States
  const [uploadingFile, setUploadingFile] = useState(false);
  const [resType, setResType] = useState('pdf');
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSubjectData();
  }, [id]);

  const fetchSubjectData = async () => {
    setLoading(true);
    try {
      // Fetch Subject
      const { data: sub } = await supabase.from('bcs_subjects').select('*').eq('id', id).single();
      if (sub) setSubject(sub);

      // Fetch Modules & Topics manually to build hierarchy
      const { data: mods } = await supabase.from('bcs_modules').select('*').eq('subject_id', id).order('order_index');
      if (mods && mods.length > 0) {
        const { data: tops } = await supabase.from('bcs_topics').select('*').in('module_id', mods.map(m => m.id)).order('order_index');
        
        // Assemble hierarchy
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
    await supabase.from('bcs_modules').insert([{
      subject_id: id,
      title,
      order_index: modules.length
    }]);
    fetchSubjectData();
  };

  const addTopic = async (moduleId: string, currentTopicCount: number) => {
    const title = prompt("Enter Topic / Chapter Name:");
    if (!title) return;
    await supabase.from('bcs_topics').insert([{
      module_id: moduleId,
      title,
      order_index: currentTopicCount
    }]);
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

  // ================= REORDERING (UP/DOWN) =================
  const moveModule = async (index: number, direction: 'up'|'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === modules.length - 1) return;
    
    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newModules[index];
    newModules[index] = newModules[targetIndex];
    newModules[targetIndex] = temp;

    setModules(newModules); // Optimistic UI update

    // DB Update
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

  // ================= ACTIVE TOPIC PANEL (RESOURCES & CONTENT) =================
  const openTopicPanel = async (topic: any) => {
    setActiveTopic(topic);
    setTopicContent(topic.content || '');
    fetchTopicResources(topic.id);
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
    
    await supabase.from('bcs_resources').insert([{
      user_id: user?.id,
      subject_id: id,
      topic_id: activeTopic.id,
      title: resTitle,
      resource_type: resType,
      url: resUrl
    }]);

    setResTitle(''); setResUrl(''); setFile(null);
    fetchTopicResources(activeTopic.id);
  };

  const deleteResource = async (resId: string) => {
    await supabase.from('bcs_resources').delete().eq('id', resId);
    fetchTopicResources(activeTopic.id);
  };


  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;
  if (!subject) return <div className="text-center py-20 text-slate-500 font-bold">Subject not found.</div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28 flex flex-col lg:flex-row gap-8">
      
      {/* ================= LEFT SIDE: SYLLABUS BUILDER ================= */}
      <div className={`flex-1 transition-all ${activeTopic ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
            <ArrowLeft size={16} /> Back to Mission Control
          </Link>
          <div className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ borderColor: `${subject.icon_color}30` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10" style={{ backgroundColor: subject.icon_color }}></div>
            <h1 className="text-3xl font-black text-[#020F33] tracking-tight relative z-10">{subject.title}</h1>
            <p className="text-xs font-bold text-slate-500 mt-2 relative z-10">LMS Course Structure</p>
          </div>
        </div>

        {/* Modules List */}
        <div className="space-y-6">
          {modules.map((module, mIdx) => (
            <div key={module.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              
              {/* Module Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center group">
                <h2 className="font-black text-slate-800 flex items-center gap-2">
                  <FolderOpen size={18} className="text-[#02C2D5]" /> {module.title}
                </h2>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveModule(mIdx, 'up')} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronUp size={16}/></button>
                  <button onClick={() => moveModule(mIdx, 'down')} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronDown size={16}/></button>
                  <button onClick={() => deleteModule(module.id)} className="p-1 hover:bg-rose-200 rounded text-rose-500 ml-2"><Trash2 size={14}/></button>
                </div>
              </div>

              {/* Topics List */}
              <div className="divide-y divide-slate-100">
                {module.topics.map((topic: any, tIdx: number) => (
                  <div key={topic.id} 
                    onClick={() => openTopicPanel(topic)}
                    className={`p-3 flex justify-between items-center cursor-pointer transition-colors group ${activeTopic?.id === topic.id ? 'bg-[#02C2D5]/10 border-l-4 border-[#02C2D5]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                    
                    <div className="flex items-center gap-3">
                      <LayoutTemplate size={16} className={activeTopic?.id === topic.id ? 'text-[#02C2D5]' : 'text-slate-400'} />
                      <span className={`text-sm font-bold ${activeTopic?.id === topic.id ? 'text-[#020F33]' : 'text-slate-600'}`}>{topic.title}</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => moveTopic(mIdx, tIdx, 'up')} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronUp size={14}/></button>
                      <button onClick={() => moveTopic(mIdx, tIdx, 'down')} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronDown size={14}/></button>
                      <button onClick={() => deleteTopic(topic.id)} className="p-1 hover:bg-rose-200 rounded text-rose-500 ml-1"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
                
                {/* Add Topic Button */}
                <button onClick={() => addTopic(module.id, module.topics.length)} className="w-full p-3 text-xs font-bold text-slate-400 hover:text-[#02C2D5] hover:bg-slate-50 flex items-center justify-center gap-1 transition-colors">
                  <Plus size={14} /> Add Topic / Chapter
                </button>
              </div>

            </div>
          ))}

          {/* Add Module Button */}
          <button onClick={addModule} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-[#02C2D5] hover:text-[#02C2D5] hover:bg-white transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Create New Module / Phase
          </button>
        </div>
      </div>

      {/* ================= RIGHT SIDE: TOPIC WORKSPACE ================= */}
      {activeTopic && (
        <div className="flex-[2] bg-white border border-slate-200 rounded-3xl shadow-lg flex flex-col h-[85vh] sticky top-8 overflow-hidden animate-in fade-in slide-in-from-right-4">
          
          {/* Header */}
          <div className="bg-[#020F33] p-5 text-white flex justify-between items-center shrink-0">
            <div>
              <span className="text-[10px] font-bold text-[#02C2D5] uppercase tracking-wider mb-1 block">Active Topic Workspace</span>
              <h2 className="text-xl font-black">{activeTopic.title}</h2>
            </div>
            <button onClick={() => setActiveTopic(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors lg:hidden">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 bg-slate-50">
            
            {/* Blank Page / Notes Area */}
            <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><AlignLeft size={14}/> Blank Page / Notes</h3>
                <button onClick={saveTopicContent} disabled={savingContent} className="text-xs font-bold bg-[#020F33] text-white px-3 py-1.5 rounded-lg hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors">
                  {savingContent ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
              <textarea 
                value={topicContent} 
                onChange={(e) => setTopicContent(e.target.value)}
                placeholder="Write your study notes, key points, or instructions here..."
                className="flex-1 p-5 outline-none resize-none text-slate-700 leading-relaxed font-medium bg-transparent"
              />
            </div>

            {/* Resources Attachment Area */}
            <div className="flex-1 flex flex-col gap-4">
              
              {/* Added Resources List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm min-h-[200px]">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Attached Materials</h3>
                
                {topicResources.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Database size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">No resources attached yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topicResources.map(res => (
                      <div key={res.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-[#02C2D5] transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {res.resource_type === 'pdf' ? <FileText size={16} className="text-red-500 shrink-0"/> : <PlayCircle size={16} className="text-purple-500 shrink-0"/>}
                          <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-700 truncate hover:text-[#02C2D5]">{res.title}</a>
                        </div>
                        <button onClick={() => deleteResource(res.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Resource Form */}
              <form onSubmit={handleAddResource} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shrink-0">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-1"><Plus size={14}/> Add Document / Video</h3>
                
                <div className="space-y-3">
                  <select value={resType} onChange={e => {setResType(e.target.value); setResUrl(''); setFile(null);}} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#02C2D5]">
                    <option value="video_link">YouTube / Video URL</option>
                    <option value="pdf">Upload PDF Document</option>
                    <option value="drive_link">Google Drive Link</option>
                  </select>
                  
                  <input type="text" required value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="File/Video Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#02C2D5]" />
                  
                  {resType === 'pdf' ? (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 bg-slate-50 rounded-xl py-2 cursor-pointer hover:border-[#02C2D5]">
                      {uploadingFile ? <Loader2 className="animate-spin text-[#02C2D5]" size={16} /> : <UploadCloud size={16} className="text-slate-500" />}
                      <span className="text-xs font-bold text-slate-500 truncate max-w-[200px]">{file ? file.name : 'Upload PDF'}</span>
                      <input type="file" className="hidden" accept=".pdf" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                    </label>
                  ) : (
                    <input type="url" required value={resUrl} onChange={e => setResUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#02C2D5]" />
                  )}

                  <button type="submit" disabled={uploadingFile} className="w-full bg-[#020F33] text-white font-bold py-2 rounded-xl text-sm hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors">
                    Attach Resource
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}