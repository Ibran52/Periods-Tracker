import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { SymptomLog } from "../models/SymptomLog.js";

export const symptomSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    symptoms: z.array(z.string()).optional(),
    mood: z.string().nullable().optional(),
    painLevel: z.number().int().min(0).max(10).optional(),
    notes: z.string().max(1000).optional()
  })
});

export async function getSymptoms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month } = req.query;
    let query: any = { userId: req.user!.id };

    if (month && typeof month === "string") {
      // e.g. "2026-11" matches regex ^2026-11
      query.date = { $regex: `^${month}` };
    }

    const logs = await SymptomLog.find(query).sort({ date: -1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
}

export async function logSymptom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, symptoms, mood, painLevel, notes } = req.body;

    const entry = await SymptomLog.findOneAndUpdate(
      { userId: req.user!.id, date },
      {
        userId: req.user!.id,
        date,
        symptoms: symptoms || [],
        mood: mood !== undefined ? mood : null,
        painLevel: painLevel !== undefined ? painLevel : 0,
        notes: notes || ""
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
}

export async function deleteSymptom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const entry = await SymptomLog.findOneAndDelete({ _id: id, userId: req.user!.id });
    if (!entry) {
      res.status(404).json({ success: false, message: "Symptom entry not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Symptom entry deleted" });
  } catch (error) {
    next(error);
  }
}
