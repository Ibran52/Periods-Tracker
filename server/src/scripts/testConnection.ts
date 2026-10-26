import mongoose from "mongoose";
import { config } from "../config/env.js";

async function testConnection(): Promise<void> {
  const uri = process.env.MONGODB_URI || config.mongoUri;
  console.log(`Attempting connection to MongoDB at: ${uri.replace(/\/\/.*@/, "//<credentials>@")}`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });

    const admin = conn.connection.db?.admin();
    const pingResult = await admin?.ping();

    console.log("-----------------------------------------");
    console.log(" MongoDB Connection Test: SUCCESS");
    console.log(` Database:   ${conn.connection.name}`);
    console.log(` Host:       ${conn.connection.host}`);
    console.log(` Port:       ${conn.connection.port}`);
    console.log(` State:      ${conn.connection.readyState === 1 ? "Connected (ready)" : "Connecting"}`);
    console.log(` Ping:       ${JSON.stringify(pingResult)}`);
    console.log("-----------------------------------------");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("-----------------------------------------");
    console.error(" MongoDB Connection Test: FAILED");
    console.error(` Error:      ${error.message}`);
    console.error("-----------------------------------------");
    process.exit(1);
  }
}

testConnection();
