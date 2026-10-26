import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICycleSettings extends Document {
  userId: Types.ObjectId;
  defaultCycleLength: number;
  defaultPeriodDuration: number;
  reminderDaysBefore: number;
  remindersEnabled: boolean;
  timezone: string;
  modelPreference: "auto" | "random_forest" | "cycle_sync" | "baseline";
  createdAt: Date;
  updatedAt: Date;
}

const cycleSettingsSchema = new Schema<ICycleSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    defaultCycleLength: {
      type: Number,
      required: true,
      default: 28,
      min: 15,
      max: 60
    },
    defaultPeriodDuration: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 15
    },
    reminderDaysBefore: {
      type: Number,
      required: true,
      default: 2,
      min: 0,
      max: 7
    },
    remindersEnabled: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: "UTC"
    },
    modelPreference: {
      type: String,
      enum: ["auto", "random_forest", "cycle_sync", "baseline"],
      default: "auto"
    }
  },
  {
    timestamps: true
  }
);

export const CycleSettings = mongoose.model<ICycleSettings>(
  "CycleSettings",
  cycleSettingsSchema
);
