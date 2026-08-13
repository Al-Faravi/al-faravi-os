import { useState, useEffect } from 'react';
import { 
  GitBranch, Key, Save, Loader2, CheckCircle2, 
  FileCode, TerminalSquare, AlertCircle, Trash2 
} from 'lucide-react';

export default function GithubHub() {
  const [token, setToken] = useState('');
  const [isTokenSaved, setIsTokenSaved] = useState(false);

  // GitHub States
  const [repo, setRepo] = useState('Al-Faravi/Daily-git');
  const [filePath, setFilePath] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [content, setContent] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('alfaravi_github_token');
    if (savedToken) {
      setToken(savedToken);
      setIsTokenSaved(true);
    }
  }, []);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    localStorage.setItem('alfaravi_github_token', token);
    setIsTokenSaved(true);
  };

  const removeToken = () => {
    localStorage.removeItem('alfaravi_github_token');
    setToken('');
    setIsTokenSaved(false);
  };

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath || !content || !repo) return;

    setStatus('loading');
    setStatusMsg('Checking existing files...');

    try {
      const base64Content = btoa(unescape(encodeURIComponent(content)));
      let fileSha = null;

      const getResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        headers: { Authorization: `token ${token}` }
      });

      if (getResponse.ok) {
        const getData = await getResponse.json();
        fileSha = getData.sha;
        setStatusMsg('File found. Updating...');
      } else if (getResponse.status === 404) {
        setStatusMsg('Creating new file...');
      } else {
        throw new Error('Failed to access repository. Check your PAT or repo name.');
      }

      const body: any = {
        message: commitMsg || `Al_Faravi OS: Update ${filePath}`,
        content: base64Content,
      };
      
      if (fileSha) body.sha = fileSha;

      const putResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!putResponse.ok) throw new Error('Failed to push code.');

      setStatus('success');
      setStatusMsg(`Successfully pushed to ${filePath}!`);
      
      setTimeout(() => {
        setStatus('idle');
        setStatusMsg('');
      }, 3000);

    } catch (error: any) {
      setStatus('error');
      setStatusMsg(error.message || 'Something went wrong!');
    }
  };

  if (!isTokenSaved) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E2E8F0] p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <GitBranch size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#020F33] mb-2">Connect GitHub</h2>
          <p className="text-sm text-[#475569] mb-8">Enter your Personal Access Token (PAT) to enable direct code pushing.</p>
          
          <form onSubmit={handleSaveToken} className="space-y-4">
            <input 
              type="password" 
              required
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono text-sm"
            />
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
              <Key size={18} /> Save Securely
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto text-[#020F33] mb-24 md:mb-10 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8 bg-white p-5 md:p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            <GitBranch className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-[#020F33]">Developer Hub</h1>
            <p className="text-[#475569] font-medium mt-1 text-sm flex items-center gap-2">
              <TerminalSquare size={14} /> Commit & Push directly from OS.
            </p>
          </div>
        </div>
        <button onClick={removeToken} className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-2 rounded-lg hover:bg-rose-100 flex items-center gap-1.5 transition-colors">
          <Trash2 size={14} /> Remove Token
        </button>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-sm">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#475569] mb-4 flex items-center gap-2">
              <FileCode size={16} /> Repository Info
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 ml-1">Repository Name</label>
                <input 
                  type="text" 
                  value={repo}
                  onChange={e => setRepo(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 ml-1">File Path (e.g. src/note.txt)</label>
                <input 
                  type="text" 
                  required
                  value={filePath}
                  onChange={e => setFilePath(e.target.value)}
                  placeholder="daily-logs/today.md"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 ml-1">Commit Message</label>
                <input 
                  type="text" 
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder="Add new daily log"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {status !== 'idle' && (
            <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${
              status === 'loading' ? 'bg-blue-50 border-blue-200 text-blue-700' :
              status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {status === 'success' && <CheckCircle2 size={16} />}
                {status === 'error' && <AlertCircle size={16} />}
                {status.toUpperCase()}
              </div>
              <p className="text-xs font-medium">{statusMsg}</p>
            </div>
          )}
        </div>

        {/* Code Editor Column */}
        <div className="lg:col-span-2">
          <form onSubmit={handlePush} className="h-full flex flex-col bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800 min-h-[500px]">
            <div className="bg-slate-950 px-4 py-3 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="ml-2 text-xs font-mono text-slate-400">{filePath || 'untitled.txt'}</span>
              </div>
              <button 
                type="submit"
                disabled={status === 'loading' || !filePath || !content}
                className="bg-[#02C2D5] hover:bg-[#02A0B0] text-[#020F33] text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Commit & Push
              </button>
            </div>
            
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="// Write your code or markdown here...&#10;// E.g. console.log('Hello Al_Faravi OS!');"
              className="flex-1 w-full bg-transparent text-slate-300 font-mono p-5 text-sm focus:outline-none resize-none leading-relaxed"
              spellCheck="false"
            />
          </form>
        </div>

      </div>
    </div>
  );
}