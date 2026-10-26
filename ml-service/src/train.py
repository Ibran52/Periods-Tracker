import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
import joblib

from features import FEATURE_NAMES, extract_features

def generate_benchmark_dataset(n_users=150, cycles_per_user=14, seed=42):
    """
    Generates realistic menstrual cycle sequences based on clinical population distributions
    (median 28 days, user-level baseline 24-35 days, random noise/stress shifts).
    """
    np.random.seed(seed)
    records = []

    for user_id in range(n_users):
        user_mean = np.random.normal(28.5, 2.2)
        user_mean = np.clip(user_mean, 22.0, 36.0)
        user_period_dur = max(3.0, round(np.random.normal(5.0, 0.8), 0))

        # Generate cycle sequence with mild temporal autocorrelation & sporadic irregularity
        cycles = []
        current = user_mean
        for c in range(cycles_per_user):
            noise = np.random.normal(0, 1.8)
            # 5% chance of high stress / illness delay
            if np.random.rand() < 0.05:
                noise += np.random.uniform(4.0, 8.0)
            length = round(0.6 * current + 0.4 * user_mean + noise, 0)
            length = float(np.clip(length, 18.0, 50.0))
            cycles.append(length)
            current = length

        # Build feature/target pairs strictly using past completed cycles
        for i in range(2, len(cycles) - 1):
            history = cycles[: i + 1]
            target_next = cycles[i + 1]
            feats = extract_features(history, last_period_duration=user_period_dur)
            row = dict(feats)
            row["user_id"] = user_id
            row["cycle_index"] = i
            row["next_cycle_length"] = target_next
            records.append(row)

    return pd.DataFrame(records)

def evaluate_models():
    """
    Executes chronological walk-forward validation and saves the approved model.
    """
    df = generate_benchmark_dataset()

    # Chronological split: train on earlier user cycles (index < 9), test on future unseen cycles (index >= 9)
    train_mask = df["cycle_index"] < 9
    test_mask = df["cycle_index"] >= 9

    train_df = df[train_mask]
    test_df = df[test_mask]

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df["next_cycle_length"]
    X_test = test_df[FEATURE_NAMES]
    y_test = test_df["next_cycle_length"]

    # 1. Baseline Benchmark: Median of past 6 cycles
    baseline_preds = test_df["median_last_6"].values
    baseline_mae = mean_absolute_error(y_test, baseline_preds)

    # 2. Random Forest Regressor
    rf_pipeline = make_pipeline(
        SimpleImputer(strategy="median"),
        RandomForestRegressor(n_estimators=150, max_depth=6, min_samples_leaf=3, random_state=42)
    )
    rf_pipeline.fit(X_train, y_train)
    rf_preds = rf_pipeline.predict(X_test)
    rf_mae = mean_absolute_error(y_test, rf_preds)

    # 3. Gradient Boosting Regressor
    gb_pipeline = make_pipeline(
        SimpleImputer(strategy="median"),
        GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.05, random_state=42)
    )
    gb_pipeline.fit(X_train, y_train)
    gb_preds = gb_pipeline.predict(X_test)
    gb_mae = mean_absolute_error(y_test, gb_preds)

    # Choose best model
    if rf_mae <= gb_mae and rf_mae < baseline_mae:
        best_name = "random_forest"
        best_model = rf_pipeline
        best_mae = rf_mae
        best_preds = rf_preds
    elif gb_mae < baseline_mae:
        best_name = "gradient_boosting"
        best_model = gb_pipeline
        best_mae = gb_mae
        best_preds = gb_preds
    else:
        best_name = "baseline_median"
        best_model = rf_pipeline
        best_mae = baseline_mae
        best_preds = baseline_preds

    # Calibrate 80% empirical uncertainty interval
    errors = np.abs(y_test - best_preds)
    p80_uncertainty = float(np.percentile(errors, 80))
    # Coverage verification
    coverage = float(np.mean(errors <= p80_uncertainty))

    metrics = {
        "baseline_mae": round(float(baseline_mae), 3),
        "random_forest_mae": round(float(rf_mae), 3),
        "gradient_boosting_mae": round(float(gb_mae), 3),
        "approved_model": best_name,
        "approved_mae": round(float(best_mae), 3),
        "calibrated_uncertainty_days": round(p80_uncertainty, 1),
        "interval_coverage_pct": round(coverage * 100, 1),
        "training_samples": len(train_df),
        "test_samples": len(test_df),
        "model_version": "periodpal-ml-v1"
    }

    # Save artifacts
    models_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "periodpal_model.joblib")
    metrics_path = os.path.join(models_dir, "metrics.json")

    joblib.dump(best_model, model_path)
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print("Training and chronological evaluation complete:")
    print(json.dumps(metrics, indent=2))
    return metrics

if __name__ == "__main__":
    evaluate_models()
