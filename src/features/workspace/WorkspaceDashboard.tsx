// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Folder, FileText, Plus, Menu, X, Edit3 } from 'lucide-react';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // 🛡️ Auth Guard: লগইন ছাড়া কাউকে ঢুকতে দেবে না
  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session } } = await workspaceSupabase.auth.getSession();
    
    if (!session) {
      navigate('/workspace/login'); // সেশন না থাকলে কিক মেরে লগইন পেজে পাঠাবে
      return;
    }
    
    setSession(session);
    await fetchMyGroups();
  };

  const fetchMyGroups = async () => {
    // 🛡️ RLS ডাটাবেস থেকে শুধু নিজের গ্রুপগুলো আনবে
    const { data, error } = await workspaceSupabase.from('study_groups').select('*');
    if (error) console.error("Group Fetch Error:", error);

    if (data && data.length > 0) {
      setGroups(data);
      setSelectedGroup(data[0]); 
      fetchContents(data[0].id);
    }
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
    setIsMobileMenuOpen(false); // মোবাইল মেনু বন্ধ করবে
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 font-medium tracking-wide animate-pulse">Loading Workspace...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex overflow-hidden font-sans">
      
      {/* Mobile Header & Menu Toggle */}
      <div className="md:hidden fixed top-0 w-full bg-gray-900 border-b border-gray-800 z-50 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2 text-blue-400 font-bold text-xl">
          <BookOpen /> <span>Study Portal</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-300 p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile view) */}
      <div className={`fixed md:relative top-0 left-0 h-full w-72 bg-gray-900 border-r border-gray-800 p-6 flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-24 md:pt-6 shadow-2xl`}>
        
        <div className="hidden md:flex items-center gap-3 mb-10 text-blue-400 font-bold text-2xl tracking-tight">
          <div className="p-2 bg-blue-500/10 rounded-xl"><BookOpen className="w-7 h-7" /></div>
          <span>Study Portal</span>
        </div>
        
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4 ml-1">Assigned Groups</p>
          {groups.length === 0 ? (
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-800 text-center text-sm text-gray-500">
              No groups assigned yet.
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group ${
                  selectedGroup?.id === group.id 
                  ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white' 
                  : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Folder className={`w-5 h-5 ${selectedGroup?.id === group.id ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'}`} />
                <span className="font-medium truncate">{group.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="pt-6 border-t border-gray-800 mt-4">
          <div className="mb-4 px-2">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm font-semibold text-gray-300 truncate">{session?.user?.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white p-3 rounded-xl bg-red-500/10 hover:bg-red-500 transition-all font-medium">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-y-auto bg-gray-950 p-6 md:p-10 pt-24 md:pt-10">
        <div className="max-w-5xl mx-auto">
          {selectedGroup ? (
            <div className="animate-fade-in-up">
              
              {/* Group Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-gray-800 pb-6 mb-8 gap-4">
                <div>
                  <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                    {selectedGroup.name}
                  </h1>
                  <p className="text-gray-400 text-sm">Access your modules and collaborate with members.</p>
                </div>
                <button 
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-blue-500 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {showNoteForm ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4 text-blue-400" />} 
                  {showNoteForm ? 'Cancel Note' : 'Write a Note'}
                </button>
              </div>

              {/* Create Note Form */}
              {showNoteForm && (
                <form onSubmit={handleAddNote} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 mb-10 shadow-xl animate-fade-in-down">
                  <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"><Edit3 className="w-5 h-5"/> Share Note with Group</h3>
                  <div className="space-y-4">
                    <input type="text" placeholder="Subject / Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3.5 text-white transition-all outline-none" required />
                    <textarea placeholder="Write your content here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-3.5 text-white h-40 resize-none transition-all outline-none custom-scrollbar" required />
                    <div className="flex justify-end">
                      <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30">
                        Publish Note
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Content Grid */}
              <h3 className="text-lg font-semibold text-gray-300 mb-4">Study Materials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contents.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed flex flex-col items-center">
                    <Folder className="w-16 h-16 text-gray-700 mb-4" />
                    <p className="text-gray-400 font-medium">No contents pushed to this group yet.</p>
                  </div>
                ) : (
                  contents.map(item => (
                    <div key={item.id} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 flex flex-col justify-between min-h-[160px]">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-xl ${item.content_type === 'lms_course' ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                            <FileText className={`w-6 h-6 ${item.content_type === 'lms_course' ? 'text-green-400' : 'text-blue-400'}`} />
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${item.content_type === 'lms_course' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            {item.content_type === 'lms_course' ? 'Course' : 'Note'}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-100 group-hover:text-blue-400 transition-colors line-clamp-2">{item.title}</h3>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        <span className="group-hover:text-blue-400 transition-colors">View Details &rarr;</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
              <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-300 mb-2">Welcome to your Workspace</h2>
              <p className="text-gray-500 max-w-sm">Please select a group from the sidebar to access your courses and notes.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS Styles for animations and scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4B5563; }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
        .animate-fade-in-down { animation: fadeInDown 0.3s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}