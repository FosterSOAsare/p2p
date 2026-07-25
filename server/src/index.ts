import { env } from "./shared/config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`   Web origin (used in email links): ${env.WEB_ORIGIN}`);
  console.log(`   For phone/other-device testing, run the web app with --host and open the LAN URL above.`);
});

// NOTE: auto-release is intentionally disabled — all escrow transitions are
// manual for now. To re-enable, start the sweepAutoRelease() interval from
// features/escrows/escrows.service.ts here.
