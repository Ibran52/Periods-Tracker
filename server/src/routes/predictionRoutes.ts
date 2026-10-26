import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getNextPrediction, getMLInsights } from "../controllers/predictionController.js";
import { requireAuth } from "../middleware/auth.js";

export const predictionRouter = Router();

const predictionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Rate limit exceeded. Please wait a minute before requesting another prediction."
  }
});

predictionRouter.use(requireAuth);

predictionRouter.get("/next", predictionLimiter, getNextPrediction);
predictionRouter.get("/insights", predictionLimiter, getMLInsights);
