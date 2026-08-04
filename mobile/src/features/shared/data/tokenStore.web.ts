/**
 * Web counterpart of `tokenStore.ts` — expo-secure-store is native-only, so the
 * browser build falls back to localStorage. Same shape, so callers never care
 * which target they're on.
 */

const ACCESS_KEY = 'p2p_access_token';
const REFRESH_KEY = 'p2p_refresh_token';

const read = (key: string) => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null; // storage disabled (private mode / blocked cookies)
  }
};

export const tokenStore = {
  async getAccess() {
    return read(ACCESS_KEY);
  },
  async getRefresh() {
    return read(REFRESH_KEY);
  },
  async set(access: string, refresh: string) {
    try {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(REFRESH_KEY, refresh);
    } catch {
      /* non-fatal: the session just won't survive a reload */
    }
  },
  async clear() {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignore */
    }
  },
};
