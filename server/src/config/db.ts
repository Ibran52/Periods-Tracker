import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDB(uriOverride?: string): Promise<typeof mongoose> {
  const mongoUri = uriOverride || config.mongoUri;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    return conn;
  } catch (error) {
    console.error("MongoDB connection failed.");
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
