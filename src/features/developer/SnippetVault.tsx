import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Code2, Plus, Copy, Check, Trash2, Search, Loader2 } from 'lucide-react';

interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
}

export default function SnippetVault() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form States
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSnippets();
  }, []);

  const fetchSnippets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('code_snippets').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      setSnippets(data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('code_snippets').insert([{ user_id: user?.id, title, language, code }]).select().single();
      if (error) throw error;
      setSnippets([data, ...snippets]);
      setShowForm(false); setTitle(''); setCode('');
    } catch (error) { console.error(error); } 
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this snippet?")) return;
    await supabase.from('code_snippets').delete().eq('id', id);
    setSnippets(snippets.filter(s => s.id !== id));
  };

  const copyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSnippets = snippets.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.language.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto text-[#020F33] min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Code2 size={28} /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Snippet Vault</h1>
            <p className="text-[#475569] font-medium text-sm">Your personal library of reusable codes.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md">
          <Plus size={18} /> {showForm ? 'Close' : 'New Snippet'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm mb-8 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Title / Description</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fetch API Boilerplate" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none font-bold text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Language</label>
              <input required value={language} onChange={e => setLanguage(e.target.value)} placeholder="React, Node, Python..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none font-bold text-sm" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Code Content</label>
            <textarea required rows={6} value={code} onChange={e => setCode(e.target.value)} placeholder="Paste your code here..." className="w-full bg-slate-900 text-slate-300 border border-slate-800 rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#02C2D5] focus:outline-none font-mono text-sm leading-relaxed" spellCheck="false" />
          </div>
          <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={18}/> : 'Save Snippet'}
          </button>
        </form>
      )}

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={20} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search snippets by title or language..." className="w-full bg-white border border-[#E2E8F0] rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold shadow-sm" />
      </div>

      {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" size={32}/></div> 
      : filteredSnippets.length === 0 ? <p className="text-center text-[#94A3B8] font-bold p-10">No snippets found.</p> 
      : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSnippets.map(snippet => (
            <div key={snippet.id} className="bg-white border border-[#E2E8F0] rounded-3xl overflow-hidden shadow-sm flex flex-col group hover:border-indigo-300 transition-colors">
              <div className="bg-[#F8FAFC] px-5 py-3 border-b border-[#E2E8F0] flex justify-between items-center">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shrink-0">{snippet.language}</span>
                  <h3 className="font-bold text-sm truncate">{snippet.title}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => copyCode(snippet.id, snippet.code)} className="p-2 text-[#475569] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    {copiedId === snippet.id ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>}
                  </button>
                  <button onClick={() => handleDelete(snippet.id)} className="p-2 text-[#CBD5E1] hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                </div>
              </div>
              <div className="p-4 bg-slate-900 flex-1">
                <pre className="text-slate-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed"><code>{snippet.code}</code></pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}