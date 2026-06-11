import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';
import { CyberRobot } from '@/components/ui/cyber-robot';

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

const IdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="14" x="3" y="5" rx="2"/>
    <circle cx="9" cy="11" r="2"/>
    <path d="M15 9h3M15 13h3M7 16.5c.5-1.5 3.5-1.5 4 0"/>
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

const Field = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, rightElement, ...props }, ref) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 pointer-events-none">
          {icon}
        </span>
        <input
          ref={ref}
          {...props}
          className={`w-full pl-9 ${rightElement ? 'pr-10' : 'pr-4'} py-3 bg-[#0d1421]/80 border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-all text-sm
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
  ),
);
Field.displayName = 'Field';

// ── Main Component ─────────────────────────────────────────────────────────
type Tab = 'login' | 'register';
type RegStep = 'username' | 'fullName' | 'email' | 'password';

// Order of wizard steps (OTP confirmation is handled separately)
const REG_STEPS: RegStep[] = ['username', 'fullName', 'email', 'password'];
const STEP_TITLES: Record<RegStep, string> = {
  username: 'Выберите никнейм',
  fullName: 'Как вас зовут?',
  email: 'Ваша почта',
  password: 'Придумайте пароль',
};
const STEP_HINTS: Record<RegStep, string> = {
  username: 'Под этим именем вас увидят другие оперативники',
  fullName: 'Отображается в профиле и рейтингах',
  email: 'На неё придёт код подтверждения',
  password: 'Минимум 6 символов',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signIn, signUp, verifyOtp } = useAuth();

  const [tab, setTab] = useState<Tab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const redirectingRef = useRef(false);
  const isVerifyingOtpRef = useRef(false);

  // Registration wizard
  const [regStep, setRegStep] = useState<RegStep>('username');
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

  // Autofocus the active step's input
  const stepInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (tab === 'register' && !showOtpInput && !successMsg) {
      const t = setTimeout(() => stepInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [tab, regStep, showOtpInput, successMsg]);

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
    setRegStep('username');
    setShowOtpInput(false);
    setOtpToken('');
    setOtpError('');
  };

  // ── Validation helpers ──────────────────────────────────────────────────
  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // Validate a single wizard step. Returns true if step is valid.
  const validateStep = (step: RegStep): boolean => {
    const errs: Record<string, string> = {};
    if (step === 'username') {
      const u = regUsername.trim();
      if (!u) errs.username = 'Введите никнейм';
      else if (u.length < 3) errs.username = 'Никнейм минимум 3 символа';
      else if (u.length > 20) errs.username = 'Никнейм максимум 20 символов';
      else if (!/^[a-zA-Z0-9_]+$/.test(u)) errs.username = 'Только латиница, цифры и _';
    } else if (step === 'fullName') {
      if (!regFullName.trim()) errs.fullName = 'Введите имя';
    } else if (step === 'email') {
      if (!regEmail.trim()) errs.email = 'Введите email';
      else if (!validateEmail(regEmail.trim())) errs.email = 'Некорректный email';
    } else if (step === 'password') {
      if (!regPassword) errs.password = 'Введите пароль';
      else if (regPassword.length < 6) errs.password = 'Минимум 6 символов';
      if (!regConfirm) errs.confirm = 'Подтвердите пароль';
      else if (regPassword !== regConfirm) errs.confirm = 'Пароли не совпадают';
    }
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

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
        const msg = result.error || '';
        if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
          setGlobalError('Неверный email или пароль.');
        } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
          setGlobalError('Почта не подтверждена. Введите код подтверждения.');
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

  // ── Wizard navigation ─────────────────────────────────────────────────────
  const stepIndex = REG_STEPS.indexOf(regStep);

  const goNext = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    if (!validateStep(regStep)) return;
    if (stepIndex < REG_STEPS.length - 1) {
      setRegStep(REG_STEPS[stepIndex + 1]);
    } else {
      handleRegister();
    }
  };

  const goBack = () => {
    setGlobalError('');
    setRegErrors({});
    if (stepIndex > 0) setRegStep(REG_STEPS[stepIndex - 1]);
  };

  // ── REGISTER (final submit after last step) ───────────────────────────────
  const handleRegister = async () => {
    setGlobalError('');
    setSuccessMsg('');

    // Re-validate everything before sending to the server
    for (const step of REG_STEPS) {
      if (!validateStep(step)) {
        setRegStep(step);
        return;
      }
    }

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
          setRegStep('username');
          setRegErrors({ username: msg });
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
        const msg = result.error || '';
        if (msg.includes('invalid_grant') || msg.includes('Invalid token') || msg.includes('token has expired')) {
          setOtpError('Неверный или истекший код.');
        } else {
          setOtpError(msg || 'Неверный код подтверждения. Попробуйте ещё раз.');
        }
      } else {
        // Sign out the temporary verification session, force a clean login
        await supabase.auth.signOut();
        isVerifyingOtpRef.current = false;

        setShowOtpInput(false);
        setRegStep('username');
        setSuccessMsg('Аккаунт подтверждён! Теперь войдите со своей почтой и паролем.');
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const primaryBtn = "w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-gray-100 p-3 sm:p-6 font-sans">
      <Card className="w-full max-w-5xl md:h-[660px] bg-black/[0.96] relative overflow-hidden border-gray-800/60 grid grid-cols-1 md:grid-cols-2">
        <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#22d3ee" />

        {/* ── Robot panel: top band on mobile, left column on desktop ── */}
        <div className="relative h-[260px] sm:h-[340px] md:h-auto border-b border-gray-800/40 md:border-b-0 md:border-r">
          <CyberRobot className="absolute inset-0" />

          {/* Brand overlay (desktop) */}
          <div className="hidden md:block absolute top-8 left-8 z-10 pointer-events-none">
            <div className="flex items-center gap-2 text-cyan-400">
              <ShieldIcon />
              <span className="font-bold text-white text-lg tracking-tight">HackShield Nexus</span>
            </div>
            <p className="text-neutral-400 text-sm mt-3 max-w-[16rem] leading-relaxed">
              Геймифицированная платформа для обучения кибербезопасности. Стань кибер-оперативником.
            </p>
          </div>

          {/* Terminal tag (desktop) */}
          <div className="hidden md:block absolute bottom-6 left-8 z-10 text-[10px] font-mono text-gray-600 pointer-events-none space-y-0.5">
            <p>HACKSHIELD NEXUS SECURE TERMINAL v3.0</p>
            <p>ENCRYPTION: AES-256 GCM <span className="text-emerald-600">ACTIVE</span></p>
          </div>
        </div>

        {/* ── Right: auth form ── */}
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10 overflow-y-auto bg-gradient-to-l from-black/60 via-black/30 to-transparent">

          {/* Mobile brand */}
          <div className="md:hidden flex items-center justify-center gap-2 text-cyan-400 mb-6">
            <ShieldIcon />
            <span className="font-bold text-white text-lg tracking-tight">HackShield Nexus</span>
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {tab === 'login' ? 'Вход в систему' : showOtpInput ? 'Подтверждение почты' : 'Создание аккаунта'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {tab === 'login'
                ? 'Войдите, чтобы продолжить операцию'
                : showOtpInput
                  ? 'Введите код из письма'
                  : 'Несколько шагов до доступа в Nexus'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border border-gray-800/60 rounded-xl p-1 bg-black/40 mb-5">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                disabled={isLoading}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all
                  ${tab === t ? 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t === 'login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>

          {/* Global error */}
          {globalError && (
            <div className="p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{globalError}</span>
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="p-3.5 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm flex items-start gap-2.5">
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

              <button type="submit" disabled={isLoading} className={`${primaryBtn} mt-2`}>
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

          {/* ── REGISTER WIZARD ────────────────────────────── */}
          {tab === 'register' && !successMsg && !showOtpInput && (
            <div className="space-y-5">
              {/* Step progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-400 font-semibold uppercase tracking-widest">
                    Шаг {stepIndex + 1} из {REG_STEPS.length}
                  </span>
                  <span className="text-gray-600">{STEP_TITLES[regStep]}</span>
                </div>
                <div className="flex gap-1.5">
                  {REG_STEPS.map((s, i) => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= stepIndex ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gray-700/70'
                    }`} />
                  ))}
                </div>
              </div>

              <form onSubmit={goNext} className="space-y-4" noValidate>
                <div>
                  <h3 className="text-white font-semibold text-lg">{STEP_TITLES[regStep]}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{STEP_HINTS[regStep]}</p>
                </div>

                {/* Step: username */}
                {regStep === 'username' && (
                  <Field
                    ref={stepInputRef}
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
                )}

                {/* Step: full name */}
                {regStep === 'fullName' && (
                  <Field
                    ref={stepInputRef}
                    label="Имя"
                    icon={<IdIcon />}
                    id="reg-fullname"
                    type="text"
                    autoComplete="name"
                    value={regFullName}
                    onChange={e => { setRegFullName(e.target.value); setRegErrors(p => ({...p, fullName: ''})); }}
                    placeholder="Alex Cipher"
                    disabled={isLoading}
                    error={regErrors.fullName}
                  />
                )}

                {/* Step: email */}
                {regStep === 'email' && (
                  <Field
                    ref={stepInputRef}
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
                )}

                {/* Step: password */}
                {regStep === 'password' && (
                  <>
                    <Field
                      ref={stepInputRef}
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
                  </>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-3 pt-1">
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={isLoading}
                      className="px-5 py-3.5 rounded-xl border border-gray-700/80 text-gray-300 hover:text-white hover:border-gray-600 transition-all text-sm font-semibold disabled:opacity-50"
                    >
                      ← Назад
                    </button>
                  )}
                  <button type="submit" disabled={isLoading} className={primaryBtn}>
                    {isLoading
                      ? <><Spinner /><span>Создание...</span></>
                      : <span>{stepIndex < REG_STEPS.length - 1 ? 'Далее →' : 'Создать аккаунт'}</span>}
                  </button>
                </div>
              </form>

              <p className="text-center text-sm text-gray-600">
                Уже есть аккаунт?{' '}
                <button type="button" onClick={() => switchTab('login')} className="text-cyan-500 hover:text-cyan-400 transition-colors font-medium">
                  Войти
                </button>
              </p>
            </div>
          )}

          {/* ── OTP VERIFICATION ──────────────────────────── */}
          {tab === 'register' && showOtpInput && (
            <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 text-xl mb-1">
                  📧
                </div>
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
                    autoFocus
                    value={otpToken}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setOtpToken(val);
                      setOtpError('');
                    }}
                    placeholder="000000"
                    disabled={isLoading}
                    className={`w-full text-center py-3 bg-[#0d1421]/80 border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/60 transition-all text-xl tracking-[0.5em] font-mono
                      ${otpError ? 'border-red-500/60' : 'border-gray-700/80 hover:border-gray-600'}`}
                  />
                </div>
                {otpError && <p className="text-xs text-red-400 text-center">{otpError}</p>}
              </div>

              <button type="submit" disabled={isLoading} className={`${primaryBtn} mt-2`}>
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
                    setRegStep('password');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  ← Вернуться к регистрации
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
