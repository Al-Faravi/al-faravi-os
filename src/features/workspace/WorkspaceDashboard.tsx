// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Folder, FileText, Edit3, LogOut, User, BookOpen, ChevronRight, 
  Trash2, MessageCircle, X, Send, Paperclip, Mic, Sun, Moon 
} from 'lucide-react';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark'); // Theme State
  
  // CRUD States
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null); 
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Floating Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
    // Default theme check (Optional)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session } } = await workspaceSupabase.auth.getSession();
    if (!session) return navigate('/workspace/login');
    setSession(session);
    await fetchMyGroups();
  };

  const fetchMyGroups = async () => {
    const { data } = await workspaceSupabase.from('study_groups').select('*');
    if (data) setGroups(data);
    setLoading(false);
  };

  const fetchContents = async (groupId: string) => {
    const { data } = await workspaceSupabase.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setShowNoteForm(false);
    fetchContents(group.id);
  };

  const handleBack = () => {
    if (selectedContent) {
      setSelectedContent(null);
      setIsEditing(false);
    } else {
      setSelectedGroup(null);
      setContents([]);
      setIsChatOpen(false); // Close chat if going back to group list
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !selectedGroup) return;
    const { error } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: selectedGroup.id, title: noteTitle, content_type: 'shared_note', content_data: { text: noteContent }
    }]);
    if (!error) {
      setNoteTitle(''); setNoteContent(''); setShowNoteForm(false);
      fetchContents(selectedGroup.id);
    }
  };

  const handleUpdateNote = async () => {
    if (!noteTitle || !noteContent || !selectedContent) return;
    const { error } = await workspaceSupabase.from('shared_contents').update({ title: noteTitle, content_data: { text: noteContent } }).eq('id', selectedContent.id);
    if (!error) {
      setIsEditing(false);
      setSelectedContent({ ...selectedContent, title: noteTitle, content_data: { text: noteContent } });
      fetchContents(selectedGroup.id);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    const { error } = await workspaceSupabase.from('shared_contents').delete().eq('id', id);
    if (!error) { handleBack(); fetchContents(selectedGroup.id); }
  };

  const openContent = (item: any) => {
    setSelectedContent(item);
    if (item.content_type === 'shared_note') {
      setNoteTitle(item.title);
      setNoteContent(item.content_data.text || '');
    }
  };

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0D0E0F]' : 'bg-slate-50'}`}>
      <div className="w-10 h-10 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Viewers Sub-components
  let ViewerComponent = null;
  if (selectedContent?.content_type === 'lms_course') {
    ViewerComponent = <WorkspaceCourseViewer courseData={selectedContent} onBack={handleBack} />;
  } else if (selectedContent?.content_type === 'bcs_subject') {
    ViewerComponent = <WorkspaceBcsViewer subjectData={selectedContent} onBack={handleBack} />;
  }

  return (
    <div className={`${theme} transition-colors duration-300`}>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] text-slate-900 dark:text-[#F5F5F5] font-sans pb-20 selection:bg-[#FF9D2E]/30 relative">
        
        {/* Fullscreen Viewers Rendered Here (If Active) */}
        {ViewerComponent && (
          <div className="fixed inset-0 z-[90] bg-slate-50 dark:bg-[#0D0E0F]">
            {ViewerComponent}
          </div>
        )}

        {/* Normal Dashboard View (If No Fullscreen Viewer) */}
        {!ViewerComponent && (
          <>
            {/* Top Header */}
            <header className="sticky top-0 bg-white/80 dark:bg-[#141516]/80 backdrop-blur-md border-b border-slate-200 dark:border-[#292B2E] z-40 px-4 py-3 flex items-center justify-between shadow-sm">
              {(selectedGroup || selectedContent) && activeTab === 'home' ? (
                <button onClick={handleBack} className="text-[#FF9D2E] flex items-center gap-1 font-medium hover:opacity-70">
                  <ChevronLeft className="w-6 h-6" /> <span className="text-lg -ml-1">Back</span>
                </button>
              ) : (
                <div className="w-16"></div> 
              )}
              
              <h1 className="text-lg font-bold truncate max-w-[200px]">
                {activeTab === 'profile' ? 'Profile' : (selectedContent ? 'Viewer' : (selectedGroup ? selectedGroup.name : 'Study Portal'))}
              </h1>
              
              <div className="flex items-center gap-4">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-slate-500 dark:text-[#A3A5A8] hover:text-[#FF9D2E] transition-colors">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                
                {selectedGroup && !selectedContent && activeTab === 'home' && (
                  <button onClick={() => setShowNoteForm(!showNoteForm)} className="text-[#FF9D2E] font-medium hidden sm:block">
                    {showNoteForm ? 'Cancel' : 'Write'}
                  </button>
                )}
                {selectedContent?.content_type === 'shared_note' && !isEditing && activeTab === 'home' && (
                  <button onClick={() => setIsEditing(true)} className="text-[#FF9D2E] font-medium">Edit</button>
                )}
                {selectedContent?.content_type === 'shared_note' && isEditing && activeTab === 'home' && (
                  <button onClick={handleUpdateNote} className="text-[#FF9D2E] font-bold">Save</button>
                )}
              </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 md:p-6">
              
              {/* === HOME TAB === */}
              {activeTab === 'home' && (
                <div className="animate-fade-in">
                  
                  {/* 1. Group List */}
                  {!selectedGroup && !selectedContent && (
                    <>
                      <h2 className="text-3xl font-extrabold mb-6 px-2">My Groups</h2>
                      {groups.length === 0 ? (
                        <div className="bg-white dark:bg-[#18191A] rounded-2xl p-8 text-center border border-slate-200 dark:border-[#292B2E] shadow-sm">
                          <p className="text-slate-500 dark:text-[#A3A5A8]">No groups assigned yet.</p>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#18191A] rounded-2xl border border-slate-200 dark:border-[#292B2E] overflow-hidden shadow-sm">
                          {groups.map((g, i) => (
                            <div key={g.id}>
                              <button onClick={() => handleGroupClick(g)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-[#1D1E20] transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] rounded-xl flex items-center justify-center">
                                    <Folder className="w-5 h-5 text-[#FF9D2E]" />
                                  </div>
                                  <span className="font-bold text-lg">{g.name}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-[#707277]" />
                              </button>
                              {i !== groups.length - 1 && <div className="h-[1px] bg-slate-100 dark:bg-[#292B2E] ml-16"></div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* 2. Group Contents List */}
                  {selectedGroup && !selectedContent && (
                    <div className="animate-slide-in-right">
                      {showNoteForm && (
                        <form onSubmit={handleAddNote} className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] mb-6 shadow-sm">
                          <input type="text" placeholder="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 mb-3 outline-none text-slate-900 dark:text-white" required />
                          <textarea placeholder="Write something..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 h-32 resize-none mb-3 outline-none text-slate-900 dark:text-white" required />
                          <button type="submit" className="w-full bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 py-3 rounded-xl font-extrabold transition-all">Publish Note</button>
                        </form>
                      )}

                      <h3 className="text-sm font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider mb-3 ml-2">Materials</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {contents.map(item => (
                          <div key={item.id} onClick={() => openContent(item)} className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm hover:border-[#FF9D2E]/50 transition-all cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                              <div className={`p-2.5 rounded-xl ${item.content_type.includes('course') || item.content_type.includes('subject') ? 'bg-[#19C784]/10 text-[#19C784]' : 'bg-[#668CFF]/10 text-[#668CFF]'}`}>
                                {item.content_type.includes('note') ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-[#A3A5A8] bg-slate-50 dark:bg-[#1D1E20] px-2 py-1 rounded-md border border-slate-100 dark:border-[#292B2E] uppercase">
                                {item.content_type.replace('_', ' ')}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg leading-snug line-clamp-2">{item.title}</h3>
                          </div>
                        ))}
                        {contents.length === 0 && (
                          <div className="col-span-full py-10 text-center text-slate-500 dark:text-[#707277]">No materials found.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Note Viewer (Read/Edit) */}
                  {selectedContent && selectedContent.content_type === 'shared_note' && (
                    <div className="animate-slide-in-right bg-white dark:bg-[#18191A] rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-[#292B2E] min-h-[70vh]">
                      {!isEditing && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-extrabold">{selectedContent.title}</h2>
                            <p className="text-slate-500 dark:text-[#707277] text-sm mt-1">{new Date(selectedContent.created_at).toLocaleString()}</p>
                          </div>
                          <div className="w-full h-[1px] bg-slate-100 dark:bg-[#292B2E]"></div>
                          <div className="prose prose-slate dark:prose-invert max-w-none">
                            <p className="leading-relaxed text-lg whitespace-pre-wrap">{selectedContent.content_data.text}</p>
                          </div>
                          <div className="mt-12 flex justify-end">
                            <button onClick={() => handleDeleteNote(selectedContent.id)} className="flex items-center gap-2 text-[#FF5B61] bg-[#FF5B61]/10 px-4 py-2 rounded-xl font-bold">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                      {isEditing && (
                        <div className="space-y-4">
                          <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl p-4 font-bold text-lg outline-none" />
                          <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl p-4 h-64 resize-none outline-none text-lg" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* === PROFILE TAB === */}
              {activeTab === 'profile' && (
                <div className="animate-fade-in flex flex-col items-center mt-10">
                  <div className="w-24 h-24 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-[#FF9D2E]" />
                  </div>
                  <h2 className="text-xl font-bold">{session?.user?.email}</h2>
                  <p className="text-slate-500 dark:text-[#A3A5A8] text-sm mt-1">Study Group Member</p>
                  
                  <button onClick={handleLogout} className="mt-10 w-full max-w-sm flex items-center justify-center gap-3 p-4 bg-white dark:bg-[#18191A] border border-[#FF5B61]/20 rounded-2xl text-[#FF5B61] font-bold hover:bg-[#FF5B61]/10 transition-colors">
                    <LogOut className="w-5 h-5" /> Log Out
                  </button>
                </div>
              )}
            </main>

            {/* iOS Bottom Tab Bar */}
            <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-[#141516]/90 backdrop-blur-lg border-t border-slate-200 dark:border-[#292B2E] pb-safe z-40">
              <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                <button onClick={() => { setActiveTab('home'); handleBack(); }} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'home' ? 'text-[#FF9D2E]' : 'text-slate-400 dark:text-[#707277]'}`}>
                  <BookOpen className="w-6 h-6" /> <span className="text-[10px] font-bold">Groups</span>
                </button>
                <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'profile' ? 'text-[#FF9D2E]' : 'text-slate-400 dark:text-[#707277]'}`}>
                  <User className="w-6 h-6" /> <span className="text-[10px] font-bold">Profile</span>
                </button>
              </div>
            </nav>
          </>
        )}

        {/* =========================================
            FLOATING CHAT HEAD & WINDOW (Always on Top)
            ========================================= */}
        {selectedGroup && (
          <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[999] flex flex-col items-end">
            
            {/* Chat Window (Opens when clicked) */}
            {isChatOpen && (
              <div className="w-[85vw] max-w-[360px] h-[450px] bg-white dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] shadow-2xl rounded-2xl mb-4 flex flex-col overflow-hidden animate-fade-in origin-bottom-right">
                {/* Chat Header */}
                <div className="bg-slate-100 dark:bg-[#18191A] p-4 border-b border-slate-200 dark:border-[#292B2E] flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-[#F5F5F5] flex items-center gap-2">
                      <MessageCircle size={18} className="text-[#FF9D2E]" /> Group Chat
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#707277]">{selectedGroup.name}</p>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                {/* Chat Body (Placeholder for now) */}
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-[#0D0E0F]">
                  <div className="text-center text-xs text-slate-400 dark:text-[#707277] mb-6">Today</div>
                  
                  {/* Dummy Message 1 */}
                  <div className="flex flex-col items-start mb-4">
                    <span className="text-[10px] text-slate-500 dark:text-[#A3A5A8] ml-1 mb-1">Faravi (Admin)</span>
                    <div className="bg-white dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] text-slate-800 dark:text-[#F5F5F5] px-4 py-2 rounded-2xl rounded-tl-sm text-sm shadow-sm max-w-[85%]">
                      Welcome to the group! Let's start learning.
                    </div>
                  </div>

                  {/* Dummy Message 2 */}
                  <div className="flex flex-col items-end mb-4">
                    <span className="text-[10px] text-slate-500 dark:text-[#A3A5A8] mr-1 mb-1">You</span>
                    <div className="bg-[#FF9D2E] text-slate-900 px-4 py-2 rounded-2xl rounded-tr-sm text-sm shadow-sm max-w-[85%]">
                      Thanks! The dark theme looks amazing 🔥
                    </div>
                  </div>
                </div>

                {/* Chat Input Box */}
                <div className="p-3 bg-white dark:bg-[#18191A] border-t border-slate-200 dark:border-[#292B2E] flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-[#FF9D2E] transition-colors"><Paperclip size={18}/></button>
                  <input type="text" placeholder="Type a message..." className="flex-1 bg-slate-100 dark:bg-[#1D1E20] border border-transparent focus:border-[#FF9D2E]/50 rounded-full px-4 py-2 text-sm text-slate-800 dark:text-white outline-none" />
                  <button className="p-2 text-slate-400 hover:text-[#FF9D2E] transition-colors"><Mic size={18}/></button>
                  <button className="p-2 bg-[#FF9D2E] text-slate-900 rounded-full hover:bg-[#FFAA3D] transition-colors"><Send size={16}/></button>
                </div>
              </div>
            )}

            {/* Floating Bubble Button */}
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="w-14 h-14 bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 rounded-full flex items-center justify-center shadow-[0_10px_25px_rgba(255,157,46,0.4)] transition-transform hover:scale-110 active:scale-95 relative"
            >
              {isChatOpen ? <X size={26} strokeWidth={2.5} /> : <MessageCircle size={26} strokeWidth={2.5} />}
              
              {/* Notification Ping */}
              {!isChatOpen && (
                <span className="absolute top-0 right-0 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-[#0D0E0F]"></span>
                </span>
              )}
            </button>
          </div>
        )}

      </div>
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}