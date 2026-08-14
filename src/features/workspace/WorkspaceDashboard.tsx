// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Folder, FileText, Edit3, X, LogOut, User, BookOpen, GraduationCap, ChevronRight, PlayCircle, Trash2, Save } from 'lucide-react';

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
  const [selectedContent, setSelectedContent] = useState<any>(null); // View State (Read)
  
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
    } else {
      setSelectedGroup(null);
      setContents([]);
    }
  };

  // 1. CREATE NOTE
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

  // 2. UPDATE NOTE
  const handleUpdateNote = async () => {
    if (!noteTitle || !noteContent || !selectedContent) return;
    const { error } = await workspaceSupabase.from('shared_contents')
      .update({ title: noteTitle, content_data: { text: noteContent } })
      .eq('id', selectedContent.id);
    if (!error) {
      setIsEditing(false);
      setSelectedContent({ ...selectedContent, title: noteTitle, content_data: { text: noteContent } });
      fetchContents(selectedGroup.id);
    } else {
      alert("Error updating: " + error.message);
    }
  };

  // 3. DELETE NOTE
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    const { error } = await workspaceSupabase.from('shared_contents').eq('id', id).delete();
    if (!error) {
      handleBack(); // Go back to group view
      fetchContents(selectedGroup.id);
    } else {
      alert("Error deleting: " + error.message);
    }
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
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans pb-20 selection:bg-blue-200">
      
      {/* iOS Top Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        {(selectedGroup || selectedContent) && activeTab === 'home' ? (
          <button onClick={handleBack} className="text-[#007AFF] flex items-center gap-1 font-medium hover:opacity-70 transition-opacity">
            <ChevronLeft className="w-6 h-6" /> <span className="text-lg -ml-1">Back</span>
          </button>
        ) : (
          <div className="w-16"></div> 
        )}
        
        <h1 className="text-lg font-semibold text-slate-900 truncate max-w-[180px]">
          {activeTab === 'profile' ? 'Profile' : 
            (selectedContent ? 'Viewer' : 
              (selectedGroup ? selectedGroup.name : 'Study Portal'))}
        </h1>
        
        <div className="w-16 flex justify-end">
          {selectedGroup && !selectedContent && activeTab === 'home' && (
             <button onClick={() => setShowNoteForm(!showNoteForm)} className="text-[#007AFF] font-medium hover:opacity-70">
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

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        
        {/* === HOME TAB === */}
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            
            {/* View 1: Group List */}
            {!selectedGroup && !selectedContent && (
              <>
                <div className="mb-6 px-2">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">My Groups</h2>
                </div>
                {groups.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                    <p className="text-slate-500 font-medium">No groups assigned yet.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {groups.map((group, index) => (
                      <div key={group.id}>
                        <button onClick={() => handleGroupClick(group)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors">
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

            {/* View 2: Group Contents List */}
            {selectedGroup && !selectedContent && (
              <div className="animate-slide-in-right">
                
                {/* Create Form */}
                {showNoteForm && (
                  <form onSubmit={handleAddNote} className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5 text-[#007AFF]"/> New Note</h3>
                    <div className="space-y-4">
                      <input type="text" placeholder="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-3 outline-none" required />
                      <textarea placeholder="Write something..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-3 h-32 resize-none outline-none" required />
                      <button type="submit" className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-bold">Publish Note</button>
                    </div>
                  </form>
                )}

                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 ml-2">Materials</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contents.map(item => (
                    <div key={item.id} onClick={() => openContent(item)} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex flex-col justify-between min-h-[140px]">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2.5 rounded-xl ${item.content_type === 'lms_course' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#007AFF]'}`}>
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            {item.content_type === 'lms_course' ? 'Course' : 'Note'}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight line-clamp-2">{item.title}</h3>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View 3: CRUD Viewer (Course or Note) */}
            {selectedContent && (
              <div className="animate-slide-in-right bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 min-h-[60vh]">
                
                {/* Read Mode */}
                {!isEditing && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={`p-3 rounded-2xl ${selectedContent.content_type === 'lms_course' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#007AFF]'}`}>
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{selectedContent.title}</h2>
                        <p className="text-slate-500 text-sm mt-1">{new Date(selectedContent.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="w-full h-[1px] bg-slate-100 mb-6"></div>

                    {/* Course Data Visualization (Read-Only) */}
                    {selectedContent.content_type === 'lms_course' && (
                      <div className="space-y-4">
                        <div className="bg-[#F2F2F7] p-5 rounded-2xl flex items-center gap-4">
                          <PlayCircle className="w-10 h-10 text-emerald-500" />
                          <div>
                            <h4 className="font-bold text-slate-800">Course Introduction</h4>
                            <p className="text-xs text-slate-500">Module 1</p>
                          </div>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-lg">
                          This is a premium course imported from the Main OS. Course specific modules and videos will be displayed here based on your LMS data structure.
                        </p>
                      </div>
                    )}

                    {/* Note Data Visualization */}
                    {selectedContent.content_type === 'shared_note' && (
                      <div className="prose prose-slate max-w-none">
                        <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap">
                          {selectedContent.content_data.text}
                        </p>
                      </div>
                    )}

                    {/* Delete Button (Only for notes) */}
                    {selectedContent.content_type === 'shared_note' && (
                      <div className="mt-12 flex justify-end">
                        <button onClick={() => handleDeleteNote(selectedContent.id)} className="flex items-center gap-2 text-red-500 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors font-semibold text-sm">
                          <Trash2 className="w-4 h-4" /> Delete Note
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Edit Mode (Only for notes) */}
                {isEditing && (
                  <div className="space-y-5 animate-fade-in">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Edit3 className="text-[#007AFF]" /> Edit Note
                    </h3>
                    <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-4 font-bold text-lg outline-none focus:ring-2 focus:ring-[#007AFF]/30" />
                    <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-[#F2F2F7] rounded-xl p-4 h-64 resize-none outline-none focus:ring-2 focus:ring-[#007AFF]/30 text-lg leading-relaxed" />
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
              <p className="text-slate-500 text-sm">Workspace Member</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
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
          <button onClick={() => { setActiveTab('home'); handleBack(); }} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'home' ? 'text-[#007AFF]' : 'text-slate-400'}`}>
            <BookOpen className={`w-6 h-6 ${activeTab === 'home' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-semibold">Groups</span>
          </button>
          
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'profile' ? 'text-[#007AFF]' : 'text-slate-400'}`}>
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