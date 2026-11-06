import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  BarChart2, CheckCircle2, AlertCircle, 
  BookOpen, BrainCircuit, Loader2, ArrowRight
} from 'lucide-react';

export default function HifzTracker() {
  const [loading, setLoading] = useState(true);
  const [memorizedCount, setMemorizedCount] = useState(0);
  const [revisionCount, setRevisionCount] = useState(0);

  // আমরা পরে এখানে ডাটাবেস থেকে রিয়েল ডাটা ফেচ করব
  useEffect(() => {
    // ডামি লোডিং ইফেক্ট (ডাটাবেস কানেকশনের জন্য)
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 p-5 lg:p-10 overflow-y-auto bg-[#FDFCF7] custom-scrollbar w-full">
      <div className="max-w-6xl mx-auto pb-24">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 lg:mb-10">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
            <BrainCircuit size={24} />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-emerald-950 tracking-tight">Hifz & Revision Tracker</h2>
            <p className="text-xs lg:text-sm font-bold text-emerald-600/70 mt-1 uppercase tracking-widest">Smart Spaced Repetition System</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-10">
          <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 size={28}/></div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-black text-emerald-950 leading-none mb-1">{loading ? '-' : memorizedCount}</h3>
              <p className="text-[10px] lg:text-xs font-bold text-emerald-600 uppercase tracking-wider">Ayahs Memorized</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0"><AlertCircle size={28}/></div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-black text-rose-950 leading-none mb-1">{loading ? '-' : revisionCount}</h3>
              <p className="text-[10px] lg:text-xs font-bold text-rose-600 uppercase tracking-wider">Needs Revision</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><BookOpen size={28}/></div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-black text-indigo-950 leading-none mb-1">114</h3>
              <p className="text-[10px] lg:text-xs font-bold text-indigo-600 uppercase tracking-wider">Total Surahs</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Today's Revision Inbox */}
          <div className="lg:col-span-1 bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-emerald-950 flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-500" /> Today's Target
              </h3>
              <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded-md">Urgent</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-emerald-50 rounded-xl bg-[#FDFCF7]/50">
              <CheckCircle2 size={40} className="text-emerald-200 mb-4" />
              <p className="text-sm font-bold text-emerald-800">You are all caught up!</p>
              <p className="text-xs text-emerald-600/60 mt-2 max-w-[200px] leading-relaxed">
                No ayahs are pending for revision today. Keep memorizing new ayahs!
              </p>
              <button className="mt-6 flex items-center gap-2 text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition-colors">
                Memorize More <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Quran Heatmap (114 Surahs Visual) */}
          <div className="lg:col-span-2 bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-black text-emerald-950 flex items-center gap-2">
                <BarChart2 size={18} className="text-emerald-500" /> Hifz Heatmap
              </h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></span> None</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300"></span> Partial</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 shadow-sm"></span> Full</div>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-2 lg:gap-3">
              {Array.from({ length: 114 }).map((_, i) => (
                <div 
                  key={i} 
                  title={`Surah ${i + 1}`}
                  className="aspect-square bg-slate-50 border border-slate-100 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex items-center justify-center text-[10px] lg:text-xs font-black text-slate-400 cursor-help"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}