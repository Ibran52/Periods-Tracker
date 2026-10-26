from typing import List, Dict, Any, Optional
import numpy as np

FEATURE_NAMES = [
    "last_cycle_length",
    "mean_last_3",
    "median_last_6",
    "std_last_6",
    "last_period_duration",
    "cycles_available"
]

def extract_features(
    cycle_lengths: List[float],
    last_period_duration: Optional[float] = 5.0,
    default_cycle_length: float = 28.0
) -> Dict[str, float]:
    """
    Extracts predictive features using strictly historical information known
    prior to the prediction point (zero data leakage).
    """
    count = len(cycle_lengths)
    if count == 0:
        return {
            "last_cycle_length": default_cycle_length,
            "mean_last_3": default_cycle_length,
            "median_last_6": default_cycle_length,
            "std_last_6": 0.0,
            "last_period_duration": float(last_period_duration or 5.0),
            "cycles_available": 0.0
        }

    last_cycle = float(cycle_lengths[-1])
    recent_3 = cycle_lengths[-3:] if count >= 3 else cycle_lengths
    recent_6 = cycle_lengths[-6:] if count >= 6 else cycle_lengths

    mean_3 = float(np.mean(recent_3))
    median_6 = float(np.median(recent_6))
    std_6 = float(np.std(recent_6)) if len(recent_6) > 1 else 0.0

    return {
        "last_cycle_length": last_cycle,
        "mean_last_3": round(mean_3, 2),
        "median_last_6": round(median_6, 2),
        "std_last_6": round(std_6, 2),
        "last_period_duration": float(last_period_duration or 5.0),
        "cycles_available": float(count)
    }

def features_to_vector(features: Dict[str, float]) -> List[float]:
    """Converts feature dictionary into model input vector."""
    return [features[name] for name in FEATURE_NAMES]
