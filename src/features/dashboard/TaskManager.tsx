import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Circle, Plus, Trash2, Loader2, ListTodo, Calendar, Clock, History, Link as LinkIcon, ChevronRight, Timer } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  target_date: string;
  deadline_time: string | null;
  linked_module: string;
  linked_item_id?: string | null;
  linked_item_title?: string | null;
  linked_sub_item_id?: string | null;
  linked_sub_item_title?: string | null;
}

const getBstDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' 
  }).format(d);
};

const formatBstDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const today = getBstDate(0);
  const tomorrow = getBstDate(1);
  const yesterday = getBstDate(-1);

  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';
  
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// === Bullet-proof Countdown Logic ===
const getTimeRemaining = (targetDate: string, deadlineTime: string | null) => {
  if (!targetDate) return null;
  
  const now = new Date();
  let target: Date;
  
  // Safely parse date across all browsers
  const [year, month, day] = targetDate.split('-').map(Number);
  
  if (deadlineTime) {
    const [hours, mins] = deadlineTime.split(':').map(Number);
    target = new Date(year, month - 1, day, hours, mins, 0);
  } else {
    // If no time is specified, default to 11:59 PM of that day
    target = new Date(year, month - 1, day, 23, 59, 59);
  }

  const diffMs = target.getTime() - now.getTime();

  if (diffMs < 0) return { text: 'Time Expired', color: 'text-rose-600 bg-rose-50 border-rose-200' };

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return { 
      text: `${diffDays}d ${remainingHours}h left`, 
      color: diffDays <= 2 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200' 
    };
  }

  if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    return { 
      text: `${diffHours}h ${remainingMins}m left`, 
      color: diffHours <= 3 ? 'text-rose-500 bg-rose-50 border-rose-200 animate-pulse' : 'text-amber-600 bg-amber-50 border-amber-200' 
    };
  }

  return { 
    text: `${diffMins}m left`, 
    color: 'text-rose-600 bg-rose-50 border-rose-200 font-extrabold animate-pulse' 
  };
};

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [bcsSubjects, setBcsSubjects] = useState<any[]>([]);
  const [lmsCourses, setLmsCourses] = useState<any[]>([]);
  const [subItems, setSubItems] = useState<any[]>([]); 
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [linkedModule, setLinkedModule] = useState('Custom');
  const [linkedItemId, setLinkedItemId] = useState('');
  const [linkedItemTitle, setLinkedItemTitle] = useState('');
  const [linkedSubItemId, setLinkedSubItemId] = useState('');
  const [linkedSubItemTitle, setLinkedSubItemTitle] = useState('');
  
  const [targetDate, setTargetDate] = useState(getBstDate(0));
  const [deadlineTime, setDeadlineTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [, setCurrentTime] = useState(Date.now()); // Tick for countdown updates

  // Live timer update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchOptions();
  }, [viewMode]);

  useEffect(() => {
    const fetchSubItems = async () => {
      if (!linkedItemId) {
        setSubItems([]); setLinkedSubItemId(''); setLinkedSubItemTitle(''); return;
      }
      try {
        if (linkedModule === 'BCS') {
          const { data } = await supabase.from('bcs_chapters').select('id, title').eq('subject_id', linkedItemId).order('created_at');
          setSubItems(data || []);
        } else if (linkedModule === 'LMS') {
          const { data } = await supabase.from('lms_modules').select('id, title').eq('course_id', linkedItemId).order('created_at');
          setSubItems(data || []);
        }
      } catch (error) { console.error(error); }
    };
    fetchSubItems();
  }, [linkedItemId, linkedModule]);

  const fetchOptions = async () => {
    try {
      const [bcsRes, lmsRes] = await Promise.all([
        supabase.from('bcs_subjects').select('id, title').order('title'),
        supabase.from('lms_courses').select('id, title').order('title')
      ]);
      setBcsSubjects(bcsRes.data || []); 
      setLmsCourses(lmsRes.data || []);
    } catch (error) { console.error(error); }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from('tasks').select('*')
        .eq('user_id', user?.id)
        .order('target_date', { ascending: true }) 
        .order('created_at', { ascending: false });

      if (viewMode === 'active') {
        query = query.eq('is_completed', false);
      } else {
        query = query.eq('is_completed', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setTasks(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    if ((linkedModule === 'BCS' || linkedModule === 'LMS') && !linkedItemId) {
      alert(`Please select a ${linkedModule} subject/course to link.`); return;
    }

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const finalLinkedItemId = (linkedModule === 'Custom' || !linkedItemId) ? null : linkedItemId;
      const finalLinkedSubItemId = (linkedModule === 'Custom' || !linkedSubItemId) ? null : linkedSubItemId;

      const { data, error } = await supabase.from('tasks').insert([{
        user_id: user?.id,
        title: newTaskTitle,
        is_completed: false,
        priority: priority,
        target_date: targetDate, 
        deadline_time: deadlineTime || null,
        linked_module: linkedModule,
        linked_item_id: finalLinkedItemId,
        linked_item_title: linkedModule === 'Custom' ? null : (linkedItemTitle || null),
        linked_sub_item_id: finalLinkedSubItemId,
        linked_sub_item_title: linkedModule === 'Custom' ? null : (linkedSubItemTitle || null),
      }]).select().single();

      if (error) throw error;
      if (viewMode === 'active') {
        fetchTasks(); 
      }
      
      setNewTaskTitle(''); 
      setTargetDate(getBstDate(0)); 
      setDeadlineTime('');
    } catch (error) { console.error(error); } finally { setIsAdding(false); }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    try {
      await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id);
      if (viewMode === 'active') setTasks(tasks.filter(t => t.id !== id));
      else fetchTasks();
    } catch (error) { console.error(error); }
  };

  const deleteTask = async (id: string) => {
    try {
      await supabase.from('tasks').delete().eq('id', id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) { console.error(error); }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-rose-500 bg-rose-50 border-rose-200';
      case 'Medium': return 'text-amber-500 bg-amber-50 border-amber-200';
      default: return 'text-blue-500 bg-blue-50 border-blue-200';
    }
  };

  const getModuleColor = (m: string) => {
    if(m === 'BCS') return 'bg-[#02C2D5]/10 text-[#02C2D5] border-[#02C2D5]/20';
    if(m === 'LMS') return 'bg-purple-100 text-purple-600 border-purple-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="text-xl font-bold text-[#020F33] flex items-center gap-2">
          <ListTodo className="text-[#02C2D5]" size={22} /> Action Plan
        </h3>
        <div className="flex bg-[#F8FAFC] rounded-lg p-1 border border-[#E2E8F0]">
          <button onClick={() => setViewMode('active')} className={`px-3 py-1 text-xs font-bold rounded-md ${viewMode === 'active' ? 'bg-white shadow text-[#020F33]' : 'text-[#475569]'}`}>Active</button>
          <button onClick={() => setViewMode('history')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 ${viewMode === 'history' ? 'bg-white shadow text-[#020F33]' : 'text-[#475569]'}`}><History size={12}/> History</button>
        </div>
      </div>

      {viewMode === 'active' && (
        <form onSubmit={handleAddTask} className="flex flex-col gap-3 mb-6 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] shrink-0">
          <div className="flex flex-col md:flex-row gap-2">
            <input 
              type="text" required value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} 
              placeholder="What needs to be done?" 
              className="flex-[2] bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02C2D5] font-medium"
            />
            <select 
              value={linkedModule} 
              onChange={(e) => {
                setLinkedModule(e.target.value);
                setLinkedItemId(''); setLinkedItemTitle('');
                setLinkedSubItemId(''); setLinkedSubItemTitle('');
              }} 
              className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-bold text-[#475569] outline-none"
            >
              <option value="Custom">General Task</option>
              <option value="BCS">BCS Prep</option>
              <option value="LMS">LMS Skill</option>
            </select>
          </div>

          {(linkedModule === 'BCS' || linkedModule === 'LMS') && (
            <div className="flex flex-col md:flex-row gap-2">
              <select 
                value={linkedItemId} 
                onChange={(e) => {
                  setLinkedItemId(e.target.value);
                  setLinkedItemTitle(e.target.options[e.target.selectedIndex].text);
                  setLinkedSubItemId(''); setLinkedSubItemTitle('');
                }}
                className={`bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-bold outline-none flex-1 ${linkedModule === 'BCS' ? 'text-[#02C2D5]' : 'text-purple-600'}`}
              >
                <option value="">Select {linkedModule} {linkedModule === 'BCS' ? 'Subject' : 'Course'}...</option>
                {(linkedModule === 'BCS' ? bcsSubjects : lmsCourses).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>

              {linkedItemId && (
                <select 
                  value={linkedSubItemId} 
                  onChange={(e) => {
                    setLinkedSubItemId(e.target.value);
                    setLinkedSubItemTitle(e.target.options[e.target.selectedIndex].text);
                  }}
                  className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-bold text-[#020F33] outline-none flex-1"
                >
                  <option value="">Whole {linkedModule === 'BCS' ? 'Subject' : 'Course'} (Optional)</option>
                  {subItems.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">
            <input 
              type="date" 
              value={targetDate} 
              onChange={(e) => setTargetDate(e.target.value)} 
              min={getBstDate(0)}
              className="w-full md:flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-bold text-[#475569] outline-none focus:ring-2 focus:ring-[#02C2D5]" 
              title="Target Date / Deadline" 
            />
            <input 
              type="time" 
              value={deadlineTime} 
              onChange={(e) => setDeadlineTime(e.target.value)} 
              className="w-full md:flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-bold text-[#475569] outline-none focus:ring-2 focus:ring-[#02C2D5]" 
              title="Specific Time (Optional)" 
            />
            <select value={priority} onChange={(e: any) => setPriority(e.target.value)} className="w-full md:flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-bold text-[#475569] outline-none">
              <option value="High">High Priority</option><option value="Medium">Medium Priority</option><option value="Low">Low Priority</option>
            </select>
            <button type="submit" disabled={isAdding} className="w-full md:w-auto bg-[#020F33] text-white hover:bg-[#02C2D5] hover:text-[#020F33] rounded-xl px-6 py-2.5 font-bold flex items-center justify-center transition-colors shadow-md shrink-0">
              {isAdding ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add</>}
            </button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#02C2D5]" size={24} /></div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-[#475569] py-8 flex flex-col items-center">
            <CheckCircle2 size={32} className="text-slate-200 mb-2"/>
            <p className="text-sm font-bold">All caught up!</p>
            <p className="text-xs">No tasks for {viewMode}.</p>
          </div>
        ) : (
          tasks.map(task => {
            const todayBst = getBstDate(0);
            const isOverdue = task.target_date < todayBst && !task.is_completed;
            const remaining = !task.is_completed ? getTimeRemaining(task.target_date, task.deadline_time) : null;

            return (
              <div key={task.id} className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all group overflow-hidden ${task.is_completed ? 'bg-slate-50 border-slate-100 opacity-75' : isOverdue ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-[#E2E8F0] hover:border-[#02C2D5]'}`}>
                <button onClick={() => toggleTask(task.id, task.is_completed)} className={`shrink-0 mt-0.5 transition-colors ${task.is_completed ? 'text-[#A3D803]' : isOverdue ? 'text-rose-400' : 'text-[#CBD5E1] hover:text-[#02C2D5]'}`}>
                  {task.is_completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  {/* Title Fix: break-words and whitespace-normal allows long text to wrap instead of breaking out */}
                  <span className={`text-sm font-bold block break-words whitespace-normal ${task.is_completed ? 'line-through text-slate-400' : 'text-[#020F33]'}`}>{task.title}</span>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getModuleColor(task.linked_module)}`}>{task.linked_module}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                    
                    {/* Live Countdown Badge */}
                    {remaining && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${remaining.color}`}>
                        <Timer size={10}/> {remaining.text}
                      </span>
                    )}

                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${isOverdue ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      <Calendar size={10}/> 
                      {isOverdue ? 'Overdue: ' : 'Due: '}
                      {formatBstDisplayDate(task.target_date)}
                    </span>

                    {task.deadline_time && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-slate-50 border-slate-200 text-slate-500 flex items-center gap-1"><Clock size={10}/> {task.deadline_time}</span>
                    )}

                    {task.linked_item_title && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-1 max-w-[250px] truncate w-full mt-1">
                        <LinkIcon size={10} className="shrink-0"/> 
                        <span className="truncate">{task.linked_item_title}</span>
                        {task.linked_sub_item_title && (
                          <><ChevronRight size={10} className="text-blue-400 mx-[-2px] shrink-0" /> <span className="truncate">{task.linked_sub_item_title}</span></>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-[#CBD5E1] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 shrink-0"><Trash2 size={16} /></button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}