from typing import List, Dict, Any
import numpy as np

def predict_baseline(
    cycle_lengths: List[float],
    default_cycle_length: float = 28.0
) -> Dict[str, Any]:
    """
    Transparent baseline predicting the median of user's past cycles,
    or the default configured length if fewer than 2 cycles exist.
    """
    count = len(cycle_lengths)
    if count == 0:
        return {
            "predicted_cycle_length": round(default_cycle_length, 1),
            "uncertainty_days": 3.0,
            "method": "default_setting",
            "confidence": "baseline",
            "message": "Prediction based on your default cycle settings. Track more cycles to personalize."
        }

    if count == 1:
        c = float(cycle_lengths[0])
        # Widen uncertainty if single observed interval is clinically irregular (<21 or >38)
        uncertainty = 4.0 if (c < 21.0 or c > 38.0) else 3.0
        return {
            "predicted_cycle_length": round(c, 1),
            "uncertainty_days": uncertainty,
            "method": "historical_median",
            "confidence": "early_history",
            "message": f"Early estimate based on 1 recorded cycle interval ({round(c)}d). Track more cycles to confirm your personal pattern."
        }

    if count == 2:
        med = float(np.median(cycle_lengths))
        return {
            "predicted_cycle_length": round(med, 1),
            "uncertainty_days": 3.0,
            "method": "historical_median",
            "confidence": "early_history",
            "message": "Early estimate based on median of 2 logged cycles."
        }

    med = float(np.median(cycle_lengths))
    std = float(np.std(cycle_lengths))
    # Calibrated uncertainty window: standard deviation bounded between [2, 5] days
    uncertainty = max(2.0, min(5.0, round(std, 1)))

    return {
        "predicted_cycle_length": round(med, 1),
        "uncertainty_days": uncertainty,
        "method": "historical_median",
        "confidence": "moderate",
        "message": f"Prediction based on median of {count} completed cycles."
    }
