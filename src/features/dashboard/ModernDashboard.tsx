import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TaskManager from './TaskManager';
import { 
  Sun, Moon, Sunrise, BookOpen, Target, 
  Briefcase, FolderLock, TrendingUp, 
  Clock, Flame, Quote, Sparkles, PlayCircle, 
  Bookmark, CheckCircle2, PauseCircle, LogOut,
  GitBranch, Code2, LayoutList, GraduationCap, ChevronRight
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
  
  // --- Workspace Tab State ---
  const [activeTab, setActiveTab] = useState<'tasks' | 'courses'>('tasks');
  
  // --- Gamification States ---
  const [streak, setStreak] = useState(0);
  const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  
  // --- Data States ---
  const [stats, setStats] = useState({ pendingTasks: 0, bcsCompleted: 0, lmsCompleted: 0, vaultItems: 0 });
  const [allCourses, setAllCourses] = useState<any[]>([]);

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

  const activeCourses = allCourses.filter(c => c.status === 'active');
  const pendingCourses = allCourses.filter(c => c.status === 'pending');
  const watchLaterCourses = allCourses.filter(c => c.status === 'watch_later');
  const completedCourses = allCourses.filter(c => c.status === 'completed');

  const CourseProgressItem = ({ course, isFocused = false }: { course: any, isFocused?: boolean }) => {
    const isLms = course.courseType === 'lms';
    const link = isLms ? `/lms/${course.id}` : `/bcs/${course.id}`;
    const color = isLms ? '#9333ea' : (course.icon_color || '#02C2D5');
    
    return (
      <div className={`group flex flex-col justify-center ${isFocused ? 'bg-white/60 p-4 rounded-2xl border border-white/80 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-lg transition-all' : 'py-3 border-b border-slate-100 last:border-0'}`}>
        <div className="flex justify-between items-center mb-2.5">
          <Link to={link} className="font-bold truncate pr-3 flex-1 text-[#020F33] group-hover:text-[#02C2D5] transition-colors text-sm">
            {course.title}
          </Link>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0 ${isLms ? 'text-purple-600 bg-purple-100/50' : 'text-[#02C2D5] bg-[#02C2D5]/10'}`}>
            {isLms ? 'LMS' : 'BCS'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${course.progress_pct || 0}%`, backgroundColor: color }}>
              <div className="absolute inset-0 bg-white/20"></div>
            </div>
          </div>
          <span className="font-black w-8 text-right text-xs text-[#94A3B8] group-hover:text-[#020F33] transition-colors">{course.progress_pct || 0}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col font-sans selection:bg-[#02C2D5]/30 text-[#020F33] overflow-x-hidden">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full mb-24 md:mb-10 flex-1 flex flex-col space-y-6">
        
        {/* --- 1. HERO BENTO BOX --- */}
        <div className="bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-white to-slate-50 flex items-center justify-center border border-slate-100 shadow-sm shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-[#02C2D5] opacity-5 blur-xl"></div>
              {timeIcon}
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#020F33] to-[#02C2D5]">Faravi!</span>
              </h1>
              <p className="text-[#475569] font-medium mt-1 flex items-center gap-2 text-xs md:text-sm">
                <Clock size={14} className="text-[#02C2D5]" />
                {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} • 
                <span className="font-bold text-[#020F33]">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3 bg-white/60 border border-white/80 p-3 rounded-2xl flex-1 lg:flex-none shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <Flame size={20} className={streak > 0 ? "animate-bounce" : ""} />
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Active Streak</p>
                <p className="text-sm font-black text-[#020F33]">{streak > 0 ? `${streak} Days 🔥` : "Start Today 💪"}</p>
              </div>
            </div>
            <button onClick={handleSignOut} className="w-12 h-12 lg:w-14 lg:h-14 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border border-rose-100 hover:shadow-rose-500/20 shrink-0 group">
              <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* --- 2. HORIZONTAL SCROLL QUICK APPS (Mobile First) --- */}
        <div className="w-full">
          <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-3 ml-2">Quick Apps</h3>
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {[
              { name: 'BCS Prep', to: '/bcs', icon: <BookOpen size={22} className="text-[#02C2D5]" />, hover: 'hover:border-[#02C2D5] hover:bg-[#02C2D5]/5' },
              { name: 'LMS Skill', to: '/lms', icon: <Briefcase size={22} className="text-purple-600" />, hover: 'hover:border-purple-400 hover:bg-purple-50' },
              { name: 'Finance', to: '/finance', icon: <TrendingUp size={22} className="text-emerald-500" />, hover: 'hover:border-emerald-400 hover:bg-emerald-50' },
              { name: 'Vault', to: '/vault', icon: <FolderLock size={22} className="text-slate-600" />, hover: 'hover:border-slate-400 hover:bg-slate-50' },
              { name: 'Dev Hub', to: '/github', icon: <GitBranch size={22} className="text-slate-900" />, hover: 'hover:border-slate-900 hover:bg-slate-100' },
              { name: 'Snippets', to: '/snippets', icon: <Code2 size={22} className="text-indigo-600" />, hover: 'hover:border-indigo-400 hover:bg-indigo-50' },
              { name: 'Job Tracker', to: '/jobs', icon: <Briefcase size={22} className="text-emerald-600" />, hover: 'hover:border-emerald-400 hover:bg-emerald-50' }
            ].map((app, i) => (
              <Link key={i} to={app.to} className={`min-w-[100px] sm:min-w-0 sm:flex-1 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all duration-300 flex flex-col items-center justify-center gap-2 group shrink-0 ${app.hover}`}>
                <div className="group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">{app.icon}</div>
                <span className="text-[11px] font-bold text-[#475569] group-hover:text-[#020F33] text-center whitespace-nowrap">{app.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* --- 3. BENTO STATS GRID --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Pending Tasks', value: stats.pendingTasks, icon: <Target size={20}/>, color: 'text-rose-500', bg: 'bg-rose-50 hover:border-rose-200' },
            { title: 'BCS Mastered', value: stats.bcsCompleted, icon: <BookOpen size={20}/>, color: 'text-[#02C2D5]', bg: 'bg-[#02C2D5]/10 hover:border-[#02C2D5]/40' },
            { title: 'LMS Mastered', value: stats.lmsCompleted, icon: <Briefcase size={20}/>, color: 'text-purple-600', bg: 'bg-purple-100 hover:border-purple-300' },
            { title: 'Vault Files', value: stats.vaultItems, icon: <FolderLock size={20}/>, color: 'text-slate-600', bg: 'bg-slate-100 hover:border-slate-300' }
          ].map((stat, i) => (
            <div key={i} className={`bg-white/60 backdrop-blur-xl p-5 rounded-[1.5rem] border border-white shadow-sm transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${stat.bg.split(' hover:')[1]}`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${stat.bg.split(' hover:')[0]} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
              <span className="text-3xl font-black text-[#020F33] block mb-1">{stat.value}</span>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* --- 4. MAIN BENTO CONTENT (Motivation + Tabbed Workspace) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Motivation Box */}
          <div className="lg:col-span-4 bg-[#020F33] p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group border border-slate-800">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#02C2D5] opacity-20 rounded-full blur-[40px] group-hover:opacity-30 transition-opacity duration-700"></div>
            <Sparkles className="absolute top-6 right-6 text-[#02C2D5] opacity-20 group-hover:opacity-100 transition-opacity duration-500" size={24} />
            <Quote className="text-[#02C2D5] mb-5 opacity-70" size={24} />
            <p className="text-base font-medium leading-relaxed mb-6 relative z-10 text-slate-200">
              "{dailyQuote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-[#02C2D5]/40 to-transparent"></div>
              <p className="text-[10px] font-black text-[#02C2D5] tracking-widest uppercase">Al_Faravi OS Mindset</p>
            </div>
          </div>

          {/* Unified Tabbed Workspace */}
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-2xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-[700px]">
            {/* Tabs Header */}
            <div className="flex p-2 bg-slate-50/50 border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('tasks')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'tasks' ? 'bg-white text-[#020F33] shadow-sm' : 'text-[#94A3B8] hover:bg-white/50 hover:text-[#475569]'}`}
              >
                <LayoutList size={18}/> Focus Tasks
              </button>
              <button 
                onClick={() => setActiveTab('courses')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'courses' ? 'bg-white text-[#02C2D5] shadow-sm' : 'text-[#94A3B8] hover:bg-white/50 hover:text-[#475569]'}`}
              >
                <GraduationCap size={18}/> Study Tracker
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-2">
              {activeTab === 'tasks' ? (
                <div className="h-full flex flex-col [&>div]:h-full [&>div]:border-none [&>div]:shadow-none [&>div]:bg-transparent">
                  <TaskManager />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="space-y-6">
                    {/* Active Courses */}
                    <div>
                      <h4 className="text-[11px] font-black text-[#02C2D5] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <PlayCircle size={14} /> Currently Focusing
                      </h4>
                      {activeCourses.length === 0 ? (
                        <div className="bg-slate-50/50 border border-dashed border-slate-200 p-6 rounded-2xl text-center">
                          <p className="text-xs font-bold text-[#94A3B8]">No active courses. Set your focus!</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {activeCourses.map(c => <CourseProgressItem key={`${c.courseType}-${c.id}`} course={c} isFocused={true} />)}
                        </div>
                      )}
                    </div>

                    {/* Pending Courses */}
                    {pendingCourses.length > 0 && (
                      <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                        <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                          <PauseCircle size={14} /> Next in Line
                        </h4>
                        <div className="flex flex-col">
                          {pendingCourses.map(c => <CourseProgressItem key={`${c.courseType}-${c.id}`} course={c} />)}
                        </div>
                      </div>
                    )}

                    {/* Watch Later */}
                    {watchLaterCourses.length > 0 && (
                      <div className="bg-amber-50/30 border border-amber-100/50 p-4 rounded-2xl">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-amber-100/50 pb-2">
                          <Bookmark size={14} /> Saved for Later
                        </h4>
                        <div className="flex flex-col">
                          {watchLaterCourses.map(c => <CourseProgressItem key={`${c.courseType}-${c.id}`} course={c} />)}
                        </div>
                      </div>
                    )}

                    {/* Completed */}
                    {completedCourses.length > 0 && (
                      <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-emerald-100/50 pb-2">
                          <CheckCircle2 size={14} /> Mastered
                        </h4>
                        <div className="flex flex-col">
                          {completedCourses.map(c => <CourseProgressItem key={`${c.courseType}-${c.id}`} course={c} />)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}