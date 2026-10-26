import React, { useEffect, useState, useCallback } from "react";
import { journalApi } from "../../services/api";
import type { SymptomLog } from "../../types";
import { Plus, ChevronLeft, ChevronRight, Loader2, X, Trash2, Calendar, Smile } from "lucide-react";

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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

interface LogFormProps {
  initial?: SymptomLog;
  date: string;
  onSave: () => void;
  onClose: () => void;
}

function LogForm({ initial, date, onSave, onClose }: LogFormProps) {
  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms || []);
  const [mood, setMood] = useState<string>(initial?.mood || "");
  const [pain, setPain] = useState(initial?.painLevel ?? 0);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleSymptom = (label: string) => {
    setSymptoms((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await journalApi.log({ date, symptoms, mood: mood || null, painLevel: pain, notes });
      onSave();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save journal record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl border border-[#EFE4EC] bg-white p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-lg text-[#302337]">
              Journal Entry — {date}
            </h3>
            <p className="text-xs text-[#8A7890]">
              Capture your well-being, mood, and daily thoughts
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A7890] hover:bg-[#FAF0F5]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* General Well-being Chips (Matching reference top-right) */}
          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-2.5">
              General Well-being
            </label>
            <div className="flex flex-wrap gap-2">
              {WELL_BEING_OPTIONS.map((item) => {
                const isSelected = symptoms.includes(item.label) || symptoms.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSymptom(item.label)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
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

          {/* Mood Chips (Matching reference top-right) */}
          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-2.5">
              Mood
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((item) => {
                const isSelected = mood.toLowerCase() === item.label.toLowerCase() || mood.toLowerCase() === item.id.toLowerCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMood(isSelected ? "" : item.label)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
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

          {/* Cramp / Pain Intensity */}
          <div className="p-4 rounded-2xl bg-[#FAF5F7] border border-[#EFE4EC]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#302337]">
                Pain / Cramp Rating
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-[#503750] border border-[#EFE4EC]">
                {pain}/10
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={pain}
              onChange={(e) => setPain(Number(e.target.value))}
              className="w-full accent-[#503750] h-1.5 bg-[#EBDDE7] rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] mt-1 text-[#8A7890]">
              <span>None (0)</span>
              <span>Mild (1–3)</span>
              <span>Moderate (4–6)</span>
              <span>Severe (7–10)</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
              Reflections & Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750] resize-none"
              placeholder="How are you feeling today?"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "Saving…" : "Save Journal Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function JournalPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDate, setFormDate] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<SymptomLog | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await journalApi.list(monthKey);
      setLogs(res.data);
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const deleteLog = async (date: string) => {
    if (!confirm("Delete this journal record?")) return;
    await journalApi.delete(date);
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Month Navigation & Action Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-2xl border border-[#EFE4EC] bg-white/90 text-[#302337] flex items-center justify-center hover:bg-[#FAF0F5] transition-colors shadow-xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-black text-[#302337] min-w-[170px] text-center tracking-tight">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-2xl border border-[#EFE4EC] bg-white/90 text-[#302337] flex items-center justify-center hover:bg-[#FAF0F5] transition-colors shadow-xs"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => { setEditingLog(null); setFormDate(todayISO()); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Entry Today
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#503750]/20 border-t-[#503750] animate-spin" />
          <p className="text-xs font-semibold text-[#8A7890]">Loading your journal…</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-12 text-center max-w-md mx-auto space-y-4 shadow-card">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#FAF0F5] border border-[#EFE4EC] flex items-center justify-center text-[#503750]">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg text-[#302337]">No Journal Logs This Month</h3>
          <p className="text-xs text-[#8A7890] leading-relaxed">
            Track daily symptoms, feelings, and energy levels to build a holistic record of your hormonal cycle.
          </p>
          <button
            onClick={() => { setEditingLog(null); setFormDate(todayISO()); }}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum transition-all cursor-pointer"
          >
            Add First Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {logs.map((log) => (
            <div
              key={log.date}
              className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-5 shadow-card hover:shadow-soft transition-all space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#EFE4EC]">
                <span className="font-bold text-sm text-[#302337]">
                  {new Date(log.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setEditingLog(log); setFormDate(log.date); }}
                    className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF0F5] text-[#503750] hover:bg-[#F4E6F0] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteLog(log.date)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mood & Pain Badge */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {log.mood && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FAF0F5] text-[#503750] font-semibold border border-[#EFE4EC]">
                    <Smile className="w-3.5 h-3.5" />
                    <span className="capitalize">{log.mood}</span>
                  </span>
                )}
                {log.painLevel > 0 && (
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-semibold border border-rose-100">
                    Pain {log.painLevel}/10
                  </span>
                )}
              </div>

              {/* Symptoms Chips */}
              {log.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {log.symptoms.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF5F7] border border-[#EFE4EC] text-[#8A7890] capitalize"
                    >
                      {s.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {log.notes && (
                <p className="text-xs text-[#8A7890] italic pt-1">
                  "{log.notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Log Form Modal */}
      {formDate && (
        <LogForm
          initial={editingLog || undefined}
          date={formDate}
          onSave={load}
          onClose={() => { setFormDate(null); setEditingLog(null); }}
        />
      )}
    </div>
  );
}
