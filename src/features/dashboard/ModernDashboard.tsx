import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TaskManager from './TaskManager';
import {
  Sun, Moon, Sunrise, BookOpen, Target,
  Briefcase, FolderLock, TrendingUp,
  Clock, Flame, Quote, Sparkles, PlayCircle,
  PauseCircle, LogOut, GitBranch, Code2,
  StickyNote, Plus, Pencil, Trash2,
  Bold, Italic, Check, LayoutGrid, ArrowUpRight
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

// Subtle tilt presets — keeps a hint of character without the clutter
const NOTE_TILTS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[0.75deg]', '-rotate-[1.25deg]', 'rotate-[0.5deg]'];

// Sticky Note Color Palette (values tied to DB — do not change)
const COLOR_PALETTE = [
  '#FEF3C7', // Warm Yellow
  '#FCE7F3', // Soft Pink
  '#DCFCE7', // Mint Green
  '#E0E7FF', // Indigo Mist
  '#FFEDD5', // Soft Orange
  '#CFFAFE', // Sky Cyan
];

export default function ModernDashboard() {
  const navigate = useNavigate();

  // --- UI & Time States ---
  const [greeting, setGreeting] = useState('Welcome Back');
  const [timeIcon, setTimeIcon] = useState(<Sun size={24} className="text-amber-500" />);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Gamification States ---
  const [streak, setStreak] = useState(0);
  const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);

  // --- Data States ---
  const [stats, setStats] = useState({ pendingTasks: 0, bcsCompleted: 0, lmsCompleted: 0, vaultItems: 0 });
  const [allCourses, setAllCourses] = useState<any[]>([]);

  // --- Corkboard Notes & CRUD States ---
  const [boardNotes, setBoardNotes] = useState<any[]>([]);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

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

  // === Corkboard CRUD Handlers ===
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
        setBoardNotes([data, ...boardNotes]);
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
    // 1. Clock & Greeting Engine
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning');
        setTimeIcon(<Sunrise size={32} className="text-amber-500" />);
      } else if (hour >= 12 && hour < 18) {
        setGreeting('Good Afternoon');
        setTimeIcon(<Sun size={32} className="text-amber-500" />);
      } else {
        setGreeting('Good Evening');
        setTimeIcon(<Moon size={32} className="text-indigo-400" />);
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);

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

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
        ...(bcsProg || []).map((c: any) => ({ ...c, courseType: 'bcs' })),
        ...(lmsProg || []).map((c: any) => ({ ...c, courseType: 'lms' }))
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
  const activeCourses = allCourses.filter((c: any) => c.status === 'active');
  const pendingCourses = allCourses.filter((c: any) => c.status === 'pending');

  // --- Stat Cards Config ---
  const statCards = [
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: <Target size={17} />, tint: 'bg-rose-50 text-rose-500 border-rose-100', to: '' },
    { title: 'BCS Items Read', value: stats.bcsCompleted, icon: <BookOpen size={17} />, tint: 'bg-[#02C2D5]/10 text-[#02C2D5] border-[#02C2D5]/20', to: '/bcs' },
    { title: 'Skills Mastered', value: stats.lmsCompleted, icon: <Briefcase size={17} />, tint: 'bg-purple-50 text-purple-600 border-purple-100', to: '/lms' },
    { title: 'Vault Files', value: stats.vaultItems, icon: <FolderLock size={17} />, tint: 'bg-slate-100 text-slate-600 border-slate-200', to: '/vault' }
  ];

  // --- Quick Apps Config ---
  const quickApps = [
    { name: 'BCS Prep', to: '/bcs', icon: <BookOpen size={18} />, tint: 'text-[#02C2D5] bg-[#02C2D5]/10 border-[#02C2D5]/15', hover: 'hover:border-[#02C2D5]/60' },
    { name: 'LMS Skill', to: '/lms', icon: <Briefcase size={18} />, tint: 'text-purple-600 bg-purple-50 border-purple-100', hover: 'hover:border-purple-400' },
    { name: 'Finance', to: '/finance', icon: <TrendingUp size={18} />, tint: 'text-emerald-600 bg-emerald-50 border-emerald-100', hover: 'hover:border-emerald-400' },
    { name: 'Vault', to: '/vault', icon: <FolderLock size={18} />, tint: 'text-slate-600 bg-slate-100 border-slate-200', hover: 'hover:border-slate-400' },
    { name: 'Dev Hub', to: '/github', icon: <GitBranch size={18} />, tint: 'text-slate-900 bg-slate-100 border-slate-200', hover: 'hover:border-slate-900' },
    { name: 'Snippets', to: '/snippets', icon: <Code2 size={18} />, tint: 'text-indigo-600 bg-indigo-50 border-indigo-100', hover: 'hover:border-indigo-400' },
    { name: 'Job Tracker', to: '/jobs', icon: <Briefcase size={18} />, tint: 'text-emerald-600 bg-emerald-50 border-emerald-100', hover: 'hover:border-emerald-400' }
  ];

  // --- Reusable Smart Course Component ---
  const CourseProgressItem = ({ course, isFocused = false }: { course: any, isFocused?: boolean }) => {
    const isLms = course.courseType === 'lms';
    const link = isLms ? `/lms/course/${course.id}` : `/bcs/subject/${course.id}`;
    const color = isLms ? '#9333ea' : (course.icon_color || '#02C2D5');

    return (
      <div className={`group ${isFocused
        ? 'p-4 rounded-2xl border-2 border-[#02C2D5]/20 bg-gradient-to-br from-white to-[#02C2D5]/[0.05] hover:border-[#02C2D5]/70 hover:shadow-md hover:shadow-[#02C2D5]/10 hover:-translate-y-0.5 transition-all duration-300'
        : 'py-2.5 border-b border-[#EDF1F7] last:border-0'}`}>
        <div className="flex justify-between items-end mb-2 gap-2">
          <Link to={link} className={`font-bold truncate flex-1 transition-colors ${isFocused ? 'text-[15px] text-[#0A1229] hover:text-[#02C2D5]' : 'text-[13px] text-[#475569] hover:text-[#0A1229]'}`}>
            {course.title || 'Untitled'}
          </Link>
          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 ${isLms ? 'text-purple-600 bg-purple-100' : 'text-[#00A9BC] bg-[#02C2D5]/10'}`}>
            {isLms ? 'LMS' : 'BCS'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-full bg-[#EDF1F8] rounded-full overflow-hidden ${isFocused ? 'h-2' : 'h-1.5'}`}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${course.progress_pct || 0}%`, backgroundColor: color }}></div>
          </div>
          <span className={`font-black text-right tabular-nums shrink-0 ${isFocused ? 'text-xs text-[#02C2D5] w-9' : 'text-[10px] text-[#94A3B8] w-8'}`}>{course.progress_pct || 0}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F5FA] flex flex-col">
      <div className="p-3 md:p-6 lg:p-8 2xl:px-12 max-w-[1536px] mx-auto w-full mb-24 md:mb-10 flex-1 flex flex-col">

        {/* ============================================================= */}
        {/* 1. HERO COMMAND BAR — dark navy, blueprint grid, glow accents */}
        {/* ============================================================= */}
        <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#040A22] via-[#081231] to-[#0C1C4A] p-6 md:p-8 pb-16 md:pb-20 shadow-xl shadow-slate-900/10 border border-[#0B1533]">
          {/* Blueprint grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
              backgroundSize: '38px 38px'
            }}
          />
          {/* Glow orbs */}
          <div className="absolute -top-28 -right-14 w-80 h-80 rounded-full bg-[#02C2D5]/25 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-500/25 blur-[110px] pointer-events-none" />

          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5 xl:gap-8">
            {/* Greeting block */}
            <div className="flex items-center gap-4 md:gap-5 min-w-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
                {timeIcon}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.28em] text-[#02C2D5]/90 mb-1">
                  Al_Faravi OS — Command Center
                </p>
                <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight text-white leading-tight">
                  {greeting}, Faravi!
                </h1>
                <p className="text-slate-400 font-medium mt-1.5 flex flex-wrap items-center gap-2 text-xs md:text-[13px]">
                  <Clock size={14} className="text-[#02C2D5]" />
                  {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="hidden md:inline text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-white bg-white/[0.08] border border-white/10 px-2 py-0.5 rounded-md tabular-nums">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })} BST
                  </span>
                </p>
              </div>
            </div>

            {/* Streak + Sign Out */}
            <div className="flex items-center justify-between xl:justify-end gap-3 md:gap-4 shrink-0">
              {/* Gamification Streak Widget */}
              <div className="flex items-center gap-3 bg-white/[0.07] backdrop-blur-sm border border-white/10 p-2.5 md:p-3 rounded-2xl flex-1 xl:flex-none">
                <div className="w-10 h-10 bg-amber-400/10 border border-amber-300/20 rounded-xl flex items-center justify-center shrink-0">
                  <Flame size={20} className={streak > 0 ? 'animate-pulse text-amber-400' : 'text-amber-400/40'} />
                </div>
                <div className="pr-1">
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Current Streak</p>
                  <p className="text-sm font-black text-white leading-tight">
                    {streak > 0 ? `${streak} Day${streak === 1 ? '' : 's'} Streak` : 'Start Today'}
                  </p>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="w-11 h-11 md:w-12 md:h-12 bg-white/[0.07] text-slate-300 border border-white/10 hover:bg-rose-500 hover:text-white hover:border-rose-400 rounded-2xl flex items-center justify-center transition-all duration-300 group shrink-0"
              >
                <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 2. SNAPSHOT ROW — 4 stat cards overlapping the hero           */}
        {/* ============================================================= */}
        <section className="relative z-10 -mt-9 md:-mt-11 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((stat, i) => {
            const Inner = (
              <>
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.tint}`}>
                    {stat.icon}
                  </div>
                  {stat.to ? (
                    <ArrowUpRight size={16} className="text-slate-300 group-hover:text-[#02C2D5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                  ) : (
                    <span className="relative flex h-2 w-2 mt-1.5 mr-1" title="Updates live">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                    </span>
                  )}
                </div>
                <p className="text-2xl md:text-[26px] font-black text-[#0A1229] leading-none tabular-nums">{stat.value}</p>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 leading-tight">{stat.title}</p>
              </>
            );
            const cardCls = "group bg-white border border-[#E2E8F0] rounded-2xl p-4 md:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)] hover:-translate-y-0.5 hover:border-[#02C2D5]/40 transition-all duration-300";

            return stat.to ? (
              <Link key={i} to={stat.to} className={cardCls}>{Inner}</Link>
            ) : (
              <div key={i} className={`${cardCls} cursor-default`}>{Inner}</div>
            );
          })}
        </section>

        {/* ============================================================= */}
        {/* 3. QUICK NOTES — clean dot-grid canvas, full CRUD intact      */}
        {/* ============================================================= */}
        <section className="mt-6 md:mt-8 bg-white rounded-[26px] border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-4 border-b border-[#EDF1F7]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#02C2D5]/10 border border-[#02C2D5]/20 text-[#02C2D5] flex items-center justify-center shrink-0">
                <StickyNote size={16} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0A1229] tracking-tight leading-none">Quick Notes</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  {boardNotes.length} {boardNotes.length === 1 ? 'Note' : 'Notes'} Pinned
                </p>
              </div>
              {isEditingBoard && (
                <span className="text-[9px] font-black uppercase tracking-wider text-[#02C2D5] bg-[#02C2D5]/10 border border-[#02C2D5]/25 px-2 py-0.5 rounded-md">
                  Edit Mode
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={createBoardNote}
                title="Add New Note"
                className="h-9 px-3.5 rounded-xl bg-[#0A1229] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#02C2D5] transition-colors shadow-sm active:scale-95"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">New Note</span>
              </button>
              <button
                onClick={() => setIsEditingBoard(!isEditingBoard)}
                title={isEditingBoard ? "Finish Editing" : "Edit Notes (CRUD Mode)"}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  isEditingBoard
                    ? 'bg-[#02C2D5] border-[#02C2D5] text-white shadow-sm shadow-[#02C2D5]/30'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#02C2D5]/50 hover:text-[#02C2D5]'
                }`}
              >
                {isEditingBoard ? <Check size={15} strokeWidth={2.5} /> : <Pencil size={14} strokeWidth={2.5} />}
                {isEditingBoard ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>

          {/* Dot-grid canvas */}
          <div
            className="relative bg-[#F6F8FC] min-h-[250px] max-h-[400px] overflow-y-auto hide-scrollbar p-4 md:p-6"
            style={{
              backgroundImage: 'radial-gradient(circle, #C7D2E4 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {boardNotes.length === 0 ? (
              /* Empty state */
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6">
                <div className="relative w-16 h-16 mb-3">
                  <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-xl rotate-3 bg-white" />
                  <StickyNote size={26} className="absolute inset-0 m-auto text-slate-400" />
                </div>
                <p className="text-sm font-black text-[#334155]">No notes on the board yet!</p>
                <p className="text-xs text-slate-400 font-medium mt-1 max-w-[260px] leading-relaxed">
                  Click <span className="font-bold text-[#02C2D5]">New Note</span> to pin your first note right here.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 md:gap-5 items-start">
                {boardNotes.map((note, i) => (
                  <div
                    key={note.id}
                    className={`relative w-full sm:w-[224px] group/note transition-all duration-300 ${
                      isEditingBoard
                        ? 'rotate-0 z-20'
                        : `${NOTE_TILTS[i % NOTE_TILTS.length]} hover:!rotate-0 hover:z-30`
                    }`}
                  >
                    {/* Push pin */}
                    <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700 shadow-[0_2px_5px_rgba(0,0,0,0.3)] ring-1 ring-rose-900/20" />
                    </div>

                    {/* Paper card */}
                    <div
                      className={`relative rounded-xl p-3.5 pt-5 min-h-[158px] max-h-[212px] flex flex-col justify-between overflow-hidden shadow-[0_6px_16px_rgba(15,23,42,0.10),0_1px_3px_rgba(15,23,42,0.08)] group-hover/note:shadow-[0_16px_30px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.10)] transition-shadow duration-300 ${
                        isEditingBoard ? 'ring-2 ring-[#02C2D5]/30' : ''
                      }`}
                      style={{ backgroundColor: note.bg_color || '#FEF3C7' }}
                    >
                      {/* Lined paper texture */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-40"
                        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(0,0,0,0.06) 23px, rgba(0,0,0,0.06) 24px)' }}
                      />
                      <div className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />

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

                      {/* Note Body (editable in CRUD mode, clean read-only otherwise) */}
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
                            ? "cursor-text empty:before:content-['Write_a_note...'] empty:before:text-slate-400"
                            : 'line-clamp-4 cursor-default'
                        }`}
                      />

                      {/* Footer: color palette in edit mode / date stamp otherwise */}
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

                      {/* Bottom paper edge */}
                      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-t from-black/[0.07] to-transparent pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================= */}
        {/* 4. MAIN CONTENT GRID — Task Manager + Sidebar                 */}
        {/* ============================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 mt-6 md:mt-8 items-start flex-1 pb-4">

          {/* LEFT: Task Manager */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <div className="bg-white rounded-[26px] border border-[#E2E8F0] overflow-hidden shadow-sm h-[650px] lg:h-[720px] flex flex-col">
              <TaskManager />
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 md:gap-6">

            {/* Quick Access Menu */}
            <div className="bg-white border border-[#E2E8F0] rounded-[26px] p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-extrabold text-[#0A1229] tracking-tight flex items-center gap-2">
                  <LayoutGrid size={18} className="text-[#02C2D5]" /> Quick Apps
                </h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{quickApps.length} Modules</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 md:gap-3">
                {quickApps.map((app, i) => (
                  <Link
                    key={i}
                    to={app.to}
                    className={`group p-3 md:p-3.5 rounded-2xl bg-[#F7F9FC] border border-[#E9EDF4] transition-all duration-300 flex flex-col items-center justify-center gap-2 hover:bg-white hover:shadow-md hover:-translate-y-0.5 ${app.hover}`}
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center bg-white shadow-sm group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300 ${app.tint}`}>
                      {app.icon}
                    </div>
                    <span className="text-[10px] md:text-[11px] font-bold text-[#334155] text-center leading-tight">{app.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Dynamic Motivation Widget */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#020F33] to-[#0A1945] p-6 md:p-7 rounded-[26px] text-white shadow-lg border border-[#0A1945] group">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#02C2D5]/15 rounded-full blur-[70px] group-hover:bg-[#02C2D5]/25 transition-colors duration-500 pointer-events-none" />
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />
              <Sparkles className="absolute top-5 right-5 text-[#02C2D5] opacity-25 group-hover:opacity-90 transition-opacity duration-500" size={26} />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                  <Quote className="text-[#02C2D5]" size={18} />
                </div>
                <p className="text-sm md:text-[15px] font-medium leading-relaxed mb-5 text-slate-200">
                  "{dailyQuote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-[#02C2D5]/60 to-transparent"></div>
                  <p className="text-[9px] md:text-[10px] font-black text-[#02C2D5] tracking-[0.2em] uppercase whitespace-nowrap">Al_Faravi OS Mindset</p>
                </div>
              </div>
            </div>

            {/* Clean Study Progress Widget (Only Active Learning & Pending) */}
            <div className="bg-white border border-[#E2E8F0] rounded-[26px] p-5 md:p-6 shadow-sm flex flex-col gap-5 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#0A1229] tracking-tight flex items-center gap-2">
                  <Target size={18} className="text-[#02C2D5]" /> Study Progress
                </h3>
                <span className="text-[9px] font-black text-[#02C2D5] bg-[#02C2D5]/10 border border-[#02C2D5]/25 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  {activeCourses.length} Active
                </span>
              </div>

              <div className="overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-6">

                {/* 1. FOCUS BOX: Active Learning */}
                <div>
                  <h4 className="text-[10px] font-black text-[#02C2D5] uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
                    <PlayCircle size={13} /> Active Learning
                  </h4>
                  {activeCourses.length === 0 ? (
                    <div className="bg-[#F7F9FC] border border-dashed border-[#CBD5E1] p-5 rounded-2xl text-center">
                      <p className="text-xs font-bold text-[#475569]">No active courses right now.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} isFocused={true} />)}
                    </div>
                  )}
                </div>

                {/* 2. SECONDARY BOX: Pending Courses */}
                <div>
                  <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5 border-b border-[#EDF1F7] pb-2">
                    <PauseCircle size={13} /> Pending Queue
                  </h4>
                  {pendingCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-1">No pending courses in queue.</p>
                  ) : (
                    <div className="bg-[#F7F9FC] border border-[#E9EDF4] p-3.5 rounded-2xl flex flex-col">
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
