import { Router } from "express";
import {
  getSettings,
  updateSettings,
  exportUserData,
  deleteAccount,
  updateSettingsSchema
} from "../controllers/settingsController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/", getSettings);
settingsRouter.patch("/", validate(updateSettingsSchema), updateSettings);
settingsRouter.get("/export", exportUserData);
settingsRouter.delete("/account", deleteAccount);
