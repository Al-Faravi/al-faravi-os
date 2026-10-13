import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, BookOpen, ChevronRight, Loader2, Award, BookMarked, BrainCircuit, Globe, FlaskConical, MonitorDot, GripVertical } from 'lucide-react';
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
    if (title.includes('বিজ্ঞান')) return <FlaskConical size={24} color={color} />;
    if (title.includes('কম্পিউটার')) return <MonitorDot size={24} color={color} />;
    if (title.includes('আন্তর্জাতিক') || title.includes('ভূগোল')) return <Globe size={24} color={color} />;
    if (title.includes('মানসিক') || title.includes('গাণিতিক')) return <BrainCircuit size={24} color={color} />;
    return <BookMarked size={24} color={color} />;
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3 tracking-tight">
            <Target className="text-[#02C2D5] w-10 h-10" /> BCS Mission Control
          </h1>
          <p className="text-[#475569] mt-2 font-bold">Total Marks: 200 — Track your entire preliminary journey.</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center shadow-sm">
          <Award size={64} className="mx-auto mb-6 text-[#A3D803]" />
          <h2 className="text-2xl font-bold mb-2">Start Your BCS Journey</h2>
          <p className="text-[#475569] mb-8 max-w-md mx-auto">
            Click below to automatically set up all 10 subjects of the BCS Preliminary syllabus.
          </p>
          <button onClick={handleInitializeSyllabus} disabled={isInitializing} className="bg-[#020F33] text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 mx-auto hover:bg-[#02C2D5] hover:text-[#020F33] transition-colors">
            {isInitializing ? <Loader2 className="animate-spin" size={20} /> : <><BookOpen size={20} /> Initialize BCS Syllabus</>}
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <SortableItem key={subject.id} id={subject.id}>
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#02C2D5] transition-all group flex flex-col justify-between h-full relative">
                    
                    {/* Top Row */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-opacity-10 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${subject.icon_color}15` }}>
                        {getIcon(subject.title, subject.icon_color)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300 cursor-grab active:cursor-grabbing p-1 hover:text-slate-500">
                          <GripVertical size={18} />
                        </span>
                        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                          <span className="text-xs font-black" style={{ color: subject.icon_color }}>{subject.marks} Marks</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <Link to={`/bcs/subject/${subject.id}`} className="block flex-1">
                      <h3 className="text-xl font-bold text-[#020F33] leading-snug group-hover:text-[#02C2D5] transition-colors mb-2">
                        {subject.title}
                      </h3>
                    </Link>
                    
                    {/* Bottom Action */}
                    <Link to={`/bcs/subject/${subject.id}`} className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-[#475569]">
                      <span className="group-hover:text-[#02C2D5] transition-colors">View Chapters & Resources</span>
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-[#02C2D5]" />
                    </Link>

                  </div>
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}