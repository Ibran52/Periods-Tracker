# Veyora 🦋

<p align="center">
  <img src="client/public/veyora-logo-transparent.png" alt="Veyora Logo" width="180" />
</p>

> **Production-Ready Menstrual Cycle Tracking & Machine Learning Prediction PWA**  
> *React 19 + TypeScript + Express + MongoDB Atlas + Python FastAPI ML Microservice*

---

## ⚠️ Important Disclaimer
**Veyora is not a medical device or contraceptive tool.** Cycle predictions and estimates provided by Veyora are statistical and algorithmic approximations intended exclusively for personal tracking and wellbeing, not for family planning, contraception, or medical diagnoses.

---

## 🏗️ System Architecture

Veyora operates as a 3-tier distributed microservice architecture designed for security, responsiveness, and graceful degradation:

```
┌────────────────────────────────────────────────────────┐
│                   React 19 PWA Client                  │
│       Vite · Tailwind CSS · Lucide · Recharts · SW     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST (JWT Auth)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Express.js API Server                 │
│         TypeScript · Mongoose · Helmet · RateLimit     │
│   Cache-Control: private, no-store (Health Data Guard) │
└─────────────┬────────────────────────────┬─────────────┘
              │ MongoDB Query              │ Internal mTLS / Header Auth
              │ Scoped by userId           │ (AbortSignal Timeout: 1s)
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│      MongoDB Database    │  │    Python ML Service     │
│  Users, Periods, Journal,│  │   FastAPI · scikit-learn  │
│  Predictions, Push Subs  │  │   Random Forest · Baseline│
└──────────────────────────┘  └──────────────────────────┘
```

1. **Frontend (PWA)**: Mobile-first responsive single-page application installable on iOS, Android, and Desktop. Service worker caches only safe static assets; authenticated health APIs strictly bypass service worker caching.
2. **Backend API**: Centralized TypeScript REST API with rate limiting, Zod validation, Bcrypt 12-round password hashing, HttpOnly cookies, and strict multi-tenant database scoping (`userId`).
3. **Database**: MongoDB with strict relational ownership, unique start date indexes, and cascade deletion across all user data collections.
4. **Machine Learning Microservice**: Python FastAPI service running behind internal authentication (`X-ML-API-Key`). Implements chronological walk-forward cross-validation comparing Random Forest and Gradient Boosting against baseline median. Automatically falls back to local median estimates if offline or timing out.

---

## 🔑 Environment Variables Reference

Copy `.env.example` to `.env` in the project root or respective directories:

```ini
# Backend API (/server/.env)
NODE_ENV=development
PORT=5000
MONGODB_URI=
JWT_SECRET=replace_with_a_secure_random_string_min_32_characters_long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=

# Internal ML Service connection
ML_SERVICE_URL=
ML_SERVICE_API_KEY=veyora-internal-ml-key

# Web Push Notifications (VAPID)
# Generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# ML Service (/ml-service/.env)
ML_HOST=127.0.0.1
ML_PORT=8000
ML_API_KEY=veyora-internal-ml-key
ML_MODEL_DIR=./models

# Frontend Client (/client/.env)
VITE_API_BASE_URL=
```

---

## 🚀 Local Setup & Execution

### Prerequisites
- **Node.js**: v20+
- **Python**: v3.11+
- **MongoDB**: Local MongoDB instance running on `localhost:27017` or MongoDB Atlas URI

### 1. Database Connectivity Test
```powershell
cd server
npm run db:test
```

### 2. Start the Machine Learning Microservice
```powershell
cd ml-service
python -m pip install -r requirements.txt
python src/app.py
# → Running on http://127.0.0.1:8000
```

### 3. Start the Express Backend Server
```powershell
cd server
npm install
npm run dev
# → Running on http://localhost:5000
```

### 4. Start the Frontend Web Application
```powershell
cd client
npm install
npm run dev
# → Running on http://localhost:5173
```

---

## 📡 REST API Catalog

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Service health and timestamp status |
| `POST` | `/api/v1/auth/register` | Public | Register new user account + default cycle settings |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user and issue JWT |
| `POST` | `/api/v1/auth/logout` | Public | Invalidate HttpOnly cookie session |
| `GET` | `/api/v1/auth/me` | Bearer | Retrieve authenticated user profile |
| `PATCH`| `/api/v1/auth/profile` | Bearer | Update display name and theme preference |
| `POST` | `/api/v1/auth/change-password` | Bearer | Verify current password and update to new password |
| `GET` | `/api/v1/periods` | Bearer | List user periods in chronological order |
| `POST` | `/api/v1/periods` | Bearer | Record a period (rejects future dates and inverted spans) |
| `PATCH`| `/api/v1/periods/:id` | Bearer | Update flow intensity, dates, or notes |
| `DELETE`| `/api/v1/periods/:id` | Bearer | Remove individual period record |
| `GET` | `/api/v1/periods/calendar` | Bearer | Monthly calendar view with prediction overlays |
| `GET` | `/api/v1/predictions/next` | Bearer | Dynamic ML/baseline prediction with uncertainty window |
| `GET` | `/api/v1/predictions/insights`| Bearer | Historical metrics, model evaluation, and snapshots |
| `GET` | `/api/v1/journal` | Bearer | Retrieve daily symptom and mood logs |
| `POST` | `/api/v1/journal` | Bearer | Upsert daily symptom, mood, and pain level entry |
| `DELETE`| `/api/v1/journal/:id` | Bearer | Delete symptom journal record |
| `GET` | `/api/v1/settings` | Bearer | Get cycle length, period duration, reminder settings |
| `PATCH`| `/api/v1/settings` | Bearer | Update cycle configuration and notification preferences |
| `GET` | `/api/v1/settings/export` | Bearer | GDPR full JSON data export |
| `DELETE`| `/api/v1/settings/account`| Bearer | Complete cascading delete of user account & all data |
| `GET` | `/api/v1/notifications/vapid-key` | Bearer | Retrieve public VAPID key |
| `POST` | `/api/v1/notifications/subscribe` | Bearer | Register browser push notification subscription |
| `POST` | `/api/v1/notifications/unsubscribe` | Bearer | Unsubscribe push notification endpoint |
| `POST` | `/api/v1/notifications/test` | Bearer | Trigger test notification delivery |

---

## 🗄️ Database Design

All collections enforce strict multi-tenant isolation through indexed `userId: ObjectId` foreign keys:

- **`User`**: `name`, `email` (unique index), `passwordHash` (bcrypt), `themePreference` (`light`|`dark`|`system`), `isOnboarded`.
- **`CycleSettings`**: `userId` (unique), `defaultCycleLength` (15–60), `defaultPeriodDuration` (1–15), `reminderDaysBefore` (0–7), `remindersEnabled`, `timezone`.
- **`PeriodLog`**: `userId`, `startDate` (YYYY-MM-DD), `endDate`, `flowIntensity` (`light`|`medium`|`heavy`), `notes`. Unique compound index on `{ userId, startDate }`.
- **`SymptomLog`**: `userId`, `date`, `symptoms: string[]`, `mood: string`, `painLevel` (0–10), `notes`. Unique compound index on `{ userId, date }`.
- **`PredictionSnapshot`**: `userId`, `predictedStart`, `earliestStart`, `latestStart`, `predictedCycleLength`, `method`, `modelVersion`, `confidence`, `generatedAt`.
- **`PushSubscription`**: `userId`, `endpoint` (unique), `keys: { p256dh, auth }`, `timezone`.

---

## 🤖 Machine Learning Training & Evaluation Pipeline

The ML service trains and benchmarks regression models without data leakage:

```powershell
cd ml-service
python src/train.py
```

### Evaluation Protocol
- **Split**: Chronological walk-forward split (train on historical user cycles, evaluate on unseen future cycles).
- **Features**: Lagged cycle lengths (last 1, mean of last 3, median of last 6, standard deviation of last 6), period duration, cycle index.
- **Model Comparison**:
  - Baseline (Median of last 6): `2.27` days MAE
  - Random Forest Regressor: `1.91` days MAE (Approved)
  - Gradient Boosting Regressor: `1.92` days MAE
- **Calibrated Uncertainty**: Evaluates empirical prediction interval coverage (80% coverage within ±2.9 days).

---

## 🧪 Comprehensive Test Suite

```powershell
# 1. Run all Backend Vitest Tests (47 tests across 6 suites)
cd server
npm test

# 2. Run Python ML Tests (Pytest)
cd ml-service
python -m pytest tests/ -v

# 3. Build & Typecheck Frontend
cd client
npm run build

# 4. Lint Frontend
cd client
npm run lint
```

---

## 🌐 Browser Capabilities & Limitations

1. **Web Push on iOS**: Safari on iOS 16.4+ supports Web Push only when the PWA is added to the home screen ("Add to Home Screen"). In regular browser tabs, `Notification` API is restricted.
2. **Offline Mode**: Static assets (HTML, CSS, JS, manifest, fonts) are cached by the service worker. Authenticated health endpoints deliberately bypass offline caches to prevent sensitive medical data disclosure on shared or stolen devices.
3. **Private Health Data Storage**: Period records are stored server-side in MongoDB Atlas; sensitive data is never cached in public browser caches (`Cache-Control: private, no-store`).

---

## 🚢 Production Deployment Instructions

### Docker Deployment
```dockerfile
# Multi-stage Docker deployment for Express API + Python ML + Nginx Reverse Proxy
docker compose up -d --build
```

### Standard Linux VM (Ubuntu / Debian + PM2 + systemd)
1. **Express Server**:
   ```bash
   cd server
   npm ci
   npm run build
   pm2 start dist/app.js --name veyora-api
   ```
2. **FastAPI ML Service**:
   ```bash
   cd ml-service
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pm2 start "uvicorn src.app:app --host 127.0.0.1 --port 8000" --name veyora-ml
   ```
3. **Frontend Nginx Configuration**:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name veyora.yourdomain.com;

       root /var/www/veyora/client/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
