import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, LineChart, Plus, Loader2, Target, 
  CheckCircle2, XCircle, MinusCircle, Trash2, Award
} from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  subject_id: string | null;
  total_questions: number;
  right_answers: number;
  wrong_answers: number;
  skipped: number;
  obtained_marks: number;
  date_taken: string;
  subject?: { title: string; icon_color: string };
}

export default function MockTests() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [right, setRight] = useState<number | ''>('');
  const [wrong, setWrong] = useState<number | ''>('');
  const [skipped, setSkipped] = useState<number | ''>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Subjects for dropdown
      const { data: subData } = await supabase.from('bcs_subjects').select('id, title, icon_color').order('order_index');
      if (subData) setSubjects(subData);

      // Fetch Tests with related subject data
      const { data: testData } = await supabase
        .from('bcs_mock_tests')
        .select(`*, subject:bcs_subjects(title, icon_color)`)
        .order('date_taken', { ascending: false });
      
      if (testData) setTests(testData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || right === '' || wrong === '' || skipped === '') return;
    setIsSaving(true);

    const rightAns = Number(right);
    const wrongAns = Number(wrong);
    const skippedAns = Number(skipped);
    const totalQ = rightAns + wrongAns + skippedAns;
    
    // BCS Standard: 0.5 negative mark per wrong answer
    const obtained = rightAns - (wrongAns * 0.5);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('bcs_mock_tests').insert([{
        user_id: user?.id,
        title,
        subject_id: subjectId || null,
        total_questions: totalQ,
        right_answers: rightAns,
        wrong_answers: wrongAns,
        skipped: skippedAns,
        obtained_marks: obtained
      }]);

      setShowForm(false);
      setTitle(''); setSubjectId(''); setRight(''); setWrong(''); setSkipped('');
      fetchData();
    } catch (error) {
      console.error("Error saving test", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this test record?")) return;
    await supabase.from('bcs_mock_tests').delete().eq('id', id);
    setTests(tests.filter(t => t.id !== id));
  };

  // Analytics Calculation
  const averageScore = tests.length > 0 ? (tests.reduce((acc, curr) => acc + curr.obtained_marks, 0) / tests.length).toFixed(2) : '0';
  const highestScore = tests.length > 0 ? Math.max(...tests.map(t => t.obtained_marks)) : 0;
  const totalMistakes = tests.reduce((acc, curr) => acc + curr.wrong_answers, 0);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <LineChart className="text-indigo-600" size={36} /> Mock Test Analytics
            </h1>
            <p className="text-[#475569] mt-1 font-medium">Track your accuracy and reduce negative marking.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md">
            {showForm ? 'Cancel' : <><Plus size={18} /> Add New Result</>}
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Tests</p>
          <p className="text-2xl font-black text-[#020F33]">{tests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Average Score</p>
          <p className="text-2xl font-black text-indigo-600">{averageScore}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Highest Score</p>
          <p className="text-2xl font-black text-emerald-500">{highestScore}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Mistakes</p>
          <p className="text-2xl font-black text-rose-500">{totalMistakes}</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSaveTest} className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-900">
            <Target size={20} /> Enter Test Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Test Name/Model No.</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Professor's Model Test 01" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Subject (Leave blank for Full Test)</label>
              <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500">
                <option value="">All Subjects (Full Model Test)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-emerald-600 mb-1">Right (+1)</label>
              <input type="number" required min="0" value={right} onChange={e => setRight(Number(e.target.value))} className="w-full bg-white border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-bold" />
            </div>
            <div>
              <label className="block text-sm font-bold text-rose-600 mb-1">Wrong (-0.5)</label>
              <input type="number" required min="0" value={wrong} onChange={e => setWrong(Number(e.target.value))} className="w-full bg-white border border-rose-200 text-rose-700 rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 font-bold" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">Skipped (0)</label>
              <input type="number" required min="0" value={skipped} onChange={e => setSkipped(Number(e.target.value))} className="w-full bg-white border border-slate-200 text-slate-600 rounded-xl px-4 py-2.5 outline-none focus:border-slate-500 font-bold" />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save Result & Calculate'}
          </button>
        </form>
      )}

      {/* Tests List */}
      <div className="space-y-4">
        {tests.length === 0 && !showForm ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
            <LineChart size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-500">No mock tests recorded yet</h3>
            <p className="text-sm text-slate-400 mt-1">Add your first test to see your performance metrics.</p>
          </div>
        ) : (
          tests.map((test) => (
            <div key={test.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-indigo-300 transition-colors">
              
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-[#020F33]">{test.title}</h3>
                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                      {test.subject ? (
                        <><span className="w-2 h-2 rounded-full" style={{backgroundColor: test.subject.icon_color}}></span> {test.subject.title}</>
                      ) : (
                        <><Award size={12} className="text-indigo-500"/> Full Model Test</>
                      )}
                      <span className="mx-1">•</span>
                      {new Date(test.date_taken).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(test.id)} className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* Visual Progress Bar representing Right, Wrong, Skipped */}
                <div className="flex h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mt-4">
                  <div className="bg-emerald-500" style={{ width: `${(test.right_answers / test.total_questions) * 100}%` }}></div>
                  <div className="bg-rose-500" style={{ width: `${(test.wrong_answers / test.total_questions) * 100}%` }}></div>
                  <div className="bg-slate-300" style={{ width: `${(test.skipped / test.total_questions) * 100}%` }}></div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto md:border-l md:border-slate-100 md:pl-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1 flex items-center justify-center gap-1"><CheckCircle2 size={10}/> Right</p>
                  <p className="text-sm font-black text-[#020F33]">{test.right_answers}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-rose-600 uppercase mb-1 flex items-center justify-center gap-1"><XCircle size={10}/> Wrong</p>
                  <p className="text-sm font-black text-[#020F33]">{test.wrong_answers}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-center gap-1"><MinusCircle size={10}/> Skip</p>
                  <p className="text-sm font-black text-[#020F33]">{test.skipped}</p>
                </div>
                <div className="text-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase mb-0.5">Score</p>
                  <p className="text-xl font-black text-indigo-700">{test.obtained_marks}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}