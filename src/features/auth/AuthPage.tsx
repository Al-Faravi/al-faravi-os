import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2, ShieldCheck, Smartphone, ArrowLeft } from 'lucide-react';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2FA (MFA) States
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');

  // ==========================================
  // Step 1: Email & Password Login
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;

      // 💡 চেক করা হচ্ছে ইউজারের একাউন্টে 2FA অন করা আছে কি না
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      // currentLevel 'aal1' মানে পাসওয়ার্ড ঠিক আছে, আর nextLevel 'aal2' মানে 2FA লাগবে!
      if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;

        // ভেরিফাই করা Authenticator (TOTP) খুঁজে বের করা
        const totpFactor = factors.totp.find(factor => factor.status === 'verified');
        
        if (totpFactor) {
          setFactorId(totpFactor.id);
          setMfaRequired(true); // 2FA স্ক্রিন ওপেন হবে
          setLoading(false);
          return; // এখানেই থেমে যাবে, 2FA কোড না দেওয়া পর্যন্ত ভেতরে ঢুকতে দেবে না
        }
      }

      // যদি 2FA অন করা না থাকে, তবে সরাসরি লগইন হয়ে যাবে (App.tsx হ্যান্ডেল করবে)
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      if (!mfaRequired) setLoading(false);
    }
  };

  // ==========================================
  // Step 2: Verify 2FA Code
  // ==========================================
  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) throw verifyError;

      // 2FA সাকসেস! এখন লগইন কমপ্লিট। (বাকিটা App.tsx-এর Auth Listener হ্যান্ডেল করবে)
    } catch (err: any) {
      setError('Invalid 2FA code. Please check your app.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center p-4 selection:bg-[#02C2D5] selection:text-[#020F33]">
      {/* Auth Card */}
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] shadow-2xl p-8 rounded-3xl z-10 overflow-hidden relative">
        
        {/* Logo Section */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-40 mb-6 transition-all duration-300 transform">
            <img 
              src="/icons/alfaravi logo.png" 
              alt="AlFaravi Logo" 
              className="w-full h-auto object-contain"
            />
          </div>
          <p className="text-[#475569] text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck size={16} className={mfaRequired ? "text-sky-500" : "text-[#02C2D5]"} /> 
            {mfaRequired ? 'Two-Factor Authentication' : 'Private & Secure System'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* --- STATE 1: STANDARD LOGIN FORM --- */}
        {!mfaRequired ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-300">
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
        ) : 

        /* --- STATE 2: 2FA (MFA) CODE FORM --- */
        (
          <form onSubmit={handleVerifyMfa} className="space-y-5 animate-in slide-in-from-right-8 duration-300">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center">
                <Smartphone size={32} />
              </div>
            </div>
            
            <div className="text-center space-y-1 mb-4">
              <h3 className="font-bold text-[#020F33] text-lg">Authenticator App</h3>
              <p className="text-sm text-slate-500">Enter the 6-digit code from Microsoft Authenticator.</p>
            </div>

            <input
              type="text"
              required
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))} // শুধু সংখ্যা নিবে
              className="w-full text-center tracking-[0.5em] text-3xl font-black bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-4 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-[#020F33]"
              placeholder="••••••"
            />

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-sky-500/25 transition-all duration-300 disabled:opacity-70 mt-2 flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMfaRequired(false);
                setMfaCode('');
                supabase.auth.signOut(); // আগের হাফ-লগইন ক্যানসেল করা
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#020F33] transition-colors py-2"
            >
              <ArrowLeft size={16} /> Cancel & Go Back
            </button>
          </form>
        )}

      </div>
    </div>
  );
}