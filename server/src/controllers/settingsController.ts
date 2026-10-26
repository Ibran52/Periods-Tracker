import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { CycleSettings } from "../models/CycleSettings.js";
import { PeriodLog } from "../models/PeriodLog.js";
import { SymptomLog } from "../models/SymptomLog.js";
import { PredictionSnapshot } from "../models/PredictionSnapshot.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { computeCycleStats } from "../services/cycleService.js";

export const updateSettingsSchema = z.object({
  body: z.object({
    defaultCycleLength: z.number().int().min(15).max(60).optional(),
    defaultPeriodDuration: z.number().int().min(1).max(15).optional(),
    reminderDaysBefore: z.number().int().min(0).max(7).optional(),
    remindersEnabled: z.boolean().optional(),
    modelPreference: z.enum(["auto", "random_forest", "cycle_sync", "baseline"]).optional()
  })
});

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await CycleSettings.findOne({ userId: req.user!.id });
    if (!settings) {
      settings = await CycleSettings.create({ userId: req.user!.id });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await CycleSettings.findOneAndUpdate(
      { userId: req.user!.id },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function exportUserData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const [user, settings, periods, symptoms] = await Promise.all([
      User.findById(userId).select("-passwordHash"),
      CycleSettings.findOne({ userId }),
      PeriodLog.find({ userId }).sort({ startDate: 1 }),
      SymptomLog.find({ userId }).sort({ date: 1 })
    ]);

    const stats = computeCycleStats(
      periods,
      settings?.defaultCycleLength || 28,
      settings?.defaultPeriodDuration || 5
    );

    res.status(200).json({
      success: true,
      exportedAt: new Date().toISOString(),
      user,
      cycleSettings: settings,
      cycleStatistics: stats,
      periods,
      symptoms
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    // Cascade delete across all collections
    await Promise.all([
      User.findByIdAndDelete(userId),
      CycleSettings.deleteMany({ userId }),
      PeriodLog.deleteMany({ userId }),
      SymptomLog.deleteMany({ userId }),
      PredictionSnapshot.deleteMany({ userId }),
      PushSubscription.deleteMany({ userId })
    ]);

    res.clearCookie("token");
    res.status(200).json({
      success: true,
      message: "Account and all associated health data have been permanently deleted"
    });
  } catch (error) {
    next(error);
  }
}
