import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Icons ──────────────────────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" x2="22" y1="2" y2="22"/>
  </svg>
);

const Spinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

// ── Input Component ────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
  error?: string;
  rightElement?: React.ReactNode;
}

const Field = ({ label, icon, error, rightElement, ...props }: InputProps) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">
      {label}
    </label>
    <div className="relative">
      <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 pointer-events-none">
        {icon}
      </span>
      <input
        {...props}
        className={`w-full pl-9 ${rightElement ? 'pr-10' : 'pr-4'} py-3 bg-[#0d1421] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-all text-sm
          ${error ? 'border-red-500/60' : 'border-gray-700/80 hover:border-gray-600'}
          ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {rightElement && (
        <span className="absolute inset-y-0 right-3 flex items-center">
          {rightElement}
        </span>
      )}
    </div>
    {error && <p className="text-xs text-red-400 pl-1">{error}</p>}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
type Tab = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signIn, signUp, verifyOtp } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const redirectingRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);

  // OTP Verification form
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [otpError, setOtpError] = useState('');

  // Password visibility
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Register form
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // ── Redirect if already signed in ─────────────────────────────────────
  useEffect(() => {
    if (authLoading || redirectingRef.current) return;
    if (!session) return;
    if (isVerifyingOtpRef.current) return;

    redirectingRef.current = true;
    (async () => {
      const { data } = await (supabase.from('profiles') as any)
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();
      navigate(data?.username ? '/' : '/onboarding', { replace: true });
    })();
  }, [session, authLoading, navigate]);

  // ── Tab switch reset ────────────────────────────────────────────────────
  const switchTab = (t: Tab) => {
    setTab(t);
    setGlobalError('');
    setSuccessMsg('');
    setLoginErrors({});
    setRegErrors({});
    setShowOtpInput(false);
    setOtpToken('');
    setOtpError('');
  };

  // ── Validation helpers ──────────────────────────────────────────────────
  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // ── LOGIN ───────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMsg('');

    const errs: Record<string, string> = {};
    if (!loginEmail.trim()) errs.email = 'Введите email';
    else if (!validateEmail(loginEmail.trim())) errs.email = 'Некорректный email';
    if (!loginPassword) errs.password = 'Введите пароль';
    setLoginErrors(errs);
    if (Object.keys(errs).length) return;

    setIsLoading(true);
    try {
      const result = await signIn(loginEmail.trim().toLowerCase(), loginPassword);
      if (!result.success) {
        // Human-readable Russian errors
        const msg = result.error || '';
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          setGlobalError('Неверный email или пароль.');
        } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
          setGlobalError('Почта не подтверждена. Пожалуйста, введите код подтверждения.');
          setRegEmail(loginEmail.trim().toLowerCase());
          setTab('register');
          setShowOtpInput(true);
        } else if (msg.includes('Too many requests')) {
          setGlobalError('Слишком много попыток. Подождите немного.');
        } else {
          setGlobalError(msg || 'Ошибка входа. Попробуйте ещё раз.');
        }
      }
      // On success: onAuthStateChange fires → useEffect redirects
    } finally {
      setIsLoading(false);
    }
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setSuccessMsg('');

    const errs: Record<string, string> = {};
    if (!regEmail.trim()) errs.email = 'Введите email';
    else if (!validateEmail(regEmail.trim())) errs.email = 'Некорректный email';

    if (!regUsername.trim()) errs.username = 'Введите никнейм';
    else if (regUsername.trim().length < 3) errs.username = 'Никнейм минимум 3 символа';
    else if (regUsername.trim().length > 20) errs.username = 'Никнейм максимум 20 символов';
    else if (!/^[a-zA-Z0-9_]+$/.test(regUsername.trim())) errs.username = 'Только латиница, цифры и _';

    if (!regFullName.trim()) errs.fullName = 'Введите имя';

    if (!regPassword) errs.password = 'Введите пароль';
    else if (regPassword.length < 6) errs.password = 'Минимум 6 символов';

    if (!regConfirm) errs.confirm = 'Подтвердите пароль';
    else if (regPassword !== regConfirm) errs.confirm = 'Пароли не совпадают';

    setRegErrors(errs);
    if (Object.keys(errs).length) return;

    setIsLoading(true);
    try {
      const result = await signUp(
        regEmail.trim().toLowerCase(),
        regPassword,
        regUsername.trim(),
        regFullName.trim(),
      );

      if (!result.success) {
        const msg = result.error || '';
        if (msg.includes('already registered') || msg.includes('already been registered')) {
          setGlobalError('Этот email уже зарегистрирован. Войдите или восстановите пароль.');
        } else if (msg.includes('никнейм') || msg.includes('Этот никнейм')) {
          setGlobalError(msg);
        } else {
          setGlobalError(msg || 'Ошибка регистрации. Попробуйте ещё раз.');
        }
        return;
      }

      if (result.needsConfirmation) {
        setShowOtpInput(true);
        setOtpToken('');
        setOtpError('');
      }
      // If email confirmation is off: onAuthStateChange fires → redirect
    } finally {
      setIsLoading(false);
    }
  };

  // ── VERIFY OTP ──────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setGlobalError('');

    if (!otpToken.trim()) {
      setOtpError('Введите код подтверждения');
      return;
    }
    if (otpToken.trim().length !== 6) {
      setOtpError('Код должен состоять из 6 цифр');
      return;
    }

    setIsLoading(true);
    isVerifyingOtpRef.current = true;
    try {
      const result = await verifyOtp(regEmail.trim().toLowerCase(), otpToken.trim());
      if (!result.success) {
        isVerifyingOtpRef.current = false;
        // Human-readable errors
        const msg = result.error || '';
        if (msg.includes('invalid_grant') || msg.includes('Invalid token') || msg.includes('token has expired')) {
          setOtpError('Неверный или истекший код.');
        } else {
          setOtpError(msg || 'Неверный код подтверждения. Попробуйте ещё раз.');
        }
      } else {
        // Success
        await supabase.auth.signOut();
        isVerifyingOtpRef.current = false;
        
        setShowOtpInput(false);
        setSuccessMsg('Аккаунт успешно подтвержден! Теперь вы можете войти в систему.');
        setLoginEmail(regEmail);
        setLoginPassword('');
        setTab('login');
      }
    } catch (err: any) {
      isVerifyingOtpRef.current = false;
      setOtpError(err.message || 'Ошибка верификации.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading screen ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080d16]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080d16] text-gray-100 p-4 font-sans">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/8 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/8 blur-[160px] rounded-full" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,1) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,1) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-[#0f1923]/90 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="pt-8 pb-5 px-8 text-center border-b border-gray-800/40">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 border border-cyan-500/20 text-cyan-400 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <ShieldIcon />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">HackShield Nexus</h1>
            <p className="text-gray-500 text-sm mt-1">Secure authentication terminal</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800/40">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                disabled={isLoading}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative
                  ${tab === t ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t === 'login' ? 'Вход' : 'Регистрация'}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0" />
                )}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-5">

            {/* Global error */}
            {globalError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{globalError}</span>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── LOGIN FORM ─────────────────────────────────── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <Field
                  label="Email"
                  icon={<MailIcon />}
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={e => { setLoginEmail(e.target.value); setLoginErrors(p => ({...p, email: ''})); }}
                  placeholder="operator@hackshield.com"
                  disabled={isLoading}
                  error={loginErrors.email}
                />
                <Field
                  label="Пароль"
                  icon={<LockIcon />}
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginErrors(p => ({...p, password: ''})); }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  error={loginErrors.password}
                  rightElement={
                    <button type="button" onClick={() => setShowPass(p => !p)} className="text-gray-500 hover:text-gray-300 transition-colors" tabIndex={-1}>
                      <EyeIcon open={showPass} />
                    </button>
                  }
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <><Spinner /><span>Вход...</span></> : <span>Войти в систему</span>}
                </button>

                <p className="text-center text-sm text-gray-600">
                  Нет аккаунта?{' '}
                  <button type="button" onClick={() => switchTab('register')} className="text-cyan-500 hover:text-cyan-400 transition-colors font-medium">
                    Зарегистрироваться
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM ──────────────────────────────── */}
            {tab === 'register' && !successMsg && !showOtpInput && (
              <form onSubmit={handleRegister} className="space-y-4" noValidate>
                <Field
                  label="Email"
                  icon={<MailIcon />}
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={e => { setRegEmail(e.target.value); setRegErrors(p => ({...p, email: ''})); }}
                  placeholder="operator@hackshield.com"
                  disabled={isLoading}
                  error={regErrors.email}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Никнейм"
                    icon={<UserIcon />}
                    id="reg-username"
                    type="text"
                    autoComplete="username"
                    value={regUsername}
                    onChange={e => { setRegUsername(e.target.value); setRegErrors(p => ({...p, username: ''})); }}
                    placeholder="cipher_x"
                    disabled={isLoading}
                    error={regErrors.username}
                  />
                  <Field
                    label="Имя"
                    icon={<UserIcon />}
                    id="reg-fullname"
                    type="text"
                    autoComplete="name"
                    value={regFullName}
                    onChange={e => { setRegFullName(e.target.value); setRegErrors(p => ({...p, fullName: ''})); }}
                    placeholder="Alex Cipher"
                    disabled={isLoading}
                    error={regErrors.fullName}
                  />
                </div>

                <Field
                  label="Пароль"
                  icon={<LockIcon />}
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={e => { setRegPassword(e.target.value); setRegErrors(p => ({...p, password: ''})); }}
                  placeholder="Минимум 6 символов"
                  disabled={isLoading}
                  error={regErrors.password}
                  rightElement={
                    <button type="button" onClick={() => setShowPass(p => !p)} className="text-gray-500 hover:text-gray-300 transition-colors" tabIndex={-1}>
                      <EyeIcon open={showPass} />
                    </button>
                  }
                />
                <Field
                  label="Подтверждение пароля"
                  icon={<LockIcon />}
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={regConfirm}
                  onChange={e => { setRegConfirm(e.target.value); setRegErrors(p => ({...p, confirm: ''})); }}
                  placeholder="Повторите пароль"
                  disabled={isLoading}
                  error={regErrors.confirm}
                  rightElement={
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="text-gray-500 hover:text-gray-300 transition-colors" tabIndex={-1}>
                      <EyeIcon open={showConfirm} />
                    </button>
                  }
                />

                {/* Password strength indicator */}
                {regPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          regPassword.length >= i * 3
                            ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-500' : 'bg-emerald-500'
                            : 'bg-gray-700'
                        }`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">
                      {regPassword.length < 6 ? 'Слишком короткий' : regPassword.length < 9 ? 'Слабый' : regPassword.length < 12 ? 'Средний' : 'Надёжный'}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <><Spinner /><span>Регистрация...</span></> : <span>Создать аккаунт</span>}
                </button>

                <p className="text-center text-sm text-gray-600">
                  Уже есть аккаунт?{' '}
                  <button type="button" onClick={() => switchTab('login')} className="text-cyan-500 hover:text-cyan-400 transition-colors font-medium">
                    Войти
                  </button>
                </p>
              </form>
            )}

            {/* ── OTP VERIFICATION FORM ────────────────────── */}
            {tab === 'register' && showOtpInput && (
              <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 text-xl mb-1">
                    📧
                  </div>
                  <h3 className="text-white font-semibold text-base">Подтверждение почты</h3>
                  <p className="text-gray-400 text-xs leading-relaxed max-w-xs mx-auto">
                    Код подтверждения отправлен на <span className="text-cyan-400 font-medium">{regEmail}</span>.<br />
                    Введите его ниже для активации аккаунта.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest text-center">
                    6-значный код
                  </label>
                  <div className="relative max-w-[200px] mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={otpToken}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setOtpToken(val);
                        setOtpError('');
                      }}
                      placeholder="000000"
                      disabled={isLoading}
                      className={`w-full text-center py-3 bg-[#0d1421] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-all text-xl tracking-[0.5em] font-mono
                        ${otpError ? 'border-red-500/60' : 'border-gray-700/80 hover:border-gray-600'}`}
                    />
                  </div>
                  {otpError && <p className="text-xs text-red-400 text-center">{otpError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <><Spinner /><span>Проверка...</span></> : <span>Подтвердить код</span>}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpInput(false);
                      setSuccessMsg('');
                      setOtpToken('');
                      setOtpError('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                  >
                    ← Вернуться к регистрации
                  </button>
                </div>
              </form>
            )}

            {/* After successful registration with email confirmation */}
            {tab === 'register' && successMsg && (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl">
                  📧
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Проверьте почту</h3>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    Письмо отправлено на <span className="text-cyan-400 font-medium">{regEmail}</span>.
                    Перейдите по ссылке в письме для подтверждения аккаунта.
                  </p>
                </div>
                <button
                  onClick={() => { setSuccessMsg(''); setRegEmail(''); setRegPassword(''); setRegConfirm(''); setRegUsername(''); setRegFullName(''); switchTab('login'); }}
                  className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
                >
                  Вернуться к входу →
                </button>
              </div>
            )}
          </div>

          {/* Footer bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>

        {/* Terminal tag */}
        <div className="mt-5 text-center text-xs font-mono text-gray-700 space-y-0.5">
          <p>HACKSHIELD NEXUS SECURE TERMINAL v3.0</p>
          <p>ENCRYPTION: AES-256 GCM <span className="text-emerald-700">ACTIVE</span></p>
        </div>
      </div>
    </div>
  );
}
