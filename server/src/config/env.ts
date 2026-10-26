import dotenv from "dotenv";
import path from "path";

// Load .env from server directory or fallback to parent directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const rawVapidSubject = (process.env.VAPID_SUBJECT || "[EMAIL_ADDRESS]").trim();
const vapidSubject = rawVapidSubject.startsWith("mailto:") || rawVapidSubject.startsWith("http://") || rawVapidSubject.startsWith("https://")
  ? rawVapidSubject
  : `mailto:${rawVapidSubject}`;

const jwtSecret = (process.env.JWT_SECRET || "").trim();
const corsOrigin = (process.env.CORS_ORIGIN || "").trim();
const mlServiceApiKey = (
  [process.env.ML_SERVICE_API_KEY, process.env.ML_API_KEY].find((value) => value?.trim()) || ""
).trim();

export function getMissingRequiredEnvVars(): string[] {
  const required = ["MONGODB_URI"];
  const missing = required.filter((key) => !process.env[key] || !process.env[key]?.trim());

  if (!jwtSecret || jwtSecret.length < 32 || /^(replace|your|change_me|dev-jwt-secret)/i.test(jwtSecret)) {
    missing.push("JWT_SECRET (unique value of at least 32 characters)");
  }

  if (
    !mlServiceApiKey ||
    mlServiceApiKey.length < 32 ||
    mlServiceApiKey === jwtSecret ||
    /^(replace|your|change_me|dev-ml-api-key)/i.test(mlServiceApiKey)
  ) {
    missing.push("ML_SERVICE_API_KEY or ML_API_KEY (unique, distinct value of at least 32 characters)");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (!corsOrigin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(corsOrigin))
  ) {
    missing.push("CORS_ORIGIN (production frontend origin)");
  }

  return missing;
}

export function assertRequiredEnvVars(): void {
  const missing = getMissingRequiredEnvVars();
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

const defaultJwtSecret = "dev-jwt-secret-change-me-in-production";
const defaultMongoUri = "mongodb://127.0.0.1:27017/veyora_dev";

export const config = {
  env: process.env.NODE_ENV,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || defaultMongoUri,
  jwtSecret: jwtSecret || defaultJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: corsOrigin || "http://localhost:5173",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8000",
  mlServiceApiKey: mlServiceApiKey || undefined,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject
};
