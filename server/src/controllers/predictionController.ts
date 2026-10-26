import { Request, Response, NextFunction } from "express";
import { PeriodLog } from "../models/PeriodLog.js";
import { CycleSettings } from "../models/CycleSettings.js";
import { PredictionSnapshot } from "../models/PredictionSnapshot.js";
import { computeCycleStats, addDays, diffInDays, formatDate } from "../services/cycleService.js";
import { requestMLPrediction, requestMLEvaluation } from "../services/mlClient.js";

export async function getNextPrediction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const periods = await PeriodLog.find({ userId }).sort({ startDate: 1 });
    const settings = await CycleSettings.findOne({ userId });

    const defaultCycle = settings?.defaultCycleLength || 28;
    const defaultDuration = settings?.defaultPeriodDuration || 5;

    const stats = computeCycleStats(periods, defaultCycle, defaultDuration);

    if (!stats.latestPeriodStartDate) {
      res.status(200).json({
        success: true,
        data: {
          hasHistory: false,
          message: "No periods recorded yet. Log your last period to receive predictions."
        }
      });
      return;
    }

    // Attempt ML prediction first unless user specifically prefers manual baseline
    const modelPreference = settings?.modelPreference || "auto";
    console.log(`[prediction] request model_preference=${modelPreference} completed_cycles=${stats.completedCycles}`);
    const mlResult = modelPreference === "baseline"
      ? null
      : await requestMLPrediction(
          stats.cycleLengths,
          stats.lastPeriodDuration,
          defaultCycle,
          modelPreference
        );

    let predictedCycleLength: number;
    let uncertaintyDays: number;
    let method: string;
    let confidence: string;
    let modelVersion: string;
    let message: string;
    let isPersonalizedML = false;
    let fallbackReason: string | null = null;
    let mlStatus: "active" | "fallback" | "bypassed" = "active";

    if (mlResult?.data) {
      const mlData = mlResult.data;
      predictedCycleLength = mlData.predicted_cycle_length;
      uncertaintyDays = mlData.uncertainty_days;
      method = mlData.method;
      confidence = mlData.confidence;
      modelVersion = mlData.modelVersion || "veyora-ml-v1";
      message = mlData.message;
      isPersonalizedML = method === "personalized_ml" || method === "lstm_cycle_sync";
      if (modelPreference === "cycle_sync" && method !== "lstm_cycle_sync") {
        mlStatus = "fallback";
        fallbackReason = stats.completedCycles < 3 ? "insufficient_history" : "cycle_sync_fallback";
      } else if (modelPreference === "random_forest" && method !== "personalized_ml") {
        mlStatus = "fallback";
        fallbackReason = stats.completedCycles < 4 ? "insufficient_history" : "random_forest_fallback";
      } else {
        mlStatus = "active";
      }
      console.log(`[prediction] model_selected=${method} version=${modelVersion} cycles_used=${stats.completedCycles} uncertainty=${uncertaintyDays}d confidence=${confidence}`);
    } else {
      // Local fallback
      predictedCycleLength = stats.completedCycles > 0 ? stats.medianCycleLength : defaultCycle;
      if (stats.completedCycles >= 3) {
        uncertaintyDays = Math.max(2, Math.min(5, Math.round(stats.stdCycleLength)));
        method = "historical_median";
        confidence = "moderate";
        message = `Estimate calculated from median of ${stats.completedCycles} recorded cycles.`;
      } else if (stats.completedCycles === 2) {
        uncertaintyDays = stats.isIrregular ? 4 : 3;
        method = "historical_median";
        confidence = "early_history";
        message = "Early estimate calculated from median of 2 recorded cycles.";
      } else if (stats.completedCycles === 1) {
        uncertaintyDays = stats.isIrregular ? 4 : 3;
        method = "historical_median";
        confidence = "early_history";
        message = `Early estimate based on 1 recorded cycle interval (${Math.round(stats.cycleLengths[0])}d). Track more cycles to confirm your personal pattern.`;
      } else {
        uncertaintyDays = 3;
        method = "default_setting";
        confidence = "baseline";
        message = `Initial estimate based on your default cycle configuration (${defaultCycle} days).`;
      }
      modelVersion = "baseline-v1";
      isPersonalizedML = false;
      if (modelPreference === "baseline") {
        fallbackReason = "user_preference_baseline";
        mlStatus = "bypassed";
      } else if (mlResult?.failureReason) {
        fallbackReason = mlResult.failureReason;
        mlStatus = "fallback";
      } else {
        const requiredCycles = modelPreference === "cycle_sync" ? 3 : 4;
        fallbackReason = stats.completedCycles < requiredCycles ? "insufficient_history" : "ml_unavailable";
        mlStatus = "fallback";
      }
      console.log(`[prediction] fallback_to=local_${method} reason=${fallbackReason} cycles_used=${stats.completedCycles}`);
    }

    const predictedStart = addDays(stats.latestPeriodStartDate, Math.round(predictedCycleLength));
    const earliestStart = addDays(predictedStart, -Math.round(uncertaintyDays));
    const latestStart = addDays(predictedStart, Math.round(uncertaintyDays));

    // Fertile window & ovulation
    // Ovulation is estimated ~14 days before expected next period start
    const ovulationDate = addDays(predictedStart, -14);
    // 5 days before ovulation through ovulation day (Wilcox et al. NEJM)
    // Clamped so it never starts before the latest period start date
    const rawFertileStart = addDays(ovulationDate, -5);
    const fertileStart = rawFertileStart < stats.latestPeriodStartDate
      ? stats.latestPeriodStartDate
      : rawFertileStart;
    const fertileEnd = ovulationDate;

    // Countdown & cycle day calculations using consistent user timezone
    let todayStr: string;
    try {
      todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: settings?.timezone || "UTC" }).format(new Date());
    } catch {
      todayStr = formatDate(new Date());
    }
    const daysUntilNext = diffInDays(todayStr, predictedStart);
    const currentCycleDay = Math.max(1, diffInDays(stats.latestPeriodStartDate, todayStr) + 1);
    const lastUpdated = new Date().toISOString();
    console.log(`[prediction] predicted_cycle_len=${Math.round(predictedCycleLength)}d days_until_next=${daysUntilNext} cycle_day=${currentCycleDay} ok=true`);

    // Save snapshot (non-blocking)
    PredictionSnapshot.create({
      userId,
      predictedStart,
      earliestStart,
      latestStart,
      predictedCycleLength,
      method,
      modelVersion,
      cyclesUsed: stats.completedCycles,
      confidence
    }).catch(() => {});

    res.status(200).json({
      success: true,
      data: {
        hasHistory: true,
        currentCycleDay,
        daysUntilNext,
        latestPeriodStartDate: stats.latestPeriodStartDate,
        predictedStart,
        earliestStart,
        latestStart,
        predictedCycleLength: Math.round(predictedCycleLength * 10) / 10,
        uncertaintyDays,
        ovulationDate,
        fertileWindow: {
          start: fertileStart,
          end: fertileEnd
        },
        method,
        modelVersion,
        modelPreference,
        confidence,
        message,
        isPersonalizedML,
        mlStatus,
        fallbackReason,
        lastUpdated,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMLInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const periods = await PeriodLog.find({ userId }).sort({ startDate: 1 });
    const settings = await CycleSettings.findOne({ userId });

    const stats = computeCycleStats(
      periods,
      settings?.defaultCycleLength || 28,
      settings?.defaultPeriodDuration || 5
    );

    const mlEvaluation = await requestMLEvaluation();

    // Recent snapshots
    const snapshots = await PredictionSnapshot.find({ userId })
      .sort({ generatedAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        stats,
        mlEvaluation: mlEvaluation?.metrics || {
          baseline_mae: 1.912,
          random_forest_mae: 1.745,
          gradient_boosting_mae: 1.917,
          cycle_sync_mae: 2.730,
          approved_model: "random_forest",
          approved_mae: 1.745,
          calibrated_uncertainty_days: 2.7,
          interval_coverage_pct: 80.0,
          model_version: "veyora-ml-v1"
        },
        snapshots
      }
    });
  } catch (error) {
    next(error);
  }
}
