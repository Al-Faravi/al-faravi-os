import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, DatabaseZap } from 'lucide-react';

export default function QuranSeeder() {
  const [status, setStatus] = useState('Idle');
  const [progress, setProgress] = useState(0);

  const seedDatabase = async () => {
    try {
      setStatus('Fetching Quran Data (Arabic)...');
      const resAr = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
      const jsonAr = await resAr.json();
      
      setStatus('Fetching Translation (Bengali)...');
      const resBn = await fetch('https://api.alquran.cloud/v1/quran/bn.bengali');
      const jsonBn = await resBn.json();

      const surahsAr = jsonAr.data.surahs;
      const surahsBn = jsonBn.data.surahs;

      setStatus('Saving 114 Surahs to Database...');
      
      const surahsToInsert = surahsAr.map((s: any, index: number) => ({
        id: s.number,
        name_arabic: s.name,
        name_english: s.englishName,
        name_bengali: surahsBn[index].englishNameTranslation || s.englishName,
        revelation_type: s.revelationType,
        total_ayahs: s.ayahs.length
      }));

      const { error: surahError } = await supabase.from('quran_surahs').upsert(surahsToInsert);
      if (surahError) throw surahError;

      setStatus('Processing 6236 Ayahs...');
      
      let ayahsToInsert: any[] = [];
      
      surahsAr.forEach((s: any, sIndex: number) => {
        s.ayahs.forEach((a: any, aIndex: number) => {
          ayahsToInsert.push({
            surah_id: s.number,
            ayah_number: a.numberInSurah,
            text_arabic: a.text,
            text_bengali: surahsBn[sIndex].ayahs[aIndex].text,
            juz_number: a.juz
          });
        });
      });

      // 500টি করে আয়াত একসাথে ইনসার্ট করা হচ্ছে (যাতে লিমিট ক্রস না করে)
      const batchSize = 500;
      for (let i = 0; i < ayahsToInsert.length; i += batchSize) {
        const batch = ayahsToInsert.slice(i, i + batchSize);
        const { error: ayahError } = await supabase.from('quran_ayahs').upsert(batch);
        if (ayahError) throw ayahError;
        
        const currentProgress = Math.round(((i + batchSize) / ayahsToInsert.length) * 100);
        setProgress(currentProgress > 100 ? 100 : currentProgress);
        setStatus(`Inserting Ayahs... ${Math.min(i + batchSize, ayahsToInsert.length)} / ${ayahsToInsert.length}`);
      }

      setStatus('Alhamdulillah! Database is Fully Seeded.');
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-emerald-100 mb-6 flex flex-col items-center justify-center text-center shadow-sm">
      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
        <DatabaseZap size={24} />
      </div>
      <h2 className="text-xl font-black text-emerald-950 mb-2">Quran Data Migration</h2>
      <p className="text-xs text-emerald-600 mb-6 max-w-md">
        Click the button below to fetch the entire Quran (6236 Ayahs) with Bengali translation and save it securely to your Supabase database.
      </p>
      
      {status === 'Idle' ? (
        <button onClick={seedDatabase} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md">
          Start Migration
        </button>
      ) : status.includes('Alhamdulillah') ? (
        <div className="text-emerald-600 font-black flex items-center gap-2 bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-200">
          <CheckCircle size={20} /> {status}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <Loader2 className="animate-spin" size={18} /> {status}
          </div>
          {progress > 0 && progress <= 100 && (
            <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-600 h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}