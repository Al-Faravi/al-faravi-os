import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCrossDevicePin, setCrossDevicePin, encryptData, decryptData } from '../../lib/security';
import { 
  Shield, Plus, Lock, Key, Loader2, Trash2, Download, 
  UploadCloud, Image as ImageIcon, FileText, File as FileIcon, 
  Music, Video, Eye, EyeOff, Copy, Check, ExternalLink,
  Share2, LockKeyhole
} from 'lucide-react';

interface VaultItem {
  id: string;
  title: string;
  document_type: string;
  storage_path?: string;
  secret_content?: string;
}

export default function VaultManager() {
  // Security & Lock States (Cloud PIN Engine)
  const [isCheckingPin, setIsCheckingPin] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

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
  const [file, setFile] = useState<File | null>(null);
  const [secretContent, setSecretContent] = useState('');

  // 1. Fetch Cloud PIN on load
  useEffect(() => {
    checkPinSetup();
  }, []);

  const checkPinSetup = async () => {
    try {
      const pin = await getCrossDevicePin();
      setSavedPin(pin);
    } catch (error) {
      console.error("Error fetching PIN", error);
    } finally {
      setIsCheckingPin(false);
    }
  };

  // Fetch only when unlocked
  useEffect(() => {
    if (isUnlocked) fetchVaultItems();
  }, [isUnlocked]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    
    if (!savedPin) {
      if (pinInput.length >= 4) {
        setIsSavingPin(true);
        try {
          await setCrossDevicePin(pinInput);
          setSavedPin(pinInput);
          setIsUnlocked(true);
        } catch (err) {
          setPinError('Failed to save PIN in cloud');
        } finally {
          setIsSavingPin(false);
        }
      } else {
        setPinError('PIN must be at least 4 digits');
      }
    } else {
      if (pinInput === savedPin) {
        setIsUnlocked(true);
      } else {
        setPinError('Incorrect PIN!');
        setPinInput('');
      }
    }
  };

  const fetchVaultItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vault_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const fetchedItems = data || [];

      // ✨ AES-256 Decryption Engine ✨
      const decryptedItems = await Promise.all(fetchedItems.map(async (item) => {
        if (item.document_type === 'Password/Secret' && item.secret_content) {
           item.secret_content = await decryptData(item.secret_content);
        }
        return item;
      }));

      setItems(decryptedItems);

      // Smart Media URLs
      const urls: Record<string, string> = {};
      for (const item of decryptedItems) {
        if (item.storage_path) {
          const { data: urlData } = await supabase.storage.from('vault_files').createSignedUrl(item.storage_path, 3600); 
          if (urlData) urls[item.id] = urlData.signedUrl;
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
      let finalDocType = 'File';
      let finalSecret = null;

      if (entryMode === 'file' && file) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        storagePath = `${user.id}/${Math.random()}.${fileExt}`;
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt || '')) finalDocType = 'Image';
        else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(fileExt || '')) finalDocType = 'Video';
        else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt || '')) finalDocType = 'Audio';
        else if (['pdf', 'txt', 'doc', 'docx', 'csv', 'xlsx'].includes(fileExt || '')) finalDocType = 'Document';

        const { error: uploadError } = await supabase.storage.from('vault_files').upload(storagePath, file);
        if (uploadError) throw uploadError;
      } else {
        finalDocType = 'Password/Secret';
        // ✨ AES-256 Encryption Engine ✨
        finalSecret = await encryptData(secretContent);
      }

      const { error: dbError } = await supabase.from('vault_documents').insert([{
        user_id: user.id,
        title,
        document_type: finalDocType,
        storage_path: storagePath,
        secret_content: finalSecret
      }]);

      if (dbError) throw dbError;
      
      await fetchVaultItems();
      setShowForm(false); setFile(null); setSecretContent(''); setTitle('');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save entry!');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Utility Actions ---
  const handleDownload = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('vault_files').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
    } catch (error) { console.error('Download error:', error); }
  };

  const handleShare = async (item: VaultItem) => {
    if (item.document_type === 'Password/Secret') {
      alert("Security Alert: For your safety, passwords or secret notes cannot be shared directly. Use the copy button instead.");
      return;
    }
    const url = mediaUrls[item.id];
    const shareData: any = { title: item.title, text: `Check out this secure file: ${item.title}` };
    if (url) shareData.url = url;
    try {
      if (navigator.share) await navigator.share(shareData);
      else { copyToClipboard(item.id, url || ''); alert('File link copied to clipboard!'); }
    } catch (error) { console.error('Error sharing', error); }
  };

  const handleDelete = async (id: string, path?: string) => {
    if (!window.confirm('Delete this permanently?')) return;
    try {
      if (path) await supabase.storage.from('vault_files').remove([path]);
      await supabase.from('vault_documents').delete().eq('id', id);
      setItems(items.filter(item => item.id !== id));
    } catch (error) { console.error('Error deleting:', error); }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (type: string) => {
    if (type === 'Image') return <ImageIcon size={20} />;
    if (type === 'Video') return <Video size={20} />;
    if (type === 'Audio') return <Music size={20} />;
    if (type === 'Document') return <FileText size={20} />;
    if (type === 'Password/Secret') return <Key size={20} />;
    return <FileIcon size={20} />;
  };

  // ==========================================
  // VIEW: LOCK SCREEN
  // ==========================================
  if (isCheckingPin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E2E8F0] p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <LockKeyhole size={36} className="text-[#020F33]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#020F33] mb-2">Secure Vault</h2>
          <p className="text-sm text-[#475569] mb-8">
            {savedPin ? 'Enter your OS PIN to unlock.' : 'Set up a Global PIN to secure your files.'}
          </p>
          
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div>
              <input 
                type="password" 
                maxLength={6}
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="****"
                className="w-full text-center text-3xl tracking-[1em] font-black bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-4 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none"
              />
              {pinError && <p className="text-rose-500 text-xs font-bold mt-2 animate-bounce">{pinError}</p>}
            </div>
            <button type="submit" disabled={isSavingPin} className="w-full bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] py-4 rounded-xl font-bold text-lg transition-colors shadow-md flex justify-center items-center gap-2">
              {isSavingPin ? <Loader2 className="animate-spin" size={20} /> : (savedPin ? 'Unlock Vault' : 'Set Cloud PIN')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN VAULT MANAGER
  // ==========================================
  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-[1400px] mx-auto text-[#020F33] mb-24 md:mb-10">
      
      {/* Responsive Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 bg-white p-5 md:p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner shrink-0">
            <Shield className="text-[#02C2D5]" size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-[#020F33]">Digital Vault</h1>
            <p className="text-[#475569] font-medium mt-1 text-xs md:text-sm">AES-256 Encrypted & Secured.</p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setIsUnlocked(false)} className="px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl font-bold transition-all flex items-center justify-center shrink-0">
            <Lock size={18} />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex-1 md:flex-none px-5 py-3 bg-[#020F33] text-white rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all flex items-center justify-center gap-2 shadow-md">
            <Plus size={18} /> {showForm ? 'Cancel' : 'New Entry'}
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-[#E2E8F0] p-5 md:p-6 rounded-3xl shadow-sm mb-8 animate-in slide-in-from-top-4">
          <div className="flex gap-2 mb-6 bg-[#F8FAFC] p-1.5 rounded-xl border border-[#E2E8F0] w-fit max-w-full overflow-x-auto hide-scrollbar">
            <button type="button" onClick={() => setEntryMode('file')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0 ${entryMode === 'file' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`}>File / Media</button>
            <button type="button" onClick={() => setEntryMode('secret')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0 ${entryMode === 'secret' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`}>Secure Password</button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-[#475569] mb-1.5 ml-1">Title</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder={entryMode === 'file' ? "e.g. My Presentation Video" : "e.g. Bank PIN"} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] font-medium text-sm md:text-base" />
          </div>

          {entryMode === 'file' ? (
            <div className="mb-6">
              <label className="block text-sm font-bold text-[#475569] mb-1.5 ml-1">Select Media / File</label>
              <input type="file" required onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-[#475569] file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#020F33] file:text-white hover:file:bg-[#02C2D5] hover:file:text-[#020F33] file:transition-all cursor-pointer bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl" />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-bold text-[#475569] mb-1.5 ml-1">Secret Content / Password</label>
              <textarea required rows={4} value={secretContent} onChange={e => setSecretContent(e.target.value)} placeholder="Type your secure note here..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] resize-none font-medium text-sm md:text-base" />
            </div>
          )}

          <button type="submit" disabled={isUploading} className="bg-[#020F33] text-white hover:bg-[#02C2D5] hover:text-[#020F33] font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-md">
            {isUploading ? <Loader2 className="animate-spin" size={18} /> : <><UploadCloud size={18} /> Encrypt & Save</>}
          </button>
        </form>
      )}

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#E2E8F0] text-[#475569]">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100"><Shield size={32} className="opacity-50 text-[#020F33]" /></div>
          <p className="font-bold">Vault is empty. Add your first media or password.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-[#E2E8F0] p-4 rounded-2xl flex flex-col hover:border-[#02C2D5] hover:shadow-md transition-all group h-full relative">
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 pr-2 overflow-hidden">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-[#020F33] shrink-0">
                    {getFileIcon(item.document_type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#020F33] text-sm md:text-base truncate" title={item.title}>{item.title}</h3>
                    <p className="text-[10px] md:text-xs text-[#02C2D5] font-bold uppercase tracking-wider">{item.document_type}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id, item.storage_path)} className="p-2 text-[#CBD5E1] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Dynamic Smart Media Area */}
              <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] flex-1 flex flex-col justify-center">
                {item.document_type === 'Password/Secret' ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-mono text-[#020F33] flex-1 truncate font-bold">
                      {revealedSecrets[item.id] ? item.secret_content : '••••••••••••••••'}
                    </span>
                    <div className="flex shrink-0">
                      <button onClick={() => setRevealedSecrets(prev => ({...prev, [item.id]: !prev[item.id]}))} className="p-2 text-[#475569] hover:text-[#020F33] rounded-md transition-colors">
                        {revealedSecrets[item.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => copyToClipboard(item.id, item.secret_content || '')} className="p-2 text-[#475569] hover:text-[#02C2D5] rounded-md transition-colors">
                        {copiedId === item.id ? <Check size={16} className="text-[#A3D803]" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                ) : item.document_type === 'Image' && mediaUrls[item.id] ? (
                  <div className="w-full h-32 md:h-40 rounded-lg overflow-hidden relative group-hover:shadow-sm transition-all bg-slate-100">
                    <img src={mediaUrls[item.id]} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : item.document_type === 'Video' && mediaUrls[item.id] ? (
                  <div className="w-full rounded-lg overflow-hidden relative group-hover:shadow-sm transition-all bg-black">
                    <video src={mediaUrls[item.id]} controls className="w-full h-32 md:h-40 object-cover" />
                  </div>
                ) : item.document_type === 'Audio' && mediaUrls[item.id] ? (
                  <div className="w-full pt-1">
                    <audio src={mediaUrls[item.id]} controls className="w-full h-10" />
                  </div>
                ) : (
                  <div className="text-center py-4 text-[#94A3B8] font-medium text-xs">Document File Ready</div>
                )}
              </div>

              {/* Action Bar (Share/Print Combo & Download) */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <button 
                  onClick={() => handleShare(item)} 
                  className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-[#F8FAFC] hover:bg-[#020F33] text-[#475569] hover:text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Share2 size={14} /> {item.document_type === 'Password/Secret' ? 'Secure' : 'Share'}
                </button>
                {item.document_type !== 'Password/Secret' && (
                  <button 
                    onClick={() => handleDownload(item.storage_path!, item.title)} 
                    className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] rounded-lg text-xs font-bold transition-colors"
                  >
                    <Download size={14} /> Save
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}