import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // এটি যোগ করা হয়েছে
import { supabase } from '../../lib/supabase';
import { 
  BookOpen, Plus, Trophy, PlayCircle, ExternalLink, 
  CheckCircle2, Code2, Layout, Database, Trash2, Code, 
  Loader2, GraduationCap, Video, FileText, ArrowRight
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  platform: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  type: string;
}

export default function LmsManager() {
  const [activeTab, setActiveTab] = useState<'courses' | 'resources'>('courses');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  
  // Form States
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Course Inputs
  const [cTitle, setCTitle] = useState('');
  const [cPlatform, setCPlatform] = useState('');
  const [cStatus, setCStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('In Progress');
  const [cProgress, setCProgress] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, resourcesRes] = await Promise.all([
        supabase.from('lms_courses').select('*').order('created_at', { ascending: false }),
        supabase.from('lms_resources').select('*').order('created_at', { ascending: false })
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (resourcesRes.error) throw resourcesRes.error;

      setCourses(coursesRes.data || []);
      setResources(resourcesRes.data || []);
    } catch (error) {
      console.error('Error fetching LMS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle || !cPlatform) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('lms_courses').insert([{
        user_id: user.id,
        title: cTitle,
        platform: cPlatform,
        status: cStatus,
        progress: cProgress
      }]);

      if (error) throw error;
      
      await fetchData();
      setShowCourseForm(false);
      setCTitle('');
      setCPlatform('');
      setCProgress(0);
      setCStatus('In Progress');
    } catch (error) {
      console.error('Error adding course:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if(!window.confirm('Delete this course?')) return;
    try {
      await supabase.from('lms_courses').delete().eq('id', id);
      setCourses(courses.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  // Stats Calculations
  const completedCount = courses.filter(c => c.status === 'Completed').length;
  const inProgressCount = courses.filter(c => c.status === 'In Progress').length;

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'Github': return <Code size={18} />; // Fixed Icon Here
      case 'Video': return <Video size={18} />;
      case 'Doc': return <FileText size={18} />;
      default: return <ExternalLink size={18} />;
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-20">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3 tracking-tight">
            <GraduationCap className="text-[#02C2D5] w-10 h-10" /> 
            Knowledge Hub
          </h1>
          <p className="text-[#475569] mt-2 font-medium">Mastering MERN, AI, & Data Intelligence.</p>
        </div>
        <button 
          onClick={() => setShowCourseForm(!showCourseForm)}
          className="w-full md:w-auto bg-[#020F33] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#020F33]/20"
        >
          <Plus size={20} /> {showCourseForm ? 'Cancel' : 'New Course'}
        </button>
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <div className="col-span-2 bg-[#020F33] text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Code2 size={150} />
          </div>
          <div className="relative z-10">
            <p className="text-[#02C2D5] font-bold text-xs md:text-sm mb-2 uppercase tracking-widest">Active Skill Focus</p>
            <h2 className="text-2xl md:text-3xl font-black leading-tight">Advanced MERN & System Architecture</h2>
          </div>
        </div>
        
        <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#02C2D5]/10 flex items-center justify-center text-[#02C2D5]">
              <PlayCircle size={20} />
            </div>
            <p className="text-[#475569] font-bold text-sm">In Progress</p>
          </div>
          <h3 className="text-3xl font-black text-[#020F33]">{inProgressCount}</h3>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#A3D803]/10 flex items-center justify-center text-[#A3D803]">
              <Trophy size={20} />
            </div>
            <p className="text-[#475569] font-bold text-sm">Completed</p>
          </div>
          <h3 className="text-3xl font-black text-[#020F33]">{completedCount}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-[#E2E8F0] w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'courses' ? 'bg-[#020F33] text-white shadow-md' : 'text-[#475569] hover:text-[#020F33] hover:bg-[#F8FAFC]'}`}
        >
          <Layout size={16} /> My Courses
        </button>
        <button 
          onClick={() => setActiveTab('resources')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'resources' ? 'bg-[#020F33] text-white shadow-md' : 'text-[#475569] hover:text-[#020F33] hover:bg-[#F8FAFC]'}`}
        >
          <Database size={16} /> Cheat Sheets & Links
        </button>
      </div>

      {/* Add Course Form */}
      {showCourseForm && (
        <form onSubmit={handleAddCourse} className="bg-white border border-[#E2E8F0] p-6 md:p-8 rounded-3xl shadow-lg mb-10 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><BookOpen className="text-[#02C2D5]" /> Add New Learning Track</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-bold text-[#475569] mb-2">Course Title</label>
              <input type="text" required value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="e.g. Master OpenCV & TensorFlow" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] font-medium" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-2">Platform / Source</label>
              <input type="text" required value={cPlatform} onChange={e => setCPlatform(e.target.value)} placeholder="e.g. Udemy, YouTube" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] font-medium" />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#475569] mb-2">Progress (%)</label>
              <input type="number" min="0" max="100" required value={cProgress} onChange={e => setCProgress(parseInt(e.target.value) || 0)} className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] font-medium" />
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-4 w-full md:w-auto">
              {['Not Started', 'In Progress', 'Completed'].map(status => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" checked={cStatus === status} onChange={() => setCStatus(status as any)} className="accent-[#02C2D5] w-4 h-4" />
                  <span className="text-sm font-bold text-[#020F33]">{status}</span>
                </label>
              ))}
            </div>
            <button type="submit" disabled={isSaving} className="w-full md:w-auto bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md">
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save Course'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>
      ) : activeTab === 'courses' ? (
        
        /* Courses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-[#E2E8F0]">
              <BookOpen size={48} className="mx-auto mb-4 text-[#475569] opacity-30" />
              <p className="text-[#475569] font-bold text-lg">Your learning track is empty.</p>
              <p className="text-sm text-[#475569] mt-1">Add your first course to start tracking.</p>
            </div>
          ) : (
            courses.map(course => {
              const isCompleted = course.status === 'Completed';
              const isStarted = course.status !== 'Not Started';
              const accentColor = isCompleted ? '#A3D803' : isStarted ? '#02C2D5' : '#CBD5E1';

              return (
                <div key={course.id} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group relative flex flex-col h-full">
                  <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: accentColor }}></div>
                  
                  <div className="flex justify-between items-start mb-4 mt-2">
                    <span className="text-xs font-black bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] px-3 py-1.5 rounded-lg uppercase tracking-wider">
                      {course.platform}
                    </span>
                    <button onClick={() => handleDeleteCourse(course.id)} className="text-[#475569] hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  {/* পরিবর্তন করা অংশটি এখানে */}
                  <Link 
                    to={`/lms/course/${course.id}`} 
                    className="text-xl font-bold text-[#020F33] leading-snug mb-6 flex-grow hover:text-[#02C2D5] transition-colors"
                  >
                    {course.title}
                  </Link>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-center text-sm font-bold mb-3">
                      <span className="flex items-center gap-1.5" style={{ color: accentColor }}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <PlayCircle size={16} />}
                        {course.status}
                      </span>
                      <span className="text-[#020F33]">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-[#F8FAFC] rounded-full h-3 border border-[#E2E8F0] overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${course.progress}%`, backgroundColor: accentColor }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      ) : (

        /* Resources List View */
        <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 bg-[#F8FAFC] border-b border-[#E2E8F0] flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[#020F33]">Developer Arsenal</h2>
              <p className="text-sm text-[#475569] mt-1">Important repositories, docs, and cheat sheets.</p>
            </div>
            <button className="text-[#020F33] hover:text-[#02C2D5] font-bold text-sm flex items-center gap-1">
              Add Resource <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="p-6 md:p-8">
            {resources.length === 0 ? (
              <div className="text-center py-12">
                <Database size={40} className="mx-auto mb-4 text-[#475569] opacity-30" />
                <p className="text-[#475569] font-bold">No resources saved yet.</p>
                <p className="text-sm text-[#475569] mt-1">You can add your GitHub repos or docs here later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map(res => (
                  <a key={res.id} href={res.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl border border-[#E2E8F0] hover:border-[#02C2D5] hover:shadow-md transition-all group bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-[#020F33] group-hover:text-[#02C2D5] transition-colors">
                        {getResourceIcon(res.type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#020F33] text-sm md:text-base">{res.title}</h4>
                        <p className="text-xs text-[#475569] font-medium uppercase tracking-wider mt-0.5">{res.type}</p>
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-[#CBD5E1] group-hover:text-[#02C2D5] transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}