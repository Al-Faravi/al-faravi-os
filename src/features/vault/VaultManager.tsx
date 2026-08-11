import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Shield, Plus, Lock, Key, Loader2, Trash2, Download, 
  UploadCloud, Image as ImageIcon, FileText, File as FileIcon, 
  Music, Video, Eye, EyeOff, Copy, Check, ExternalLink
} from 'lucide-react';

interface VaultItem {
  id: string;
  title: string;
  document_type: string;
  storage_path?: string;
  secret_content?: string;
}

export default function VaultManager() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Smart Media URLs & Secret States
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form States
  const [entryMode, setEntryMode] = useState<'file' | 'secret'>('file');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('NID');
  const [file, setFile] = useState<File | null>(null);
  const [secretContent, setSecretContent] = useState('');

  useEffect(() => {
    fetchVaultItems();
  }, []);

  const fetchVaultItems = async () => {
    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const fetchedItems = data || [];
      setItems(fetchedItems);

      // সব ধরনের ফাইলের জন্য Smart URL (Signed URL) তৈরি করা (1 ঘণ্টার জন্য ভ্যালিড)
      const urls: Record<string, string> = {};
      for (const item of fetchedItems) {
        if (item.storage_path) {
          const { data: urlData } = await supabase.storage.from('vault_files').createSignedUrl(item.storage_path, 3600); 
          if (urlData) {
            urls[item.id] = urlData.signedUrl;
          }
        }
      }
      setMediaUrls(urls);

    } catch (error) {
      console.error('Error fetching vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (entryMode === 'file' && !file) return;
    if (entryMode === 'secret' && !secretContent) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let storagePath = null;
      let finalDocType = docType;

      if (entryMode === 'file' && file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        storagePath = `${user.id}/${Math.random()}.${fileExt}`;
        
        // ফাইল এক্সটেনশন দেখে স্মার্টলি টাইপ নির্ধারণ করা
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt || '')) finalDocType = 'Image';
        else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(fileExt || '')) finalDocType = 'Video';
        else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt || '')) finalDocType = 'Audio';
        else if (['pdf', 'txt', 'doc', 'docx', 'csv', 'xlsx'].includes(fileExt || '')) finalDocType = 'Document';
        else finalDocType = 'File';

        const { error: uploadError } = await supabase.storage.from('vault_files').upload(storagePath, file);
        if (uploadError) throw uploadError;
      } else {
        finalDocType = 'Password/Secret';
      }

      const { error: dbError } = await supabase
        .from('vault_documents')
        .insert([{
          user_id: user.id,
          title,
          document_type: finalDocType,
          storage_path: storagePath,
          secret_content: entryMode === 'secret' ? secretContent : null
        }]);

      if (dbError) throw dbError;
      
      await fetchVaultItems();
      
      // ফর্ম রিসেট
      setShowForm(false);
      setFile(null);
      setSecretContent('');
      setTitle('');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save entry! Make sure you ran the SQL command to add the secret_content column.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('vault_files').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleDelete = async (id: string, path?: string) => {
    if (!window.confirm('Are you sure you want to delete this permanently?')) return;
    try {
      if (path) await supabase.storage.from('vault_files').remove([path]);
      const { error } = await supabase.from('vault_documents').delete().eq('id', id);
      if (error) throw error;
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000); // 2 সেকেন্ড পর আইকন রিসেট হবে
  };

  const getFileIcon = (type: string) => {
    if (type === 'Image') return <ImageIcon size={20} />;
    if (type === 'Video') return <Video size={20} />;
    if (type === 'Audio') return <Music size={20} />;
    if (type === 'Document') return <FileText size={20} />;
    if (type === 'Password/Secret') return <Key size={20} />;
    return <FileIcon size={20} />;
  };

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto text-[#020F33] mb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="text-[#02C2D5]" /> Digital Vault
          </h1>
          <p className="text-[#475569] mt-1">Smart Media & Secure Passwords.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ backgroundColor: '#020F33', color: '#FFFFFF' }}
          className="px-5 py-2.5 rounded-xl font-bold hover:!bg-[#02C2D5] hover:!text-[#020F33] transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} /> {showForm ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex gap-2 mb-6 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0] w-fit">
            <button type="button" onClick={() => setEntryMode('file')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${entryMode === 'file' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`}>Upload File/Media</button>
            <button type="button" onClick={() => setEntryMode('secret')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${entryMode === 'secret' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`}>Save Password/Note</button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder={entryMode === 'file' ? "e.g. My Presentation Video" : "e.g. Bank PIN"} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#02C2D5]" />
          </div>

          {entryMode === 'file' ? (
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Select Media / File</label>
              <input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-[#475569] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#020F33] file:text-white hover:file:bg-[#02C2D5] hover:file:text-[#020F33] transition-all cursor-pointer" />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Secret Content / Password</label>
              <textarea required rows={3} value={secretContent} onChange={e => setSecretContent(e.target.value)} placeholder="Type your secure note here..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] resize-none" />
            </div>
          )}

          <button type="submit" disabled={isUploading} style={{ backgroundColor: '#020F33', color: '#FFFFFF' }} className="hover:!bg-[#02C2D5] hover:!text-[#020F33] font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 w-full md:w-auto">
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <><UploadCloud size={18} /> Secure Save</>}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#02C2D5]" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-[#E2E8F0] p-4 rounded-2xl flex flex-col hover:border-[#02C2D5] hover:shadow-md transition-all group h-full">
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-[#020F33] shrink-0">
                    {getFileIcon(item.document_type)}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-[#020F33] truncate" title={item.title}>{item.title}</h3>
                    <p className="text-[10px] text-[#02C2D5] font-bold uppercase tracking-wider">{item.document_type}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id, item.storage_path)} className="p-1.5 text-[#475569] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Dynamic Smart Media Area */}
              <div className="mt-auto bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                
                {item.document_type === 'Password/Secret' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-[#020F33] flex-1 truncate mr-2">
                      {revealedSecrets[item.id] ? item.secret_content : '••••••••••••••••'}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setRevealedSecrets(prev => ({...prev, [item.id]: !prev[item.id]}))} className="p-1.5 text-[#475569] hover:text-[#020F33] hover:bg-white rounded-md transition-colors shadow-sm">
                        {revealedSecrets[item.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => copyToClipboard(item.id, item.secret_content || '')} className="p-1.5 text-[#475569] hover:text-[#02C2D5] hover:bg-white rounded-md transition-colors shadow-sm">
                        {copiedId === item.id ? <Check size={16} className="text-[#A3D803]" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                ) : item.document_type === 'Image' && mediaUrls[item.id] ? (
                  <div className="w-full h-36 rounded-lg overflow-hidden relative group-hover:shadow-sm transition-all bg-slate-100">
                    <img src={mediaUrls[item.id]} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : item.document_type === 'Video' && mediaUrls[item.id] ? (
                  <div className="w-full rounded-lg overflow-hidden relative group-hover:shadow-sm transition-all bg-black">
                    <video src={mediaUrls[item.id]} controls className="w-full h-36 object-cover" />
                  </div>
                ) : item.document_type === 'Audio' && mediaUrls[item.id] ? (
                  <div className="w-full pt-1">
                    <audio src={mediaUrls[item.id]} controls className="w-full h-10" />
                  </div>
                ) : (
                  /* Documents (PDF, Text, Excel, Zip) */
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#475569] font-medium truncate pr-2">Secure Document</span>
                    <div className="flex gap-1.5 shrink-0">
                      {mediaUrls[item.id] && (
                        <a href={mediaUrls[item.id]} target="_blank" rel="noreferrer" className="text-xs bg-white border border-[#E2E8F0] hover:border-[#02C2D5] text-[#020F33] px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1">
                          <ExternalLink size={14} /> Open
                        </a>
                      )}
                      <button onClick={() => handleDownload(item.storage_path!, item.title)} className="text-xs bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1">
                        <Download size={14} /> Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && !showForm && (
            <div className="col-span-1 md:col-span-3 text-center py-20 bg-white rounded-3xl border border-dashed border-[#E2E8F0] text-[#475569]">
              <Lock size={40} className="mx-auto mb-4 opacity-30 text-[#020F33]" />
              <p className="font-medium">Vault is empty. Add your first media or password.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}