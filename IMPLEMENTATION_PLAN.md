# PeriodPal — Implementation Plan & Engineering Blueprint

## 1. System Overview & Architecture
PeriodPal is a production-oriented, privacy-first menstrual cycle tracking and prediction Progressive Web Application (PWA). It is architected as three decoupled modules:
1. **Frontend Client (`/client`)**: React 18/19 + TypeScript + Vite + Tailwind CSS with dark/light themes, Recharts data visualization, responsive layouts (mobile 320px+, tablet 768px+, desktop 1024px+), and PWA service worker.
2. **Backend API (`/server`)**: Node.js + Express + TypeScript with MongoDB Atlas / Mongoose, JWT / HttpOnly cookie authentication, strict Zod schema validation, rate limiting, Helmet, role/ownership enforcement, scheduled notification jobs, and private communication to the ML service.
3. **Machine Learning Service (`/ml-service`)**: Python + FastAPI + scikit-learn + pandas. Exposes a private authenticated REST API (`/v1/predict`, `/v1/evaluate`, `/v1/health`) using chronological validation, a robust median-cycle baseline fallback, and supervised regression (Random Forest & Gradient Boosting) with calibrated uncertainty intervals.

```
┌────────────────────────────────────────────────────────┐
│                   Responsive Client                    │
│      React + TypeScript + Vite + Tailwind CSS (PWA)     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS (REST API)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express API Server                   │
│         Auth, Validation (Zod), Cycle Logic            │
└──────────────┬───────────────────────────┬─────────────┘
               │ Mongoose                  │ HTTP + API Key (Private)
               ▼                           ▼
┌──────────────────────────────┐ ┌───────────────────────┐
│     MongoDB Database         │ │   FastAPI ML Service  │
│  (Users, PeriodLogs, etc.)   │ │  (Scikit-Learn/Pandas)│
└──────────────────────────────┘ └───────────────────────┘
```

---

## 2. Directory Layout
```
d:/Ai_DOC/College_Study/Diya Project/
├── client/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── manifest.webmanifest
│   │   ├── sw.js
│   │   └── icons/
│   ├── src/
│   │   ├── components/       # Reusable UI primitives (Buttons, Cards, Modals, Inputs)
│   │   ├── features/
│   │   │   ├── auth/         # Login, Register, ForgotPassword, AuthContext
│   │   │   ├── calendar/     # Interactive Monthly Cycle Calendar, Day Details
│   │   │   ├── periods/      # Period CRUD dialogs, quick-log bar
│   │   │   ├── predictions/  # Next-period card, countdown, uncertainty range
│   │   │   ├── insights/     # Cycle variation charts, historical trends (Recharts)
│   │   │   ├── journal/      # Daily symptoms, flow intensity, mood, notes
│   │   │   └── settings/     # Cycle preferences, theme switcher, export/deletion
│   │   ├── hooks/            # Custom hooks (useAuth, useTheme, usePeriods, usePWA)
│   │   ├── services/         # Typed API clients (Axios/Fetch wrapper)
│   │   ├── styles/           # Tailwind design tokens, CSS variables
│   │   ├── types/            # Shared TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── config/           # Database connection, environment config
│   │   ├── controllers/      # Route controllers (auth, periods, predictions, settings)
│   │   ├── middleware/       # Auth guards, ownership check, validation, rate limiting
│   │   ├── models/           # Mongoose schemas (User, PeriodLog, SymptomLog, etc.)
│   │   ├── routes/           # Versioned API routes (/api/v1/...)
│   │   ├── services/         # Business logic (cycle-math, ml-client, reminders)
│   │   ├── jobs/             # Scheduled reminder workers
│   │   ├── types/            # Express request & response types
│   │   └── app.ts            # App entry point
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── ml-service/
│   ├── src/
│   │   ├── app.py            # FastAPI application
│   │   ├── features.py       # Feature extraction without leakage
│   │   ├── baseline.py       # Median cycle baseline calculator
│   │   ├── predict.py        # Model loading & inference
│   │   ├── train.py          # Offline training pipeline (chronological split)
│   │   └── evaluate.py       # Metrics: MAE, interval coverage, calibration
│   ├── models/               # Serialized models (.joblib)
│   ├── tests/                # Pytest suite
│   └── requirements.txt
├── tests/                    # End-to-end Playwright tests
├── .env.example
├── README.md
└── IMPLEMENTATION_PLAN.md
```

---

## 3. Database Schema Design (MongoDB & Mongoose)
Every document belongs to an authenticated user (`userId: Schema.Types.ObjectId`).

1. **User (`users`)**:
   - `_id`: ObjectId
   - `email`: String (lowercase, trimmed, unique, indexed)
   - `passwordHash`: String (bcrypt, min rounds 12)
   - `name`: String
   - `isOnboarded`: Boolean (default: false)
   - `themePreference`: String ("dark" | "light" | "system", default: "system")
   - `createdAt`, `updatedAt`: Timestamps

2. **CycleSettings (`cycle_settings`)**:
   - `userId`: ObjectId (unique index, ref User)
   - `defaultCycleLength`: Number (default: 28, range: 20–45)
   - `defaultPeriodDuration`: Number (default: 5, range: 2–10)
   - `reminderDaysBefore`: Number (default: 2)
   - `remindersEnabled`: Boolean (default: false)

3. **PeriodLog (`period_logs`)**:
   - `userId`: ObjectId (indexed)
   - `startDate`: String (ISO YYYY-MM-DD, strict calendar validation)
   - `endDate`: String | null (ISO YYYY-MM-DD, null if active)
   - `flowIntensity`: String ("light" | "medium" | "heavy" | null)
   - `notes`: String (max 1000 chars)
   - *Index*: `{ userId: 1, startDate: 1 }` (unique compound index prevents duplicate starts)

4. **SymptomLog (`symptom_logs`)**:
   - `userId`: ObjectId (indexed)
   - `date`: String (ISO YYYY-MM-DD)
   - `symptoms`: [String] (e.g. cramps, headache, fatigue, bloating, acne, breast_tenderness)
   - `mood`: String ("happy" | "calm" | "sensitive" | "irritable" | "sad" | "tired")
   - `notes`: String
   - *Index*: `{ userId: 1, date: 1 }` (unique compound index)

5. **PredictionSnapshot (`prediction_snapshots`)**:
   - `userId`: ObjectId (indexed)
   - `predictedStart`: String (YYYY-MM-DD)
   - `earliestStart`: String (YYYY-MM-DD)
   - `latestStart`: String (YYYY-MM-DD)
   - `estimatedCycleLength`: Number
   - `algorithm`: String ("baseline_median" | "random_forest_v1" | "gradient_boost_v1")
   - `cyclesUsed`: Number
   - `confidenceLevel`: Number (estimated coverage)
   - `generatedAt`: Date (default: Date.now)

6. **PushSubscription & NotificationJob (`push_subscriptions`, `notification_jobs`)**:
   - Subscriptions for Web Push, scheduled notification queue, cascade deleted on user account deletion.

---

## 4. Machine Learning Strategy

### 4.1 Prediction Target Formulation
Instead of predicting calendar dates directly, the ML model predicts the scalar **cycle length in days** ($L_i = S_{i+1} - S_i$).
Then, the predicted calendar start date is:
$$\widehat{S}_{next} = S_{last} + \text{round}(\hat{L})$$

### 4.2 Feature Engineering (Zero Data Leakage)
Features are computed solely from completed historical cycles available before the prediction timestamp:
- `last_cycle_length`: Length in days of the most recent completed cycle.
- `mean_last_3`: Arithmetic mean of the last 3 completed cycle lengths.
- `median_last_6`: Median of up to 6 completed cycles.
- `std_last_6`: Standard deviation of the last 6 cycles (measures irregularity).
- `last_period_duration`: Duration in days of the latest bleeding period.
- `cycles_available`: Total count of recorded valid cycles.

### 4.3 Tiered Prediction Logic
- **Tier 0 (< 2 completed cycles)**: Use user-provided default cycle setting (e.g. 28 days) or prompt for onboarding data. Flag as "Preliminary estimate".
- **Tier 1 (2 to 4 completed cycles)**: Transparent personal median cycle baseline. Calibration interval based on user standard deviation or empirical ±3 days fallback.
- **Tier 2 (5+ completed cycles)**: Approved scikit-learn regression model (Random Forest / Gradient Boosting) tested against the baseline. If ML error exceeds the median baseline for that user profile, dynamically fall back to the median baseline.

### 4.4 Evaluation Metrics & Uncertainty Intervals
- **MAE (Mean Absolute Error)**: $\frac{1}{N}\sum |\hat{L}_i - L_i|$.
- **Prediction Interval Coverage**: Percentage of actual starts within $[\text{earliest}, \text{latest}]$.
- **Interval Width**: Evaluated to prevent arbitrarily wide windows (e.g. ±14 days).
- **Evaluation splits**: Chronological / walk-forward testing, never random shuffling across time.

---

## 5. Security & Privacy Architecture
1. **Authentication**: HttpOnly, Secure, SameSite=Lax JWT cookies (or Bearer tokens in Authorization header with local storage fallback).
2. **Strict Authorization**: User ID extracted exclusively from verified auth token. Endpoints check resource ownership (`period.userId.equals(req.user.id)`).
3. **Data Protection**:
   - Sensitive cycle dates and symptoms are never output to application logs.
   - User account deletion triggers an atomic cascading delete across all collections (`User`, `PeriodLog`, `SymptomLog`, `CycleSettings`, `PredictionSnapshot`, `PushSubscription`).
   - One-click GDPR-compliant personal health data export (`GET /api/v1/profile/export`).
4. **Network & Headers**:
   - Helmet for secure HTTP headers.
   - CORS strictly restricted to client origin.
   - Express rate limiting on auth endpoints (max 10 requests / 15 minutes) and API endpoints.
   - Private ML service communication using internal shared secret (`X-ML-API-Key`).
5. **Medical Advice Disclaimer**: Clear, non-intrusive banner and terms stating PeriodPal is a cycle tracker and not a diagnostic or contraceptive tool.

---

## 6. Implementation Milestones

### Phase 1: Foundation & Backend Core
- Initialize Node.js + TypeScript Express backend and setup structure.
- MongoDB connection with Mongoose.
- User authentication (registration, login, logout, password change).
- Input validation using Zod.
- Security middleware (Helmet, CORS, rate limiting, error handler).
- Automated tests (Supertest + Vitest) for auth and security.

### Phase 2: Period & Cycle Management
- Period CRUD endpoints (`/api/v1/periods`).
- Chronological validation, overlapping period guards, incomplete period handlers.
- Cycle calculation service (calculating cycle lengths, variability, averages).
- Symptom and mood journal endpoints (`/api/v1/journal`).

### Phase 3: Machine Learning Service
- Python FastAPI ML service with `/v1/predict` and `/v1/evaluate`.
- Feature engineering module with zero data leakage.
- Median baseline fallback model.
- Random Forest and Gradient Boosting regression models with walk-forward evaluation.
- Integration between Express cycle service and ML service.

### Phase 4: Modern Responsive Frontend UI
- Vite + React + TypeScript + Tailwind CSS setup.
- Design tokens: Deep charcoal, plum, violet accents for dark mode; clean lavender-tinted whites for light mode.
- Dashboard with next period countdown, probability window, quick-log bar.
- Interactive Monthly Calendar distinguishing actual logged days from predicted windows.
- ML Insights page with Recharts visualizations (cycle variability, trendline, error bounds).
- Health Journal (mood, symptoms, flow intensity).
- Settings, dark/light/system theme toggling, data export, account deletion.

### Phase 5: PWA & Reminders
- Web App Manifest (`manifest.webmanifest`) and responsive icons.
- Service worker for offline asset caching.
- Opt-in Web Push notifications for upcoming period reminders.
- Scheduled reminder background worker in Node.js.

### Phase 6: Production Hardening & E2E Testing
- Playwright E2E tests for the full user journey (register -> log periods -> view predictions -> export/delete).
- Responsive testing (mobile 320px, tablet 768px, desktop 1024px+).
- Accessibility checks (WCAG 2.1 AA contrast, keyboard navigation, aria-labels).
- Final security verification and build validations.
