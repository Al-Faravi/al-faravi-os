import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, FolderLock, TrendingUp, BookOpen, 
  Briefcase, LayoutDashboard, Command, GitBranch, Code2 
} from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Ctrl+K বা Cmd+K চাপলে মডেল ওপেন হবে
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const routes = [
    { name: 'Dashboard (Home)', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'BCS Workspace', path: '/bcs', icon: <BookOpen size={18} /> },
    { name: 'LMS Academy', path: '/lms', icon: <Briefcase size={18} /> },
    { name: 'Finance Tracker', path: '/finance', icon: <TrendingUp size={18} /> },
    { name: 'Secure Vault', path: '/vault', icon: <FolderLock size={18} /> },
    { name: 'Developer Hub (GitHub)', path: '/github', icon: <GitBranch size={18} /> },
    { name: 'Snippet Vault (Code)', path: '/snippets', icon: <Code2 size={18} /> },
    { name: 'Job Tracker (Career)', path: '/jobs', icon: <Briefcase size={18} /> }
  ];

  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-20 px-4 bg-[#020F33]/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 border border-[#E2E8F0]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <Search className="text-[#94A3B8] mr-3" size={20} />
          <input 
            type="text"
            autoFocus
            placeholder="Search OS... (Go to Snippets, Jobs, Vault)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[#020F33] text-lg font-medium placeholder:text-[#94A3B8]"
          />
          <div className="flex gap-1 text-[10px] font-bold text-[#94A3B8] bg-white px-2 py-1 rounded-md border border-[#E2E8F0]">
            <Command size={12}/> K
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <p className="text-xs font-bold text-[#94A3B8] px-3 py-2 uppercase tracking-wider">Quick Navigation</p>
          {filteredRoutes.length === 0 ? (
            <div className="p-8 text-center text-[#475569]">
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredRoutes.map((route) => (
              <button
                key={route.path}
                onClick={() => handleNavigate(route.path)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] hover:text-[#02C2D5] text-[#020F33] rounded-xl transition-colors text-left group"
              >
                <div className="text-[#94A3B8] group-hover:text-[#02C2D5] transition-colors">
                  {route.icon}
                </div>
                <span className="font-bold">{route.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}