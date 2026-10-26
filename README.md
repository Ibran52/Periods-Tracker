# Veyora

Veyora is a menstrual health tracking application for recording cycle history, symptoms, and personal cycle settings. It includes a responsive web app, an API server, and a Python service that provides cycle-length estimates.

<p align="center">
  <img src="client/public/veyora-logo-transparent.png" alt="Veyora" width="160" />
</p>

## What it does

- Record and review period dates, flow, symptoms, mood, and pain levels.
- View cycle history and calendar information.
- Get estimated cycle predictions based on available history, with a baseline fallback when there is not enough data or the prediction service is unavailable.
- Manage cycle preferences, reminders, account settings, and data export.
- Install the web client as a progressive web app on supported devices.

## Project structure

| Directory | Purpose |
| --- | --- |
| `client/` | React, TypeScript, and Vite web application |
| `server/` | Express and TypeScript API; stores application data in MongoDB |
| `ml-service/` | Python prediction service and model evaluation code |

The API is available under `/api/v1`. It exposes endpoints for authentication, periods, calendar data, predictions, insights, the symptom journal, settings, and push notifications. Protected endpoints require an authenticated session.

## Requirements

- Node.js and npm
- Python 3.10 or later
- MongoDB (local or hosted)

## Local setup

Run each service in a separate terminal from the repository root.

### 1. Configure environment variables

Copy the template into each service directory:

```powershell
Copy-Item .env.example server\.env
Copy-Item .env.example client\.env
Copy-Item .env.example ml-service\.env
```

Update the values in those files before starting the services:

- Set `MONGODB_URI` to your MongoDB connection string.
- Set `JWT_SECRET` to a unique secret of at least 32 characters.
- Set `ML_SERVICE_API_KEY` in `server\.env` and `ML_API_KEY` in `ml-service\.env` to the same unique value of at least 32 characters. Do not reuse the JWT secret.
- Set the VAPID keys if you want to use push notifications. Generate them with `npx web-push generate-vapid-keys`.
- Keep private keys and database credentials out of client-side variables. Values prefixed with `VITE_` are exposed to the browser.

The placeholder secrets in `.env.example` are for reference only and are rejected by the services.

### 2. Start the ML service

```powershell
Set-Location ml-service
python -m pip install -r requirements.txt
python src/app.py
```

The service listens on `http://127.0.0.1:8000` by default.

### 3. Start the API server

```powershell
Set-Location server
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. To check database connectivity, run `npm run db:test` from `server/`.

### 4. Start the web app

```powershell
Set-Location client
npm install
npm run dev
```

Vite prints the local web address when it starts (usually `http://localhost:5173`).

## Checks

The API tests use a local MongoDB test database. The CycleSync integration tests also call the ML service, so start it with a matching API key in both service configuration files before running the full API suite.

Run these from the relevant directory:

```powershell
# API tests and TypeScript build
Set-Location server
npm test
npm run build

# Python tests
Set-Location ..\ml-service
python -m pytest tests/

# Web app type-check and production build, then lint
Set-Location ..\client
npm run build
npm run lint
```

## Prediction service

The API uses historical cycle information and configured defaults to request a prediction. When there is insufficient history or the ML service cannot be reached, the API can use a baseline estimate instead. The CycleSync model is an experimental option; model selection and evaluation details are documented in [the ML service README](ml-service/README.md).

## Health and privacy

Veyora is a personal tracking tool, not a medical device. Its estimates are not medical advice, a diagnosis, or a contraceptive method. Cycle patterns vary, and predictions may be inaccurate. Consult a qualified healthcare professional for medical concerns.

Use a private MongoDB instance and strong, unique secrets for any deployment. Do not commit `.env` files or store private credentials in the web client.
