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

/**
 * Keep the database awake.
 *
 * Neon scales the compute to zero after a few minutes without queries, and
 * waking it costs seconds *and* drops every pooled connection, so the requests
 * after a quiet spell pay a wake plus fresh TLS handshakes. Measured here: a
 * query after an idle gap returned ETIMEDOUT, then took 10s on retry, then
 * settled back to ~250ms. That is the whole of "it was fine, then it hung for
 * thirty seconds" — no amount of query tuning touches it.
 *
 * One trivial query every few minutes is enough to count as activity. It costs
 * a single round trip and nothing else, and it only runs while the server is
 * up, which is exactly when someone might be about to use it.
 *
 * `unref()` so the timer never holds the process open: without it a Ctrl-C
 * would hang until the interval next fired. Failures are ignored — if the
 * database is unreachable, the next request will find that out and say so
 * properly; a keep-alive is not the place to surface it.
 */
function startDatabaseKeepAlive() {
  if (env.DB_KEEPALIVE_MS <= 0) return;
  const timer = setInterval(() => {
    void prisma.$queryRaw`SELECT 1`.catch(() => undefined);
  }, env.DB_KEEPALIVE_MS);
  timer.unref();
}

server.listen(env.PORT, () => {
  warmDatabasePool();
  startDatabaseKeepAlive();
  console.log(`✅ API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`   WebSocket (Socket.IO) on the same port at /socket.io`);
  console.log(`   Web origin (used in email links): ${env.WEB_ORIGIN}`);
  console.log(
    env.DB_KEEPALIVE_MS > 0
      ? `   DB keep-alive every ${Math.round(env.DB_KEEPALIVE_MS / 1000)}s (DB_KEEPALIVE_MS=0 to disable)`
      : `   DB keep-alive off`,
  );
  console.log(`   For phone/other-device testing, run the web app with --host and open the LAN URL above.`);
});

// NOTE: auto-release is intentionally disabled — all escrow transitions are
// manual for now. To re-enable, start the sweepAutoRelease() interval from
// features/escrows/escrows.service.ts here.
