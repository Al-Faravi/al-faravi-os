// src/features/workspace/WorkspaceLogin.tsx
import React, { useState, useEffect } from 'react';
import { workspaceSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function WorkspaceLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await workspaceSupabase.auth.getSession();
      if (session) navigate('/workspace/dashboard');
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    const { error } = await workspaceSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      navigate('/workspace/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0D0E0F] text-[#F5F5F5] font-sans selection:bg-[#FF9D2E]/30">
      
      {/* LEFT SIDE - Brand & Illustration (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#141516] flex-col justify-between p-12 overflow-hidden border-r border-[#292B2E]">
        {/* Background Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#FF9D2E]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#E83FCB]/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF9D2E] to-[#E83FCB] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF9D2E]/20">
              <Sparkles size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Al_Faravi-os</h1>
          </div>

          <h2 className="text-5xl font-black leading-[1.1] mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Your Ultimate <br /> Collaborative <br /> Study Portal.
          </h2>
          <p className="text-[#A3A5A8] text-lg max-w-md leading-relaxed">
            Access premium courses, sync progress with study groups, and connect with peers in real-time.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-[#1D1E20]/50 backdrop-blur-sm border border-[#292B2E] rounded-2xl w-max">
            <ShieldCheck className="text-[#19C784]" size={24} />
            <div>
              <p className="font-bold text-sm text-white">Private & Secure</p>
              <p className="text-xs text-[#707277]">Invite-only access</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[#1D1E20]/50 backdrop-blur-sm border border-[#292B2E] rounded-2xl w-max">
            <Zap className="text-[#FF9D2E]" size={24} />
            <div>
              <p className="font-bold text-sm text-white">Real-time Sync</p>
              <p className="text-xs text-[#707277]">Live chat and course updates</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        
        {/* Mobile Background Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#FF9D2E]/10 rounded-full blur-[100px] lg:hidden pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex flex-col items-center lg:hidden mb-10 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#FF9D2E] to-[#E83FCB] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF9D2E]/20 mb-4">
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white">Welcome Back</h1>
            <p className="text-[#A3A5A8] text-sm mt-2">Log in to your workspace account</p>
          </div>

          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-black text-white mb-2">Log in</h2>
            <p className="text-[#A3A5A8]">Enter your credentials to access the workspace.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium animate-shake">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#A3A5A8] ml-1">Email Address</label>
              <input
                type="email"
                placeholder="student@example.com"
                className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] focus:ring-2 focus:ring-[#FF9D2E]/20 rounded-xl px-4 py-3.5 text-white placeholder:text-[#707277] outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-sm font-bold text-[#A3A5A8] ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-[#141516] border border-[#292B2E] focus:border-[#FF9D2E] focus:ring-2 focus:ring-[#FF9D2E]/20 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder:text-[#707277] outline-none transition-all tracking-wide"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#707277] hover:text-[#F5F5F5] transition-colors p-1"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full mt-4 bg-[#FF9D2E] hover:bg-[#FFAA3D] disabled:bg-[#FF9D2E]/50 text-[#0D0E0F] font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(255,157,46,0.15)] hover:shadow-[0_0_30px_rgba(255,170,61,0.3)] disabled:shadow-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0D0E0F] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Enter Workspace <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs text-[#707277]">
              Need access? Contact your workspace administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Shake Animation for Errors */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}