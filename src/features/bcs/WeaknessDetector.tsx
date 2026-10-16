import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, AlertTriangle, Loader2, ShieldCheck, 
  Activity, Target, AlertOctagon, TrendingDown, TrendingUp
} from 'lucide-react';

interface SubjectAnalytics {
  id: string;
  title: string;
  icon_color: string;
  total_tests: number;
  total_questions: number;
  total_mistakes: number;
  avg_score_pct: number;
  accuracy: number;
  status: 'danger' | 'warning' | 'safe' | 'untested';
}

export default function WeaknessDetector() {
  const [analytics, setAnalytics] = useState<SubjectAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch subjects and mock tests
      const { data: subjects } = await supabase.from('bcs_subjects').select('*');
      const { data: tests } = await supabase.from('bcs_mock_tests').select('*').eq('user_id', user.id).not('subject_id', 'is', null);

      if (subjects && tests) {
        const stats = subjects.map(sub => {
          const subTests = tests.filter(t => t.subject_id === sub.id);
          const total_tests = subTests.length;
          
          if (total_tests === 0) {
            return { id: sub.id, title: sub.title, icon_color: sub.icon_color, total_tests: 0, total_questions: 0, total_mistakes: 0, avg_score_pct: 0, accuracy: 0, status: 'untested' as const };
          }

          const total_questions = subTests.reduce((acc, t) => acc + t.total_questions, 0);
          const total_obtained = subTests.reduce((acc, t) => acc + t.obtained_marks, 0);
          const total_right = subTests.reduce((acc, t) => acc + t.right_answers, 0);
          const total_mistakes = subTests.reduce((acc, t) => acc + t.wrong_answers, 0);

          // Calculate Percentages
          const avg_score_pct = total_questions > 0 ? (total_obtained / total_questions) * 100 : 0;
          const accuracy = total_questions > 0 ? (total_right / total_questions) * 100 : 0;

          // Determine Status based on Score Percentage
          let status: 'danger' | 'warning' | 'safe' = 'safe';
          if (avg_score_pct < 50) status = 'danger'; // Less than 50% score is Danger
          else if (avg_score_pct < 70) status = 'warning'; // 50-70% is Warning

          return {
            id: sub.id,
            title: sub.title,
            icon_color: sub.icon_color,
            total_tests,
            total_questions,
            total_mistakes,
            avg_score_pct: Math.max(0, avg_score_pct), // Prevent negative percentage display
            accuracy,
            status
          };
        });

        // Sort: Danger first, then Warning, then Safe, then Untested
        const order = { danger: 1, warning: 2, safe: 3, untested: 4 };
        stats.sort((a, b) => {
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
          return a.avg_score_pct - b.avg_score_pct; // If same status, lowest score comes first
        });

        setAnalytics(stats);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const dangerSubjects = analytics.filter(s => s.status === 'danger');
  const warningSubjects = analytics.filter(s => s.status === 'warning');
  const safeSubjects = analytics.filter(s => s.status === 'safe');
  const untestedSubjects = analytics.filter(s => s.status === 'untested');

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-red-500" size={40} /></div>;

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="z-10">
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={36} /> Danger Zone Detector
            </h1>
            <p className="text-[#475569] mt-2 font-medium">AI-driven analysis based on your Mock Test performance.</p>
          </div>
          <div className="z-10 bg-red-50 border border-red-100 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-inner">
            <Activity className="text-red-500" size={24} />
            <div>
              <p className="text-xs font-bold text-red-600 uppercase">Critical Subjects</p>
              <p className="text-2xl font-black text-red-700">{dangerSubjects.length}</p>
            </div>
          </div>
        </div>
      </div>

      {analytics.every(a => a.status === 'untested') ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <Target size={64} className="mx-auto mb-6 text-slate-300" />
          <h2 className="text-2xl font-bold mb-2">No Analytics Available Yet</h2>
          <p className="text-[#475569] mb-6">Take some subject-wise mock tests to activate the Danger Zone Detector.</p>
          <Link to="/bcs/mock-tests" className="bg-[#020F33] text-white px-6 py-3 rounded-xl font-bold inline-block hover:bg-red-500 transition-colors">
            Go to Mock Tests
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* 🔴 DANGER ZONE */}
          {dangerSubjects.length > 0 && (
            <section>
              <h2 className="text-xl font-black flex items-center gap-2 text-red-600 mb-4 border-b border-red-100 pb-2">
                <AlertOctagon size={24} /> Critical Danger Zone (Score &lt; 50%)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dangerSubjects.map(sub => (
                  <div key={sub.id} className="bg-white border-2 border-red-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-red-400 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -z-0 opacity-50 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-black text-[#020F33] mb-3 flex items-start gap-2">
                        <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{backgroundColor: sub.icon_color}}></span>
                        {sub.title}
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-red-50 p-2 text-center rounded-lg">
                          <p className="text-[10px] font-bold text-red-500 uppercase">Avg Score</p>
                          <p className="text-lg font-black text-red-600 flex justify-center items-center gap-1"><TrendingDown size={14}/> {sub.avg_score_pct.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-50 p-2 text-center rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Accuracy</p>
                          <p className="text-lg font-black text-slate-700">{sub.accuracy.toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-50 p-2 text-center rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Mistakes</p>
                          <p className="text-lg font-black text-slate-700">{sub.total_mistakes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🟡 WARNING ZONE */}
          {warningSubjects.length > 0 && (
            <section>
              <h2 className="text-xl font-black flex items-center gap-2 text-amber-500 mb-4 border-b border-amber-100 pb-2">
                <AlertTriangle size={24} /> Warning Zone (Score 50% - 70%)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warningSubjects.map(sub => (
                  <div key={sub.id} className="bg-white border border-amber-200 p-4 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-[#020F33] mb-3 text-sm truncate">{sub.title}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-500">Average Score</span>
                      <span className="text-sm font-black text-amber-600">{sub.avg_score_pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${sub.avg_score_pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 🟢 SAFE ZONE */}
          {safeSubjects.length > 0 && (
            <section>
              <h2 className="text-xl font-black flex items-center gap-2 text-emerald-500 mb-4 border-b border-emerald-100 pb-2">
                <ShieldCheck size={24} /> Safe Zone (Score &gt; 70%)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {safeSubjects.map(sub => (
                  <div key={sub.id} className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                    <h3 className="font-bold text-[#020F33] text-sm flex items-center gap-2 truncate">
                      <CheckCircle size={16} className="text-emerald-500 shrink-0"/> {sub.title}
                    </h3>
                    <span className="text-sm font-black text-emerald-600 flex items-center gap-1">
                      {sub.avg_score_pct.toFixed(1)}% <TrendingUp size={14}/>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ⚪ UNTESTED */}
          {untestedSubjects.length > 0 && (
            <section className="opacity-70">
              <h2 className="text-sm font-black flex items-center gap-2 text-slate-400 mb-4 uppercase tracking-wider">
                Untested Subjects (No Data)
              </h2>
              <div className="flex flex-wrap gap-2">
                {untestedSubjects.map(sub => (
                  <span key={sub.id} className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg">
                    {sub.title}
                  </span>
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}

// Quick helper icon for Safe Zone
function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}