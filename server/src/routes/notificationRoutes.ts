import { Router } from "express";
import {
  getVapidPublicKey,
  subscribeNotification,
  unsubscribeNotification,
  sendTestNotification,
  subscribeSchema,
  unsubscribeSchema
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const notificationRouter = Router();

// Public VAPID key can be fetched by authenticated client
notificationRouter.get("/vapid-key", requireAuth, getVapidPublicKey);
notificationRouter.post(
  "/subscribe",
  requireAuth,
  validate(subscribeSchema),
  subscribeNotification
);
notificationRouter.post(
  "/unsubscribe",
  requireAuth,
  validate(unsubscribeSchema),
  unsubscribeNotification
);
notificationRouter.post("/test", requireAuth, sendTestNotification);
