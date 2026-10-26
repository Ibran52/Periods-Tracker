import React, { useEffect, useState, useCallback } from "react";
import { predictionsApi } from "../../services/api";
import { useAuth } from "../auth/AuthContext";
import type { PredictionData } from "../../types";
import { CycleArcGauge } from "./CycleArcGauge";
import { DayStrip } from "./DayStrip";
import { RecommendationCards } from "./RecommendationCards";
import { QuickLogModal } from "../journal/QuickLogModal";
import {
  Clock, Heart, AlertCircle,
  Calendar, RefreshCw, ShieldCheck, Sparkles,
  Info, Brain, Plus
} from "lucide-react";

function CountdownBadge({ days }: { days: number }) {
  let label: string;
  let style: string;

  if (days < 0) {
    const abs = Math.abs(days);
    label = `${abs} day${abs === 1 ? "" : "s"} overdue`;
    style = "bg-rose-50 text-rose-600 border-rose-200";
  } else if (days === 0) {
    label = "Expected today";
    style = "bg-pink-50 text-pink-700 border-pink-200";
  } else if (days === 1) {
    label = "Tomorrow";
    style = "bg-pink-50 text-pink-700 border-pink-200";
  } else if (days <= 5) {
    label = `${days} days away`;
    style = "bg-amber-50 text-amber-700 border-amber-200";
  } else {
    label = `${days} days away`;
    style = "bg-purple-50 text-purple-700 border-purple-200";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${style}`}>
      <Clock className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  tooltip
}: {
  label: string;
  value: string | number;
  sub?: string;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded-3xl border p-4 sm:p-5 transition-all hover:shadow-soft bg-white/90 border-[#EFE4EC]"
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A7890]">
          {label}
        </p>
        {tooltip && (
          <span title={tooltip} className="cursor-help opacity-60 hover:opacity-100">
            <Info className="w-3.5 h-3.5 text-[#8A7890]" />
          </span>
        )}
      </div>
      <p className="text-2xl font-black tracking-tight text-[#302337] mt-0.5">
        {value}
      </p>
      {sub && <p className="text-xs mt-1 text-[#8A7890] font-medium">{sub}</p>}
    </div>
  );
}

interface DashboardProps {
  onNavigateToCalendar?: () => void;
  onNavigateToJournal?: () => void;
}

export function Dashboard({ onNavigateToCalendar, onNavigateToJournal }: DashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await predictionsApi.next();
      setData(res.data);
    } catch (e: any) {
      setError(e.message || "Failed to load cycle predictions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-12 h-12 rounded-full border-3 border-[#503750]/20 border-t-[#503750] animate-spin" />
        <p className="text-xs font-medium text-[#8A7890]">
          Refining your personalized wellness cycle…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-[#302337] space-y-3">
        <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          Could not retrieve cycle predictions
        </div>
        <p className="text-xs text-[#8A7890]">{error}</p>
        <button
          onClick={() => loadData(true)}
          className="px-4 py-2 rounded-full text-xs font-semibold bg-[#503750] text-white hover:bg-[#3E293E] transition-all cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data?.hasHistory) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-5">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#FAF0F5] border border-[#EFE4EC] flex items-center justify-center shadow-soft">
          <Calendar className="w-9 h-9 text-[#E05A8D]" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#302337]">
          Welcome to Veyora
        </h2>
        <p className="text-sm text-[#8A7890] leading-relaxed">
          Log your most recent period start date to unlock your personal cycle phase gauge,
          intelligent forecast countdown, and tailored wellness guidance.
        </p>
        {onNavigateToCalendar && (
          <button
            onClick={onNavigateToCalendar}
            className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Log Period in Calendar
          </button>
        )}
      </div>
    );
  }

  const fmt = (d?: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—";

  const fmtFull = (d?: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        })
      : "—";

  const cycleLengthDays = data.predictedCycleLength || data.stats?.medianCycleLength || 28;
  const currentCycleDay = data.currentCycleDay || 1;
  const isOverdue = currentCycleDay > cycleLengthDays;
  const completedCycles = data.stats?.completedCycles || 0;
  const isPersonalized = Boolean(
    data.isPersonalizedML || data.method === "personalized_ml" || data.method === "lstm_cycle_sync"
  );
  const isFallbackError =
    data.mlStatus === "fallback" &&
    (data.fallbackReason === "timeout" || data.fallbackReason === "error" || data.fallbackReason === "unavailable");

  // Determine current menstrual cycle phase
  const periodDuration = 5;
  const ovulationDay = Math.max(6, Math.round(cycleLengthDays - 14));
  let phaseName = "Menstruation";
  if (currentCycleDay <= periodDuration) {
    phaseName = "Menstruation";
  } else if (currentCycleDay < ovulationDay - 1) {
    phaseName = "Follicular";
  } else if (currentCycleDay <= ovulationDay + 2) {
    phaseName = "Ovulation";
  } else {
    phaseName = "Luteal";
  }

  const userName = user?.name ? user.name.split(" ")[0] : "Lena";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* 1. Welcoming Header (Inspired by reference top) */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-[#8A7890] tracking-wide">
            Hi, {userName}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#302337] mt-0.5">
            Ready for a good day ?
          </h2>
        </div>

        {/* User avatar ring matching reference */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[#EFE4EC] bg-white/80 text-[#8A7890] hover:text-[#503750] transition-colors"
            title="Refresh forecast"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="w-11 h-11 rounded-full p-0.5 border-2 border-[#D985B7] flex items-center justify-center bg-white shadow-xs">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#F4DCE8] to-[#E05A8D] flex items-center justify-center text-white font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Horizontal Day Strip */}
      <DayStrip
        currentCycleDay={currentCycleDay}
        totalDays={Math.round(cycleLengthDays)}
        onSelectDay={() => setQuickLogOpen(true)}
      />

      {/* 3. Central Circular Phase Gauge Card (Matching reference card) */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-card flex flex-col items-center">
        <CycleArcGauge
          currentDay={currentCycleDay}
          totalDays={Math.round(cycleLengthDays)}
          phaseName={phaseName}
          isOverdue={isOverdue}
        />

        {/* Primary Action Button: Log Your Symptoms (Deep Plum Pill) */}
        <div className="w-full max-w-sm mt-5">
          <button
            type="button"
            onClick={() => setQuickLogOpen(true)}
            className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] active:scale-[0.99] transition-all duration-200 shadow-plum flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log Your Symptoms
          </button>
        </div>
      </div>

      {/* 4. Today's Recommendation Cards */}
      <RecommendationCards
        phase={phaseName}
        onOpenJournal={() => setQuickLogOpen(true)}
      />

      {/* 5. Forecast Summary Card */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 backdrop-blur-md p-6 sm:p-7 shadow-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A7890] mb-1">
              Expected Next Period Start
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#302337] tracking-tight mb-2.5">
              {fmtFull(data.predictedStart)}
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {data.daysUntilNext !== undefined && (
                <CountdownBadge days={data.daysUntilNext} />
              )}

              {data.earliestStart && data.latestStart && (
                <span className="text-xs px-3.5 py-1 rounded-full border border-dashed border-[#EFE4EC] text-[#8A7890] flex items-center gap-1.5 font-medium bg-[#FAF5F7]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#503750]" />
                  80% Window: <strong className="text-[#302337]">{fmt(data.earliestStart)} – {fmt(data.latestStart)}</strong> (±{data.uncertaintyDays || 3}d)
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase font-bold tracking-wider text-[#8A7890]">Cycle Day</p>
            <p className="text-3xl font-black text-[#503750]">
              {currentCycleDay}
            </p>
          </div>
        </div>

        {/* Fertile Window Banner */}
        {data.fertileWindow && (
          <div className="mt-5 p-3.5 rounded-2xl bg-[#F0FAF5] border border-[#D5EFE2] flex items-center gap-2.5 text-xs text-[#2A7552]">
            <Heart className="w-4 h-4 text-[#35A070] shrink-0" />
            <span>
              Estimated Fertile Window:{" "}
              <strong>
                {fmt(data.fertileWindow.start)} – {fmt(data.fertileWindow.end)}
              </strong>{" "}
              <span className="text-[11px] opacity-80">(Statistical estimate, not birth control)</span>
            </span>
          </div>
        )}
      </div>

      {/* 6. Cycle Metrics Grid */}
      {data.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Avg Cycle"
            value={`${data.stats.averageCycleLength}d`}
            sub={
              data.stats.completedCycles === 0
                ? "Default setting"
                : data.stats.completedCycles === 1
                ? "1 cycle observed"
                : "Historical mean"
            }
            tooltip="Average length across all completed logged cycles"
          />
          <StatCard
            label="Median Cycle"
            value={`${data.stats.medianCycleLength}d`}
            sub={
              data.stats.completedCycles === 0
                ? "Default setting"
                : data.stats.completedCycles === 1
                ? "Single interval"
                : "Typical duration"
            }
            tooltip="Middle cycle length, resistant to outlier fluctuations"
          />
          <StatCard
            label="Cycles Logged"
            value={data.stats.completedCycles}
            sub={
              data.stats.completedCycles >= 4
                ? "Personalized ML active"
                : data.stats.completedCycles >= 3 && data.modelPreference === "cycle_sync"
                ? "CycleSync LSTM active"
                : `Log ${data.modelPreference === "cycle_sync" ? "3+" : "4+"} for ML`
            }
            tooltip="Total completed cycles stored in your private log"
          />
          <StatCard
            label="Variability"
            value={data.stats.completedCycles >= 2 ? `±${data.stats.stdCycleLength}d` : "—"}
            sub={
              data.stats.completedCycles < 2
                ? "Need 2+ cycles"
                : data.stats.isIrregular
                ? "⚠ Irregular pattern"
                : "Regular pattern"
            }
            tooltip={
              data.stats.completedCycles < 2
                ? "Variability requires at least 2 completed cycle intervals to measure fluctuations"
                : "Standard deviation of cycle length across your history"
            }
          />
        </div>
      )}

      {/* 7. Transparent Machine Learning & History Insights */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF0F5] border border-[#EFE4EC] flex items-center justify-center text-[#503750]">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#302337]">
                {isPersonalized ? "Personalized Machine Learning" : isFallbackError ? "Safe Baseline Fallback" : "Rule-Based Baseline"}
              </span>
              <p className="text-[11px] text-[#8A7890]">
                {isPersonalized
                  ? `${data.method === "lstm_cycle_sync" ? "CycleSync LSTM" : "Random Forest"} · ${data.modelVersion || "calibrated"}`
                  : completedCycles === 1
                  ? "Single-Cycle Early Estimate"
                  : `Historical Median (${completedCycles}/${data.modelPreference === "cycle_sync" ? 3 : 4} cycles for ML)`}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#FAF5F7] border border-[#EFE4EC] text-[#8A7890]">
            Confidence: {data.confidence || "Standard"}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF5F7] border border-[#EFE4EC] text-xs text-[#8A7890] leading-relaxed">
          <p>
            <strong className="text-[#302337]">How this forecast was computed: </strong>
            {data.message || "Calculated using your logged cycle lengths."}
          </p>
        </div>

        {/* Path to ML Tracker */}
        {!isPersonalized && completedCycles < (data.modelPreference === "cycle_sync" ? 3 : 4) && (
          <div className="pt-2 border-t border-[#EFE4EC] space-y-2">
            {(() => {
              const target = data.modelPreference === "cycle_sync" ? 3 : 4;
              const needed = target - completedCycles;
              return (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#302337] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#E05A8D]" />
                      Path to Personalized Machine Learning
                    </span>
                    <span className="font-bold text-[#503750]">
                      {completedCycles} of {target} Cycles
                    </span>
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${target}, minmax(0, 1fr))` }}>
                    {Array.from({ length: target }, (_, i) => i + 1).map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full transition-all ${
                          completedCycles >= step ? "bg-[#503750]" : "bg-[#EFE4EC]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#8A7890]">
                    Personalized {data.modelPreference === "cycle_sync" ? "CycleSync LSTM activates at 3" : "ML activates at 4"} cycles. Log {needed} more cycle{needed === 1 ? "" : "s"} to unlock advanced forecasting.
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* 8. Clinical Transparency & Medical Safety Disclaimer */}
      <div className="p-4 rounded-3xl bg-[#FAF5F7] border border-[#EFE4EC] text-xs text-[#8A7890] leading-relaxed flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-[#8A7890] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#302337]">Clinical Transparency & Medical Disclaimer: </strong>
          Veyora forecasts are probabilistic estimates calculated from your personal tracking logs and machine learning models.
          Cycle timing fluctuates naturally due to stress, travel, illness, sleep, and hormonal variations.
          <strong> Do not use Veyora for contraception, family planning, or diagnostic purposes.</strong> Consult a healthcare professional for clinical concerns.
        </div>
      </div>

      {/* Quick Symptom & Mood Modal */}
      <QuickLogModal
        isOpen={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        onSuccess={() => loadData(true)}
      />
    </div>
  );
}
