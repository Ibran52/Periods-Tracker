import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CycleSettings } from "../src/models/CycleSettings.js";
import { PeriodLog } from "../src/models/PeriodLog.js";
import { PredictionSnapshot } from "../src/models/PredictionSnapshot.js";
import { config } from "../src/config/env.js";
import { extractAuthToken } from "./helpers/auth.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/veyora_test_cyclesync_e2e";

let userToken = "";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await PredictionSnapshot.deleteMany({});

  const regRes = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Synthetic Test User",
      email: "synthetic_cyclesync_user@example.com",
      password: "TestPassword123!",
      defaultCycleLength: 28,
      defaultPeriodDuration: 5
    });

  userToken = extractAuthToken(regRes);
});

afterAll(async () => {
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await PredictionSnapshot.deleteMany({});
  await disconnectDB();
});

describe("CycleSync LSTM End-to-End Backend Verification", () => {
  it("1. Successfully executes CycleSync LSTM with 3 completed cycle intervals", async () => {
    // Set user preference to cycle_sync
    await request(app)
      .patch("/api/v1/settings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ modelPreference: "cycle_sync" });

    // 4 periods -> 3 completed intervals (28, 29, 28 days)
    await PeriodLog.deleteMany({});
    const periods = [
      { startDate: "2026-01-01", endDate: "2026-01-05" },
      { startDate: "2026-01-29", endDate: "2026-02-02" }, // 28d
      { startDate: "2026-02-27", endDate: "2026-03-03" }, // 29d
      { startDate: "2026-03-27", endDate: "2026-03-31" }  // 28d
    ];
    for (const p of periods) {
      await request(app)
        .post("/api/v1/periods")
        .set("Authorization", `Bearer ${userToken}`)
        .send(p);
    }

    const res = await request(app)
      .get("/api/v1/predictions/next")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    // Check CycleSync LSTM output values
    expect(data.hasHistory).toBe(true);
    expect(data.method).toBe("lstm_cycle_sync");
    expect(data.modelVersion).toBe("cycle-sync-lstm-v1");
    expect(data.isPersonalizedML).toBe(true);
    expect(data.mlStatus).toBe("active");
    expect(data.modelPreference).toBe("cycle_sync");
    expect(data.predictedCycleLength).toBeCloseTo(29.8, 1);
    expect(data.uncertaintyDays).toBe(2.5);
    expect(data.stats.completedCycles).toBe(3);
    expect(data.predictedStart).toBeDefined();
    expect(data.ovulationDate).toBeDefined();
    expect(data.fertileWindow).toBeDefined();
  });

  it("2. Falls back gracefully with insufficient history (< 3 cycles)", async () => {
    await PeriodLog.deleteMany({});
    // Only 2 periods -> 1 completed interval (28 days)
    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ startDate: "2026-01-01", endDate: "2026-01-05" });
    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ startDate: "2026-01-29", endDate: "2026-02-02" });

    const res = await request(app)
      .get("/api/v1/predictions/next")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.hasHistory).toBe(true);
    expect(data.method).toBe("historical_median");
    expect(data.isPersonalizedML).toBe(false);
    expect(data.mlStatus).toBe("fallback");
    expect(data.fallbackReason).toBe("insufficient_history");
  });

  it("3. Falls back gracefully if ML service is unavailable", async () => {
    // Log 4 periods
    await PeriodLog.deleteMany({});
    const periods = [
      { startDate: "2026-01-01", endDate: "2026-01-05" },
      { startDate: "2026-01-29", endDate: "2026-02-02" },
      { startDate: "2026-02-27", endDate: "2026-03-03" },
      { startDate: "2026-03-27", endDate: "2026-03-31" }
    ];
    for (const p of periods) {
      await request(app)
        .post("/api/v1/periods")
        .set("Authorization", `Bearer ${userToken}`)
        .send(p);
    }

    const origUrl = config.mlServiceUrl;
    try {
      // Point to unreachable port
      config.mlServiceUrl = "http://127.0.0.1:9999";

      const res = await request(app)
        .get("/api/v1/predictions/next")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.hasHistory).toBe(true);
      expect(data.mlStatus).toBe("fallback");
      expect(data.fallbackReason).toBe("unavailable");
      expect(data.isPersonalizedML).toBe(false);
      expect(data.predictedCycleLength).toBeDefined();
    } finally {
      config.mlServiceUrl = origUrl;
    }
  });

  it("4. Falls back gracefully if ML service API key is rejected", async () => {
    const origKey = config.mlServiceApiKey;
    try {
      // Use wrong API key
      config.mlServiceApiKey = "invalid_api_key_test";

      const res = await request(app)
        .get("/api/v1/predictions/next")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.hasHistory).toBe(true);
      expect(data.mlStatus).toBe("fallback");
      expect(data.fallbackReason).toBe("error");
      expect(data.isPersonalizedML).toBe(false);
      expect(data.predictedCycleLength).toBeDefined();
    } finally {
      config.mlServiceApiKey = origKey;
    }
  });

  it("5. Random Forest model preference works when selected", async () => {
    await request(app)
      .patch("/api/v1/settings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ modelPreference: "random_forest" });

    // Add 5th period to ensure >= 4 completed cycles for Random Forest
    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ startDate: "2026-04-25", endDate: "2026-04-29" });

    const res = await request(app)
      .get("/api/v1/predictions/next")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.hasHistory).toBe(true);
    expect(data.method).toBe("personalized_ml");
    expect(data.modelVersion).toBe("veyora-ml-v1");
    expect(data.isPersonalizedML).toBe(true);
    expect(data.mlStatus).toBe("active");
  });
});
