import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Кастомный storage adapter с TTL 24 часа
const SESSION_TTL_HOURS = 24;
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;

const customStorage = {
  getItem: (key: string): string | null => {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      // Проверяем наш кастомный wrapper с TTL
      const item = JSON.parse(itemStr);

      // Если это наш wrapper с timestamp
      if (item && typeof item === 'object' && item.__hsTimestamp) {
        const now = Date.now();
        const age = now - item.__hsTimestamp;

        if (age > SESSION_TTL_MS) {
          console.log('[Auth] Session expired (>24h), removing');
          localStorage.removeItem(key);
          return null;
        }

        return JSON.stringify(item.value);
      }

      // Старый формат — возвращаем как есть
      return itemStr;
    } catch (e) {
      console.error('[Auth] Storage getItem error:', e);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      // Оборачиваем в наш wrapper с timestamp
      const wrapped = {
        __hsTimestamp: Date.now(),
        value: JSON.parse(value)
      };
      localStorage.setItem(key, JSON.stringify(wrapped));
    } catch (e) {
      console.error('[Auth] Storage setItem error:', e);
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('[Auth] Storage removeItem error:', e);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'hackshield-auth-session',
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'hackshield-play-nexus@1.0.0'
    }
  }
});
