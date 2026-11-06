import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Book, BookOpen, ScrollText, PenTool, 
  BarChart2, ArrowLeft, Moon
} from 'lucide-react';

import QuranWorkspace from './tabs/QuranWorkspace';
import HifzTracker from './tabs/HifzTracker';

export default function AlHikmahWorkspace() {
  const [activeTab, setActiveTab] = useState<'quran' | 'hadith' | 'hifz' | 'library' | 'journal'>('quran');

  const tabs = [
    { id: 'quran', name: 'Al-Quran', icon: <Book size={14} /> },
    { id: 'hadith', name: 'Hadith', icon: <BookOpen size={14} /> },
    { id: 'hifz', name: 'Hifz Tracker', icon: <BarChart2 size={14} /> },
    { id: 'library', name: 'Library', icon: <ScrollText size={14} /> },
    { id: 'journal', name: 'Journal', icon: <PenTool size={14} /> },
  ];

  return (
    // h-[100dvh] এবং overflow-hidden নিশ্চিত করবে যে মূল পেজ স্ক্রল হবে না
    <div className="h-[100dvh] w-full bg-[#FDFCF7] flex flex-col font-sans overflow-hidden">
      
      {/* ================= MOBILE TOP HEADER ================= */}
      <div className="lg:hidden flex flex-col bg-white border-b border-emerald-100/50 z-30 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-emerald-500 fill-emerald-500/20" /> 
            <h1 className="text-base font-black text-emerald-950 leading-tight">Al-Hikmah</h1>
          </div>
          <Link to="/" className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
        
        <div className="flex overflow-x-auto hide-scrollbar px-2 pb-2 gap-1 bg-[#FDFCF7] border-t border-emerald-50">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700/70 hover:bg-emerald-100/50'}`}>
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* ================= DESKTOP TOP NAVBAR ================= */}
      <div className="hidden lg:flex bg-white border-b border-emerald-100/50 px-6 py-4 justify-between items-center z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-emerald-950 flex items-center gap-2">
              <Moon size={20} className="text-emerald-500 fill-emerald-500/20" /> Al-Hikmah
            </h1>
            <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-0.5">Deen & Knowledge Workspace</p>
          </div>
        </div>
        <div className="flex bg-emerald-50/50 border border-emerald-100 rounded-2xl p-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700/60 hover:text-emerald-700 hover:bg-emerald-100/50'}`}>
              {tab.icon} {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* ================= TAB ROUTING AREA ================= */}
      {/* flex-1 এবং overflow-hidden চাইল্ড কম্পোনেন্টগুলোকে নিজের মতো স্ক্রল করার জায়গা দেবে */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        {activeTab === 'quran' && <QuranWorkspace />}
        {activeTab === 'hifz' && <HifzTracker />}
        
        {['hadith', 'library', 'journal'].includes(activeTab) && (
          <div className="flex-1 flex flex-col items-center justify-center text-emerald-300 bg-[#FDFCF7]">
            <Moon size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-emerald-700 capitalize">{activeTab} Module</h2>
            <p className="text-sm text-emerald-600/60 mt-2">Coming Soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}