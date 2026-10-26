import { config } from "../config/env.js";

export interface MLPredictResponse {
  predicted_cycle_length: number;
  uncertainty_days: number;
  method: string;
  confidence: string;
  modelVersion?: string;
  featuresUsed?: Record<string, any>;
  message: string;
}

export interface MLEvaluateResponse {
  status: string;
  metrics?: {
    baseline_mae: number;
    random_forest_mae: number;
    gradient_boosting_mae?: number;
    cycle_sync_mae?: number;
    approved_model: string;
    approved_mae: number;
    calibrated_uncertainty_days: number;
    interval_coverage_pct: number;
    training_samples: number;
    test_samples: number;
    model_version: string;
  };
}

// Measured warm latency: RF avg ~2100ms, LSTM warm ~57ms, baseline ~7ms.
// Timeout must exceed RF p99 latency with headroom. Set to 3500ms.
const ML_TIMEOUT_MS = 3500;

export type MLFailureReason = "timeout" | "error" | "unavailable" | null;

export interface MLPredictResult {
  data: MLPredictResponse | null;
  failureReason: MLFailureReason;
  latencyMs?: number;
}

export async function requestMLPrediction(
  cycleLengths: number[],
  lastPeriodDuration: number | null,
  defaultCycleLength: number,
  modelPreference?: string
): Promise<MLPredictResult> {
  if (!config.mlServiceApiKey) {
    console.warn("[ml-client] prediction skipped because the ML service API key is not configured");
    return { data: null, failureReason: "unavailable" };
  }

  const t0 = Date.now();
  try {
    const url = `${config.mlServiceUrl}/v1/predict`;
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(ML_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "X-ML-API-Key": config.mlServiceApiKey
      },
      body: JSON.stringify({
        cycle_lengths: cycleLengths,
        last_period_duration: lastPeriodDuration || 5.0,
        default_cycle_length: defaultCycleLength,
        model_preference: modelPreference === "auto" ? undefined : modelPreference
      })
    });

    const latencyMs = Date.now() - t0;

    if (!response.ok) {
      console.warn(`[ml-client] HTTP ${response.status} from ML service after ${latencyMs}ms`);
      return { data: null, failureReason: "error", latencyMs };
    }

    const data = (await response.json()) as MLPredictResponse;
    console.log(`[ml-client] predict ok method=${data.method} latency=${latencyMs}ms`);
    return { data, failureReason: null, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - t0;
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    const reason: MLFailureReason = isTimeout ? "timeout" : "unavailable";
    console.warn(`[ml-client] predict failed reason=${reason} after ${latencyMs}ms`);
    return { data: null, failureReason: reason, latencyMs };
  }
}

export async function requestMLEvaluation(): Promise<MLEvaluateResponse | null> {
  if (!config.mlServiceApiKey) {
    return null;
  }

  try {
    const url = `${config.mlServiceUrl}/v1/evaluate`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(ML_TIMEOUT_MS),
      headers: {
        "X-ML-API-Key": config.mlServiceApiKey
      }
    });

    if (!response.ok) return null;
    return (await response.json()) as MLEvaluateResponse;
  } catch {
    return null;
  }
}
