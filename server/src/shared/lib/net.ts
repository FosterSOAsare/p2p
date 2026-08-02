import os from "node:os";

/**
 * Best-guess LAN IPv4 for this machine, so email links and dev CORS adapt to
 * whatever network we're on (home WiFi, phone hotspot, a teammate's laptop) with
 * zero configuration. Skips loopback, link-local, and virtual/container NICs
 * (docker, veth, bridges, VPNs). Prefers 192.168.* > 10.* > 172.16–31.*.
 * Returns null if nothing suitable is found (caller falls back to localhost).
 */
export function resolveLanIp(): string | null {
  const SKIP = /^(lo|docker|br-|veth|virbr|tun|tap|tailscale|utun|zt)/i;
  const candidates: string[] = [];

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (SKIP.test(name) || !addrs) continue;
    for (const a of addrs) {
      // family is "IPv4" on modern Node, 4 on older — normalize via String().
      if (String(a.family) !== "IPv4" && String(a.family) !== "4") continue;
      if (a.internal || a.address.startsWith("169.254.")) continue; // loopback / link-local
      candidates.push(a.address);
    }
  }

  const rank = (ip: string) =>
    ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;

  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates[0] ?? null;
}

/** True if an Origin's host is loopback or a private-LAN address (any port). */
export function isLocalOrLanOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    return (
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    );
  } catch {
    return false;
  }
}
