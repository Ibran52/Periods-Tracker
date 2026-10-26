import { Router } from "express";
import {
  getSymptoms,
  logSymptom,
  deleteSymptom,
  symptomSchema
} from "../controllers/journalController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const journalRouter = Router();

journalRouter.use(requireAuth);

journalRouter.get("/", getSymptoms);
journalRouter.post("/", validate(symptomSchema), logSymptom);
journalRouter.delete("/:id", deleteSymptom);
