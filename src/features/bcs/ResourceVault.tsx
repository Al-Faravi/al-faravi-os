import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Database, Loader2, Plus, 
  UploadCloud, FileText, Image as ImageIcon, Link as LinkIcon, 
  Video, Trash2, Edit2, PlayCircle, Search, X, Maximize2
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  resource_type: string; 
  url: string;
  subject_id: string | null;
  subject?: { title: string; icon_color: string };
  created_at: string;
}

export default function ResourceVault() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [resourceType, setResourceType] = useState('pdf');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Viewer State
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subData } = await supabase.from('bcs_subjects').select('id, title, icon_color').order('order_index');
      if (subData) setSubjects(subData);

      const { data: resData } = await supabase
        .from('bcs_resources')
        .select(`*, subject:bcs_subjects(title, icon_color)`)
        .order('created_at', { ascending: false });
      
      if (resData) setResources(resData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (selectedFile: File) => {
    setUploadingFile(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `bcs_materials/${fileName}`; 

      const { error: uploadError } = await supabase.storage
        .from('bcs_vault') 
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('bcs_vault').getPublicUrl(filePath);
      setUrl(publicUrl);
      setFile(selectedFile);
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return alert('Title and URL/File are required!');
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editId) {
        // UPDATE Existing
        await supabase.from('bcs_resources').update({
          subject_id: subjectId || null,
          title,
          resource_type: resourceType,
          url
        }).eq('id', editId);
      } else {
        // CREATE New
        await supabase.from('bcs_resources').insert([{
          user_id: user?.id,
          subject_id: subjectId || null,
          title,
          resource_type: resourceType,
          url
        }]);
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving resource", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditId(resource.id);
    setTitle(resource.title);
    setSubjectId(resource.subject_id || '');
    setResourceType(resource.resource_type);
    setUrl(resource.url);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, urlToDelete: string) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    
    if (urlToDelete.includes('supabase.co/storage')) {
      const filePath = urlToDelete.split('/bcs_vault/')[1];
      if (filePath) {
        await supabase.storage.from('bcs_vault').remove([filePath]);
      }
    }

    await supabase.from('bcs_resources').delete().eq('id', id);
    setResources(resources.filter(r => r.id !== id));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setTitle(''); setSubjectId(''); setResourceType('pdf'); setUrl(''); setFile(null);
  };

  // --- Helpers for In-App Viewing ---
  const getEmbedUrl = (rawUrl: string) => {
    // YouTube Embed Matcher
    const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
    if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Facebook Video Matcher
    if (rawUrl.includes('facebook.com') && rawUrl.includes('/videos/')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=0`;
    }
    
    return rawUrl; // Return original for PDF/Image/Drive
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'pdf': return <FileText size={20} className="text-red-500" />;
      case 'image': return <ImageIcon size={20} className="text-blue-500" />;
      case 'video_link': return <Video size={20} className="text-purple-500" />;
      case 'drive_link': return <Database size={20} className="text-emerald-500" />;
      default: return <LinkIcon size={20} className="text-indigo-500" />;
    }
  };

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.subject?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28">
      
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-[#02C2D5]/20 shadow-sm">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Database className="text-[#02C2D5]" size={36} /> Resource Vault
            </h1>
            <p className="text-[#475569] mt-1 font-medium">Read, Watch & Manage your study materials inline.</p>
          </div>
          <button onClick={() => showForm ? resetForm() : setShowForm(true)} className="bg-[#020F33] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors flex items-center gap-2 shadow-md">
            {showForm ? 'Cancel' : <><Plus size={18} /> Add Resource</>}
          </button>
        </div>
      </div>

      {/* Add / Edit Resource Form */}
      {showForm && (
        <form onSubmit={handleSaveResource} className="bg-[#F8FAFC] border border-slate-200 p-6 rounded-3xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-black text-[#020F33] mb-4 flex items-center gap-2">
            {editId ? <Edit2 size={20} className="text-[#02C2D5]" /> : <Plus size={20} className="text-[#02C2D5]" />}
            {editId ? 'Update Resource' : 'Add New Resource'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Resource Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. BD Constitution Lecture" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#02C2D5]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Subject (Optional)</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#02C2D5]">
                <option value="">General (No Subject)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Resource Type</label>
              <select value={resourceType} onChange={e => {setResourceType(e.target.value); if(!editId) setUrl(''); setFile(null);}} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#02C2D5]">
                <option value="pdf">PDF Document</option>
                <option value="image">Image / Screenshot</option>
                <option value="video_link">YouTube / FB Video</option>
                <option value="drive_link">Google Drive Link</option>
                <option value="note">External Link</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-1">
                {['pdf', 'image'].includes(resourceType) ? 'Upload New File (or keep URL)' : 'Resource URL'}
              </label>
              
              {['pdf', 'image'].includes(resourceType) ? (
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 bg-white rounded-xl py-2 cursor-pointer transition-colors hover:border-[#02C2D5]">
                    {uploadingFile ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                    <span className="font-medium text-sm truncate px-2">{file ? file.name : (url && editId ? 'File already uploaded (Click to change)' : 'Click to Upload from Device')}</span>
                    <input type="file" className="hidden" accept={resourceType === 'pdf' ? '.pdf' : 'image/*'} onChange={e => e.target.files && handleFileUpload(e.target.files[0])} />
                  </label>
                </div>
              ) : (
                <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#02C2D5]" />
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSaving || uploadingFile} className="bg-[#020F33] hover:bg-[#02C2D5] hover:text-[#020F33] text-white font-bold py-3 px-8 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : (editId ? 'Update Resource' : 'Save Resource')}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-300 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="mb-6 relative">
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search PDFs, Videos, Links..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-[#02C2D5] shadow-sm font-medium"
        />
        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map(resource => (
          <div key={resource.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-[#02C2D5]/50 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {getIconForType(resource.resource_type)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(resource)} className="text-slate-300 hover:text-[#02C2D5] p-1.5 bg-slate-50 rounded-lg">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(resource.id, resource.url)} className="text-slate-300 hover:text-rose-500 p-1.5 bg-rose-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-[#020F33] leading-snug mb-1 line-clamp-2">{resource.title}</h3>
              <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-4">
                {resource.subject ? (
                  <><span className="w-2 h-2 rounded-full" style={{backgroundColor: resource.subject.icon_color}}></span> {resource.subject.title}</>
                ) : 'General Resource'}
              </p>
            </div>
            
            <button 
              onClick={() => setPreviewResource(resource)}
              className="flex items-center justify-center gap-2 w-full bg-[#02C2D5]/10 hover:bg-[#02C2D5] text-[#02C2D5] hover:text-[#020F33] font-bold py-2.5 rounded-xl border border-transparent transition-colors text-sm"
            >
              {['pdf', 'image'].includes(resource.resource_type) ? <Maximize2 size={16} /> : <PlayCircle size={16} />}
              {['pdf', 'image'].includes(resource.resource_type) ? 'Read / View Inside' : 'Watch Inline'}
            </button>
          </div>
        ))}
      </div>

      {/* ================= IN-APP PREVIEW MODAL ================= */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020F33]/90 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-[#020F33]">{previewResource.title}</h3>
                <p className="text-xs font-bold text-slate-400">{previewResource.resource_type.toUpperCase()}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={previewResource.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#02C2D5] hover:underline hidden md:block">
                  Open in New Tab
                </a>
                <button onClick={() => setPreviewResource(null)} className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-500 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Modal Content / Viewer */}
            <div className="flex-1 bg-slate-100 w-full h-full relative overflow-hidden flex items-center justify-center">
              
              {previewResource.resource_type === 'pdf' && (
                <iframe src={`${previewResource.url}#toolbar=0`} className="w-full h-full border-none" title="PDF Viewer" />
              )}
              
              {previewResource.resource_type === 'image' && (
                <img src={previewResource.url} alt="Preview" className="max-w-full max-h-full object-contain p-4" />
              )}
              
              {previewResource.resource_type === 'video_link' && (
                <iframe 
                  src={getEmbedUrl(previewResource.url)} 
                  className="w-full h-full border-none max-w-4xl mx-auto shadow-lg bg-black" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  title="Video Player"
                />
              )}
              
              {['drive_link', 'note'].includes(previewResource.resource_type) && (
                <iframe src={previewResource.url} className="w-full h-full border-none bg-white" title="Web Viewer" />
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}