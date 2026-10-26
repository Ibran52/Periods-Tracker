import os
import json
from typing import List, Dict, Any, Optional
import joblib
import numpy as np

from features import extract_features, features_to_vector, FEATURE_NAMES
from baseline import predict_baseline

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_PATH = (
    os.path.join(MODEL_DIR, "veyora_model.joblib")
    if os.path.exists(os.path.join(MODEL_DIR, "veyora_model.joblib"))
    else os.path.join(MODEL_DIR, "periodpal_model.joblib")
)
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

_model = None
_metrics = None

def get_model():
    global _model, _metrics
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"Error loading model: {e}")
            _model = None

    if _metrics is None and os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r") as f:
                _metrics = json.load(f)
        except Exception as e:
            print(f"Error loading metrics: {e}")
            _metrics = None

    return _model, _metrics

_cycle_sync_adapter = None

def get_cycle_sync_adapter():
    global _cycle_sync_adapter
    if _cycle_sync_adapter is None:
        try:
            from cycle_sync_adapter import CycleSyncAdapter
            _cycle_sync_adapter = CycleSyncAdapter()
        except Exception as e:
            print(f"CycleSync adapter init failed: {e}")
            _cycle_sync_adapter = None
    return _cycle_sync_adapter

def predict_cycle(
    cycle_lengths: List[float],
    last_period_duration: Optional[float] = 5.0,
    default_cycle_length: float = 28.0,
    model_preference: Optional[str] = None
) -> Dict[str, Any]:
    """
    Tiered prediction logic:
    - Default (Production):
        * Tier 0/1 (< 4 completed cycles): Transparent baseline median.
        * Tier 2 (>= 4 completed cycles): Random Forest model with calibrated uncertainty.
    - Experimental Candidate (when model_preference='cycle_sync' or USE_CYCLE_SYNC=true):
        * Evaluates CycleSync LSTM on last 3 cycles.
        * Falls back to Random Forest or Baseline on invalid outputs or errors.
    """
    count = len(cycle_lengths)
    use_cycle_sync_env = os.environ.get("USE_CYCLE_SYNC", "false").lower() in ("true", "1", "yes")
    requested_cycle_sync = (model_preference == "cycle_sync") or (use_cycle_sync_env and model_preference != "random_forest")

    if requested_cycle_sync:
        if count >= 3:
            adapter = get_cycle_sync_adapter()
            if adapter and adapter.is_available():
                try:
                    res = adapter.predict(
                        cycle_lengths=cycle_lengths,
                        default_duration=last_period_duration or 5.0
                    )
                    # If model prediction is physiologically valid, return it
                    if res.get("is_valid", False):
                        return res
                    else:
                        print(f"CycleSync prediction flagged out-of-range ({res.get('warning')}), falling back to standard pipeline.")
                except Exception as e:
                    print(f"CycleSync inference error ({e}), falling back to standard pipeline.")
        else:
            # Insufficient history for CycleSync LSTM
            return predict_baseline(cycle_lengths, default_cycle_length)

    # Standard Production Pipeline (Default)
    # If user has fewer than 4 recorded cycles, use baseline
    if count < 4:
        return predict_baseline(cycle_lengths, default_cycle_length)

    model, metrics = get_model()
    if model is None:
        return predict_baseline(cycle_lengths, default_cycle_length)

    import pandas as pd
    features = extract_features(
        cycle_lengths,
        last_period_duration=last_period_duration,
        default_cycle_length=default_cycle_length
    )
    df_input = pd.DataFrame([features])[FEATURE_NAMES]

    try:
        pred_length = float(model.predict(df_input)[0])
        pred_length = float(np.clip(pred_length, 18.0, 50.0))

        uncertainty = 2.5
        model_version = "veyora-ml-v1"
        if metrics:
            uncertainty = float(metrics.get("calibrated_uncertainty_days", 2.5))
            model_version = metrics.get("model_version", model_version)

        # If user cycle has high variance, widen interval appropriately
        if features["std_last_6"] > 4.0:
            uncertainty = max(uncertainty, round(features["std_last_6"], 1))

        return {
            "predicted_cycle_length": round(pred_length, 1),
            "uncertainty_days": uncertainty,
            "method": "personalized_ml",
            "modelVersion": model_version,
            "confidence": "high" if count >= 6 else "moderate",
            "featuresUsed": features,
            "message": f"Personalized machine learning estimate based on {count} past cycles."
        }
    except Exception as e:
        print(f"ML inference fallback: {e}")
        return predict_baseline(cycle_lengths, default_cycle_length)
