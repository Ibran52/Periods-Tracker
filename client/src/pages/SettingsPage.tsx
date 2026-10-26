import React, { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../features/settings/ThemeContext";
import { settingsApi, authApi, notificationsApi } from "../services/api";
import type { CycleSettings } from "../types";
import {
  Sun, Moon, Monitor, Trash2, KeyRound, Loader2, CheckCircle2,
  Bell, BellRing, Brain
} from "lucide-react";

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const options: { key: typeof theme; label: string; icon: React.ReactNode }[] = [
    { key: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { key: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { key: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
  ];
  return (
    <div className="flex gap-2">
      {options.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setTheme(key)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
            theme === key
              ? "bg-[#503750] text-white border-[#503750] shadow-sm"
              : "bg-[#FAF5F7] border-[#EFE4EC] text-[#8A7890] hover:bg-[#FAF0F5]"
          }`}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const { logout } = useAuth();
  const [, setSettings] = useState<CycleSettings | null>(null);
  const [cycleLen, setCycleLen] = useState(28);
  const [periodDur, setPeriodDur] = useState(5);
  const [reminderDays, setReminderDays] = useState(2);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [modelPref, setModelPref] = useState<"auto" | "random_forest" | "cycle_sync" | "baseline">("auto");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    settingsApi.get().then((r) => {
      setSettings(r.data);
      setCycleLen(r.data.defaultCycleLength);
      setPeriodDur(r.data.defaultPeriodDuration);
      setReminderDays(r.data.reminderDaysBefore);
      setRemindersEnabled(r.data.remindersEnabled);
      if (r.data.modelPreference) {
        setModelPref(r.data.modelPreference);
      }
    });
  }, []);

  const enableWebPush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushMsg("Web push notifications are not supported in this browser");
      return;
    }
    setPushLoading(true);
    setPushMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMsg("Browser notification permission was denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await notificationsApi.getVapidKey();
      if (!keyRes.data?.publicKey) {
        setPushMsg("Push notifications enabled in local reminder mode");
        setRemindersEnabled(true);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyRes.data.publicKey
      });
      const jsonSub = sub.toJSON();
      if (jsonSub.endpoint && jsonSub.keys?.p256dh && jsonSub.keys?.auth) {
        await notificationsApi.subscribe({
          endpoint: jsonSub.endpoint,
          keys: {
            p256dh: jsonSub.keys.p256dh,
            auth: jsonSub.keys.auth
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        setPushMsg("Web push notification subscription registered!");
        setRemindersEnabled(true);
      }
    } catch (err: any) {
      setPushMsg(err.message || "Could not register push subscription");
    } finally {
      setPushLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await settingsApi.update({
        defaultCycleLength: cycleLen,
        defaultPeriodDuration: periodDur,
        remindersEnabled,
        reminderDaysBefore: reminderDays,
        modelPreference: modelPref
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    try {
      await authApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg("Password updated successfully");
      setCurrentPw("");
      setNewPw("");
    } catch (err: any) {
      setPwMsg(err.message || "Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This will delete all your data permanently.")) return;
    setDeleting(true);
    try {
      await settingsApi.deleteAccount();
      logout();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#302337] tracking-tight">
          Settings
        </h2>
        <p className="text-xs font-semibold text-[#8A7890]">
          Personalize your cycle parameters, notifications, and AI forecasting engine
        </p>
      </div>

      {/* 1. Appearance / Theme */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-6 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-[#302337]">Appearance</h3>
        <ThemePicker />
      </div>

      {/* 2. Cycle Defaults */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-6 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-[#302337]">Cycle & Period Defaults</h3>
        <p className="text-xs text-[#8A7890]">
          These baselines guide initial predictions until your personal history is established.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
              Default Cycle Length (days)
            </label>
            <input
              type="number"
              min={21}
              max={45}
              value={cycleLen}
              onChange={(e) => setCycleLen(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm font-semibold text-[#302337] outline-none focus:border-[#503750]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
              Default Period Bleeding (days)
            </label>
            <input
              type="number"
              min={2}
              max={10}
              value={periodDur}
              onChange={(e) => setPeriodDur(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm font-semibold text-[#302337] outline-none focus:border-[#503750]"
            />
          </div>
        </div>
      </div>

      {/* 3. AI / ML Model Engine Selection */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#302337] flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#503750]" /> AI Model Engine
            </h3>
            <p className="text-xs text-[#8A7890]">
              Choose how Veyora computes cycle lengths and fertility windows
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {[
            {
              id: "auto",
              label: "Auto (Recommended)",
              badge: "Smart Switching",
              desc: "Automatically selects the best model based on your history length (CycleSync LSTM at 3+ cycles)."
            },
            {
              id: "cycle_sync",
              label: "CycleSync LSTM",
              badge: "Neural Network",
              desc: "Deep recurrent LSTM model analyzing sequential cycle-to-cycle temporal patterns (requires 3+ cycles)."
            },
            {
              id: "random_forest",
              label: "Random Forest Regressor",
              badge: "Tree Ensemble",
              desc: "Robust non-linear ensemble trained on clinical cycle features (requires 4+ cycles)."
            },
            {
              id: "baseline",
              label: "Historical Median (Baseline)",
              badge: "Deterministic",
              desc: "Pure rule-based statistical median, completely resistant to complex model variance."
            }
          ].map((opt) => {
            const isSelected = modelPref === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setModelPref(opt.id as any)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#FAF2F7] border-[#503750] shadow-xs"
                    : "bg-[#FAF5F7]/50 border-[#EFE4EC] hover:bg-[#FAF0F5]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-[#503750] bg-[#503750]" : "border-[#8A7890]"
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-bold text-[#302337]">{opt.label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-[#EFE4EC] text-[#8A7890]">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-[#8A7890] pl-6 leading-relaxed">
                  {opt.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Notifications & Reminders */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-6 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-[#302337] flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#503750]" /> Period Reminders
        </h3>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF5F7] border border-[#EFE4EC]">
          <div>
            <p className="text-xs font-bold text-[#302337]">Enable Upcoming Period Alerts</p>
            <p className="text-[11px] text-[#8A7890]">Receive gentle notifications prior to expected cycle start</p>
          </div>
          <button
            type="button"
            onClick={() => setRemindersEnabled(!remindersEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              remindersEnabled ? "bg-[#503750]" : "bg-[#EFE4EC]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform absolute top-0.5 ${
                remindersEnabled ? "translate-x-6.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {remindersEnabled && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
                Notify me in advance
              </label>
              <select
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm font-semibold text-[#302337] outline-none"
              >
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={5}>5 days before</option>
              </select>
            </div>

            <button
              type="button"
              onClick={enableWebPush}
              disabled={pushLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#FAF0F5] text-[#503750] border border-[#EFE4EC] hover:bg-[#F2E5EF] transition-all cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5" />
              {pushLoading ? "Subscribing…" : "Enable Device Web Push"}
            </button>
            {pushMsg && <p className="text-xs text-[#503750] font-medium">{pushMsg}</p>}
          </div>
        )}
      </div>

      {/* Save Settings Action Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Settings Saved!
            </>
          ) : (
            "Save Preferences"
          )}
        </button>
      </div>

      {/* 5. Security & Change Password */}
      <div className="rounded-3xl border border-[#EFE4EC] bg-white/90 p-6 shadow-card space-y-4">
        <h3 className="text-sm font-bold text-[#302337] flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#503750]" /> Security & Password
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm outline-none focus:border-[#503750]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm outline-none focus:border-[#503750]"
            />
          </div>

          {pwMsg && <p className="text-xs text-[#503750] font-semibold">{pwMsg}</p>}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#503750] hover:bg-[#3E293E] shadow-xs cursor-pointer"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* 6. Danger Zone */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6 shadow-card space-y-3">
        <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-xs text-rose-600/80">
          Permanently delete your account and all associated period logs, predictions, and journal entries.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer"
        >
          {deleting ? "Deleting…" : "Delete Account"}
        </button>
      </div>
    </div>
  );
}
