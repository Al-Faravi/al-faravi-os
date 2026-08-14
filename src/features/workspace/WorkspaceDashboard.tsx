// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Folder, FileText, Edit3, X, LogOut, User, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // iOS Navigation States
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session } } = await workspaceSupabase.auth.getSession();
    
    if (!session) {
      navigate('/workspace/login');
      return;
    }
    setSession(session);
    await fetchMyGroups();
  };

  const fetchMyGroups = async () => {
    // RLS-এর কারণে ডাটাবেস শুধু এই ইউজারের গ্রুপগুলোই পাঠাবে
    const { data, error } = await workspaceSupabase.from('study_groups').select('*');
    if (error) console.error("Group Fetch Error:", error);
    if (data) setGroups(data);
    setLoading(false);
  };

  const fetchContents = async (groupId: string) => {
    const { data } = await workspaceSupabase
      .from('shared_contents')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setShowNoteForm(false);
    fetchContents(group.id);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setContents([]);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !selectedGroup) return;

    const { error } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: selectedGroup.id,
      title: noteTitle,
      content_type: 'shared_note',
      content_data: { text: noteContent }
    }]);

    if (!error) {
      setNoteTitle(''); setNoteContent(''); setShowNoteForm(false);
      fetchContents(selectedGroup.id);
    }
  };

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans pb-20 selection:bg-blue-200">
      
      {/* iOS Top Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        {selectedGroup && activeTab === 'home' ? (
          <button onClick={handleBackToGroups} className="text-[#007AFF] flex items-center gap-1 font-medium hover:opacity-70 transition-opacity">
            <ChevronLeft className="w-6 h-6" /> <span className="text-lg -ml-1">Back</span>
          </button>
        ) : (
          <div className="w-16"></div> /* Placeholder for alignment */
        )}
        
        <h1 className="text-lg font-semibold text-slate-900 truncate max-w-[200px]">
          {activeTab === 'profile' ? 'Profile' : (selectedGroup ? selectedGroup.name : 'Study Portal')}
        </h1>
        
        <div className="w-16 flex justify-end">
          {selectedGroup && activeTab === 'home' && (
             <button onClick={() => setShowNoteForm(!showNoteForm)} className="text-[#007AFF] font-medium hover:opacity-70">
               {showNoteForm ? 'Cancel' : 'Write'}
             </button>
          )}
        </div>
      </header>

      {/* Main Content Area - Centered for Desktop, Full for Mobile */}
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        
        {/* === HOME TAB === */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            
            {/* View 1: Group List (Folders) */}
            {!selectedGroup && (
              <>
                <div className="mb-6 px-2">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">My Groups</h2>
                  <p className="text-slate-500 mt-1">Select a group to view contents.</p>
                </div>
                
                {groups.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm mt-4">
                    <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">You haven't been added to any groups yet.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {groups.map((group, index) => (
                      <div key={group.id}>
                        <button
                          onClick={() => handleGroupClick(group)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors active:bg-slate-100"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                              <Folder className="w-5 h-5 text-[#007AFF]" />
                            </div>
                            <span className="font-semibold text-lg text-slate-800">{group.name}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                        {index !== groups.length - 1 && <div className="h-[1px] bg-slate-100 ml-16"></div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* View 2: Group Contents (Courses & Notes) */}
            {selectedGroup && (
              <div className="animate-slide-in-right">
                
                {/* Note Form */}
                {showNoteForm && (
                  <form onSubmit={handleAddNote} className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5 text-[#007AFF]"/> New Note</h3>
                    <div className="space-y-4">
                      <input type="text" placeholder="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-3 text-slate-800 outline-none focus:ring-2 focus:ring-[#007AFF]/30" required />
                      <textarea placeholder="Write something..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-3 text-slate-800 h-32 resize-none outline-none focus:ring-2 focus:ring-[#007AFF]/30" required />
                      <button type="submit" className="w-full bg-[#007AFF] hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all">Save Note</button>
                    </div>
                  </form>
                )}

                {/* Content List */}
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-2">Materials ({contents.length})</h3>
                
                {contents.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                    <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No materials in this group yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {contents.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2.5 rounded-xl ${item.content_type === 'lms_course' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#007AFF]'}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            {item.content_type === 'lms_course' ? 'Course' : 'Note'}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{item.title}</h3>
                        <p className="text-xs font-medium text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === PROFILE TAB === */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-col items-center mt-10 mb-8">
              <div className="w-24 h-24 bg-[#007AFF]/10 rounded-full flex items-center justify-center mb-4">
                <User className="w-12 h-12 text-[#007AFF]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{session?.user?.email}</h2>
              <p className="text-slate-500 text-sm">Guest Student</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="font-semibold text-red-600 text-lg">Log Out</span>
                </div>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* iOS Bottom Tab Bar */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-50">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <button 
            onClick={() => { setActiveTab('home'); setSelectedGroup(null); }} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'home' ? 'text-[#007AFF]' : 'text-slate-400'}`}
          >
            <BookOpen className={`w-6 h-6 ${activeTab === 'home' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">Groups</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'profile' ? 'text-[#007AFF]' : 'text-slate-400'}`}
          >
            <User className={`w-6 h-6 ${activeTab === 'profile' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">Profile</span>
          </button>
        </div>
      </nav>

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}