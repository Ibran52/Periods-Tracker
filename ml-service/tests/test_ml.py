import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))

import pytest
from fastapi.testclient import TestClient
from features import extract_features, features_to_vector
from baseline import predict_baseline
from predict import predict_cycle

TEST_API_KEY = "unit-test-only-ml-api-key-not-for-runtime"
os.environ["ML_API_KEY"] = TEST_API_KEY

from app import app, validate_api_key_configuration

client = TestClient(app)

def test_feature_extraction_no_cycles():
    feats = extract_features([])
    assert feats["last_cycle_length"] == 28.0
    assert feats["cycles_available"] == 0.0
    assert feats["std_last_6"] == 0.0

def test_feature_extraction_with_history():
    cycles = [28.0, 29.0, 27.0, 30.0]
    feats = extract_features(cycles, last_period_duration=4.0)
    assert feats["last_cycle_length"] == 30.0
    assert feats["cycles_available"] == 4.0
    assert feats["last_period_duration"] == 4.0
    assert feats["mean_last_3"] == 28.67

def test_baseline_predictions():
    # Tier 0 (0 cycles)
    res0 = predict_baseline([])
    assert res0["predicted_cycle_length"] == 28.0
    assert res0["method"] == "default_setting"

    # Tier 1 (2 cycles)
    res1 = predict_baseline([28.0, 30.0])
    assert res1["predicted_cycle_length"] == 29.0
    assert res1["method"] == "historical_median"

def test_predict_cycle_fallback_and_ml():
    # Early history (2 cycles)
    pred_early = predict_cycle([28.0, 30.0])
    assert pred_early["method"] == "historical_median"

    # Multi cycles
    pred_multi = predict_cycle([28.0, 29.0, 28.0, 30.0, 29.0])
    assert pred_multi["predicted_cycle_length"] >= 20.0
    assert pred_multi["uncertainty_days"] >= 1.5

def test_fastapi_health_endpoint():
    res = client.get("/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

def test_fastapi_predict_unauthorized():
    res = client.post("/v1/predict", json={"cycle_lengths": [28.0, 29.0]})
    assert res.status_code == 401

def test_fastapi_predict_authorized():
    headers = {"X-ML-API-Key": TEST_API_KEY}
    res = client.post(
        "/v1/predict",
        json={"cycle_lengths": [28.0, 29.0, 30.0, 28.0]},
        headers=headers
    )
    assert res.status_code == 200
    data = res.json()
    assert "predicted_cycle_length" in data
    assert "uncertainty_days" in data
    assert "method" in data

def test_ml_api_key_configuration_rejects_missing_or_weak_keys(monkeypatch):
    monkeypatch.delenv("ML_API_KEY", raising=False)
    monkeypatch.delenv("ML_SERVICE_API_KEY", raising=False)
    with pytest.raises(RuntimeError):
        validate_api_key_configuration()

    monkeypatch.setenv("ML_API_KEY", "short")
    with pytest.raises(RuntimeError):
        validate_api_key_configuration()

    monkeypatch.setenv("ML_API_KEY", TEST_API_KEY)
    validate_api_key_configuration()
