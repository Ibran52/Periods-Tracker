import { useEffect, useState, useCallback } from "react";
import { predictionsApi } from "../../services/api";
import type { PredictionData } from "../../types";
import {
  TrendingUp, Clock, Droplets, Heart, AlertCircle, Loader2,
  Calendar, RefreshCw, ShieldCheck, HelpCircle, ArrowRight,
  Sparkles, CheckCircle2, Info, Brain, WifiOff
} from "lucide-react";

function CountdownBadge({ days }: { days: number }) {
  let label: string;
  let color: string;

  if (days < 0) {
    const abs = Math.abs(days);
    label = `${abs} day${abs === 1 ? "" : "s"} overdue`;
    color = "bg-rose-500/20 text-rose-300 border-rose-500/30";
  } else if (days === 0) {
    label = "Expected today";
    color = "bg-roseplum-600/20 text-roseplum-300 border-roseplum-500/30";
  } else if (days === 1) {
    label = "Tomorrow";
    color = "bg-roseplum-600/20 text-roseplum-300 border-roseplum-500/30";
  } else if (days <= 5) {
    label = `${days} days away`;
    color = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  } else {
    label = `${days} days away`;
    color = "bg-brand-600/20 text-brand-300 border-brand-500/30";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${color}`}>
      <Clock className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

function StatCard({ label, value, sub, tooltip }: { label: string; value: string | number; sub?: string; tooltip?: string }) {
  return (
    <div className="rounded-2xl border p-4 transition-all hover:border-brand-500/30"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</p>
        {tooltip && (
          <span title={tooltip} className="cursor-help opacity-60 hover:opacity-100">
            <Info className="w-3.5 h-3.5 text-secondary" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
    </div>
  );
}

function FertileWindowBadge({ start, end }: { start: string; end: string }) {
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
      <Heart className="w-4 h-4 text-green-400 shrink-0" />
      <span>
        Estimated Fertile Window: <strong>{fmt(start)} – {fmt(end)}</strong>
        <span className="text-xs text-green-400/80 block sm:inline sm:ml-2">(Statistical estimate, not birth control)</span>
      </span>
    </div>
  );
}

function CycleProgressBar({ currentDay, totalDays }: { currentDay: number; totalDays: number }) {
  const safeTotal = Math.max(1, totalDays);
  const progress = Math.min(100, Math.max(0, (currentDay / safeTotal) * 100));
  const isOverdue = currentDay > safeTotal;
  const estimatedOvulationDay = Math.max(1, Math.round(safeTotal - 14));

  return (
    <div className="space-y-1.5 mt-4 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "var(--text-secondary)" }}>
          Current Cycle Progress:{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            Day {currentDay} of ~{safeTotal}
            {isOverdue && ` (${currentDay - safeTotal}d past estimated cycle length)`}
          </strong>
        </span>
        <span className="font-semibold" style={{ color: isOverdue ? "var(--accent-pink)" : "var(--accent-plum)" }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: isOverdue
              ? "linear-gradient(90deg, var(--accent-plum), #f43f5e)"
              : "linear-gradient(90deg, var(--accent-plum), var(--accent-pink))"
          }}
        />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: "var(--text-secondary)" }}>
        <span>Day 1 (Period)</span>
        <span>Estimated Ovulation (~Day {estimatedOvulationDay})</span>
        <span>Expected Next Cycle</span>
      </div>
    </div>
  );
}

interface DashboardProps {
  onNavigateToCalendar?: () => void;
}

export function Dashboard({ onNavigateToCalendar }: DashboardProps) {
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

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
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent-plum)" }} />
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Calculating cycle predictions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-400/10 border border-red-400/20">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-300">Could not retrieve cycle predictions</p>
          <p className="text-xs text-red-300/80">{error}</p>
          <button
            onClick={() => loadData(true)}
            className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-400/20 text-red-200 hover:bg-red-400/30 transition-all">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.hasHistory) {
    return <EmptyDashboard onNavigateToCalendar={onNavigateToCalendar} />;
  }

  const fmt = (d?: string) => d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  const fmtFull = (d?: string) => d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const cycleLengthDays = data.predictedCycleLength || data.stats?.medianCycleLength || 28;
  const uncertainty = data.uncertaintyDays || 3;
  const completedCycles = data.stats?.completedCycles || 0;
  const isPersonalized = Boolean(data.isPersonalizedML || data.method === "personalized_ml" || data.method === "lstm_cycle_sync");
  const isFallbackError = data.mlStatus === "fallback" && (data.fallbackReason === "timeout" || data.fallbackReason === "error" || data.fallbackReason === "unavailable");

  const lastUpdatedFormatted = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner with Distinct ML vs Baseline Distinction & Last Updated */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isPersonalized
              ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
              : isFallbackError
              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              : "bg-slate-500/15 text-slate-300 border border-slate-500/30"
          }`}>
            {isPersonalized ? <Brain className="w-5 h-5" /> : isFallbackError ? <WifiOff className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isPersonalized
                  ? "bg-purple-500/10 text-purple-300 border-purple-500/25"
                  : isFallbackError
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                  : "bg-slate-500/10 text-slate-300 border-slate-500/25"
              }`}>
                {isPersonalized ? "Personalized Machine Learning" : isFallbackError ? "Safe Baseline Fallback" : "Rule-Based Baseline"}
              </span>

              {lastUpdatedFormatted && (
                <span className="text-[11px] flex items-center gap-1 opacity-60" style={{ color: "var(--text-secondary)" }}>
                  <Clock className="w-3 h-3" /> Updated {lastUpdatedFormatted}
                </span>
              )}
            </div>

            <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
              {isPersonalized ? (
                <>
                  {data.method === "lstm_cycle_sync" ? "CycleSync LSTM" : "Random Forest Regressor"}
                  <span className="text-xs font-normal ml-1.5 opacity-70">
                    ({data.modelVersion || "veyora-ml-v1"} · {data.confidence === "high" ? "High Confidence" : "Calibrated"})
                  </span>
                </>
              ) : isFallbackError ? (
                <>
                  Historical Median Baseline
                  <span className="text-xs font-normal ml-1.5 text-amber-400/90">
                    (ML service timed out — fallback active)
                  </span>
                </>
              ) : data.fallbackReason === "user_preference_baseline" ? (
                <>
                  User-Selected Historical Median
                  <span className="text-xs font-normal ml-1.5 opacity-70">(baseline-v1)</span>
                </>
              ) : (
                <>
                  {completedCycles === 0
                    ? "Initial Default Configuration"
                    : completedCycles === 1
                    ? "Single-Cycle Early Baseline"
                    : "Rolling Median Cycle Estimate"}
                  <span className="text-xs font-normal ml-1.5 opacity-70">
                    ({completedCycles}/{data.modelPreference === "cycle_sync" ? "3" : "4"} cycles logged for ML)
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all hover:bg-brand-500/10 shrink-0 self-stretch sm:self-auto justify-center"
          style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
          title="Re-run prediction using your latest logged cycles">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Updating…" : "Update Forecast"}
        </button>
      </div>

      {/* Fallback Warning Notice when ML Service is Unavailable */}
      {isFallbackError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Notice: Advanced ML Service Temporarily Offline ({data.fallbackReason})
            </p>
            <p className="text-amber-200/80 leading-relaxed">
              Veyora seamlessly protected your forecast using your verified historical cycle median ({Math.round(cycleLengthDays)} days). No predictions were missed and your cycle tracking continues uninterrupted.
            </p>
          </div>
        </div>
      )}

      {/* Hero Prediction Card */}
      <div className="rounded-2xl border p-6 md:p-8 relative overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #a855f7, #ec4899)" }} />

        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
                Expected Next Period Start
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-2.5" style={{ color: "var(--text-primary)" }}>
                {fmtFull(data.predictedStart)}
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                {data.daysUntilNext !== undefined && <CountdownBadge days={data.daysUntilNext} />}

                {data.earliestStart && data.latestStart && (
                  <span className="text-xs px-3 py-1 rounded-full border border-dashed flex items-center gap-1.5"
                    style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}>
                    <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--accent-plum)" }} />
                    80% Window: <strong>{fmt(data.earliestStart)} – {fmt(data.latestStart)}</strong> (±{uncertainty}d)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="text-right">
                <p className="text-xs uppercase font-medium" style={{ color: "var(--text-secondary)" }}>Cycle Day</p>
                <p className="text-3xl font-bold" style={{ color: "var(--accent-plum)" }}>
                  {data.currentCycleDay ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Cycle Progress */}
          {data.currentCycleDay && (
            <CycleProgressBar
              currentDay={data.currentCycleDay}
              totalDays={Math.round(cycleLengthDays)}
            />
          )}

          {/* Explainable Insights Box */}
          <div className="mt-5 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>
            <HelpCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div>
                <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>How this prediction was calculated: </strong>
                {data.message || "Calculated using your logged cycle lengths."}
              </div>
              {data.stats && (
                <div className="opacity-80">
                  {completedCycles === 0 ? (
                    "History: No completed cycle intervals recorded yet. Forecast uses your default baseline setting."
                  ) : completedCycles === 1 ? (
                    `History: 1 complete cycle recorded (${Math.round(data.stats.averageCycleLength)}d). ${
                      data.stats.isIrregular
                        ? "This interval is outside standard clinical norms (21–38d); track future cycles to verify your personal pattern."
                        : "Track additional cycles to confirm your personal rhythm."
                    }`
                  ) : (
                    `History: ${completedCycles} complete cycles recorded.${
                      data.stats.isIrregular
                        ? ` Noticeable cycle variability detected (±${data.stats.stdCycleLength}d); interval widened accordingly.`
                        : " Cycle pattern is within regular clinical norms."
                    }`
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Insufficient-History Guidance & Progress to Personalized ML */}
          {!isPersonalized && completedCycles < (data.modelPreference === "cycle_sync" ? 3 : 4) && (
            <div className="mt-3 p-3.5 rounded-xl border text-xs space-y-2"
              style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
              {(() => {
                const targetCycles = data.modelPreference === "cycle_sync" ? 3 : 4;
                const needed = targetCycles - completedCycles;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-plum)" }} />
                        Path to Personalized ML Forecasting
                      </span>
                      <span className="font-semibold text-xs" style={{ color: "var(--accent-plum)" }}>
                        {completedCycles} of {targetCycles} Cycles Recorded
                      </span>
                    </div>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${targetCycles}, minmax(0, 1fr))` }}>
                      {Array.from({ length: targetCycles }, (_, i) => i + 1).map((step) => {
                        const done = completedCycles >= step;
                        return (
                          <div
                            key={step}
                            className={`h-1.5 rounded-full transition-all ${
                              done ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-white/10"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p style={{ color: "var(--text-secondary)" }}>
                      {completedCycles === 0
                        ? "You have 1 period logged. Log your next cycle start date to establish your first completed cycle interval."
                        : `Personalized ${data.modelPreference === "cycle_sync" ? "CycleSync LSTM activates at 3" : "ML activates at 4"} logged cycles. Log ${needed} more cycle${needed === 1 ? "" : "s"} to unlock advanced forecasting.`}
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {data.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      {/* Fertile Window */}
      {data.fertileWindow && (
        <FertileWindowBadge start={data.fertileWindow.start} end={data.fertileWindow.end} />
      )}

      {/* Medical Safety & Accuracy Notice */}
      <div className="p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        <p className="font-semibold flex items-center gap-1.5 text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Clinical Transparency & Medical Disclaimer
        </p>
        <p style={{ color: "var(--text-secondary)" }}>
          Veyora forecasts are probabilistic estimates calculated from your personal tracking logs and machine learning models.
          Cycle timing fluctuates naturally due to stress, travel, illness, sleep, and hormonal variations.
          <strong> Do not use Veyora for contraception, family planning, or diagnostic purposes.</strong> Consult a healthcare professional for clinical concerns.
        </p>
      </div>
    </div>
  );
}

function EmptyDashboard({ onNavigateToCalendar }: { onNavigateToCalendar?: () => void }) {
  return (
    <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30">
        <Droplets className="w-8 h-8 text-brand-400" />
      </div>
      <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        No Cycle Data Logged Yet
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Veyora needs at least one recorded period start date to calculate personalized forecasts.
        Add your recent period to activate next-cycle predictions and fertile window tracking.
      </p>

      {onNavigateToCalendar && (
        <button
          onClick={onNavigateToCalendar}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md">
          <Calendar className="w-4 h-4" /> Go to Calendar to Log Period <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
