import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Target, Plus, Loader2, GripVertical, BookOpen, PlayCircle, X } from 'lucide-react';
// Updated dnd-kit imports for smooth mobile touch scrolling:
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from '../../components/ui/SortableItem';

interface Course {
  id: string;
  title: string;
  platform: string;
  status: string;
  progress_pct: number;
  order_index?: number;
}

export default function LmsManager() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Add Course Modal States ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('YouTube');
  const [isSaving, setIsSaving] = useState(false);

  // --- MOBILE SCROLLING FIX (250ms press-and-hold delay for touch) ---
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lms_courses')
      .select('*')
      .order('order_index', { ascending: true });
    
    if (error) console.error(error);
    if (data) setCourses(data);
    setLoading(false);
  };

  // --- Create New Course Logic ---
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('lms_courses').insert([{
        user_id: user?.id,
        title: newTitle,
        platform: newPlatform,
        status: 'pending',
        progress_pct: 0,
        order_index: courses.length
      }]);

      if (error) throw error;
      
      setNewTitle('');
      setNewPlatform('YouTube');
      setShowAddModal(false);
      fetchCourses(); // রিফ্রেশ করে নতুন কোর্সটি নিয়ে আসা
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCourses((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        const updates = newItems.map((item, index) => ({
          id: item.id,
          order_index: index,
        }));
        
        supabase.from('lms_courses').upsert(updates).then();
        return newItems;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28 relative">
      
      {/* --- ADD COURSE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-xl text-[#020F33]">Add New Course</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-1.5 rounded-lg transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#475569] mb-1.5">Course Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="e.g. Advanced React Patterns" 
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none text-sm font-medium" 
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#475569] mb-1.5">Platform / Source</label>
                <input 
                  type="text" 
                  value={newPlatform} 
                  onChange={(e) => setNewPlatform(e.target.value)} 
                  placeholder="e.g. YouTube, Udemy, Coursera" 
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-purple-500 rounded-xl p-3 outline-none text-sm font-medium" 
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-[#020F33] text-white font-bold py-3.5 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {isSaving ? 'Creating...' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
            <Target className="text-purple-600 w-10 h-10" /> Knowledge Hub
          </h1>
          <p className="text-[#475569] mt-2 font-medium">Mastering MERN, AI, & Data Intelligence.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Plus size={18} /> New Course
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-12 text-center shadow-sm">
          <BookOpen size={64} className="mx-auto mb-6 text-purple-300" />
          <h2 className="text-2xl font-bold mb-2">Your Hub is Empty</h2>
          <p className="text-[#475569] mb-8">Start adding your target skills and courses to track your journey.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={courses.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <SortableItem key={course.id} id={course.id}>
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-purple-300 transition-all group flex flex-col justify-between h-full relative">
                    
                    {/* Top Row: Tags & Drag Handle */}
                    <div className="flex justify-between items-start mb-5">
                      <span className="text-[10px] font-black bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg uppercase tracking-wider line-clamp-1">
                        {course.platform || 'General'}
                      </span>
                      <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1 transition-colors">
                        <GripVertical size={18} />
                      </span>
                    </div>
                    
                    {/* Course Info */}
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-xl font-bold text-[#020F33] leading-snug group-hover:text-purple-600 transition-colors mb-4 line-clamp-2">
                        {course.title}
                      </h3>
                    </div>
                    
                    {/* Bottom Row: Progress & Action */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                          <span>Progress</span>
                          <span className="text-purple-600">{course.progress_pct || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${course.progress_pct || 0}%` }}></div>
                        </div>
                      </div>
                      
                      <Link to={`/lms/course/${course.id}`} className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                        <PlayCircle size={20} className="ml-0.5" />
                      </Link>
                    </div>

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