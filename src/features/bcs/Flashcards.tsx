import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Loader2, Plus, Repeat, BrainCircuit, 
  ChevronRight, CheckCircle2, RotateCcw, Target
} from 'lucide-react';

interface Flashcard {
  id: string;
  subject_id: string | null;
  front_content: string; // Question
  back_content: string;  // Answer
  ease_factor: number;
  interval: number;
  next_review_date: string;
  subject?: { title: string; icon_color: string };
}

export default function Flashcards() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [subjectId, setSubjectId] = useState('');

  // Study Mode States
  const [studyMode, setStudyMode] = useState(false);
  const [cardsToStudy, setCardsToStudy] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subData } = await supabase.from('bcs_subjects').select('id, title, icon_color').order('order_index');
      if (subData) setSubjects(subData);

      const { data: cardData } = await supabase
        .from('bcs_flashcards')
        .select(`*, subject:bcs_subjects(title, icon_color)`)
        .order('next_review_date', { ascending: true });
      
      if (cardData) setCards(cardData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front || !back) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      await supabase.from('bcs_flashcards').insert([{
        user_id: user?.id,
        subject_id: subjectId || null,
        front_content: front,
        back_content: back,
        ease_factor: 2.5,
        interval: 1, // Start with 1 day
        next_review_date: today
      }]);

      setShowForm(false);
      setFront(''); setBack(''); setSubjectId('');
      fetchData();
    } catch (error) {
      console.error("Error saving card", error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Spaced Repetition Algorithm (SuperMemo-2 Inspired) ---
  const handleReview = async (quality: number) => {
    // Quality: 0 (Hard/Blackout), 1 (Medium/Remembered with effort), 2 (Easy)
    const card = cardsToStudy[currentCardIndex];
    
    let newInterval = card.interval;
    let newEase = card.ease_factor;

    if (quality === 0) { // Hard -> Reset interval
      newInterval = 1;
      newEase = Math.max(1.3, newEase - 0.2);
    } else if (quality === 1) { // Medium -> Moderate increase
      newInterval = Math.round(newInterval * 1.5);
    } else { // Easy -> Multiply by ease factor
      newInterval = Math.round(newInterval * newEase);
      newEase = newEase + 0.1;
    }

    // Calculate next date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newInterval);
    const formattedNextDate = nextDate.toISOString().split('T')[0];

    // Optimistic UI Update for Study Mode
    const updatedCardsToStudy = [...cardsToStudy];
    updatedCardsToStudy.splice(currentCardIndex, 1);
    
    setCardsToStudy(updatedCardsToStudy);
    setShowAnswer(false);
    if (updatedCardsToStudy.length === 0) {
      setStudyMode(false);
      fetchData(); // Refresh all cards list
    }

    // DB Update
    await supabase.from('bcs_flashcards').update({
      interval: newInterval,
      ease_factor: newEase,
      next_review_date: formattedNextDate
    }).eq('id', card.id);
  };

  const startStudySession = () => {
    const today = new Date().toISOString().split('T')[0];
    const dueCards = cards.filter(c => c.next_review_date <= today);
    setCardsToStudy(dueCards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setStudyMode(true);
  };

  const dueTodayCount = cards.filter(c => c.next_review_date <= new Date().toISOString().split('T')[0]).length;

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  // ================= STUDY MODE UI =================
  if (studyMode) {
    if (cardsToStudy.length === 0) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
          <CheckCircle2 size={64} className="text-emerald-500 mb-6" />
          <h2 className="text-3xl font-black text-[#020F33] mb-2">You're All Caught Up!</h2>
          <p className="text-slate-500 mb-8">No more flashcards due for today. Great job!</p>
          <button onClick={() => setStudyMode(false)} className="bg-[#020F33] text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-colors">
            Back to Deck
          </button>
        </div>
      );
    }

    const currentCard = cardsToStudy[currentCardIndex];

    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto mb-28 mt-10">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setStudyMode(false)} className="text-slate-400 hover:text-rose-500 transition-colors font-bold text-sm">
            Quit Session
          </button>
          <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black">
            {cardsToStudy.length} Cards Remaining
          </div>
        </div>

        {/* Flashcard Area */}
        <div className="perspective-1000 w-full min-h-[400px]">
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${showAnswer ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className={`absolute w-full min-h-[400px] backface-hidden bg-white border-2 border-emerald-100 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-lg cursor-pointer hover:border-emerald-300 transition-colors ${showAnswer ? 'hidden' : 'flex'}`} onClick={() => setShowAnswer(true)}>
              <span className="absolute top-6 right-6 text-xs font-bold text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-lg">Question</span>
              {currentCard.subject && (
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-6">
                  <span className="w-2 h-2 rounded-full" style={{backgroundColor: currentCard.subject.icon_color}}></span>
                  {currentCard.subject.title}
                </span>
              )}
              <h2 className="text-3xl md:text-4xl font-black text-[#020F33] leading-tight mb-8">
                {currentCard.front_content}
              </h2>
              <p className="text-emerald-500 font-bold flex items-center gap-2 mt-auto animate-pulse">
                Click to reveal answer <ChevronRight size={18} />
              </p>
            </div>

            {/* Back (Answer) */}
            <div className={`absolute w-full min-h-[400px] bg-[#020F33] text-white border-2 border-[#020F33] rounded-3xl p-10 flex flex-col shadow-xl ${showAnswer ? 'flex' : 'hidden'}`}>
              <span className="absolute top-6 right-6 text-xs font-bold text-slate-400 uppercase bg-white/10 px-3 py-1 rounded-lg">Answer</span>
              <div className="flex-1 flex items-center justify-center text-center mb-8 mt-6">
                <h2 className="text-2xl md:text-3xl font-medium leading-relaxed whitespace-pre-wrap">
                  {currentCard.back_content}
                </h2>
              </div>
              
              {/* Rating Buttons */}
              <div className="grid grid-cols-3 gap-4 mt-auto">
                <button onClick={(e) => { e.stopPropagation(); handleReview(0); }} className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-colors flex flex-col items-center gap-1">
                  <span>Hard</span>
                  <span className="text-[10px] opacity-70">Review Tomorrow</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleReview(1); }} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-colors flex flex-col items-center gap-1">
                  <span>Good</span>
                  <span className="text-[10px] opacity-70">Review in ~{Math.round(currentCard.interval * 1.5)} days</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleReview(2); }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-colors flex flex-col items-center gap-1">
                  <span>Easy</span>
                  <span className="text-[10px] opacity-70">Review in ~{Math.round(currentCard.interval * currentCard.ease_factor)} days</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ================= MAIN OVERVIEW UI =================
  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto text-[#020F33] mb-28">
      {/* Header */}
      <div className="mb-8">
        <Link to="/bcs" className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#020F33] transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Repeat className="text-emerald-500" size={36} /> Smart Flashcards
            </h1>
            <p className="text-[#475569] mt-1 font-medium">Spaced repetition for ultimate memory retention.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setShowForm(!showForm)} className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none">
              <Plus size={18} /> Create Card
            </button>
            <button 
              onClick={startStudySession}
              disabled={dueTodayCount === 0}
              className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-md flex-1 md:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BrainCircuit size={18} /> Study Now ({dueTodayCount})
            </button>
          </div>
        </div>
      </div>

      {/* Add Card Form */}
      {showForm && (
        <form onSubmit={handleSaveCard} className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-600 mb-1">Subject (Optional)</label>
            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full md:w-1/3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500">
              <option value="">General Deck</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Front (Question / Term)</label>
              <textarea required value={front} onChange={e => setFront(e.target.value)} rows={3} placeholder="e.g. Article 7(1) of BD Constitution" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Back (Answer / Explanation)</label>
              <textarea required value={back} onChange={e => setBack(e.target.value)} rows={3} placeholder="e.g. All powers in the Republic belong to the people..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="bg-[#020F33] text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-500 transition-colors flex items-center gap-2">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Save Flashcard'}
          </button>
        </form>
      )}

      {/* Cards List / Deck Overview */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-[#020F33]">Your Deck ({cards.length} Cards)</h2>
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
            {dueTodayCount} due today
          </span>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-12">
            <Target size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="font-bold text-slate-500">Your deck is empty.</p>
            <p className="text-sm text-slate-400 mt-1">Create your first flashcard to start memorizing efficiently!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map(card => {
              const isDue = card.next_review_date <= new Date().toISOString().split('T')[0];
              
              return (
                <div key={card.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      {card.subject ? (
                        <><span className="w-2 h-2 rounded-full" style={{backgroundColor: card.subject.icon_color}}></span> {card.subject.title}</>
                      ) : 'General'}
                    </span>
                    {isDue ? (
                      <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded">
                        <RotateCcw size={10}/> Due
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Next: {new Date(card.next_review_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-[#020F33] line-clamp-2 mt-2 leading-snug">
                    {card.front_content}
                  </h3>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}