import { env } from "./shared/config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅ API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// NOTE: auto-release is intentionally disabled — all escrow transitions are
// manual for now. To re-enable, start the sweepAutoRelease() interval from
// features/escrows/escrows.service.ts here.
