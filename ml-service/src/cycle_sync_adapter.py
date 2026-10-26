"""
CycleSync LSTM Model Adapter for PeriodPal.

Model Source: VishSinh/cycle-sync (Apache-2.0)
Architecture: Keras Sequential LSTM [LSTM(16) -> Dense(8) -> Dense(2)]
Inputs: (batch_size, 3, 2) where:
  - Timestep sequence: 3 consecutive previous completed menstrual cycles
  - Feature 0: completed cycle length in days (MinMaxScaler: min=25.0, max=35.0)
  - Feature 1: period bleeding duration in days (MinMaxScaler: min=3.0, max=7.0)
Outputs: (batch_size, 2) where:
  - Target 0: predicted next cycle length in days (MinMaxScaler: min=25.0, max=35.0)
  - Target 1: predicted next period bleeding duration in days (MinMaxScaler: min=3.0, max=7.0)

IMPORTANT:
- The underlying model was trained with MinMaxScaler parameters [25.0, 3.0] to [35.0, 7.0].
  Cycles outside this range produce scaled values outside [0, 1].
- Predictions are raw point estimates without calibrated probabilistic bounds.
- This adapter is an experimental candidate and must not be used as a primary diagnostic tool.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

# Verified numerical scaling constants extracted from feature_scaler.pkl and label_scaler.pkl
# Equivalence test confirmed: max diff < 1e-15 compared to scikit-learn MinMaxScaler
SCALER_DATA_MIN = np.array([25.0, 3.0], dtype=np.float32)
SCALER_DATA_MAX = np.array([35.0, 7.0], dtype=np.float32)
SCALER_DATA_RANGE = SCALER_DATA_MAX - SCALER_DATA_MIN  # [10.0, 4.0]

# Biological plausibility sanity bounds for adult human menstrual cycles
MIN_PLAUSIBLE_CYCLE = 18.0
MAX_PLAUSIBLE_CYCLE = 60.0
MIN_PLAUSIBLE_DURATION = 2.0
MAX_PLAUSIBLE_DURATION = 12.0

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "models", "cycle-sync", "lstm_combined_model.keras"
)


def scale_features(features: np.ndarray) -> np.ndarray:
    """Applies exact min-max scaling: (x - min) / range."""
    return (features - SCALER_DATA_MIN) / SCALER_DATA_RANGE


def inverse_scale_labels(scaled: np.ndarray) -> np.ndarray:
    """Applies exact inverse min-max scaling: (scaled * range) + min."""
    return (scaled * SCALER_DATA_RANGE) + SCALER_DATA_MIN


class CycleSyncAdapter:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self._model = None
        self._load_error: Optional[str] = None

    def has_artifact(self) -> bool:
        """Returns True if the model weights file exists on disk."""
        return os.path.exists(self.model_path)

    def is_available(self) -> bool:
        """Returns True if the model weights file exists on disk and loads successfully."""
        if not self.has_artifact():
            return False
        if self._model is not None:
            return True
        try:
            self.load_model()
            return self._model is not None
        except Exception:
            return False

    def load_model(self):
        """Loads the Keras model without compiling, or raises RuntimeError."""
        if self._model is not None:
            return self._model

        if not self.has_artifact():
            self._load_error = f"Model artifact not found at {self.model_path}"
            raise FileNotFoundError(self._load_error)

        try:
            import tensorflow as tf
            # Suppress oneDNN / verbose noise
            os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
            self._model = tf.keras.models.load_model(self.model_path, compile=False)
            self._load_error = None
            return self._model
        except Exception as e:
            self._load_error = str(e)
            raise RuntimeError(f"Failed to load CycleSync model: {e}") from e

    def build_sequence(
        self,
        cycle_lengths: List[float],
        period_durations: Optional[List[float]] = None,
        default_duration: float = 5.0
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Builds the (1, 3, 2) input tensor from historical cycles.
        Requires at least 3 completed cycles. Never invents past cycle lengths.
        """
        if len(cycle_lengths) < 3:
            raise ValueError(
                f"CycleSync LSTM requires at least 3 completed cycles, got {len(cycle_lengths)}"
            )

        # Take the most recent 3 cycles
        recent_cycles = [float(c) for c in cycle_lengths[-3:]]

        # Validate that cycle lengths are positive and finite
        for c in recent_cycles:
            if not np.isfinite(c) or c <= 0:
                raise ValueError(f"Invalid non-finite or non-positive cycle length: {c}")

        duration_imputed = False
        if period_durations is not None and len(period_durations) >= 3:
            recent_durations = [float(d) for d in period_durations[-3:]]
        elif period_durations is not None and len(period_durations) > 0:
            # Pad with user's last known duration if fewer than 3 durations supplied
            recent_durations = [float(period_durations[-1])] * 3
            duration_imputed = True
        else:
            recent_durations = [float(default_duration)] * 3
            duration_imputed = True

        for d in recent_durations:
            if not np.isfinite(d) or d <= 0:
                raise ValueError(f"Invalid non-finite or non-positive period duration: {d}")

        raw_sequence = np.array(
            [[c, d] for c, d in zip(recent_cycles, recent_durations)],
            dtype=np.float32
        )  # Shape (3, 2)

        scaled_sequence = scale_features(raw_sequence)
        input_tensor = np.expand_dims(scaled_sequence, axis=0)  # Shape (1, 3, 2)

        meta = {
            "recent_cycles": recent_cycles,
            "recent_durations": recent_durations,
            "duration_imputed": duration_imputed,
            "inputs_out_of_scaler_range": bool(np.any((raw_sequence < SCALER_DATA_MIN) | (raw_sequence > SCALER_DATA_MAX)))
        }

        return input_tensor, meta

    def predict(
        self,
        cycle_lengths: List[float],
        period_durations: Optional[List[float]] = None,
        default_duration: float = 5.0
    ) -> Dict[str, Any]:
        """
        Executes prediction and returns structured result with diagnostics and validation flags.
        """
        model = self.load_model()
        input_tensor, meta = self.build_sequence(cycle_lengths, period_durations, default_duration)

        raw_pred_scaled = model.predict(input_tensor, verbose=0)
        raw_pred = inverse_scale_labels(raw_pred_scaled)[0]

        pred_cycle_length = float(raw_pred[0])
        pred_duration = float(raw_pred[1])

        # Check for non-finite values
        if not np.isfinite(pred_cycle_length) or not np.isfinite(pred_duration):
            raise ValueError(f"Model returned non-finite prediction: {raw_pred}")

        # Check biological validity bounds
        is_plausible = (
            MIN_PLAUSIBLE_CYCLE <= pred_cycle_length <= MAX_PLAUSIBLE_CYCLE
            and MIN_PLAUSIBLE_DURATION <= pred_duration <= MAX_PLAUSIBLE_DURATION
        )

        # Calculate uncertainty based on user's empirical cycle standard deviation
        cycle_std = float(np.std(cycle_lengths[-6:])) if len(cycle_lengths) > 1 else 3.0
        # Uncertainty is widened for irregular inputs or out-of-distribution cycles
        uncertainty = max(2.5, min(6.0, round(cycle_std, 1)))
        if meta["inputs_out_of_scaler_range"]:
            uncertainty = max(uncertainty, 4.0)

        warning = None
        if not is_plausible:
            warning = (
                f"Model output ({pred_cycle_length:.1f}d cycle, {pred_duration:.1f}d duration) "
                f"exceeds biological plausibility range [{MIN_PLAUSIBLE_CYCLE}-{MAX_PLAUSIBLE_CYCLE}d]."
            )
        elif meta["inputs_out_of_scaler_range"]:
            warning = "Input cycles exceed standard scaler distribution [25-35 days]."

        return {
            "predicted_cycle_length": round(pred_cycle_length, 1),
            "predicted_period_duration": round(pred_duration, 1),
            "raw_cycle_length": pred_cycle_length,
            "raw_period_duration": pred_duration,
            "uncertainty_days": uncertainty,
            "method": "lstm_cycle_sync",
            "confidence": "experimental_candidate",
            "is_valid": is_plausible,
            "warning": warning,
            "modelVersion": "cycle-sync-lstm-v1",
            "featuresUsed": {
                "recent_cycles": meta["recent_cycles"],
                "recent_durations": meta["recent_durations"],
                "duration_imputed": float(meta["duration_imputed"]),
                "inputs_out_of_range": float(meta["inputs_out_of_scaler_range"])
            },
            "message": (
                f"LSTM neural estimate based on last 3 cycles."
                if is_plausible else "CycleSync prediction flagged out-of-range; fallback advised."
            )
        }
