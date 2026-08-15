// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, Moon, LayoutDashboard, Users, User, BookOpen, Clock, FileText, 
  ChevronRight, MessageCircle, X, Send, Paperclip, Mic, Square, ArrowLeft, 
  Trash2, Edit3, FolderOpen, Bell, Sparkles, LogOut, CheckCircle2, Plus,
  ShieldCheck // New import for Profile Tab
} from 'lucide-react';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

const DAILY_QUOTES = [
  "The secret of getting ahead is getting started.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it."
];

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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile'>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null); 
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
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

  // --- Live Active Heartbeat ---
  useEffect(() => {
    const updatePresence = async () => {
      const { data: { user } } = await workspaceSupabase.auth.getUser();
      if (user?.email) {
        await workspaceSupabase
          .from('group_members')
          .update({ last_active: new Date().toISOString() })
          .eq('email', user.email);
      }
    };
    updatePresence(); 
    const interval = setInterval(updatePresence, 60000); 
    return () => clearInterval(interval);
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
    if (!session) {
      setLoading(false);
      return navigate('/workspace/login');
    }
    setSession(session);

    const savedNickname = localStorage.getItem(`nickname_${session.user.id}`);
    if (savedNickname) setProfileName(savedNickname);
    else setProfileName(session.user?.email?.split('@')[0] || 'Student');

    await fetchMyGroups();

    const { data: cData } = await workspaceSupabase.from('shared_contents').select('*').order('created_at', { ascending: false }).limit(10);
    if (cData) setAllContents(cData);

    setLoading(false);
  };

  const fetchMyGroups = async () => {
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    if (!user?.email) return;

    const { data: memberData, error: memberError } = await workspaceSupabase
      .from('group_members')
      .select('group_id')
      .ilike('email', user.email);

    if (memberError) {
      console.error("Error fetching members:", memberError);
      return;
    }

    if (memberData && memberData.length > 0) {
      const groupIds = memberData.map(m => m.group_id).filter(id => id !== null);
      
      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await workspaceSupabase
          .from('study_groups')
          .select('*')
          .in('id', groupIds);
          
        if (groupsError) console.error("Error fetching groups:", groupsError);
        setGroups(groupsData || []);
      } else {
        setGroups([]);
      }
    } else {
      setGroups([]);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profileName.trim()) return;
    setIsUpdatingProfile(true);
    if (session?.user?.id) {
      localStorage.setItem(`nickname_${session.user.id}`, profileName);
      alert("Nickname updated successfully! 🚀");
    }
    setIsUpdatingProfile(false);
  };

  const fetchGroupContents = async (groupId: string) => {
    const { data, error } = await workspaceSupabase.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (error) console.error("Error fetching contents:", error);
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !selectedGroup) return;
    const { error } = await workspaceSupabase.from('shared_contents').insert([{
      group_id: selectedGroup.id, title: noteTitle, content_type: 'shared_note', 
      content_data: { text: noteContent, userId: session?.user?.id, authorName: profileName }
    }]);
    if (!error) { setNoteTitle(''); setNoteContent(''); setShowNoteForm(false); fetchGroupContents(selectedGroup.id); }
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !selectedContent) return;
    const { error } = await workspaceSupabase.from('shared_contents').update({ 
      title: noteTitle, content_data: { ...selectedContent.content_data, text: noteContent } 
    }).eq('id', selectedContent.id);
    if (!error) {
      setIsEditing(false);
      setSelectedContent({ ...selectedContent, title: noteTitle, content_data: { ...selectedContent.content_data, text: noteContent } });
      fetchGroupContents(selectedGroup.id);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Delete this note permanently?")) return;
    const { error } = await workspaceSupabase.from('shared_contents').delete().eq('id', id);
    if (!error) { handleBack(); fetchGroupContents(selectedGroup.id); }
  };

  const openContent = (item: any) => {
    setSelectedContent(item);
    if (item.content_type === 'shared_note' || item.content_type === 'personal_note') {
      setNoteTitle(item.title); setNoteContent(item.content_data?.text || ''); setIsEditing(false);
    }
  };

  // --- CHAT LOGIC ---
  useEffect(() => {
    if (selectedGroup && isChatOpen) {
      fetchChatMessages(selectedGroup.id);
      const chatSubscription = workspaceSupabase
        .channel(`chat_channel_${selectedGroup.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chats', filter: `group_id=eq.${selectedGroup.id}` }, 
          (payload: any) => {
            const newMsg = payload.new as ChatMessage;
            setChatMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMsg.id || (msg.isOptimistic && msg.content === newMsg.content));
              if (exists) return prev.map((msg) => msg.isOptimistic && msg.content === newMsg.content ? newMsg : msg);
              return [...prev, newMsg];
            });
          }
        ).subscribe();

      return () => { workspaceSupabase.removeChannel(chatSubscription); };
    }
  }, [selectedGroup, isChatOpen]);

  const fetchChatMessages = async (groupId: string) => {
    setChatLoading(true);
    const { data, error } = await workspaceSupabase.from('group_chats').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (error) console.error("Chat Fetch Error:", error);
    if (!error && data) setChatMessages(data as ChatMessage[]);
    setChatLoading(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !session?.user) return;

    const messageText = newMessage;
    setNewMessage(''); 

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = { id: tempId, group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: messageText, message_type: 'text', isOptimistic: true };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await workspaceSupabase.from('group_chats').insert([{
      group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: messageText, message_type: 'text',
    }]);
    
    if (error) {
      console.error("Failed to send msg:", error);
      setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup || !session?.user) return;

    const type = file.type.startsWith('image/') ? 'image' : 'file';
    const fileName = `${session.user.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    
    const { error: uploadError } = await workspaceSupabase.storage.from('chat-files').upload(fileName, file);
    if (uploadError) { alert('Upload failed: ' + uploadError.message); return; }

    const { data } = workspaceSupabase.storage.from('chat-files').getPublicUrl(fileName);
    await workspaceSupabase.from('group_chats').insert([{
      group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: file.name, message_type: type, file_url: data.publicUrl,
    }]);
    e.target.value = '';
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          if (audioChunks.length === 0 || !selectedGroup || !session?.user) return;

          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const fileName = `audio-${session.user.id}-${Date.now()}.webm`;
          
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
  const randomQuote = React.useMemo(() => DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)], []);
  const totalCourses = allContents.filter(c => c.content_type.includes('course') || c.content_type.includes('subject')).length;
  
  const groupCourses = groupContents.filter(c => c.content_type === 'lms_course' || c.content_type === 'bcs_subject');
  const groupNotes = groupContents.filter(c => c.content_type === 'shared_note' || c.content_type === 'personal_note');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] text-slate-900 dark:text-[#F5F5F5] font-sans pb-24 transition-colors duration-300 selection:bg-[#FF9D2E]/30 relative">
      
      <header className="sticky top-0 bg-white/80 dark:bg-[#141516]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#292B2E] z-40 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {selectedGroup || activeTab === 'profile' ? (
            <button onClick={() => { setActiveTab('dashboard'); handleBack(); }} className="p-2 bg-slate-100 dark:bg-[#1D1E20] hover:bg-slate-200 dark:hover:bg-[#292B2E] rounded-xl text-slate-600 dark:text-[#A3A5A8] transition-colors">
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
        {!selectedGroup && activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-8">
            <div className="bg-gradient-to-r from-white to-slate-100 dark:from-[#18191A] dark:to-[#141516] rounded-3xl p-8 border border-slate-200 dark:border-[#292B2E] shadow-xl relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D2E]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <p className="text-[#FF9D2E] font-bold text-sm mb-2">{currentDate}</p>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-[#F5F5F5] mb-3">Welcome back, {profileName}! 👋</h2>
                <p className="text-slate-600 dark:text-[#A3A5A8] max-w-lg text-sm md:text-base leading-relaxed">Ready to level up your skills today? Check out your assigned groups and continue your learning journey from where you left off.</p>
                <div className="mt-4 inline-block bg-white/50 dark:bg-[#1D1E20]/50 backdrop-blur-sm border border-[#FF9D2E]/20 px-4 py-2 rounded-xl text-sm text-slate-800 dark:text-[#A3A5A8] border-l-4 border-l-[#FF9D2E] italic">
                  "{randomQuote}"
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Joined Groups */}
              <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-between transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-[#141516] rounded-xl flex items-center justify-center border border-blue-100 dark:border-[#292B2E]">
                    <Users size={24} className="text-[#668CFF]" />
                  </div>
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{groups.length}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Joined Groups</p>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-[#141516] rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-[#668CFF] rounded-full" style={{ width: `${(groups.length / 10) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Card 2: Assigned Courses */}
              <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-between transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-green-50 dark:bg-[#141516] rounded-xl flex items-center justify-center border border-green-100 dark:border-[#292B2E]">
                    <BookOpen size={24} className="text-[#19C784]" />
                  </div>
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{totalCourses}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Available Courses</p>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-[#141516] rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-[#19C784] rounded-full w-3/4"></div>
                  </div>
                </div>
              </div>

              {/* Card 3: Study Status */}
              <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm flex flex-col justify-between transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-orange-50 dark:bg-[#141516] rounded-xl flex items-center justify-center border border-orange-100 dark:border-[#292B2E]">
                    <Sparkles size={24} className="text-[#FF9D2E]" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-[#19C784]/10 text-green-700 dark:text-[#19C784] rounded-lg text-xs font-bold">
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div> Active
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-[#707277] uppercase tracking-wider">Current Status</p>
                  <p className="text-xs text-slate-400 dark:text-[#A3A5A8] mt-2 font-medium">Synced with workspace</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-extrabold flex items-center gap-2 mb-5 px-1 text-slate-900 dark:text-white"><LayoutDashboard className="text-[#FF9D2E]"/> My Workspaces</h3>
              {groups.length === 0 ? (
                <div className="bg-white dark:bg-[#18191A] rounded-3xl p-10 text-center border border-slate-200 dark:border-[#292B2E] transition-colors">
                  <FolderOpen size={48} className="mx-auto text-slate-300 dark:text-[#292B2E] mb-4" />
                  <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">You haven't been added to any groups yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {groups.map(group => (
                    <div key={group.id} onClick={() => handleGroupClick(group)} className="bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] hover:border-[#FF9D2E] dark:hover:border-[#FF9D2E] p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[#FF9D2E]/5">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] rounded-2xl flex items-center justify-center text-[#FF9D2E] group-hover:bg-[#FF9D2E] group-hover:text-white dark:group-hover:text-[#0D0E0F] transition-colors"><FolderOpen size={28} /></div>
                        <h4 className="text-xl font-bold leading-tight text-slate-900 dark:text-white group-hover:text-[#FF9D2E] transition-colors">{group.name}</h4>
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
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedGroup.name} - Workspace</h2>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              <div className="flex-1 w-full">
                <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2"><BookOpen size={18} className="text-[#19C784]" /> Assigned Courses</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupCourses.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white dark:bg-[#18191A] rounded-3xl border border-dashed border-slate-300 dark:border-[#292B2E] transition-colors">
                      <FolderOpen size={40} className="mx-auto text-slate-300 dark:text-[#292B2E] mb-3" />
                      <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">No courses uploaded yet.</p>
                    </div>
                  ) : (
                    groupCourses.map(item => (
                      <div key={item.id} onClick={() => openContent(item)} className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] hover:border-[#19C784]/60 shadow-sm hover:shadow-xl dark:hover:shadow-[#19C784]/5 transition-all cursor-pointer group flex flex-col justify-between min-h-[140px]">
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-[#19C784]/10 text-[#19C784]"><BookOpen size={20} /></div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-[#A3A5A8] bg-slate-50 dark:bg-[#1D1E20] px-3 py-1 rounded-lg border border-slate-100 dark:border-[#292B2E] uppercase">{item.content_type.replace('_', ' ')}</span>
                          </div>
                          <h3 className="font-bold text-base leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-[#19C784] transition-colors">{item.title}</h3>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] rounded-3xl p-5 shadow-sm sticky top-24">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><FileText size={18} className="text-[#FF9D2E]"/> Important Notes</h3>
                    <button onClick={() => { setNoteTitle(''); setNoteContent(''); setShowNoteForm(true); }} className="p-1.5 bg-[#FF9D2E]/10 text-[#FF9D2E] rounded-lg hover:bg-[#FF9D2E]/20 transition-colors"><Plus size={16} /></button>
                  </div>
                  <div className="space-y-3">
                    {groupNotes.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-[#707277] text-center py-4">No notes created yet.</p>
                    ) : (
                      groupNotes.map(note => (
                        <div key={note.id} className="p-3 bg-slate-50 dark:bg-[#141516] rounded-xl border border-slate-100 dark:border-[#292B2E] hover:border-[#FF9D2E]/50 cursor-pointer group transition-colors flex justify-between items-start">
                          <div onClick={() => openContent(note)} className="flex-1 pr-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#FF9D2E] line-clamp-1">{note.title}</h4>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-[#A3A5A8]">
                              <span className="font-semibold">{note.content_data?.authorName || 'Member'}</span><span>•</span><span>{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {note.content_data?.userId === session?.user?.id && (
                            <button onClick={(e) => { e.stopPropagation(); openContent(note); setIsEditing(true); }} className="p-1.5 text-slate-400 hover:text-[#FF9D2E] transition-colors shrink-0"><Edit3 size={14} /></button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {showNoteForm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#0D0E0F]/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 shadow-2xl w-full max-w-lg animate-fade-in transition-colors">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><FileText size={20} className="text-[#FF9D2E]"/> Create New Note</h3>
                <button onClick={() => setShowNoteForm(false)} className="text-slate-400 hover:text-[#FF5B61]"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddNote} className="space-y-4">
                <input type="text" placeholder="Note Title..." value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 outline-none font-bold text-slate-900 dark:text-white transition-all" required />
                <textarea placeholder="Write important context here..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-40 resize-none outline-none text-slate-900 dark:text-white transition-all" required />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowNoteForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1D1E20] transition-colors">Cancel</button>
                  <button type="submit" className="bg-[#FF9D2E] text-slate-900 px-6 py-2.5 rounded-xl font-extrabold hover:bg-[#FFAA3D] transition-colors">Publish Note</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {(selectedContent?.content_type === 'shared_note' || selectedContent?.content_type === 'personal_note') && (
          <div className="animate-slide-in-right bg-white dark:bg-[#18191A] rounded-3xl p-6 md:p-10 shadow-lg border border-slate-200 dark:border-[#292B2E] min-h-[60vh] transition-colors">
            {!isEditing ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{selectedContent.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-[#A3A5A8] mt-2">Created by <span className="font-bold text-slate-700 dark:text-[#F5F5F5]">{selectedContent.content_data?.authorName || 'Member'}</span> on {new Date(selectedContent.created_at).toLocaleDateString()}</p>
                  </div>
                  {selectedContent.content_data?.userId === session?.user?.id && (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-[#FF9D2E]/10 text-[#FF9D2E] rounded-xl font-bold hover:bg-[#FF9D2E]/20 transition-colors shrink-0"><Edit3 size={16} /> <span className="hidden sm:inline">Edit</span></button>
                  )}
                </div>
                <div className="w-full h-[1px] bg-slate-100 dark:bg-[#292B2E]"></div>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <p className="leading-relaxed text-lg whitespace-pre-wrap text-slate-700 dark:text-slate-300">{selectedContent.content_data?.text}</p>
                </div>
                {selectedContent.content_data?.userId === session?.user?.id && (
                  <div className="mt-12 flex justify-end">
                    <button onClick={() => handleDeleteNote(selectedContent.id)} className="flex items-center gap-2 text-[#FF5B61] bg-[#FF5B61]/10 hover:bg-[#FF5B61]/20 px-5 py-2.5 rounded-xl font-bold transition-colors"><Trash2 size={18} /> Delete Note</button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleUpdateNote} className="space-y-5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-[#FF9D2E]"><Edit3 /> Edit Note</h3>
                  <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-[#FF5B61]"><X size={20}/></button>
                </div>
                <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 font-bold text-lg outline-none text-slate-900 dark:text-white transition-all" required/>
                <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-4 h-[50vh] resize-none outline-none text-lg text-slate-900 dark:text-white transition-all" required/>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1D1E20] transition-colors">Cancel</button>
                  <button type="submit" className="bg-[#FF9D2E] text-slate-900 px-8 py-3 rounded-xl font-extrabold hover:bg-[#FFAA3D] transition-colors">Save Changes</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- PROFILE TAB --- */}
        {activeTab === 'profile' && (
          <div className="animate-fade-in flex flex-col items-center mt-6 max-w-md mx-auto">
            <div className="w-full flex justify-start mb-6">
              <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 text-slate-500 dark:text-[#A3A5A8] hover:text-[#FF9D2E] dark:hover:text-[#FF9D2E] transition-colors font-bold bg-white dark:bg-[#18191A] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#292B2E] shadow-sm hover:shadow-md"><ArrowLeft size={18} /> Back to Dashboard</button>
            </div>
            <div className="w-24 h-24 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center mb-6 border border-[#FF9D2E]/30 shadow-lg shadow-[#FF9D2E]/10">
              <User className="w-12 h-12 text-[#FF9D2E]" />
            </div>
            <div className="w-full bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm space-y-4 text-center">
              <h3 className="font-bold text-lg text-slate-500 dark:text-[#A3A5A8]">Your Nickname</h3>
              <div className="flex gap-2">
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-center font-bold text-slate-900 dark:text-white transition-all" />
                <button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="bg-[#19C784] text-white px-5 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"><CheckCircle2 size={20} /> Save</button>
              </div>
              <p className="text-xs text-slate-400 dark:text-[#707277]">This name will appear in group chats and notes.</p>
            </div>

            {/* New Profile Stats Section */}
            <div className="w-full grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white dark:bg-[#18191A] p-4 rounded-3xl border border-slate-200 dark:border-[#292B2E] text-center shadow-sm">
                <div className="mx-auto w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                  <Users size={16} className="text-blue-500" />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">{groups.length}</h4>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#707277]">Study Groups</p>
              </div>
              
              <div className="bg-white dark:bg-[#18191A] p-4 rounded-3xl border border-slate-200 dark:border-[#292B2E] text-center shadow-sm">
                <div className="mx-auto w-8 h-8 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center mb-2">
                  <FileText size={16} className="text-[#FF9D2E]" />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">{allContents.filter(c => c.content_data?.userId === session?.user?.id).length}</h4>
                <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-[#707277]">Notes Created</p>
              </div>
            </div>

            <div className="w-full mt-4 bg-gradient-to-r from-[#FF9D2E]/10 to-[#E83FCB]/10 p-5 rounded-3xl border border-[#FF9D2E]/20 flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-[#141516] rounded-2xl flex items-center justify-center shadow-sm border border-white/50 dark:border-[#292B2E]">
                <ShieldCheck size={24} className="text-[#FF9D2E]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Verified Student</h4>
                <p className="text-xs text-slate-600 dark:text-[#A3A5A8]">Member of Al_Faravi-os</p>
              </div>
            </div>

            <button onClick={handleLogout} className="mt-8 w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-[#18191A] border border-[#FF5B61]/20 rounded-2xl text-[#FF5B61] font-bold hover:bg-[#FF5B61]/10 transition-colors">
              <LogOut className="w-5 h-5" /> Log Out
            </button>
          </div>
        )}
      </main>

      {/* --- FLOATING CHAT --- */}
      {selectedGroup && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[999] flex flex-col items-end">
          {isChatOpen && (
            <div className="w-[90vw] md:w-[380px] h-[500px] max-h-[80vh] bg-white dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] shadow-2xl rounded-3xl mb-4 flex flex-col overflow-hidden animate-fade-in origin-bottom-right transition-colors">
              <div className="bg-slate-50 dark:bg-[#18191A] p-4 border-b border-slate-200 dark:border-[#292B2E] flex justify-between items-center transition-colors">
                <div><h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><MessageCircle size={18} className="text-[#FF9D2E]" /> Group Chat</h3><p className="text-xs text-slate-500 dark:text-[#707277]">{selectedGroup.name}</p></div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-[#FF5B61] transition-colors p-1"><X size={20} /></button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-[#0D0E0F] flex flex-col gap-4 scroll-smooth transition-colors">
                {chatLoading ? <div className="flex-1 flex justify-center items-center"><div className="w-6 h-6 border-2 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div> : 
                 chatMessages.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-[#707277]"><MessageCircle size={32} className="mb-2 opacity-50" /><p className="text-sm font-medium">No messages yet.</p></div> : 
                 chatMessages.map((msg, idx) => {
                  const isMe = msg.user_id === session?.user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className={`text-[10px] text-slate-500 dark:text-[#A3A5A8] ${isMe ? 'mr-1' : 'ml-1'} mb-1 font-bold`}>{isMe ? 'You' : msg.sender_name}</span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] leading-relaxed ${isMe ? 'bg-[#FF9D2E] text-slate-900 rounded-tr-sm font-medium' : 'bg-white dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] text-slate-800 dark:text-[#F5F5F5] rounded-tl-sm transition-colors'}`}>
                        {msg.message_type === 'text' && <p>{msg.content}</p>}
                        {msg.message_type === 'image' && <a href={msg.file_url} target="_blank" rel="noreferrer" className="block cursor-pointer hover:opacity-90 transition-opacity"><img src={msg.file_url} alt="Shared" className="rounded-xl max-h-48 object-cover border border-black/10" /></a>}
                        {msg.message_type === 'file' && <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline underline-offset-2 break-all"><FileText size={16} className="shrink-0" /> {msg.content}</a>}
                        {msg.message_type === 'audio' && <audio controls src={msg.file_url} className="w-48 h-8 rounded-full" />}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#18191A] border-t border-slate-200 dark:border-[#292B2E] flex items-center gap-2 relative overflow-hidden transition-colors">
                {!isRecording && (
                  <label className="p-2 text-slate-400 hover:text-[#FF9D2E] cursor-pointer transition-colors shrink-0">
                    <Paperclip size={20} />
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
                {isRecording ? (
                  <div className="flex-1 flex items-center gap-2 px-4 py-2 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-full border border-red-200 dark:border-red-500/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span> Recording Live Audio...
                  </div>
                ) : (
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-slate-100 dark:bg-[#1D1E20] border border-transparent focus:border-[#FF9D2E]/50 rounded-full px-4 py-2 text-sm text-slate-900 dark:text-white outline-none transition-all disabled:opacity-50 min-w-0" />
                )}
                <button type="button" onClick={toggleRecording} className={`p-2.5 rounded-full transition-all shrink-0 ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 shadow-md animate-pulse' : 'bg-slate-100 dark:bg-[#1D1E20] text-slate-500 dark:text-[#A3A5A8] hover:text-[#FF9D2E]'}`}>
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
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
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}