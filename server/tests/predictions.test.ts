import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CycleSettings } from "../src/models/CycleSettings.js";
import { PeriodLog } from "../src/models/PeriodLog.js";
import { PredictionSnapshot } from "../src/models/PredictionSnapshot.js";
import { extractAuthToken } from "./helpers/auth.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/veyora_test_predictions";

let token = "";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await PredictionSnapshot.deleteMany({});

  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Clara Oswald",
      email: "clara@example.com",
      password: "Password123!",
      defaultCycleLength: 28,
      defaultPeriodDuration: 5
    });

  token = extractAuthToken(res);
});

afterAll(async () => {
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await PredictionSnapshot.deleteMany({});
  await disconnectDB();
});

describe("Phase 3: Prediction Engine & ML Insights", () => {
  it("should handle prediction request with no period history gracefully", async () => {
    const res = await request(app)
      .get("/api/v1/predictions/next")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasHistory).toBe(false);
  });

  it("should generate a calibrated prediction once periods are logged", async () => {
    // Log 4 consecutive periods:
    // Period 1: 2026-06-01 to 2026-06-05
    // Period 2: 2026-06-29 to 2026-07-03 (28 days)
    // Period 3: 2026-07-28 to 2026-08-01 (29 days)
    // Period 4: 2026-08-26 to 2026-08-30 (29 days)
    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-06-01", endDate: "2026-06-05" });

    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-06-29", endDate: "2026-07-03" });

    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-07-28", endDate: "2026-08-01" });

    await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-08-26", endDate: "2026-08-30" });

    const res = await request(app)
      .get("/api/v1/predictions/next")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.hasHistory).toBe(true);
    expect(res.body.data.predictedStart).toBeDefined();
    expect(res.body.data.earliestStart).toBeDefined();
    expect(res.body.data.latestStart).toBeDefined();
    expect(res.body.data.ovulationDate).toBeDefined();
    expect(res.body.data.fertileWindow).toBeDefined();
    expect(res.body.data.uncertaintyDays).toBeGreaterThanOrEqual(1.5);
  });

  it("should return cycle variations and ML evaluation metrics on /insights", async () => {
    const res = await request(app)
      .get("/api/v1/predictions/insights")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats.completedCycles).toBe(3);
    expect(res.body.data.mlEvaluation.approved_model).toBe("random_forest");
    expect(res.body.data.mlEvaluation.baseline_mae).toBeGreaterThan(0);
    expect(res.body.data.mlEvaluation.approved_mae).toBeLessThan(
      res.body.data.mlEvaluation.baseline_mae
    );
  });
});
