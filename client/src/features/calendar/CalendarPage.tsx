import React, { useEffect, useState, useCallback } from "react";
import { periodsApi, predictionsApi, journalApi } from "../../services/api";
import type { PeriodLog, PredictionData, SymptomLog } from "../../types";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X,
  Heart
} from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl border border-[#EFE4EC] bg-white p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#302337]">
            {initial?._id ? "Edit period log" : "Log period"}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A7890] hover:bg-[#FAF0F5]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">Start date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
              End date <span className="normal-case font-normal">(leave blank if ongoing)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEnd(e.target.value)}
              min={startDate}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">Flow intensity</label>
            <div className="flex gap-2">
              {["light", "medium", "heavy"].map((f) => {
                const isSelected = flow === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlow(isSelected ? "" : f)}
                    className={`flex-1 py-2 rounded-full text-xs font-bold capitalize border transition-all ${
                      isSelected
                        ? "bg-[#503750] text-white border-[#503750] shadow-sm"
                        : "bg-[#FAF5F7] border-[#EFE4EC] text-[#8A7890] hover:bg-[#FAF0F5]"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750] resize-none"
              placeholder="Optional personal notes…"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "Saving…" : "Save Period Record"}
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

  const forecastWindow = (prediction?.earliestStart && prediction?.latestStart)
    ? dateRange(prediction.earliestStart, prediction.latestStart)
    : new Set<string>();

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
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#503750]/20 border-t-[#503750] animate-spin" />
        <p className="text-xs font-semibold text-[#8A7890]">Loading your calendar…</p>
      </div>
    );
  }

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
          onClick={() => { setEditing(null); setShowForm(true); }}
          id="add-period-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Log Period
        </button>
      </div>

      {/* Calendar Grid Card */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 backdrop-blur-md p-5 sm:p-7 shadow-card">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-3 border-b border-[#EFE4EC] pb-2">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-bold uppercase tracking-wider text-[#8A7890]"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Date cells grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="h-12 sm:h-14" />;
            const iso = isoDate(year, month, day);
            const isPeriod = periodDates.has(iso);
            const isToday = iso === todayIso;
            const isSelected = iso === selected;
            const isForecast = forecastWindow.has(iso) && !isPeriod;
            const isPredPeriod = predPeriodDates.has(iso) && !isPeriod;
            const isFertile = fertileWindow.has(iso) && !isPeriod && !isForecast;
            const hasJournal = journalDates.has(iso);

            let bgClass = "bg-[#FAF5F7]/40 hover:bg-[#FAF0F5] text-[#302337]";
            if (isPeriod) {
              bgClass = "bg-[#E05A8D] text-white font-bold shadow-xs";
            } else if (isPredPeriod) {
              bgClass = "bg-[#FDEEF4] text-[#E05A8D] font-bold border border-dashed border-[#E05A8D]/50";
            } else if (isForecast) {
              bgClass = "bg-[#F3EBF4] text-[#503750] font-semibold";
            } else if (isFertile) {
              bgClass = "bg-[#F0FAF5] text-[#2A7552] font-semibold border border-[#D5EFE2]";
            }

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(isSelected ? null : iso)}
                className={`relative h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center text-xs sm:text-sm transition-all cursor-pointer ${bgClass} ${
                  isSelected ? "ring-2 ring-[#503750] ring-offset-1" : ""
                } ${isToday && !isPeriod ? "border-2 border-[#503750] font-black" : ""}`}
              >
                <span>{day}</span>

                {/* Journal dot indicator */}
                {hasJournal && (
                  <span
                    className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      isPeriod ? "bg-white" : "bg-[#503750]"
                    }`}
                  />
                )}

                {/* Predicted period star */}
                {isPredPeriod && !isPeriod && (
                  <span className="absolute top-1 right-1 text-[8px] text-[#E05A8D]">✦</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-[#8A7890] px-2 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#E05A8D]" /> Logged Period
        </div>
        {prediction?.predictedStart && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FDEEF4] border border-dashed border-[#E05A8D]" /> Predicted Period
          </div>
        )}
        {prediction?.earliestStart && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F3EBF4]" /> 80% Forecast Window
          </div>
        )}
        {prediction?.fertileWindow && (
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-[#2A7552]" /> Fertile Window
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#503750]" /> Journal Entry
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selected && (
        <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-5 sm:p-6 shadow-card space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#302337]">
              {new Date(selected + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
              })}
            </h4>

            {selectedPeriod && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditing(selectedPeriod); setShowForm(true); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A7890] hover:text-[#503750] hover:bg-[#FAF0F5] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePeriod(selectedPeriod._id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {selectedPeriod ? (
            <div className="space-y-1.5 text-xs text-[#8A7890]">
              <p>Period Start: <strong className="text-[#302337]">{selectedPeriod.startDate}</strong></p>
              {selectedPeriod.endDate && <p>Period End: <strong className="text-[#302337]">{selectedPeriod.endDate}</strong></p>}
              {selectedPeriod.flowIntensity && (
                <p>Flow Intensity: <strong className="capitalize text-[#302337]">{selectedPeriod.flowIntensity}</strong></p>
              )}
              {selectedPeriod.notes && <p>Notes: <em className="text-[#302337]">{selectedPeriod.notes}</em></p>}
            </div>
          ) : (
            <div className="text-xs text-[#8A7890] space-y-1">
              <p>No logged period on this date.</p>
              {predPeriodDates.has(selected) && (
                <p className="text-[#E05A8D] font-semibold">✦ Predicted period day</p>
              )}
              {forecastWindow.has(selected) && (
                <p className="text-[#503750]">Within 80% forecast interval window (±{prediction?.uncertaintyDays || 3}d)</p>
              )}
              {fertileWindow.has(selected) && (
                <p className="text-[#2A7552] font-semibold">Estimated fertile window (statistical estimate only)</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Period Modal */}
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
