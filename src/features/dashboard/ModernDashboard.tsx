import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import TaskManager from './TaskManager';
import { 
  Sun, Moon, Sunrise, BookOpen, Target, 
  Briefcase, FolderLock, TrendingUp, 
  Clock, Flame, Quote, Sparkles, PlayCircle, 
  Bookmark, CheckCircle2, PauseCircle, LogOut,
  GitBranch, Code2, Users 
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

    return () => clearInterval(timer);
  }, []);

  // --- Core Data & Gamification Engine ---
  const fetchStatsAndStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Real-time Cloud Streak Logic
      const metadata = user.user_metadata || {};
      const lastActive = metadata.last_active_date;
      const currentStreak = metadata.streak_count || 0;
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = currentStreak;

      if (lastActive !== today) {
        if (lastActive === yesterday) {
          newStreak += 1; // Consecutive day login
        } else {
          newStreak = 1; // Streak broken
        }
        await supabase.auth.updateUser({
          data: { last_active_date: today, streak_count: newStreak }
        });
      }
      setStreak(newStreak);

      // Fetch Global Stats
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

      // Fetch All Courses for Tracker
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
      <div className={`group ${isFocused ? 'bg-white border-2 border-[#02C2D5]/30 shadow-md p-4 rounded-2xl hover:border-[#02C2D5] transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5' : 'py-3 border-b border-[#E2E8F0] last:border-0'}`}>
        <div className="flex justify-between items-end mb-2">
          <Link to={link} className={`font-bold truncate pr-2 flex-1 transition-colors ${isFocused ? 'text-base text-[#020F33] hover:text-[#02C2D5]' : 'text-sm text-[#475569] hover:text-[#020F33]'}`}>
            {course.title}
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
    // Clean Light Mode Wrapper
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
                <Flame size={20} className={streak > 0 ? "animate-pulse" : ""} />
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

        {/* --- 2. Live Stats Grid --- */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
          {[
            { title: 'Pending Tasks', value: stats.pendingTasks, icon: <Target size={24}/>, color: 'text-rose-500', bg: 'bg-rose-50 hover:border-rose-300' },
            { title: 'BCS Items Read', value: stats.bcsCompleted, icon: <BookOpen size={24}/>, color: 'text-[#02C2D5]', bg: 'bg-[#02C2D5]/10 hover:border-[#02C2D5]' },
            { title: 'Skills Mastered', value: stats.lmsCompleted, icon: <Briefcase size={24}/>, color: 'text-purple-600', bg: 'bg-purple-100 hover:border-purple-300' },
            { title: 'Vault Files', value: stats.vaultItems, icon: <FolderLock size={24}/>, color: 'text-slate-600', bg: 'bg-slate-100 hover:border-slate-400' }
          ].map((stat, i) => (
            <div key={i} className={`bg-white p-5 md:p-6 rounded-3xl border border-[#E2E8F0] shadow-sm transition-all duration-300 group ${stat.bg.split(' hover:')[1]}`}>
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${stat.bg.split(' hover:')[0]} ${stat.color}`}>
                  {stat.icon}
                </div>
                <span className="text-3xl md:text-4xl font-black text-[#020F33]">{stat.value}</span>
              </div>
              <p className="text-xs md:text-sm font-bold text-[#475569]">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* --- 3. Main Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 pb-10">
          
          {/* Left Column: Task Manager */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-[650px] lg:h-[700px] xl:h-[800px] bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm">
             <TaskManager />
          </div>

          {/* Right Sidebar: Apps, Motivation & Progress */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 md:gap-6">
            
            {/* Quick Access Menu */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 md:p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#020F33] mb-5 flex items-center gap-2">
                <TrendingUp className="text-[#02C2D5]" size={20} /> Quick Apps
              </h3>
              
              {/* Standard Apps Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-3 gap-3 mb-4">
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

              {/* Single Premium Study Groups / Workspace Button */}
              <button 
                onClick={() => window.open('/workspace-manager', '_blank')}
                className="w-full flex flex-col items-center justify-center p-5 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl hover:border-blue-500 transition-all group shadow-md"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <span className="text-white font-bold text-base">Study Groups</span>
                <span className="text-xs text-gray-400 mt-0.5">Manage & Collaborate</span>
              </button>
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
            
            {/* Categorized Course Tracker Widget */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-5 flex-1 min-h-[300px]">
              <h3 className="text-lg font-bold text-[#020F33] flex items-center gap-2">
                <Target className="text-[#02C2D5]" size={20} /> Study Progress
              </h3>
              
              <div className="overflow-y-auto pr-2 hide-scrollbar flex flex-col gap-6">
                
                {/* 1. FOCUS BOX: Active Learning */}
                <div>
                  <h4 className="text-xs font-black text-[#02C2D5] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <PlayCircle size={14} /> Active Learning
                  </h4>
                  {activeCourses.length === 0 ? (
                    <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E1] p-6 rounded-2xl text-center">
                      <p className="text-xs font-bold text-[#475569]">No active courses. Time to start learning!</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} isFocused={true} />)}
                    </div>
                  )}
                </div>

                {/* 2. SECONDARY BOX: Pending Courses */}
                {pendingCourses.length > 0 && (
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl">
                    <h4 className="text-[10px] font-black text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#E2E8F0] pb-2">
                      <PauseCircle size={14} /> Pending
                    </h4>
                    <div className="flex flex-col">
                      {pendingCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
                    </div>
                  </div>
                )}

                {/* 3. SECONDARY BOX: Watch Later */}
                {watchLaterCourses.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-amber-100 pb-2">
                      <Bookmark size={14} /> Watch Later
                    </h4>
                    <div className="flex flex-col">
                      {watchLaterCourses.map(course => <CourseProgressItem key={`${course.courseType}-${course.id}`} course={course} />)}
                    </div>
                  </div>
                )}

                {/* 4. SECONDARY BOX: Completed */}
                {completedCourses.length > 0 && (
                  <div className="bg-[#A3D803]/5 border border-[#A3D803]/20 p-4 rounded-2xl">
                    <h4 className="text-[10px] font-black text-[#719900] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-[#A3D803]/20 pb-2">
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