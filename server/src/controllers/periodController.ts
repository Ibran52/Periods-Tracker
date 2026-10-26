import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PeriodLog } from "../models/PeriodLog.js";
import { CycleSettings } from "../models/CycleSettings.js";
import { computeCycleStats, addDays, parseDate, formatDate, diffInDays } from "../services/cycleService.js";

export const periodSchema = z.object({
  body: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().optional(),
    flowIntensity: z.enum(["light", "medium", "heavy"]).nullable().optional(),
    notes: z.string().max(2000).optional()
  })
});

export const updatePeriodSchema = z.object({
  body: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().optional(),
    flowIntensity: z.enum(["light", "medium", "heavy"]).nullable().optional(),
    notes: z.string().max(2000).optional()
  })
});

export async function getPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const periods = await PeriodLog.find({ userId: req.user!.id }).sort({ startDate: 1 });
    res.status(200).json({ success: true, count: periods.length, data: periods });
  } catch (error) {
    next(error);
  }
}

export async function createPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { startDate, endDate, flowIntensity, notes } = req.body;

    // Date logical check
    const today = new Date().toISOString().substring(0, 10);
    if (startDate > today) {
      res.status(400).json({ success: false, message: "Period start date cannot be in the future" });
      return;
    }

    if (endDate) {
      if (endDate < startDate) {
        res.status(400).json({ success: false, message: "End date cannot precede start date" });
        return;
      }
      if (endDate > today) {
        res.status(400).json({ success: false, message: "Period end date cannot be in the future" });
        return;
      }
      if (diffInDays(startDate, endDate) > 15) {
        res.status(400).json({ success: false, message: "Period duration cannot exceed 15 days" });
        return;
      }
    }

    // Check for duplicate start date
    const existing = await PeriodLog.findOne({ userId: req.user!.id, startDate });
    if (existing) {
      res.status(409).json({ success: false, message: "A period log starting on this date already exists" });
      return;
    }

    const period = await PeriodLog.create({
      userId: req.user!.id,
      startDate,
      endDate: endDate || null,
      flowIntensity: flowIntensity || null,
      notes: notes || ""
    });

    res.status(201).json({ success: true, data: period });
  } catch (error) {
    next(error);
  }
}

export async function updatePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const period = await PeriodLog.findOne({ _id: id, userId: req.user!.id });
    if (!period) {
      res.status(404).json({ success: false, message: "Period record not found" });
      return;
    }

    const { startDate, endDate, flowIntensity, notes } = req.body;

    const newStart = startDate || period.startDate;
    const newEnd = endDate !== undefined ? endDate : period.endDate;

    const today = new Date().toISOString().substring(0, 10);
    if (newStart > today) {
      res.status(400).json({ success: false, message: "Period start date cannot be in the future" });
      return;
    }

    if (newEnd) {
      if (newEnd < newStart) {
        res.status(400).json({ success: false, message: "End date cannot precede start date" });
        return;
      }
      if (newEnd > today) {
        res.status(400).json({ success: false, message: "Period end date cannot be in the future" });
        return;
      }
      if (diffInDays(newStart, newEnd) > 15) {
        res.status(400).json({ success: false, message: "Period duration cannot exceed 15 days" });
        return;
      }
    }

    if (startDate) period.startDate = startDate;
    if (endDate !== undefined) period.endDate = endDate;
    if (flowIntensity !== undefined) period.flowIntensity = flowIntensity;
    if (notes !== undefined) period.notes = notes;

    await period.save();
    res.status(200).json({ success: true, data: period });
  } catch (error) {
    next(error);
  }
}

export async function deletePeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const period = await PeriodLog.findOneAndDelete({ _id: id, userId: req.user!.id });
    if (!period) {
      res.status(404).json({ success: false, message: "Period record not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Period record removed successfully" });
  } catch (error) {
    next(error);
  }
}

export async function getCalendarMonthData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7); // e.g. "2026-11"
    const periods = await PeriodLog.find({ userId: req.user!.id }).sort({ startDate: 1 });
    const settings = await CycleSettings.findOne({ userId: req.user!.id });

    const stats = computeCycleStats(
      periods,
      settings?.defaultCycleLength || 28,
      settings?.defaultPeriodDuration || 5
    );

    // Calculate next predicted cycle start & fertile window if we have at least one period
    let prediction = null;
    if (stats.latestPeriodStartDate) {
      const cycleDays = Math.round(stats.medianCycleLength);
      const predictedStart = addDays(stats.latestPeriodStartDate, cycleDays);
      const uncertainty = stats.completedCycles >= 3 ? Math.max(2, Math.round(stats.stdCycleLength)) : 3;

      const earliest = addDays(predictedStart, -uncertainty);
      const latest = addDays(predictedStart, uncertainty);

      // Estimated Ovulation ~14 days before next predicted period
      const ovulationDate = addDays(predictedStart, -14);
      // Fertile window: 5 days before ovulation up to ovulation day
      const fertileStart = addDays(ovulationDate, -5);
      const fertileEnd = ovulationDate;

      prediction = {
        predictedStart,
        earliestStart: earliest,
        latestStart: latest,
        ovulationDate,
        fertileWindow: {
          start: fertileStart,
          end: fertileEnd
        },
        confidence: stats.completedCycles >= 3 ? "moderate" : "baseline",
        method: stats.completedCycles >= 3 ? "historical_median" : "default_setting",
        cyclesUsed: stats.completedCycles
      };
    }

    res.status(200).json({
      success: true,
      data: {
        month,
        actualPeriods: periods,
        stats,
        prediction
      }
    });
  } catch (error) {
    next(error);
  }
}
