import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Loader2, BookOpen, Database, Target, LineChart, 
  ChevronRight, Plus, FolderOpen, PlayCircle, ExternalLink, FileText
} from 'lucide-react';

export default function SubjectView() {
  const { id } = useParams();
  const [subject, setSubject] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectDetails();
  }, [id]);

  const fetchSubjectDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Subject Info
      const { data: subData } = await supabase.from('bcs_subjects').select('*').eq('id', id).single();
      if (subData) setSubject(subData);

      // 2. Fetch Resources linked to this subject
      const { data: resData } = await supabase.from('bcs_resources').select('*').eq('subject_id', id).order('created_at', { ascending: false });
      if (resData) setResources(resData);

      // 3. Fetch Mock Tests linked to this subject
      const { data: mockData } = await supabase.from('bcs_mock_tests').select('*').eq('subject_id', id).order('date_taken', { ascending: false });
      if (mockData) setMockTests(mockData);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-[#02C2D5]" size={40} /></div>;
  if (!subject) return <div className="text-center py-20 text-slate-500 font-bold">Subject not found.</div>;

  // Mini Analytics for this specific subject
  const avgScore = mockTests.length > 0 
    ? (mockTests.reduce((acc, t) => acc + (t.obtained_marks / t.total_questions) * 100, 0) / mockTests.length).toFixed(1) 
    : '0';

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-10 rounded-3xl border shadow-sm relative overflow-hidden" style={{ borderColor: `${subject.icon_color}30` }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-bl-full -z-0 opacity-10" style={{ backgroundColor: subject.icon_color }}></div>
          <div className="z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 border" style={{ color: subject.icon_color, borderColor: `${subject.icon_color}30`, backgroundColor: `${subject.icon_color}10` }}>
              <BookOpen size={14} /> Total {subject.marks} Marks
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[#020F33] tracking-tight">{subject.title}</h1>
          </div>
          
          <div className="z-10 flex gap-3">
            <div className="bg-white p-4 rounded-2xl border shadow-sm text-center min-w-[100px]" style={{ borderColor: `${subject.icon_color}20` }}>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Score</p>
              <p className="text-2xl font-black" style={{ color: subject.icon_color }}>{avgScore}%</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm text-center min-w-[100px]" style={{ borderColor: `${subject.icon_color}20` }}>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Files Vault</p>
              <p className="text-2xl font-black text-slate-700">{resources.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Resources & Chapters */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/bcs/vault" className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#02C2D5] hover:shadow-md transition-all group">
              <Plus className="text-[#02C2D5] group-hover:scale-110 transition-transform" size={24} />
              <span className="text-xs font-bold">Add PDF/Video</span>
            </Link>
            <Link to="/bcs/mock-tests" className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:shadow-md transition-all group">
              <LineChart className="text-indigo-500 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-xs font-bold">Input Test Result</span>
            </Link>
            <Link to="/bcs/flashcards" className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:shadow-md transition-all group">
              <Target className="text-emerald-500 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-xs font-bold">Create Flashcard</span>
            </Link>
          </div>

          {/* Subject Vault / Resources */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black flex items-center gap-2">
                <FolderOpen className="text-slate-400" size={24} /> Subject Vault
              </h2>
              <Link to="/bcs/vault" className="text-sm font-bold text-[#02C2D5] hover:underline">View All Resources</Link>
            </div>

            {resources.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center">
                <Database size={40} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-500">No resources linked to {subject.title}.</p>
                <p className="text-xs text-slate-400 mt-1">Upload PDFs or Drive links from the Resource Vault.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100">
                  {resources.map(res => (
                    <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                          {res.resource_type === 'pdf' ? <FileText size={18}/> : res.resource_type === 'video_link' ? <PlayCircle size={18}/> : <ExternalLink size={18}/>}
                        </div>
                        <span className="font-bold text-sm text-[#020F33] group-hover:text-[#02C2D5] transition-colors">{res.title}</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mini Dashboard */}
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-indigo-800 mb-4 flex items-center gap-2">
              <LineChart size={16} /> Recent Mock Tests
            </h3>
            {mockTests.length === 0 ? (
              <p className="text-xs font-medium text-indigo-400">No mock tests taken for this subject yet.</p>
            ) : (
              <div className="space-y-3">
                {mockTests.slice(0, 5).map(test => (
                  <div key={test.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center border border-indigo-50">
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[#020F33] truncate">{test.title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(test.date_taken).toLocaleDateString()}</p>
                    </div>
                    <div className="shrink-0 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-xs font-black">
                      {test.obtained_marks}/{test.total_questions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}