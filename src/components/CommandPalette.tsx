import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Home, BookOpen, Target, Shield, 
  Wallet, Users, GitBranch, Code2, Briefcase, 
  Settings as SettingsIcon, X, Command
} from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // App Routes and Commands
  const commands = [
    { id: 'home', title: 'Home Dashboard', path: '/', icon: <Home size={18} /> },
    { id: 'lms', title: 'LMS Workspace', path: '/lms', icon: <BookOpen size={18} /> },
    { id: 'bcs', title: 'BCS Prep', path: '/bcs', icon: <Target size={18} /> },
    { id: 'vault', title: 'Secure Vault', path: '/vault', icon: <Shield size={18} /> },
    { id: 'finance', title: 'Finance Manager', path: '/finance', icon: <Wallet size={18} /> },
    { id: 'family', title: 'Family Hub', path: '/family', icon: <Users size={18} /> },
    { id: 'github', title: 'GitHub Hub', path: '/github', icon: <GitBranch size={18} /> },
    { id: 'snippets', title: 'Developer Snippets', path: '/snippets', icon: <Code2 size={18} /> },
    { id: 'jobs', title: 'Job Tracker', path: '/jobs', icon: <Briefcase size={18} /> },
    { id: 'settings', title: 'Settings & Security', path: '/settings', icon: <SettingsIcon size={18} /> },
  ];

  // Handle Cmd+K / Ctrl+K Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus Input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 sm:pt-32 px-4 bg-slate-900/50 backdrop-blur-sm">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <Search className="text-slate-400 mr-3 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-lg"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Quick Access
              </div>
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.path)}
                  className="w-full flex items-center px-3 py-3 text-sm text-slate-700 hover:bg-[#02C2D5]/10 hover:text-[#020F33] rounded-xl transition-colors group text-left"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 group-hover:bg-[#02C2D5] group-hover:text-white transition-colors mr-3 shrink-0">
                    {cmd.icon}
                  </span>
                  <span className="font-medium flex-1">{cmd.title}</span>
                  <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Jump to
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-500">
              <Search size={40} className="mx-auto text-slate-300 mb-3" />
              <p>No results found for "<span className="font-medium">{searchQuery}</span>"</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-[10px] shadow-sm flex items-center gap-1">
              <Command size={10} /> K
            </kbd>
            <span>to open menu</span>
          </div>
          <div>
            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-md font-mono text-[10px] shadow-sm">ESC</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}