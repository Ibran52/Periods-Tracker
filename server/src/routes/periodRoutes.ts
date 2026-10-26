import { Router } from "express";
import {
  getPeriods,
  createPeriod,
  updatePeriod,
  deletePeriod,
  getCalendarMonthData,
  periodSchema,
  updatePeriodSchema
} from "../controllers/periodController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const periodRouter = Router();

periodRouter.use(requireAuth);

periodRouter.get("/", getPeriods);
periodRouter.post("/", validate(periodSchema), createPeriod);
periodRouter.patch("/:id", validate(updatePeriodSchema), updatePeriod);
periodRouter.delete("/:id", deletePeriod);
periodRouter.get("/calendar", getCalendarMonthData);
