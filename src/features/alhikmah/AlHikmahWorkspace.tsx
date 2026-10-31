import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, BookOpen, ScrollText, PenTool, 
  BarChart2, ArrowLeft, Search, Bookmark, 
  PlayCircle, CheckCircle2, ChevronRight, Moon
} from 'lucide-react';

export default function AlHikmahWorkspace() {
  const [activeTab, setActiveTab] = useState<'quran' | 'hadith' | 'hifz' | 'library' | 'journal'>('quran');

  // ডামি ডাটা (UI দেখার জন্য, পরে ডাটাবেস থেকে আসবে)
  const dummySurahs = [
    { id: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', ayahs: 7, type: 'Makki' },
    { id: 2, name: 'Al-Baqarah', arabic: 'البقرة', ayahs: 286, type: 'Madani' },
    { id: 3, name: 'Ali \'Imran', arabic: 'آل عمران', ayahs: 200, type: 'Madani' },
    { id: 67, name: 'Al-Mulk', arabic: 'الملك', ayahs: 30, type: 'Makki' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col font-sans">
      
      {/* ================= TOP NAVBAR ================= */}
      <div className="bg-white border-b border-emerald-100/50 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-emerald-950 flex items-center gap-2">
              <Moon size={20} className="text-emerald-500 fill-emerald-500/20" /> 
              Al-Hikmah
            </h1>
            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-0.5">Deen & Knowledge Workspace</p>
          </div>
        </div>
        
        <div className="hidden lg:flex bg-emerald-50/50 border border-emerald-100 rounded-2xl p-1">
          {[
            { id: 'quran', name: 'Al-Quran', icon: <Book size={14} /> },
            { id: 'hadith', name: 'Hadith', icon: <BookOpen size={14} /> },
            { id: 'hifz', name: 'Hifz Tracker', icon: <BarChart2 size={14} /> },
            { id: 'library', name: 'Library', icon: <ScrollText size={14} /> },
            { id: 'journal', name: 'Journal', icon: <PenTool size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-emerald-700/60 hover:text-emerald-700 hover:bg-emerald-100/50'
              }`}
            >
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* === QURAN WORKSPACE === */}
        {activeTab === 'quran' && (
          <div className="flex-1 flex">
            {/* Surah List Sidebar */}
            <div className="w-80 bg-white border-r border-emerald-100/50 flex flex-col shrink-0">
              <div className="p-4">
                <div className="bg-[#FDFCF7] border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Search size={16} className="text-emerald-300" />
                  <input type="text" placeholder="Search Surah..." className="bg-transparent border-none outline-none text-sm w-full text-emerald-900 placeholder:text-emerald-300" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {dummySurahs.map(surah => (
                  <div key={surah.id} className="p-3 rounded-xl hover:bg-emerald-50 flex items-center justify-between cursor-pointer group transition-colors border border-transparent hover:border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100/50 flex items-center justify-center text-xs font-bold text-emerald-600">
                        {surah.id}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-950">{surah.name}</h4>
                        <p className="text-[10px] text-emerald-600/60 uppercase font-semibold">{surah.type} • {surah.ayahs} Ayahs</p>
                      </div>
                    </div>
                    <span className="text-lg text-emerald-800/80 font-arabic">{surah.arabic}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ayah Reading Area */}
            <div className="flex-1 flex flex-col bg-[#FDFCF7]">
              <div className="px-8 py-6 border-b border-emerald-100/50 bg-white flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-emerald-950">Surah Al-Mulk</h2>
                  <p className="text-xs font-bold text-emerald-600/60">Revealed in Makkah</p>
                </div>
                <button className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-bold border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-colors">
                  <PlayCircle size={16} /> Play Audio
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* Dummy Ayah 1 */}
                <div className="bg-white p-6 rounded-2xl border border-emerald-100/50 shadow-sm mb-6 group relative">
                  <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-emerald-100 border-4 border-[#FDFCF7] flex items-center justify-center text-[9px] font-black text-emerald-600">1</div>
                  
                  <div className="flex flex-col gap-6">
                    <p className="text-3xl text-right font-arabic leading-loose text-emerald-950" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                      تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ
                    </p>
                    <div className="w-full h-px bg-emerald-50"></div>
                    <div>
                      <p className="text-sm text-emerald-800 leading-relaxed font-medium mb-1">
                        পুণ্যময় তিনি, যাঁর হাতে রাজত্ব। তিনি সবকিছুর ওপর সর্বশক্তিমান।
                      </p>
                      <p className="text-xs text-emerald-600/60 italic">
                        Blessed is He in whose hand is dominion, and He is over all things competent.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-100"><Bookmark size={12}/> Mark Hifz</button>
                    <button className="text-[10px] font-bold bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-100"><PenTool size={12}/> Add Note</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === HIFZ TRACKER PLACEHOLDER === */}
        {activeTab === 'hifz' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-2xl font-black text-emerald-950 mb-6">Hifz & Revision Tracker</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4"><CheckCircle2 size={24}/></div>
                <h3 className="text-3xl font-black text-emerald-950">14</h3>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Surahs Memorized</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4"><BookOpen size={24}/></div>
                <h3 className="text-3xl font-black text-rose-950">3</h3>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Needs Revision Today</p>
              </div>
            </div>
          </div>
        )}

        {/* অন্যান্য ট্যাবের জন্য Placeholder */}
        {['hadith', 'library', 'journal'].includes(activeTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-emerald-300">
            <Moon size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-emerald-700 capitalize">{activeTab} Module</h2>
            <p className="text-sm text-emerald-600/60 mt-2">API Integration & UI coming in the next step...</p>
          </div>
        )}

      </div>
    </div>
  );
}