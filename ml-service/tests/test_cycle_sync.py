import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

import pytest
import numpy as np
from fastapi.testclient import TestClient

TEST_API_KEY = "unit-test-only-ml-api-key-not-for-runtime"
os.environ["ML_API_KEY"] = TEST_API_KEY

from cycle_sync_adapter import (
    CycleSyncAdapter,
    scale_features,
    inverse_scale_labels,
    SCALER_DATA_MIN,
    SCALER_DATA_MAX,
    SCALER_DATA_RANGE,
    MIN_PLAUSIBLE_CYCLE,
    MAX_PLAUSIBLE_CYCLE
)
from predict import predict_cycle
from app import app

client = TestClient(app)
AUTH_HEADERS = {"X-ML-API-Key": TEST_API_KEY}


def test_scaler_numerical_equivalence():
    """Verify that standalone arithmetic functions match formula identically."""
    test_points = np.array([
        [25.0, 3.0],   # lower scaler bounds -> scaled to [0, 0]
        [35.0, 7.0],   # upper scaler bounds -> scaled to [1, 1]
        [30.0, 5.0],   # center points -> scaled to [0.5, 0.5]
        [28.0, 4.0],   # regular cycle
        [45.0, 8.0]    # out-of-distribution cycle
    ], dtype=np.float32)

    scaled = scale_features(test_points)
    expected_scaled = (test_points - SCALER_DATA_MIN) / SCALER_DATA_RANGE
    np.testing.assert_allclose(scaled, expected_scaled, rtol=1e-6, atol=1e-6)

    # Invert back
    reconstructed = inverse_scale_labels(scaled)
    np.testing.assert_allclose(reconstructed, test_points, rtol=1e-6, atol=1e-6)


def test_sequence_construction_exact():
    adapter = CycleSyncAdapter()
    cycles = [27.0, 28.0, 29.0]
    durations = [4.0, 5.0, 5.0]

    tensor, meta = adapter.build_sequence(cycles, durations)
    assert tensor.shape == (1, 3, 2)
    assert meta["recent_cycles"] == [27.0, 28.0, 29.0]
    assert meta["recent_durations"] == [4.0, 5.0, 5.0]
    assert meta["duration_imputed"] is False
    assert meta["inputs_out_of_scaler_range"] is False

    # Check scaled values for first step (27.0 - 25.0)/10 = 0.2; (4.0 - 3.0)/4 = 0.25
    np.testing.assert_allclose(tensor[0, 0, :], [0.2, 0.25], rtol=1e-5)


def test_insufficient_cycles_zero_one_two():
    adapter = CycleSyncAdapter()

    # Zero cycles
    with pytest.raises(ValueError, match="at least 3 completed cycles"):
        adapter.build_sequence([])

    # One cycle
    with pytest.raises(ValueError, match="at least 3 completed cycles"):
        adapter.build_sequence([28.0])

    # Two cycles
    with pytest.raises(ValueError, match="at least 3 completed cycles"):
        adapter.build_sequence([28.0, 29.0])


def test_invalid_and_non_finite_inputs():
    adapter = CycleSyncAdapter()

    # NaN in cycle lengths
    with pytest.raises(ValueError, match="non-finite"):
        adapter.build_sequence([28.0, float("nan"), 30.0])

    # Inf in cycle lengths
    with pytest.raises(ValueError, match="non-finite"):
        adapter.build_sequence([28.0, float("inf"), 30.0])

    # Negative cycle length
    with pytest.raises(ValueError, match="non-positive"):
        adapter.build_sequence([28.0, -5.0, 30.0])

    # Negative duration
    with pytest.raises(ValueError, match="non-positive"):
        adapter.build_sequence([28.0, 29.0, 30.0], period_durations=[5.0, -1.0, 5.0])


def test_missing_durations_uses_default_duration():
    adapter = CycleSyncAdapter()
    cycles = [28.0, 30.0, 29.0]

    # No durations provided: defaults to 5.0
    tensor, meta = adapter.build_sequence(cycles, period_durations=None, default_duration=6.0)
    assert meta["duration_imputed"] is True
    assert meta["recent_durations"] == [6.0, 6.0, 6.0]

    # Partial durations (only 1 provided)
    tensor2, meta2 = adapter.build_sequence(cycles, period_durations=[4.0])
    assert meta2["duration_imputed"] is True
    assert meta2["recent_durations"] == [4.0, 4.0, 4.0]


def test_six_or_more_cycles_takes_last_three():
    adapter = CycleSyncAdapter()
    cycles = [32.0, 31.0, 30.0, 28.0, 29.0, 27.0]

    tensor, meta = adapter.build_sequence(cycles)
    assert meta["recent_cycles"] == [28.0, 29.0, 27.0]


def test_predict_realistic_cycles():
    adapter = CycleSyncAdapter()
    if not adapter.is_available():
        pytest.skip("CycleSync weights not present")

    res = adapter.predict([28.0, 29.0, 28.0], default_duration=5.0)
    assert res["method"] == "lstm_cycle_sync"
    assert res["is_valid"] is True
    assert MIN_PLAUSIBLE_CYCLE <= res["predicted_cycle_length"] <= MAX_PLAUSIBLE_CYCLE
    assert 2.0 <= res["predicted_period_duration"] <= 8.0
    assert res["uncertainty_days"] >= 2.0
    assert "raw_cycle_length" in res
    assert "raw_period_duration" in res


def test_irregular_cycles_flagged():
    adapter = CycleSyncAdapter()
    if not adapter.is_available():
        pytest.skip("CycleSync weights not present")

    # Long cycles outside [25, 35]
    res = adapter.predict([42.0, 45.0, 48.0])
    assert res["featuresUsed"]["inputs_out_of_range"] == 1.0
    assert res["uncertainty_days"] >= 4.0


def test_model_loading_error_handling():
    adapter = CycleSyncAdapter(model_path="non_existent_model_weights.keras")
    assert adapter.is_available() is False
    with pytest.raises(FileNotFoundError):
        adapter.load_model()


def test_predict_cycle_integration_disabled_by_default():
    """Ensure production behavior is preserved: Random Forest is used by default."""
    res = predict_cycle([28.0, 29.0, 28.0, 30.0])
    assert res["method"] == "personalized_ml"
    assert res["modelVersion"] == "veyora-ml-v1"


def test_predict_cycle_integration_enabled_explicitly():
    """Ensure CycleSync is selectable via model_preference='cycle_sync'."""
    res = predict_cycle([28.0, 29.0, 28.0], model_preference="cycle_sync")
    assert res["method"] == "lstm_cycle_sync"
    assert res["modelVersion"] == "cycle-sync-lstm-v1"


def test_predict_cycle_fallback_on_insufficient_history():
    """Ensure CycleSync with < 3 cycles safely falls back to baseline median."""
    res = predict_cycle([28.0, 30.0], model_preference="cycle_sync")
    assert res["method"] == "historical_median"
    assert res["predicted_cycle_length"] == 29.0


def test_fastapi_predict_with_cycle_sync_candidate():
    """Verify HTTP API schema compatibility for server/src/services/mlClient.ts."""
    payload = {
        "cycle_lengths": [28.0, 29.0, 28.0],
        "last_period_duration": 5.0,
        "default_cycle_length": 28.0,
        "model_preference": "cycle_sync"
    }
    res = client.post("/v1/predict", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "predicted_cycle_length" in data
    assert "uncertainty_days" in data
    assert "method" in data
    assert "confidence" in data
    assert "message" in data
    assert data["method"] == "lstm_cycle_sync"
