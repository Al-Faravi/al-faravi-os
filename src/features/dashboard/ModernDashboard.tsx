import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TaskManager from './TaskManager';
import { StickyNotes } from '../../components/dashboard/StickyNotes';
import { 
  Sun, Moon, Sunrise, BookOpen, Target, 
  Briefcase, FolderLock, TrendingUp, 
  Clock, Flame, Quote, Sparkles, PlayCircle, 
  Bookmark, CheckCircle2, PauseCircle, LogOut,
  GitBranch, Code2, Pin 
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
  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now);
      const hour = now.getHours();
      
      if (hour >= 5 && hour < 12) { 
        setGreeting('Good Morning'); 
        setTimeIcon(<Sunrise size={28} className="text-amber-500" />); 
      } else if (hour >= 12 && hour < 18) { 
        setGreeting('Good Afternoon'); 
        setTimeIcon(<Sun size={28} className="text-amber-500" />); 
      } else { 
        setGreeting('Good Evening'); 
        setTimeIcon(<Moon size={28} className="text-indigo-400" />); 
      }
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000);
    setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    fetchStatsAndStreak();
    
    // Pinned Notes Fetch এবং Real-time Listener
    fetchPinnedNotes();
    window.addEventListener('notes_updated', fetchPinnedNotes);

    return () => {
      clearInterval(timer);
      window.removeEventListener('notes_updated', fetchPinnedNotes);
    };
  }, []);

  // --- Fetch Pinned Notes ---
  const fetchPinnedNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });
        
      if (data) setPinnedNotes(data);
    } catch (error) {
      console.error("Error fetching pinned notes:", error);
    }
  };

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
        if (lastActive === yesterday) newStreak += 1;
        else newStreak = 1;
        
        await supabase.auth.updateUser({
          data: { last_active_date: today, streak_count: newStreak }
        });
      }
      setStreak(newStreak);

      const [tasksRes, bcsRes, lmsRes, vaultRes] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', false),
        supabase.from('bcs_resources').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true),
        supabase.from('lms_contents').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_completed', true),
        supabase.from('vault_files').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      setStats({
        pendingTasks: tasksRes.count || 0,
        bcsCompleted: bcsRes.count || 0,
        lmsCompleted: lmsRes.count || 0,
        vaultItems: vaultRes.count || 0
      });

      const { data: bcsProg } = await supabase.from('bcs_subjects').select('id, title, status, progress_pct, icon_color');
      const { data: lmsProg } = await supabase.from('lms_courses').select('id, title, status, progress_pct');

      setAllCourses([
        ...(bcsProg || []).map(c => ({ ...c, courseType: 'bcs' })),
        ...(lmsProg || []).map(c => ({ ...c, courseType: 'lms' }))
      ]);

    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  // --- Course Grouping ---
  const activeCourses = allCourses.filter(c => c.status === 'active');
  const pendingCourses = allCourses.filter(c => c.status === 'pending');
  const watchLaterCourses = allCourses.filter(c => c.status === 'watch_later');
  const completedCourses = allCourses.filter(c => c.status === 'completed');

  // --- Reusable Smart Course Component ---
  const CourseProgressItem = ({ course, isFocused = false }: { course: any, isFocused?: boolean }) => {
    const isLms = course.courseType === 'lms';
    const link = isLms ? `/lms/${course.id}` : `/bcs/${course.id}`;
    const color = isLms ? '#9333ea' : (course.icon_color || '#02C2D5');
    
    return (
      <div className={`group transition-all duration-300 ${isFocused ? 'bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5' : 'py-3 border-b border-slate-100 last:border-0'}`}>
        <div className="flex justify-between items-end mb-2">
          <Link to={link} className={`font-semibold truncate pr-2 flex-1 transition-colors ${isFocused ? 'text-base text-slate-900 hover:text-[#02C2D5]' : 'text-sm text-slate-600 hover:text-slate-900'}`}>
            {course.title}
          </Link>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ${isLms ? 'text-purple-600 bg-purple-50' : 'text-[#02C2D5] bg-[#02C2D5]/5'}`}>
            {isLms ? 'LMS' : 'BCS'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${isFocused ? 'h-2' : 'h-1.5'}`}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${course.progress_pct || 0}%`, backgroundColor: color }}></div>
          </div>
          <span className={`font-bold w-10 text-right ${isFocused ? 'text-xs text-slate-800' : 'text-[10px] text-slate-400'}`}>{course.progress_pct || 0}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative">
      {/* Soft Ambient Background Pattern */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-100/50 to-transparent pointer-events-none"></div>

      <div className="relative p-4 md:p-6 lg:p-8 2xl:px-12 max-w-[1536px] mx-auto w-full mb-24 md:mb-10 flex-1 flex flex-col">
        
        {/* --- 1. Top Header Section --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 md:mb-8 bg-white/80 backdrop-blur-xl p-5 md:p-6 lg:px-8 rounded-3xl border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-4 md:gap-5 w-full xl:w-auto">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
              {timeIcon}
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {greeting}, Faravi!
              </h1>
              <p className="text-slate-500 font-medium mt-1.5 flex flex-wrap items-center gap-2 text-xs md:text-sm">
                <Clock size={14} className="text-[#02C2D5]" />
                {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                <span className="hidden md:inline text-slate-300">•</span>
                <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })} BST
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between w-full xl:w-auto gap-3 md:gap-4">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/50 p-2.5 md:p-3 rounded-2xl flex-1 xl:flex-none">
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                <Flame size={20} className={streak > 0 ? "animate-pulse drop-shadow-sm" : ""} />
              </div>
              <div className="pr-2">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Current Streak</p>
                <p className="text-sm font-bold text-slate-800">
                  {streak > 0 ? `${streak} Days Focus 🔥` : "Let's Start! 💪"}
                </p>
              </div>
            </div>

            <button 
              onClick={handleSignOut} 
              title="Sign Out"
              className="w-12 h-12 xl:w-14 xl:h-14 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border border-rose-100 group shrink-0"
            >
              <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* --- 2. Compact Live Stats Grid --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Pending Tasks', value: stats.pendingTasks, color: 'text-rose-500', accent: 'bg-rose-50' },
            { title: 'BCS Items Read', value: stats.bcsCompleted, color: 'text-[#02C2D5]', accent: 'bg-[#02C2D5]/5' },
            { title: 'Skills Mastered', value: stats.lmsCompleted, color: 'text-purple-600', accent: 'bg-purple-50' },
            { title: 'Vault Files', value: stats.vaultItems, color: 'text-slate-600', accent: 'bg-slate-100' }
          ].map((stat, i) => (
            <div key={i} className={`bg-white p-5 rounded-2xl border border-slate-200/50 shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex flex-col justify-center transition-transform duration-300 hover:-translate-y-1 relative overflow-hidden`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${stat.accent}`}></div>
              <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">{stat.title}</p>
              <h3 className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* --- 3. Main Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 pb-10">
          
          {/* Left Column: Task Manager & Sticky Notes */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-slate-200/50 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[600px] lg:h-[650px] flex flex-col">
               <TaskManager />
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200/50 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-6">
               <StickyNotes />
            </div>
          </div>

          {/* Right Sidebar: Pinned Notes, Apps, Motivation & Progress */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200/50">
                <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Pin size={14} className="text-rose-500 fill-current" /> Pinned Notes
                </h3>
                <div className="flex gap-5 overflow-x-auto pb-3 custom-scrollbar">
                  {pinnedNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="w-64 shrink-0 p-5 pt-6 rounded-xl shadow-sm relative transition-transform hover:-translate-y-2 min-h-[120px] bg-white border border-slate-200/50" 
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 shadow-[0_3px_6px_rgba(0,0,0,0.2)] border border-rose-600 z-10 flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-white opacity-70"></div>
                      </div>
                      <div 
                        className="text-sm text-slate-700 font-medium leading-relaxed" 
                        dangerouslySetInnerHTML={{ __html: note.content || '<span class="text-slate-300 italic">Empty note...</span>' }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Access Menu */}
            <div className="bg-white border border-slate-200/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <TrendingUp className="text-[#02C2D5]" size={20} /> Quick Apps
              </h3>
              
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                {[
                  { name: 'BCS Prep', to: '/bcs', icon: <BookOpen size={22} />, color: 'text-[#02C2D5]', hover: 'hover:border-[#02C2D5] hover:bg-[#02C2D5]/5' },
                  { name: 'LMS Skill', to: '/lms', icon: <Briefcase size={22} />, color: 'text-purple-600', hover: 'hover:border-purple-400 hover:bg-purple-50' },
                  { name: 'Finance', to: '/finance', icon: <TrendingUp size={22} />, color: 'text-emerald-500', hover: 'hover:border-emerald-400 hover:bg-emerald-50' },
                  { name: 'Vault', to: '/vault', icon: <FolderLock size={22} />, color: 'text-slate-600', hover: 'hover:border-slate-400 hover:bg-slate-100' },
                  { name: 'Dev Hub', to: '/github', icon: <GitBranch size={22} />, color: 'text-slate-900', hover: 'hover:border-slate-900 hover:bg-slate-100' },
                  { name: 'Snippets', to: '/snippets', icon: <Code2 size={22} />, color: 'text-indigo-600', hover: 'hover:border-indigo-400 hover:bg-indigo-50' },
                  { name: 'Job Tracker', to: '/jobs', icon: <Briefcase size={22} />, color: 'text-emerald-600', hover: 'hover:border-emerald-400 hover:bg-emerald-50' }
                ].map((app: any, i) => (
                  <Link 
                    key={i} 
                    to={app.to} 
                    className={`p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 group ${app.hover}`}
                  >
                    <div className={`${app.color} group-hover:scale-110 transition-transform duration-300`}>{app.icon}</div>
                    <span className="text-[10px] font-semibold text-slate-700 text-center">{app.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Dynamic Motivation Widget */}
            <div className="bg-gradient-to-br from-[#020F33] to-[#0A1945] p-7 rounded-3xl text-white shadow-lg relative overflow-hidden group border border-[#0A1945]/50">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#02C2D5] opacity-10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity duration-500"></div>
              <Sparkles className="absolute top-4 right-4 text-[#02C2D5] opacity-20 group-hover:opacity-40 transition-opacity duration-500" size={30} />
              <Quote className="text-[#02C2D5] mb-4 opacity-60" size={28} />
              <p className="text-sm md:text-base font-medium leading-relaxed mb-6 relative z-10 text-slate-200">
                "{dailyQuote}"
              </p>
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#02C2D5]/40 to-transparent"></div>
                <p className="text-[10px] font-bold text-[#02C2D5] tracking-widest uppercase">Al_Faravi OS Mindset</p>
              </div>
            </div>
            
            {/* Categorized Course Tracker Widget */}
            <div className="bg-white border border-slate-200/50 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-5 flex-1 min-h-[300px]">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Target className="text-[#02C2D5]" size={20} /> Study Progress
              </h3>
              
              <div className="overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
                
                {/* 1. FOCUS BOX: Active Learning */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <PlayCircle size={14} /> Active Learning
                  </h4>
                  {activeCourses.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center">
                      <p className="text-xs font-medium text-slate-500">No active courses. Time to start learning!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} isFocused={true} />)}
                    </div>
                  )}
                </div>

                {/* 2. SECONDARY BOX: Pending Courses */}
                {pendingCourses.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <PauseCircle size={14} /> Pending
                    </h4>
                    <div className="flex flex-col">
                      {pendingCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
                    </div>
                  </div>
                )}

                {/* 3. SECONDARY BOX: Watch Later */}
                {watchLaterCourses.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Bookmark size={14} /> Watch Later
                    </h4>
                    <div className="flex flex-col">
                      {watchLaterCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
                    </div>
                  </div>
                )}

                {/* 4. SECONDARY BOX: Completed */}
                {completedCourses.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Mastered
                    </h4>
                    <div className="flex flex-col">
                      {completedCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
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