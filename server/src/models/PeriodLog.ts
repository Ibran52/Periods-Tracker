import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPeriodLog extends Document {
  userId: Types.ObjectId;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
  flowIntensity: "light" | "medium" | "heavy" | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const periodLogSchema = new Schema<IPeriodLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    endDate: {
      type: String,
      default: null,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    flowIntensity: {
      type: String,
      enum: ["light", "medium", "heavy", null],
      default: null
    },
    notes: {
      type: String,
      maxlength: 2000,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate period start dates for the same user
periodLogSchema.index({ userId: 1, startDate: 1 }, { unique: true });

export const PeriodLog = mongoose.model<IPeriodLog>("PeriodLog", periodLogSchema);
