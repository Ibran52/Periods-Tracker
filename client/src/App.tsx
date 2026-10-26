import { useState } from "react";
import { useAuth } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { Dashboard } from "./features/predictions/Dashboard";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { InsightsPage } from "./features/insights/InsightsPage";
import { JournalPage } from "./features/journal/JournalPage";
import { SettingsPage } from "./pages/SettingsPage";
import veyoraLogo from "./assets/veyora-logo-transparent.png";
import {
  LayoutDashboard, CalendarDays, TrendingUp, BookHeart,
  Settings, LogOut, Loader2, Menu, X
} from "lucide-react";

type Tab = "dashboard" | "calendar" | "insights" | "journal" | "settings";

const NAV = [
  { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar" as Tab, label: "Calendar", icon: CalendarDays },
  { id: "insights" as Tab, label: "Insights", icon: TrendingUp },
  { id: "journal" as Tab, label: "Journal", icon: BookHeart },
  { id: "settings" as Tab, label: "Settings", icon: Settings },
];

function AppShell() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const content = {
    dashboard: <Dashboard onNavigateToCalendar={() => setTab("calendar")} />,
    calendar: <CalendarPage />,
    insights: <InsightsPage />,
    journal: <JournalPage />,
    settings: <SettingsPage />,
  }[tab];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 p-1 bg-brand-500/10 border border-brand-500/20">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>Veyora</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id ? "bg-brand-600/15 text-brand-400" : "hover:opacity-70"}`}
              style={{ color: tab === id ? "var(--accent-plum)" : "var(--text-secondary)" }}>
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border-color)" }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-all">
            <LogOut className="w-5 h-5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 flex flex-col border-r shadow-xl"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between px-5 py-5 border-b" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 p-1 bg-brand-500/10 border border-brand-500/20">
                  <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>Veyora</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 opacity-50" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id ? "bg-brand-600/15" : ""}`}
                  style={{ color: tab === id ? "var(--accent-plum)" : "var(--text-secondary)" }}>
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t" style={{ borderColor: "var(--border-color)" }}>
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10">
                <LogOut className="w-5 h-5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex items-center gap-2">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>Veyora</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Page title */}
          <h1 className="text-2xl font-bold mb-5 capitalize hidden lg:block" style={{ color: "var(--text-primary)" }}>
            {tab}
          </h1>
          {content}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex border-t"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)" }}>
          {NAV.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-all`}
              style={{ color: tab === id ? "var(--accent-plum)" : "var(--text-secondary)" }}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium capitalize">{id}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!user) {
    return showRegister
      ? <RegisterPage onSwitch={() => setShowRegister(false)} />
      : <LoginPage onSwitch={() => setShowRegister(true)} />;
  }

  return <AppShell />;
}
