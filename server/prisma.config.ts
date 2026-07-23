// Prisma 7 CLI config — the CLI no longer auto-loads .env and connection URLs
// no longer live in schema.prisma; both are handled here.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // DIRECT_URL = non-pooled Neon connection — required for migrations
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
