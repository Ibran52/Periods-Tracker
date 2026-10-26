import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { authRouter } from "./routes/authRoutes.js";
import { periodRouter } from "./routes/periodRoutes.js";
import { predictionRouter } from "./routes/predictionRoutes.js";
import { journalRouter } from "./routes/journalRoutes.js";
import { settingsRouter } from "./routes/settingsRoutes.js";
import { notificationRouter } from "./routes/notificationRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

// Security headers
app.use(helmet());

// Cross-Origin Resource Sharing
const allowedOrigins = [config.corsOrigin, "http://localhost:5173", "http://localhost:4173", "http://127.0.0.1:5173", "http://127.0.0.1:4173"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// Body parsers
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());

// Rate Limiting (100 requests per 15 minutes window)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes"
  }
});

app.use("/api", apiLimiter);

// Health check endpoint
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "veyora-api",
    timestamp: new Date().toISOString()
  });
});

// Strict private no-store cache headers for all health data APIs
app.use("/api/v1", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Mount Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/periods", periodRouter);
app.use("/api/v1/predictions", predictionRouter);
app.use("/api/v1/journal", journalRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/notifications", notificationRouter);

// Root endpoint with API status
app.get("/", (_req, res) => {
  res.status(200).json({
    name: "Veyora Backend API",
    status: "online",
    frontend: config.corsOrigin,
    health: "/api/v1/health"
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server when executed directly
if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() => {
      console.log("Connected to MongoDB successfully");
      app.listen(config.port, () => {
        console.log(`Veyora Server running at http://localhost:${config.port} (${config.env} mode)`);
      });
    })
    .catch((err) => {
      console.error("Failed to start server due to database connection error:", err);
    });
}
