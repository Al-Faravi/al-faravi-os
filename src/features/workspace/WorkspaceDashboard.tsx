// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Folder, FileText, Menu, X, Edit3, ChevronRight, GraduationCap } from 'lucide-react';

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
    setIsMobileMenuOpen(false); 
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-600 font-medium tracking-wide animate-pulse">Loading your workspace...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Mobile Header & Menu Toggle */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-50 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <GraduationCap className="w-7 h-7" /> <span>Study Portal</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile view) */}
      <div className={`fixed md:relative top-0 left-0 h-full w-72 bg-white border-r border-slate-200 p-6 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-24 md:pt-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)]`}>
        
        <div className="hidden md:flex items-center gap-3 mb-10 text-slate-800 font-extrabold text-2xl tracking-tight">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><GraduationCap className="w-7 h-7" /></div>
          <span>Study Portal</span>
        </div>
        
        <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-4 ml-1">Assigned Groups</p>
          {groups.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-sm text-slate-500">
              No groups assigned yet.
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group ${
                  selectedGroup?.id === group.id 
                  ? 'bg-blue-600 shadow-md shadow-blue-600/20 text-white' 
                  : 'hover:bg-slate-50 text-slate-600 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Folder className={`w-5 h-5 flex-shrink-0 ${selectedGroup?.id === group.id ? 'text-blue-200' : 'text-slate-400 group-hover:text-blue-500'}`} />
                  <span className="font-semibold truncate">{group.name}</span>
                </div>
                {selectedGroup?.id === group.id && <ChevronRight className="w-4 h-4 text-blue-200" />}
              </button>
            ))
          )}
        </div>

        <div className="pt-6 border-t border-slate-100 mt-4">
          <div className="mb-4 px-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-400 font-medium mb-1">Logged in as</p>
            <p className="text-sm font-bold text-slate-700 truncate">{session?.user?.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-white p-3 rounded-xl bg-red-50 hover:bg-red-500 transition-all font-semibold">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-y-auto bg-slate-50/50 p-6 md:p-10 pt-24 md:pt-10">
        <div className="max-w-6xl mx-auto">
          {selectedGroup ? (
            <div className="animate-fade-in-up">
              
              {/* Group Header */}
              <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-200 pb-6 mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {selectedGroup.name}
                    </h1>
                  </div>
                  <p className="text-slate-500 text-sm md:text-base ml-1">Access your modules and collaborate with members.</p>
                </div>
                <button 
                  onClick={() => setShowNoteForm(!showNoteForm)}
                  className="bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {showNoteForm ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />} 
                  {showNoteForm ? 'Cancel Note' : 'Write a Note'}
                </button>
              </div>

              {/* Create Note Form */}
              {showNoteForm && (
                <form onSubmit={handleAddNote} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 mb-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fade-in-down">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-600"/> Share a Note with the Group</h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1">Note Title</label>
                      <input type="text" placeholder="e.g. Important concepts from Chapter 1" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3.5 text-slate-800 transition-all outline-none font-medium" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5 ml-1">Content</label>
                      <textarea placeholder="Write your content here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl p-3.5 text-slate-800 h-40 resize-none transition-all outline-none custom-scrollbar" required />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
                        Publish Note
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Content Grid */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Study Materials</h3>
                <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{contents.length} Items</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {contents.length === 0 ? (
                  <div className="col-span-full p-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed flex flex-col items-center shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Folder className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No Materials Yet</h3>
                    <p className="text-slate-500 font-medium">Courses and notes pushed to this group will appear here.</p>
                  </div>
                ) : (
                  contents.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all duration-300 cursor-pointer group hover:-translate-y-1.5 hover:shadow-[0_10px_40px_-10px_rgba(37,99,235,0.15)] flex flex-col justify-between min-h-[180px]">
                      <div>
                        <div className="flex items-start justify-between mb-5">
                          <div className={`p-3 rounded-xl shadow-sm border ${item.content_type === 'lms_course' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${item.content_type === 'lms_course' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                            {item.content_type === 'lms_course' ? 'Course Module' : 'Group Note'}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                          {item.title}
                        </h3>
                      </div>
                      <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">{new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          View Details <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[75vh] text-center px-4">
              <div className="w-28 h-28 bg-white shadow-xl shadow-blue-900/5 rounded-3xl flex items-center justify-center mb-8 border border-slate-100 rotate-3 transition-transform hover:rotate-0 duration-300">
                <GraduationCap className="w-14 h-14 text-blue-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">Welcome to your Portal</h2>
              <p className="text-slate-500 font-medium max-w-md text-lg">Select a group from the sidebar to access your premium courses and collaborative notes.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Premium CSS Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in-down { animation: fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}