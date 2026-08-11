import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Plus, Trash2, Loader2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // টাস্ক ফেচ করা
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // নতুন টাস্ক যোগ করা
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title: newTaskTitle, user_id: user.id, status: 'pending' }])
        .select();

      if (error) throw error;
      if (data) {
        setTasks([data[0], ...tasks]);
        setNewTaskTitle('');
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // টাস্ক স্ট্যাটাস আপডেট (Complete/Pending)
  const toggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // টাস্ক ডিলিট করা
  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-brand-navy" size={20} /></div>;
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-3xl p-6 shadow-sm flex flex-col h-full">
      <h3 className="font-bold text-brand-navy mb-4 flex items-center justify-between">
        <span>Focus Tasks</span>
        <span className="text-xs bg-brand-cyan/20 text-brand-navy px-2.5 py-1 rounded-full font-semibold">
          {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
        </span>
      </h3>

      {/* টাস্ক ইনপুট ফর্ম */}
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add new focus task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="flex-1 bg-white border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-navy placeholder:text-brand-textMuted focus:outline-none focus:ring-2 focus:ring-brand-cyan"
        />
        <button
          type="submit"
          className="bg-brand-navy hover:bg-brand-cyan text-white hover:text-brand-navy p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </form>

      {/* টাস্ক লিস্ট */}
      <div className="space-y-2.5 overflow-y-auto max-h-[180px] pr-1">
        {tasks.length === 0 ? (
          <p className="text-xs text-brand-textMuted text-center py-4">No tasks found. Add your first goal!</p>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            return (
              <div 
                key={task.id} 
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-brand-border/60 group hover:border-brand-cyan transition-all"
              >
                <div 
                  onClick={() => toggleTask(task.id, task.status)}
                  className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden"
                >
                  <CheckCircle2 
                    size={20} 
                    className={isCompleted ? "text-brand-lime fill-brand-lime/20 shrink-0" : "text-brand-border shrink-0"} 
                  />
                  <span className={`text-sm font-medium truncate ${isCompleted ? 'text-brand-textMuted line-through' : 'text-brand-navy'}`}>
                    {task.title}
                  </span>
                </div>
                
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="text-brand-textMuted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}