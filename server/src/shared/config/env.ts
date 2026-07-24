import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "",
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? "15m",
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? "30d",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  CLOUDINARY_URL: process.env.CLOUDINARY_URL ?? "",
};
