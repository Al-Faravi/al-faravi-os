import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Layers, Loader2, CheckCircle2, 
  Circle, ChevronDown, Save, Award, AlertCircle
} from 'lucide-react';

interface BcsSubject {
  id: string;
  title: string;
  icon_color: string;
}

interface PyqRecord {
  id?: string;
  bcs_edition: number;
  subject_id: string;
  is_completed: boolean;
  score: number;
}

export default function PyqMatrix() {
  const [subjects, setSubjects] = useState<BcsSubject[]>([]);
  const [records, setRecords] = useState<PyqRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for currently selected BCS edition (e.g., 45, 44, 43...)
  const [selectedEdition, setSelectedEdition] = useState<number>(45);
  const [isSaving, setIsSaving] = useState(false);

  // Generate an array of BCS editions (e.g., 45 down to 10)
  const editions = Array.from({ length: 36 }, (_, i) => 45 - i);

  useEffect(() => {
    fetchData();
  }, [selectedEdition]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Subjects
      const { data: subData } = await supabase.from('bcs_subjects').select('id, title, icon_color').order('order_index');
      if (subData) setSubjects(subData);

      // 2. Fetch PYQ Records for the selected edition
      const { data: pyqData } = await supabase
        .from('bcs_pyq_matrix')
        .select('*')
        .eq('user_id', user.id)
        .eq('bcs_edition', selectedEdition);
      
      if (pyqData) setRecords(pyqData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = (subjectId: string) => {
    const existing = records.find(r => r.subject_id === subjectId);
    if (existing) {
      setRecords(records.map(r => r.subject_id === subjectId ? { ...r, is_completed: !r.is_completed } : r));
    } else {
      setRecords([...records, { bcs_edition: selectedEdition, subject_id: subjectId, is_completed: true, score: 0 }]);
    }
  };

  const handleScoreChange = (subjectId: string, scoreStr: string) => {
    const score = Number(scoreStr);
    const existing = records.find(r => r.subject_id === subjectId);
    if (existing) {
      setRecords(records.map(r => r.subject_id === subjectId ? { ...r, score } : r));
    } else {
      setRecords([...records, { bcs_edition: selectedEdition, subject_id: subjectId, is_completed: false, score }]);
    }
  };

  const saveProgress = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare data for upsert
      const upsertData = records.map(r => ({
        user_id: user.id,
        bcs_edition: r.bcs_edition,
        subject_id: r.subject_id,
        is_completed: r.is_completed,
        score: r.score || 0
      }));

      const { error } = await supabase.from('bcs_pyq_matrix').upsert(upsertData, {
        onConflict: 'user_id, bcs_edition, subject_id'
      });

      if (error) throw error;
      alert("Progress saved successfully!");
    } catch (error: any) {
      console.error(error);
      alert("Error saving progress: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Analytics for the selected edition
  const completedCount = records.filter(r => r.is_completed).length;
  const totalScore = records.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const progressPct = subjects.length === 0 ? 0 : Math.round((completedCount / subjects.length) * 100);

  if (loading && subjects.length === 0) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden">
          <div className="z-10">
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
              <Layers className="text-amber-500" size={36} /> PYQ Matrix
            </h1>
            <p className="text-[#475569] mt-2 font-medium">Conquer the past to predict the future.</p>
          </div>
          
          <div className="z-10 flex gap-4 w-full md:w-auto">
            <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl flex-1 md:w-40">
              <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Select BCS</p>
              <div className="relative">
                <select 
                  value={selectedEdition} 
                  onChange={(e) => setSelectedEdition(Number(e.target.value))}
                  className="w-full bg-transparent text-xl font-black text-[#020F33] appearance-none outline-none cursor-pointer"
                >
                  {editions.map(ed => (
                    <option key={ed} value={ed}>{ed}th BCS</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-0 top-1 text-amber-500 pointer-events-none" />
              </div>
            </div>
            
            <button 
              onClick={saveProgress} 
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2 flex-1 md:flex-none disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              <span className="hidden md:inline">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
            <span>{selectedEdition}th BCS Progress</span>
            <span className="text-amber-600">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
          </div>
        </div>
        <div className="bg-amber-50 px-5 py-3 rounded-xl border border-amber-100 text-center shrink-0">
          <p className="text-[10px] font-bold text-amber-600 uppercase mb-0.5">Total Score</p>
          <p className="text-2xl font-black text-amber-700">{totalScore}</p>
        </div>
      </div>

      {/* Subjects Matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-4 bg-[#F8FAFC] border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-wider">
          <div className="col-span-7 md:col-span-8">Subject</div>
          <div className="col-span-3 md:col-span-2 text-center">Score</div>
          <div className="col-span-2 text-center">Done</div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {subjects.map(subject => {
            const record = records.find(r => r.subject_id === subject.id);
            const isCompleted = record?.is_completed || false;
            const score = record?.score || '';

            return (
              <div key={subject.id} className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-slate-50 ${isCompleted ? 'bg-amber-50/30' : ''}`}>
                <div className="col-span-7 md:col-span-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-80" style={{ backgroundColor: `${subject.icon_color}15` }}>
                    <Award size={16} color={subject.icon_color} />
                  </div>
                  <span className={`font-bold text-sm leading-tight ${isCompleted ? 'text-slate-500 line-through' : 'text-[#020F33]'}`}>
                    {subject.title}
                  </span>
                </div>
                
                <div className="col-span-3 md:col-span-2">
                  <input 
                    type="number" 
                    value={score} 
                    onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                    placeholder="00" 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
                
                <div className="col-span-2 flex justify-center">
                  <button 
                    onClick={() => handleToggleComplete(subject.id)} 
                    className={`transition-colors p-1 rounded-full ${isCompleted ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                  >
                    {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6 flex items-start gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm font-medium leading-relaxed">
          <strong>Pro Tip:</strong> Don't forget to click the <b>Save</b> button at the top right after updating your scores or checking off subjects to ensure your matrix is updated in the database.
        </p>
      </div>
    </div>
  );
}