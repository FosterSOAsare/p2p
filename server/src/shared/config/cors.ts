import { env } from "./env";
import { isLocalOrLanOrigin } from "../lib/net";

/**
 * One origin rule for both transports — Express (app.ts) and Socket.IO
 * (shared/realtime). Always allows the explicit list; in development also
 * allows any localhost/private-LAN origin so teammates need zero config on
 * any network.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // curl, mobile apps, server-to-server
  const allowList = new Set(env.CORS_ORIGINS);
  if (allowList.has(origin)) return true;
  return env.NODE_ENV !== "production" && isLocalOrLanOrigin(origin);
}
