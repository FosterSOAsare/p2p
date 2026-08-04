import * as SecureStore from 'expo-secure-store';

/**
 * Auth token storage — the native implementation, backed by the OS keychain
 * (Keychain on iOS, EncryptedSharedPreferences on Android).
 *
 * `tokenStore.web.ts` sits beside this file for the web target, because
 * expo-secure-store has no browser implementation. Metro picks the right one.
 */

const ACCESS_KEY = 'p2p_access_token';
const REFRESH_KEY = 'p2p_refresh_token';

export const tokenStore = {
  async getAccess() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async set(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
  },
};
