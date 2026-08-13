import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, Plus, Building2, ExternalLink, Trash2, Loader2 } from 'lucide-react';

interface Job {
  id: string;
  company: string;
  role: string;
  status: string;
  notes: string;
}

const STATUSES = ['Applied', 'Interviewing', 'Offered', 'Rejected'];
const STATUS_COLORS: any = {
  'Applied': 'bg-blue-100 text-blue-700 border-blue-200',
  'Interviewing': 'bg-amber-100 text-amber-700 border-amber-200',
  'Offered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-rose-100 text-rose-700 border-rose-200'
};

export default function JobTracker() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form States
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Applied');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('job_applications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setJobs(data || []); setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('job_applications').insert([{ user_id: user?.id, company, role, status, notes }]).select().single();
    if (!error && data) {
      setJobs([data, ...jobs]);
      setShowForm(false); setCompany(''); setRole(''); setNotes(''); setStatus('Applied');
    }
    setIsSaving(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
    await supabase.from('job_applications').update({ status: newStatus }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this application?")) return;
    setJobs(jobs.filter(j => j.id !== id));
    await supabase.from('job_applications').delete().eq('id', id);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto text-[#020F33] min-h-screen">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner shrink-0"><Briefcase size={28} /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">Job Tracker</h1>
            <p className="text-[#475569] font-medium text-sm">Manage your career and applications.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md">
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Job'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm mb-8 animate-in slide-in-from-top-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Company Name</label>
              <input required value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google, Brain Station" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Role / Position</label>
              <input required value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. MERN Stack Developer" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#475569] mb-1.5 ml-1">Notes / Links (Optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Job post link or short note..." className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
            {isSaving ? <Loader2 className="animate-spin" size={18}/> : 'Save Application'}
          </button>
        </form>
      )}

      {/* Kanban Board View */}
      {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-500" size={32}/></div> 
      : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {STATUSES.map(colStatus => (
            <div key={colStatus} className="bg-[#F8FAFC] rounded-3xl p-4 border border-[#E2E8F0] min-h-[300px]">
              <h3 className="font-black text-sm uppercase tracking-wider text-[#475569] mb-4 pb-2 border-b border-[#E2E8F0] flex justify-between">
                {colStatus} <span className="bg-slate-200 text-slate-600 px-2 rounded-full">{jobs.filter(j => j.status === colStatus).length}</span>
              </h3>
              
              <div className="flex flex-col gap-3">
                {jobs.filter(j => j.status === colStatus).map(job => (
                  <div key={job.id} className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm hover:border-emerald-300 transition-colors group relative">
                    <h4 className="font-bold text-[#020F33] text-base mb-1">{job.role}</h4>
                    <p className="text-xs font-bold text-[#475569] flex items-center gap-1.5 mb-3"><Building2 size={12}/> {job.company}</p>
                    
                    {job.notes && <p className="text-[10px] text-[#94A3B8] truncate mb-3 bg-slate-50 p-1.5 rounded">{job.notes}</p>}
                    
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <select 
                        value={job.status} 
                        onChange={e => updateStatus(job.id, e.target.value)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border outline-none cursor-pointer ${STATUS_COLORS[job.status]}`}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      
                      <button onClick={() => handleDelete(job.id)} className="text-[#CBD5E1] hover:text-rose-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}