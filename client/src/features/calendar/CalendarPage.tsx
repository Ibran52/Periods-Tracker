import { useEffect, useState, useCallback } from "react";
import { periodsApi, predictionsApi, journalApi } from "../../services/api";
import type { PeriodLog, PredictionData, SymptomLog } from "../../types";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Loader2,
  Calendar, Droplets, Heart, Sparkles
} from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const FLOW_COLORS: Record<string, string> = { light: "#f9a8d4", medium: "#ec4899", heavy: "#be185d" };

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDateLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Returns all ISO dates in [start, end] inclusive */
function dateRange(start: string, end: string): Set<string> {
  const s = parseDateLocal(start);
  const e = parseDateLocal(end);
  const out = new Set<string>();
  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.add(isoDate(d.getFullYear(), d.getMonth(), d.getDate()));
  }
  return out;
}

interface PeriodFormProps {
  initial?: Partial<PeriodLog>;
  onSave: (data: { startDate: string; endDate?: string | null; flowIntensity?: string | null; notes?: string }) => Promise<void>;
  onClose: () => void;
}

function PeriodForm({ initial, onSave, onClose }: PeriodFormProps) {
  const [startDate, setStart] = useState(initial?.startDate || "");
  const [endDate, setEnd] = useState(initial?.endDate || "");
  const [flow, setFlow] = useState<string>(initial?.flowIntensity || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!startDate) { setError("Start date is required"); return; }
    if (endDate && endDate < startDate) { setError("End date cannot be before start date"); return; }
    setLoading(true);
    setError("");
    try {
      await onSave({ startDate, endDate: endDate || null, flowIntensity: flow || null, notes });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
            {initial?._id ? "Edit period" : "Log period"}
          </h3>
          <button onClick={onClose} className="opacity-50 hover:opacity-80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Start date *</label>
            <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
              End date <span style={{ color: "var(--text-secondary)" }}>(leave blank if ongoing)</span>
            </label>
            <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} min={startDate}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Flow intensity</label>
            <div className="flex gap-2">
              {["light", "medium", "heavy"].map((f) => (
                <button key={f} onClick={() => setFlow(flow === f ? "" : f)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-all ${flow === f ? "bg-brand-600 text-white border-brand-600" : "border-opacity-50"}`}
                  style={flow !== f ? { background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              placeholder="Optional notes…" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={submit} disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all">
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [periods, setPeriods] = useState<PeriodLog[]>([]);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [journalDates, setJournalDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PeriodLog | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [periodsRes, predRes, journalRes] = await Promise.allSettled([
        periodsApi.list(),
        predictionsApi.next(),
        journalApi.list(),
      ]);
      if (periodsRes.status === "fulfilled") setPeriods(periodsRes.value.data);
      if (predRes.status === "fulfilled") setPrediction(predRes.value.data);
      if (journalRes.status === "fulfilled") {
        setJournalDates(new Set(journalRes.value.data.map((l: SymptomLog) => l.date)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build period date map
  const periodDates = new Map<string, PeriodLog>();
  for (const p of periods) {
    const start = parseDateLocal(p.startDate);
    const end = p.endDate ? parseDateLocal(p.endDate) : start;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
      periodDates.set(iso, p);
    }
  }

  // Build prediction overlay sets
  const predictedDates = prediction?.predictedStart
    ? new Set([prediction.predictedStart])
    : new Set<string>();

  const forecastWindow = (prediction?.earliestStart && prediction?.latestStart)
    ? dateRange(prediction.earliestStart, prediction.latestStart)
    : new Set<string>();

  // Predicted period duration: use avg period duration from stats, default 5
  const avgDuration = prediction?.stats?.averagePeriodDuration || 5;
  const predPeriodDates: Set<string> = new Set();
  if (prediction?.predictedStart) {
    const ps = parseDateLocal(prediction.predictedStart);
    for (let i = 0; i < avgDuration; i++) {
      const d = new Date(ps);
      d.setDate(d.getDate() + i);
      predPeriodDates.add(isoDate(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  }

  const fertileWindow = (prediction?.fertileWindow)
    ? dateRange(prediction.fertileWindow.start, prediction.fertileWindow.end)
    : new Set<string>();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedPeriod = selected ? periodDates.get(selected) : null;

  const savePeriod = async (data: any) => {
    if (editing) {
      await periodsApi.update(editing._id, data);
    } else {
      await periodsApi.create(data);
    }
    setEditing(null);
    load();
  };

  const deletePeriod = async (id: string) => {
    if (!confirm("Remove this period record?")) return;
    await periodsApi.delete(id);
    setSelected(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-plum)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:opacity-70 transition-opacity"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold w-44 text-center" style={{ color: "var(--text-primary)" }}>
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:opacity-70 transition-opacity"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          id="add-period-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all">
          <Plus className="w-4 h-4" />
          Log period
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--border-color)" }}>
          {DAYS.map((d) => (
            <div key={d} className="text-center py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-secondary)" }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="p-1 h-14 sm:h-12" />;
            const iso = isoDate(year, month, day);
            const isPeriod = periodDates.has(iso);
            const isToday = iso === todayIso;
            const isSelected = iso === selected;
            const isForecast = forecastWindow.has(iso) && !isPeriod;
            const isPredPeriod = predPeriodDates.has(iso) && !isPeriod;
            const isFertile = fertileWindow.has(iso) && !isPeriod && !isForecast;
            const hasJournal = journalDates.has(iso);

            let bg = "transparent";
            let textColor = isToday ? "var(--accent-plum)" : "var(--text-primary)";
            let fontWeight = isToday ? "700" : "400";

            if (isPeriod) {
              bg = FLOW_COLORS[periodDates.get(iso)?.flowIntensity ?? ""] || "#ec4899";
              textColor = "white";
              fontWeight = "600";
            } else if (isPredPeriod) {
              bg = "rgba(236, 72, 153, 0.18)";
              textColor = "#f472b6";
            } else if (isForecast) {
              bg = "rgba(168, 85, 247, 0.12)";
              textColor = "var(--accent-plum)";
            } else if (isFertile) {
              bg = "rgba(34, 197, 94, 0.1)";
              textColor = "#4ade80";
            }

            return (
              <button key={iso} onClick={() => setSelected(isSelected ? null : iso)}
                className="relative h-14 sm:h-12 flex flex-col items-center justify-center text-sm transition-all hover:opacity-80"
                style={{
                  background: bg,
                  color: textColor,
                  fontWeight,
                  outline: isSelected ? "2px solid var(--accent-plum)" : "none",
                  outlineOffset: "-2px",
                  borderRadius: "8px",
                }}>
                <span>{day}</span>
                {/* Journal dot indicator */}
                {hasJournal && !isPeriod && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--accent-plum)", opacity: 0.7 }} />
                )}
                {/* Predicted period star */}
                {isPredPeriod && !isPeriod && (
                  <span className="absolute top-0.5 right-1 text-[8px] opacity-60">✦</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-pink-400" /> Logged period
        </div>
        {prediction?.predictedStart && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" style={{ color: "var(--accent-plum)" }} />
            Predicted next period
          </div>
        )}
        {prediction?.earliestStart && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(168, 85, 247, 0.25)" }} />
            Forecast window (80%)
          </div>
        )}
        {prediction?.fertileWindow && (
          <div className="flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-green-400" /> Est. fertile window
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent-plum)" }} />
          Journal entry
        </div>
      </div>

      {/* Prediction info banner */}
      {prediction?.hasHistory && prediction.predictedStart && (
        <div className="p-3 rounded-xl border flex items-center gap-2.5 text-sm"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <Calendar className="w-4 h-4 shrink-0" style={{ color: "var(--accent-plum)" }} />
          <span style={{ color: "var(--text-secondary)" }}>
            Next period predicted around{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {new Date(prediction.predictedStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </strong>
            {prediction.uncertaintyDays && (
              <span> (±{prediction.uncertaintyDays}d window shaded on calendar)</span>
            )}
          </span>
        </div>
      )}

      {/* Selected Day Detail */}
      {selected && selectedPeriod && (
        <div className="rounded-2xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(selectedPeriod); setShowForm(true); }}
                className="p-2 rounded-xl hover:opacity-70"
                style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => deletePeriod(selectedPeriod._id)}
                className="p-2 rounded-xl hover:opacity-70"
                style={{ background: "var(--bg-surface)", color: "#f87171" }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>Start: <strong style={{ color: "var(--text-primary)" }}>{selectedPeriod.startDate}</strong></p>
            {selectedPeriod.endDate && <p>End: <strong style={{ color: "var(--text-primary)" }}>{selectedPeriod.endDate}</strong></p>}
            {selectedPeriod.flowIntensity && <p>Flow: <strong className="capitalize" style={{ color: "var(--text-primary)" }}>{selectedPeriod.flowIntensity}</strong></p>}
            {selectedPeriod.notes && <p>Notes: <em style={{ color: "var(--text-primary)" }}>{selectedPeriod.notes}</em></p>}
          </div>
        </div>
      )}

      {/* Selected forecast day info */}
      {selected && !selectedPeriod && prediction?.hasHistory && (
        forecastWindow.has(selected) || predPeriodDates.has(selected) || fertileWindow.has(selected)
      ) && (
        <div className="rounded-2xl border p-4 text-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {new Date(selected + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="space-y-1" style={{ color: "var(--text-secondary)" }}>
            {predPeriodDates.has(selected) && (
              <p className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-plum)" }} />
                Predicted next period start
              </p>
            )}
            {forecastWindow.has(selected) && !predPeriodDates.has(selected) && (
              <p>Within 80% forecast window (±{prediction?.uncertaintyDays}d)</p>
            )}
            {fertileWindow.has(selected) && (
              <p className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-green-400" />
                Estimated fertile window (statistical estimate only)
              </p>
            )}
          </div>
        </div>
      )}

      {(showForm || editing) && (
        <PeriodForm
          initial={editing || undefined}
          onSave={savePeriod}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
