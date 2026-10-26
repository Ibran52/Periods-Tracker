import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field
import uvicorn
# pyrefly: ignore[missing-import]
from dotenv import load_dotenv

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from predict import predict_cycle, get_model, get_cycle_sync_adapter
from features import extract_features

API_KEY = os.environ.get("ML_API_KEY") or os.environ.get("ML_SERVICE_API_KEY", "")

app = FastAPI(
    title="Veyora Machine Learning Service",
    description="Cycle length prediction and evaluation service",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    # Pre-warm model artifacts into memory to eliminate first-request latency
    get_model()
    adapter = get_cycle_sync_adapter()
    if adapter:
        try:
            adapter.load_model()
        except Exception as e:
            print(f"CycleSync startup pre-warm notice: {e}")


class PredictRequest(BaseModel):
    cycle_lengths: List[float] = Field(..., description="List of historical completed cycle lengths in days")
    last_period_duration: Optional[float] = Field(5.0, description="Duration in days of latest bleeding period")
    default_cycle_length: Optional[float] = Field(28.0, description="User configured baseline cycle length")
    model_preference: Optional[str] = Field(None, description="Optional model selector: 'default', 'random_forest', or 'cycle_sync'")

class PredictResponse(BaseModel):
    predicted_cycle_length: float
    uncertainty_days: float
    method: str
    confidence: str
    modelVersion: Optional[str] = None
    featuresUsed: Optional[Dict[str, Any]] = None
    message: str

def verify_api_key(x_ml_api_key: Optional[str] = Header(None)):
    expected_key = os.environ.get("ML_API_KEY") or os.environ.get("ML_SERVICE_API_KEY") or API_KEY
    if not expected_key or x_ml_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-ML-API-Key header"
        )

@app.get("/v1/health")
def health():
    _, metrics = get_model()
    from predict import get_cycle_sync_adapter
    adapter = get_cycle_sync_adapter()
    return {
        "status": "ok",
        "service": "veyora-ml",
        "model_loaded": metrics is not None,
        "model_version": metrics.get("model_version") if metrics else None,
        "cycle_sync_available": adapter.is_available() if adapter else False
    }

@app.post("/v1/predict", response_model=PredictResponse)
def predict(payload: PredictRequest, x_ml_api_key: Optional[str] = Header(None)):
    verify_api_key(x_ml_api_key)
    res = predict_cycle(
        cycle_lengths=payload.cycle_lengths,
        last_period_duration=payload.last_period_duration,
        default_cycle_length=payload.default_cycle_length or 28.0,
        model_preference=payload.model_preference
    )
    return res

@app.get("/v1/evaluate")
def evaluate(x_ml_api_key: Optional[str] = Header(None)):
    verify_api_key(x_ml_api_key)
    _, metrics = get_model()
    if not metrics:
        return {"status": "uninitialized", "message": "Model evaluation metrics not yet generated"}
    return {"status": "ready", "metrics": metrics}

if __name__ == "__main__":
    port = int(os.environ.get("ML_PORT", 8000))
    host = os.environ.get("ML_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port)
