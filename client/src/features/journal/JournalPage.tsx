import { useEffect, useState } from "react";
import { journalApi } from "../../services/api";
import type { SymptomLog } from "../../types";
import { Plus, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

const SYMPTOMS = ["cramps","fatigue","headache","bloating","acne","breast tenderness","back pain","nausea","mood swings","insomnia"];
const MOODS = ["happy","calm","sensitive","irritable","sad","tired","anxious","energetic"];
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

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await journalApi.log({ date, symptoms, mood: mood || null, painLevel: pain, notes });
      onSave();
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            Journal — {date}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 opacity-50 hover:opacity-80" /></button>
        </div>

        <div className="space-y-4">
          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Symptoms</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-all ${symptoms.includes(s) ? "bg-brand-600 text-white border-brand-600" : ""}`}
                  style={!symptoms.includes(s) ? { background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button key={m} onClick={() => setMood(mood === m ? "" : m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition-all ${mood === m ? "bg-roseplum-600/80 text-white border-roseplum-600" : ""}`}
                  style={mood !== m ? { background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Pain */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              Pain level: <strong>{pain}/10</strong>
            </label>
            <input type="range" min={0} max={10} value={pain} onChange={(e) => setPain(Number(e.target.value))}
              className="w-full accent-brand-500" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              placeholder="How are you feeling today?" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={submit} disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all">
            {loading ? "Saving…" : "Save entry"}
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

  const monthKey = `${year}-${String(month+1).padStart(2,"0")}`;

  const load = () => {
    journalApi.list(monthKey)
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); load(); }, [monthKey]);

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y+1)) : setMonth(m => m+1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:opacity-70"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold w-36 text-center" style={{ color: "var(--text-primary)" }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:opacity-70"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button onClick={() => setFormDate(todayISO())}
          id="add-journal-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all">
          <Plus className="w-4 h-4" />
          Log today
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--accent-plum)" }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>No entries this month</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tap "Log today" to start your journal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...logs].sort((a, b) => b.date.localeCompare(a.date)).map((log) => (
            <div key={log._id} className="rounded-2xl border p-4 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={() => setFormDate(log.date)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {new Date(log.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  {log.mood && (
                    <p className="text-xs mt-0.5 capitalize" style={{ color: "var(--accent-plum)" }}>
                      Mood: {log.mood}
                    </p>
                  )}
                </div>
                {log.painLevel > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-red-400/15 text-red-300 border border-red-400/20">
                    Pain {log.painLevel}/10
                  </span>
                )}
              </div>
              {log.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {log.symptoms.map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {log.notes && (
                <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{log.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {formDate && (
        <LogForm
          date={formDate}
          initial={logs.find((l) => l.date === formDate)}
          onSave={load}
          onClose={() => setFormDate(null)}
        />
      )}
    </div>
  );
}
