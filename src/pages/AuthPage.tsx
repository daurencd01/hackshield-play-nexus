import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// --- Icons ---
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/>
    <path d="M19 12H5"/>
  </svg>
);

const LoaderIcon = () => (
  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

// --- Component ---
export default function AuthPage() {
  const { t } = useTranslation() as any;
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpArray, setOtpArray] = useState<string[]>(Array(8).fill(''));
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Session & UI effect hook
  useEffect(() => {
    const checkProfileAndRedirect = async (userId: string) => {
      // maybeSingle() returns null (not 406) when no row exists yet
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // DB error — send to onboarding as safe fallback
        navigate('/onboarding');
        return;
      }

      if (data?.username) {
        navigate('/');
      } else {
        // No profile row or username not set — send to onboarding
        navigate('/onboarding');
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkProfileAndRedirect(session.user.id);
    });

    // Listen to Auth State
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkProfileAndRedirect(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // --- Logic ---
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError(t('auth.email_req'));
      return;
    }
    if (!validateEmail(email)) {
      setError(t('auth.email_inv'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) throw error;
      
      setStep(2);
      setSuccess(t('auth.otp_sent'));
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const fullOtp = otpArray.join('');
    if (!fullOtp) {
      setError(t('auth.otp_req'));
      return;
    }
    if (fullOtp.length !== 8 || !/^\d+$/.test(fullOtp)) {
      setError(t('auth.otp_len'));
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: fullOtp,
        type: 'email',
      });

      if (error) throw error;

      if (data.session) {
        setSuccess(t('auth.auth_success'));
        // onAuthStateChange hook will handle redirect based on profile completion
      }
    } catch (err: any) {
      setError(err.message || t('auth.auth_fail'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      if (error) throw error;
      
      setSuccess(t('auth.otp_new_sent'));
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (/[^0-9]/.test(value)) return;
    const newOtp = [...otpArray];
    newOtp[index] = value.slice(-1);
    setOtpArray(newOtp);

    if (value && index < 7) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (!pastedData) return;
    
    const newOtp = [...otpArray];
    pastedData.split('').forEach((char, i) => {
      if (i < 8) newOtp[i] = char;
    });
    setOtpArray(newOtp);
    
    const nextIndex = Math.min(pastedData.length, 7);
    const nextInput = document.getElementById(`otp-${nextIndex}`);
    nextInput?.focus();
  };

  const handleGoBack = () => {
    setStep(1);
    setOtpArray(Array(8).fill(''));
    setError('');
    setSuccess('');
  };

  // --- UI ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f18] text-gray-100 p-4 font-sans selection:bg-cyan-500/30">
      {/* Dynamic background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[30%] h-[40%] bg-cyan-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[15%] w-[30%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl shadow-cyan-900/10 overflow-hidden">
          
          {/* Header */}
          <div className="p-8 pb-6 border-b border-gray-800/50 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-400 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <ShieldIcon />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('auth.title')}</h1>
            <p className="text-gray-400 mt-2 text-sm">
              {step === 1 ? t('auth.step_1_desc') : t('auth.step_2_desc')}
            </p>
          </div>

          <div className="p-8 pt-6">
            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                <div className="mt-0.5">⚠</div>
                <div>{error}</div>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
                <div className="mt-0.5">✓</div>
                <div>{success}</div>
              </div>
            )}

            {/* Step 1: Email Input */}
            {step === 1 && (
              <form onSubmit={handleSendCode} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {t('auth.operator_email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <MailIcon />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.placeholder_email')}
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 bg-[#0a0f18] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#111827] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <LoaderIcon />
                      <span>{t('auth.btn_init_loading')}</span>
                    </>
                  ) : (
                    <span>{t('auth.btn_init')}</span>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP Input */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 truncate pr-4">
                    {t('auth.link_established')} <span className="text-cyan-400 font-medium">{email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGoBack}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-gray-500 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <ArrowLeftIcon />
                    {t('auth.btn_change')}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <LockIcon />
                    <label className="block text-xs font-medium uppercase tracking-wider">
                      {t('auth.verification_code')}
                    </label>
                  </div>
                  <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                    {otpArray.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        disabled={isLoading}
                        className="w-full min-w-0 py-3 bg-[#0a0f18] border border-gray-700 rounded-lg text-white text-center text-lg sm:text-xl font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading || otpArray.join('').length !== 8}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#111827] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <LoaderIcon />
                        <span>{t('auth.btn_auth_loading')}</span>
                      </>
                    ) : (
                      <span>{t('auth.btn_auth')}</span>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-transparent hover:bg-white/5 border border-gray-700 hover:border-gray-500 text-gray-300 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('auth.btn_req_new')}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Footer decoration */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </div>
        
        {/* Terminal decorative element text */}
        <div className="mt-8 text-center text-xs font-mono text-gray-600 space-y-1">
          <p>{t('auth.terminal_v')}</p>
          <p>{t('auth.encryption')} <span className="text-emerald-500/50">{t('auth.active')}</span></p>
        </div>
      </div>
    </div>
  );
}
