import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function OnboardingPage() {
  const { t } = useTranslation() as any;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Student');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/auth');
          return;
        }

        if (session.user.email) {
          setEmail(session.user.email);
        }

        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.username) {
          navigate('/');
        }
      } catch (e) {
        navigate('/auth');
      }
    };

    init();
  }, [navigate]);

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedUsername = username.toLowerCase().trim();

    if (!normalizedUsername) {
      setError(t('onboarding.req_username') || 'Username is required');
      return;
    }
    if (!role) {
      setError(t('onboarding.req_role') || 'Role is required');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      const newProfile = {
        id: session.user.id,
        username: normalizedUsername,
        full_name: fullName.trim() || null,
        role: role.trim(),
        email: session.user.email,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(newProfile);

      if (upsertError) {
        if (upsertError.code === '23505') {
          setError('Username already taken. Please choose another.');
        } else {
          setError(upsertError.message || 'An error occurred while saving profile.');
        }
        return;
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f18] text-gray-100 p-4 font-sans selection:bg-cyan-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[30%] h-[40%] bg-cyan-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[15%] w-[30%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#111827]/80 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl shadow-cyan-900/10 overflow-hidden">
          
          <div className="p-8 pb-6 border-b border-gray-800/50 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-400 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <UserIcon />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t('onboarding.title') || 'Complete Profile'}</h1>
            <p className="text-gray-400 mt-2 text-sm">
              {t('onboarding.desc') || 'Setup your hacker identity to proceed into the system.'}
            </p>
          </div>

          <div className="p-8 pt-6">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                <div className="mt-0.5">⚠</div>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('onboarding.email') || 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 bg-[#0a0f18]/50 border border-gray-800 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('onboarding.username') || 'Username *'}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. cyber_ninja"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#0a0f18] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('onboarding.full_name') || 'Full Name'}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#0a0f18] border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('onboarding.role') || 'Role *'}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#0a0f18] border border-gray-700 rounded-lg text-white appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50"
                  required
                >
                  <option value="Student">Student</option>
                  <option value="School Student">School Student</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Enthusiast">Enthusiast</option>
                  <option value="Advanced User">Advanced User</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading || !username.trim() || !role}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <LoaderIcon />
                    <span>{t('onboarding.saving') || 'Saving...'}</span>
                  </>
                ) : (
                  <span>{t('onboarding.submit') || 'Enter System'}</span>
                )}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer"
              >
                <LogoutIcon />
                <span>Logout / Switch Account</span>
              </button>
            </div>
          </div>
          
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </div>
      </div>
    </div>
  );
}
