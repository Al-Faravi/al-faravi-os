// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, Moon, LayoutDashboard, Users, User, BookOpen, Clock, FileText, 
  ChevronRight, MessageCircle, X, Send, Paperclip, Mic, Square, ArrowLeft, 
  Trash2, Edit3, FolderOpen, Bell, Sparkles, LogOut, CheckCircle2 
} from 'lucide-react';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

interface ChatMessage {
  id: string;
  group_id?: string;
  user_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  file_url?: string;
  created_at?: string;
  isOptimistic?: boolean;
}

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
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

  // Floating Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Live Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isChatOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    checkAuthAndFetchData();
    initTheme();
  }, []);

  const initTheme = () => {
    const savedTheme = localStorage.getItem('workspace_theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('workspace_theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const checkAuthAndFetchData = async () => {
    setLoading(true);
    const { data: { session } } = await workspaceSupabase.auth.getSession();
    if (!session) return navigate('/workspace/login');
    setSession(session);

    // Fetch Profile Nickname
    const { data: profileData } = await workspaceSupabase.from('workspace_profiles').select('nickname').eq('id', session.user.id).single();
    if (profileData && profileData.nickname) {
      setProfileName(profileData.nickname);
    } else {
      setProfileName(session.user?.email?.split('@')[0] || 'Student');
    }

    const { data: gData } = await workspaceSupabase.from('study_groups').select('*');
    if (gData) setGroups(gData);

    const { data: cData } = await workspaceSupabase.from('shared_contents').select('*').order('created_at', { ascending: false }).limit(10);
    if (cData) setAllContents(cData);

    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!profileName.trim()) return;
    setIsUpdatingProfile(true);
    const { error } = await workspaceSupabase.from('workspace_profiles').upsert({ id: session.user.id, email: session.user.email, nickname: profileName });
    if (!error) alert("Nickname updated successfully!");
    setIsUpdatingProfile(false);
  };

  const fetchGroupContents = async (groupId: string) => {
    const { data } = await workspaceSupabase.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setGroupContents(data);
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

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  // --- NOTES CRUD ---
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !selectedGroup) return;
    const { error } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: selectedGroup.id, title: noteTitle, content_type: 'shared_note', content_data: { text: noteContent }
    }]);
    if (!error) { setNoteTitle(''); setNoteContent(''); setShowNoteForm(false); fetchGroupContents(selectedGroup.id); }
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
    if (!error) { handleBack(); fetchGroupContents(selectedGroup.id); }
  };

  const openContent = (item: any) => {
    setSelectedContent(item);
    if (item.content_type === 'shared_note') {
      setNoteTitle(item.title);
      setNoteContent(item.content_data.text || '');
    }
  };

  // --- CHAT LOGIC ---
  useEffect(() => {
    if (selectedGroup && isChatOpen) {
      fetchChatMessages(selectedGroup.id);

      const chatSubscription = workspaceSupabase
        .channel(`public:group_chats:group_id=eq.${selectedGroup.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chats', filter: `group_id=eq.${selectedGroup.id}` }, 
          (payload: any) => {
            const newMsg = payload.new as ChatMessage;
            setChatMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMsg.id || (msg.isOptimistic && msg.content === newMsg.content));
              if (exists) return prev.map((msg) => msg.isOptimistic && msg.content === newMsg.content ? newMsg : msg);
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();

      return () => { workspaceSupabase.removeChannel(chatSubscription); };
    }
  }, [selectedGroup, isChatOpen]);

  const fetchChatMessages = async (groupId: string) => {
    setChatLoading(true);
    const { data, error } = await workspaceSupabase.from('group_chats').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (!error && data) setChatMessages(data as ChatMessage[]);
    setChatLoading(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !session?.user) return;

    const messageText = newMessage;
    setNewMessage(''); 

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId, group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: messageText, message_type: 'text', isOptimistic: true,
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await workspaceSupabase.from('group_chats').insert([{
      group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: messageText, message_type: 'text',
    }]);
    if (error) setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup || !session?.user) return;

    const type = file.type.startsWith('image/') ? 'image' : 'file';
    const fileName = `${session.user.id}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await workspaceSupabase.storage.from('chat-files').upload(fileName, file);
    if (uploadError) { alert('Upload failed'); return; }

    const { data } = workspaceSupabase.storage.from('chat-files').getPublicUrl(fileName);
    await workspaceSupabase.from('group_chats').insert([{
      group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: file.name, message_type: type, file_url: data.publicUrl,
    }]);
    e.target.value = '';
  };

  // --- Live Voice Recording (Toggle System) ---
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop Recording and Send
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      // Start Recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          if (audioChunks.length === 0 || !selectedGroup || !session?.user) return;

          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const fileName = `${session.user.id}-${Date.now()}.webm`;
          const { error: uploadError } = await workspaceSupabase.storage.from('chat-files').upload(fileName, audioBlob);
          if (uploadError) return;

          const { data } = workspaceSupabase.storage.from('chat-files').getPublicUrl(fileName);
          await workspaceSupabase.from('group_chats').insert([{
            group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: 'Voice Message', message_type: 'audio', file_url: data.publicUrl,
          }]);
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) { alert('Microphone access denied or not available.'); }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0D0E0F]">
      <div className="w-12 h-12 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (selectedContent?.content_type === 'lms_course') return <WorkspaceCourseViewer courseData={selectedContent} onBack={handleBack} />;
  if (selectedContent?.content_type === 'bcs_subject') return <WorkspaceBcsViewer subjectData={selectedContent} onBack={handleBack} />;

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const totalCourses = allContents.filter(c => c.content_type.includes('course') || c.content_type.includes('subject')).length;
  const totalNotes = allContents.filter(c => c.content_type.includes('note')).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] text-slate-900 dark:text-[#F5F5F5] font-sans pb-24 transition-colors duration-300 selection:bg-[#FF9D2E]/30 relative">
      
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
          <h1 className="text-xl font-extrabold tracking-tight">{selectedGroup ? selectedGroup.name : 'Study Portal'}</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={toggleTheme} className="p-2.5 text-slate-500 dark:text-[#A3A5A8] hover:bg-slate-100 dark:hover:bg-[#1D1E20] rounded-xl transition-colors">
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-[#292B2E]">
            <div className="text-right">
              <p className="text-sm font-bold leading-none">{profileName}</p>
              <p className="text-xs text-slate-500 dark:text-[#707277] mt-1">Student</p>
            </div>
            <div className="w-10 h-10 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center border border-[#FF9D2E]/30">
              <User size={20} className="text-[#FF9D2E]" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 mt-2">
        {/* --- MAIN DASHBOARD --- */}
        {!selectedGroup && activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
            <div className="bg-gradient-to-r from-white to-slate-100 dark:from-[#18191A] dark:to-[#141516] rounded-3xl p-8 border border-slate-200 dark:border-[#292B2E] shadow-xl relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D2E]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <p className="text-[#FF9D2E] font-bold text-sm mb-2">{currentDate}</p>
                <h2 className="text-3xl md:text-4xl font-black mb-3">Welcome back, {profileName}! 👋</h2>
                <p className="text-slate-600 dark:text-[#A3A5A8] max-w-lg text-sm md:text-base leading-relaxed">
                  Ready to level up your skills today? Check out your assigned groups and continue your learning journey from where you left off.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2">
                <Users size={24} className="text-[#668CFF]" />
                <h3 className="text-2xl font-black">{groups.length}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Joined Groups</p>
              </div>
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2">
                <BookOpen size={24} className="text-[#19C784]" />
                <h3 className="text-2xl font-black">{totalCourses}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Assigned Courses</p>
              </div>
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2">
                <FileText size={24} className="text-[#E83FCB]" />
                <h3 className="text-2xl font-black">{totalNotes}</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Shared Notes</p>
              </div>
              <div className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-center gap-2">
                <Clock size={24} className="text-[#FF9D2E]" />
                <h3 className="text-2xl font-black">Active</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Status</p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold flex items-center gap-2 mb-5 px-1"><LayoutDashboard className="text-[#FF9D2E]"/> My Workspaces</h3>
              {groups.length === 0 ? (
                <div className="bg-white dark:bg-[#18191A] rounded-3xl p-10 text-center border border-slate-200 dark:border-[#292B2E]">
                  <FolderOpen size={48} className="mx-auto text-slate-300 dark:text-[#292B2E] mb-4" />
                  <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">You haven't been added to any groups yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groups.map(group => (
                    <div key={group.id} onClick={() => handleGroupClick(group)} className="bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] hover:border-[#FF9D2E] p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[#FF9D2E]/5">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] rounded-2xl flex items-center justify-center text-[#FF9D2E] group-hover:bg-[#FF9D2E] group-hover:text-white dark:group-hover:text-[#0D0E0F] transition-colors"><FolderOpen size={28} /></div>
                        <h4 className="text-xl font-bold leading-tight group-hover:text-[#FF9D2E] transition-colors">{group.name}</h4>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-[#292B2E] text-sm">
                        <span className="text-slate-500 dark:text-[#A3A5A8] font-medium">Click to enter</span>
                        <ChevronRight size={18} className="text-slate-300 dark:text-[#707277] group-hover:text-[#FF9D2E] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- INSIDE GROUP --- */}
        {selectedGroup && !selectedContent && (
          <div className="animate-slide-in-right">
            <div className="flex justify-between items-end mb-6 border-b border-slate-200 dark:border-[#292B2E] pb-4">
              <div>
                <h2 className="text-2xl font-black">{selectedGroup.name} - Workspace</h2>
              </div>
              <button onClick={() => setShowNoteForm(!showNoteForm)} className="bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#FF9D2E]/20 transition-all">
                {showNoteForm ? <X size={18} /> : <Edit3 size={18} />} <span className="hidden sm:inline">{showNoteForm ? 'Cancel' : 'New Note'}</span>
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={handleAddNote} className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 mb-8 shadow-xl">
                <input type="text" placeholder="Title..." value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 mb-4 outline-none font-bold transition-all" required />
                <textarea placeholder="Content..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-40 resize-none mb-4 outline-none transition-all" required />
                <button type="submit" className="bg-[#FF9D2E] text-slate-900 px-8 py-3 rounded-xl font-extrabold hover:bg-[#FFAA3D]">Publish</button>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupContents.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white dark:bg-[#18191A] rounded-3xl border border-dashed border-slate-300 dark:border-[#292B2E]">
                  <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">No materials uploaded yet.</p>
                </div>
              ) : (
                groupContents.map(item => (
                  <div key={item.id} onClick={() => openContent(item)} className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] hover:border-[#FF9D2E]/60 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${item.content_type.includes('course') || item.content_type.includes('subject') ? 'bg-[#19C784]/10 text-[#19C784]' : 'bg-[#668CFF]/10 text-[#668CFF]'}`}>
                          {item.content_type.includes('note') ? <FileText size={24} /> : <BookOpen size={24} />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-[#A3A5A8] bg-slate-50 dark:bg-[#1D1E20] px-3 py-1.5 rounded-lg border border-slate-100 dark:border-[#292B2E] uppercase">{item.content_type.replace('_', ' ')}</span>
                      </div>
                      <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:text-[#FF9D2E] transition-colors">{item.title}</h3>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {selectedContent?.content_type === 'shared_note' && (
          <div className="animate-slide-in-right bg-white dark:bg-[#18191A] rounded-3xl p-6 md:p-10 shadow-lg border border-slate-200 dark:border-[#292B2E] min-h-[60vh]">
            {!isEditing ? (
              <div className="space-y-6">
                <h2 className="text-3xl font-extrabold">{selectedContent.title}</h2>
                <div className="w-full h-[1px] bg-slate-100 dark:bg-[#292B2E]"></div>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="leading-relaxed text-lg whitespace-pre-wrap">{selectedContent.content_data.text}</p>
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
                <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 font-bold text-lg outline-none" />
                <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-[60vh] resize-none outline-none text-lg" />
              </div>
            )}
          </div>
        )}

        {/* --- PROFILE TAB (Update Nickname) --- */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in flex flex-col items-center mt-10 max-w-md mx-auto">
            <div className="w-24 h-24 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center mb-6 border border-[#FF9D2E]/30"><User className="w-12 h-12 text-[#FF9D2E]" /></div>
            
            <div className="w-full bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm space-y-4 text-center">
              <h3 className="font-bold text-lg text-slate-500 dark:text-[#A3A5A8]">Your Nickname</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)} 
                  className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-center font-bold" 
                />
                <button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdatingProfile}
                  className="bg-[#19C784] text-white px-5 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 size={20} /> Save
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-[#707277]">This name will appear in group chats.</p>
            </div>

            <button onClick={handleLogout} className="mt-10 w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-[#18191A] border border-[#FF5B61]/20 rounded-2xl text-[#FF5B61] font-bold hover:bg-[#FF5B61]/10 transition-colors">
              <LogOut className="w-5 h-5" /> Log Out
            </button>
          </div>
        )}
      </main>

      {/* --- FLOATING CHAT --- */}
      {selectedGroup && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[999] flex flex-col items-end">
          {isChatOpen && (
            <div className="w-[90vw] md:w-[380px] h-[500px] max-h-[80vh] bg-white dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] shadow-2xl rounded-3xl mb-4 flex flex-col overflow-hidden animate-fade-in origin-bottom-right">
              <div className="bg-slate-50 dark:bg-[#18191A] p-4 border-b border-slate-200 dark:border-[#292B2E] flex justify-between items-center">
                <div><h3 className="font-bold flex items-center gap-2"><MessageCircle size={18} className="text-[#FF9D2E]" /> Group Chat</h3><p className="text-xs text-slate-500 dark:text-[#707277]">{selectedGroup.name}</p></div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-[#FF5B61] transition-colors p-1"><X size={20} /></button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-[#0D0E0F] flex flex-col gap-4 scroll-smooth">
                {chatLoading ? <div className="flex-1 flex justify-center items-center"><div className="w-6 h-6 border-2 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div> : 
                 chatMessages.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-[#707277]"><MessageCircle size={32} className="mb-2 opacity-50" /><p className="text-sm font-medium">No messages yet.</p></div> : 
                 chatMessages.map((msg, idx) => {
                  const isMe = msg.user_id === session?.user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className={`text-[10px] text-slate-500 dark:text-[#A3A5A8] ${isMe ? 'mr-1' : 'ml-1'} mb-1 font-bold`}>{isMe ? 'You' : msg.sender_name}</span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] leading-relaxed ${isMe ? 'bg-[#FF9D2E] text-slate-900 rounded-tr-sm font-medium' : 'bg-white dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] text-slate-800 dark:text-[#F5F5F5] rounded-tl-sm'}`}>
                        {msg.message_type === 'text' && <p>{msg.content}</p>}
                        
                        {/* File Viewing Updates */}
                        {msg.message_type === 'image' && (
                          <a href={msg.file_url} target="_blank" rel="noreferrer" className="block cursor-pointer hover:opacity-90 transition-opacity">
                            <img src={msg.file_url} alt="Shared" className="rounded-xl max-h-48 object-cover border border-black/10" />
                          </a>
                        )}
                        {msg.message_type === 'file' && <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline underline-offset-2 break-all"><FileText size={16} className="shrink-0" /> {msg.content}</a>}
                        {msg.message_type === 'audio' && <audio controls src={msg.file_url} className="w-48 h-8 rounded-full" />}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#18191A] border-t border-slate-200 dark:border-[#292B2E] flex items-center gap-2 relative overflow-hidden">
                
                {/* File Upload Button */}
                {!isRecording && (
                  <label className="p-2 text-slate-400 hover:text-[#FF9D2E] cursor-pointer transition-colors shrink-0">
                    <Paperclip size={20} />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}

                {/* Input Field / Recording Status */}
                {isRecording ? (
                  <div className="flex-1 flex items-center gap-2 px-4 py-2 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-full border border-red-200 dark:border-red-500/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span> Recording Live Audio...
                  </div>
                ) : (
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-slate-100 dark:bg-[#1D1E20] border border-transparent focus:border-[#FF9D2E]/50 rounded-full px-4 py-2 text-sm outline-none transition-all disabled:opacity-50 min-w-0" />
                )}

                {/* Toggle Live Voice Recording */}
                <button type="button" onClick={toggleRecording} className={`p-2.5 rounded-full transition-all shrink-0 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 shadow-md animate-pulse' : 'bg-slate-100 dark:bg-[#1D1E20] text-slate-500 dark:text-[#A3A5A8] hover:text-[#FF9D2E]'}`}>
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
                
                {/* Send Text Button */}
                {!isRecording && (
                  <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-[#FF9D2E] text-slate-900 rounded-full hover:bg-[#FFAA3D] disabled:opacity-50 shrink-0">
                    <Send size={16} />
                  </button>
                )}
              </form>
            </div>
          )}
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,157,46,0.3)] transition-transform hover:scale-105 active:scale-95 relative">
            {isChatOpen ? <X size={28} strokeWidth={2.5} /> : <MessageCircle size={28} strokeWidth={2.5} />}
          </button>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/90 dark:bg-[#141516]/90 backdrop-blur-xl border-t border-slate-200 dark:border-[#292B2E] pb-safe z-40">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => { setActiveTab('dashboard'); handleBack(); }} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'dashboard' ? 'text-[#FF9D2E]' : 'text-slate-400 dark:text-[#707277]'}`}><LayoutDashboard size={22} /> <span className="text-[10px] font-bold">Home</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center justify-center w-full space-y-1 ${activeTab === 'profile' ? 'text-[#FF9D2E]' : 'text-slate-400 dark:text-[#707277]'}`}><User size={22} /> <span className="text-[10px] font-bold">Profile</span></button>
        </div>
      </nav>

      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}