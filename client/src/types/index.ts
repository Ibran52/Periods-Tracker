export interface User {
  id: string;
  name: string;
  email: string;
  isOnboarded: boolean;
  themePreference: "dark" | "light" | "system";
}

export interface CycleSettings {
  defaultCycleLength: number;
  defaultPeriodDuration: number;
  reminderDaysBefore: number;
  remindersEnabled: boolean;
  modelPreference?: "auto" | "random_forest" | "cycle_sync" | "baseline";
}

export interface PeriodLog {
  _id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  flowIntensity: "light" | "medium" | "heavy" | null;
  notes: string;
  createdAt: string;
}

export interface SymptomLog {
  _id: string;
  date: string;
  symptoms: string[];
  mood: string | null;
  painLevel: number;
  notes: string;
  createdAt: string;
}

export interface PredictionData {
  hasHistory: boolean;
  currentCycleDay?: number;
  daysUntilNext?: number;
  latestPeriodStartDate?: string;
  predictedStart?: string;
  earliestStart?: string;
  latestStart?: string;
  predictedCycleLength?: number;
  uncertaintyDays?: number;
  ovulationDate?: string;
  fertileWindow?: {
    start: string;
    end: string;
  };
  method?: string;
  modelVersion?: string;
  modelPreference?: string;
  confidence?: string;
  message?: string;
  isPersonalizedML?: boolean;
  mlStatus?: "active" | "fallback" | "bypassed";
  fallbackReason?: string | null;
  lastUpdated?: string;
  stats?: CycleStats;
}

export interface CycleStats {
  completedCycles: number;
  cycleLengths: number[];
  averageCycleLength: number;
  medianCycleLength: number;
  stdCycleLength: number;
  averagePeriodDuration: number;
  isIrregular: boolean;
  lastCycleLength: number | null;
  lastPeriodDuration: number | null;
  latestPeriodStartDate: string | null;
}

export interface MLEvaluation {
  baseline_mae: number;
  random_forest_mae: number;
  gradient_boosting_mae?: number;
  cycle_sync_mae?: number;
  approved_model: string;
  approved_mae: number;
  calibrated_uncertainty_days: number;
  interval_coverage_pct: number;
  training_samples?: number;
  test_samples?: number;
  model_version: string;
  data_type?: string;
  evaluation_protocol?: string;
}

export interface PredictionSnapshot {
  _id: string;
  predictedStart: string;
  earliestStart: string;
  latestStart: string;
  predictedCycleLength: number;
  method: string;
  modelVersion: string;
  cyclesUsed: number;
  confidence: string;
  generatedAt: string;
}
