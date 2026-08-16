// src/features/workspace/WorkspaceDashboard.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Sun, Moon, LayoutDashboard, Users, User, BookOpen, Clock, FileText, 
  ChevronRight, MessageCircle, X, Send, Paperclip, Mic, Square, ArrowLeft, 
  Trash2, Edit3, FolderOpen, LogOut, CheckCircle2, Plus, DownloadCloud, Sparkles, ShieldCheck,
  Target, TrendingUp, PlayCircle, BellRing, ChevronDown, ChevronUp 
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
  message_type: 'text' | 'image' | 'file' | 'audio' | 'voice'; // 🟢 'voice' যুক্ত করা হয়েছে
  file_url?: string;
  created_at?: string;
  isOptimistic?: boolean;
}

declare global {
  interface Window { deferredPrompt: any; }
}

export default function WorkspaceDashboard() {
  const navigate = useNavigate();
  
  // --- States ---
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

  // --- Active Course & To-Do Target States ---
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState('');
  const [targetContentId, setTargetContentId] = useState('all');
  const [targetDate, setTargetDate] = useState('');

  // 🟢 Collapsible Active Course State
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // --- CHAT STATES ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // 🔴 UNREAD MESSAGES & NOTIFICATIONS STATE
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const randomQuote = useMemo(() => DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)], []);

  // --- PWA Install state ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(window.deferredPrompt || null);

  // 🟢 PROFILE EDIT STATES
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // 🟢 VIEWING NOTE STATE
  const [viewingNote, setViewingNote] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (window.deferredPrompt) setDeferredPrompt(window.deferredPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
      }
    }
  };

  // --- Push Notification Permission ---
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    if (isChatOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  // 🚀 REFRESH BUG FIX: Restore Group from Session Storage
  useEffect(() => {
    const savedGroupId = sessionStorage.getItem('workspace_current_group');
    if (savedGroupId && groups.length > 0 && !selectedGroup) {
      const groupToRestore = groups.find(g => g.id === savedGroupId);
      if (groupToRestore) {
        handleGroupClick(groupToRestore);
      }
    }
  }, [groups]);

  useEffect(() => {
    checkAuthAndFetchData();
    initTheme();
  }, []);

  useEffect(() => {
    const updatePresence = async () => {
      const { data: { user } } = await workspaceSupabase.auth.getUser();
      if (user?.email) {
        await workspaceSupabase.from('group_members').update({ last_active: new Date().toISOString() }).eq('email', user.email);
      }
    };
    updatePresence(); 
    const interval = setInterval(updatePresence, 60000); 
    return () => clearInterval(interval);
  }, []);

  // 🔔 GLOBAL CHAT LISTENER (Listens to all groups for notifications)
  useEffect(() => {
    if (groups.length === 0 || !session?.user) return;
    
    const channel = workspaceSupabase.channel('global_chat_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chats' }, (payload: any) => {
        const newMsg = payload.new;
        if (newMsg.user_id === session.user.id) return; // Ignore own messages

        const group = groups.find(g => g.id === newMsg.group_id);
        if (!group) return;

        // If that group's chatbox is already open, don't increase count (Auto Read)
        if (isChatOpen && selectedGroup?.id === newMsg.group_id) {
          localStorage.setItem(`chat_read_${newMsg.group_id}`, new Date().toISOString());
        } else {
          // Increase badge number
          setUnreadCounts(prev => ({ ...prev, [newMsg.group_id]: (prev[newMsg.group_id] || 0) + 1 }));
          
          // Send push notification
          if ('Notification' in window && Notification.permission === 'granted') {
             const notifBody = newMsg.message_type === 'text' ? newMsg.content : 'Sent an attachment 📎';
             new Notification(`New message in ${group.name}`, { 
               body: `${newMsg.sender_name}: ${notifBody}`,
               icon: '/icons/logo.png', 
               badge: '/icons/logo.png'
             });
          }
        }
      }).subscribe();
      
    return () => { workspaceSupabase.removeChannel(channel); };
  }, [groups, isChatOpen, selectedGroup, session]);

  // --- Core Functions ---
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
    if (!session) { setLoading(false); return navigate('/workspace/login'); }
    setSession(session);

    const savedNickname = localStorage.getItem(`nickname_${session.user.id}`);
    if (savedNickname) setProfileName(savedNickname);
    else setProfileName(session.user?.user_metadata?.full_name || session.user?.email?.split('@')[0] || 'Student');

    await fetchMyGroups();
    const { data: cData } = await workspaceSupabase.from('shared_contents').select('*').order('created_at', { ascending: false }).limit(10);
    if (cData) setAllContents(cData);
    setLoading(false);
  };

  const fetchMyGroups = async () => {
    const { data: { user } } = await workspaceSupabase.auth.getUser();
    if (!user?.email) return;

    const { data: memberData } = await workspaceSupabase.from('group_members').select('group_id').ilike('email', user.email);
    if (memberData && memberData.length > 0) {
      const groupIds = memberData.map(m => m.group_id).filter(id => id !== null);
      if (groupIds.length > 0) {
        const { data: groupsData } = await workspaceSupabase.from('study_groups').select('*').in('id', groupIds);
        setGroups(groupsData || []);
      } else setGroups([]);
    } else setGroups([]);
  };

  // 🟢 Profile Update Function
  const handleUpdateProfile = async () => {
    if (!profileName.trim()) return;
    setIsUpdatingProfile(true);
    try {
      const { error } = await workspaceSupabase.auth.updateUser({ data: { full_name: profileName } });
      if (error) throw error;
      if (session?.user?.id) {
        localStorage.setItem(`nickname_${session.user.id}`, profileName);
      }
      alert("Profile updated successfully! 🚀");
      setShowProfileModal(false);
    } catch (error) { alert("Failed to update profile."); }
    setIsUpdatingProfile(false);
  };

  const fetchGroupContents = async (groupId: string) => {
    const { data } = await workspaceSupabase.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setGroupContents(data);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setShowNoteForm(false);
    sessionStorage.setItem('workspace_current_group', group.id);
    fetchGroupContents(group.id);
  };

  const handleBack = () => {
    if (selectedContent) {
      handleExitCourse();
      setIsEditing(false);
    } else {
      setSelectedGroup(null);
      setGroupContents([]);
      setIsChatOpen(false);
      sessionStorage.removeItem('workspace_current_group');
    }
  };

  const handleLogout = async () => {
    await workspaceSupabase.auth.signOut();
    navigate('/workspace/login');
  };

  // --- CRUD Notes & Content ---
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

  // 🟢 SMART NAVIGATION (Refresh Proof)
  const handleEnterCourse = (course: any) => {
    setSelectedContent(course);
    sessionStorage.setItem(`opened_course_${selectedGroup.id}`, course.id);
  };

  const handleExitCourse = () => {
    setSelectedContent(null);
    sessionStorage.removeItem(`opened_course_${selectedGroup.id}`);
  };

  // 🟢 Auto-restore opened course on refresh
  useEffect(() => {
    if (selectedGroup) {
      const savedCourseId = sessionStorage.getItem(`opened_course_${selectedGroup.id}`);
      if (savedCourseId && groupContents.length > 0 && !selectedContent) {
        const courseToOpen = groupContents.find(c => c.id === savedCourseId);
        if (courseToOpen) setSelectedContent(courseToOpen);
      }
    }
  }, [groupContents, selectedGroup]);

  // --- ACTIVE COURSE TRACKING LOGIC ---
  const groupCourses = groupContents.filter(c => c.content_type === 'lms_course' || c.content_type === 'bcs_subject');
  
  const activeCourses = groupCourses.filter(c => c.content_data?.is_active);
  const inactiveCourses = groupCourses.filter(c => !c.content_data?.is_active);

  const getCalculatedProgress = (course: any) => {
    if (!course?.content_data) return 0;
    let total = 0, completed = 0;
    const isLMS = course.content_type === 'lms_course';
    const modules = isLMS ? course.content_data.modules : course.content_data.chapters;
    modules?.forEach((m: any) => { const items = isLMS ? m.contents : m.resources; items?.forEach((i: any) => { total++; if (i.is_completed) completed++; }); });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  // --- TOGGLE ACTIVE COURSE LOGIC ---
  const handleToggleActiveCourse = async (courseId: string) => {
    const targetCourse = groupContents.find(c => c.id === courseId);
    if (!targetCourse) return;

    const currentStatus = targetCourse.content_data?.is_active || false;
    const newStatus = !currentStatus;
    const updatedData = { ...targetCourse.content_data, is_active: newStatus };

    setGroupContents(prev => prev.map(c => c.id === courseId ? { ...c, content_data: updatedData } : c));
    await workspaceSupabase.from('shared_contents').update({ content_data: updatedData }).eq('id', courseId);
  };

  const handleAddTarget = async (course: any) => {
    const isLms = course.content_type === 'lms_course';
    const activeModules = isLms ? course.content_data?.modules || [] : course.content_data?.chapters || [];
    const selectedModForDropdown = activeModules.find((m: any) => m.id === targetModuleId);
    const activeContentsList = selectedModForDropdown ? (isLms ? selectedModForDropdown.contents || [] : selectedModForDropdown.resources || []) : [];

    if (!targetModuleId || !targetDate || !course) return;
    setIsSavingTarget(true);
    let targetTitle = targetContentId === 'all' ? `Full: ${selectedModForDropdown.title}` : activeContentsList.find((c: any) => c.id === targetContentId).title;
    const newTarget = { id: `tgt-${Date.now()}`, moduleId: targetModuleId, contentId: targetContentId, title: targetTitle, parentTitle: selectedModForDropdown.title, dueDate: targetDate, isCompleted: false };
    const existingTargets = course.content_data.group_targets || [];
    const updatedData = { ...course.content_data, group_targets: [...existingTargets, newTarget] };
    setGroupContents(prev => prev.map(c => c.id === course.id ? { ...c, content_data: updatedData } : c));
    await workspaceSupabase.from('shared_contents').update({ content_data: updatedData }).eq('id', course.id);
    setTargetModuleId(''); setTargetContentId('all'); setTargetDate(''); setIsSavingTarget(false);
  };

  const handleToggleTarget = async (target: any, course: any) => {
    if (!course) return;
    const isLms = course.content_type === 'lms_course';
    const newStatus = !target.isCompleted;
    const updatedData = JSON.parse(JSON.stringify(course.content_data));
    const targetIndex = updatedData.group_targets.findIndex((t: any) => t.id === target.id);
    if (targetIndex > -1) updatedData.group_targets[targetIndex].isCompleted = newStatus;
    const modulesList = isLms ? updatedData.modules : updatedData.chapters;
    const modIndex = modulesList.findIndex((m: any) => m.id === target.moduleId);
    if (modIndex > -1) {
      const contentsList = isLms ? modulesList[modIndex].contents : modulesList[modIndex].resources;
      if (target.contentId === 'all') contentsList.forEach((c: any) => c.is_completed = newStatus);
      else { const conIndex = contentsList.findIndex((c: any) => c.id === target.contentId); if (conIndex > -1) contentsList[conIndex].is_completed = newStatus; }
    }
    updatedData.progress_pct = getCalculatedProgress({ content_type: course.content_type, content_data: updatedData });
    setGroupContents(prev => prev.map(c => c.id === course.id ? { ...c, content_data: updatedData } : c));
    await workspaceSupabase.from('shared_contents').update({ content_data: updatedData }).eq('id', course.id);
  };

  const handleDeleteTarget = async (targetId: string, course: any) => {
    const updatedData = { ...course.content_data, group_targets: course.content_data.group_targets.filter((t:any) => t.id !== targetId) };
    setGroupContents(prev => prev.map(c => c.id === course.id ? { ...c, content_data: updatedData } : c));
    await workspaceSupabase.from('shared_contents').update({ content_data: updatedData }).eq('id', course.id);
  };

  // --- Chat Logic ---
  useEffect(() => {
    if (selectedGroup && isChatOpen) {
      fetchChatMessages(selectedGroup.id);
      const chatSubscription = workspaceSupabase.channel(`chat_channel_${selectedGroup.id}`)
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
    const { data } = await workspaceSupabase.from('group_chats').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (data) setChatMessages(data as ChatMessage[]);
    setChatLoading(false);
  };

  // --- Chat Toggle & Clear Badge ---
  const toggleChat = () => {
    const newState = !isChatOpen;
    setIsChatOpen(newState);
    
    if (selectedGroup) {
      localStorage.setItem(`chat_read_${selectedGroup.id}`, new Date().toISOString());
      if (newState) {
        setUnreadCounts(prev => ({ ...prev, [selectedGroup.id]: 0 }));
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedGroup || !session?.user) return;
    const messageText = newMessage;
    setNewMessage(''); 
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = { id: tempId, group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: messageText, message_type: 'text', isOptimistic: true };
    setChatMessages((prev) => [...prev, optimisticMsg]);
    localStorage.setItem(`chat_read_${selectedGroup.id}`, new Date().toISOString());

    const { error } = await workspaceSupabase.from('group_chats').insert([{
      group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: messageText, message_type: 'text',
    }]);
    if (error) setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup || !session?.user) return;
    const type = file.type.startsWith('image/') ? 'image' : 'file';
    const fileName = `${session.user.id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { error: uploadError } = await workspaceSupabase.storage.from('chat-files').upload(fileName, file);
    if (uploadError) return alert('Upload failed: ' + uploadError.message);
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
            group_id: selectedGroup.id, user_id: session.user.id, sender_name: profileName, content: 'Voice Message', message_type: 'voice', file_url: data.publicUrl,
          }]);
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) { alert('Microphone access denied or not available.'); }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0D0E0F]"><div className="w-12 h-12 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div>;
  if (selectedContent?.content_type === 'lms_course') return <WorkspaceCourseViewer courseData={selectedContent} onBack={handleExitCourse} />;
  if (selectedContent?.content_type === 'bcs_subject') return <WorkspaceBcsViewer subjectData={selectedContent} onBack={handleExitCourse} />;

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const totalCourses = allContents.filter(c => c.content_type.includes('course') || c.content_type.includes('subject')).length;
  const groupNotes = groupContents.filter(c => c.content_type === 'shared_note' || c.content_type === 'personal_note');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] text-slate-900 dark:text-[#F5F5F5] font-sans pb-24 transition-colors duration-300 selection:bg-[#FF9D2E]/30 relative">
      
      {/* HEADER */}
      <header className="sticky top-0 bg-white/80 dark:bg-[#141516]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#292B2E] z-40 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {selectedGroup || activeTab === 'profile' ? (
            <button onClick={() => { setActiveTab('dashboard'); handleBack(); }} className="p-2 bg-slate-100 dark:bg-[#1D1E20] hover:bg-slate-200 dark:hover:bg-[#292B2E] rounded-xl text-slate-600 dark:text-[#A3A5A8] transition-colors">
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div className="w-10 h-10 bg-[#141516] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF9D2E]/20 border border-[#292B2E] overflow-hidden p-1">
              <img src="/icons/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <h1 className="text-xl font-extrabold tracking-tight">{selectedGroup ? selectedGroup.name : 'Study Portal'}</h1>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={toggleTheme} className="p-2.5 text-slate-500 dark:text-[#A3A5A8] hover:bg-slate-100 dark:hover:bg-[#1D1E20] rounded-xl transition-colors">
            {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          {/* 🟢 Mobile Responsive Profile Button */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-[#292B2E]">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">{profileName}</p>
              <p className="text-xs text-slate-500 dark:text-[#707277] mt-1">Student</p>
            </div>
            <button onClick={() => setShowProfileModal(true)} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#FF9D2E]/10 rounded-full flex items-center justify-center border border-[#FF9D2E]/30 hover:bg-[#FF9D2E]/20 transition-colors">
              <User size={18} className="text-[#FF9D2E]" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 mt-2">
        {/* --- MAIN DASHBOARD (Home Tab) --- */}
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

            {/* Premium Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                    <div className="h-full bg-[#668CFF] rounded-full" style={{ width: `${Math.min((groups.length / 10) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>

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
                    <div key={group.id} onClick={() => handleGroupClick(group)} className="relative bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] hover:border-[#FF9D2E] dark:hover:border-[#FF9D2E] p-6 rounded-3xl cursor-pointer transition-all duration-300 group hover:-translate-y-1.5 hover:shadow-xl dark:hover:shadow-[#FF9D2E]/5">
                      {/* 🔴 RED UNREAD BADGE FOR FOLDER */}
                      {unreadCounts[group.id] > 0 && (
                        <div className="absolute -top-2 -right-2 bg-[#FF5B61] text-white text-xs font-black w-7 h-7 flex items-center justify-center rounded-full border-2 border-white dark:border-[#18191A] animate-bounce shadow-[0_0_15px_rgba(255,91,97,0.5)] z-10">
                          {unreadCounts[group.id] > 9 ? '9+' : unreadCounts[group.id]}
                        </div>
                      )}
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
              
              <div className="flex-1 w-full space-y-8">
                
                {/* 🚀 PREMIUM COLLAPSIBLE ACTIVE COURSES UI */}
                {activeCourses.map(course => {
                  const calculatedProgress = getCalculatedProgress(course);
                  const isLms = course.content_type === 'lms_course';
                  const activeModules = isLms ? course.content_data?.modules || [] : course.content_data?.chapters || [];
                  const selectedModForDropdown = activeModules.find((m: any) => m.id === targetModuleId);
                  const activeContentsList = selectedModForDropdown ? (isLms ? selectedModForDropdown.contents || [] : selectedModForDropdown.resources || []) : [];
                  const isExpanded = expandedCourses[course.id];

                  return (
                    <div key={course.id} className="bg-gradient-to-br from-white to-slate-50 dark:from-[#18191A] dark:to-[#1D1E20] border border-slate-300 dark:border-[#FF9D2E]/50 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden mb-6 transition-all duration-300">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D2E]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                      {/* --- Header Section (Always Visible) --- */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                        <div className="flex items-center gap-4 flex-1 w-full">
                          <div className="w-12 h-12 rounded-2xl bg-[#FF9D2E] flex items-center justify-center text-slate-900 shadow-lg shrink-0"><Target size={24} /></div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-black tracking-widest uppercase text-[#FF9D2E] mb-1 block">Active Focus</span>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight truncate">{course.title}</h2>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                           <button onClick={() => handleEnterCourse(course)} className="flex-1 sm:flex-none bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2">
                             Enter <PlayCircle size={16}/>
                           </button>
                           <button onClick={() => handleToggleActiveCourse(course.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-xl font-bold text-xs transition-colors whitespace-nowrap">
                             Remove Active
                           </button>
                           
                           {/* 🟢 Expand/Collapse Toggle Button */}
                           <button onClick={() => toggleCourseExpand(course.id)} className="bg-slate-100 dark:bg-[#141516] text-slate-600 dark:text-[#A3A5A8] hover:text-[#FF9D2E] border border-slate-200 dark:border-[#292B2E] p-2 rounded-xl transition-colors">
                             {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                           </button>
                        </div>
                      </div>

                      {/* --- Collapsible Details Section (Progress & Targets) --- */}
                      {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-[#292B2E] relative z-10 animate-fade-in">
                          
                          <div className="mb-6">
                             <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-bold text-slate-600 dark:text-[#A3A5A8]">Live Progress</span>
                                <span className="text-2xl font-black text-[#19C784] leading-none">{calculatedProgress}%</span>
                             </div>
                             <div className="h-2 w-full bg-slate-200 dark:bg-[#141516] rounded-full overflow-hidden border border-slate-300 dark:border-[#292B2E]">
                                <div className="h-full bg-gradient-to-r from-[#19C784] to-emerald-400 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${calculatedProgress}%` }}>
                                   <div className="absolute top-0 right-0 bottom-0 w-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]"></div>
                                </div>
                             </div>
                          </div>

                          <div className="bg-slate-100 dark:bg-[#141516] rounded-2xl border border-slate-200 dark:border-[#292B2E] p-4">
                             <h3 className="text-sm font-bold text-slate-800 dark:text-[#A3A5A8] mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-[#668CFF]"/> Course Targets & To-Do</h3>
                             
                             <div className="space-y-2 mb-4 max-h-[25vh] overflow-y-auto pr-2 custom-scrollbar">
                                {course.content_data?.group_targets?.map((target: any) => (
                                  <div key={target.id} className={`flex items-center justify-between p-3 rounded-xl border ${target.isCompleted ? 'bg-[#19C784]/10 border-[#19C784]/30' : 'bg-white dark:bg-[#1D1E20] border-slate-200 dark:border-[#292B2E]'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                      <input type="checkbox" checked={target.isCompleted} onChange={() => handleToggleTarget(target, course)} className="w-5 h-5 accent-[#19C784] rounded-md cursor-pointer shrink-0" />
                                      <div className="flex flex-col min-w-0">
                                        <span className={`text-sm font-bold truncate ${target.isCompleted ? 'text-[#19C784] line-through' : 'text-slate-900 dark:text-white'}`}>{target.title}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-[#A3A5A8] truncate">{target.parentTitle} • By {new Date(target.dueDate).toLocaleDateString()}</span>
                                      </div>
                                    </label>
                                    <button onClick={() => handleDeleteTarget(target.id, course)} className="text-slate-400 dark:text-[#707277] hover:text-red-500 p-1.5 shrink-0"><Trash2 size={16} /></button>
                                  </div>
                                ))}
                                {(!course.content_data?.group_targets || course.content_data.group_targets.length === 0) && (
                                  <p className="text-xs text-slate-500 dark:text-[#707277] text-center italic py-2">No active targets set.</p>
                                )}
                             </div>

                             <div className="bg-white dark:bg-[#1D1E20] p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-[#292B2E]">
                                <p className="text-xs font-bold text-slate-500 dark:text-[#707277] mb-3 uppercase tracking-wider">Assign New Target</p>
                                <div className="flex flex-col gap-3">
                                   <div className="flex flex-col md:flex-row gap-3">
                                      <select value={targetModuleId} onChange={(e) => { setTargetModuleId(e.target.value); setTargetContentId('all'); }} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#FF9D2E] truncate">
                                        <option value="">-- Select Module/Chapter --</option>
                                        {activeModules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                      </select>
                                      <select value={targetContentId} disabled={!targetModuleId} onChange={(e) => setTargetContentId(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#FF9D2E] truncate disabled:opacity-50">
                                        <option value="all">📚 Entire Module</option>
                                        {activeContentsList.map((c: any) => <option key={c.id} value={c.id}>📄 {c.title}</option>)}
                                      </select>
                                   </div>
                                   <div className="flex flex-col sm:flex-row gap-3">
                                      <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-[#FF9D2E] [color-scheme:light] dark:[color-scheme:dark]" />
                                      <button onClick={() => handleAddTarget(course)} disabled={!targetModuleId || !targetDate || isSavingTarget} className="w-full sm:w-auto bg-[#FF9D2E] text-slate-900 px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#FFAA3D] transition-colors disabled:opacity-50">
                                         <Plus size={16}/> Add Target
                                      </button>
                                   </div>
                                </div>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* --- OTHER ASSIGNED COURSES --- */}
                <div>
                  <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2"><BookOpen size={18} className="text-[#19C784]" /> All Assigned Courses</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {groupCourses.length === 0 ? (
                      <div className="col-span-full py-12 text-center bg-white dark:bg-[#18191A] rounded-3xl border border-dashed border-slate-300 dark:border-[#292B2E] transition-colors">
                        <FolderOpen size={40} className="mx-auto text-slate-300 dark:text-[#292B2E] mb-3" />
                        <p className="text-slate-500 dark:text-[#A3A5A8] font-medium">No courses uploaded yet.</p>
                      </div>
                    ) : (
                      inactiveCourses.map(item => (
                        <div key={item.id} className="bg-white dark:bg-[#18191A] p-5 rounded-2xl border border-slate-200 dark:border-[#292B2E] hover:border-[#19C784]/60 shadow-sm hover:shadow-xl dark:hover:shadow-[#19C784]/5 transition-all cursor-pointer group flex flex-col justify-between min-h-[150px]">
                          <div onClick={() => handleEnterCourse(item)}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="p-2.5 rounded-xl bg-[#19C784]/10 text-[#19C784]"><BookOpen size={20} /></div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-[#A3A5A8] bg-slate-50 dark:bg-[#1D1E20] px-3 py-1 rounded-lg border border-slate-100 dark:border-[#292B2E] uppercase">{item.content_type.replace('_', ' ')}</span>
                            </div>
                            <h3 className="font-bold text-base leading-snug line-clamp-2 text-slate-900 dark:text-white group-hover:text-[#19C784] transition-colors mb-4">{item.title}</h3>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleActiveCourse(item.id); }}
                            className="w-full py-2 bg-slate-100 dark:bg-[#1D1E20] text-slate-600 dark:text-[#A3A5A8] hover:bg-[#FF9D2E] hover:text-slate-900 rounded-lg text-xs font-bold transition-colors border border-slate-200 dark:border-transparent flex items-center justify-center gap-1.5"
                          >
                            <Target size={14} /> Set as Active Focus
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* --- GROUP NOTES (RIGHT SIDEBAR) --- */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] rounded-3xl p-5 shadow-sm sticky top-24">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><FileText size={18} className="text-[#FF9D2E]"/> Important Notes</h3>
                    <button onClick={() => { setNoteTitle(''); setNoteContent(''); setIsEditing(false); setShowNoteForm(true); }} className="p-1.5 bg-[#FF9D2E]/10 text-[#FF9D2E] rounded-lg hover:bg-[#FF9D2E]/20 transition-colors"><Plus size={16} /></button>
                  </div>
                  <div className="space-y-3">
                    {groupNotes.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-[#707277] text-center py-4">No notes created yet.</p>
                    ) : (
                      groupNotes.map(note => (
                        <div key={note.id} onClick={() => setViewingNote(note)} className="p-3 bg-slate-50 dark:bg-[#141516] rounded-xl border border-slate-100 dark:border-[#292B2E] hover:border-[#FF9D2E]/50 cursor-pointer group transition-colors flex justify-between items-start">
                          <div className="flex-1 pr-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#FF9D2E] line-clamp-1">{note.title}</h4>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-[#A3A5A8]">
                              <span className="font-semibold">{note.content_data?.authorName || 'Member'}</span>
                              <span>•</span>
                              {/* 🔴 Date Fix */}
                              <span>{new Date(note.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {note.content_data?.userId === session?.user?.id && (
                            <button onClick={(e) => { e.stopPropagation(); setNoteTitle(note.title); setNoteContent(note.content_data?.text || ''); setIsEditing(true); setSelectedContent(note); setShowNoteForm(true); }} className="p-1.5 text-slate-400 hover:text-[#FF9D2E] transition-colors shrink-0">
                              <Edit3 size={14} />
                            </button>
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

        {/* Modal For New Note */}
        {showNoteForm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#0D0E0F]/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 shadow-2xl w-full max-w-lg animate-fade-in transition-colors">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><FileText size={20} className="text-[#FF9D2E]"/> {isEditing ? 'Edit Note' : 'Create New Note'}</h3>
                <button onClick={() => setShowNoteForm(false)} className="text-slate-400 hover:text-[#FF5B61]"><X size={20}/></button>
              </div>
              
              <form onSubmit={isEditing ? handleUpdateNote : handleAddNote} className="space-y-4">
                <input 
                  type="text" 
                  required 
                  value={noteTitle} 
                  onChange={(e) => setNoteTitle(e.target.value)} 
                  placeholder="Note Title" 
                  className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-[#FF9D2E] font-bold"
                />
                <div className="border border-slate-200 dark:border-[#292B2E] rounded-xl overflow-hidden bg-white dark:bg-[#141516]">
                  <ReactQuill 
                    theme="snow" 
                    value={noteContent || ''} 
                    onChange={setNoteContent} 
                    placeholder="Write your beautiful notes here..."
                    className="text-slate-900 dark:text-white h-48 border-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowNoteForm(false)} className="px-5 py-2.5 text-slate-600 dark:text-[#A3A5A8] hover:bg-slate-100 dark:hover:bg-[#1D1E20] rounded-xl font-bold transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2.5 bg-[#FF9D2E] text-slate-900 rounded-xl font-bold hover:bg-[#FFAA3D] transition-colors flex items-center gap-2">
                    {isEditing ? <><Edit3 size={16}/> Update</> : <><Plus size={16}/> Add Note</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🟢 READ NOTE MODAL (Student View) */}
        {viewingNote && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#18191A] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar relative">
              <button onClick={() => setViewingNote(null)} className="absolute top-6 right-6 text-slate-400 hover:text-[#FF5B61] bg-slate-100 dark:bg-[#141516] p-2 rounded-full"><X size={20}/></button>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{viewingNote.title}</h2>
              <p className="text-sm text-slate-500 dark:text-[#A3A5A8] mb-6 border-b border-slate-200 dark:border-[#292B2E] pb-4">
                Created by <span className="text-[#FF9D2E] font-bold">{viewingNote.content_data?.authorName || 'Member'}</span> on 
                {/* 🔴 Date Fix */}
                {new Date(viewingNote.created_at || Date.now()).toLocaleDateString()}
              </p>
              
              <div className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: viewingNote.content_data?.text }} className="text-slate-800 dark:text-[#F5F5F5] leading-relaxed text-base sm:text-lg whitespace-pre-wrap" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 🟢 PROFILE EDIT MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#292B2E]">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg dark:text-white">Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Display Name</label>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-[#FF9D2E]" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Email (Read Only)</label>
                <input type="text" value={session?.user?.email} disabled className="w-full bg-slate-100 dark:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] rounded-xl px-4 py-3 text-slate-500 opacity-70 cursor-not-allowed" />
              </div>
              <button onClick={handleUpdateProfile} disabled={isUpdatingProfile} className="w-full bg-[#FF9D2E] text-slate-900 font-bold py-3 rounded-xl hover:bg-[#FFAA3D] transition-colors mt-2">
                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💬 FLOATING CHAT WIDGET (Only visible inside Group) */}
      {selectedGroup && (
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100]">
          
          {/* CHAT BOX */}
          {isChatOpen && (
            <div className="absolute bottom-20 right-0 w-[340px] sm:w-[400px] bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[500px] max-h-[70vh] animate-fade-in">
              {/* Header */}
              <div className="p-4 bg-[#FF9D2E] text-slate-900 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-black text-lg">Group Chat</h3>
                  <p className="text-xs font-bold opacity-80">Real-time collaboration</p>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="bg-slate-900/10 hover:bg-slate-900/20 p-2 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-[#141516] flex flex-col gap-3 custom-scrollbar">
                {chatLoading ? (
                  <p className="text-center text-slate-400 dark:text-[#707277] text-sm italic my-auto">Loading messages...</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-[#707277] text-sm italic my-auto">No messages yet. Start the conversation!</p>
                ) : (
                  chatMessages.map(msg => {
                    const isOwn = msg.user_id === session?.user?.id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm break-words ${isOwn ? 'bg-[#FF9D2E] text-slate-900 rounded-br-md' : 'bg-white dark:bg-[#1D1E20] text-slate-900 dark:text-white border border-slate-100 dark:border-[#292B2E] rounded-bl-md'}`}>
                          {/* 🟢 CHAT MESSAGE MEDIA & DATE FIX */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              {!isOwn && <span className="text-xs font-bold text-slate-800 dark:text-white">{msg.sender_name}</span>}
                              {/* 🔴 Date Fix: Added || Date.now() */}
                              <span className="text-[10px] text-slate-400 ml-2">
                                {new Date(msg.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            
                            {msg.message_type === 'text' && <p className="text-sm text-slate-700 dark:text-slate-300 break-words">{msg.content}</p>}
                            
                            {/* 🔴 Tailwind Fix: max-w-50 */}
                            {msg.message_type === 'image' && (
                              <img src={msg.file_url} alt="shared-img" onClick={() => window.open(msg.file_url, '_blank')} className="max-w-50 sm:max-w-[250px] rounded-lg mt-1 cursor-pointer hover:opacity-80 transition-opacity border border-slate-200 dark:border-[#292B2E] shadow-sm" />
                            )}
                            
                            {/* 🔴 Tailwind Fix & Audio/Voice support */}
                            {(msg.message_type === 'audio' || msg.message_type === 'voice') && (
                              <audio src={msg.file_url} controls className="max-w-50 h-10 mt-1 rounded-full outline-none" />
                            )}
                            
                            {msg.message_type === 'file' && (
                              <a href={msg.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-1 text-sm font-bold text-[#FF9D2E] hover:underline bg-[#FF9D2E]/10 px-3 py-1.5 rounded-lg">
                                📎 Download File
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef}></div>
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-[#18191A] border-t border-slate-200 dark:border-[#292B2E] shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <label className="p-2 text-slate-400 hover:text-[#FF9D2E] transition-colors cursor-pointer">
                    <Paperclip size={20}/>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button type="button" onClick={toggleRecording} className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-[#FF9D2E]'}`}>
                    {isRecording ? <Square size={20}/> : <Mic size={20}/>}
                  </button>
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Type a message..." 
                    className="flex-1 bg-slate-100 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#FF9D2E]" 
                  />
                  <button type="submit" className="p-2.5 bg-[#FF9D2E] text-slate-900 rounded-xl hover:bg-[#FFAA3D] transition-colors"><Send size={18}/></button>
                </form>
              </div>
            </div>
          )}

          {/* CHAT TOGGLE BUTTON */}
          <button onClick={toggleChat} className="w-16 h-16 bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,157,46,0.3)] hover:scale-105 transition-transform relative">
            {isChatOpen ? <X size={28} strokeWidth={2.5}/> : <MessageCircle size={28} strokeWidth={2.5}/>}
            
            {/* Red Unread Badge */}
            {!isChatOpen && unreadCounts[selectedGroup.id] > 0 && (
              <span className="absolute top-0 right-0 -translate-y-1 translate-x-1 bg-[#FF5B61] text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#141516] animate-pulse shadow-lg">
                {unreadCounts[selectedGroup.id] > 9 ? '9+' : unreadCounts[selectedGroup.id]}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}