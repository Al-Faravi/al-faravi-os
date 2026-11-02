import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Book, BookOpen, ScrollText, PenTool, 
  BarChart2, ArrowLeft, Search, Bookmark, 
  PlayCircle, PauseCircle, CheckCircle2, Moon, Loader2
} from 'lucide-react';

export default function AlHikmahWorkspace() {
  const [activeTab, setActiveTab] = useState<'quran' | 'hadith' | 'hifz' | 'library' | 'journal'>('quran');

  // --- Real Data States ---
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [ayahs, setAyahs] = useState<any[]>([]);
  
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Audio Player States ---
  const [playingAyah, setPlayingAyah] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ১. পেজ লোড হলে ডাটাবেস থেকে ১১৪টি সূরা নিয়ে আসা
  useEffect(() => {
    const fetchSurahs = async () => {
      setLoadingSurahs(true);
      const { data, error } = await supabase
        .from('quran_surahs')
        .select('*')
        .order('id', { ascending: true });
        
      if (data && data.length > 0) {
        setSurahs(data);
        setSelectedSurah(data[0]); // ডিফল্টভাবে সূরা ফাতিহা সিলেক্ট থাকবে
      }
      setLoadingSurahs(false);
    };
    fetchSurahs();
  }, []);

  // ২. কোনো সূরা সিলেক্ট করলে তার আয়াতগুলো নিয়ে আসা
  useEffect(() => {
    const fetchAyahs = async () => {
      if (!selectedSurah) return;
      setLoadingAyahs(true);
      const { data, error } = await supabase
        .from('quran_ayahs')
        .select('*')
        .eq('surah_id', selectedSurah.id)
        .order('ayah_number', { ascending: true });
        
      if (data) setAyahs(data);
      setLoadingAyahs(false);
    };
    fetchAyahs();
  }, [selectedSurah]);

  // ৩. অডিও প্লেব্যাক কন্ট্রোলার (EveryAyah CDN ব্যবহার করে)
  const toggleAudio = (surahId: number, ayahNum: number) => {
    const ayahKey = `${surahId}-${ayahNum}`;
    
    // যদি আগে থেকেই এই আয়াতটি প্লে হতে থাকে, তবে পজ (Pause) করো
    if (playingAyah === ayahKey) {
      audioRef.current?.pause();
      setPlayingAyah(null);
      return;
    }

    // আগের কোনো অডিও চললে তা থামিয়ে দাও
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // EveryAyah থেকে ডাইরেক্ট অডিও লিংক জেনারেট (3-digit padding)
    const sId = String(surahId).padStart(3, '0');
    const aId = String(ayahNum).padStart(3, '0');
    const audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${sId}${aId}.mp3`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setPlayingAyah(ayahKey);
    
    audio.play();
    
    // অডিও শেষ হলে অটোমেটিক প্লেয়িং স্টেট রিমুভ করো
    audio.onended = () => {
      setPlayingAyah(null);
    };
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name_arabic.includes(searchQuery)
  );

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
            
            {/* 1. Surah List Sidebar */}
            <div className="w-80 bg-white border-r border-emerald-100/50 flex flex-col shrink-0">
              <div className="p-4">
                <div className="bg-[#FDFCF7] border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Search size={16} className="text-emerald-300" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Surah..." 
                    className="bg-transparent border-none outline-none text-sm w-full text-emerald-900 placeholder:text-emerald-300" 
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loadingSurahs ? (
                  <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-400" /></div>
                ) : (
                  filteredSurahs.map(surah => (
                    <div 
                      key={surah.id} 
                      onClick={() => setSelectedSurah(surah)}
                      className={`p-3 rounded-xl flex items-center justify-between cursor-pointer group transition-colors border ${selectedSurah?.id === surah.id ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-emerald-50/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedSurah?.id === surah.id ? 'bg-emerald-600 text-white' : 'bg-emerald-100/50 text-emerald-600'}`}>
                          {surah.id}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">{surah.name_english}</h4>
                          <p className="text-[10px] text-emerald-600/60 uppercase font-semibold">{surah.revelation_type} • {surah.total_ayahs} Ayahs</p>
                        </div>
                      </div>
                      <span className="text-lg text-emerald-800/80 font-arabic">{surah.name_arabic}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Ayah Reading Area */}
            <div className="flex-1 flex flex-col bg-[#FDFCF7]">
              {selectedSurah && (
                <>
                  <div className="px-8 py-6 border-b border-emerald-100/50 bg-white flex justify-between items-center z-10 shadow-sm">
                    <div>
                      <h2 className="text-2xl font-black text-emerald-950">{selectedSurah.name_english} <span className="font-arabic font-normal ml-2 opacity-80 text-2xl">{selectedSurah.name_arabic}</span></h2>
                      <p className="text-xs font-bold text-emerald-600/60 mt-1">{selectedSurah.name_bengali} • Revealed in {selectedSurah.revelation_type}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    {/* Bismillah Header (Except Surah At-Tawbah) */}
                    {selectedSurah.id !== 9 && (
                      <div className="flex justify-center mb-8">
                        <h2 className="text-3xl font-arabic text-emerald-800 opacity-90 py-4" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </h2>
                      </div>
                    )}

                    {loadingAyahs ? (
                      <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
                    ) : (
                      <div className="max-w-4xl mx-auto">
                        {ayahs.map(ayah => {
                          const isPlaying = playingAyah === `${ayah.surah_id}-${ayah.ayah_number}`;
                          
                          // Handle Bismillah in Al-Fatihah (Ayah 1) vs other Surahs
                          let displayArabicText = ayah.text_arabic;
                          if (ayah.surah_id !== 1 && ayah.ayah_number === 1 && displayArabicText.startsWith("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ")) {
                            displayArabicText = displayArabicText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
                          }

                          return (
                            <div key={ayah.id} className={`bg-white p-6 md:p-8 rounded-2xl border transition-all duration-300 shadow-sm mb-6 relative group ${isPlaying ? 'border-emerald-400 ring-4 ring-emerald-50' : 'border-emerald-100/50 hover:border-emerald-200'}`}>
                              
                              <div className={`absolute -left-3 top-6 w-8 h-8 rounded-full border-4 border-[#FDFCF7] flex items-center justify-center text-[10px] font-black transition-colors ${isPlaying ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                {ayah.ayah_number}
                              </div>
                              
                              <div className="flex flex-col gap-6">
                                <p className="text-3xl md:text-4xl text-right font-arabic leading-loose text-emerald-950" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif', lineHeight: '2.2' }}>
                                  {displayArabicText}
                                </p>
                                
                                <div className="w-full h-px bg-emerald-50"></div>
                                
                                <div>
                                  <p className="text-sm md:text-base text-emerald-800 leading-relaxed font-medium">
                                    {ayah.text_bengali}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-6 flex flex-wrap gap-2">
                                <button 
                                  onClick={() => toggleAudio(ayah.surah_id, ayah.ayah_number)}
                                  className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${isPlaying ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                >
                                  {isPlaying ? <PauseCircle size={14}/> : <PlayCircle size={14}/>} 
                                  {isPlaying ? 'Pause Audio' : 'Play Ayah'}
                                </button>
                                
                                <button className="text-xs font-bold bg-slate-50 text-slate-500 px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Bookmark size={14}/> Memorized
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* === HIFZ TRACKER PLACEHOLDER === */}
        {activeTab === 'hifz' && (
           <div className="flex-1 p-8 overflow-y-auto">
             <h2 className="text-2xl font-black text-emerald-950 mb-6">Hifz & Revision Tracker</h2>
             <p className="text-emerald-600">Database connected. Hifz logging UI will be built here next.</p>
           </div>
        )}

        {/* অন্যান্য ট্যাবের জন্য Placeholder */}
        {['hadith', 'library', 'journal'].includes(activeTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-emerald-300">
            <Moon size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-emerald-700 capitalize">{activeTab} Module</h2>
            <p className="text-sm text-emerald-600/60 mt-2">Coming Soon...</p>
          </div>
        )}

      </div>
    </div>
  );
}