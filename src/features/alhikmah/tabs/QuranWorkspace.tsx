import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Search, Bookmark, BookmarkCheck, PlayCircle, PauseCircle, 
  Loader2, Menu, X, ListMusic, PlusCircle, Repeat, Trash2, CheckCircle2
} from 'lucide-react';

export default function QuranWorkspace() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- Data States ---
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Audio & Takrar States ---
  const [playingAyah, setPlayingAyah] = useState<string | null>(null);
  const [isContinuousPlay, setIsContinuousPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [targetQueue, setTargetQueue] = useState<any[]>([]);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [loopLimit, setLoopLimit] = useState<number>(5);
  const [currentLoop, setCurrentLoop] = useState<number>(1);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);

  // --- DB Memorized State ---
  const [memorizedAyahs, setMemorizedAyahs] = useState<Record<string, boolean>>({});

  // ১. পেজ লোড হলে সূরাগুলো নিয়ে আসা
  useEffect(() => {
    const fetchSurahs = async () => {
      setLoadingSurahs(true);
      const { data } = await supabase.from('quran_surahs').select('*').order('id', { ascending: true });
      if (data && data.length > 0) {
        setSurahs(data);
        setSelectedSurah(data[0]);
      }
      setLoadingSurahs(false);
    };
    fetchSurahs();
  }, []);

  // ২. সূরা সিলেক্ট করলে আয়াত এবং ওই সূরার হিফজ স্ট্যাটাস নিয়ে আসা
  useEffect(() => {
    const fetchAyahsAndHifz = async () => {
      if (!selectedSurah) return;
      setLoadingAyahs(true);
      
      // আয়াত ফেচিং
      const { data: ayahData } = await supabase
        .from('quran_ayahs')
        .select('*')
        .eq('surah_id', selectedSurah.id)
        .order('ayah_number', { ascending: true });
        
      if (ayahData) {
        const uniqueAyahs = Array.from(new Map(ayahData.map(item => [item.ayah_number, item])).values());
        setAyahs(uniqueAyahs);
      }

      // হিফজ ট্র্যাকিং স্ট্যাটাস ফেচিং (ডাটাবেস থেকে)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: hifzData } = await supabase
          .from('hifz_tracking')
          .select('*')
          .eq('surah_id', selectedSurah.id)
          .eq('user_id', user.id);
          
        if (hifzData) {
          const hifzMap: Record<string, boolean> = {};
          hifzData.forEach(h => { hifzMap[`${h.surah_id}-${h.ayah_range}`] = true; });
          setMemorizedAyahs(hifzMap);
        }
      }
      setLoadingAyahs(false);
    };
    fetchAyahsAndHifz();
  }, [selectedSurah]);

  // --- Core Audio Logic ---
  const stopAudio = () => {
    if (audioRef.current) { 
      audioRef.current.pause(); 
      audioRef.current.currentTime = 0; 
    }
    setPlayingAyah(null); 
    setIsContinuousPlay(false); 
    setIsQueuePlaying(false);
  };

  const getAudioUrl = (surahId: number, ayahNum: number) => {
    return `https://everyayah.com/data/Alafasy_128kbps/${String(surahId).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;
  };

  const playSingleAudio = (surahId: number, ayahNum: number, continuous: boolean) => {
    stopAudio();
    const audio = new Audio(getAudioUrl(surahId, ayahNum));
    audioRef.current = audio;
    setPlayingAyah(`${surahId}-${ayahNum}`);
    setIsContinuousPlay(continuous);
    
    audio.play();
    audio.onended = () => {
      if (continuous && selectedSurah && ayahNum < selectedSurah.total_ayahs) {
        playSingleAudio(surahId, ayahNum + 1, true);
        document.getElementById(`ayah-${surahId}-${ayahNum + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else { 
        stopAudio(); 
      }
    };
  };

  const toggleFullSurah = () => {
    if (isContinuousPlay) stopAudio();
    else if (selectedSurah) playSingleAudio(selectedSurah.id, 1, true);
  };

  // --- Takrar (Target Queue) Logic ---
  const toggleQueueAyah = (ayah: any) => {
    setTargetQueue(prev => {
      const exists = prev.find(a => a.id === ayah.id);
      if (exists) return prev.filter(a => a.id !== ayah.id);
      return [...prev, ayah].sort((a, b) => a.ayah_number - b.ayah_number);
    });
  };

  const playTargetQueue = (index: number, currentLoopParam: number) => {
    if (targetQueue.length === 0) return;
    stopAudio();
    
    const ayah = targetQueue[index];
    const audio = new Audio(getAudioUrl(ayah.surah_id, ayah.ayah_number));
    audioRef.current = audio;
    setPlayingAyah(`${ayah.surah_id}-${ayah.ayah_number}`);
    setIsQueuePlaying(true); 
    setCurrentQueueIndex(index); 
    setCurrentLoop(currentLoopParam);
    
    audio.play();
    audio.onended = () => {
      if (index + 1 < targetQueue.length) {
        playTargetQueue(index + 1, currentLoopParam);
      } else if (currentLoopParam < loopLimit) {
        playTargetQueue(0, currentLoopParam + 1);
      } else {
        stopAudio();
      }
    };
  };

  // --- Real DB Hifz Insert Logic ---
  const handleMarkHifz = async (ayah: any) => {
    const ayahKey = `${ayah.surah_id}-${ayah.ayah_number}`;
    const isCurrentlyMemorized = memorizedAyahs[ayahKey];
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Please log in to track your Hifz.");
      return;
    }

    if (isCurrentlyMemorized) {
      // Remove from Database
      await supabase.from('hifz_tracking').delete().match({ 
        user_id: user.id, 
        surah_id: ayah.surah_id, 
        ayah_range: String(ayah.ayah_number) 
      });
      setMemorizedAyahs(prev => ({ ...prev, [ayahKey]: false }));
    } else {
      // Insert to Database
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + 1); // Tomorrow for first revision
      await supabase.from('hifz_tracking').insert([{ 
        user_id: user.id, 
        surah_id: ayah.surah_id, 
        ayah_range: String(ayah.ayah_number), 
        status: 'memorized', 
        next_review_date: nextReview 
      }]);
      setMemorizedAyahs(prev => ({ ...prev, [ayahKey]: true }));
    }
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.name_arabic.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex h-full relative w-full">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* 1. Surah List Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 md:w-80 bg-white border-r border-emerald-100/50 flex flex-col h-full transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-emerald-50 lg:border-none flex justify-between items-center bg-white">
          <div className="bg-[#FDFCF7] border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2 flex-1">
            <Search size={16} className="text-emerald-300" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search Surah..." className="bg-transparent border-none outline-none text-sm w-full text-emerald-900" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-2 p-2 text-emerald-400 hover:bg-emerald-50 rounded-lg"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loadingSurahs ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-400" /></div>
          ) : (
            filteredSurahs.map(surah => (
              <div key={surah.id} onClick={() => { setSelectedSurah(surah); setIsSidebarOpen(false); }} className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer group transition-colors border ${selectedSurah?.id === surah.id ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-emerald-50/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${selectedSurah?.id === surah.id ? 'bg-emerald-600 text-white' : 'bg-emerald-100/50 text-emerald-600'}`}>{surah.id}</div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-emerald-950 truncate">{surah.name_english}</h4>
                    <p className="text-[9px] text-emerald-600/60 uppercase font-bold truncate">{surah.total_ayahs} Ayahs</p>
                  </div>
                </div>
                <span className="text-base text-emerald-800/80 font-arabic shrink-0 ml-2">{surah.name_arabic}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Ayah Reading Area */}
      <div className="flex-1 flex flex-col bg-[#FDFCF7] h-full overflow-hidden relative">
        {selectedSurah && (
          <>
            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-emerald-100/50 bg-white flex flex-row justify-between items-center gap-3 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"><Menu size={20}/></button>
                <div>
                  <h2 className="text-lg lg:text-xl font-black text-emerald-950 flex items-center gap-2">
                    {selectedSurah.name_english} <span className="font-arabic font-normal opacity-80 text-xl lg:text-2xl pt-1">{selectedSurah.name_arabic}</span>
                  </h2>
                </div>
              </div>
              
              {/* Play Full Surah Button */}
              <button onClick={toggleFullSurah} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isContinuousPlay ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {isContinuousPlay ? <PauseCircle size={16} /> : <ListMusic size={16} />} 
                <span className="hidden sm:inline">{isContinuousPlay ? 'Stop Playing Surah' : 'Play Full Surah'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 lg:p-6 custom-scrollbar pb-32">
              {/* Bismillah Header */}
              {selectedSurah.id !== 9 && (
                <div className="flex justify-center mb-4 lg:mb-6">
                  <h2 className="text-2xl font-arabic text-emerald-800 opacity-90 py-2" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </h2>
                </div>
              )}

              {loadingAyahs ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-3">
                  {ayahs.map(ayah => {
                    const ayahKey = `${ayah.surah_id}-${ayah.ayah_number}`;
                    const isPlaying = playingAyah === ayahKey;
                    const inTargetQueue = targetQueue.some(a => a.id === ayah.id);
                    const isMemorized = memorizedAyahs[ayahKey];
                    
                    let displayArabicText = ayah.text_arabic;
                    if (ayah.surah_id !== 1 && ayah.ayah_number === 1 && displayArabicText.startsWith("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ")) {
                      displayArabicText = displayArabicText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
                    }

                    return (
                      <div key={ayah.id} id={`ayah-${ayahKey}`} className={`bg-white p-4 lg:p-5 rounded-2xl border transition-all shadow-sm flex flex-col gap-3 ${isPlaying ? 'border-emerald-400 ring-2 ring-emerald-50' : 'border-emerald-100/50 hover:border-emerald-200'} ${isMemorized ? 'bg-emerald-50/30' : ''}`}>
                        <div className="flex justify-between items-start gap-4">
                          <div className={`w-6 h-6 shrink-0 rounded-full border-2 border-[#FDFCF7] flex items-center justify-center text-[10px] font-black ${isPlaying ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>{ayah.ayah_number}</div>
                          <p className="text-2xl lg:text-3xl text-right font-arabic leading-[1.8] text-emerald-950 flex-1" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>{displayArabicText}</p>
                        </div>
                        <div className="w-full h-px bg-emerald-50/80 my-1"></div>
                        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:items-end">
                          <p className="text-sm text-emerald-800 leading-relaxed font-medium flex-1">{ayah.text_bengali}</p>
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            
                            <button onClick={() => { if(playingAyah === ayahKey) stopAudio(); else playSingleAudio(ayah.surah_id, ayah.ayah_number, false); }} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                              {playingAyah === ayahKey && !isQueuePlaying ? <PauseCircle size={12}/> : <PlayCircle size={12}/>} Play
                            </button>
                            
                            <button onClick={() => toggleQueueAyah(ayah)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${inTargetQueue ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                              {inTargetQueue ? <CheckCircle2 size={12}/> : <PlusCircle size={12}/>} Target
                            </button>
                            
                            <button onClick={() => handleMarkHifz(ayah)} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${isMemorized ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                              {isMemorized ? <BookmarkCheck size={12}/> : <Bookmark size={12}/>} {isMemorized ? 'Memorized' : 'Mark Hifz'}
                            </button>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* 3. Floating Takrar (Loop) Player */}
            {targetQueue.length > 0 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-white border border-indigo-100 shadow-2xl rounded-2xl p-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-indigo-950 flex items-center gap-1.5"><Repeat size={14} className="text-indigo-500" /> Takrar (Loop) Player</h3>
                  <button onClick={() => { stopAudio(); setTargetQueue([]); }} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">{targetQueue.length} Ayahs</div>
                    {isQueuePlaying && (
                      <div className="text-[10px] font-bold text-emerald-600 animate-pulse bg-emerald-50 px-2 py-1 rounded truncate">
                        Playing: {currentQueueIndex + 1}/{targetQueue.length}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={loopLimit} onChange={(e) => setLoopLimit(Number(e.target.value))} disabled={isQueuePlaying} className="bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-black text-indigo-600 outline-none">
                      <option value={3}>3x Loops</option>
                      <option value={5}>5x Loops</option>
                      <option value={10}>10x Loops</option>
                    </select>
                    <button onClick={() => { if(isQueuePlaying) stopAudio(); else playTargetQueue(0, 1); }} className={`flex items-center gap-1.5 px-4 lg:px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md shrink-0 ${isQueuePlaying ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {isQueuePlaying ? <PauseCircle size={14} /> : <PlayCircle size={14} />} {isQueuePlaying ? `Stop (${currentLoop}/${loopLimit})` : 'Start'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </>
        )}
      </div>
    </div>
  );
}