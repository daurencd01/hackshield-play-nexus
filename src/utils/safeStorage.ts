const STORAGE_VERSION = 1;
const STORAGE_PREFIX = `hackshield_v${STORAGE_VERSION}_`;

export const safeStorage = {
  get<T>(key: string, parser: (raw: unknown) => T, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      return parser(parsed);
    } catch (e) {
      console.error(`[safeStorage] Failed to read ${key}:`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Quota exceeded или приватный режим
      console.error(`[safeStorage] Failed to write ${key}:`, e);
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {}
  },

  clear(): void {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
};
