import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Target, BookOpen, Loader2, Award, BookMarked, 
  BrainCircuit, Globe, FlaskConical, MonitorDot, GripVertical,
  LineChart, Repeat, AlertTriangle, Layers, Database, Plus,
  CheckCircle2, Circle, TrendingDown, ArrowRight
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from '../../components/ui/SortableItem';

interface BcsSubject {
  id: string;
  title: string;
  marks: number;
  icon_color: string;
  order_index?: number;
  user_id: string;
  is_custom?: boolean;
}

export default function BcsManager() {
  const [subjects, setSubjects] = useState<BcsSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  // Live Data States
  const [todayTargets, setTodayTargets] = useState<any[]>([]);
  const [recentTests, setRecentTests] = useState<any[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [dangerSubjectsCount, setDangerSubjectsCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    fetchDashboardData();
    fetchSubjects();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch Today's Targets (Limit 3)
      const { data: targets } = await supabase
        .from('bcs_daily_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_date', today)
        .limit(3);
      if (targets) setTodayTargets(targets);

      // 2. Fetch Recent Mock Tests (Limit 3)
      const { data: tests } = await supabase
        .from('bcs_mock_tests')
        .select('*, subject:bcs_subjects(title, icon_color)')
        .eq('user_id', user.id)
        .order('date_taken', { ascending: false })
        .limit(3);
      if (tests) setRecentTests(tests);

      // 3. Fetch Due Flashcards Count
      const { data: flashcards } = await supabase
        .from('bcs_flashcards')
        .select('id')
        .eq('user_id', user.id)
        .lte('next_review_date', today);
      if (flashcards) setDueCardsCount(flashcards.length);

      // 4. Calculate Danger Zone (Score < 50%)
      const { data: allSubjects } = await supabase.from('bcs_subjects').select('id');
      const { data: allTests } = await supabase.from('bcs_mock_tests').select('subject_id, obtained_marks, total_questions').eq('user_id', user.id);
      
      if (allSubjects && allTests) {
        let dangerCount = 0;
        allSubjects.forEach(sub => {
          const subTests = allTests.filter(t => t.subject_id === sub.id);
          if (subTests.length > 0) {
            const totalQ = subTests.reduce((acc, t) => acc + t.total_questions, 0);
            const totalM = subTests.reduce((acc, t) => acc + t.obtained_marks, 0);
            const pct = (totalM / totalQ) * 100;
            if (pct < 50) dangerCount++;
          }
        });
        setDangerSubjectsCount(dangerCount);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSubjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bcs_subjects')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (data) setSubjects(data);
    setLoading(false);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        const updates = newItems.map((item, index) => ({ id: item.id, order_index: index }));
        supabase.from('bcs_subjects').upsert(updates).then();

        return newItems;
      });
    }
  };

  // ================= NEW: ADD CUSTOM COURSE / BANK FUNCTION =================
  const handleAddCustomCourse = async () => {
    const title = prompt("Enter Custom Course / Bank Title (e.g. 'Job Solution Book'):");
    if (!title) return;

    const marksStr = prompt("Enter Total Marks for this course (Default is 100):", "100");
    const marks = parseInt(marksStr || "100", 10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Random nice color for the new custom card
      const colors = ['#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#02C2D5'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newSubject = {
        title,
        marks,
        icon_color: randomColor,
        user_id: user.id,
        order_index: subjects.length, 
        is_custom: true
      };

      await supabase.from('bcs_subjects').insert([newSubject]);
      await fetchSubjects(); // Refresh the list magically!

    } catch (error: any) {
      alert("Error creating custom course: " + error.message);
    }
  };

  const handleInitializeSyllabus = async () => {
    setIsInitializing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const defaultSyllabus = [
        { title: 'বাংলা ভাষা ও সাহিত্য', marks: 35, icon_color: '#EF4444', user_id: user.id, order_index: 0 },
        { title: 'English Language & Literature', marks: 35, icon_color: '#3B82F6', user_id: user.id, order_index: 1 },
        { title: 'বাংলাদেশ বিষয়াবলি', marks: 30, icon_color: '#10B981', user_id: user.id, order_index: 2 },
        { title: 'আন্তর্জাতিক বিষয়াবলি', marks: 20, icon_color: '#F59E0B', user_id: user.id, order_index: 3 },
        { title: 'সাধারণ বিজ্ঞান', marks: 15, icon_color: '#06B6D4', user_id: user.id, order_index: 4 },
        { title: 'কম্পিউটার ও তথ্যপ্রযুক্তি', marks: 15, icon_color: '#6366F1', user_id: user.id, order_index: 5 },
        { title: 'গাণিতিক যুক্তি', marks: 15, icon_color: '#EC4899', user_id: user.id, order_index: 6 },
        { title: 'মানসিক দক্ষতা', marks: 15, icon_color: '#F43F5E', user_id: user.id, order_index: 7 },
        { title: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', marks: 10, icon_color: '#8B5CF6', user_id: user.id, order_index: 8 },
        { title: 'নৈতিকতা, মূল্যবোধ ও সুশাসন', marks: 10, icon_color: '#14B8A6', user_id: user.id, order_index: 9 },
      ];

      await supabase.from('bcs_subjects').insert(defaultSyllabus);
      await fetchSubjects();
    } catch (error: any) {
      console.error('Failed to init syllabus:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const getIcon = (title: string, color: string) => {
    if (title.includes('বিজ্ঞান')) return <FlaskConical size={20} color={color} />;
    if (title.includes('কম্পিউটার')) return <MonitorDot size={20} color={color} />;
    if (title.includes('আন্তর্জাতিক') || title.includes('ভূগোল')) return <Globe size={20} color={color} />;
    if (title.includes('মানসিক') || title.includes('গাণিতিক')) return <BrainCircuit size={20} color={color} />;
    if (title.includes('Bank') || title.includes('কোয়েশ্চেন')) return <Database size={20} color={color} />;
    return <BookMarked size={20} color={color} />;
  };

  // --- Hero Section Features Data ---
  const bcsFeatures = [
    { title: 'Daily Target Locker', icon: <Target size={24} />, color: 'text-rose-500', bg: 'bg-rose-100', link: '/bcs/targets' },
    { title: 'Mock Tests & Score', icon: <LineChart size={24} />, color: 'text-indigo-600', bg: 'bg-indigo-100', link: '/bcs/mock-tests' },
    { title: 'Flashcards & Repetition', icon: <Repeat size={24} />, color: 'text-emerald-500', bg: 'bg-emerald-100', link: '/bcs/flashcards' },
    { title: 'PYQ Matrix', icon: <Layers size={24} />, color: 'text-amber-500', bg: 'bg-amber-100', link: '/bcs/pyq' },
    { title: 'Danger Zone Detector', icon: <AlertTriangle size={24} />, color: 'text-red-500', bg: 'bg-red-100', link: '/bcs/weakness' },
    { title: 'Resource Vault (PDF/Drive)', icon: <Database size={24} />, color: 'text-[#02C2D5]', bg: 'bg-[#02C2D5]/15', link: '/bcs/vault' },
  ];

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto text-[#020F33] mb-28">
      
      {/* Welcome Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-2">BCS Mission Control</h1>
        <p className="text-slate-500 font-medium">Your real-time study progress and active missions.</p>
      </div>

      {/* ================= LIVE INSIGHTS SECTION ================= */}
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Live Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        
        {/* Widget 1: Daily Targets */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2"><Target size={18} className="text-blue-500"/> Today's Target</h3>
            <Link to="/bcs/targets" className="text-xs font-bold text-blue-500 hover:underline">View All</Link>
          </div>
          <div className="flex-1 space-y-3">
            {todayTargets.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No targets set for today yet.</p>
            ) : (
              todayTargets.map(t => (
                <div key={t.id} className="flex items-start gap-2">
                  {t.is_completed ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> : <Circle size={16} className="text-slate-300 shrink-0 mt-0.5" />}
                  <span className={`text-xs font-bold leading-snug line-clamp-2 ${t.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.title}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 2: Recent Mock Tests */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2"><LineChart size={18} className="text-indigo-500"/> Recent Tests</h3>
            <Link to="/bcs/mock-tests" className="text-xs font-bold text-indigo-500 hover:underline">Log New</Link>
          </div>
          <div className="flex-1 space-y-3">
            {recentTests.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No tests taken recently.</p>
            ) : (
              recentTests.map(test => (
                <div key={test.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 truncate pr-2">
                    {test.subject ? test.subject.title : 'General'}
                  </span>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded shrink-0">
                    {test.obtained_marks}/{test.total_questions}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 3: Flashcards Due */}
        <div className={`border rounded-3xl p-5 flex flex-col shadow-sm justify-between transition-all ${dueCardsCount > 0 ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20' : 'bg-white border-slate-200 hover:shadow-md'}`}>
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <Repeat size={18} className={dueCardsCount > 0 ? "text-emerald-200" : "text-emerald-500"}/> 
            Flashcards Due
          </h3>
          <div>
            <p className="text-3xl font-black mb-1">{dueCardsCount}</p>
            <p className={`text-xs font-medium ${dueCardsCount > 0 ? 'text-emerald-100' : 'text-slate-400'}`}>Cards need review today.</p>
          </div>
          <Link to="/bcs/flashcards" className={`mt-4 w-full py-2 rounded-xl text-xs font-bold text-center transition-colors ${dueCardsCount > 0 ? 'bg-white text-emerald-600 hover:bg-emerald-50' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
            {dueCardsCount > 0 ? 'Study Now' : 'Manage Deck'}
          </Link>
        </div>

        {/* Widget 4: Danger Zone */}
        <div className={`border rounded-3xl p-5 flex flex-col shadow-sm justify-between transition-all ${dangerSubjectsCount > 0 ? 'bg-red-50 border-red-200 hover:shadow-red-500/10' : 'bg-white border-slate-200 hover:shadow-md'}`}>
          <h3 className={`font-bold flex items-center gap-2 mb-2 ${dangerSubjectsCount > 0 ? 'text-red-600' : ''}`}>
            <AlertTriangle size={18} className={dangerSubjectsCount > 0 ? "text-red-500" : "text-red-400"}/> 
            Danger Zone
          </h3>
          <div>
            <p className={`text-3xl font-black mb-1 flex items-center gap-2 ${dangerSubjectsCount > 0 ? 'text-red-600' : 'text-slate-700'}`}>
              {dangerSubjectsCount} {dangerSubjectsCount > 0 && <TrendingDown size={24} className="text-red-400" />}
            </p>
            <p className="text-xs font-medium text-slate-500">Subjects below 50% score.</p>
          </div>
          <Link to="/bcs/weakness" className={`mt-4 w-full py-2 rounded-xl text-xs font-bold text-center transition-colors ${dangerSubjectsCount > 0 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            View Analytics
          </Link>
        </div>

      </div>

      {/* ================= HERO SECTION (Features) ================= */}
      <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">All Modules</h2>
      <div className="mb-12 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        {/* Feature Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {bcsFeatures.map((feat, idx) => (
            <Link key={idx} to={feat.link} className="bg-[#F8FAFC] border border-slate-200 p-4 rounded-2xl hover:border-[#02C2D5]/50 hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col items-center text-center justify-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${feat.bg} ${feat.color} group-hover:scale-110 transition-transform`}>
                {feat.icon}
              </div>
              <span className="text-xs font-black text-[#020F33] leading-snug">{feat.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ================= SUBJECTS SECTION (Compact) ================= */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black flex items-center gap-2">
          <BookOpen className="text-[#02C2D5]" size={24} /> Syllabus & Question Banks
        </h2>
        {/* THE FIXED BUTTON IS HERE! */}
        <button 
          onClick={handleAddCustomCourse}
          className="flex items-center gap-2 bg-[#020F33] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Custom Course / Bank
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-10 text-center shadow-sm max-w-2xl mx-auto">
          <Award size={64} className="mx-auto mb-6 text-[#02C2D5]" />
          <h2 className="text-2xl font-bold mb-2">Start Your BCS Journey</h2>
          <p className="text-[#475569] mb-8 text-sm">Click below to automatically load the 10 subjects of the BCS Preliminary syllabus.</p>
          <button onClick={handleInitializeSyllabus} disabled={isInitializing} className="bg-[#020F33] text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 mx-auto hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors">
            {isInitializing ? <Loader2 className="animate-spin" size={20} /> : <><BookOpen size={18} /> Load Official Syllabus</>}
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {/* COMPACT GRID: 2 columns on mobile, 4 on tablet, 5 on large screens */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {subjects.map((subject) => (
                <SortableItem key={subject.id} id={subject.id}>
                  <Link to={`/bcs/subject/${subject.id}`} className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:border-[#02C2D5] transition-all group relative h-full flex flex-col">
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-10 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${subject.icon_color}15` }}>
                        {getIcon(subject.title, subject.icon_color)}
                      </div>
                      <span className="text-slate-300 cursor-grab active:cursor-grabbing p-1 hover:text-[#02C2D5] z-10" onClick={(e) => e.preventDefault()}>
                        <GripVertical size={16} />
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-bold text-[#020F33] leading-snug group-hover:text-[#02C2D5] transition-colors flex-1 mb-3">
                      {subject.title}
                    </h3>
                    
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded bg-slate-50 text-slate-500 border border-slate-100">
                        {subject.marks} Marks
                      </span>
                      <span className="text-[10px] font-bold text-[#02C2D5] opacity-0 group-hover:opacity-100 transition-opacity">
                        Open &rarr;
                      </span>
                    </div>

                  </Link>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}