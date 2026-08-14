// src/features/workspace/GroupDetails.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, workspaceAdmin } from '../../lib/supabase';
import { 
  ArrowLeft, Send, Link as LinkIcon, Download, 
  Users, MessageCircle, RefreshCw, FileText, BookOpen, Plus, 
  X, Paperclip, Mic, FolderOpen 
} from 'lucide-react';

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

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  
  const [adminId, setAdminId] = useState<string>('admin-faravi-007'); // Default Admin ID
  const [group, setGroup] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [contents, setContents] = useState<any[]>([]);
  
  // Data from Main OS
  const [lmsCourses, setLmsCourses] = useState<any[]>([]);
  const [bcsSubjects, setBcsSubjects] = useState<any[]>([]);
  
  // Selections & Invite
  const [selectedLms, setSelectedLms] = useState('');
  const [selectedBcs, setSelectedBcs] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // --- Floating Chat States ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchGroupDetails();
    fetchMainOsData();
    // Get Admin User ID from Main OS
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setAdminId(data.user.id);
    });
  }, [groupId]);

  // Auto Scroll Chat
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // --- Realtime Chat Listener ---
  useEffect(() => {
    if (groupId && isChatOpen) {
      fetchChatMessages();

      const chatSubscription = workspaceAdmin
        .channel(`admin_chat_${groupId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chats', filter: `group_id=eq.${groupId}` }, 
          (payload: any) => {
            const newMsg = payload.new as ChatMessage;
            setChatMessages((prev) => {
              const exists = prev.some((msg) => msg.id === newMsg.id || (msg.isOptimistic && msg.content === newMsg.content));
              if (exists) {
                return prev.map((msg) => msg.isOptimistic && msg.content === newMsg.content ? newMsg : msg);
              }
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();

      return () => { workspaceAdmin.removeChannel(chatSubscription); };
    }
  }, [groupId, isChatOpen]);

  const fetchGroupDetails = async () => {
    const { data: gData } = await workspaceAdmin.from('study_groups').select('*').eq('id', groupId).single();
    if (gData) setGroup(gData);

    const { data: mData } = await workspaceAdmin.from('group_members').select('id').eq('group_id', groupId);
    if (mData) setMemberCount(mData.length);

    fetchGroupContents();
  };

  const fetchGroupContents = async () => {
    const { data } = await workspaceAdmin.from('shared_contents').select('*').eq('group_id', groupId).order('created_at', { ascending: false });
    if (data) setContents(data);
  };

  const fetchMainOsData = async () => {
    const { data: lms } = await supabase.from('lms_courses').select('id, title');
    if (lms) setLmsCourses(lms);

    const { data: bcs } = await supabase.from('bcs_subjects').select('id, title');
    if (bcs) setBcsSubjects(bcs);
  };

  const fetchChatMessages = async () => {
    setChatLoading(true);
    const { data, error } = await workspaceAdmin.from('group_chats').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (!error && data) setChatMessages(data as ChatMessage[]);
    setChatLoading(false);
  };

  // --- Handle Main OS Imports ---
  const handleImportLms = async () => { /* Logic hidden for brevity, unchanged */
    if (!selectedLms) return;
    setLoading(true);
    try {
      const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', selectedLms).single();
      const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', selectedLms).order('created_at');
      const moduleIds = modulesData?.map(m => m.id) || [];
      const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', moduleIds).order('created_at');
      
      const fullCourse = { ...courseData, modules: modulesData?.map(mod => ({ ...mod, contents: contentsData?.filter(c => c.module_id === mod.id) || [] })) };
      await workspaceAdmin.from('shared_contents').insert([{ group_id: groupId, title: courseData.title, content_type: 'lms_course', content_data: fullCourse }]);
      setSelectedLms(''); fetchGroupContents();
    } catch (err) { alert('Error importing LMS course'); }
    setLoading(false);
  };

  const handleImportBcs = async () => { /* Unchanged */
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
    } catch (err) { alert('Error importing BCS subject'); }
    setLoading(false);
  };

  const handleSyncContent = async (item: any) => { /* Unchanged */
    setSyncingId(item.id);
    try {
      let updatedData = {};
      if (item.content_type === 'lms_course') {
        const originalId = item.content_data.id;
        const { data: courseData } = await supabase.from('lms_courses').select('*').eq('id', originalId).single();
        const { data: modulesData } = await supabase.from('lms_modules').select('*').eq('course_id', originalId);
        const { data: contentsData } = await supabase.from('lms_contents').select('*').in('module_id', modulesData?.map(m => m.id) || []);
        updatedData = { ...courseData, modules: modulesData?.map(mod => ({ ...mod, contents: contentsData?.filter(c => c.module_id === mod.id) || [] })) };
      } 
      else if (item.content_type === 'bcs_subject') {
        const originalId = item.content_data.id;
        const { data: subjectData } = await supabase.from('bcs_subjects').select('*').eq('id', originalId).single();
        const { data: chaptersData } = await supabase.from('bcs_chapters').select('*').eq('subject_id', originalId);
        const { data: resourcesData } = await supabase.from('bcs_resources').select('*').in('chapter_id', chaptersData?.map(c => c.id) || []);
        updatedData = { ...subjectData, chapters: chaptersData?.map(chap => ({ ...chap, resources: resourcesData?.filter(r => r.chapter_id === chap.id) || [] })) };
      }
      await workspaceAdmin.from('shared_contents').update({ content_data: updatedData }).eq('id', item.id);
      fetchGroupContents();
    } catch (error) { alert("Sync failed."); }
    setSyncingId(null);
  };

  const handleGenerateInvite = async (e: React.FormEvent) => { /* Unchanged */
    e.preventDefault();
    if (!inviteEmail || !invitePassword) return;
    setLoading(true);
    try {
      const { data: authData } = await workspaceAdmin.auth.admin.createUser({ email: inviteEmail, password: invitePassword, email_confirm: true });
      if (authData.user) {
        await workspaceAdmin.from('workspace_profiles').insert([{ id: authData.user.id, email: inviteEmail }]);
        await workspaceAdmin.from('group_members').insert([{ group_id: groupId, user_id: authData.user.id, role: 'member' }]);
        const loginUrl = `${window.location.origin}/workspace/login`;
        setGeneratedLink(`Join my Study Group: ${group?.name}\n\nLink: ${loginUrl}\nEmail: ${inviteEmail}\nPass: ${invitePassword}`);
        setInviteEmail(''); setInvitePassword(''); fetchGroupDetails();
      }
    } catch (err) { alert('Error creating invite.'); }
    setLoading(false);
  };

  // --- Admin Chat Handlers ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !groupId) return;

    const messageText = newMessage;
    setNewMessage(''); 

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId, group_id: groupId, user_id: adminId, sender_name: 'Faravi (Admin)', content: messageText, message_type: 'text', isOptimistic: true,
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await workspaceAdmin.from('group_chats').insert([{
      group_id: groupId, user_id: adminId, sender_name: 'Faravi (Admin)', content: messageText, message_type: 'text',
    }]);
    if (error) setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;

    const type = file.type.startsWith('image/') ? 'image' : 'file';
    const fileName = `admin-${Date.now()}-${file.name}`;
    const { error: uploadError } = await workspaceAdmin.storage.from('chat-files').upload(fileName, file);
    if (uploadError) { alert('Upload failed'); return; }

    const { data } = workspaceAdmin.storage.from('chat-files').getPublicUrl(fileName);
    await workspaceAdmin.from('group_chats').insert([{
      group_id: groupId, user_id: adminId, sender_name: 'Faravi (Admin)', content: file.name, message_type: type, file_url: data.publicUrl,
    }]);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunks.length === 0 || !groupId) return;

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const fileName = `admin-${Date.now()}.webm`;
        const { error: uploadError } = await workspaceAdmin.storage.from('chat-files').upload(fileName, audioBlob);
        if (uploadError) return;

        const { data } = workspaceAdmin.storage.from('chat-files').getPublicUrl(fileName);
        await workspaceAdmin.from('group_chats').insert([{
          group_id: groupId, user_id: adminId, sender_name: 'Faravi (Admin)', content: 'Voice Message', message_type: 'audio', file_url: data.publicUrl,
        }]);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert('Microphone access denied or not available.'); }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  if (!group) return <div className="min-h-screen bg-[#0D0E0F] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-[#0D0E0F] text-[#F5F5F5] font-sans pb-20 selection:bg-[#FF9D2E]/30 relative">
      
      {/* Premium Header */}
      <div className="sticky top-0 bg-[#0D0E0F]/80 backdrop-blur-xl border-b border-[#292B2E] z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/workspace-manager')} className="p-2.5 bg-[#141516] hover:bg-[#1D1E20] border border-[#292B2E] rounded-xl text-[#A3A5A8] hover:text-[#F5F5F5] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-[#F5F5F5] flex items-center gap-3">
                {group.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm font-semibold">
                <span className="flex items-center gap-1.5 text-[#668CFF]"><Users size={14}/> {memberCount} Members</span>
                <span className="w-1 h-1 rounded-full bg-[#292B2E]"></span>
                <span className="text-[#A3A5A8]">Admin Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 mt-4 space-y-6">
        
        {/* Top Grids: Import & Invite */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#292B2E] shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#F5F5F5] mb-5 flex items-center gap-2">
                <Download className="text-[#19C784]" /> Import to Group
              </h2>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select value={selectedLms} onChange={(e) => setSelectedLms(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 text-[#F5F5F5] outline-none">
                    <option value="">-- Select LMS Course --</option>
                    {lmsCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button onClick={handleImportLms} disabled={loading || !selectedLms} className="bg-[#19C784]/10 text-[#19C784] hover:bg-[#19C784]/20 border border-[#19C784]/20 px-4 rounded-xl font-bold transition-colors disabled:opacity-50">
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <select value={selectedBcs} onChange={(e) => setSelectedBcs(e.target.value)} className="flex-1 bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 text-[#F5F5F5] outline-none">
                    <option value="">-- Select BCS Subject --</option>
                    {bcsSubjects.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button onClick={handleImportBcs} disabled={loading || !selectedBcs} className="bg-[#668CFF]/10 text-[#668CFF] hover:bg-[#668CFF]/20 border border-[#668CFF]/20 px-4 rounded-xl font-bold transition-colors disabled:opacity-50">
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#18191A] p-6 rounded-3xl border border-[#292B2E] shadow-sm">
            <h2 className="text-xl font-bold text-[#F5F5F5] mb-5 flex items-center gap-2">
              <Send className="text-[#FF9D2E]" /> Invite Member
            </h2>
            <form onSubmit={handleGenerateInvite} className="space-y-3">
              <input type="email" placeholder="Friend's Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 text-white outline-none" required />
              <input type="text" placeholder="Set Temporary Password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] rounded-xl p-3 text-white outline-none" required />
              <button type="submit" disabled={loading} className="w-full bg-[#FF9D2E] hover:bg-[#FFAA3D] text-[#0D0E0F] py-3 rounded-xl font-extrabold transition-all">Generate Access</button>
            </form>
            {generatedLink && (
              <div className="mt-4 p-4 bg-[#141516] border border-[#FF9D2E]/30 rounded-xl relative">
                <pre className="text-xs text-[#19C784] whitespace-pre-wrap font-mono">{generatedLink}</pre>
                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="absolute top-2 right-2 text-[#A3A5A8] hover:text-white p-2 bg-[#1D1E20] rounded-lg"><LinkIcon size={14} /></button>
              </div>
            )}
          </div>
        </div>

        {/* --- Pushed Courses Grid --- */}
        <div>
          <h2 className="text-xl font-bold text-[#F5F5F5] mb-4 mt-8">Courses inside this Group</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {contents.length === 0 ? (
              <div className="col-span-full py-12 text-center border border-dashed border-[#292B2E] bg-[#141516] rounded-3xl">
                <FolderOpen size={40} className="mx-auto text-[#707277] mb-3" />
                <p className="text-[#A3A5A8] font-medium">No courses have been imported yet.</p>
              </div>
            ) : (
              contents.map(item => (
                <div key={item.id} className="bg-[#18191A] border border-[#292B2E] p-5 rounded-3xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${item.content_type === 'lms_course' ? 'bg-[#19C784]/10 text-[#19C784]' : 'bg-[#668CFF]/10 text-[#668CFF]'}`}>
                        {item.content_type === 'lms_course' ? <FileText size={20} /> : <BookOpen size={20} />}
                      </div>
                      <span className="text-[10px] font-bold text-[#A3A5A8] uppercase tracking-widest bg-[#141516] px-2 py-1 rounded-md border border-[#292B2E]">
                        {item.content_type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-[#F5F5F5] leading-snug line-clamp-2 mb-4">{item.title}</h3>
                  </div>
                  <button 
                    onClick={() => handleSyncContent(item)}
                    disabled={syncingId === item.id}
                    className="w-full flex items-center justify-center gap-2 bg-[#141516] hover:bg-[#1D1E20] border border-[#292B2E] hover:border-[#FF9D2E]/50 text-[#A3A5A8] hover:text-[#F5F5F5] py-2.5 rounded-xl font-semibold transition-all text-sm"
                  >
                    {syncingId === item.id ? <RefreshCw size={16} className="animate-spin text-[#FF9D2E]" /> : <RefreshCw size={16} />}
                    {syncingId === item.id ? 'Syncing...' : 'Sync Latest Modules'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- ADMIN FLOATING CHAT SYSTEM --- */}
      <div className="fixed bottom-8 right-8 z-[999] flex flex-col items-end">
        {isChatOpen && (
          <div className="w-[90vw] md:w-[380px] h-[500px] max-h-[80vh] bg-[#141516] border border-[#292B2E] shadow-2xl shadow-[#FF9D2E]/10 rounded-3xl mb-4 flex flex-col overflow-hidden animate-fade-in origin-bottom-right">
            
            <div className="bg-[#18191A] p-4 border-b border-[#292B2E] flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-white">
                  <MessageCircle size={18} className="text-[#FF9D2E]" /> Admin Chat
                </h3>
                <p className="text-xs text-[#A3A5A8]">Direct connection to group</p>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-[#707277] hover:text-[#FF5B61] transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-[#0D0E0F] flex flex-col gap-4 scroll-smooth">
              {chatLoading ? (
                <div className="flex-1 flex justify-center items-center"><div className="w-6 h-6 border-2 border-[#FF9D2E] border-t-transparent rounded-full animate-spin"></div></div>
              ) : chatMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#707277]">
                  <MessageCircle size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No messages yet.</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => {
                  const isMe = msg.user_id === adminId;
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className={`text-[10px] text-[#A3A5A8] ${isMe ? 'mr-1' : 'ml-1'} mb-1 font-bold`}>
                        {isMe ? 'You (Admin)' : msg.sender_name}
                      </span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm max-w-[85%] leading-relaxed ${
                        isMe ? 'bg-[#FF9D2E] text-[#0D0E0F] rounded-tr-sm font-bold' : 'bg-[#1D1E20] border border-[#292B2E] text-[#F5F5F5] rounded-tl-sm'
                      }`}>
                        {msg.message_type === 'text' && <p>{msg.content}</p>}
                        {msg.message_type === 'image' && <img src={msg.file_url} alt="Shared" className="rounded-xl max-h-48 object-cover" />}
                        {msg.message_type === 'file' && <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline underline-offset-2 break-all"><FileText size={16} className="shrink-0" /> {msg.content}</a>}
                        {msg.message_type === 'audio' && <audio controls src={msg.file_url} className="w-48 h-8 rounded-full" />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-[#18191A] border-t border-[#292B2E] flex items-center gap-2">
              <label className="p-2 text-[#707277] hover:text-[#FF9D2E] cursor-pointer transition-colors">
                <Paperclip size={20} />
                <input type="file" onChange={handleFileUpload} className="hidden" />
              </label>
              
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isRecording ? 'Recording audio...' : 'Message as Admin...'} 
                disabled={isRecording}
                className="flex-1 bg-[#1D1E20] border border-transparent focus:border-[#FF9D2E]/50 rounded-full px-4 py-2 text-sm text-white outline-none transition-all disabled:opacity-50" 
              />
              
              <button 
                type="button" 
                onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#707277] hover:text-[#FF9D2E]'}`}
              >
                <Mic size={20}/>
              </button>
              
              <button type="submit" disabled={!newMessage.trim() || isRecording} className="p-2.5 bg-[#FF9D2E] text-[#0D0E0F] rounded-full hover:bg-[#FFAA3D] disabled:opacity-50 transition-colors">
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
        </button>
      </div>

    </div>
  );
}