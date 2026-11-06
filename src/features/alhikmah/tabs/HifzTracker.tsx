import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  BarChart2, CheckCircle2, AlertCircle, 
  BookOpen, BrainCircuit, Loader2, ArrowRight,
  Search, Menu, X, ArrowLeft, RefreshCw, Smile, Meh, Frown
} from 'lucide-react';

export default function HifzTracker() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [hifzRecords, setHifzRecords] = useState<any[]>([]);
  const [activeSurahs, setActiveSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [displayAyahs, setDisplayAyahs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState({ memorized: 0, needsRevision: 0 });

  // ১. ডাটাবেস থেকে ইউজারের হিফজ রেকর্ড এবং সূরাগুলো নিয়ে আসা
  const fetchHifzData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // ইউজারের ট্র্যাকিং ডাটা আনা
    const { data: trackingData } = await supabase
      .from('hifz_tracking')
      .select('*')
      .eq('user_id', user.id);

    if (trackingData && trackingData.length > 0) {
      setHifzRecords(trackingData);

      // কতগুলো রিভিশন দেওয়া লাগবে তার হিসাব (আজকের ডেট পার হয়ে গেলে)
      const today = new Date().toISOString().split('T')[0];
      const pendingRev = trackingData.filter(t => t.next_review_date && t.next_review_date <= today).length;
      setStats({ memorized: trackingData.length, needsRevision: pendingRev });

      // যে সূরাগুলোতে অন্তত ১টি আয়াত মুখস্থ আছে, সেগুলোর আইডি বের করা
      const uniqueSurahIds = Array.from(new Set(trackingData.map(t => t.surah_id)));

      // ওই নির্দিষ্ট সূরাগুলোর ডিটেইলস ডাটাবেস থেকে আনা
      const { data: surahsData } = await supabase
        .from('quran_surahs')
        .select('*')
        .in('id', uniqueSurahIds)
        .order('id', { ascending: true });

      if (surahsData) setActiveSurahs(surahsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHifzData();
  }, []);

  // ২. কোনো সূরা সিলেক্ট করলে শুধু তার মুখস্থ করা আয়াতগুলো নিয়ে আসা
  useEffect(() => {
    const fetchSpecificAyahs = async () => {
      if (!selectedSurah) return;
      setLoading(true);

      // এই সূরার কোন কোন আয়াত মুখস্থ আছে?
      const ayahNumbers = hifzRecords
        .filter(t => t.surah_id === selectedSurah.id)
        .map(t => parseInt(t.ayah_range));

      // শুধু ওই আয়াতগুলোই ডাটাবেস থেকে আনা
      const { data: ayahsData } = await supabase
        .from('quran_ayahs')
        .select('*')
        .eq('surah_id', selectedSurah.id)
        .in('ayah_number', ayahNumbers)
        .order('ayah_number', { ascending: true });

      if (ayahsData) {
        // ডুপ্লিকেট রিমুভার
        const uniqueAyahs = Array.from(new Map(ayahsData.map(item => [item.ayah_number, item])).values());
        setDisplayAyahs(uniqueAyahs);
      }
      setLoading(false);
    };

    fetchSpecificAyahs();
  }, [selectedSurah, hifzRecords]);

  // ৩. Spaced Repetition (SRS) লজিক
  const updateRevision = async (ayahNumber: number, quality: 'perfect' | 'good' | 'hard') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedSurah) return;

    let daysToAdd = 1;
    if (quality === 'perfect') daysToAdd = 7;
    else if (quality === 'good') daysToAdd = 3;
    else if (quality === 'hard') daysToAdd = 1;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    // ডাটাবেসে রিভিশন ডেট আপডেট করা
    await supabase
      .from('hifz_tracking')
      .update({ next_review_date: nextDate, last_reviewed: new Date() })
      .match({ user_id: user.id, surah_id: selectedSurah.id, ayah_range: String(ayahNumber) });

    // লোকাল স্টেট আপডেট করা যাতে রিফ্রেশ না করেই UI তে চেঞ্জ দেখা যায়
    setHifzRecords(prev => prev.map(record => {
      if (record.surah_id === selectedSurah.id && record.ayah_range === String(ayahNumber)) {
        return { ...record, next_review_date: nextDate.toISOString().split('T')[0] };
      }
      return record;
    }));
    
    alert(`Mashallah! Next revision set for ${daysToAdd} day(s) later.`);
  };

  const filteredSurahs = activeSurahs.filter(s => 
    s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name_arabic.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex h-full relative w-full overflow-hidden">
      
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* 1. Sidebar (Only Memorized Surahs) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 md:w-80 bg-white border-r border-emerald-100/50 flex flex-col h-full transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-emerald-50 lg:border-none flex justify-between items-center bg-white">
          <div className="bg-[#FDFCF7] border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2 flex-1">
            <Search size={16} className="text-emerald-300" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search My Hifz..." className="bg-transparent border-none outline-none text-sm w-full text-emerald-900" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-2 p-2 text-emerald-400 hover:bg-emerald-50 rounded-lg"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {/* Dashboard Button */}
          <div 
            onClick={() => { setSelectedSurah(null); setIsSidebarOpen(false); }}
            className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors border mb-2 ${!selectedSurah ? 'bg-emerald-600 text-white shadow-md' : 'border-transparent hover:bg-emerald-50 text-emerald-700'}`}
          >
            <BrainCircuit size={18} />
            <span className="font-bold text-sm">Overview Dashboard</span>
          </div>

          <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest px-3 py-2 mt-2">Memorized Surahs</div>

          {activeSurahs.length === 0 && !loading && (
            <div className="p-4 text-center text-emerald-500/70 text-xs font-bold">No surahs memorized yet. Mark ayahs in Al-Quran tab first!</div>
          )}

          {filteredSurahs.map(surah => {
            const ayahCount = hifzRecords.filter(t => t.surah_id === surah.id).length;
            return (
              <div key={surah.id} onClick={() => { setSelectedSurah(surah); setIsSidebarOpen(false); }} className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer group transition-colors border ${selectedSurah?.id === surah.id ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-emerald-50/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${selectedSurah?.id === surah.id ? 'bg-emerald-600 text-white' : 'bg-emerald-100/50 text-emerald-600'}`}>{surah.id}</div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-emerald-950 truncate">{surah.name_english}</h4>
                    <p className="text-[9px] text-emerald-600/60 uppercase font-bold truncate">{ayahCount} Ayahs Memorized</p>
                  </div>
                </div>
                <span className="text-base text-emerald-800/80 font-arabic shrink-0 ml-2">{surah.name_arabic}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Area (Dashboard OR Specific Memorized Ayahs) */}
      <div className="flex-1 flex flex-col bg-[#FDFCF7] h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <div className="lg:hidden px-4 py-3 border-b border-emerald-100/50 bg-white flex items-center gap-3 z-10 shadow-sm shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 -ml-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"><Menu size={20}/></button>
          <h2 className="text-lg font-black text-emerald-950 flex items-center gap-2">
            {selectedSurah ? selectedSurah.name_english : 'Overview Dashboard'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
          
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
          ) : !selectedSurah ? (
            
            /* ================= DASHBOARD VIEW (Heatmap & Stats) ================= */
            <div className="max-w-5xl mx-auto pb-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={28}/></div>
                  <div>
                    <h3 className="text-3xl lg:text-4xl font-black text-emerald-950 leading-none mb-1">{stats.memorized}</h3>
                    <p className="text-[10px] lg:text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Ayahs</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><AlertCircle size={28}/></div>
                  <div>
                    <h3 className="text-3xl lg:text-4xl font-black text-rose-950 leading-none mb-1">{stats.needsRevision}</h3>
                    <p className="text-[10px] lg:text-xs font-bold text-rose-600 uppercase tracking-wider">Needs Revision</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><BookOpen size={28}/></div>
                  <div>
                    <h3 className="text-3xl lg:text-4xl font-black text-indigo-950 leading-none mb-1">{activeSurahs.length}</h3>
                    <p className="text-[10px] lg:text-xs font-bold text-indigo-600 uppercase tracking-wider">Surahs Touched</p>
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-lg font-black text-emerald-950 flex items-center gap-2">
                    <BarChart2 size={18} className="text-emerald-500" /> Hifz Heatmap (114 Surahs)
                  </h3>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-2 lg:gap-3">
                  {Array.from({ length: 114 }).map((_, i) => {
                    const sId = i + 1;
                    const isActive = activeSurahs.some(s => s.id === sId);
                    return (
                      <div key={i} title={`Surah ${sId}`} className={`aspect-square border rounded-lg flex items-center justify-center text-[10px] lg:text-xs font-black cursor-help transition-all ${isActive ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-300'}`}>
                        {sId}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          ) : (

            /* ================= SPECIFIC SURAH REVISION VIEW ================= */
            <div className="max-w-4xl mx-auto space-y-4 pb-20">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-6 flex justify-between items-center">
                <h3 className="text-emerald-900 font-bold">Revision Mode: {selectedSurah.name_english}</h3>
                <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-full">{displayAyahs.length} Ayahs</span>
              </div>

              {displayAyahs.map(ayah => {
                const record = hifzRecords.find(t => t.surah_id === ayah.surah_id && t.ayah_range === String(ayah.ayah_number));
                const today = new Date().toISOString().split('T')[0];
                const needsRev = record?.next_review_date && record.next_review_date <= today;

                let displayArabicText = ayah.text_arabic;
                if (ayah.surah_id !== 1 && ayah.ayah_number === 1 && displayArabicText.startsWith("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ")) {
                  displayArabicText = displayArabicText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
                }

                return (
                  <div key={ayah.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col gap-4 ${needsRev ? 'border-rose-200 ring-2 ring-rose-50' : 'border-emerald-100/50'}`}>
                    
                    <div className="flex justify-between items-start gap-4">
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black text-white ${needsRev ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                        {ayah.ayah_number}
                      </div>
                      <p className="text-2xl lg:text-3xl text-right font-arabic leading-[1.8] text-emerald-950 flex-1" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                        {displayArabicText}
                      </p>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100 my-1"></div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="text-[10px] font-bold text-slate-400">
                        Next Review: <span className={needsRev ? 'text-rose-500' : 'text-emerald-500'}>{record?.next_review_date || 'N/A'}</span>
                      </div>
                      
                      {/* SRS Grading Buttons */}
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => updateRevision(ayah.ayah_number, 'hard')} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-100">
                          <Frown size={14}/> Hard
                        </button>
                        <button onClick={() => updateRevision(ayah.ayah_number, 'good')} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-100">
                          <Meh size={14}/> Good
                        </button>
                        <button onClick={() => updateRevision(ayah.ayah_number, 'perfect')} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100">
                          <Smile size={14}/> Perfect
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}