# Veyora ML Service & Model Documentation

This service provides cycle length forecasting and evaluation for the Veyora application.

---

## 1. Supported Models & Hierarchy

| Model Tier | Model Name | Description | Status |
|---|---|---|---|
| **Tier 0 & 1** (< 4 cycles) | `predict_baseline` | Transparent historical median / user default | **Production Default** |
| **Tier 2** (>= 4 cycles) | `veyora_model.joblib` | Scikit-learn Random Forest Regressor | **Production Default** |
| **Experimental Candidate** | `cycle_sync_adapter` | Keras Sequential LSTM (`VishSinh/cycle-sync`) | **Experimental Candidate** |

---

## 2. Independent Walk-Forward Benchmark Results

Evaluated on **600 unseen chronological test cycle predictions** (150 simulated synthetic users, 14 cycles each; walk-forward split with train `index < 9`, test `index >= 9`, zero data leakage):

| Model | MAE (days) | RMSE (days) | MedAE (days) | P80 Error (days) | Recommendation |
|---|---|---|---|---|---|
| **Production Random Forest** | **1.745** | **2.353** | **1.288** | **2.725** | **Approved Default** |
| **Baseline Median** | 1.912 | 2.697 | 1.500 | 3.000 | Safe Fallback |
| **CycleSync LSTM** | 2.730 | 3.446 | 2.400 | 4.400 | Experimental Candidate |

### Evaluation Verdict:
The production Random Forest model significantly outperforms the CycleSync LSTM across all metrics (MAE $1.745$ vs $2.730$). CycleSync LSTM is retained as an **isolated experimental candidate** and is **disabled by default**.

---

## 3. Candidate Model Attribution & Scaler Specifications

- **Model**: `VishSinh/cycle-sync` (`lstm_combined_model.keras`)
- **License**: Apache-2.0
- **Architecture**: `LSTM(16) -> Dense(8) -> Dense(2)` (1,370 parameters)
- **Input Shape**: `(batch_size, 3, 2)`
  - Sequence: 3 consecutive previous completed menstrual cycles
  - Feature 0: Completed cycle length in days (`data_min=25.0`, `data_max=35.0`)
  - Feature 1: Bleeding period duration in days (`data_min=3.0`, `data_max=7.0`)
- **Output Shape**: `(batch_size, 2)`
  - Target 0: Predicted cycle length in days
  - Target 1: Predicted period duration in days
- **Scaler Determinism**:
  To avoid Python/scikit-learn `InconsistentVersionWarning` unpickling risks, the adapter utilizes verified mathematical scaling constants (`SCALER_DATA_MIN = [25.0, 3.0]`, `SCALER_DATA_RANGE = [10.0, 4.0]`). Numerical equivalence testing verified difference $< 10^{-15}$.

---

## 4. How to Enable / Select Models

### Default Production Mode (Random Forest):
Leave `USE_CYCLE_SYNC` unset or set to `false`. Requests to `/v1/predict` without `model_preference` use Random Forest (or baseline when $< 4$ cycles).

### Experimental Mode:
- Via Request Body: Pass `"model_preference": "cycle_sync"` in the JSON payload to `/v1/predict`.
- Via Environment Variable: Set `USE_CYCLE_SYNC=true` in `.env`.

---

## 5. Medical Disclaimer & Known Limitations

1. **Non-Medical Tool**: PeriodPal and all incorporated models are non-diagnostic statistical tools. They do NOT provide contraceptive guarantees or medical diagnoses.
2. **Narrow Training Scaler**: CycleSync was trained with scalers fitted on regular $25\text{--}35$ day cycles. Irregular cycles (e.g. PCOS, postpartum) produce out-of-distribution inputs. The adapter detects and flags these, widening uncertainty intervals and falling back when predictions violate physiological plausibility ($18\text{--}60$ days).

---

## 6. Reproducible Windows Commands

Run tests:
```powershell
python -m pytest tests/
```

Run independent benchmark:
```powershell
python src/benchmark.py
```

Start ML service locally:
```powershell
python src/app.py
```
