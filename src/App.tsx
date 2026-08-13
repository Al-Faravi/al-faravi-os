import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Home, Shield, Wallet, BookOpen, Users, Target } from 'lucide-react';

// Import Features
import AuthPage from './features/auth/AuthPage';
import ModernDashboard from './features/dashboard/ModernDashboard';
import VaultManager from './features/vault/VaultManager';
import FinanceManager from './features/finance/FinanceManager';
import LmsManager from './features/lms/LmsManager';
import LmsWorkspace from './features/lms/LmsWorkspace';
import BcsManager from './features/bcs/BcsManager';
import BcsWorkspace from './features/bcs/BcsWorkspace';
import FamilyManager from './features/family/FamilyManager';
import GithubHub from './features/github/GithubHub';
import Settings from './features/dashboard/Settings';

// নতুন যোগ করা ফিচারসমূহ
import SnippetVault from './features/developer/SnippetVault';
import JobTracker from './features/developer/JobTracker';

// গ্লোবাল সার্চ কম্পোনেন্ট (Cmd+K)
import CommandPalette from './components/CommandPalette';

// Placeholder for upcoming modules
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-[#020F33]">
    <h2 className="text-3xl font-bold mb-4">{title}</h2>
    <p className="text-[#475569]">This module is under construction.</p>
  </div>
);

// Floating Dock Navigation
const FloatingDock = () => {
  const location = useLocation();
  
  if (location.pathname.includes('/lms/course/') || location.pathname.includes('/bcs/subject/')) return null;
  
  const navItems = [
    { path: '/', icon: <Home size={24} />, label: 'Home' },
    { path: '/lms', icon: <BookOpen size={24} />, label: 'LMS' },
    { path: '/bcs', icon: <Target size={24} />, label: 'BCS Prep' },
    { path: '/vault', icon: <Shield size={24} />, label: 'Vault' },
    { path: '/finance', icon: <Wallet size={24} />, label: 'Finance' },
    { path: '/family', icon: <Users size={24} />, label: 'Family' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-[#E2E8F0] p-2 rounded-2xl shadow-2xl flex items-center gap-2 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
                        (item.path === '/lms' && location.pathname.startsWith('/lms')) ||
                        (item.path === '/bcs' && location.pathname.startsWith('/bcs'));
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
  
  // 💡 2FA Security State
  const [mfaNeeded, setMfaNeeded] = useState(false);

  useEffect(() => {
    // 💡 ফাংশন: সেশন এবং 2FA (AAL Level) চেক করা
    const checkAuth = async (currentSession: any) => {
      if (currentSession) {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        // যদি currentLevel aal1 (শুধু পাসওয়ার্ড) হয়, কিন্তু ইউজারের aal2 (2FA) অ্যাক্টিভ থাকে, তবে আটকে দাও!
        if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
          setMfaNeeded(true);
        } else {
          setMfaNeeded(false);
        }
      } else {
        setMfaNeeded(false);
      }
      setSession(currentSession);
      setLoading(false);
    };

    // ১. শুরুতে লোড হওয়ার সময় চেক করবে
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(session);
    });

    // ২. লগইন বা লগআউট ইভেন্ট হলে চেক করবে
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      checkAuth(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-bold text-[#02C2D5]">Loading Al_Faravi OS...</div>;
  }

  // 🛡️ THE ULTIMATE LOCK: যদি সেশন না থাকে, অথবা সেশন আছে কিন্তু 2FA কোড দেয়নি -> AuthPage-এ আটকে রাখো!
  if (!session || mfaNeeded) {
    return <AuthPage />;
  }

  return (
    <Router>
      {/* গ্লোবাল সার্চ কম্পোনেন্ট (Cmd+K) */}
      <CommandPalette />
      
      <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-[#02C2D5] selection:text-[#020F33]">
        <Routes>
          <Route path="/" element={<ModernDashboard />} />
          <Route path="/vault" element={<VaultManager />} />
          <Route path="/finance" element={<FinanceManager />} />
          <Route path="/lms" element={<LmsManager />} />
          <Route path="/lms/course/:courseId" element={<LmsWorkspace />} />
          
          {/* BCS Routes */}
          <Route path="/bcs" element={<BcsManager />} />
          <Route path="/bcs/subject/:subjectId" element={<BcsWorkspace />} /> 
          
          {/* Family Route */}
          <Route path="/family" element={<FamilyManager />} />

          {/* GitHub Route */}
          <Route path="/github" element={<GithubHub />} />
          
          {/* Developer Tools Routes */}
          <Route path="/snippets" element={<SnippetVault />} />
          <Route path="/jobs" element={<JobTracker />} />
          
          {/* Settings Route */}
          <Route path="/settings" element={<Settings />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        <FloatingDock />
      </div>
    </Router>
  );
}