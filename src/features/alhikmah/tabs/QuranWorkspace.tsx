import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Search, Bookmark, BookmarkCheck, PlayCircle, PauseCircle, 
  Loader2, Menu, X, ListMusic, PlusCircle, Repeat, Trash2, CheckCircle2
} from 'lucide-react';

const SAJDAH_AYAHS = [
  { surah: 7, ayah: 206 }, { surah: 13, ayah: 15 }, { surah: 16, ayah: 50 },
  { surah: 17, ayah: 109 }, { surah: 19, ayah: 58 }, { surah: 22, ayah: 18 },
  { surah: 22, ayah: 77 }, { surah: 25, ayah: 60 }, { surah: 27, ayah: 26 },
  { surah: 32, ayah: 15 }, { surah: 38, ayah: 24 }, { surah: 41, ayah: 38 },
  { surah: 53, ayah: 62 }, { surah: 84, ayah: 21 }, { surah: 96, ayah: 19 }
];

export default function QuranWorkspace() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [playingAyah, setPlayingAyah] = useState<string | null>(null);
  const [isContinuousPlay, setIsContinuousPlay] = useState(false);
  
  // ================= 1. Single Persistent Audio Instance =================
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [targetQueue, setTargetQueue] = useState<any[]>([]);
  const [isQueuePlaying, setIsQueuePlaying] = useState(false);
  const [loopLimit, setLoopLimit] = useState<number>(5);
  const [currentLoop, setCurrentLoop] = useState<number>(1);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);

  const [memorizedAyahs, setMemorizedAyahs] = useState<Record<string, boolean>>({});

  // ================= Ref for Stale Closures (Background Play Safety) =================
  const targetQueueRef = useRef(targetQueue);
  const loopLimitRef = useRef(loopLimit);
  const selectedSurahRef = useRef(selectedSurah);

  useEffect(() => { targetQueueRef.current = targetQueue; }, [targetQueue]);
  useEffect(() => { loopLimitRef.current = loopLimit; }, [loopLimit]);
  useEffect(() => { selectedSurahRef.current = selectedSurah; }, [selectedSurah]);

  // Initialize Audio & Media Session ONCE
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    // MediaSession API - To show in Lock Screen & allow background play
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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

  useEffect(() => {
    const fetchAyahsAndHifz = async () => {
      if (!selectedSurah) return;
      setLoadingAyahs(true);
      
      const { data: ayahData } = await supabase.from('quran_ayahs').select('*').eq('surah_id', selectedSurah.id).order('ayah_number', { ascending: true });
      if (ayahData) {
        const uniqueAyahs = Array.from(new Map(ayahData.map(item => [item.ayah_number, item])).values());
        setAyahs(uniqueAyahs);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: hifzData } = await supabase.from('hifz_tracking').select('*').eq('surah_id', selectedSurah.id).eq('user_id', user.id);
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

  const stopAudio = () => {
    if (audioRef.current) { 
      audioRef.current.pause(); 
      audioRef.current.currentTime = 0; 
    }
    setPlayingAyah(null); setIsContinuousPlay(false); setIsQueuePlaying(false);
  };

  const getAudioUrl = (surahId: number, ayahNum: number) => `https://everyayah.com/data/Alafasy_128kbps/${String(surahId).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;

  // ================= 2. Updated Play Logic (Background Safe) =================
  const playSingleAudio = (surahId: number, ayahNum: number, continuous: boolean) => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.src = getAudioUrl(surahId, ayahNum);
    
    setPlayingAyah(`${surahId}-${ayahNum}`);
    setIsContinuousPlay(continuous);
    
    // Set Lock Screen Metadata
    if ('mediaSession' in navigator && selectedSurahRef.current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Ayah ${ayahNum}`,
        artist: selectedSurahRef.current.name_english,
        album: 'Al-Hikmah Quran Playback',
        artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3358/3358823.png', sizes: '512x512', type: 'image/png' }]
      });
    }

    audioRef.current.play().catch(e => console.error("Playback failed:", e));
    
    audioRef.current.onended = () => {
      const currentSurah = selectedSurahRef.current;
      if (continuous && currentSurah && ayahNum < currentSurah.total_ayahs) {
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

  const toggleQueueAyah = (ayah: any) => {
    setTargetQueue(prev => {
      const exists = prev.find(a => a.id === ayah.id);
      if (exists) return prev.filter(a => a.id !== ayah.id);
      return [...prev, ayah].sort((a, b) => a.ayah_number - b.ayah_number);
    });
  };

  const playTargetQueue = (index: number, currentLoopParam: number) => {
    if (targetQueueRef.current.length === 0 || !audioRef.current) return;
    
    audioRef.current.pause();
    
    const ayah = targetQueueRef.current[index];
    audioRef.current.src = getAudioUrl(ayah.surah_id, ayah.ayah_number);
    
    setPlayingAyah(`${ayah.surah_id}-${ayah.ayah_number}`);
    setIsQueuePlaying(true); 
    setCurrentQueueIndex(index); 
    setCurrentLoop(currentLoopParam);
    
    // Set Lock Screen Metadata for Takrar
    if ('mediaSession' in navigator && selectedSurahRef.current) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Takrar: Ayah ${ayah.ayah_number}`,
        artist: `Loop ${currentLoopParam} of ${loopLimitRef.current} | ${selectedSurahRef.current.name_english}`,
        album: 'Al-Hikmah Hifz Tracker',
        artwork: [{ src: 'https://cdn-icons-png.flaticon.com/512/3358/3358823.png', sizes: '512x512', type: 'image/png' }]
      });
    }

    audioRef.current.play().catch(e => console.error("Playback failed:", e));
    
    audioRef.current.onended = () => {
      const latestQueue = targetQueueRef.current;
      const latestLimit = loopLimitRef.current;
      
      if (index + 1 < latestQueue.length) {
        playTargetQueue(index + 1, currentLoopParam);
      } else if (currentLoopParam < latestLimit) {
        playTargetQueue(0, currentLoopParam + 1);
      } else { 
        stopAudio(); 
      }
    };
  };

  const handleMarkHifz = async (ayah: any) => {
    const ayahKey = `${ayah.surah_id}-${ayah.ayah_number}`;
    const isCurrentlyMemorized = memorizedAyahs[ayahKey];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please log in to track your Hifz."); return; }
    
    if (isCurrentlyMemorized) {
      await supabase.from('hifz_tracking').delete().match({ user_id: user.id, surah_id: ayah.surah_id, ayah_range: String(ayah.ayah_number) });
      setMemorizedAyahs(prev => ({ ...prev, [ayahKey]: false }));
    } else {
      const nextReview = new Date(); nextReview.setDate(nextReview.getDate() + 1);
      await supabase.from('hifz_tracking').insert([{ user_id: user.id, surah_id: ayah.surah_id, ayah_range: String(ayah.ayah_number), status: 'memorized', next_review_date: nextReview }]);
      setMemorizedAyahs(prev => ({ ...prev, [ayahKey]: true }));
    }
  };

  const checkIsSajdah = (surahId: number, ayahNum: number) => SAJDAH_AYAHS.some(s => s.surah === surahId && s.ayah === ayahNum);
  const filteredSurahs = surahs.filter(s => s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) || s.name_arabic.includes(searchQuery));

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-[#FDFCF7]">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* ================= 1. SURAH SIDEBAR ================= */}
      <div className={`absolute lg:relative inset-y-0 left-0 z-50 w-72 md:w-80 bg-white border-r border-emerald-100/50 flex flex-col h-full shrink-0 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="shrink-0 p-4 border-b border-emerald-100/50 flex justify-between items-center bg-white">
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
              <div key={surah.id} onClick={() => { setSelectedSurah(surah); setIsSidebarOpen(false); }} className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer group transition-colors border mb-1 ${selectedSurah?.id === surah.id ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-emerald-50/50'}`}>
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

      {/* ================= 2. MAIN AYAH AREA ================= */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#FDFCF7]">
        {selectedSurah && (
          <>
            <div className="shrink-0 px-4 lg:px-6 py-3 lg:py-4 border-b border-emerald-100/50 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"><Menu size={20}/></button>
                <div>
                  <h2 className="text-lg lg:text-xl font-black text-emerald-950 flex items-center gap-2">
                    {selectedSurah.name_english} <span className="font-arabic font-normal opacity-80 text-xl lg:text-2xl pt-1">{selectedSurah.name_arabic}</span>
                  </h2>
                </div>
              </div>
              
              <div className="w-full md:w-auto flex flex-wrap md:flex-nowrap items-center justify-start md:justify-end gap-3">
                {targetQueue.length > 0 && (
                  <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl shadow-sm w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-1.5 mr-2 shrink-0">
                      <Repeat size={14} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-800">{targetQueue.length} Targeted</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                      <select value={loopLimit} onChange={(e) => setLoopLimit(Number(e.target.value))} disabled={isQueuePlaying} className="bg-white border border-indigo-200 px-1.5 py-1 rounded-md text-[10px] font-black text-indigo-600 outline-none cursor-pointer">
                        <option value={3}>3x</option><option value={5}>5x</option><option value={10}>10x</option>
                      </select>
                      <button onClick={() => { if(isQueuePlaying) stopAudio(); else playTargetQueue(0, 1); }} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all shadow-sm ${isQueuePlaying ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
                        {isQueuePlaying ? <PauseCircle size={14} /> : <PlayCircle size={14} />} 
                        {isQueuePlaying ? `Stop (${currentLoop}/${loopLimit})` : 'Takrar'}
                      </button>
                      <button onClick={() => { stopAudio(); setTargetQueue([]); }} className="text-slate-400 hover:text-rose-500 bg-white p-1 rounded-md border border-slate-200 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
                <button onClick={toggleFullSurah} className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 ${isContinuousPlay ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                  {isContinuousPlay ? <PauseCircle size={16} /> : <ListMusic size={16} />} 
                  <span>{isContinuousPlay ? 'Stop Playing Surah' : 'Play Full Surah'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 lg:p-6 custom-scrollbar relative">
              
              {selectedSurah.id !== 9 && selectedSurah.id !== 1 && (
                <div className="flex justify-center mb-6 lg:mb-8 mt-2">
                  <h2 className="text-2xl lg:text-4xl font-arabic text-emerald-800 opacity-90 py-2" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </h2>
                </div>
              )}

              {loadingAyahs ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                  {ayahs.map(ayah => {
                    const ayahKey = `${ayah.surah_id}-${ayah.ayah_number}`;
                    const isPlaying = playingAyah === ayahKey;
                    const inTargetQueue = targetQueue.some(a => a.id === ayah.id);
                    const isMemorized = memorizedAyahs[ayahKey];
                    const isSajdahAyah = checkIsSajdah(ayah.surah_id, ayah.ayah_number);
                    
                    let displayArabicText = ayah.text_arabic;
                    if (ayah.surah_id !== 1 && ayah.ayah_number === 1 && displayArabicText.startsWith("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ")) {
                      displayArabicText = displayArabicText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
                    }

                    return (
                      <div key={ayah.id} id={`ayah-${ayahKey}`} className={`bg-white p-4 lg:p-6 rounded-2xl border transition-all shadow-sm flex flex-col gap-4 ${isPlaying ? 'border-emerald-400 ring-2 ring-emerald-50' : 'border-emerald-100/50 hover:border-emerald-200'} ${isMemorized ? 'bg-emerald-50/30' : ''} ${inTargetQueue ? 'bg-indigo-50/30 border-indigo-200' : ''}`}>
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className={`w-8 h-8 shrink-0 rounded-full border-2 border-[#FDFCF7] flex items-center justify-center text-xs font-black ${isPlaying ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>{ayah.ayah_number}</div>
                          
                          <div className="flex flex-col items-end gap-3 flex-1">
                            <p className="text-2xl lg:text-[28px] text-right font-arabic leading-[2] text-emerald-950" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                              {displayArabicText}
                            </p>
                            {isSajdahAyah && (
                              <div className="flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-black border border-amber-300 shadow-sm animate-pulse">
                                <span className="text-base leading-none">۩</span> Ayah of Sajdah
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-full h-px bg-emerald-50/80 my-1"></div>
                        
                        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-end">
                          <p className="text-sm text-emerald-800 leading-relaxed font-medium flex-1">{ayah.text_bengali}</p>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button onClick={() => { if(playingAyah === ayahKey) stopAudio(); else playSingleAudio(ayah.surah_id, ayah.ayah_number, false); }} className="text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                              {playingAyah === ayahKey && !isQueuePlaying ? <PauseCircle size={14}/> : <PlayCircle size={14}/>} Play
                            </button>
                            <button onClick={() => toggleQueueAyah(ayah)} className={`text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all ${inTargetQueue ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                              {inTargetQueue ? <CheckCircle2 size={14}/> : <PlusCircle size={14}/>} Target
                            </button>
                            <button onClick={() => handleMarkHifz(ayah)} className={`text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all ${isMemorized ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                              {isMemorized ? <BookmarkCheck size={14}/> : <Bookmark size={14}/>} {isMemorized ? 'Memorized' : 'Mark Hifz'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="h-32 md:h-48 w-full shrink-0 pointer-events-none opacity-0"></div>

                </div>
              )}
            </div>
            
          </>
        )}
      </div>
    </div>
  );
}