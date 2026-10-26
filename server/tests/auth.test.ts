import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CycleSettings } from "../src/models/CycleSettings.js";
import { extractAuthToken } from "./helpers/auth.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/veyora_test";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await connectDB(TEST_DB_URI);
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await CycleSettings.deleteMany({});
  await disconnectDB();
});

describe("Phase 1: API Foundation & Authentication", () => {
  it("should respond with 200 OK on /api/v1/health", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("veyora-api");
  });

  const testUser = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "Password123!",
    defaultCycleLength: 29,
    defaultPeriodDuration: 5
  };

  let authToken = "";

  it("should register a new user and create default cycle settings", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.name).toBe(testUser.name);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.cycleSettings.defaultCycleLength).toBe(29);
    expect(res.body.data.token).toBeUndefined();
    authToken = extractAuthToken(res);
  });

  it("should reject duplicate email registration with 409", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should reject registration with invalid email or short password with 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "A",
        email: "not-an-email",
        password: "short"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it("should log in with valid credentials and set an HttpOnly auth cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.token).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("should reject login with wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: "WrongPassword"
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject unauthorized request to /api/v1/auth/me", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("should access /api/v1/auth/me with Bearer token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.cycleSettings.defaultCycleLength).toBe(29);
  });

  it("should update profile theme preference and onboard status", async () => {
    const res = await request(app)
      .patch("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        themePreference: "dark",
        isOnboarded: true
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.themePreference).toBe("dark");
    expect(res.body.data.user.isOnboarded).toBe(true);
  });

  it("should change user password and allow login with new password", async () => {
    const changeRes = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword: "BrandNewPassword123!"
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Old password should now fail
    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });
    expect(oldLogin.status).toBe(401);

    // New password should succeed
    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email,
        password: "BrandNewPassword123!"
      });
    expect(newLogin.status).toBe(200);
  });
});
