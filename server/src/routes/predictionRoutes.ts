import { Router } from "express";
import { getNextPrediction, getMLInsights } from "../controllers/predictionController.js";
import { requireAuth } from "../middleware/auth.js";

export const predictionRouter = Router();

predictionRouter.use(requireAuth);

predictionRouter.get("/next", getNextPrediction);
predictionRouter.get("/insights", getMLInsights);
