// src/features/workspace/GroupDetails.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, workspaceAdmin, workspaceSupabase } from '../../lib/supabase';
import { 
  ArrowLeft, Download, RefreshCw, FileText, BookOpen, Plus, 
  X, Trash2, Edit3, Save, Users, UserPlus, Copy, CheckCircle2,
  MessageCircle, Send, Target, TrendingUp, PlayCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import WorkspaceCourseViewer from './WorkspaceCourseViewer';
import WorkspaceBcsViewer from './WorkspaceBcsViewer';

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [adminId, setAdminId] = useState<string>('admin'); 
  const [group, setGroup] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<any>(null);

  const [lmsCourses, setLmsCourses] = useState<any[]>([]);
  const [bcsSubjects, setBcsSubjects] = useState<any[]>([]);
  const [selectedLms, setSelectedLms] = useState('');
  const [selectedBcs, setSelectedBcs] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [adminNoteTitle, setAdminNoteTitle] = useState('');
  const [adminNoteContent, setAdminNoteContent] = useState('');
  const [viewingNote, setViewingNote] = useState<any>(null); 

  // --- Assign Friend States ---
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [selectedFriendEmail, setSelectedFriendEmail] = useState('');

  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // --- Admin Chat & Notification States ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  
  const [unreadCount, setUnreadCount] = useState(0); 
  
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

  useEffect(() => {
    if (isChatOpen) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchGroupDetails();
    fetchMainOsData();
    fetchAllFriends();
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setAdminId(data.user.id); });
  }, [groupId]);

  const fetchGroupDetails = async () => {
    const { data: gData } = await workspaceAdmin.from('study_groups').select('*').eq('id', groupId).single();
    if (gData) setGroup(gData);
    fetchGroupContents();
    fetchGroupMembers(); 
  };

  const fetchGroupContents = async () => {
    const { data } = await workspaceAdmin.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const fetchGroupMembers = async () => {
    const { data } = await workspaceAdmin.from('group_members').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setGroupMembers(data);
  };

  const fetchAllFriends = async () => {
    const { data } = await workspaceAdmin.from('group_members').select('friend_name, email, password_plain').order('created_at', { ascending: false });
    if (data) {
      const uniqueFriends = Array.from(new Map(data.filter(item => item.email).map(item => [item.email.toLowerCase(), item])).values());
      setAllFriends(uniqueFriends);
    }
  };

  const fetchMainOsData = async () => {
    const { data: lms } = await supabase.from('lms_courses').select('id, title');
    if (lms) setLmsCourses(lms);
    const { data: bcs } = await supabase.from('bcs_subjects').select('id, title');
    if (bcs) setBcsSubjects(bcs);
  };

  const handleAssignFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      if (assignMode === 'existing') {
        if (!selectedFriendEmail) return;
        const targetEmail = selectedFriendEmail.toLowerCase().trim();
        const friendToAssign = allFriends.find(f => f.email.toLowerCase() === targetEmail);
        const isAlreadyInGroup = groupMembers.some(m => m.email.toLowerCase() === targetEmail);
        if (isAlreadyInGroup) { alert("This friend is already in the group!"); setIsAssigning(false); return; }
        await workspaceAdmin.from('group_members').insert([{ group_id: groupId, friend_name: friendToAssign.friend_name, email: targetEmail, password_plain: friendToAssign.password_plain }]);
        setSelectedFriendEmail('');
      } else {
        if (!fName || !fEmail || !fPassword) return;
        const cleanEmail = fEmail.toLowerCase().trim();
        const { error: authError } = await workspaceSupabase.auth.signUp({ email: cleanEmail, password: fPassword });
        if (authError && !authError.message.includes('already registered')) throw authError;
        await workspaceAdmin.from('group_members').insert([{ group_id: groupId, friend_name: fName, email: cleanEmail, password_plain: fPassword }]);
        setFName(''); setFEmail(''); setFPassword('');
      }
      fetchGroupMembers(); fetchAllFriends(); 
    } catch (error: any) { alert(error.message); } 
    finally { setIsAssigning(false); }
  };

  const handleCopyCredentials = (member: any) => {
    const appUrl = window.location.origin + '/workspace/login';
    const textToCopy = `🔐 Al_Faravi-os Premium Access\n\n📌 Link: ${appUrl}\n📧 Email: ${member.email}\n🔑 Password: ${member.password_plain}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemoveMember = async (id: string) => {
    if (!window.confirm("Remove this friend from the group?")) return;
    await workspaceAdmin.from('group_members').delete().eq('id', id);
    fetchGroupMembers();
  };

  // --- Active Course & Live To-Do Logic ---
  const groupCourses = contents.filter(c => c.content_type === 'lms_course' || c.content_type === 'bcs_subject');
  
  const activeCourses = groupCourses.filter(c => c.content_data?.is_active);
  const inactiveCourses = groupCourses.filter(c => !c.content_data?.is_active);

  const getCalculatedProgress = (course: any) => {
    if (!course?.content_data) return 0;
    let total = 0, completed = 0;
    const isLMS = course.content_type === 'lms_course';
    const modules = isLMS ? course.content_data.modules : course.content_data.chapters;
    modules?.forEach((m: any) => {
      const items = isLMS ? m.contents : m.resources;
      items?.forEach((i: any) => { total++; if (i.is_completed) completed++; });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  // --- TOGGLE ACTIVE COURSE LOGIC ---
  const handleToggleActiveCourse = async (courseId: string) => {
    const targetCourse = contents.find(c => c.id === courseId);
    if (!targetCourse) return;

    const currentStatus = targetCourse.content_data?.is_active || false;
    const newStatus = !currentStatus;
    const updatedData = { ...targetCourse.content_data, is_active: newStatus };

    setContents(prev => prev.map(c => c.id === courseId ? { ...c, content_data: updatedData } : c));
    await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', courseId);
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
    setContents(prev => prev.map(c => c.id === course.id ? { ...c, content_data: updatedData } : c));
    await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', course.id);
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
    setContents(prev => prev.map(c => c.id === course.id ? { ...c, content_data: updatedData } : c));
    await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', course.id);
  };

  const handleDeleteTarget = async (targetId: string, course: any) => {
    const updatedData = { ...course.content_data, group_targets: course.content_data.group_targets.filter((t:any) => t.id !== targetId) };
    setContents(prev => prev.map(c => c.id === course.id ? { ...c, content_data: updatedData } : c));
    await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', course.id);
  };

  // --- Admin Chat & Notifications Logic ---
  useEffect(() => {
    if (!groupId) return;
    fetchChatMessages();
    
    const chatSubscription = workspaceAdmin.channel(`admin_chat_channel_${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chats', filter: `group_id=eq.${groupId}` }, 
        (payload: any) => {
          const newMsg = payload.new;
          setChatMessages((prev) => {
            if (prev.some((msg) => msg.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.user_id !== adminId) {
            if (isChatOpenRef.current) {
              localStorage.setItem(`admin_chat_read_${groupId}`, new Date().toISOString());
            } else {
              setUnreadCount(prev => prev + 1);
              if ('Notification' in window && Notification.permission === 'granted') {
                const notifBody = newMsg.message_type === 'text' ? newMsg.content : 'Sent an attachment 📎';
                new Notification(`New message from ${newMsg.sender_name}`, { body: notifBody, icon: '/icons/logo.png', badge: '/icons/logo.png' });
              }
            }
          }
        }
      ).subscribe();
      
    return () => { workspaceAdmin.removeChannel(chatSubscription); };
  }, [groupId, adminId]);

  const fetchChatMessages = async () => {
    setChatLoading(true);
    const { data } = await workspaceAdmin.from('group_chats').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (data) setChatMessages(data);
    setChatLoading(false);
  };

  const toggleChat = () => {
    const newState = !isChatOpen;
    setIsChatOpen(newState);
    if (newState) {
      setUnreadCount(0);
      localStorage.setItem(`admin_chat_read_${groupId}`, new Date().toISOString());
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !groupId) return;
    const messageText = newMessage;
    setNewMessage(''); 
    localStorage.setItem(`admin_chat_read_${groupId}`, new Date().toISOString());
    await workspaceAdmin.from('group_chats').insert([{
      group_id: groupId, user_id: adminId, sender_name: 'Faravi (Admin)', content: messageText, message_type: 'text',
    }]);
  };

  // --- Core Content Actions ---
  const handleDeleteContent = async (id: string, type: string) => {
    if (!window.confirm(`Delete this ${type === 'shared_note' || type === 'personal_note' ? 'Note' : 'Course'} from the group?`)) return;
    await workspaceAdmin.from('shared_contents').delete().eq('id', id);
    if (selectedContent?.id === id) setSelectedContent(null);
    fetchGroupContents();
  };

  const handleSyncContent = async (item: any) => {
    setSyncingId(item.id);
    try {
      let updatedData = {};
      const originalId = item.content_data.id;
      const existingData = item.content_data;

      if (item.content_type === 'lms_course') {
        const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', originalId).single();
        const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', originalId);
        const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', modulesData?.map(m => m.id) || []);
        const existingModules = existingData.modules || [];
        const updatedModules = modulesData?.map(newMod => {
          const oldMod = existingModules.find((m: any) => m.id === newMod.id);
          const newContents = contentsData?.filter(c => c.module_id === newMod.id) || [];
          const mergedContents = newContents.map(newC => { const oldC = oldMod?.contents?.find((c: any) => c.id === newC.id); return { ...newC, is_completed: oldC ? oldC.is_completed : false }; });
          const customContents = oldMod?.contents?.filter((oldC: any) => !newContents.some((newC: any) => newC.id === oldC.id)) || [];
          return { ...newMod, contents: [...mergedContents, ...customContents] };
        });
        updatedData = { ...courseData, progress_pct: existingData.progress_pct || 0, is_active: existingData.is_active || false, group_targets: existingData.group_targets || [], modules: updatedModules };
      } 
      else if (item.content_type === 'bcs_subject') {
        const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', originalId).single();
        const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', originalId);
        const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chaptersData?.map(c => c.id) || []);
        const existingChapters = existingData.chapters || [];
        const updatedChapters = chaptersData?.map(newChap => {
          const oldChap = existingChapters.find((c: any) => c.id === newChap.id);
          const newRes = resourcesData?.filter(r => r.chapter_id === newChap.id) || [];
          const mergedRes = newRes.map(nR => { const oldR = oldChap?.resources?.find((r: any) => r.id === nR.id); return { ...nR, is_completed: oldR ? oldR.is_completed : false }; });
          const customRes = oldChap?.resources?.filter((oldR: any) => !newRes.some((nR: any) => nR.id === oldR.id)) || [];
          return { ...newChap, resources: [...mergedRes, ...customRes] };
        });
        updatedData = { ...subjectData, progress_pct: existingData.progress_pct || 0, is_active: existingData.is_active || false, group_targets: existingData.group_targets || [], chapters: updatedChapters };
      }
      await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', item.id);
      fetchGroupContents();
    } catch (error) { alert("Sync failed."); }
    setSyncingId(null);
  };

  const handleSaveAdminNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNoteTitle.trim() || !adminNoteContent.trim()) return;
    if (editingNoteId) {
      await workspaceAdmin.from('shared_contents').update({ title: adminNoteTitle, content_data: { text: adminNoteContent, authorName: 'Faravi (Admin)' } }).eq('id', editingNoteId);
    } else {
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: adminNoteTitle, content_type: 'shared_note', content_data: { text: adminNoteContent, authorName: 'Faravi (Admin)' } }]);
    }
    setShowNoteModal(false);
    fetchGroupContents();
  };

  const handleImportLms = async () => { 
    if (!selectedLms) return;
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', selectedLms).single();
      const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', selectedLms).order('created_at');
      const moduleIds = modulesData?.map(m => m.id) || [];
      const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', moduleIds).order('created_at');
      const fullCourse = { ...courseData, modules: modulesData?.map(mod => ({ ...mod, contents: contentsData?.filter(cF => cF.module_id === mod.id) || [] })) };
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: courseData.title, content_type: 'lms_course', content_data: fullCourse }]);
      setSelectedLms(''); fetchGroupContents();
    } catch (err) {} setLoading(false);
  };

  const handleImportBcs = async () => {
    if (!selectedBcs) return;
    setLoading(true);
    try {
      const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', selectedBcs).single();
      const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', selectedBcs).order('created_at');
      const chapterIds = chaptersData?.map(c => c.id) || [];
      const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chapterIds).order('created_at');
      const fullSyllabus = { ...subjectData, chapters: chaptersData?.map(chap => ({ ...chap, resources: resourcesData?.filter(r => r.chapter_id === chap.id) || [] })) };
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: subjectData.title, content_type: 'bcs_subject', content_data: fullSyllabus }]);
      setSelectedBcs(''); fetchGroupContents();
    } catch (err) {} setLoading(false);
  };

  const groupNotes = contents.filter(c => c.content_type === 'shared_note' || c.content_type === 'personal_note');

  if (selectedContent?.content_type === 'lms_course') return <WorkspaceCourseViewer courseData={selectedContent} onBack={() => setSelectedContent(null)} readOnly={true} />;
  if (selectedContent?.content_type === 'bcs_subject') return <WorkspaceBcsViewer subjectData={selectedContent} onBack={() => setSelectedContent(null)} readOnly={true} />;
  if (!group) return <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D0E0F] text-slate-900 dark:text-[#F5F5F5] font-sans pb-20 selection:bg-[#FF9D2E]/30 relative">
      <div className="sticky top-0 bg-white/80 dark:bg-[#0D0E0F]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#292B2E] z-40 px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 md:gap-4">
          <button onClick={() => navigate('/workspace-manager')} className="p-2 md:p-2.5 bg-slate-100 dark:bg-[#141516] hover:bg-slate-200 dark:hover:bg-[#1D1E20] border border-slate-200 dark:border-[#292B2E] rounded-xl transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">{group.name}</h1>
            <p className="text-slate-500 dark:text-[#A3A5A8] text-xs md:text-sm">Full Admin Control Panel</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4 space-y-6 md:space-y-8">
        
        {/* Top Row: Import & Assign */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          <div className="bg-white dark:bg-[#18191A] p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm">
            <h2 className="text-lg md:text-xl font-bold mb-5 flex items-center gap-2"><Download className="text-[#19C784]" size={20} /> Push Course to Group</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <select value={selectedLms} onChange={(e) => setSelectedLms(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-sm">
                  <option value="">-- Select LMS Course --</option>
                  {lmsCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button onClick={handleImportLms} disabled={loading || !selectedLms} className="bg-[#19C784]/10 text-[#19C784] px-4 rounded-xl font-bold disabled:opacity-50"><Plus size={20}/></button>
              </div>
              <div className="flex gap-2">
                <select value={selectedBcs} onChange={(e) => setSelectedBcs(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-sm">
                  <option value="">-- Select BCS Subject --</option>
                  {bcsSubjects.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button onClick={handleImportBcs} disabled={loading || !selectedBcs} className="bg-[#668CFF]/10 text-[#668CFF] px-4 rounded-xl font-bold disabled:opacity-50"><Plus size={20}/></button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#18191A] p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm">
            <h2 className="text-lg md:text-xl font-bold mb-5 flex items-center gap-2"><UserPlus className="text-[#668CFF]" size={20} /> Assign Friend</h2>
            <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-[#141516] p-1 rounded-xl border border-s0ate-200 dark:border-[#292B2E]">
              <button onClick={() => setAssignMode('existing')} className={`flex-1 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${assignMode === 'existing' ? 'bg-white dark:bg-[#292B2E] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-[#707277]'}`}>Existing Friend</button>
              <button onClick={() => setAssignMode('new')} className={`flex-1 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-colors ${assignMode === 'new' ? 'bg-white dark:bg-[#292B2E] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-[#707277]'}`}>Create New</button>
            </div>

            <form onSubmit={handleAssignFriend} className="space-y-3">
              {assignMode === 'existing' ? (
                <select value={selectedFriendEmail} onChange={(e) => setSelectedFriendEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 outline-none text-sm" required>
                  <option value="">-- Select Existing Friend --</option>
                  {allFriends.map((f, idx) => (
                    <option key={idx} value={f.email}>{f.friend_name} ({f.email})</option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="text" placeholder="Friend's Name" value={fName} onChange={(e)=>setFName(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl p-2.5 outline-none text-sm" required/>
                  <div className="flex gap-2">
                    <input type="email" placeholder="Email" value={fEmail} onChange={(e)=>setFEmail(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl p-2.5 outline-none text-sm" required/>
                    <input type="text" placeholder="Password" value={fPassword} onChange={(e)=>setFPassword(e.target.value)} className="flex-1 bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl p-2.5 outline-none text-sm" required/>
                  </div>
                </>
              )}
              <button type="submit" disabled={isAssigning} className="w-full bg-[#668CFF]/10 text-[#668CFF] border border-[#668CFF]/20 font-bold py-2.5 rounded-xl disabled:opacity-50 flex justify-center items-center gap-2 text-sm">
                {isAssigning ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />} {assignMode === 'existing' ? 'Assign to Group' : 'Create & Assign'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white dark:bg-[#18191A] p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-[#292B2E] shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2"><Users className="text-[#FF9D2E]" size={20}/> Group Members (Credentials)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupMembers.length === 0 ? <p className="text-slate-500 dark:text-[#707277]">No friends assigned yet.</p> : 
              groupMembers.map((member) => (
                <div key={member.id} className="bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] p-4 rounded-2xl flex justify-between items-start">
                  <div className="min-w-0 mr-2">
                    <p className="font-bold text-sm truncate">{member.friend_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-[#A3A5A8] mt-0.5 truncate">{member.email}</p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-[#707277] mt-1">Pass: {member.password_plain}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleCopyCredentials(member)} className={`p-1.5 rounded-lg border ${copiedId === member.id ? 'bg-[#19C784]/20 border-[#19C784]/50 text-[#19C784]' : 'bg-white dark:bg-[#292B2E] border-slate-200 dark:border-transparent text-slate-500 dark:text-[#A3A5A8]'}`}>
                      {copiedId === member.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                    </button>
                    <button onClick={() => handleRemoveMember(member.id)} className="p-1.5 bg-white dark:bg-[#292B2E] rounded-lg text-slate-400 dark:text-[#707277] hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start mt-8">
          
          {/* --- MAIN COURSES AREA --- */}
          <div className="flex-1 w-full space-y-8">
            
            {/* 🚀 PREMIUM COLLAPSIBLE ACTIVE COURSES UI (Admin View) */}
            {activeCourses.map(course => {
              const calculatedProgress = getCalculatedProgress(course);
              const isLms = course.content_type === 'lms_course';
              const activeModules = isLms ? course.content_data?.modules || [] : course.content_data?.chapters || [];
              const selectedModForDropdown = activeModules.find((m: any) => m.id === targetModuleId);
              const activeContentsList = selectedModForDropdown ? (isLms ? selectedModForDropdown.contents || [] : selectedModForDropdown.resources || []) : [];
              const isExpanded = expandedCourses[course.id];

              return (
                <div key={course.id} className="bg-gradient-to-br from-[#18191A] to-[#1D1E20] border border-[#FF9D2E]/50 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden mb-6 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D2E]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                  {/* --- Header Section --- */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4 flex-1 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF9D2E] flex items-center justify-center text-slate-900 shadow-lg shrink-0"><Target size={24} /></div>
                      <div className="flex-1 min-w-0">
                         <span className="text-[10px] font-black tracking-widest uppercase text-[#FF9D2E] mb-1 block">Active Focus</span>
                         <h2 className="text-xl font-black text-white leading-tight truncate">{course.title}</h2>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                       <button onClick={() => setSelectedContent(course)} className="flex-1 sm:flex-none bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                         Enter <PlayCircle size={16}/>
                       </button>
                       <button onClick={() => handleToggleActiveCourse(course.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-2 rounded-xl font-bold text-xs transition-colors whitespace-nowrap">
                         Remove Active
                       </button>
                       
                       <button onClick={() => toggleCourseExpand(course.id)} className="bg-[#141516] text-[#A3A5A8] hover:text-[#FF9D2E] border border-[#292B2E] p-2 rounded-xl transition-colors">
                         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                       </button>
                    </div>
                  </div>

                  {/* --- Collapsible Details Section --- */}
                  {isExpanded && (
                    <div className="mt-6 pt-6 border-t border-[#292B2E] relative z-10 animate-fade-in">
                      <div className="mb-6">
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-[#A3A5A8]">Live Progress</span>
                            <span className="text-2xl font-black text-[#19C784] leading-none">{calculatedProgress}%</span>
                         </div>
                         <div className="h-2 w-full bg-[#141516] rounded-full overflow-hidden border border-[#292B2E]">
                            <div className="h-full bg-gradient-to-r from-[#19C784] to-emerald-400 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${calculatedProgress}%` }}>
                               <div className="absolute top-0 right-0 bottom-0 w-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]"></div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-[#141516] rounded-2xl border border-[#292B2E] p-4">
                         <h3 className="text-sm font-bold text-[#A3A5A8] mb-4 flex items-center gap-2"><CheckCircle2 size={18} className="text-[#668CFF]"/> Course Targets & To-Do</h3>
                         
                         <div className="space-y-2 mb-4 max-h-[25vh] overflow-y-auto pr-2 custom-scrollbar">
                            {course.content_data?.group_targets?.map((target: any) => (
                              <div key={target.id} className={`flex items-center justify-between p-3 rounded-xl border ${target.isCompleted ? 'bg-[#19C784]/10 border-[#19C784]/30' : 'bg-[#1D1E20] border-[#292B2E]'}`}>
                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                  <input type="checkbox" checked={target.isCompleted} onChange={() => handleToggleTarget(target, course)} className="w-5 h-5 accent-[#19C784] rounded-md cursor-pointer shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-sm font-bold truncate ${target.isCompleted ? 'text-[#19C784] line-through' : 'text-white'}`}>{target.title}</span>
                                    <span className="text-[10px] text-[#A3A5A8] truncate">{target.parentTitle} • By {new Date(target.dueDate).toLocaleDateString()}</span>
                                  </div>
                                </label>
                                <button onClick={() => handleDeleteTarget(target.id, course)} className="text-[#707277] hover:text-red-500 p-1.5 shrink-0"><Trash2 size={16} /></button>
                              </div>
                            ))}
                            {(!course.content_data?.group_targets || course.content_data.group_targets.length === 0) && (
                              <p className="text-xs text-[#707277] text-center italic py-2">No active targets set.</p>
                            )}
                         </div>

                         <div className="bg-[#1D1E20] p-3 sm:p-4 rounded-xl border border-[#292B2E]">
                            <p className="text-xs font-bold text-[#707277] mb-3 uppercase tracking-wider">Assign New Target</p>
                            <div className="flex flex-col gap-3">
                               <div className="flex flex-col md:flex-row gap-3">
                                  <select value={targetModuleId} onChange={(e) => { setTargetModuleId(e.target.value); setTargetContentId('all'); }} className="flex-1 bg-[#141516] border border-[#292B2E] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D2E] truncate">
                                    <option value="">-- Select Module/Chapter --</option>
                                    {activeModules.map((m: any) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                  </select>
                                  <select value={targetContentId} disabled={!targetModuleId} onChange={(e) => setTargetContentId(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D2E] truncate disabled:opacity-50">
                                    <option value="all">📚 Entire Module</option>
                                    {activeContentsList.map((c: any) => <option key={c.id} value={c.id}>📄 {c.title}</option>)}
                                  </select>
                               </div>
                               <div className="flex flex-col sm:flex-row gap-3">
                                  <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D2E] [color-scheme:dark]" />
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

            {/* OTHER COURSES */}
            <div>
              <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2"><BookOpen className="text-[#19C784]" size={20}/> Group Courses Hub</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveCourses.map(item => (
                  <div key={item.id} className="bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] hover:border-[#19C784]/60 p-5 rounded-3xl flex flex-col justify-between group transition-all">
                    <div onClick={() => setSelectedContent(item)} className="cursor-pointer">
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 rounded-xl bg-[#19C784]/10 text-[#19C784]"><BookOpen size={20} /></div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteContent(item.id, item.content_type); }} className="p-2 text-slate-400 dark:text-[#707277] hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                      <h3 className="font-bold text-base md:text-lg leading-snug mb-4 group-hover:text-[#19C784] transition-colors">{item.title}</h3>
                    </div>
                    <div className="pt-3 border-t border-slate-200 dark:border-[#292B2E] flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-[#A3A5A8] font-medium">Synced Content</span>
                        <button onClick={(e) => { e.stopPropagation(); handleSyncContent(item); }} disabled={syncingId === item.id} className="p-1.5 text-slate-400 dark:text-[#707277] hover:text-[#FF9D2E] rounded-md"><RefreshCw size={14} className={syncingId === item.id ? 'animate-spin text-[#FF9D2E]' : ''} /></button>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleActiveCourse(item.id); }}
                        className="w-full py-2 bg-slate-100 dark:bg-[#141516] text-slate-600 dark:text-[#A3A5A8] hover:bg-[#FF9D2E] hover:text-slate-900 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Target size={14} /> Set as Active Focus
                      </button>
                    </div>
                  </div>
                ))}
                {inactiveCourses.length === 0 && activeCourses.length === 0 && (
                  <p className="text-slate-500 dark:text-[#707277] py-8 text-center col-span-full">No courses added yet. Push a course to get started.</p>
                )}
              </div>
            </div>
          </div>

          {/* --- RIGHT SIDEBAR (NOTES) --- */}
          <div className="w-full lg:w-[340px] shrink-0 bg-white dark:bg-[#18191A] border border-slate-200 dark:border-[#292B2E] rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2"><FileText size={18} className="text-[#FF9D2E]"/> Group Notes</h3>
              <button onClick={() => { setEditingNoteId(null); setAdminNoteTitle(''); setAdminNoteContent(''); setShowNoteModal(true); }} className="p-1.5 bg-[#FF9D2E]/10 text-[#FF9D2E] rounded-lg hover:bg-[#FF9D2E]/20"><Plus size={16} /></button>
            </div>
            <div className="space-y-3">
              {groupNotes.map(note => (
                <div key={note.id} onClick={() => setViewingNote(note)} className="p-3.5 bg-[#141516] rounded-xl border border-[#292B2E] hover:border-[#FF9D2E]/50 cursor-pointer transition-colors flex justify-between items-center group">
                  <div className="flex-1 pr-2">
                    <h4 className="font-bold text-sm line-clamp-1 group-hover:text-[#FF9D2E] transition-colors">{note.title}</h4>
                    <p className="text-[11px] text-[#A3A5A8] mt-1 flex gap-1.5"><span className="font-medium">{note.content_data?.authorName || 'User'}</span><span>•</span><span>{new Date(note.created_at).toLocaleDateString()}</span></p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingNoteId(note.id); setAdminNoteTitle(note.title); setAdminNoteContent(note.content_data?.text || ''); setShowNoteModal(true); }} className="p-1.5 text-[#707277] hover:text-[#FF9D2E]"><Edit3 size={15}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteContent(note.id, note.content_type) }} className="p-1.5 text-[#707277] hover:text-red-500"><Trash2 size={15}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#18191A] p-6 rounded-3xl border border-[#FF9D2E]/30 shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center mb-5"><h3 className="text-xl font-bold flex items-center gap-2"><FileText size={20} className="text-[#FF9D2E]"/> {editingNoteId ? 'Edit Group Note' : 'New Group Note'}</h3><button onClick={() => setShowNoteModal(false)} className="text-slate-400 dark:text-[#707277] hover:text-[#FF5B61]"><X size={20}/></button></div>
            <form onSubmit={handleSaveAdminNote} className="space-y-4">
              <input type="text" placeholder="Note Title..." value={adminNoteTitle} onChange={(e) => setAdminNoteTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] rounded-xl p-4 outline-none font-bold" required />
              <div className="bg-[#141516] rounded-xl overflow-hidden border border-[#292B2E] focus-within:border-[#FF9D2E] transition-colors pb-10">
                <ReactQuill 
                  theme="snow" 
                  value={adminNoteContent} 
                  onChange={setAdminNoteContent} 
                  placeholder="Write your beautiful notes here (Use Bold, Lists, Links)..."
                  className="text-white h-48 border-none"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                      [{'list': 'ordered'}, {'list': 'bullet'}],
                      ['link', 'code-block'],
                      ['clean']
                    ],
                  }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="submit" className="bg-[#FF9D2E] text-black px-6 py-2.5 rounded-xl font-extrabold hover:bg-[#FFAA3D]"><Save size={16} className="inline mr-1" /> {editingNoteId ? 'Update' : 'Publish'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 READ NOTE MODAL (Admin View) */}
      {viewingNote && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#18191A] p-8 rounded-3xl border border-[#292B2E] shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar relative">
            <button onClick={() => setViewingNote(null)} className="absolute top-6 right-6 text-[#707277] hover:text-[#FF5B61] bg-[#141516] p-2 rounded-full"><X size={20}/></button>
            
            <h2 className="text-3xl font-extrabold text-white mb-2">{viewingNote.title}</h2>
            <p className="text-sm text-[#A3A5A8] mb-6 border-b border-[#292B2E] pb-4">
              Created by <span className="text-[#FF9D2E] font-bold">{viewingNote.content_data?.authorName || 'Admin'}</span> on {new Date(viewingNote.created_at).toLocaleDateString()}
            </p>
            
            {/* HTML Note Content */}
            <div className="prose prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: viewingNote.content_data?.text }} className="text-[#F5F5F5] leading-relaxed text-lg whitespace-pre-wrap" />
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN FLOATING CHAT --- */}
      {group && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[999] flex flex-col items-end">
          {isChatOpen && (
            <div className="w-[90vw] md:w-[380px] h-[500px] max-h-[80vh] bg-white dark:bg-[#141516] border border-slate-200 dark:border-[#292B2E] shadow-2xl rounded-3xl mb-4 flex flex-col overflow-hidden animate-fade-in origin-bottom-right">
              <div className="bg-slate-50 dark:bg-[#18191A] p-4 border-b border-slate-200 dark:border-[#292B2E] flex justify-between items-center">
                <div>
                  <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white"><MessageCircle size={18} className="text-[#FF9D2E]" /> Group Chat (Admin)</h3>
                  <p className="text-xs text-slate-500 dark:text-[#707277]">{group.name}</p>
                </div>
                <button onClick={toggleChat} className="text-slate-400 dark:text-[#707277] hover:text-[#FF5B61]"><X size={20} /></button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto bg-slate-100 dark:bg-[#0D0E0F] flex flex-col gap-4">
                {chatLoading ? <div className="flex-1 flex justify-center items-center"><div className="w-6 h-6 border-2 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div> :
                 chatMessages.length === 0 ? <p className="text-center text-slate-500 dark:text-[#707277] mt-10">No messages yet.</p> :
                 chatMessages.map((msg, idx) => {
                   const isMe = msg.user_id === adminId;
                   return (
                     <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                       <span className="text-[10px] text-slate-500 dark:text-[#A3A5A8] mb-1 font-bold">{msg.sender_name}</span>
                       <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] ${isMe ? 'bg-[#FF9D2E] text-slate-900 rounded-tr-sm font-medium' : 'bg-white dark:bg-[#1D1E20] text-slate-900 dark:text-white border border-slate-200 dark:border-[#292B2E] rounded-tl-sm'}`}>
                         {msg.message_type === 'text' && <p>{msg.content}</p>}
                         {msg.message_type === 'image' && <a href={msg.file_url} target="_blank" rel="noreferrer"><img src={msg.file_url} alt="Shared" className="rounded-xl max-h-48 object-cover border border-black/10" /></a>}
                         {msg.message_type === 'file' && <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline underline-offset-2 break-all"><FileText size={16} className="shrink-0" /> {msg.content}</a>}
                         {msg.message_type === 'audio' && <audio controls src={msg.file_url} className="w-48 h-8 rounded-full" />}
                       </div>
                     </div>
                   );
                 })
                }
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#18191A] border-t border-slate-200 dark:border-[#292B2E] flex items-center gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type as Admin..." className="flex-1 bg-slate-100 dark:bg-[#1D1E20] border border-transparent focus:border-[#FF9D2E]/50 rounded-full px-4 py-2 text-sm outline-none" />
                <button type="submit" disabled={!newMessage.trim()} className="p-2.5 bg-[#FF9D2E] text-black rounded-full hover:bg-[#FFAA3D] disabled:opacity-50"><Send size={16}/></button>
              </form>
            </div>
          )}
          <button onClick={toggleChat} className="w-14 h-14 md:w-16 md:h-16 bg-[#FF9D2E] hover:bg-[#FFAA3D] text-slate-900 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(255,157,46,0.3)] hover:scale-105 transition-transform relative">
            {isChatOpen ? <X size={24} strokeWidth={2.5}/> : <MessageCircle size={24} strokeWidth={2.5}/>}
            
            {/* 🔴 RED UNREAD BADGE FOR CHAT BUTTON */}
            {!isChatOpen && unreadCount > 0 && (
              <span className="absolute top-0 right-0 -translate-y-1 translate-x-1 bg-[#FF5B61] text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#141516] animate-pulse shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}