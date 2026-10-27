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
  Bold, Italic, Check
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

// Realistic tilt presets for corkboard notes
const NOTE_TILTS = ['-rotate-2', 'rotate-1', 'rotate-2', '-rotate-1', 'rotate-3', '-rotate-3'];

// Sticky Note Color Palette
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
    { title: 'Pending Tasks', value: stats.pendingTasks, icon: <Target size={16} />, color: 'text-rose-500', bg: 'bg-rose-100', to: '' },
    { title: 'BCS Items Read', value: stats.bcsCompleted, icon: <BookOpen size={16} />, color: 'text-[#02C2D5]', bg: 'bg-[#02C2D5]/10', to: '/bcs' },
    { title: 'Skills Mastered', value: stats.lmsCompleted, icon: <Briefcase size={16} />, color: 'text-purple-600', bg: 'bg-purple-100', to: '/lms' },
    { title: 'Vault Files', value: stats.vaultItems, icon: <FolderLock size={16} />, color: 'text-slate-600', bg: 'bg-slate-100', to: '/vault' }
  ];

  // --- Reusable Smart Course Component ---
  const CourseProgressItem = ({ course, isFocused = false }: { course: any, isFocused?: boolean }) => {
    const isLms = course.courseType === 'lms';
    const link = isLms ? `/lms/course/${course.id}` : `/bcs/subject/${course.id}`;
    const color = isLms ? '#9333ea' : (course.icon_color || '#02C2D5');
    
    return (
      <div className={`group ${isFocused ? 'bg-white border-2 border-[#02C2D5]/30 shadow-md p-4 rounded-2xl hover:border-[#02C2D5] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5' : 'py-3 border-b border-[#E2E8F0] last:border-0'}`}>
        <div className="flex justify-between items-end mb-2">
          <Link to={link} className={`font-bold truncate pr-2 flex-1 transition-colors ${isFocused ? 'text-base text-[#020F33] hover:text-[#02C2D5]' : 'text-sm text-[#475569] hover:text-[#020F33]'}`}>
            {course.title || 'Untitled'}
          </Link>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${isLms ? 'text-purple-600 bg-purple-100' : 'text-[#02C2D5] bg-[#02C2D5]/10'}`}>
            {isLms ? 'LMS' : 'BCS'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-full bg-[#F8FAFC] rounded-full overflow-hidden ${isFocused ? 'h-2 border border-[#E2E8F0]' : 'h-1.5'}`}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${course.progress_pct || 0}%`, backgroundColor: color }}></div>
          </div>
          <span className={`font-black w-8 text-right ${isFocused ? 'text-xs text-[#02C2D5]' : 'text-[10px] text-[#94A3B8]'}`}>{course.progress_pct || 0}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="p-3 md:p-6 lg:p-8 2xl:px-12 max-w-[1536px] mx-auto w-full mb-24 md:mb-10 flex-1 flex flex-col">
        
        {/* --- 1. Top Header Section --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 md:mb-8 bg-white/90 backdrop-blur-xl p-5 md:p-6 lg:px-8 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner shrink-0">
              {timeIcon}
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-[#020F33] leading-tight">
                {greeting}, Faravi!
              </h1>
              <p className="text-[#475569] font-medium mt-1 md:mt-1.5 flex flex-wrap items-center gap-2 text-xs md:text-sm">
                <Clock size={14} className="text-[#02C2D5]" />
                {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                <span className="hidden md:inline text-slate-300">•</span>
                <span className="font-bold text-[#020F33] bg-[#02C2D5]/10 border border-[#02C2D5]/20 px-2 py-0.5 rounded-md">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })} BST
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between w-full xl:w-auto gap-3 md:gap-4">
            {/* Dynamic Gamification Streak Widget */}
            <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 md:p-3 rounded-2xl flex-1 xl:flex-none shadow-sm">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Flame size={20} className={streak > 0 ? "animate-pulse text-amber-500" : "text-amber-400"} />
              </div>
              <div className="pr-2">
                <p className="text-[10px] md:text-xs font-bold text-[#475569] uppercase tracking-wider">Current Streak</p>
                <p className="text-sm font-black text-[#020F33]">
                  {streak > 0 ? `${streak} Days Focus 🔥` : "Let's Start! 💪"}
                </p>
              </div>
            </div>

            {/* Sign Out Button */}
            <button 
              onClick={handleSignOut} 
              title="Sign Out"
              className="w-12 h-12 xl:w-14 xl:h-14 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border border-rose-100 group shrink-0"
            >
              <LogOut size={22} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* --- 2. Snapshot Row: Compact Stats (Left) + Interactive Corkboard (Right) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 mb-6 md:mb-8 items-stretch">
          
          {/* LEFT: Compact Stats Box */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-5 md:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={14} className="text-[#02C2D5]" /> Today's Snapshot
              </h3>
              <span className="text-[9px] font-black text-[#02C2D5] bg-[#02C2D5]/10 border border-[#02C2D5]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">Live</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 flex-1">
              {statCards.map((stat, i) => {
                const Inner = (
                  <>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-black text-[#020F33] leading-none tabular-nums">{stat.value}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 leading-tight">{stat.title}</p>
                    </div>
                  </>
                );
                const cardCls = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 flex flex-col justify-between group hover:border-[#02C2D5]/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300";
                
                return stat.to ? (
                  <Link key={i} to={stat.to} className={cardCls}>{Inner}</Link>
                ) : (
                  <div key={i} className={`${cardCls} cursor-default`}>{Inner}</div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Interactive Corkboard with Direct CRUD (+ and Pencil Icons) */}
          <div className="lg:col-span-8">
            <div className="h-full rounded-3xl p-2 md:p-2.5 bg-gradient-to-br from-[#A07B4F] via-[#8B6B42] to-[#6F5433] shadow-lg shadow-amber-900/20">
              <div 
                className="relative rounded-2xl h-full min-h-[250px] overflow-hidden bg-[#DCC49A] shadow-[inset_0_2px_16px_rgba(0,0,0,0.25)]"
                style={{
                  backgroundImage: `
                    radial-gradient(rgba(101, 71, 33, 0.22) 1.2px, transparent 1.2px),
                    radial-gradient(rgba(101, 71, 33, 0.13) 1.2px, transparent 1.2px)
                  `,
                  backgroundSize: '12px 12px, 12px 12px',
                  backgroundPosition: '0 0, 6px 6px'
                }}
              >
                {/* Board Label Tag (Top Left) */}
                <div className="absolute top-3 left-4 z-20 -rotate-2 pointer-events-none">
                  <div className="relative bg-white/95 px-3 py-1.5 rounded-md shadow-md border border-black/5">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 shadow-sm ring-1 ring-black/20"></div>
                    <p className="text-[9px] md:text-[10px] font-black text-[#020F33] uppercase tracking-widest flex items-center gap-1.5">
                      <Pin size={11} className="text-red-500 fill-current" /> Notes Board
                    </p>
                  </div>
                </div>

                {/* Corner Action Controls: + (Add Note) & Pencil (Toggle CRUD Mode) */}
                <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
                  <button
                    onClick={createBoardNote}
                    title="Add New Note"
                    className="w-8 h-8 rounded-xl bg-white/90 hover:bg-white text-[#020F33] hover:text-[#02C2D5] shadow-md border border-black/10 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setIsEditingBoard(!isEditingBoard)}
                    title={isEditingBoard ? "Finish Editing" : "Edit Notes (CRUD Mode)"}
                    className={`w-8 h-8 rounded-xl shadow-md border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                      isEditingBoard 
                        ? 'bg-[#020F33] text-[#02C2D5] border-[#02C2D5] ring-2 ring-[#02C2D5]/40' 
                        : 'bg-white/90 hover:bg-white text-slate-700 border-black/10'
                    }`}
                  >
                    <Pencil size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {boardNotes.length === 0 ? (
                  /* Empty Corkboard State */
                  <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center px-6">
                    <div className="relative w-20 h-20 mb-3">
                      <div className="absolute inset-0 border-2 border-dashed border-[#8B6B42]/40 rounded-lg rotate-3 bg-white/30"></div>
                      <StickyNote size={30} className="absolute inset-0 m-auto text-[#8B6B42]/60" />
                    </div>
                    <p className="text-sm font-black text-[#5C4526]">No notes on the board yet!</p>
                    <p className="text-xs text-[#8B6B42] mt-1 max-w-[240px] leading-relaxed">
                      Click the <span className="font-bold text-[#020F33]">+</span> button in the top-right corner to pin a new note right here.
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex items-center gap-5 md:gap-7 overflow-x-auto hide-scrollbar px-5 md:px-8 pt-14 pb-6">
                    {boardNotes.map((note, i) => (
                      <div
                        key={note.id}
                        className={`relative shrink-0 w-56 md:w-64 transition-all duration-300 group/note ${
                          isEditingBoard 
                            ? 'rotate-0 z-20 scale-[1.02]' 
                            : `${NOTE_TILTS[i % NOTE_TILTS.length]} hover:!rotate-0 hover:scale-[1.04] hover:z-30`
                        }`}
                      >
                        {/* === Realistic Push Pin Assembly === */}
                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-11 h-3.5 bg-black/20 blur-[3px] rounded-[50%] z-10 pointer-events-none"></div>
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                          <div className="relative w-5 h-5 rounded-full bg-gradient-to-br from-[#FF8A8A] via-[#EF4444] to-[#991B1B] shadow-[0_3px_6px_rgba(0,0,0,0.4)] ring-1 ring-red-950/40">
                            <div className="absolute top-[3px] left-[4px] w-1.5 h-1.5 rounded-full bg-white/90 blur-[0.5px]"></div>
                            <div className="absolute bottom-[2px] right-[3px] w-2.5 h-1.5 rounded-full bg-red-950/30 blur-[1px]"></div>
                          </div>
                          <div className="absolute top-[19px] left-1/2 -translate-x-1/2 w-2 h-1 bg-black/40 rounded-full blur-[0.5px]"></div>
                        </div>

                        {/* === Paper Note === */}
                        <div
                          className={`relative rounded-lg p-3.5 pt-5 min-h-[155px] max-h-[195px] flex flex-col justify-between overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.30),0_2px_6px_rgba(0,0,0,0.18)] transition-shadow duration-300 ${
                            isEditingBoard ? 'ring-2 ring-[#020F33]/20' : ''
                          }`}
                          style={{ backgroundColor: note.bg_color || '#FEF3C7' }}
                        >
                          {/* Lined paper texture */}
                          <div
                            className="absolute inset-0 pointer-events-none opacity-40"
                            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(0,0,0,0.07) 23px, rgba(0,0,0,0.07) 24px)' }}
                          />
                          <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
                          
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

                          {/* Note Body (Editable in CRUD mode, Clean Read-Only in Normal mode) */}
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
                                ? 'cursor-text empty:before:content-[\'Write_note...\'] empty:before:text-slate-400' 
                                : 'line-clamp-4 cursor-default'
                            }`}
                          />
                          
                          {/* Bottom Footer: Color Picker in Edit Mode OR Date Stamp in Normal Mode */}
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
                          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. Main Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 pb-10">
          
          {/* Left Column: Task Manager Only (Bottom StickyNotes Box Removed) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm h-[650px] lg:h-[720px] flex flex-col">
              <TaskManager />
            </div>
          </div>

          {/* Right Sidebar: Apps, Motivation & Clean Study Progress */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 md:gap-6">
            
            {/* Quick Access Menu */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 md:p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#020F33] mb-5 flex items-center gap-2">
                <TrendingUp className="text-[#02C2D5]" size={20} /> Quick Apps
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                {[
                  { name: 'BCS Prep', to: '/bcs', icon: <BookOpen size={24} className="text-[#02C2D5]" />, hover: 'hover:border-[#02C2D5] hover:bg-[#02C2D5]/5' },
                  { name: 'LMS Skill', to: '/lms', icon: <Briefcase size={24} className="text-purple-600" />, hover: 'hover:border-purple-400 hover:bg-purple-50' },
                  { name: 'Finance', to: '/finance', icon: <TrendingUp size={24} className="text-emerald-500" />, hover: 'hover:border-emerald-400 hover:bg-emerald-50' },
                  { name: 'Vault', to: '/vault', icon: <FolderLock size={24} className="text-slate-600" />, hover: 'hover:border-slate-400 hover:bg-slate-50' },
                  { name: 'Dev Hub', to: '/github', icon: <GitBranch size={24} className="text-slate-900" />, hover: 'hover:border-slate-900 hover:bg-slate-100' },
                  { name: 'Snippets', to: '/snippets', icon: <Code2 size={24} className="text-indigo-600" />, hover: 'hover:border-indigo-400 hover:bg-indigo-50' },
                  { name: 'Job Tracker', to: '/jobs', icon: <Briefcase size={24} className="text-emerald-600" />, hover: 'hover:border-emerald-400 hover:bg-emerald-50' }
                ].map((app: any, i) => (
                  <Link 
                    key={i} 
                    to={app.to} 
                    className={`p-3 md:p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] transition-all duration-300 flex flex-col items-center justify-center gap-2 group ${app.hover}`}
                  >
                    <div className="group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">{app.icon}</div>
                    <span className="text-[10px] md:text-xs font-bold text-[#020F33] text-center">{app.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Dynamic Motivation Widget */}
            <div className="bg-gradient-to-br from-[#020F33] to-[#0A1945] p-6 md:p-8 rounded-3xl text-white shadow-lg relative overflow-hidden group border border-[#0A1945]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#02C2D5] opacity-10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity duration-500"></div>
              <Sparkles className="absolute top-4 right-4 text-[#02C2D5] opacity-20 group-hover:opacity-100 transition-opacity duration-500" size={30} />
              <Quote className="text-[#02C2D5] mb-4 opacity-80" size={28} />
              <p className="text-sm md:text-base font-medium leading-relaxed mb-5 relative z-10 text-slate-200">
                "{dailyQuote}"
              </p>
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#02C2D5]/50 to-transparent"></div>
                <p className="text-[10px] md:text-xs font-black text-[#02C2D5] tracking-widest uppercase">Al_Faravi OS Mindset</p>
              </div>
            </div>
            
            {/* Clean Study Progress Widget (Only Active Learning & Pending) */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-5 flex-1">
              <h3 className="text-lg font-bold text-[#020F33] flex items-center gap-2">
                <Target className="text-[#02C2D5]" size={20} /> Study Progress
              </h3>
              
              <div className="overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-6">
                
                {/* 1. FOCUS BOX: Active Learning */}
                <div>
                  <h4 className="text-xs font-black text-[#02C2D5] uppercase tracking-wider mb-3 flex items-center gap-1.5">
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

                {/* 2. SECONDARY BOX: Pending Courses */}
                <div>
                  <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2">
                    <PauseCircle size={14} /> Pending
                  </h4>
                  {pendingCourses.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-2">No pending courses in queue.</p>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col">
                      {pendingCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}