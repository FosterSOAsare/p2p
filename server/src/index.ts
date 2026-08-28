import http from "node:http";
import { env } from "./shared/config/env";
import { createApp } from "./app";
import { initRealtime } from "./shared/realtime/realtime";
import { prisma } from "./shared/lib/prisma";

const app = createApp();

// Socket.IO shares this HTTP server — and therefore the port — with Express, so
// the escrow/admin controllers can push deal notices through the same io
// singleton that serves the chat sockets.
const server = http.createServer(app);
initRealtime(server);

/**
 * How many connections to establish before the first user arrives.
 *
 * Sized to the widest fan-out any single request makes: `/api/users/me/dashboard`
 * issues twelve queries at once. Anything above the pool's `max` does nothing.
 */
const WARM_CONNECTIONS = 12;

/**
 * Open several connections before the first user needs one.
 *
 * `pg` connects lazily and only ever opens a connection when a query finds none
 * free, and each new one costs a full TCP + TLS handshake to us-east-2. Measured
 * here: a single query on a warm connection is ~230ms, but eight at once on a
 * cold pool is ~2100ms — because seven of them are waiting on handshakes, not on
 * Postgres. Warm, those same eight finish in 232ms, i.e. genuinely in parallel.
 *
 * That is why the `Promise.all` batches throughout the services looked like they
 * weren't helping. They were correct all along; the pool underneath them just
 * had one connection, so they queued. Warming a handful at boot is what makes
 * the concurrency real, and it moves the handshakes to startup where nobody is
 * waiting on them.
 *
 * The queries are issued together on purpose — run in sequence they would each
 * reuse the one connection already free and the pool would never grow.
 *
 * Failure is deliberately non-fatal and quiet: an unreachable database at boot
 * shouldn't stop the process from listening, and every real query has its own
 * error handling. It only means the first requests pay what they used to.
 */
function warmDatabasePool() {
  void Promise.all(
    Array.from({ length: WARM_CONNECTIONS }, () =>
      prisma.$queryRaw`SELECT 1`.catch(() => undefined),
    ),
  );
}

server.listen(env.PORT, () => {
  warmDatabasePool();
  console.log(`✅ API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`   WebSocket (Socket.IO) on the same port at /socket.io`);
  console.log(`   Web origin (used in email links): ${env.WEB_ORIGIN}`);
  console.log(`   For phone/other-device testing, run the web app with --host and open the LAN URL above.`);
});

// NOTE: auto-release is intentionally disabled — all escrow transitions are
// manual for now. To re-enable, start the sweepAutoRelease() interval from
// features/escrows/escrows.service.ts here.
