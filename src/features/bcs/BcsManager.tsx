import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Target, BookOpen, Loader2, Award, BookMarked, 
  BrainCircuit, Globe, FlaskConical, MonitorDot, GripVertical,
  LineChart, Repeat, AlertTriangle, Layers, Database, Plus
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    fetchSubjects();
  }, []);

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
    if (title.includes('Bank') || title.includes('কোয়েশ্চেন')) return <Database size={20} color={color} />;
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
      
      {/* ================= HERO SECTION (Features) ================= */}
      <div className="mb-12 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3 tracking-tight">
              <Target className="text-[#02C2D5] w-10 h-10" /> BCS Mission Control
            </h1>
            <p className="text-[#475569] mt-2 font-bold text-sm">Your ultimate command center for BCS Preliminary Preparation.</p>
          </div>
        </div>

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
        <button className="flex items-center gap-2 bg-[#020F33] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors shadow-sm">
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
                      {/* Optional: Add a mini progress bar here later */}
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