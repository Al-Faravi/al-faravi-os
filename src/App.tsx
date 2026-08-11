import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Home, Shield, Wallet, BookOpen, Users, LogOut, Clock, Calendar, Sparkles } from 'lucide-react';

// Import Features
import AuthPage from './features/auth/AuthPage';
import TaskManager from './features/dashboard/TaskManager';
import VaultManager from './features/vault/VaultManager';
import FinanceManager from './features/finance/FinanceManager';
import LmsManager from './features/lms/LmsManager';

// Placeholder for upcoming modules
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-[#020F33]">
    <h2 className="text-3xl font-bold mb-4">{title}</h2>
    <p className="text-[#475569]">This module is under construction.</p>
  </div>
);

// Modern Dashboard Component
const ModernDashboard = () => {
  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto mb-28 text-[#020F33]">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-[#020F33]">
            Al_Faravi OS <Sparkles className="text-[#A3D803] w-7 h-7 fill-[#A3D803]" />
          </h1>
          <p className="text-[#475569] mt-2 font-medium">Ready to focus on your goals today?</p>
        </div>
        
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-600 border border-[#E2E8F0] px-4 py-2.5 rounded-xl transition-colors font-medium text-sm shadow-sm"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[200px]">
        {/* Primary Navy Widget */}
        <div className="md:col-span-2 row-span-1 bg-[#020F33] rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={100} /></div>
          <div>
            <p className="text-[#02C2D5] font-semibold tracking-wide uppercase text-xs">System Active</p>
            <h2 className="text-3xl font-bold mt-1 text-white">
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <p className="text-slate-300 text-sm font-medium flex items-center gap-2">
            <Calendar size={16} className="text-[#A3D803]" /> 
            {new Date().toLocaleDateString('en-GB', { weekday: 'long' })} - Personal Brand Ecosystem
          </p>
        </div>

        {/* TaskManager Widget */}
        <div className="md:col-span-2 row-span-2">
          <TaskManager />
        </div>
      </div>
    </div>
  );
};

// Floating Dock Navigation
const FloatingDock = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'Home' },
    { path: '/vault', icon: <Shield size={24} />, label: 'Vault' },
    { path: '/finance', icon: <Wallet size={24} />, label: 'Finance' },
    { path: '/lms', icon: <BookOpen size={24} />, label: 'LMS' },
    { path: '/family', icon: <Users size={24} />, label: 'Family' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-[#E2E8F0] p-2 rounded-2xl shadow-2xl flex items-center gap-2 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`relative group p-3 rounded-xl transition-all duration-300 ${
              isActive 
                ? 'bg-[#020F33] text-white shadow-md scale-110' 
                : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#02C2D5]'
            }`}
          >
            {item.icon}
            
            {/* Tooltip */}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#020F33] text-white text-xs font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

// Main App Component
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-[#02C2D5]">Loading Al_Faravi OS...</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-[#02C2D5] selection:text-[#020F33]">
        <Routes>
          <Route path="/" element={<ModernDashboard />} />
          <Route path="/vault" element={<VaultManager />} />
          <Route path="/finance" element={<FinanceManager />} />
          <Route path="/lms" element={<LmsManager />} />
          <Route path="/family" element={<PlaceholderPage title="Family Log (Coming Soon)" />} />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        <FloatingDock />
      </div>
    </Router>
  );
}