import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CycleSettings } from "../src/models/CycleSettings.js";
import { PeriodLog } from "../src/models/PeriodLog.js";
import { PushSubscription } from "../src/models/PushSubscription.js";
import { runScheduledReminders } from "../src/services/notificationService.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/veyora_test_notifications";

let token = "";
let userId = "";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await PushSubscription.deleteMany({});

  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      name: "Nora WebPush",
      email: "nora_push@example.com",
      password: "Password123!",
      defaultCycleLength: 28,
      defaultPeriodDuration: 5
    });

  token = res.body.data.token;
  userId = res.body.data.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await PeriodLog.deleteMany({});
  await PushSubscription.deleteMany({});
  await disconnectDB();
});

describe("Phase 6: Web Push Notifications & Scheduled Reminder Engine", () => {
  it("verifies Cache-Control: no-store header on authenticated health endpoints", async () => {
    const res = await request(app)
      .get("/api/v1/periods")
      .set("Authorization", `Bearer ${token}`);

    expect(res.headers["cache-control"]).toMatch(/no-store/);
    expect(res.headers["cache-control"]).toMatch(/private/);
  });

  it("fetches VAPID public key endpoint", async () => {
    const res = await request(app)
      .get("/api/v1/notifications/vapid-key")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("publicKey");
  });

  it("registers a push notification subscription", async () => {
    const subPayload = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test_sub_endpoint_123",
      keys: {
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0A3CwtstcC6IgY4SrRBDn-JCDY6CQKiyalAwhz100GwM",
        auth: "tBHItJI5svbpez7KI4CCXg"
      },
      timezone: "America/New_York"
    };

    const res = await request(app)
      .post("/api/v1/notifications/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send(subPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const doc = await PushSubscription.findOne({ userId });
    expect(doc).not.toBeNull();
    expect(doc?.endpoint).toBe(subPayload.endpoint);
  });

  it("handles duplicate subscription gracefully via upsert", async () => {
    const subPayload = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test_sub_endpoint_123",
      keys: {
        p256dh: "updated_key_data",
        auth: "updated_auth_data"
      },
      timezone: "Europe/London"
    };

    const res = await request(app)
      .post("/api/v1/notifications/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send(subPayload);

    expect(res.status).toBe(201);
    const count = await PushSubscription.countDocuments({ endpoint: subPayload.endpoint });
    expect(count).toBe(1); // No duplicates
  });

  it("sends a test notification to registered subscriptions", async () => {
    const res = await request(app)
      .post("/api/v1/notifications/test")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("evaluates scheduled reminders and triggers when due", async () => {
    // Enable reminders in settings (2 days before)
    await CycleSettings.findOneAndUpdate(
      { userId },
      { remindersEnabled: true, reminderDaysBefore: 2, defaultCycleLength: 28 }
    );

    // Period started on 2026-09-01
    // Next predicted: 2026-09-01 + 28d = 2026-09-29
    // Reminder due: 2 days before = 2026-09-27
    await PeriodLog.create({
      userId,
      startDate: "2026-09-01",
      endDate: "2026-09-05"
    });

    // Reference date = 2026-09-27 (day reminder is due)
    const dueCount = await runScheduledReminders(new Date(Date.UTC(2026, 8, 27)));
    expect(dueCount).toBeGreaterThanOrEqual(1);

    // Reference date = 2026-09-20 (not due yet)
    const notDueCount = await runScheduledReminders(new Date(Date.UTC(2026, 8, 20)));
    expect(notDueCount).toBe(0);
  });

  it("cancels reminders if the user records their period early", async () => {
    // User logs period on 2026-09-28 (before the predicted 2026-09-29)
    await PeriodLog.create({
      userId,
      startDate: "2026-09-28",
      endDate: "2026-10-02"
    });

    // Reminder for old cycle should no longer trigger
    const count = await runScheduledReminders(new Date(Date.UTC(2026, 8, 27)));
    expect(count).toBe(0);
  });

  it("unsubscribes push notification endpoint", async () => {
    const res = await request(app)
      .post("/api/v1/notifications/unsubscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ endpoint: "https://fcm.googleapis.com/fcm/send/test_sub_endpoint_123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const doc = await PushSubscription.findOne({ endpoint: "https://fcm.googleapis.com/fcm/send/test_sub_endpoint_123" });
    expect(doc).toBeNull();
  });
});
