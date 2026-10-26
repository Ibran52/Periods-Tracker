import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CycleSettings } from "../src/models/CycleSettings.js";
import { PeriodLog } from "../src/models/PeriodLog.js";
import { SymptomLog } from "../src/models/SymptomLog.js";
import { extractAuthToken } from "./helpers/auth.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/veyora_test_periods";

let token = "";
let userId = "";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await SymptomLog.deleteMany({});

  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Alice Smith",
      email: "alice@example.com",
      password: "Password123!",
      defaultCycleLength: 28,
      defaultPeriodDuration: 5
    });

  token = extractAuthToken(res);
  userId = res.body.data.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await SymptomLog.deleteMany({});
  await disconnectDB();
});

describe("Phase 2: Period & Cycle Management API", () => {
  it("should record completed menstrual periods", async () => {
    // 3 historical cycles:
    // Cycle 1: 2026-07-01 to 2026-07-05 (28 days to next)
    // Cycle 2: 2026-07-29 to 2026-08-02 (29 days to next)
    // Cycle 3: 2026-08-27 to 2026-08-31 (30 days to next)
    // Cycle 4: 2026-09-26 to 2026-09-30
    const p1 = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-07-01", endDate: "2026-07-05", flowIntensity: "medium" });
    expect(p1.status).toBe(201);

    const p2 = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-07-29", endDate: "2026-08-02", flowIntensity: "heavy" });
    expect(p2.status).toBe(201);

    const p3 = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-08-27", endDate: "2026-08-31", flowIntensity: "medium" });
    expect(p3.status).toBe(201);

    const p4 = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-09-26", endDate: "2026-09-30", flowIntensity: "light" });
    expect(p4.status).toBe(201);
  });

  it("should reject an invalid end date earlier than start date", async () => {
    const res = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-10-15", endDate: "2026-10-10" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject duplicate period start date for same user", async () => {
    const res = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-07-01" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should list all periods sorted chronologically", async () => {
    const res = await request(app)
      .get("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
    expect(res.body.data[0].startDate).toBe("2026-07-01");
    expect(res.body.data[3].startDate).toBe("2026-09-26");
  });

  it("should edit an existing period record and reject invalid date updates", async () => {
    const listRes = await request(app)
      .get("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`);
    const periodToEdit = listRes.body.data[3]; // 2026-09-26

    // Valid update
    const updateRes = await request(app)
      .patch(`/api/v1/periods/${periodToEdit._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ flowIntensity: "heavy", notes: "Updated flow and symptoms notes" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.flowIntensity).toBe("heavy");
    expect(updateRes.body.data.notes).toBe("Updated flow and symptoms notes");

    // Invalid update: end date before start date
    const invalidUpdateRes = await request(app)
      .patch(`/api/v1/periods/${periodToEdit._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ endDate: "2026-09-20" });

    expect(invalidUpdateRes.status).toBe(400);
    expect(invalidUpdateRes.body.message).toMatch(/precede/i);
  });

  it("should delete an individual period record", async () => {
    // Create a temporary period to delete
    const tempRes = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-05-15", endDate: "2026-05-19", flowIntensity: "light" });
    expect(tempRes.status).toBe(201);
    const tempId = tempRes.body.data._id;

    const delRes = await request(app)
      .delete(`/api/v1/periods/${tempId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify it is gone
    const verifyRes = await request(app)
      .get("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`);
    const found = verifyRes.body.data.find((p: any) => p._id === tempId);
    expect(found).toBeUndefined();
  });

  it("should compute accurate cycle statistics and predict next period window", async () => {
    const res = await request(app)
      .get("/api/v1/periods/calendar?month=2026-10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { stats, prediction } = res.body.data;

    // Cycle lengths: 28 days (07-01 to 07-29), 29 days (07-29 to 08-27), 30 days (08-27 to 09-26)
    expect(stats.completedCycles).toBe(3);
    expect(stats.medianCycleLength).toBe(29);
    expect(stats.averageCycleLength).toBe(29);
    expect(stats.lastCycleLength).toBe(30);

    // Latest period: 2026-09-26. Next predicted: 2026-09-26 + 29 days = 2026-10-25
    expect(prediction).toBeDefined();
    expect(prediction.predictedStart).toBe("2026-10-25");
    expect(prediction.ovulationDate).toBe("2026-10-11"); // 14 days before
    expect(prediction.fertileWindow.start).toBe("2026-10-06");
    expect(prediction.fertileWindow.end).toBe("2026-10-11");
  });

  it("should log daily symptoms and retrieve them", async () => {
    const logRes = await request(app)
      .post("/api/v1/journal")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-09-26",
        symptoms: ["cramps", "fatigue"],
        mood: "tired",
        painLevel: 4,
        notes: "Mild lower abdomen cramps on day 1"
      });

    expect(logRes.status).toBe(200);
    expect(logRes.body.data.painLevel).toBe(4);
    expect(logRes.body.data.symptoms).toContain("cramps");

    const getRes = await request(app)
      .get("/api/v1/journal?month=2026-09")
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.count).toBe(1);
    expect(getRes.body.data[0].notes).toBe("Mild lower abdomen cramps on day 1");
  });

  it("should export full user health data under GDPR compliance", async () => {
    const res = await request(app)
      .get("/api/v1/settings/export")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.periods.length).toBe(4);
    expect(res.body.symptoms.length).toBe(1);
    expect(res.body.cycleStatistics.medianCycleLength).toBe(29);
  });

  it("should delete account and cascade delete all user-owned data", async () => {
    const delRes = await request(app)
      .delete("/api/v1/settings/account")
      .set("Authorization", `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Confirm database records are deleted
    const usersCount = await User.countDocuments({ _id: userId });
    const periodsCount = await PeriodLog.countDocuments({ userId });
    const symptomsCount = await SymptomLog.countDocuments({ userId });
    const settingsCount = await CycleSettings.countDocuments({ userId });

    expect(usersCount).toBe(0);
    expect(periodsCount).toBe(0);
    expect(symptomsCount).toBe(0);
    expect(settingsCount).toBe(0);
  });
});
