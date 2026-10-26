import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPredictionSnapshot extends Document {
  userId: Types.ObjectId;
  predictedStart: string;
  earliestStart: string;
  latestStart: string;
  predictedCycleLength: number;
  method: string;
  modelVersion: string;
  cyclesUsed: number;
  confidence: string;
  generatedAt: Date;
}

const predictionSnapshotSchema = new Schema<IPredictionSnapshot>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  predictedStart: { type: String, required: true },
  earliestStart: { type: String, required: true },
  latestStart: { type: String, required: true },
  predictedCycleLength: { type: Number, required: true },
  method: { type: String, required: true },
  modelVersion: { type: String, required: true },
  cyclesUsed: { type: Number, required: true },
  confidence: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now }
});

export const PredictionSnapshot = mongoose.model<IPredictionSnapshot>(
  "PredictionSnapshot",
  predictionSnapshotSchema
);
