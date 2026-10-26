import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISymptomLog extends Document {
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  symptoms: string[];
  mood: string | null;
  painLevel: number; // 0 to 10
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const symptomLogSchema = new Schema<ISymptomLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    symptoms: {
      type: [String],
      default: []
    },
    mood: {
      type: String,
      default: null
    },
    painLevel: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    notes: {
      type: String,
      maxlength: 1000,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

symptomLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const SymptomLog = mongoose.model<ISymptomLog>("SymptomLog", symptomLogSchema);
