import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TaskManager from './TaskManager';
import { 
  Sun, Moon, Sunrise, BookOpen, Target, 
  Briefcase, FolderLock, TrendingUp, 
  Clock, Flame, Quote, Sparkles, PlayCircle, 
  PauseCircle, LogOut, GitBranch, Code2, 
  Pin, StickyNote, Plus, Pencil, Trash2, 
  Bold, Italic, Check, LayoutGrid
} from 'lucide-react';

// === Dynamic Motivational Quotes ===
const MOTIVATIONAL_QUOTES = [
  "Success is not final; failure is not fatal: It is the courage to continue that counts.",
  "First, solve the problem. Then, write the code.",
  "Make it work, make it right, make it fast.",
  "Your portfolio is your resume. Keep building.",
  "The only way to do great work is to love what you do.",
  "Focus on being productive instead of busy.",
  "Small daily improvements over time lead to stunning results."
];

// Clean tilt presets for the modern canvas
const NOTE_TILTS = ['-rotate-1', 'rotate-1', 'rotate-0', '-rotate-0', 'rotate-1', '-rotate-1'];

// Professional Pastel Palette
const COLOR_PALETTE = ['#FFFBEB', '#FDF2F8', '#F0FDF4', '#EEF2FF', '#FFF7ED', '#ECFEFF'];

export default function ModernDashboard() {
  const navigate = useNavigate();
  
  // --- UI & Time States ---
  const [greeting, setGreeting] = useState('Welcome');
  const [timeIcon, setTimeIcon] = useState(<Sun size={20} className="text-amber-500" />);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // --- Gamification States ---
  const [streak, setStreak] = useState(0);
  const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  
  // --- Data States ---
  const [stats, setStats] = useState({ pendingTasks: 0, bcsCompleted: 0, lmsCompleted: 0, vaultItems: 0 });
  const [allCourses, setAllCourses] = useState<any[]>([]);
  
  // --- Board Notes & CRUD States ---
  const [boardNotes, setBoardNotes] = useState<any[]>([]);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const fetchBoardNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('dashboard_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setBoardNotes(data);
    } catch (error) {
      console.error("Error fetching board notes:", error);
    }
  };

  const createBoardNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newNote = { content: '', bg_color: '#FFFBEB', is_pinned: true, user_id: user.id };
      const { data, error } = await supabase.from('dashboard_notes').insert([newNote]).select().single();
      if (error) throw error;
      if (data) {
        setBoardNotes([data, ...boardNotes]);
        setIsEditingBoard(true);
        setTimeout(() => document.getElementById(`board-note-${data.id}`)?.focus(), 100);
      }
    } catch (err) {
      console.error('Error creating note:', err);
    }
  };

  const updateBoardNoteContent = async (id: string, content: string) => {
    setBoardNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    setSavingNoteId(id);
    try {
      await supabase.from('dashboard_notes').update({ content }).eq('id', id);
    } catch (err) {
      console.error('Error updating note:', err);
    } finally {
      setTimeout(() => setSavingNoteId(null), 600);
    }
  };

  const updateBoardNoteColor = async (id: string, bg_color: string) => {
    setBoardNotes(prev => prev.map(n => n.id === id ? { ...n, bg_color } : n));
    await supabase.from('dashboard_notes').update({ bg_color }).eq('id', id);
  };

  const deleteBoardNote = async (id: string) => {
    if (!window.confirm('Delete this note?')) return;
    setBoardNotes(prev => prev.filter(n => n.id !== id));
    await supabase.from('dashboard_notes').delete().eq('id', id);
  };

  const applyNoteFormat = (e: React.MouseEvent, id: string, format: 'bold' | 'italic') => {
    e.preventDefault();
    const el = document.getElementById(`board-note-${id}`);
    if (!el) return;
    document.execCommand(format, false);
    el.focus();
    updateBoardNoteContent(id, el.innerHTML);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) { setGreeting('Good Morning'); setTimeIcon(<Sunrise size={24} className="text-amber-500" />); }
      else if (hour >= 12 && hour < 18) { setGreeting('Good Afternoon'); setTimeIcon(<Sun size={24} className="text-amber-500" />); }
      else { setGreeting('Good Evening'); setTimeIcon(<Moon size={24} className="text-indigo-400" />); }
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    fetchStatsAndStreak();
    fetchBoardNotes();
    return () => clearInterval(timer);
  }, []);

  const fetchStatsAndStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const metadata = user.user_metadata || {};
      const lastActive = metadata.last_active_date;
      const currentStreak = metadata.streak_count || 0;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = currentStreak;
      if (lastActive !== today) {
        newStreak = (lastActive === yesterday) ? newStreak + 1 : 1;
        await supabase.auth.updateUser({ data: { last_active_date: today, streak_count: newStreak } });
      }
      setStreak(newStreak);

      const [tasksRes, bcsRes, lmsRes, vaultRes] = await Promise.allSettled([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', false),
        supabase.from('bcs_resources').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true),
        supabase.from('lms_contents').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true),
        supabase.from('vault_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      setStats({
        pendingTasks: tasksRes.status === 'fulfilled' ? tasksRes.value.count || 0 : 0,
        bcsCompleted: bcsRes.status === 'fulfilled' ? bcsRes.value.count || 0 : 0,
        lmsCompleted: lmsRes.status === 'fulfilled' ? lmsRes.value.count || 0 : 0,
        vaultItems: vaultRes.status === 'fulfilled' ? vaultRes.value.count || 0 : 0
      });

      const { data: bcsProg } = await supabase.from('bcs_subjects').select('id, title, status, progress_pct, icon_color');
      const { data: lmsProg } = await supabase.from('lms_courses').select('id, title, status, progress_pct');

      setAllCourses([
        ...(bcsProg || []).map(c => ({ ...c, courseType: 'bcs' })),
        ...(lmsProg || []).map(c => ({ ...c, courseType: 'lms' }))
      ]);
    } catch (error) { console.error(error); }
  };

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const activeCourses = allCourses.filter(c => c.status === 'active');
  const pendingCourses = allCourses.filter(c => c.status === 'pending');

  const statCards = [
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: <Target size={16} />, color: 'text-rose-500', to: '' },
    { title: 'BCS Items Read', value: stats.bcsCompleted, icon: <BookOpen size={16} />, color: 'text-[#02C2D5]', to: '/bcs' },
    { title: 'Skills Mastered', value: stats.lmsCompleted, icon: <Briefcase size={16} />, color: 'text-purple-600', to: '/lms' },
    { title: 'Vault Files', value: stats.vaultItems, icon: <FolderLock size={16} />, color: 'text-slate-600', to: '/vault' }
  ];

  const CourseProgressItem = ({ course, isFocused = false }: { course: any, isFocused?: boolean }) => {
    const isLms = course.courseType === 'lms';
    const link = isLms ? `/lms/course/${course.id}` : `/bcs/subject/${course.id}`;
    const color = isLms ? '#9333ea' : (course.icon_color || '#02C2D5');
    return (
      <div className={`group flex flex-col gap-2 ${isFocused ? 'bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-slate-300' : 'py-3 border-b border-slate-100 last:border-0'} transition-colors`}>
        <div className="flex justify-between items-start">
          <Link to={link} className={`font-bold truncate pr-3 flex-1 ${isFocused ? 'text-sm text-slate-800' : 'text-sm text-slate-600'} hover:text-[#02C2D5] transition-colors`}>
            {course.title || 'Untitled'}
          </Link>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${isLms ? 'text-purple-600 bg-purple-100/50' : 'text-[#02C2D5] bg-[#02C2D5]/10'}`}>
            {isLms ? 'LMS' : 'BCS'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${course.progress_pct || 0}%`, backgroundColor: color }} />
          </div>
          <span className="text-[10px] font-bold text-slate-400 w-6 text-right">{course.progress_pct || 0}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col font-sans">
      <div className="p-4 md:p-6 lg:p-8 2xl:px-12 max-w-[1600px] mx-auto w-full mb-24 md:mb-10 flex-1 flex flex-col gap-6 lg:gap-8">
        
        {/* ================= 1. MINIMAL HEADER ================= */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shrink-0">
              {timeIcon}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{greeting}</p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-none">Faravi.</h1>
            </div>
          </div>
          
          <div className="flex items-center w-full xl:w-auto gap-3 md:gap-4">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex-1 xl:flex-none">
              <Flame size={18} className={streak > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"} />
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Focus Streak</p>
                <p className="text-sm font-black text-slate-800 leading-tight">{streak > 0 ? `${streak} Days` : "Start today!"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl">
              <Clock size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-600">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <button onClick={handleSignOut} title="Sign Out" className="w-12 h-12 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 rounded-2xl flex items-center justify-center transition-all shrink-0">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* ================= 2. SNAPSHOT & FOCUS CANVAS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* STATS (Clean minimalist cards) */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            {statCards.map((stat, i) => {
              const Inner = (
                <div className="h-full bg-white border border-slate-100 rounded-3xl p-5 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.title}</p>
                  </div>
                </div>
              );
              return stat.to ? <Link key={i} to={stat.to} className="block h-full">{Inner}</Link> : <div key={i} className="h-full">{Inner}</div>;
            })}
          </div>

          {/* FOCUS CANVAS (Modern alternative to Corkboard) */}
          <div className="lg:col-span-8">
            <div className="h-full rounded-3xl bg-white border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col relative">
              
              {/* Canvas Header */}
              <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center"><Pin size={12} className="text-indigo-500" /></div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Focus Canvas</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={createBoardNote} title="New Note" className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                    <Plus size={16} />
                  </button>
                  <button onClick={() => setIsEditingBoard(!isEditingBoard)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isEditingBoard ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {/* Canvas Body (Dot Grid Pattern) */}
              <div 
                className="flex-1 min-h-[220px] relative bg-[#F8FAFC]"
                style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '16px 16px' }}
              >
                {boardNotes.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <StickyNote size={32} className="text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500">Blank Canvas</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Click the + icon to pin a quick thought.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar px-6 py-6 h-full">
                    {boardNotes.map((note, i) => (
                      <div
                        key={note.id}
                        className={`relative shrink-0 w-52 transition-all duration-300 ${isEditingBoard ? 'scale-[1.02] z-20 shadow-lg' : `${NOTE_TILTS[i % NOTE_TILTS.length]} hover:!rotate-0 hover:scale-105 hover:z-30 hover:shadow-xl`}`}
                      >
                        {/* Minimalist Flat Note */}
                        <div
                          className={`relative rounded-2xl p-4 min-h-[160px] max-h-[180px] flex flex-col shadow-sm border border-black/5 ${isEditingBoard ? 'ring-2 ring-indigo-500/20' : ''}`}
                          style={{ backgroundColor: note.bg_color || '#FFFBEB' }}
                        >
                          {/* Minimal Pin Dot */}
                          {!isEditingBoard && <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-black/10 shadow-sm" />}
                          
                          {/* Edit Toolbar */}
                          {isEditingBoard && (
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5">
                              <div className="flex items-center gap-0.5">
                                <button onMouseDown={(e) => applyNoteFormat(e, note.id, 'bold')} className="p-1 hover:bg-black/5 rounded"><Bold size={12} className="text-slate-600"/></button>
                                <button onMouseDown={(e) => applyNoteFormat(e, note.id, 'italic')} className="p-1 hover:bg-black/5 rounded"><Italic size={12} className="text-slate-600"/></button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {savingNoteId === note.id && <Check size={12} className="text-emerald-500" />}
                                <button onClick={() => deleteBoardNote(note.id)} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          )}

                          {/* Content */}
                          <div
                            id={`board-note-${note.id}`}
                            contentEditable={isEditingBoard}
                            suppressContentEditableWarning
                            onBlur={(e) => isEditingBoard && updateBoardNoteContent(note.id, e.currentTarget.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: note.content || (isEditingBoard ? '' : '<span class="italic opacity-40">Empty note...</span>') }}
                            className={`flex-1 overflow-y-auto hide-scrollbar text-xs leading-relaxed text-slate-700 font-medium outline-none ${isEditingBoard ? 'mt-0' : 'mt-4'}`}
                          />
                          
                          {/* Footer */}
                          {isEditingBoard ? (
                            <div className="flex items-center gap-1.5 pt-3 mt-2 border-t border-black/5">
                              {COLOR_PALETTE.map((c) => (
                                <button key={c} type="button" style={{ backgroundColor: c }} onClick={() => updateBoardNoteColor(note.id, c)} className={`w-3.5 h-3.5 rounded-full border border-black/10 ${note.bg_color === c ? 'ring-2 ring-black/20 scale-110' : ''}`} />
                              ))}
                            </div>
                          ) : (
                            note.created_at && <p className="text-[9px] font-bold text-slate-400 text-right mt-2">{new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= 3. MAIN GRID (Tasks & Sidebar) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 pb-8">
          
          {/* TASK MANAGER (Clean & Borderless vibe) */}
          <div className="lg:col-span-8 h-[650px] lg:h-[720px] bg-white rounded-[2rem] border border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
            <TaskManager />
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Minimal App Grid */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
              <h3 className="text-sm font-black text-slate-800 tracking-tight mb-5 flex items-center gap-2">
                <LayoutGrid size={16} className="text-slate-400" /> Modules
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'BCS', to: '/bcs', icon: <BookOpen size={20} className="text-[#02C2D5]" />, bg: 'bg-[#02C2D5]/5 hover:bg-[#02C2D5]/10' },
                  { name: 'LMS', to: '/lms', icon: <Briefcase size={20} className="text-purple-500" />, bg: 'bg-purple-50 hover:bg-purple-100' },
                  { name: 'Vault', to: '/vault', icon: <FolderLock size={20} className="text-slate-600" />, bg: 'bg-slate-50 hover:bg-slate-100' },
                  { name: 'Finance', to: '/finance', icon: <TrendingUp size={20} className="text-emerald-500" />, bg: 'bg-emerald-50 hover:bg-emerald-100' },
                  { name: 'Dev', to: '/github', icon: <GitBranch size={20} className="text-slate-700" />, bg: 'bg-slate-50 hover:bg-slate-100' },
                  { name: 'Snippets', to: '/snippets', icon: <Code2 size={20} className="text-indigo-500" />, bg: 'bg-indigo-50 hover:bg-indigo-100' }
                ].map((app: any, i) => (
                  <Link key={i} to={app.to} className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-colors ${app.bg}`}>
                    {app.icon}
                    <span className="text-[10px] font-bold text-slate-700">{app.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Elegant Motivation Quote */}
            <div className="bg-[#020F33] p-8 rounded-[2rem] text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#02C2D5]/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <Quote className="text-[#02C2D5] mb-5 opacity-50" size={24} />
              <p className="text-sm font-medium leading-relaxed mb-6 text-slate-200">"{dailyQuote}"</p>
              <p className="text-[9px] font-black text-[#02C2D5] tracking-widest uppercase">System Mindset</p>
            </div>
            
            {/* Clean Progress Widget */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_2px_20px_rgba(0,0,0,0.02)] flex-1">
              <h3 className="text-sm font-black text-slate-800 tracking-tight mb-5 flex items-center gap-2">
                <Target size={16} className="text-slate-400" /> Active Progress
              </h3>
              
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Currently Learning</h4>
                  {activeCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl text-center">No active courses.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeCourses.map(course => <CourseProgressItem key={course.id} course={course} isFocused={true} />)}
                    </div>
                  )}
                </div>

                {pendingCourses.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Up Next (Pending)</h4>
                    <div className="flex flex-col">
                      {pendingCourses.map(course => <CourseProgressItem key={course.id} course={course} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}