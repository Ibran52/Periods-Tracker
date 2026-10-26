import dotenv from "dotenv";
import path from "path";

// Load .env from server directory or fallback to parent directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const rawVapidSubject = (process.env.VAPID_SUBJECT || "[EMAIL_ADDRESS]").trim();
const vapidSubject = rawVapidSubject.startsWith("mailto:") || rawVapidSubject.startsWith("http://") || rawVapidSubject.startsWith("https://")
  ? rawVapidSubject
  : `mailto:${rawVapidSubject}`;

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/veyora",
  jwtSecret: process.env.JWT_SECRET || "494cb117fe99f69970e91eac4c8b6fc97b55e1def0a4ffb14febb1527268742d7d029ee3c2fe449982dc4bf718778f0adb64d47490e7fee789cab784e87e487f",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",
  mlServiceApiKey: process.env.ML_SERVICE_API_KEY || "Hvt6PjDUeKhvWHSiqxubt7fyo6W8_sZ3MI56HoCmTA4",
  vapidPublicKey: (process.env.VAPID_PUBLIC_KEY || "BJDdL1pza1mRq1fskiwf3G3wKsVre1izbUzL7-eEsAOnkFEpSyVeQHwJCXtfCCMa3LxrVjq_xiwYj6SyfuGosIM").trim(),
  vapidPrivateKey: (process.env.VAPID_PRIVATE_KEY || "-").trim(),
  vapidSubject
};
