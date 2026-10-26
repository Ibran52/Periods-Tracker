import { useEffect, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { useTheme } from "../features/settings/ThemeContext";
import { settingsApi, authApi, notificationsApi } from "../services/api";
import type { CycleSettings } from "../types";
import { Sun, Moon, Monitor, Trash2, Download, KeyRound, Loader2, CheckCircle2, Bell, BellRing, Brain, Sparkles, Cpu, Activity } from "lucide-react";

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
        <button key={key} onClick={() => setTheme(key)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${theme === key ? "bg-brand-600 text-white border-brand-600" : ""}`}
          style={theme !== key ? { background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-secondary)" } : {}}>
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
  const [exporting, setExporting] = useState(false);
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

  const sendTestNotification = async () => {
    setPushMsg("");
    try {
      const res = await notificationsApi.sendTest();
      setPushMsg(res.message);
    } catch (err: any) {
      setPushMsg(err.message || "Failed to trigger test push");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await settingsApi.update({
        defaultCycleLength: cycleLen,
        defaultPeriodDuration: periodDur,
        reminderDaysBefore: reminderDays,
        remindersEnabled,
        modelPreference: modelPref
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwMsg("");
    try {
      await authApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setPwMsg("Password updated successfully");
      setCurrentPw(""); setNewPw("");
    } catch (e: any) {
      setPwMsg(e.message || "Failed to update password");
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const data = await settingsApi.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "veyora-export.json"; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Permanently delete your account and all health data? This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? All period history, symptoms, and predictions will be erased.")) return;
    setDeleting(true);
    try {
      await settingsApi.deleteAccount();
      await logout();
    } finally {
      setDeleting(false);
    }
  };

  const labelCls = "block text-sm font-medium mb-1.5";
  const inputCls = "w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all";
  const inputStyle = { background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" };
  const sectionCls = "rounded-2xl border p-5 space-y-4";

  return (
    <div className="space-y-5 pb-10">
      <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Settings</h2>

      {/* Appearance */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Appearance</h3>
        <ThemePicker />
      </div>

      {/* Cycle defaults */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Cycle Defaults</h3>

        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Typical cycle length <span style={{ color: "var(--text-secondary)" }}>({cycleLen} days)</span>
          </label>
          <input type="range" min={15} max={60} value={cycleLen} onChange={(e) => setCycleLen(Number(e.target.value))}
            className="w-full accent-brand-500" />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Typical period duration <span style={{ color: "var(--text-secondary)" }}>({periodDur} days)</span>
          </label>
          <input type="range" min={1} max={15} value={periodDur} onChange={(e) => setPeriodDur(Number(e.target.value))}
            className="w-full accent-brand-500" />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Remind me <span style={{ color: "var(--text-secondary)" }}>{reminderDays} days before</span>
          </label>
          <input type="range" min={0} max={7} value={reminderDays} onChange={(e) => setReminderDays(Number(e.target.value))}
            className="w-full accent-brand-500" />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Enable reminders</label>
          <button onClick={() => setRemindersEnabled((v) => !v)}
            className={`w-10 h-6 rounded-full transition-all relative ${remindersEnabled ? "bg-brand-600" : "bg-gray-600"}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${remindersEnabled ? "left-5" : "left-1"}`} />
          </button>
        </div>

        <div className="pt-3 border-t space-y-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Device Push Notifications</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Receive alerts on your device ahead of your cycle</p>
            </div>
            <button onClick={enableWebPush} disabled={pushLoading}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand-500 text-brand-400 hover:bg-brand-500/10 transition-all">
              {pushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              Opt-in
            </button>
          </div>

          {pushMsg && (
            <p className="text-xs p-2.5 rounded-lg bg-brand-500/10 text-brand-300 border border-brand-500/20">{pushMsg}</p>
          )}

          {remindersEnabled && (
            <button onClick={sendTestNotification}
              className="text-xs flex items-center gap-1.5 text-brand-400 hover:underline">
              <BellRing className="w-3.5 h-3.5" /> Send test push notification
            </button>
          )}
        </div>

        {/* ML Prediction Engine */}
        <div className="pt-3 border-t space-y-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: "var(--accent-plum)" }} />
            <h4 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              ML Forecasting Engine
            </h4>
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Choose the model used for next-period forecasting. Automated walk-forward validation selected Random Forest as the approved production default.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              {
                id: "auto",
                title: "Auto (Recommended)",
                badge: "Approved Default",
                badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
                desc: "Automatically selects the best-performing model (Random Forest, MAE 1.75d). Gracefully falls back to baseline when <4 cycles are recorded."
              },
              {
                id: "random_forest",
                title: "Random Forest Regressor",
                badge: "MAE 1.75d",
                badgeColor: "bg-brand-500/10 text-brand-400 border-brand-500/20",
                desc: "Calibrated ensemble model using historical cycle length, variance, and rolling means with 80% coverage intervals."
              },
              {
                id: "cycle_sync",
                title: "CycleSync LSTM",
                badge: "Experimental (MAE 2.73d)",
                badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                desc: "Deep recurrent LSTM network trained on sequential cycle length and duration pairs. Experimental candidate."
              },
              {
                id: "baseline",
                title: "Historical Median",
                badge: "Rule-Based",
                badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/20",
                desc: "Transparent rolling median without machine learning. Deterministic and explainable."
              }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setModelPref(opt.id as any)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  modelPref === opt.id
                    ? "border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5"
                    : "hover:border-opacity-80"
                }`}
                style={{
                  background: modelPref === opt.id ? undefined : "var(--bg-surface)",
                  borderColor: modelPref === opt.id ? undefined : "var(--border-color)"
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {opt.title}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${opt.badgeColor}`}>
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        <button onClick={saveSettings} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all">
          {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save settings"}
        </button>
      </div>

      {/* Password */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Change Password</h3>
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>Current password</label>
          <input id="settings-current-pw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
            className={inputCls} style={inputStyle} placeholder="••••••••" />
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>New password</label>
          <input id="settings-new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
            className={inputCls} style={inputStyle} placeholder="Min. 8 characters" />
        </div>
        {pwMsg && <p className={`text-sm ${pwMsg.includes("success") ? "text-green-400" : "text-red-400"}`}>{pwMsg}</p>}
        <button onClick={changePassword}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all">
          <KeyRound className="w-4 h-4" /> Update password
        </button>
      </div>

      {/* Data */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Privacy & Data</h3>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          You own your health data. Export a full copy or delete your account at any time.
          Veyora is not a medical device.
        </p>

        <button onClick={exportData} disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all"
          style={{ borderColor: "var(--border-color)", color: "var(--text-primary)", background: "var(--bg-surface)" }}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export my data (JSON)
        </button>

        <button onClick={deleteAccount} disabled={deleting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-300 border border-red-400/30 bg-red-400/10 hover:bg-red-400/20 disabled:opacity-50 transition-all">
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete account & all data
        </button>
      </div>
    </div>
  );
}
