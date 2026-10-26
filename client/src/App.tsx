import React, { useState } from "react";
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
  { id: "dashboard" as Tab, label: "Home", icon: LayoutDashboard },
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
    dashboard: (
      <Dashboard
        onNavigateToCalendar={() => setTab("calendar")}
        onNavigateToJournal={() => setTab("journal")}
      />
    ),
    calendar: <CalendarPage />,
    insights: <InsightsPage />,
    journal: <JournalPage />,
    settings: <SettingsPage />,
  }[tab];

  const userName = user?.name || "Lena";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#FAF5F7] text-[#302337]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[#EFE4EC] bg-white/70 backdrop-blur-xl p-5 justify-between">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 p-1 bg-[#FAF0F5] border border-[#EBDDE7] shadow-xs">
              <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-[#302337]">Veyora</span>
              <p className="text-[10px] font-semibold text-[#8A7890] tracking-wide uppercase">Cycle & Wellness</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-[#503750] text-white shadow-plum"
                      : "text-[#8A7890] hover:text-[#302337] hover:bg-[#FAF0F5]"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-[#EFE4EC] space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full border-2 border-[#D985B7] bg-gradient-to-tr from-[#F4DCE8] to-[#E05A8D] flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#302337] truncate">{userName}</p>
              <p className="text-xs text-[#8A7890] truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 flex flex-col justify-between border-r border-[#EFE4EC] bg-white p-6 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#EFE4EC]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center p-1 bg-[#FAF0F5] border border-[#EBDDE7]">
                    <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold text-xl text-[#302337]">Veyora</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-[#8A7890] hover:text-[#302337]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {NAV.map(({ id, label, icon: Icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setTab(id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                        active
                          ? "bg-[#503750] text-white shadow-plum"
                          : "text-[#8A7890] hover:text-[#302337] hover:bg-[#FAF0F5]"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#EFE4EC]">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-[#EFE4EC] bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#503750] hover:bg-[#FAF0F5]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-7 h-7 object-contain" />
            <span className="font-extrabold text-lg tracking-tight text-[#302337]">Veyora</span>
          </div>
          <div className="w-9 h-9 rounded-full border-2 border-[#D985B7] bg-gradient-to-tr from-[#F4DCE8] to-[#E05A8D] flex items-center justify-center text-white font-bold text-xs shadow-xs">
            {userInitial}
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {content}
        </main>

        {/* Mobile Bottom Floating Navigation (Inspired by reference bottom bar) */}
        <div className="lg:hidden fixed bottom-3 left-4 right-4 z-40">
          <nav className="flex items-center justify-around py-2 px-3 rounded-3xl bg-white/90 backdrop-blur-xl border border-[#EFE4EC] shadow-2xl">
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                    active
                      ? "text-white bg-[#503750] shadow-sm transform scale-105"
                      : "text-[#8A7890] hover:text-[#503750]"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-bold mt-0.5">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF5F7] gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#503750]/20 border-t-[#503750] animate-spin" />
        <p className="text-xs font-semibold text-[#8A7890]">Opening Veyora…</p>
      </div>
    );
  }

  if (!user) {
    return showRegister ? (
      <RegisterPage onSwitch={() => setShowRegister(false)} />
    ) : (
      <LoginPage onSwitch={() => setShowRegister(true)} />
    );
  }

  return <AppShell />;
}
