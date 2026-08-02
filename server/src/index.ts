import http from "node:http";
import { env } from "./shared/config/env";
import { createApp } from "./app";
import { initRealtime } from "./shared/realtime/realtime";

const app = createApp();

// Socket.IO shares this HTTP server — and therefore the port — with Express, so
// the escrow/admin controllers can push deal notices through the same io
// singleton that serves the chat sockets.
const server = http.createServer(app);
initRealtime(server);

server.listen(env.PORT, () => {
  console.log(`✅ API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`   WebSocket (Socket.IO) on the same port at /socket.io`);
  console.log(`   Web origin (used in email links): ${env.WEB_ORIGIN}`);
  console.log(`   For phone/other-device testing, run the web app with --host and open the LAN URL above.`);
});

// NOTE: auto-release is intentionally disabled — all escrow transitions are
// manual for now. To re-enable, start the sweepAutoRelease() interval from
// features/escrows/escrows.service.ts here.
