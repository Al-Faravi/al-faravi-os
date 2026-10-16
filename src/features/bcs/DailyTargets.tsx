import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Target, Plus, Loader2, 
  CheckCircle2, Circle, Trash2, CalendarDays, Flame
} from 'lucide-react';

interface DailyTarget {
  id: string;
  title: string;
  is_completed: boolean;
  target_date: string;
}

export default function DailyTargets() {
  const [todayTargets, setTodayTargets] = useState<DailyTarget[]>([]);
  const [historyTargets, setHistoryTargets] = useState<Record<string, DailyTarget[]>>({});
  const [loading, setLoading] = useState(true);
  
  const [newTask, setNewTask] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('bcs_daily_targets')
        .select('*')
        .order('target_date', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // Separate today's targets from history
        const todayData = data.filter(t => t.target_date === today);
        const pastData = data.filter(t => t.target_date !== today);

        // Group history by date
        const groupedHistory: Record<string, DailyTarget[]> = {};
        pastData.forEach(task => {
          if (!groupedHistory[task.target_date]) groupedHistory[task.target_date] = [];
          groupedHistory[task.target_date].push(task);
        });

        setTodayTargets(todayData);
        setHistoryTargets(groupedHistory);
      }
    } catch (error) {
      console.error("Error fetching targets", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.from('bcs_daily_targets').insert([{
        user_id: user?.id,
        title: newTask,
        target_date: today,
        is_completed: false
      }]).select().single();

      if (error) throw error;
      if (data) setTodayTargets([...todayTargets, data]);
      setNewTask('');
    } catch (error) {
      console.error("Error adding task", error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean, isToday: boolean) => {
    // Optimistic UI update
    if (isToday) {
      setTodayTargets(todayTargets.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    } else {
      const newHistory = { ...historyTargets };
      for (const date in newHistory) {
        newHistory[date] = newHistory[date].map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t);
      }
      setHistoryTargets(newHistory);
    }

    // Database update
    await supabase.from('bcs_daily_targets').update({ is_completed: !currentStatus }).eq('id', id);
  };

  const deleteTask = async (id: string, isToday: boolean) => {
    if (isToday) setTodayTargets(todayTargets.filter(t => t.id !== id));
    await supabase.from('bcs_daily_targets').delete().eq('id', id);
  };

  // Calculate Today's Progress
  const completedToday = todayTargets.filter(t => t.is_completed).length;
  const progressPct = todayTargets.length === 0 ? 0 : Math.round((completedToday / todayTargets.length) * 100);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-rose-500" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl border border-rose-100 shadow-sm relative overflow-hidden">
          <div className="z-10">
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
              <Target className="text-rose-500" size={36} /> Daily Target Locker
            </h1>
            <p className="text-[#475569] mt-2 font-medium">Win the day, win the preparation.</p>
          </div>
          
          {/* Progress Circular Badge */}
          <div className="z-10 bg-rose-50 border border-rose-100 px-6 py-4 rounded-2xl flex items-center gap-4">
            <div>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Today's Progress</p>
              <p className="text-2xl font-black text-[#020F33]">{completedToday} / {todayTargets.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-rose-200 flex items-center justify-center" style={{ borderColor: progressPct === 100 ? '#10B981' : '', background: `conic-gradient(${progressPct === 100 ? '#10B981' : '#F43F5E'} ${progressPct}%, transparent 0)` }}>
              <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center">
                <span className={`text-xs font-bold ${progressPct === 100 ? 'text-emerald-500' : 'text-rose-500'}`}>{progressPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: TODAY'S TARGETS */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <Flame className="text-rose-500" size={24} /> Today's Mission
          </h2>
          
          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newTask} 
              onChange={e => setNewTask(e.target.value)} 
              placeholder="e.g. Master English Idioms (A-D) & Solve 50 Math puzzles..." 
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all font-medium"
            />
            <button type="submit" disabled={isSaving || !newTask.trim()} className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-50">
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </form>

          {/* Today's List */}
          <div className="space-y-3">
            {todayTargets.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
                <Target size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-500">No targets locked for today.</p>
                <p className="text-sm text-slate-400 mt-1">Set 3-4 micro-targets and crush them!</p>
              </div>
            ) : (
              todayTargets.map(task => (
                <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all group ${task.is_completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-rose-300'}`}>
                  <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => toggleTask(task.id, task.is_completed, true)}>
                    <button className={`mt-0.5 shrink-0 transition-colors ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-rose-500'}`}>
                      {task.is_completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>
                    <span className={`font-medium ${task.is_completed ? 'text-emerald-700 line-through opacity-70' : 'text-[#020F33]'}`}>
                      {task.title}
                    </span>
                  </div>
                  <button onClick={() => deleteTask(task.id, true)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: HISTORY */}
        <div>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-slate-600">
            <CalendarDays size={20} /> Mission History
          </h2>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
            {Object.keys(historyTargets).length === 0 ? (
              <p className="text-sm font-medium text-slate-400 text-center py-10">No past history found.</p>
            ) : (
              Object.keys(historyTargets).map(date => {
                const dayTasks = historyTargets[date];
                const dayCompleted = dayTasks.filter(t => t.is_completed).length;
                const dayTotal = dayTasks.length;
                const isAllDone = dayCompleted === dayTotal;

                return (
                  <div key={date} className="mb-6 last:mb-0">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAllDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {dayCompleted}/{dayTotal} Done
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dayTasks.map(task => (
                        <div key={task.id} className="flex items-start gap-2 group">
                          <button onClick={() => toggleTask(task.id, task.is_completed, false)} className={`mt-0.5 shrink-0 ${task.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-rose-400'}`}>
                            {task.is_completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                          <span className={`text-sm ${task.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}