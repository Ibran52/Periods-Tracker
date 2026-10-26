import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CycleSettings } from "../src/models/CycleSettings.js";
import { PeriodLog } from "../src/models/PeriodLog.js";
import { SymptomLog } from "../src/models/SymptomLog.js";
import { PredictionSnapshot } from "../src/models/PredictionSnapshot.js";
import { config } from "../src/config/env.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/veyora_test_security";

let tokenA = "";
let userIdA = "";
let tokenB = "";
let userIdB = "";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await SymptomLog.deleteMany({});
  await PredictionSnapshot.deleteMany({});

  // Register User A
  const resA = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "User Alice",
      email: "alice_sec@example.com",
      password: "Password123!",
      defaultCycleLength: 28,
      defaultPeriodDuration: 5
    });
  tokenA = resA.body.data.token;
  userIdA = resA.body.data.user.id;

  // Register User B
  const resB = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "User Bob",
      email: "bob_sec@example.com",
      password: "Password456!",
      defaultCycleLength: 30,
      defaultPeriodDuration: 6
    });
  tokenB = resB.body.data.token;
  userIdB = resB.body.data.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await SymptomLog.deleteMany({});
  await PredictionSnapshot.deleteMany({});
  await disconnectDB();
});

describe("Phase 2: Security & Multi-Tenant Isolation Tests", () => {
  it("passwords are never stored in plain text and never returned in responses", async () => {
    const rawUser = await User.findById(userIdA);
    expect(rawUser?.passwordHash).toBeDefined();
    expect(rawUser?.passwordHash).not.toBe("Password123!");
    expect(rawUser?.passwordHash.startsWith("$2")).toBe(true);

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.password).toBeUndefined();
    expect(meRes.body.data.user.passwordHash).toBeUndefined();
  });

  it("expired or invalid tokens return 401 Unauthorized", async () => {
    const invalidRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.jwt.token");
    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);

    // Expired token (issued with negative expiration)
    const expiredToken = jwt.sign(
      { id: userIdA, email: "alice_sec@example.com" },
      config.jwtSecret,
      { expiresIn: "-1s" }
    );
    const expiredRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body.message).toMatch(/expired|invalid/i);
  });

  it("validation rejects invalid dates: future period starts and end date before start date", async () => {
    // Future date
    const futureRes = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ startDate: "2099-01-01", flowIntensity: "medium" });
    expect(futureRes.status).toBe(400);
    expect(futureRes.body.message).toMatch(/future/i);

    // End date before start date
    const invertedRes = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ startDate: "2026-05-10", endDate: "2026-05-05", flowIntensity: "medium" });
    expect(invertedRes.status).toBe(400);
    expect(invertedRes.body.message).toMatch(/precede/i);
  });

  it("validation rejects negative or out-of-range cycle lengths", async () => {
    const invalidSettings = await request(app)
      .patch("/api/v1/settings")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ defaultCycleLength: -5 });
    expect(invalidSettings.status).toBe(400);

    const invalidSettingsTooHigh = await request(app)
      .patch("/api/v1/settings")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ defaultCycleLength: 100 });
    expect(invalidSettingsTooHigh.status).toBe(400);
  });

  it("User B cannot access or modify User A's period logs", async () => {
    // User A creates a period
    const createRes = await request(app)
      .post("/api/v1/periods")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ startDate: "2026-05-01", endDate: "2026-05-05", flowIntensity: "medium" });
    expect(createRes.status).toBe(201);
    const periodAId = createRes.body.data._id;

    // User B tries to update User A's period
    const updateRes = await request(app)
      .patch(`/api/v1/periods/${periodAId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ notes: "Malicious update by User B" });
    expect(updateRes.status).toBe(404);

    // User B tries to delete User A's period
    const deleteRes = await request(app)
      .delete(`/api/v1/periods/${periodAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(deleteRes.status).toBe(404);

    // User B fetches periods list - should not contain User A's period
    const listRes = await request(app)
      .get("/api/v1/periods")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(listRes.status).toBe(200);
    const found = listRes.body.data.find((p: any) => p._id === periodAId);
    expect(found).toBeUndefined();
  });

  it("User B cannot access or modify User A's symptom logs", async () => {
    // User A logs a symptom
    const logRes = await request(app)
      .post("/api/v1/journal")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ date: "2026-05-02", symptoms: ["cramps"], mood: "tired", painLevel: 5 });
    expect(logRes.status).toBe(200);
    const symptomAId = logRes.body.data._id;

    // User B tries to delete User A's symptom
    const delRes = await request(app)
      .delete(`/api/v1/journal/${symptomAId}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(delRes.status).toBe(404);

    // User B reads symptoms - should not see User A's symptom
    const getRes = await request(app)
      .get("/api/v1/journal")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(getRes.status).toBe(200);
    const found = getRes.body.data.find((s: any) => s._id === symptomAId);
    expect(found).toBeUndefined();
  });

  it("deleting an account removes all associated user records", async () => {
    // Verify User A has period, symptom, and settings data
    const periodsBefore = await PeriodLog.find({ userId: userIdA });
    const symptomsBefore = await SymptomLog.find({ userId: userIdA });
    const settingsBefore = await CycleSettings.findOne({ userId: userIdA });
    expect(periodsBefore.length).toBeGreaterThan(0);
    expect(symptomsBefore.length).toBeGreaterThan(0);
    expect(settingsBefore).not.toBeNull();

    // Delete User A's account
    const delAccountRes = await request(app)
      .delete("/api/v1/settings/account")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(delAccountRes.status).toBe(200);
    expect(delAccountRes.body.success).toBe(true);

    // Verify cascade deletion
    const userAfter = await User.findById(userIdA);
    const periodsAfter = await PeriodLog.find({ userId: userIdA });
    const symptomsAfter = await SymptomLog.find({ userId: userIdA });
    const settingsAfter = await CycleSettings.findOne({ userId: userIdA });

    expect(userAfter).toBeNull();
    expect(periodsAfter.length).toBe(0);
    expect(symptomsAfter.length).toBe(0);
    expect(settingsAfter).toBeNull();

    // User B's data remains untouched
    const userB = await User.findById(userIdB);
    expect(userB).not.toBeNull();
  });
});
