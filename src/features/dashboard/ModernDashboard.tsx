import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TaskManager from './TaskManager';
import {
  Sun, Moon, Sunrise, BookOpen, Target,
  Briefcase, FolderLock, TrendingUp,
  Clock, Flame, Quote, PlayCircle,
  PauseCircle, LogOut, GitBranch, Code2,
  Pin, StickyNote, Plus, Pencil, Trash2,
  Bold, Italic, Check, ArrowUpRight, Calendar,
  LayoutGrid, GraduationCap
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

// Subtle tilt presets for pinboard notes
const NOTE_TILTS = ['-rotate-1', 'rotate-1', 'rotate-[1.5deg]', '-rotate-[1.5deg]', 'rotate-[0.5deg]', '-rotate-[0.5deg]'];

// Sticky Note Color Palette
const COLOR_PALETTE = [
  '#FEF3C7', // Warm Yellow
  '#FCE7F3', // Soft Pink
  '#DCFCE7', // Mint Green
  '#E0E7FF', // Indigo Mist
  '#FFEDD5', // Soft Orange
  '#CFFAFE', // Sky Cyan
];

// Quick app shortcuts
const QUICK_APPS = [
  { name: 'BCS Prep', to: '/bcs', icon: BookOpen, color: 'text-[#02C2D5]', bg: 'bg-[#02C2D5]/10' },
  { name: 'LMS Skill', to: '/lms', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100' },
  { name: 'Finance', to: '/finance', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { name: 'Vault', to: '/vault', icon: FolderLock, color: 'text-slate-600', bg: 'bg-slate-100' },
  { name: 'Dev Hub', to: '/github', icon: GitBranch, color: 'text-slate-900', bg: 'bg-slate-200' },
  { name: 'Snippets', to: '/snippets', icon: Code2, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { name: 'Job Tracker', to: '/jobs', icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-100' },
];

// Local (Asia/Dhaka) date string: YYYY-MM-DD
const localDateString = (d: Date) =>
  d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });

const getTimeOfDay = (hour: number) => {
  if (hour >= 5 && hour < 12) return { greeting: 'Good Morning', Icon: Sunrise, color: 'text-amber-300' };
  if (hour >= 12 && hour < 18) return { greeting: 'Good Afternoon', Icon: Sun, color: 'text-amber-300' };
  return { greeting: 'Good Evening', Icon: Moon, color: 'text-indigo-300' };
};

const CARD = 'bg-white rounded-3xl border border-[#E2E8F0] shadow-sm';

export default function ModernDashboard() {
  const navigate = useNavigate();

  // --- UI & Time States ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Gamification States ---
  const [streak, setStreak] = useState(0);
  const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);

  // --- Data States ---
  const [stats, setStats] = useState({ pendingTasks: 0, bcsCompleted: 0, lmsCompleted: 0, vaultItems: 0 });
  const [allCourses, setAllCourses] = useState<any[]>([]);

  // --- Pinboard Notes & CRUD States ---
  const [boardNotes, setBoardNotes] = useState<any[]>([]);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const { greeting, Icon: TimeIcon, color: timeColor } = getTimeOfDay(currentTime.getHours());

  // === Fetch Board Notes ===
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

  // === Pinboard CRUD Handlers ===
  const createBoardNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newNote = {
        content: '',
        bg_color: '#FEF3C7',
        is_pinned: true,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('dashboard_notes')
        .insert([newNote])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setBoardNotes(prev => [data, ...prev]);
        setIsEditingBoard(true); // Automatically activate edit mode on new note creation
        setTimeout(() => {
          const el = document.getElementById(`board-note-${data.id}`);
          el?.focus();
        }, 100);
      }
    } catch (err) {
      console.error('Error creating note on board:', err);
    }
  };

  const updateBoardNoteContent = async (id: string, content: string) => {
    setBoardNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    setSavingNoteId(id);

    try {
      const { error } = await supabase
        .from('dashboard_notes')
        .update({ content })
        .eq('id', id);

      if (error) throw error;
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
    if (!window.confirm('Delete this note from the board?')) return;
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
    // 1. Clock Engine
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);

    // 2. Set Random Quote
    setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

    // 3. Load Data & Gamification
    fetchStatsAndStreak();
    fetchBoardNotes();

    return () => {
      clearInterval(timer);
    };
  }, []);

  // --- Core Data & Gamification Engine ---
  const fetchStatsAndStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const metadata = user.user_metadata || {};
      const lastActive = metadata.last_active_date;
      const currentStreak = metadata.streak_count || 0;

      const today = localDateString(new Date());
      const yesterday = localDateString(new Date(Date.now() - 86400000));

      let newStreak = currentStreak;

      if (lastActive !== today) {
        if (lastActive === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
        await supabase.auth.updateUser({
          data: { last_active_date: today, streak_count: newStreak }
        });
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

    } catch (error) {
      console.error("Error fetching stats and streak:", error);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  // --- Filtered Course Grouping (Only Active & Pending) ---
  const activeCourses = allCourses.filter(c => c.status === 'active');
  const pendingCourses = allCourses.filter(c => c.status === 'pending');

  // --- Stat Cards Config ---
  const statCards = [
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: <Target size={18} />, color: 'text-rose-600', bg: 'bg-rose-100', to: '' },
    { title: 'BCS Items Read', value: stats.bcsCompleted, icon: <BookOpen size={18} />, color: 'text-[#0891A3]', bg: 'bg-[#02C2D5]/10', to: '/bcs' },
    { title: 'Skills Mastered', value: stats.lmsCompleted, icon: <Briefcase size={18} />, color: 'text-purple-600', bg: 'bg-purple-100', to: '/lms' },
    { title: 'Vault Files', value: stats.vaultItems, icon: <FolderLock size={18} />, color: 'text-slate-600', bg: 'bg-slate-100', to: '/vault' }
  ];

  // --- Reusable Smart Course Component ---
  const CourseProgressItem = ({ course, isFocused = false }: { course: any, isFocused?: boolean }) => {
    const isLms = course.courseType === 'lms';
    const link = isLms ? `/lms/course/${course.id}` : `/bcs/subject/${course.id}`;
    const color = isLms ? '#9333ea' : (course.icon_color || '#02C2D5');
    const pct = course.progress_pct || 0;

    return (
      <div className={`group ${isFocused
        ? 'bg-white border border-[#E2E8F0] p-4 rounded-2xl hover:border-[#02C2D5]/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300'
        : 'py-3 border-b border-[#E2E8F0] last:border-0'}`}>
        <div className="flex justify-between items-center gap-2 mb-2.5">
          <Link
            to={link}
            className={`font-bold truncate flex-1 transition-colors ${isFocused ? 'text-sm text-[#020F33] hover:text-[#02C2D5]' : 'text-[13px] text-[#475569] hover:text-[#020F33]'}`}
          >
            {course.title || 'Untitled'}
          </Link>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${isLms ? 'text-purple-600 bg-purple-100' : 'text-[#0891A3] bg-[#02C2D5]/10'}`}>
            {isLms ? 'LMS' : 'BCS'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${isFocused ? 'h-2' : 'h-1.5'}`}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: color }}></div>
          </div>
          <span className={`font-black w-9 text-right tabular-nums ${isFocused ? 'text-xs text-[#020F33]' : 'text-[10px] text-[#94A3B8]'}`}>{pct}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col">
      <div className="p-3 md:p-6 lg:p-8 2xl:px-12 max-w-[1536px] mx-auto w-full mb-24 md:mb-10 flex-1 flex flex-col gap-5 md:gap-6">

        {/* ================= 1. HERO HEADER ================= */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#020F33] via-[#07184A] to-[#0B2160] text-white shadow-xl shadow-[#020F33]/10 border border-[#0A1945]">
          <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#02C2D5]/20 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-28 left-1/3 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl"></div>

          <div className="relative z-10 p-5 md:p-7 lg:px-9 flex flex-col gap-6">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
              {/* Greeting */}
              <div className="flex items-center gap-4 md:gap-5">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 border border-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <TimeIcon size={30} className={timeColor} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#02C2D5]">Al_Faravi OS</p>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mt-0.5">
                    {greeting}, Faravi!
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-300 font-medium">
                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg">
                      <Calendar size={13} className="text-[#02C2D5]" />
                      {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg font-bold text-white tabular-nums">
                      <Clock size={13} className="text-[#02C2D5]" />
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })} BST
                    </span>
                  </p>
                </div>
              </div>

              {/* Streak + Sign out */}
              <div className="flex items-center gap-3 w-full xl:w-auto">
                <div className="flex items-center gap-3 bg-white/10 border border-white/15 backdrop-blur px-3.5 py-2.5 rounded-2xl flex-1 xl:flex-none">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
                    <Flame size={20} className={streak > 0 ? 'animate-pulse text-amber-400' : 'text-amber-300'} />
                  </div>
                  <div className="pr-2">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Current Streak</p>
                    <p className="text-sm font-black text-white">
                      {streak > 0 ? `${streak} Days Focus 🔥` : "Let's Start! 💪"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="w-12 h-12 bg-white/10 border border-white/15 text-slate-200 hover:bg-rose-500 hover:border-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 group shrink-0"
                >
                  <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Daily quote */}
            <div className="flex items-start gap-3 pt-5 border-t border-white/10">
              <Quote size={18} className="text-[#02C2D5] shrink-0 mt-0.5" />
              <p className="text-sm md:text-[15px] font-medium leading-relaxed text-slate-200 italic">
                {dailyQuote}
              </p>
            </div>
          </div>
        </header>

        {/* ================= 2. KPI STATS ROW ================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {statCards.map((stat, i) => {
            const Inner = (
              <>
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                    {stat.icon}
                  </div>
                  {stat.to && (
                    <ArrowUpRight size={16} className="text-slate-300 group-hover:text-[#02C2D5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-black text-[#020F33] leading-none tabular-nums">{stat.value}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-2">{stat.title}</p>
                </div>
              </>
            );
            const cardCls = `${CARD} p-4 md:p-5 flex flex-col justify-between group hover:border-[#02C2D5]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`;

            return stat.to ? (
              <Link key={i} to={stat.to} className={cardCls}>{Inner}</Link>
            ) : (
              <div key={i} className={`${cardCls} cursor-default`}>{Inner}</div>
            );
          })}
        </section>

        {/* ================= 3. PINBOARD + QUICK APPS ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-stretch">

          {/* Pinboard */}
          <div className={`lg:col-span-8 ${CARD} p-5 md:p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Pin size={16} className="fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#020F33] leading-tight">Notes Board</h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    {boardNotes.length} {boardNotes.length === 1 ? 'note' : 'notes'} pinned
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={createBoardNote}
                  title="Add New Note"
                  className="h-9 px-3 rounded-xl bg-[#020F33] text-white hover:bg-[#0A1945] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Plus size={15} strokeWidth={2.5} /> <span className="hidden sm:inline">New Note</span>
                </button>
                <button
                  onClick={() => setIsEditingBoard(!isEditingBoard)}
                  title={isEditingBoard ? 'Finish Editing' : 'Edit Notes (CRUD Mode)'}
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                    isEditingBoard
                      ? 'bg-[#02C2D5]/10 text-[#0891A3] border-[#02C2D5] ring-2 ring-[#02C2D5]/20'
                      : 'bg-white text-slate-600 border-[#E2E8F0] hover:bg-slate-50'
                  }`}
                >
                  {isEditingBoard ? <Check size={15} strokeWidth={2.5} /> : <Pencil size={14} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            <div
              className="relative flex-1 min-h-[260px] rounded-2xl bg-slate-50 border border-[#E2E8F0] overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(rgba(100,116,139,0.22) 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            >
              {boardNotes.length === 0 ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-dashed border-slate-300 flex items-center justify-center mb-3 shadow-sm">
                    <StickyNote size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-[#020F33]">No notes on the board yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[260px] leading-relaxed">
                    Click <span className="font-bold text-[#020F33]">New Note</span> to pin your first note here.
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center gap-5 overflow-x-auto hide-scrollbar px-6 pt-8 pb-6">
                  {boardNotes.map((note, i) => (
                    <div
                      key={note.id}
                      className={`relative shrink-0 w-56 md:w-60 transition-all duration-300 group/note ${
                        isEditingBoard
                          ? 'rotate-0 z-20 scale-[1.02]'
                          : `${NOTE_TILTS[i % NOTE_TILTS.length]} hover:!rotate-0 hover:scale-[1.03] hover:z-30`
                      }`}
                    >
                      {/* Push pin */}
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="relative w-4 h-4 rounded-full bg-gradient-to-br from-[#FF8A8A] via-[#EF4444] to-[#991B1B] shadow-[0_3px_6px_rgba(0,0,0,0.35)] ring-1 ring-red-950/30">
                          <div className="absolute top-[2px] left-[3px] w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px]"></div>
                        </div>
                      </div>

                      {/* Paper */}
                      <div
                        className={`relative rounded-xl p-3.5 pt-5 min-h-[160px] max-h-[200px] flex flex-col justify-between overflow-hidden shadow-[0_10px_24px_rgba(15,23,42,0.14),0_2px_6px_rgba(15,23,42,0.08)] border border-black/5 transition-shadow duration-300 ${
                          isEditingBoard ? 'ring-2 ring-[#020F33]/15' : ''
                        }`}
                        style={{ backgroundColor: note.bg_color || '#FEF3C7' }}
                      >
                        <div
                          className="absolute inset-0 pointer-events-none opacity-40"
                          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(0,0,0,0.06) 23px, rgba(0,0,0,0.06) 24px)' }}
                        />

                        {/* Edit Mode Mini Toolbar */}
                        {isEditingBoard && (
                          <div className="relative z-10 flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10 text-slate-700">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onMouseDown={(e) => applyNoteFormat(e, note.id, 'bold')}
                                className="p-1 hover:bg-black/10 rounded transition"
                                title="Bold"
                              >
                                <Bold size={12} />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => applyNoteFormat(e, note.id, 'italic')}
                                className="p-1 hover:bg-black/10 rounded transition"
                                title="Italic"
                              >
                                <Italic size={12} />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {savingNoteId === note.id && (
                                <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                                  <Check size={10} /> Saved
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteBoardNote(note.id)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-black/10 rounded transition"
                                title="Delete Note"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Note Body */}
                        <div
                          id={`board-note-${note.id}`}
                          contentEditable={isEditingBoard}
                          suppressContentEditableWarning
                          onBlur={(e) => isEditingBoard && updateBoardNoteContent(note.id, e.currentTarget.innerHTML)}
                          dangerouslySetInnerHTML={{
                            __html: note.content || (isEditingBoard ? '' : '<span class="italic opacity-50">Empty note…</span>')
                          }}
                          className={`relative z-10 text-[13px] leading-relaxed text-slate-800 font-medium break-words outline-none flex-1 overflow-y-auto hide-scrollbar ${
                            isEditingBoard
                              ? "cursor-text empty:before:content-['Write_note...'] empty:before:text-slate-400"
                              : 'line-clamp-4 cursor-default'
                          }`}
                        />

                        {/* Footer: Color Picker (edit) or Date (view) */}
                        {isEditingBoard ? (
                          <div className="relative z-10 flex items-center justify-between pt-2 mt-1.5 border-t border-black/10">
                            <div className="flex items-center gap-1.5">
                              {COLOR_PALETTE.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  style={{ backgroundColor: c }}
                                  onClick={() => updateBoardNoteColor(note.id, c)}
                                  className={`w-3.5 h-3.5 rounded-full border border-black/20 transition ${
                                    note.bg_color === c ? 'scale-125 ring-1 ring-black/50' : 'hover:scale-110'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          note.created_at && (
                            <p className="relative z-10 text-right text-[9px] font-bold text-slate-600/70 mt-1">
                              {new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Apps */}
          <div className={`lg:col-span-4 ${CARD} p-5 md:p-6 flex flex-col`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#02C2D5]/10 text-[#0891A3] flex items-center justify-center">
                <LayoutGrid size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#020F33] leading-tight">Quick Apps</h3>
                <p className="text-[11px] font-medium text-slate-400">Jump to any workspace</p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 flex-1 content-start">
              {QUICK_APPS.map((app, i) => {
                const AppIcon = app.icon;
                return (
                  <Link
                    key={i}
                    to={app.to}
                    className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white hover:border-[#02C2D5]/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${app.bg} ${app.color} group-hover:scale-110 transition-transform duration-300`}>
                      <AppIcon size={20} />
                    </div>
                    <span className="text-[11px] font-bold text-[#020F33] text-center leading-tight">{app.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= 4. TASKS + STUDY PROGRESS ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start flex-1 pb-6">

          {/* Task Manager */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className={`${CARD} overflow-hidden h-[650px] lg:h-[720px] flex flex-col`}>
              <TaskManager />
            </div>
          </div>

          {/* Study Progress */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className={`${CARD} p-5 md:p-6 flex flex-col gap-5 lg:h-[720px]`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#02C2D5]/10 text-[#0891A3] flex items-center justify-center">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#020F33] leading-tight">Study Progress</h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    {activeCourses.length} active · {pendingCourses.length} pending
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-6 flex-1">

                {/* Active Learning */}
                <div>
                  <h4 className="text-[11px] font-black text-[#0891A3] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <PlayCircle size={14} /> Active Learning
                  </h4>
                  {activeCourses.length === 0 ? (
                    <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E1] p-6 rounded-2xl text-center">
                      <p className="text-xs font-bold text-[#475569]">No active courses right now.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} isFocused={true} />)}
                    </div>
                  )}
                </div>

                {/* Pending */}
                <div>
                  <h4 className="text-[11px] font-black text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2">
                    <PauseCircle size={14} /> Pending
                  </h4>
                  {pendingCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-2">No pending courses in queue.</p>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-1 rounded-2xl flex flex-col">
                      {pendingCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}