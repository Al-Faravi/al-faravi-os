import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Plus, Trash2, Video, FileText, CheckCircle2, 
  Circle, GripVertical, Loader2, BookOpen, ExternalLink, Edit3 
} from 'lucide-react';

// ১. @dnd-kit ইমপোর্টসমূহ (LmsManager এর মতো)
import { 
  DndContext, closestCenter, 
  PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from '../../components/ui/SortableItem';

interface Lecture {
  id: string;
  module_id: string;
  title: string;
  video_url?: string;
  duration?: string;
  is_completed: boolean;
  order_index?: number;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index?: number;
}

interface Course {
  id: string;
  title: string;
  platform: string;
  status: string;
  progress: number;
}

export default function LmsWorkspace() {
  const { courseId } = useParams<{ courseId: string }>();

  // ক্লিকে বা স্ক্রলে ঝামেলা এড়াতে PointerSensor সক্রিয়করণ
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // ৮ পিক্সেল ড্র্যাগ করলে সক্রিয় হবে
      },
    })
  );

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);

  // নতুন মডিউল বা লেকচার যোগ করার স্টেট
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [showModuleInput, setShowModuleInput] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [newLectureTitle, setNewLectureTitle] = useState('');

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      // ১. কোর্স ফেচ করা
      const { data: courseData, error: courseError } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // ২. মডিউল ফেচ করা
      const { data: modulesData, error: modulesError } = await supabase
        .from('lms_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (modulesError) console.error('Modules error:', modulesError);
      setModules(modulesData || []);

      // ৩. লেকচার ফেচ করা
      const { data: lecturesData, error: lecturesError } = await supabase
        .from('lms_lectures')
        .select('*')
        .order('order_index', { ascending: true });

      if (lecturesError) console.error('Lectures error:', lecturesError);
      setLectures(lecturesData || []);

    } catch (error) {
      console.error('Error fetching workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  // লেকচার ড্র্যাগ এন্ড ড্রপ হ্যান্ডলার
  const handleLectureDragEnd = async (event: any, moduleId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLectures((prevLectures) => {
        // শুধু নির্দিষ্ট মডিউলের লেকচারগুলো ফিল্টার করি
        const moduleLectures = prevLectures.filter(l => l.module_id === moduleId);
        const otherLectures = prevLectures.filter(l => l.module_id !== moduleId);

        const oldIndex = moduleLectures.findIndex((item) => item.id === active.id);
        const newIndex = moduleLectures.findIndex((item) => item.id === over.id);

        const reorderedModuleLectures = arrayMove(moduleLectures, oldIndex, newIndex);

        // নতুন অর্ডার ইনডেক্স সেট করা
        const updates = reorderedModuleLectures.map((item, index) => ({
          id: item.id,
          module_id: item.module_id,
          title: item.title,
          is_completed: item.is_completed,
          order_index: index,
        }));

        // Supabase-এ আপডেটেড অর্ডার সেভ করা
        supabase.from('lms_lectures').upsert(updates).then(({ error }) => {
          if (error) console.error("Lecture Reorder Error:", error);
        });

        return [...otherLectures, ...reorderedModuleLectures];
      });
    }
  };

  // মডিউল যোগ করার ফাংশন
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    try {
      const { data, error } = await supabase.from('lms_modules').insert([{
        course_id: courseId,
        title: newModuleTitle,
        order_index: modules.length
      }]).select().single();

      if (error) throw error;
      if (data) setModules([...modules, data]);
      setNewModuleTitle('');
      setShowModuleInput(false);
    } catch (err) {
      console.error('Error adding module:', err);
    }
  };

  // লেকচার যোগ করার ফাংশন
  const handleAddLecture = async (moduleId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newLectureTitle.trim()) return;

    const moduleLectures = lectures.filter(l => l.module_id === moduleId);

    try {
      const { data, error } = await supabase.from('lms_lectures').insert([{
        module_id: moduleId,
        title: newLectureTitle,
        is_completed: false,
        order_index: moduleLectures.length
      }]).select().single();

      if (error) throw error;
      if (data) setLectures([...lectures, data]);
      setNewLectureTitle('');
      setActiveModuleId(null);
    } catch (err) {
      console.error('Error adding lecture:', err);
    }
  };

  // লেকচার কমপ্লিট টগল
  const toggleLectureCompletion = async (lectureId: string, currentStatus: boolean) => {
    setLectures(lectures.map(l => l.id === lectureId ? { ...l, is_completed: !currentStatus } : l));
    
    await supabase
      .from('lms_lectures')
      .update({ is_completed: !currentStatus })
      .eq('id', lectureId);
  };

  // লেকচার ডিলিট
  const handleDeleteLecture = async (lectureId: string) => {
    setLectures(lectures.filter(l => l.id !== lectureId));
    await supabase.from('lms_lectures').delete().eq('id', lectureId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#02C2D5]" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-20">
      {/* Top Header & Back Button */}
      <div className="mb-6">
        <Link to="/lms" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Knowledge Hub
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-black bg-[#02C2D5]/10 text-[#02C2D5] px-3 py-1.5 rounded-lg uppercase tracking-wider">
              {course?.platform || 'Course Workspace'}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-2">{course?.title}</h1>
          </div>
          <button
            onClick={() => setShowModuleInput(!showModuleInput)}
            className="bg-[#020F33] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all flex items-center gap-2 shadow-md"
          >
            <Plus size={18} /> {showModuleInput ? 'Cancel' : 'Add Module'}
          </button>
        </div>
      </div>

      {/* New Module Form */}
      {showModuleInput && (
        <form onSubmit={handleAddModule} className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm mb-8 flex gap-3">
          <input
            type="text"
            required
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="Module Title (e.g. Module 1: Fundamentals)"
            className="flex-grow bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] font-medium text-sm"
          />
          <button type="submit" className="bg-[#020F33] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all text-sm">
            Save Module
          </button>
        </form>
      )}

      {/* Modules & Lectures List */}
      <div className="space-y-6">
        {modules.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#E2E8F0]">
            <BookOpen size={40} className="mx-auto mb-3 text-[#475569] opacity-30" />
            <p className="text-[#475569] font-bold">No modules created yet. Add your first module above!</p>
          </div>
        ) : (
          modules.map((module, mIndex) => {
            const moduleLectures = lectures.filter(l => l.module_id === module.id);

            return (
              <div key={module.id} className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#E2E8F0]">
                  <h3 className="text-lg font-black text-[#020F33]">
                    Module {mIndex + 1}: {module.title}
                  </h3>
                  <button
                    onClick={() => setActiveModuleId(activeModuleId === module.id ? null : module.id)}
                    className="text-xs font-bold text-[#02C2D5] hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Lecture
                  </button>
                </div>

                {/* Add Lecture Form for specific module */}
                {activeModuleId === module.id && (
                  <form onSubmit={(e) => handleAddLecture(module.id, e)} className="mb-4 flex gap-2 bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                    <input
                      type="text"
                      required
                      value={newLectureTitle}
                      onChange={(e) => setNewLectureTitle(e.target.value)}
                      placeholder="Lecture Title..."
                      className="flex-grow bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02C2D5]"
                    />
                    <button type="submit" className="bg-[#020F33] text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-[#02C2D5] hover:text-[#020F33] transition-all">
                      Add
                    </button>
                  </form>
                )}

                {/* DndContext & SortableContext for Lectures */}
                {moduleLectures.length === 0 ? (
                  <p className="text-xs text-[#475569] italic py-2">No lectures in this module yet.</p>
                ) : (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter} 
                    onDragEnd={(event) => handleLectureDragEnd(event, module.id)}
                  >
                    <SortableContext items={moduleLectures.map(l => l.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {moduleLectures.map((lecture) => (
                          <SortableItem key={lecture.id} id={lecture.id}>
                            <div className="flex items-center justify-between p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:border-[#02C2D5] transition-all group">
                              <div className="flex items-center gap-3">
                                <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1">
                                  <GripVertical size={16} />
                                </span>
                                <button 
                                  onClick={() => toggleLectureCompletion(lecture.id, lecture.is_completed)}
                                  className={`transition-colors ${lecture.is_completed ? 'text-[#A3D803]' : 'text-slate-300 hover:text-slate-500'}`}
                                >
                                  {lecture.is_completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <span className={`text-sm font-bold ${lecture.is_completed ? 'line-through text-[#475569]' : 'text-[#020F33]'}`}>
                                  {lecture.title}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteLecture(lecture.id)}
                                className="text-[#475569] hover:text-rose-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Lecture"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </SortableItem>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}