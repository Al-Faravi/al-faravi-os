// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Folder, FileText, Edit3, LogOut, User, BookOpen, ChevronRight, PlayCircle, Trash2, Video, FileBadge } from 'lucide-react';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Viewer States
  const [activeTab, setActiveTab] = useState<'home' | 'profile'>('home');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null); 
  
  // LMS/Course Player State
  const [activeLesson, setActiveLesson] = useState<any>(null);

  // CRUD States
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
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
      setActiveLesson(null);
    } else {
      setSelectedGroup(null);
      setContents([]);
    }
  };

  // --- CRUD Operations ---
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
    const { error } = await workspaceSupabase.from('shared_contents')
      .update({ title: noteTitle, content_data: { text: noteContent } })
      .eq('id', selectedContent.id);
    if (!error) {
      setIsEditing(false);
      setSelectedContent({ ...selectedContent, title: noteTitle, content_data: { text: noteContent } });
      fetchContents(selectedGroup.id);
    }
  };

const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    
    // 🛠️ ফিক্স: আগে delete(), তারপর eq()
    const { error } = await workspaceSupabase
      .from('shared_contents')
      .delete()
      .eq('id', id);
      
    if (!error) {
      handleBack(); 
      fetchContents(selectedGroup.id);
    } else {
      alert("Error deleting: " + error.message);
    }
  };

  // --- Viewer Opener ---
  const openContent = (item: any) => {
    setSelectedContent(item);
    if (item.content_type === 'shared_note') {
      setNoteTitle(item.title);
      setNoteContent(item.content_data.text || '');
    } else if (item.content_type === 'lms_course') {
      // কোর্সের প্রথম মডিউলের প্রথম লেসনটি অটোমেটিক প্লেয়ারে সেট করা হচ্ছে
      const firstModule = item.content_data?.modules?.[0];
      const firstLesson = firstModule?.lessons?.[0] || item.content_data?.lessons?.[0];
      if(firstLesson) setActiveLesson(firstLesson);
    }
  };

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  // Helper to extract YouTube ID
  const getYouTubeId = (url: string) => {
    if(!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans pb-20">
      
      {/* iOS Top Header */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        {(selectedGroup || selectedContent) && activeTab === 'home' ? (
          <button onClick={handleBack} className="text-[#007AFF] flex items-center gap-1 font-medium hover:opacity-70">
            <ChevronLeft className="w-6 h-6" /> <span className="text-lg -ml-1">Back</span>
          </button>
        ) : (
          <div className="w-16"></div> 
        )}
        
        <h1 className="text-lg font-semibold text-slate-900 truncate max-w-[200px]">
          {activeTab === 'profile' ? 'Profile' : (selectedContent ? 'Viewer' : (selectedGroup ? selectedGroup.name : 'Study Portal'))}
        </h1>
        
        <div className="w-16 flex justify-end">
          {selectedGroup && !selectedContent && activeTab === 'home' && (
             <button onClick={() => setShowNoteForm(!showNoteForm)} className="text-[#007AFF] font-medium">
               {showNoteForm ? 'Cancel' : 'Write'}
             </button>
          )}
          {selectedContent?.content_type === 'shared_note' && !isEditing && activeTab === 'home' && (
            <button onClick={() => setIsEditing(true)} className="text-[#007AFF] font-medium">Edit</button>
          )}
          {selectedContent?.content_type === 'shared_note' && isEditing && activeTab === 'home' && (
            <button onClick={handleUpdateNote} className="text-[#007AFF] font-bold">Save</button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6">
        
        {/* === HOME TAB === */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            
            {/* View 1: Group List */}
            {!selectedGroup && !selectedContent && (
              <>
                <h2 className="text-3xl font-bold text-slate-900 mb-6 px-2">My Groups</h2>
                {groups.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                    <p className="text-slate-500">No groups assigned yet.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {groups.map((g, i) => (
                      <div key={g.id}>
                        <button onClick={() => handleGroupClick(g)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                              <Folder className="w-5 h-5 text-[#007AFF]" />
                            </div>
                            <span className="font-semibold text-lg">{g.name}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                        {i !== groups.length - 1 && <div className="h-[1px] bg-slate-100 ml-16"></div>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* View 2: Group Contents List */}
            {selectedGroup && !selectedContent && (
              <div className="animate-slide-in-right">
                {showNoteForm && (
                  <form onSubmit={handleAddNote} className="bg-white p-5 rounded-2xl mb-6 shadow-sm">
                    <input type="text" placeholder="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-3 mb-3 outline-none" required />
                    <textarea placeholder="Content..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-3 h-32 resize-none mb-3 outline-none" required />
                    <button type="submit" className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold">Publish Note</button>
                  </form>
                )}

                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-2">Materials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contents.map(item => (
                    <div key={item.id} onClick={() => openContent(item)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md active:scale-95 cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${item.content_type === 'lms_course' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#007AFF]'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          {item.content_type === 'lms_course' ? 'Course' : 'Note'}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 line-clamp-2">{item.title}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: CRUD & Course Viewer */}
            {selectedContent && (
              <div className="animate-slide-in-right bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 min-h-[70vh]">
                
                {/* === REAL LMS COURSE VIEWER === */}
                {selectedContent.content_type === 'lms_course' && (
                  <div className="space-y-6">
                    {/* Video Player Area */}
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-lg">
                      {activeLesson?.video_url ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${getYouTubeId(activeLesson.video_url)}`} 
                          className="w-full h-full" 
                          allowFullScreen 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                          <PlayCircle className="w-12 h-12 opacity-50" />
                          <p>Select a video lesson to play</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Course Title & Active Lesson Info */}
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900">{selectedContent.title}</h2>
                      {activeLesson && <p className="text-[#007AFF] font-medium mt-1 flex items-center gap-2"><Video className="w-4 h-4"/> Now Playing: {activeLesson.title}</p>}
                    </div>

                    <div className="w-full h-[1px] bg-slate-100"></div>

                    {/* Modules and Lessons List (Smart Parsing) */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-slate-800">Course Content</h3>
                      
                      {/* যদি কোর্সে মডিউল থাকে */}
                      {selectedContent.content_data?.modules ? (
                        selectedContent.content_data.modules.map((module: any, mIdx: number) => (
                          <div key={mIdx} className="bg-[#F2F2F7] rounded-2xl overflow-hidden border border-slate-200">
                            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center gap-3">
                              <FileBadge className="w-5 h-5 text-emerald-600" />
                              <h4 className="font-bold text-slate-800">{module.title || `Module ${mIdx + 1}`}</h4>
                            </div>
                            <div className="divide-y divide-slate-200">
                              {module.lessons?.map((lesson: any, lIdx: number) => (
                                <button 
                                  key={lIdx} 
                                  onClick={() => setActiveLesson(lesson)}
                                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${activeLesson?.id === lesson.id || activeLesson?.title === lesson.title ? 'bg-blue-50 text-[#007AFF]' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                  <PlayCircle className={`w-5 h-5 ${activeLesson?.title === lesson.title ? 'text-[#007AFF]' : 'text-slate-400'}`} />
                                  <span className="font-medium">{lesson.title}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-sm">No structured modules found for this course.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* === SHARED NOTE VIEWER (Read/Edit) === */}
                {selectedContent.content_type === 'shared_note' && !isEditing && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900">{selectedContent.title}</h2>
                      <p className="text-slate-400 text-sm mt-1">{new Date(selectedContent.created_at).toLocaleString()}</p>
                    </div>
                    <div className="w-full h-[1px] bg-slate-100"></div>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap">{selectedContent.content_data.text}</p>
                    </div>
                    <div className="mt-12 flex justify-end">
                      <button onClick={() => handleDeleteNote(selectedContent.id)} className="flex items-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl font-semibold">
                        <Trash2 className="w-4 h-4" /> Delete Note
                      </button>
                    </div>
                  </div>
                )}

                {selectedContent.content_type === 'shared_note' && isEditing && (
                  <div className="space-y-4 animate-fade-in">
                    <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-4 font-bold text-lg outline-none" />
                    <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-4 h-64 resize-none outline-none text-lg" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === PROFILE TAB === */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in flex flex-col items-center mt-10">
            <div className="w-24 h-24 bg-[#007AFF]/10 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-[#007AFF]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{session?.user?.email}</h2>
            <button onClick={handleLogout} className="mt-8 w-full max-w-sm flex items-center justify-center gap-3 p-4 bg-white border border-red-100 rounded-2xl text-red-600 font-bold hover:bg-red-50">
              <LogOut className="w-5 h-5" /> Log Out
            </button>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 pb-safe z-50">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <button onClick={() => { setActiveTab('home'); handleBack(); }} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'home' ? 'text-[#007AFF]' : 'text-slate-400'}`}>
            <BookOpen className="w-6 h-6" /> <span className="text-[10px] font-semibold">Groups</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'profile' ? 'text-[#007AFF]' : 'text-slate-400'}`}>
            <User className="w-6 h-6" /> <span className="text-[10px] font-semibold">Profile</span>
          </button>
        </div>
      </nav>

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