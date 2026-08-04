import Constants from 'expo-constants';

/**
 * Where the API lives.
 *
 * A phone can't reach `localhost` — that's the phone itself. So unless an
 * explicit URL is provided we borrow the host Expo is already serving the
 * bundle from (`hostUri` is `192.168.x.x:8081` in dev) and point at the API
 * port on that same machine. That's the address the server prints on boot, so
 * device and API agree without anyone editing a config file.
 *
 * Override with EXPO_PUBLIC_API_URL for a deployed backend.
 */

const API_PORT = 8000;

function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // e.g. "192.168.100.42:8081" → "http://192.168.100.42:8000"
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  // Web dev server, or a bare runtime with no Expo host info.
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveBaseUrl();
