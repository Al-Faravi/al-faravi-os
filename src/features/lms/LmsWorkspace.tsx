import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft, Columns, MonitorPlay, FileText, 
  PlayCircle, File, CheckCircle2, Save, Loader2, Plus
} from 'lucide-react';

export default function LmsWorkspace() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  
  // Workspace States
  const [viewMode, setViewMode] = useState<'split' | 'media' | 'notes'>('split');
  const [activeContent, setActiveContent] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Mock Data (পরে ডাটাবেস থেকে আসবে)
  const course = { title: "BCS Preparation" };
  const modules = [
    {
      id: 'm1', title: 'বাংলাদেশ বিষয়াবলি', 
      contents: [
        { id: 'c1', title: 'প্রাচীন বাংলার ইতিহাস', type: 'youtube', url: 'https://www.youtube.com/embed/ScMzIvxBSi4', isCompleted: true },
        { id: 'c2', title: 'সংবিধান ও শাসনব্যবস্থা', type: 'pdf', url: '', isCompleted: false }
      ]
    },
    {
      id: 'm2', title: 'English Grammar', 
      contents: [
        { id: 'c3', title: 'Parts of Speech Masterclass', type: 'youtube', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', isCompleted: false }
      ]
    }
  ];

  useEffect(() => {
    // ডেমো ডেটা লোড করার সিমুলেশন
    setTimeout(() => {
      setActiveContent(modules[0].contents[0]);
      setNotes('প্রাচীন বাংলার জনপদ:\n১. পুণ্ড্র\n২. বঙ্গ\n৩. গৌড়\n\nমৌর্য ও গুপ্ত সাম্রাজ্যের প্রভাব...');
      setLoading(false);
    }, 500);
  }, [courseId]);

  const handleSaveNotes = async () => {
    setIsSavingNote(true);
    // ডাটাবেসে নোট সেভ করার লজিক
    setTimeout(() => setIsSavingNote(false), 800);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-[#02C2D5]" size={40} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-[#020F33] overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/lms" className="p-2 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-[#475569]" />
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight">{course.title}</h1>
            <p className="text-xs text-[#02C2D5] font-bold uppercase tracking-wider">Workspace Mode</p>
          </div>
        </div>

        {/* View Mode Toggles */}
        <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
          <button 
            onClick={() => setViewMode('media')} 
            className={`p-2 rounded-md flex items-center gap-2 transition-all text-sm font-bold ${viewMode === 'media' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`} 
            title="Focus Media"
          >
            <MonitorPlay size={16} /> <span className="hidden md:inline">Media</span>
          </button>
          <button 
            onClick={() => setViewMode('split')} 
            className={`p-2 rounded-md flex items-center gap-2 transition-all text-sm font-bold ${viewMode === 'split' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`} 
            title="Split Screen"
          >
            <Columns size={16} /> <span className="hidden md:inline">Split</span>
          </button>
          <button 
            onClick={() => setViewMode('notes')} 
            className={`p-2 rounded-md flex items-center gap-2 transition-all text-sm font-bold ${viewMode === 'notes' ? 'bg-[#020F33] text-white shadow' : 'text-[#475569] hover:text-[#020F33]'}`} 
            title="Focus Notes"
          >
            <FileText size={16} /> <span className="hidden md:inline">Notes</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar (Syllabus/Modules) */}
        <aside className="w-80 bg-white border-r border-[#E2E8F0] flex flex-col overflow-y-auto shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
            <h2 className="font-bold">Course Syllabus</h2>
            <button className="text-[#02C2D5] hover:text-[#020F33]"><Plus size={20} /></button>
          </div>
          
          <div className="p-3">
            {modules.map(mod => (
              <div key={mod.id} className="mb-4">
                <h3 className="text-sm font-bold text-[#475569] mb-2 px-2 uppercase tracking-wider">{mod.title}</h3>
                <div className="space-y-1">
                  {mod.contents.map(content => (
                    <button 
                      key={content.id}
                      onClick={() => setActiveContent(content)}
                      className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all ${activeContent?.id === content.id ? 'bg-[#020F33] text-white shadow-md' : 'hover:bg-[#F8FAFC] text-[#020F33]'}`}
                    >
                      <div className={`mt-0.5 ${activeContent?.id === content.id ? 'text-[#02C2D5]' : 'text-[#A3D803]'}`}>
                        {content.isCompleted ? <CheckCircle2 size={16} /> : content.type === 'youtube' ? <PlayCircle size={16} /> : <File size={16} />}
                      </div>
                      <span className="text-sm font-medium leading-snug">{content.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Dynamic Workspace Area */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#F8FAFC] p-4 gap-4">
          
          {/* Media Player Pane */}
          {(viewMode === 'split' || viewMode === 'media') && (
            <div className={`flex flex-col bg-black rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'md:w-1/2' : 'w-full'} transition-all duration-300`}>
              {activeContent?.type === 'youtube' ? (
                <iframe 
                  className="w-full h-full min-h-[300px]" 
                  src={activeContent.url} 
                  title={activeContent.title}
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white p-6">
                  <MonitorPlay size={64} className="opacity-20 mb-4" />
                  <p className="font-bold">Media Viewer</p>
                  <p className="text-sm opacity-60">Select a video or PDF from syllabus</p>
                </div>
              )}
            </div>
          )}

          {/* Notes Pane */}
          {(viewMode === 'split' || viewMode === 'notes') && (
            <div className={`flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] ${viewMode === 'split' ? 'md:w-1/2' : 'w-full'} transition-all duration-300`}>
              <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="font-bold flex items-center gap-2"><FileText size={18} className="text-[#02C2D5]" /> Live Notes</h3>
                <button 
                  onClick={handleSaveNotes}
                  className="bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  {isSavingNote ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save</>}
                </button>
              </div>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your notes here while watching/reading..."
                className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-inset focus:ring-2 focus:ring-[#02C2D5] text-[#020F33] leading-relaxed"
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}