import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4 selection:bg-[#02C2D5] selection:text-[#020F33]">
      {/* Auth Card */}
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] shadow-2xl p-8 rounded-3xl z-10">
        
        {/* Logo Section - Directly from your path */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-40 mb-6">
            <img 
              src="/icons/alfaravi logo.png" 
              alt="AlFaravi Logo" 
              className="w-full h-auto object-contain"
            />
          </div>
          <p className="text-[#475569] text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[#02C2D5]" /> Private & Secure System
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 text-[#475569]" size={18} />
            <input
              type="email"
              placeholder="Admin Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-3 pl-10 pr-4 text-[#020F33] focus:outline-none focus:ring-2 focus:ring-[#02C2D5] transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 text-[#475569]" size={18} />
            <input
              type="password"
              placeholder="Master Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-3 pl-10 pr-4 text-[#020F33] focus:outline-none focus:ring-2 focus:ring-[#02C2D5] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#020F33] hover:bg-[#02C2D5] text-white hover:text-[#020F33] font-bold py-3.5 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-70 mt-2 flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Unlock System'}
          </button>
        </form>
      </div>
    </div>
  );
}