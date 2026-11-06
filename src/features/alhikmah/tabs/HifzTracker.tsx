import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  BarChart2, CheckCircle2, AlertCircle, BookOpen, BrainCircuit, 
  Loader2, ArrowRight, Search, Menu, X, Smile, Meh, Frown, 
  Mic, Square, Play, Pause, Trash2, Edit2
} from 'lucide-react';

export default function HifzTracker() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- Data States ---
  const [loading, setLoading] = useState(true);
  const [hifzRecords, setHifzRecords] = useState<any[]>([]);
  const [activeSurahs, setActiveSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [displayAyahs, setDisplayAyahs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ memorized: 0, needsRevision: 0 });

  // --- Voice Recording (Tasmee') States (CRUD) ---
  const [recordingAyah, setRecordingAyah] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Record<string, { id: string, name: string, url: string, date: string }[]>>({});
  const [playingRecord, setPlayingRecord] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // ১. Fetch Hifz Data
  const fetchHifzData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: trackingData } = await supabase.from('hifz_tracking').select('*').eq('user_id', user.id);

    if (trackingData && trackingData.length > 0) {
      setHifzRecords(trackingData);
      const today = new Date().toISOString().split('T')[0];
      const pendingRev = trackingData.filter(t => t.next_review_date && t.next_review_date <= today).length;
      setStats({ memorized: trackingData.length, needsRevision: pendingRev });

      const uniqueSurahIds = Array.from(new Set(trackingData.map(t => t.surah_id)));
      const { data: surahsData } = await supabase.from('quran_surahs').select('*').in('id', uniqueSurahIds).order('id', { ascending: true });
      if (surahsData) setActiveSurahs(surahsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHifzData();
  }, []);

  // ২. Fetch Ayahs for Selected Surah
  useEffect(() => {
    const fetchSpecificAyahs = async () => {
      if (!selectedSurah) return;
      setLoading(true);
      const ayahNumbers = hifzRecords.filter(t => t.surah_id === selectedSurah.id).map(t => parseInt(t.ayah_range));
      const { data: ayahsData } = await supabase.from('quran_ayahs').select('*').eq('surah_id', selectedSurah.id).in('ayah_number', ayahNumbers).order('ayah_number', { ascending: true });

      if (ayahsData) {
        const uniqueAyahs = Array.from(new Map(ayahsData.map(item => [item.ayah_number, item])).values());
        setDisplayAyahs(uniqueAyahs);
      }
      setLoading(false);
    };
    fetchSpecificAyahs();
  }, [selectedSurah, hifzRecords]);

  // ৩. SRS Logic (Update Revision Date)
  const updateRevision = async (ayahNumber: number, quality: 'perfect' | 'good' | 'hard') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !selectedSurah) return;

    let daysToAdd = 1;
    if (quality === 'perfect') daysToAdd = 7;
    else if (quality === 'good') daysToAdd = 3;
    else if (quality === 'hard') daysToAdd = 1;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    await supabase.from('hifz_tracking').update({ next_review_date: nextDate, last_reviewed: new Date() }).match({ user_id: user.id, surah_id: selectedSurah.id, ayah_range: String(ayahNumber) });

    setHifzRecords(prev => prev.map(record => {
      if (record.surah_id === selectedSurah.id && record.ayah_range === String(ayahNumber)) {
        return { ...record, next_review_date: nextDate.toISOString().split('T')[0] };
      }
      return record;
    }));
  };

  // ================= TASMEE' (VOICE RECORDING) CRUD LOGIC =================

  // CREATE: Start Recording
  const startRecording = async (ayahKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const newRecord = {
          id: Date.now().toString(),
          name: `Tasmee' - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
          url: audioUrl,
          date: new Date().toLocaleDateString()
        };

        setRecordings(prev => ({
          ...prev,
          [ayahKey]: [...(prev[ayahKey] || []), newRecord]
        }));
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingAyah(ayahKey);
    } catch (err) {
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  // CREATE: Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingAyah(null);
  };

  // READ: Play Audio
  const playRecord = (url: string, recordId: string) => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }
    if (playingRecord === recordId) {
      setPlayingRecord(null);
      return;
    }
    const audio = new Audio(url);
    audioPlaybackRef.current = audio;
    setPlayingRecord(recordId);
    audio.play();
    audio.onended = () => setPlayingRecord(null);
  };

  // UPDATE: Rename Record
  const updateRecordName = (ayahKey: string, recordId: string) => {
    const newName = prompt("Enter new name for this recording:");
    if (newName && newName.trim() !== "") {
      setRecordings(prev => ({
        ...prev,
        [ayahKey]: prev[ayahKey].map(rec => rec.id === recordId ? { ...rec, name: newName } : rec)
      }));
    }
  };

  // DELETE: Remove Record
  const deleteRecord = (ayahKey: string, recordId: string) => {
    if (window.confirm("Are you sure you want to delete this recording?")) {
      setRecordings(prev => ({
        ...prev,
        [ayahKey]: prev[ayahKey].filter(rec => rec.id !== recordId)
      }));
      if (playingRecord === recordId) {
        audioPlaybackRef.current?.pause();
        setPlayingRecord(null);
      }
    }
  };

  const filteredSurahs = activeSurahs.filter(s => s.name_english.toLowerCase().includes(searchQuery.toLowerCase()) || s.name_arabic.includes(searchQuery));

  return (
    <div className="flex-1 flex h-full relative w-full overflow-hidden bg-[#FDFCF7]">
      
      {isSidebarOpen && <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* ================= 1. SIDEBAR ================= */}
      <div className={`absolute lg:relative inset-y-0 left-0 z-50 w-72 md:w-80 bg-white border-r border-emerald-100/50 flex flex-col h-full transform transition-transform duration-300 ease-in-out shrink-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="shrink-0 p-4 border-b border-emerald-100/50 flex justify-between items-center bg-white">
          <div className="bg-[#FDFCF7] border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2 flex-1">
            <Search size={16} className="text-emerald-300" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search My Hifz..." className="bg-transparent border-none outline-none text-sm w-full text-emerald-900" />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden ml-2 p-2 text-emerald-400 hover:bg-emerald-50 rounded-lg"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div onClick={() => { setSelectedSurah(null); setIsSidebarOpen(false); }} className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors border mb-2 ${!selectedSurah ? 'bg-emerald-600 text-white shadow-md' : 'border-transparent hover:bg-emerald-50 text-emerald-700'}`}>
            <BrainCircuit size={18} />
            <span className="font-bold text-sm">Overview Dashboard</span>
          </div>

          <div className="text-[10px] font-black text-emerald-300 uppercase tracking-widest px-3 py-2 mt-2">Memorized Surahs</div>

          {filteredSurahs.map(surah => {
            const ayahCount = hifzRecords.filter(t => t.surah_id === surah.id).length;
            return (
              <div key={surah.id} onClick={() => { setSelectedSurah(surah); setIsSidebarOpen(false); }} className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer group transition-colors border ${selectedSurah?.id === surah.id ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-emerald-50/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${selectedSurah?.id === surah.id ? 'bg-emerald-600 text-white' : 'bg-emerald-100/50 text-emerald-600'}`}>{surah.id}</div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-emerald-950 truncate">{surah.name_english}</h4>
                    <p className="text-[9px] text-emerald-600/60 uppercase font-bold truncate">{ayahCount} Ayahs</p>
                  </div>
                </div>
                <span className="text-base text-emerald-800/80 font-arabic shrink-0 ml-2">{surah.name_arabic}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 2. MAIN CONTENT ================= */}
      <div className="flex-1 flex flex-col bg-[#FDFCF7] h-full overflow-hidden relative min-w-0">
        
        {/* Header */}
        <div className="shrink-0 px-4 py-3 lg:px-6 lg:py-4 border-b border-emerald-100/50 bg-white flex items-center gap-3 z-10 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"><Menu size={20}/></button>
          <h2 className="text-lg lg:text-xl font-black text-emerald-950 flex items-center gap-2">
            {selectedSurah ? selectedSurah.name_english : 'Overview Dashboard'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 pb-40">
          
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
          ) : !selectedSurah ? (
            
            /* Dashboard View */
            <div className="max-w-5xl mx-auto">
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
            </div>

          ) : (

            /* ================= SPECIFIC SURAH REVISION MODE ================= */
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-6 flex justify-between items-center shadow-sm">
                <h3 className="text-emerald-900 font-bold flex items-center gap-2">
                  <BrainCircuit size={18}/> Revision Mode: {selectedSurah.name_english}
                </h3>
                <span className="text-xs font-black bg-emerald-600 text-white px-3 py-1 rounded-full">{displayAyahs.length} Ayahs</span>
              </div>

              {displayAyahs.map(ayah => {
                const ayahKey = `${ayah.surah_id}-${ayah.ayah_number}`;
                const record = hifzRecords.find(t => t.surah_id === ayah.surah_id && t.ayah_range === String(ayah.ayah_number));
                const today = new Date().toISOString().split('T')[0];
                const needsRev = record?.next_review_date && record.next_review_date <= today;
                
                const isRecordingHere = recordingAyah === ayahKey;
                const ayahRecords = recordings[ayahKey] || [];

                let displayArabicText = ayah.text_arabic;
                if (ayah.surah_id !== 1 && ayah.ayah_number === 1 && displayArabicText.startsWith("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ")) {
                  displayArabicText = displayArabicText.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ", "");
                }

                return (
                  <div key={ayah.id} className={`bg-white p-5 lg:p-7 rounded-2xl border shadow-sm flex flex-col gap-4 transition-all ${needsRev ? 'border-rose-300 ring-4 ring-rose-50' : 'border-emerald-100/50 hover:border-emerald-300'}`}>
                    
                    {/* Top: Ayah Text */}
                    <div className="flex justify-between items-start gap-4">
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm ${needsRev ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                        {ayah.ayah_number}
                      </div>
                      <p className="text-2xl lg:text-3xl text-right font-arabic leading-[1.8] text-emerald-950 flex-1" style={{ fontFamily: 'KFGQPC Uthman Taha Naskh, Traditional Arabic, serif' }}>
                        {displayArabicText}
                      </p>
                    </div>
                    
                    <div className="w-full h-px bg-slate-100 my-2"></div>
                    
                    {/* Middle: SRS Grading & Next Review */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="text-[10px] lg:text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        Next Review: <span className={needsRev ? 'text-rose-500 font-black' : 'text-emerald-600'}>{record?.next_review_date || 'N/A'}</span>
                      </div>
                      
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

                    {/* ================= BOTTOM: TASMEE' (VOICE RECORDING) SECTION ================= */}
                    <div className="mt-2 pt-4 border-t border-dashed border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-black text-slate-600 flex items-center gap-1.5">
                          <Mic size={14} className="text-emerald-500"/> Tasmee' Records
                        </h4>
                        
                        {/* RECORD BUTTON */}
                        {!isRecordingHere ? (
                          <button 
                            onClick={() => startRecording(ayahKey)}
                            disabled={recordingAyah !== null && recordingAyah !== ayahKey} // Disable if recording elsewhere
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-lg text-[10px] font-black transition-colors disabled:opacity-50"
                          >
                            <Mic size={12}/> Record Tasmee'
                          </button>
                        ) : (
                          <button 
                            onClick={stopRecording}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black animate-pulse shadow-md"
                          >
                            <Square size={12} className="fill-white"/> Stop Recording
                          </button>
                        )}
                      </div>

                      {/* RECORDINGS LIST (READ, UPDATE, DELETE) */}
                      {ayahRecords.length > 0 ? (
                        <div className="space-y-2">
                          {ayahRecords.map(rec => {
                            const isPlaying = playingRecord === rec.id;
                            return (
                              <div key={rec.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <button onClick={() => playRecord(rec.url, rec.id)} className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${isPlaying ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}>
                                    {isPlaying ? <Pause size={10} className="fill-current"/> : <Play size={10} className="fill-current ml-0.5"/>}
                                  </button>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold text-slate-700 truncate">{rec.name}</span>
                                    <span className="text-[8px] font-semibold text-slate-400">{rec.date}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  {/* UPDATE (Rename) */}
                                  <button onClick={() => updateRecordName(ayahKey, rec.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Rename Record">
                                    <Edit2 size={12}/>
                                  </button>
                                  {/* DELETE */}
                                  <button onClick={() => deleteRecord(ayahKey, rec.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Record">
                                    <Trash2 size={12}/>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic text-center py-2">No recordings yet. Read and check your Hifz!</p>
                      )}
                    </div>
                    {/* ================= END TASMEE' SECTION ================= */}

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