// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, Moon, LayoutDashboard, Users, User, BookOpen, Clock, FileText, 
  ChevronRight, MessageCircle, X, Send, Paperclip, Mic, ArrowLeft, 
  Trash2, Edit3, FolderOpen, Bell, Sparkles, LogOut 
} from 'lucide-react';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  
  const [groups, setGroups] = useState<any[]>([]);
  const [allContents, setAllContents] = useState<any[]>([]); 
  
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupContents, setGroupContents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // CRUD States
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null); 
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Floating Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ১. পেজ লোড হলে লোকাল স্টোরেজ থেকে থিম পড়বে এবং ডাটা ফেচ করবে
  useEffect(() => {
    checkAuthAndFetchData();
    const savedTheme = localStorage.getItem('workspace_theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
  }, []);

  // ২. যখনই theme চেঞ্জ হবে, তখনই এটি HTML ট্যাগে রিয়েল-টাইম ক্লাস বসাবে
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.style.backgroundColor = '#0D0E0F'; 
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; 
    }
  }, [theme]);

  // ৩. Real-time Subscription (selectedGroup ও isChatOpen চেঞ্জ হলে)
  useEffect(() => {
    if (selectedGroup && isChatOpen) {
      fetchMessages();
      
      // Real-time listener setup for new messages
      const subscription = workspaceSupabase
        .channel(`group_chat_${selectedGroup.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'group_chats',
          filter: `group_id=eq.${selectedGroup.id}`
        }, (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        })
        .subscribe();

      return () => {
        workspaceSupabase.removeChannel(subscription);
      };
    }
  }, [selectedGroup, isChatOpen]);

  // ৪. Auto Scroll (যখনই নতুন মেসেজ আসবে)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('workspace_theme', newTheme);
      return newTheme;
    });
  };

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session } } = await workspaceSupabase.auth.getSession();
    if (!session) return navigate('/workspace/login');
    
    setSession(session);
    setProfileName(session.user?.email?.split('@')[0] || 'Student');

    const { data: gData } = await workspaceSupabase.from('study_groups').select('*');
    if (gData) setGroups(gData);

    const { data: cData } = await workspaceSupabase.from('shared_contents').select('*').order('created_at', { ascending: false }).limit(10);
    if (cData) setAllContents(cData);

    setLoading(false);
  };

  const fetchGroupContents = async (groupId: string) => {
    const { data } = await workspaceSupabase.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setGroupContents(data);
  };

  const fetchMessages = async () => {
    const { data } = await workspaceSupabase
      .from('group_chats')
      .select('*')
      .eq('group_id', selectedGroup.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    setIsSending(true);
    const { data: { user } } = await workspaceSupabase.auth.getUser();

    const { error } = await workspaceSupabase.from('group_chats').insert([{
      group_id: selectedGroup.id,
      user_id: user?.id,
      sender_name: profileName,
      content: newMessage,
      message_type: 'text'
    }]);

    if (!error) {
      setNewMessage('');
    } else {
      console.error("Chat send error:", error);
    }
    setIsSending(false);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setShowNoteForm(false);
    fetchGroupContents(group.id);
  };

  const handleBack = () => {
    if (selectedContent) {
      setSelectedContent(null);
      setIsEditing(false);
    } else {
      setSelectedGroup(null);
      setGroupContents([]);
      setIsChatOpen(false);
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
      fetchGroupContents(selectedGroup.id); 
    }
  };

  const handleUpdateNote = async () => {
    if (!noteTitle || !noteContent || !selectedContent) return;
    const { error } = await workspaceSupabase.from('shared_contents').update({ title: noteTitle, content_data: { text: noteContent } }).eq('id', selectedContent.id);
    if (!error) {
      setIsEditing(false);
      setSelectedContent({ ...selectedContent, title: noteTitle, content_data: { text: noteContent } });
      fetchGroupContents(selectedGroup.id);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Delete this note?")) return;
    const { error } = await workspaceSupabase.from('shared_contents').delete().eq('id', id);
    if (!error) { 
      handleBack(); 
      fetchGroupContents(selectedGroup.id); 
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

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const totalCourses = allContents.filter(c => c.content_type.includes('course') || c.content_type.includes('subject')).length;
  const totalNotes = allContents.filter(c => c.content_type.includes('note')).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0D0E0F]">
      <div className="w-12 h-12 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (selectedContent?.content_type === 'lms_course') return <WorkspaceCourseViewer courseData={selectedContent} onBack={handleBack} />;
  if (selectedContent?.content_type === 'bcs_subject') return <WorkspaceBcsViewer subjectData={selectedContent} onBack={handleBack} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] text-slate-900 dark:text-[#F5F5F5] font-sans pb-24 transition-colors duration-300 selection:bg-[#FF9D2E]/30 relative">
      
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 dark:bg-[#141516]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#292B2E] z-40 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {selectedGroup ? (
            <button onClick={handleBack} className="p-2 bg-slate-100 dark:bg-[#1D1E20] hover:bg-slate-200 dark:hover:bg-[#292B2E] rounded-xl text-slate-600 dark:text-[#A3A5A8] transition-colors">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF9D2E] to-[#E83FCB] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF9D2E]/20">
              <Sparkles size={20} className="text-white" />
            </div>
          )}
          <h1 className="text-xl font-extrabold tracking-tight">
            {selectedGroup ? selectedGroup.name : 'Study Portal'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={toggleTheme} className="p-2.5 text-slate-500 dark:text-[#A3A5A8] hover:bg-slate-100 dark:hover:bg-[#1D1E20] rounded-xl transition-colors">
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button className="p-2.5 text-slate-500 dark:text-[#A3A5A8] hover:bg-slate-100 dark:hover:bg-[#1D1E20] rounded-xl transition-colors relative">
            <Bell size={22} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#FF5B61] rounded-full"></span>
          </button>
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-[#292B2E]">
            <div className="text-right">
              <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">{profileName}</p>
              <p className="text-xs text-slate-500 dark:text-[#707277] mt-1">Student</p>
            </div>
            <div className="w-10 h-10 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center border border-[#FF9D2E]/30">
              <User size={20} className="text-[#FF9D2E]" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 mt-2">
        
        {/* MAIN DASHBOARD */}
        {!selectedGroup && activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
            
            {/* FIXED WELCOME BANNER */}
            <div className="bg-gradient-to-r from-white to-slate-100 dark:from-[#18191A] dark:to-[#141516] rounded-3xl p-8 border border-slate-200 dark:border-[#292B2E] shadow-xl relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D2E]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <p className="text-[#FF9D2E] font-bold text-sm mb-2">{currentDate}</p>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-[#F5F5F5] mb-3">Welcome back, {profileName}! 👋</h2>
                <p className="text-slate-600 dark:text-[#A3A5A8] max-w-lg text-sm md:text-base leading-relaxed">
                  Ready to level up your skills today? Check out your assigned groups and continue your learning journey from where you left off.
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2 transition-colors">
                <Users size={24} className="text-[#668CFF]" />
                <h3 className="text-2xl font-black">{groups.length}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Joined Groups</p>
              </div>
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2 transition-colors">
                <BookOpen size={24} className="text-[#19C784]" />
                <h3 className="text-2xl font-black">{totalCourses}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Assigned Courses</p>
              </div>
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2 transition-colors">
                <FileText size={24} className="text-[#E83FCB]" />
                <h3 className="text-2xl font-black">{totalNotes}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Shared Notes</p>
              </div>
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2 transition-colors">
                <Clock size={24} className="text-[#FF9D2E]" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Active</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Current Status</p>
              </div>
            </div>

            {/* My Groups */}
            <div>
              <div className="flex items-center justify-between mb-5 px-1">
                <h3 className="text-xl font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
                  <LayoutDashboard className="text-[#FF9D2E]"/> My Study Workspaces
                </h3>
              </div>
              
              {groups.length === 0 ? (
                <div className="bg-white dark:bg-[#18191A] rounded-3xl p-10 text-center border border-slate-200 dark:border-[#292B2E] shadow-sm transition-colors">
                  <FolderOpen size={48} className="mx-auto text-slate-300 dark:text-[#292B2E] mb-4" />
                  <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">You haven't been added to any groups yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groups.map(group => (
                    <div 
                      key={group.id} 
                      onClick={() => handleGroupClick(group)}
                      className="bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] hover:border-[#FF9D2E] dark:hover:border-[#FF9D2E] p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[#FF9D2E]/5"
                    >
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] rounded-2xl flex items-center justify-center text-[#FF9D2E] group-hover:bg-[#FF9D2E] group-hover:text-white dark:group-hover:text-[#0D0E0F] transition-colors">
                          <FolderOpen size={28} />
                        </div>
                        <h4 className="text-xl font-bold leading-tight text-slate-900 dark:text-white group-hover:text-[#FF9D2E] transition-colors">{group.name}</h4>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-[#292B2E] text-sm">
                        <span className="text-slate-500 dark:text-[#A3A5A8] font-medium">Click to enter portal</span>
                        <ChevronRight size={18} className="text-slate-300 dark:text-[#707277] group-hover:text-[#FF9D2E] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Uploads */}
            {allContents.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 px-1 text-slate-600 dark:text-[#A3A5A8]">Recently Uploaded</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                  {allContents.slice(0, 5).map(item => (
                    <div key={item.id} className="min-w-[260px] bg-white dark:bg-[#18191A] p-4 rounded-2xl border border-slate-200 dark:border-[#292B2E] shrink-0 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${item.content_type.includes('course') || item.content_type.includes('subject') ? 'bg-[#19C784]' : 'bg-[#668CFF]'}`}></span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-[#707277] uppercase">{item.content_type.replace('_', ' ')}</span>
                      </div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* INSIDE GROUP VIEW */}
        {selectedGroup && !selectedContent && (
          <div className="animate-slide-in-right">
            
            <div className="flex justify-between items-end mb-6 border-b border-slate-200 dark:border-[#292B2E] pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedGroup.name} - Workspace</h2>
                <p className="text-slate-500 dark:text-[#A3A5A8] text-sm mt-1">Access all materials and collaborate.</p>
              </div>
              <button 
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#FF9D2E]/20 transition-all"
              >
                {showNoteForm ? <X size={18} /> : <Edit3 size={18} />}
                <span className="hidden sm:inline">{showNoteForm ? 'Cancel' : 'New Note'}</span>
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleAddNote} className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 mb-8 shadow-xl transition-colors">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Edit3 size={20} className="text-[#FF9D2E]" /> Share a Note with Group</h3>
                <input type="text" placeholder="Note Title..." value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 mb-4 outline-none font-bold text-slate-900 dark:text-white transition-all" required />
                <textarea placeholder="Write your content here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-40 resize-none mb-4 outline-none text-slate-900 dark:text-white transition-all" required />
                <button type="submit" className="bg-[#FF9D2E] text-slate-900 px-8 py-3 rounded-xl font-extrabold transition-all hover:bg-[#FFAA3D]">Publish to Group</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupContents.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white dark:bg-[#18191A] rounded-3xl border border-dashed border-slate-300 dark:border-[#292B2E] transition-colors">
                  <FolderOpen size={40} className="mx-auto text-slate-300 dark:text-[#292B2E] mb-3" />
                  <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">No materials uploaded in this group yet.</p>
                </div>
              ) : (
                groupContents.map(item => (
                  <div key={item.id} onClick={() => openContent(item)} className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] hover:border-[#FF9D2E]/60 shadow-sm hover:shadow-xl dark:hover:shadow-[#FF9D2E]/5 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${item.content_type.includes('course') || item.content_type.includes('subject') ? 'bg-[#19C784]/10 text-[#19C784]' : 'bg-[#668CFF]/10 text-[#668CFF]'}`}>
                          {item.content_type.includes('note') ? <FileText size={24} /> : <BookOpen size={24} />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-[#A3A5A8] bg-slate-50 dark:bg-[#1D1E20] px-3 py-1.5 rounded-lg border border-slate-100 dark:border-[#292B2E] uppercase">
                          {item.content_type.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-[#FF9D2E] transition-colors">{item.title}</h3>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Note Viewer inside Group */}
        {selectedContent?.content_type === 'shared_note' && (
          <div className="animate-slide-in-right bg-white dark:bg-[#18191A] rounded-3xl p-6 md:p-10 shadow-lg border border-slate-200 dark:border-[#292B2E] min-h-[60vh] transition-colors">
            {!isEditing ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{selectedContent.title}</h2>
                  <p className="text-slate-500 dark:text-[#707277] text-sm mt-2">{new Date(selectedContent.created_at).toLocaleString()}</p>
                </div>
                <div className="w-full h-[1px] bg-slate-100 dark:bg-[#292B2E]"></div>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="leading-relaxed text-lg whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedContent.content_data.text}</p>
                </div>
                <div className="mt-12 flex justify-end">
                  <button onClick={() => handleDeleteNote(selectedContent.id)} className="flex items-center gap-2 text-[#FF5B61] bg-[#FF5B61]/10 hover:bg-[#FF5B61]/20 px-5 py-2.5 rounded-xl font-bold transition-colors">
                    <Trash2 size={18} /> Delete Note
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <h3 className="text-xl font-bold flex items-center gap-2 text-[#FF9D2E]"><Edit3 /> Edit Note</h3>
                <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 font-bold text-lg outline-none text-slate-900 dark:text-white transition-all" />
                <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-[60vh] resize-none outline-none text-lg text-slate-900 dark:text-white transition-all" />
              </div>
            )}
          </div>
        )}

      </main>

      {/* --- FLOATING CHAT SYSTEM --- */}
      {selectedGroup && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[999] flex flex-col items-end">
          {isChatOpen && (
            <div className="w-[90vw] md:w-[380px] h-[500px] max-h-[80vh] bg-white dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] shadow-2xl rounded-3xl mb-4 flex flex-col overflow-hidden animate-fade-in origin-bottom-right transition-colors">
              
              {/* Header */}
              <div className="bg-slate-50 dark:bg-[#18191A] p-4 border-b border-slate-200 dark:border-[#292B2E] flex justify-between items-center transition-colors">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <MessageCircle size={18} className="text-[#FF9D2E]" /> Group Chat
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#707277]">{selectedGroup.name}</p>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-[#FF5B61] transition-colors p-1">
                  <X size={20} />
                </button>
              </div>

              {/* --- REAL CHAT MESSAGES BODY --- */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-[#0D0E0F] transition-colors flex flex-col gap-4">
                {messages.length === 0 && (
                  <div className="text-center text-xs text-slate-400 dark:text-[#707277] mt-10">
                    No messages yet. Say hello to the group! 👋
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMe = msg.user_id === session?.user?.id; // Check if the message is mine
                  
                  // Format time (e.g., 8:24 PM)
                  const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full`}>
                      <span className={`text-[10px] text-slate-500 dark:text-[#A3A5A8] mb-1 font-bold ${isMe ? 'mr-1' : 'ml-1'}`}>
                        {isMe ? 'You' : msg.sender_name || 'Member'} • {timeString}
                      </span>
                      <div 
                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] leading-relaxed ${
                          isMe 
                          ? 'bg-[#FF9D2E] text-slate-900 font-medium rounded-tr-sm' 
                          : 'bg-white dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] text-slate-800 dark:text-[#F5F5F5] rounded-tl-sm transition-colors'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                {/* Invisible div to auto-scroll to bottom */}
                <div ref={messagesEndRef} />
              </div>

              {/* --- CHAT INPUT --- */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#18191A] border-t border-slate-200 dark:border-[#292B2E] flex items-center gap-2 transition-colors">
                <button type="button" className="p-2 text-slate-400 hover:text-[#FF9D2E] transition-colors"><Paperclip size={20}/></button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-100 dark:bg-[#1D1E20] border border-transparent focus:border-[#FF9D2E]/50 rounded-full px-4 py-2 text-sm text-slate-900 dark:text-white outline-none transition-all" 
                  disabled={isSending}
                />
                <button type="submit" disabled={!newMessage.trim() || isSending} className="p-2.5 bg-[#FF9D2E] text-slate-900 rounded-full hover:bg-[#FFAA3D] disabled:opacity-50 transition-colors">
                  <Send size={16}/>
                </button>
              </form>
            </div>
          )}

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-16 h-16 bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,157,46,0.3)] transition-transform hover:scale-105 active:scale-95 relative"
          >
            {isChatOpen ? <X size={28} strokeWidth={2.5} /> : <MessageCircle size={28} strokeWidth={2.5} />}
            {!isChatOpen && (
              <span className="absolute top-0 right-0 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5B61] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FF5B61] border-2 border-white dark:border-[#0D0E0F]"></span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* --- Mobile Bottom Nav --- */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/90 dark:bg-[#141516]/90 backdrop-blur-xl border-t border-slate-200 dark:border-[#292B2E] pb-safe z-40">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => { setActiveTab('dashboard'); handleBack(); }} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'dashboard' ? 'text-[#FF9D2E]' : 'text-slate-400 dark:text-[#707277]'}`}>
            <LayoutDashboard size={22} /> <span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'profile' ? 'text-[#FF9D2E]' : 'text-slate-400 dark:text-[#707277]'}`}>
            <User size={22} /> <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      </nav>

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}