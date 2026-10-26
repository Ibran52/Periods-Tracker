---
language: en
license: apache-2.0
tags:
  - keras
  - tensorflow
  - time-series
  - menstrual-cycle-prediction
  - healthcare
pipeline_tag: time-series-forecasting
model-index:
  - name: lstm_combined_model
    results:
      - task:
          type: time-series-forecasting
          name: Menstrual Cycle Prediction
        metrics:
          - type: mae
            value: 1.2
            name: Mean Absolute Error (MAE)
          - type: mse
            value: 2.5
            name: Mean Squared Error (MSE)
---

# 🩸 **Cycle Sync: Menstrual Cycle Prediction using LSTM**

## 🚀 **Model Overview**
The `cycle-sync` model is built using a Long Short-Term Memory (LSTM) architecture trained to predict menstrual cycle lengths and period durations based on a user’s past period history.

## 🔥 **Model Highlights**
- 🧠 **Architecture:** LSTM (Long Short-Term Memory) with time-series inputs.
- 📊 **Purpose:** Predict the next period start date and duration based on previous cycle data.
- 🎯 **Task Type:** `time-series-forecasting`
- 📚 **Framework:** Keras with TensorFlow backend.
- 📈 **Scalers:** `MinMaxScaler` used for feature and label scaling.

## 📡 **Usage**

### 🎨 **Load Model**
To load the model from Hugging Face, use the following code:

```python
import keras
from datetime import timedelta
import numpy as np
import pickle

# Load the model from Hugging Face
model = keras.saving.load_model("hf://VishSinh/cycle-sync")

# Load the scalers (if needed)
with open("feature_scaler.pkl", "rb") as f:
    feature_scaler = pickle.load(f)

with open("label_scaler.pkl", "rb") as f:
    label_scaler = pickle.load(f)
```