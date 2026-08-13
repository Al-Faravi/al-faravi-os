import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Shield, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Mail, 
  Lock, 
  Settings as SettingsIcon, 
  User,
  Smartphone,
  QrCode
} from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [secError, setSecError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // 3FA Security States (Email OTP for Vault)
  const [securityStep, setSecurityStep] = useState(0); // 0: Idle, 1: Init, 2: OTP, 3: Set PIN
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Google Authenticator States (TOTP for Main Login)
  const [mfaStep, setMfaStep] = useState(0); // 0: Idle, 1: Show QR, 2: Active
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // ==========================================
  // 1. VAULT 3FA (EMAIL OTP) FLOW
  // ==========================================
  
  const handleSendOtp = async () => {
    setLoading(true);
    setSecError('');
    
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        method: 'POST'
      });

      if (error) throw error;
      setSecurityStep(2); 
      setSuccessMsg('OTP has been sent to your email.');
    } catch (err: any) {
      console.error(err);
      setSecError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('otp_code', otpCode)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setSecError('Invalid or expired OTP code.');
      } else {
        setSuccessMsg('OTP Verified Successfully!');
        setSecurityStep(3); 
      }
    } catch (err) {
      setSecError('Error verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setSuccessMsg('');

    if (newPin.length < 4) {
      setSecError('PIN must be at least 4 digits long.');
      return;
    }
    if (newPin !== confirmPin) {
      setSecError('PINs do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.auth.updateUser({
        data: { vault_pin: newPin }
      });

      if (error) throw error;

      setSuccessMsg('Security PIN updated successfully!');
      setSecurityStep(0);
      setOtpCode('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      console.error(err);
      setSecError('Failed to update PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. MAIN LOGIN 2FA (GOOGLE AUTHENTICATOR) FLOW
  // ==========================================

  const handleSetupMfa = async () => {
    setLoading(true);
    setSecError('');
    setSuccessMsg('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });
      if (error) throw error;

      setQrCodeSvg(data.totp.qr_code);
      setMfaFactorId(data.id);
      setMfaStep(1); 
    } catch (err: any) {
      setSecError('Failed to setup Authenticator: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSecError('');

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) throw verifyError;

      setSuccessMsg('Google Authenticator successfully linked!');
      setMfaStep(2); 
      setMfaCode('');
    } catch (err: any) {
      setSecError('Invalid authentication code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-10">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#020F33]">
              <SettingsIcon size={22} />
            </div>
            <h1 className="text-2xl font-black text-[#020F33] tracking-tight">System Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Global Notifications */}
        {secError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium shadow-sm animate-in slide-in-from-top-2">
            <AlertTriangle size={18} /> {secError}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium shadow-sm animate-in slide-in-from-top-2">
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}

        {/* ============================== */}
        {/* Module 1: Vault PIN (Email OTP) */}
        {/* ============================== */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#020F33]">Vault Security (3FA)</h2>
              <p className="text-sm text-[#475569] mt-1">Manage your Secure Vault PIN with Email OTP protection.</p>
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
            {securityStep === 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[#020F33] font-bold flex items-center gap-2">
                    <Lock size={16} className="text-slate-400" /> Secure Vault PIN
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Update the numeric PIN required to access your Vault. Requires Email OTP verification.
                  </p>
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="bg-[#020F33] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0A1945] transition-colors whitespace-nowrap shadow-md disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? 'Processing...' : 'Reset PIN'}
                </button>
              </div>
            )}

            {securityStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="animate-in fade-in zoom-in-95 duration-300">
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                    <Mail size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-[#020F33]">Enter OTP Code</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">We've sent a temporary one-time password to your email.</p>
                </div>
                <div className="max-w-xs mx-auto">
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit code"
                    className="w-full text-center tracking-widest text-xl font-bold bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] focus:border-transparent transition-all mb-4"
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSecurityStep(0)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading || otpCode.length < 4} className="flex-1 px-4 py-3 rounded-xl bg-[#02C2D5] text-[#020F33] font-black hover:bg-[#00A8B8] transition-colors disabled:opacity-70 shadow-md">
                      Verify
                    </button>
                  </div>
                </div>
              </form>
            )}

            {securityStep === 3 && (
              <form onSubmit={handleSetNewPin} className="animate-in fade-in zoom-in-95 duration-300">
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                    <Key size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-[#020F33]">Set New PIN</h3>
                </div>
                <div className="max-w-xs mx-auto space-y-4">
                  <input type="password" inputMode="numeric" required value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="New PIN" className="w-full text-center tracking-widest text-xl font-bold bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] transition-all" />
                  <input type="password" inputMode="numeric" required value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="Confirm New PIN" className="w-full text-center tracking-widest text-xl font-bold bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#02C2D5] transition-all" />
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setSecurityStep(0)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading || !newPin || !confirmPin} className="flex-1 px-4 py-3 rounded-xl bg-[#020F33] text-white font-black hover:bg-[#0A1945] transition-colors disabled:opacity-70 shadow-md">
                      Save PIN
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ============================== */}
        {/* Module 2: Main Login 2FA (TOTP) */}
        {/* ============================== */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#020F33]">Main Login (2FA)</h2>
              <p className="text-sm text-[#475569] mt-1">Secure your main OS login with Google Authenticator.</p>
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
            {mfaStep === 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[#020F33] font-bold flex items-center gap-2">
                    <QrCode size={16} className="text-slate-400" /> Authenticator App
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Use an app like Google Authenticator or Authy to generate login codes.
                  </p>
                </div>
                <button
                  onClick={handleSetupMfa}
                  disabled={loading}
                  className="bg-sky-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-sky-600 transition-colors whitespace-nowrap shadow-md disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? 'Loading...' : 'Setup Authenticator'}
                </button>
              </div>
            )}

            {mfaStep === 1 && (
              <form onSubmit={handleVerifyMfa} className="animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* QR Code Display */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                    <img 
                      src={qrCodeSvg} 
                      alt="2FA QR Code" 
                      className="w-48 h-48 rounded-xl border border-slate-100" 
                    />
                  </div>
                  
                  {/* Instructions & Input */}
                  <div className="flex-1 w-full max-w-sm">
                    <h3 className="text-lg font-bold text-[#020F33] mb-2">Scan the QR Code</h3>
                    <ol className="text-sm text-slate-600 space-y-2 mb-6 list-decimal pl-4">
                      <li>Open Google Authenticator or Authy.</li>
                      <li>Scan the QR code shown on the left.</li>
                      <li>Enter the 6-digit code generated by the app below.</li>
                    </ol>

                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="w-full text-center tracking-widest text-2xl font-bold bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all mb-4"
                    />
                    
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setMfaStep(0)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={loading || mfaCode.length !== 6} className="flex-1 px-4 py-3 rounded-xl bg-sky-500 text-white font-black hover:bg-sky-600 transition-colors disabled:opacity-70 shadow-md">
                        Activate 2FA
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {mfaStep === 2 && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle className="text-emerald-500" size={24} />
                <div>
                  <h3 className="font-bold text-emerald-800">Authenticator is Active</h3>
                  <p className="text-xs text-emerald-600 mt-0.5">Your main login is now protected by 2FA.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Placeholder */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 md:p-8 shadow-sm opacity-70">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 shrink-0">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#020F33]">Profile Information</h2>
              <p className="text-sm text-[#475569] mt-1">Manage your personal details and app preferences.</p>
              <div className="mt-4 inline-block bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1 rounded-md border border-slate-200">
                Coming Soon
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}