import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Target, BookOpen, Loader2, Award, BookMarked,
  BrainCircuit, Globe, FlaskConical, MonitorDot, GripVertical,
  LineChart, Repeat, AlertTriangle, Layers, Database, Plus,
  ArrowUpRight, ChevronRight, CheckCircle2
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from '../../components/ui/SortableItem';

interface BcsSubject {
  id: string;
  title: string;
  marks: number;
  icon_color: string;
  order_index?: number;
  user_id: string;
  is_custom?: boolean;
}

export default function BcsManager() {
  const [subjects, setSubjects] = useState<BcsSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    fetchSubjects();
  }, []);

  // ───────────────────────────────────────────────
  // DATA LAYER (100% unchanged — same logic & connections)
  // ───────────────────────────────────────────────
  const fetchSubjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bcs_subjects')
      .select('*')
      .order('order_index', { ascending: true });

    if (data) setSubjects(data);
    setLoading(false);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSubjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        const updates = newItems.map((item, index) => ({ id: item.id, order_index: index }));
        supabase.from('bcs_subjects').upsert(updates).then();

        return newItems;
      });
    }
  };

  const handleInitializeSyllabus = async () => {
    setIsInitializing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const defaultSyllabus = [
        { title: 'বাংলা ভাষা ও সাহিত্য', marks: 35, icon_color: '#EF4444', user_id: user.id, order_index: 0 },
        { title: 'English Language & Literature', marks: 35, icon_color: '#3B82F6', user_id: user.id, order_index: 1 },
        { title: 'বাংলাদেশ বিষয়াবলি', marks: 30, icon_color: '#10B981', user_id: user.id, order_index: 2 },
        { title: 'আন্তর্জাতিক বিষয়াবলি', marks: 20, icon_color: '#F59E0B', user_id: user.id, order_index: 3 },
        { title: 'সাধারণ বিজ্ঞান', marks: 15, icon_color: '#06B6D4', user_id: user.id, order_index: 4 },
        { title: 'কম্পিউটার ও তথ্যপ্রযুক্তি', marks: 15, icon_color: '#6366F1', user_id: user.id, order_index: 5 },
        { title: 'গাণিতিক যুক্তি', marks: 15, icon_color: '#EC4899', user_id: user.id, order_index: 6 },
        { title: 'মানসিক দক্ষতা', marks: 15, icon_color: '#F43F5E', user_id: user.id, order_index: 7 },
        { title: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা', marks: 10, icon_color: '#8B5CF6', user_id: user.id, order_index: 8 },
        { title: 'নৈতিকতা, মূল্যবোধ ও সুশাসন', marks: 10, icon_color: '#14B8A6', user_id: user.id, order_index: 9 },
      ];

      await supabase.from('bcs_subjects').insert(defaultSyllabus);
      await fetchSubjects();
    } catch (error: any) {
      console.error('Failed to init syllabus:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const getIcon = (title: string, color: string) => {
    if (title.includes('বিজ্ঞান')) return <FlaskConical size={20} color={color} />;
    if (title.includes('কম্পিউটার')) return <MonitorDot size={20} color={color} />;
    if (title.includes('আন্তর্জাতিক') || title.includes('ভূগোল')) return <Globe size={20} color={color} />;
    if (title.includes('মানসিক') || title.includes('গাণিতিক')) return <BrainCircuit size={20} color={color} />;
    if (title.includes('Bank') || title.includes('কোয়েশ্চেন')) return <Database size={20} color={color} />;
    return <BookMarked size={20} color={color} />;
  };

  // ───────────────────────────────────────────────
  // DERIVED VALUES (UI-only — no new data calls)
  // ───────────────────────────────────────────────
  const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);

  const bcsFeatures = [
    { title: 'Daily Target Locker', desc: 'Set & lock daily goals', icon: <Target size={20} strokeWidth={2.2} />, color: 'text-rose-400', tint: 'bg-rose-400/10 border border-rose-400/20', link: '/bcs/targets' },
    { title: 'Mock Tests & Score', desc: 'Practice analytics', icon: <LineChart size={20} strokeWidth={2.2} />, color: 'text-indigo-400', tint: 'bg-indigo-400/10 border border-indigo-400/20', link: '/bcs/mock-tests' },
    { title: 'Flashcards & Repetition', desc: 'Smart spaced revision', icon: <Repeat size={20} strokeWidth={2.2} />, color: 'text-emerald-400', tint: 'bg-emerald-400/10 border border-emerald-400/20', link: '/bcs/flashcards' },
    { title: 'PYQ Matrix', desc: 'Previous year questions', icon: <Layers size={20} strokeWidth={2.2} />, color: 'text-amber-400', tint: 'bg-amber-400/10 border border-amber-400/20', link: '/bcs/pyq' },
    { title: 'Danger Zone Detector', desc: 'Track weak topics', icon: <AlertTriangle size={20} strokeWidth={2.2} />, color: 'text-red-400', tint: 'bg-red-400/10 border border-red-400/20', link: '/bcs/weakness' },
    { title: 'Resource Vault', desc: 'PDF & Drive library', icon: <Database size={20} strokeWidth={2.2} />, color: 'text-[#02C2D5]', tint: 'bg-[#02C2D5]/10 border border-[#02C2D5]/25', link: '/bcs/vault' },
  ];

  // ───────────────────────────────────────────────
  // LOADING — professional skeleton (mirrors real layout)
  // ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto text-[#020F33] mb-28">
        <div className="bg-[#020F33]/[0.05] border border-slate-200/70 rounded-[28px] p-6 md:p-10 mb-10">
          <div className="flex flex-col lg:flex-row justify-between gap-8 mb-10">
            <div className="space-y-4">
              <div className="h-6 w-44 bg-slate-200/80 rounded-full animate-pulse" />
              <div className="h-10 w-72 md:w-96 bg-slate-200/80 rounded-xl animate-pulse" />
              <div className="h-4 w-64 md:w-96 bg-slate-200/60 rounded-full animate-pulse" />
            </div>
            <div className="hidden md:grid grid-cols-3 gap-3 w-80">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[78px] bg-slate-200/60 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="h-11 w-64 bg-slate-200/70 rounded-2xl animate-pulse" />
          <div className="h-10 w-44 bg-slate-200/70 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-200/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto text-[#020F33] mb-28">

      {/* ═══════════════════════════════════════════════════════
          HERO — MISSION CONTROL (dark command-center panel)
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#020F33] rounded-[28px] mb-10 shadow-[0_24px_60px_-24px_rgba(2,15,51,0.55)]">
        {/* decorative background — dot grid + soft glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />
        <div className="absolute -top-28 -right-20 w-[26rem] h-[26rem] bg-[#02C2D5]/[0.09] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-[#02C2D5]/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 md:p-10">
          {/* header: identity + live stats */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
            <div>
              <span className="inline-flex items-center gap-2.5 bg-[#02C2D5]/10 border border-[#02C2D5]/25 text-[#02C2D5] text-[10px] md:text-[11px] font-bold uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full mb-5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#02C2D5] opacity-70" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#02C2D5]" />
                </span>
                Bangladesh Civil Service · Preliminary
              </span>

              <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-black text-white tracking-tight leading-[1.08] flex items-center gap-4">
                <span className="hidden sm:inline-flex w-14 h-14 rounded-2xl bg-[#02C2D5]/10 border border-[#02C2D5]/25 items-center justify-center shrink-0 shadow-[0_0_30px_rgba(2,197,213,0.25)]">
                  <Target className="text-[#02C2D5]" size={30} strokeWidth={2.2} />
                </span>
                BCS Mission <span className="text-[#02C2D5]">Control</span>
              </h1>

              <p className="text-slate-400 text-sm md:text-[15px] leading-relaxed mt-4 max-w-xl font-medium">
                Your centralized command center for BCS Preliminary preparation — targets,
                mock tests, smart revision and resources, all in one place.
              </p>
            </div>

            {/* live stats — derived from loaded subjects (no extra API calls) */}
            <div className="grid grid-cols-3 gap-3 lg:min-w-[264px]">
              {[
                { value: subjects.length, label: 'Subjects', accent: false },
                { value: totalMarks, label: 'Total Marks', accent: true },
                { value: bcsFeatures.length, label: 'Study Tools', accent: false },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-sm px-3 md:px-4 py-3 text-center hover:border-[#02C2D5]/30 transition-colors duration-300"
                >
                  <div className={`text-xl md:text-2xl font-black tabular-nums leading-none mb-1.5 ${stat.accent ? 'text-[#02C2D5]' : 'text-white'}`}>
                    {stat.value}
                  </div>
                  <div className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* tools label */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 shrink-0">Study Tools</span>
            <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          </div>

          {/* feature cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {bcsFeatures.map((feat, idx) => (
              <Link
                key={idx}
                to={feat.link}
                aria-label={feat.title}
                className="group relative bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm border border-white/10 hover:border-[#02C2D5]/40 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02C2D5]/60"
              >
                <ArrowUpRight
                  size={15}
                  className="absolute top-3.5 right-3.5 text-slate-600 group-hover:text-[#02C2D5] opacity-0 group-hover:opacity-100 transition-all duration-300"
                />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${feat.tint} ${feat.color}`}>
                  {feat.icon}
                </div>
                <div>
                  <span className="block text-[13px] font-bold text-white leading-snug mb-1 group-hover:text-[#02C2D5] transition-colors duration-300">
                    {feat.title}
                  </span>
                  <span className="block text-[10px] font-medium text-slate-500 leading-none">
                    {feat.desc}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SYLLABUS & QUESTION BANKS (light workspace)
          ═══════════════════════════════════════════════════════ */}
      <section>
        {/* section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#020F33] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(2,15,51,0.22)]">
              <BookOpen size={20} className="text-[#02C2D5]" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-[#020F33] tracking-tight leading-tight flex items-center gap-2.5 flex-wrap">
                Syllabus & Question Banks
                {subjects.length > 0 && (
                  <span className="text-[10px] font-black tabular-nums bg-[#02C2D5]/10 text-[#02C2D5] border border-[#02C2D5]/25 px-2 py-0.5 rounded-md">
                    {subjects.length}
                  </span>
                )}
              </h2>
              <p className="text-xs md:text-[13px] text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
                <GripVertical size={12} className="text-slate-400 shrink-0" />
                {subjects.length > 0
                  ? 'Drag cards to reorder by priority — click any subject to open its bank.'
                  : 'Your subjects and question banks will appear here.'}
              </p>
            </div>
          </div>

          <button className="group flex items-center gap-2 bg-[#020F33] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#02C2D5] hover:text-[#020F33] transition-all duration-300 shadow-[0_2px_10px_rgba(2,15,51,0.15)] hover:shadow-[0_6px_20px_rgba(2,197,213,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02C2D5]/50 focus-visible:ring-offset-2 shrink-0">
            <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
            Add Custom Course / Bank
          </button>
        </div>

        {subjects.length === 0 ? (
          /* ── empty state ── */
          <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-[28px] p-10 md:p-14 text-center shadow-[0_1px_3px_rgba(2,15,51,0.06)] max-w-2xl mx-auto">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#02C2D5]/[0.08] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 -left-24 w-72 h-72 bg-[#020F33]/[0.05] rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="w-20 h-20 rounded-[24px] bg-[#02C2D5]/10 border border-[#02C2D5]/20 flex items-center justify-center mx-auto mb-7">
                <Award size={38} className="text-[#02C2D5]" strokeWidth={1.8} />
              </div>

              <h2 className="text-2xl md:text-[1.75rem] font-black text-[#020F33] tracking-tight mb-3">
                Start Your BCS Journey
              </h2>
              <p className="text-slate-500 text-sm md:text-[15px] leading-relaxed max-w-md mx-auto mb-8">
                Load the official BCS Preliminary syllabus in one click — all 10 subjects,
                perfectly organized and ready for drag-and-drop prioritization.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-9">
                {['10 Official Subjects', '200 Marks Coverage', 'Custom Ordering'].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-full"
                  >
                    <CheckCircle2 size={12} className="text-[#02C2D5]" strokeWidth={2.5} />
                    {chip}
                  </span>
                ))}
              </div>

              <button
                onClick={handleInitializeSyllabus}
                disabled={isInitializing}
                className="inline-flex items-center justify-center gap-2.5 bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] font-bold px-7 py-3.5 rounded-xl text-sm transition-all duration-300 shadow-[0_4px_16px_rgba(2,15,51,0.25)] hover:shadow-[0_8px_28px_rgba(2,197,213,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#020F33] disabled:hover:text-white disabled:hover:shadow-[0_4px_16px_rgba(2,15,51,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02C2D5]/60 focus-visible:ring-offset-2"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Preparing Syllabus…
                  </>
                ) : (
                  <>
                    <BookOpen size={18} strokeWidth={2.2} />
                    Load Official Syllabus
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── sortable subject grid (same DnD logic & structure) ── */
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={subjects.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {subjects.map((subject) => (
                  <SortableItem key={subject.id} id={subject.id}>
                    <Link
                      to={`/bcs/subject/${subject.id}`}
                      aria-label={`Open ${subject.title} — ${subject.marks} marks`}
                      className="group relative block h-full bg-white border border-slate-200/80 hover:border-[#02C2D5]/40 rounded-2xl p-4 md:p-[18px] shadow-[0_1px_2px_rgba(2,15,51,0.05)] hover:shadow-[0_14px_30px_-12px_rgba(2,15,51,0.2)] transition-all duration-300 flex flex-col overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02C2D5]/50 focus-visible:ring-offset-2"
                    >
                      {/* colored top accent — subject identity */}
                      <span
                        className="absolute top-0 left-0 h-[3px] w-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(to right, ${subject.icon_color} 0%, ${subject.icon_color}66 55%, transparent 100%)`,
                        }}
                      />

                      {/* icon + drag handle */}
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center border group-hover:scale-105 transition-transform duration-300"
                          style={{ backgroundColor: `${subject.icon_color}14`, borderColor: `${subject.icon_color}2E` }}
                        >
                          {getIcon(subject.title, subject.icon_color)}
                        </div>

                        <span
                          className="text-slate-300 hover:text-[#02C2D5] cursor-grab active:cursor-grabbing p-1.5 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 z-10 transition-colors"
                          onClick={(e) => e.preventDefault()}
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical size={16} />
                        </span>
                      </div>

                      {/* title */}
                      <h3 className="text-sm font-bold text-[#020F33] leading-snug flex-1 mb-4 group-hover:text-[#02C2D5] transition-colors duration-300">
                        {subject.title}
                      </h3>

                      {/* footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200/60 tabular-nums">
                          {subject.marks} Marks
                        </span>
                        <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#02C2D5] opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                          Open
                          <ChevronRight size={13} strokeWidth={3} />
                        </span>
                      </div>
                    </Link>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}