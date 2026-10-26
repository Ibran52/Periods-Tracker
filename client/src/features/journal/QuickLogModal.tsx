import React, { useState } from "react";
import { journalApi } from "../../services/api";
import { X, Loader2, Check } from "lucide-react";

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
}

const WELL_BEING_OPTIONS = [
  { id: "everything_fine", label: "Everything is fine", emoji: "😊" },
  { id: "abdominal_pain", label: "Abdominal pain", emoji: "🩹" },
  { id: "fatigue", label: "Fatigue", emoji: "💤" },
  { id: "increased_appetite", label: "Increased appetite", emoji: "🍲" },
  { id: "insomnia", label: "Insomnia", emoji: "🌙" },
  { id: "chills", label: "Chills", emoji: "❄️" },
  { id: "headache", label: "Headache", emoji: "💆" },
  { id: "bloating", label: "Bloating", emoji: "🎈" },
  { id: "acne", label: "Acne", emoji: "✨" },
  { id: "breast_tenderness", label: "Breast tenderness", emoji: "🩺" },
  { id: "cramps", label: "Cramps", emoji: "⚡" },
  { id: "nausea", label: "Nausea", emoji: "🤢" },
];

const MOOD_OPTIONS = [
  { id: "happy", label: "Happy", emoji: "😃" },
  { id: "calm", label: "Calm", emoji: "😌" },
  { id: "irritated", label: "Irritated", emoji: "😠" },
  { id: "sad", label: "Sad", emoji: "😢" },
  { id: "tired", label: "Tired", emoji: "😴" },
  { id: "confident", label: "Confident", emoji: "😎" },
  { id: "loving", label: "Loving", emoji: "😍" },
  { id: "anxious", label: "Anxious", emoji: "😰" },
  { id: "moody", label: "Moody", emoji: "😐" },
  { id: "zen", label: "Zen", emoji: "🧘" },
];

export function QuickLogModal({
  isOpen,
  onClose,
  onSuccess,
  defaultDate
}: QuickLogModalProps) {
  const today = defaultDate || new Date().toISOString().split("T")[0];
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [painLevel, setPainLevel] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      await journalApi.log({
        date: today,
        symptoms: selectedSymptoms,
        mood: selectedMood || null,
        painLevel,
        notes: "",
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to save symptoms");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm transition-all animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-color)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Log Your Symptoms
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Tracking daily signals helps refine your wellness insights
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: "var(--text-secondary)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* General Well-being */}
          <div>
            <h3 className="text-sm font-bold mb-3 tracking-wide" style={{ color: "var(--text-primary)" }}>
              General Well-being
            </h3>
            <div className="flex flex-wrap gap-2">
              {WELL_BEING_OPTIONS.map((item) => {
                const isSelected = selectedSymptoms.includes(item.label);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSymptom(item.label)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                      isSelected
                        ? "bg-[#503750] text-white border-[#503750] shadow-sm transform scale-[1.02]"
                        : "bg-white hover:bg-[#FAF5F7] border-[#EFE4EC] text-[#302337]"
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood */}
          <div>
            <h3 className="text-sm font-bold mb-3 tracking-wide" style={{ color: "var(--text-primary)" }}>
              Mood
            </h3>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((item) => {
                const isSelected = selectedMood === item.label;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMood(isSelected ? "" : item.label)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                      isSelected
                        ? "bg-[#503750] text-white border-[#503750] shadow-sm transform scale-[1.02]"
                        : "bg-white hover:bg-[#FAF5F7] border-[#EFE4EC] text-[#302337]"
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pain Rating Slider */}
          <div className="p-4 rounded-2xl bg-[#FAF5F7] border border-[#EFE4EC]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                Cramp / Pain Intensity
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-[#503750] border border-[#EFE4EC]">
                {painLevel}/10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={painLevel}
              onChange={(e) => setPainLevel(Number(e.target.value))}
              className="w-full accent-[#503750] h-1.5 bg-[#EBDDE7] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] mt-1 text-[#8A7890]">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Bottom Action Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || success}
            className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving your symptoms…
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                Symptoms Logged!
              </>
            ) : (
              "Log Symptoms"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
