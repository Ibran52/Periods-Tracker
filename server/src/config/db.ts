import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDB(uri = config.mongoUri): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(uri);
    return conn;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
