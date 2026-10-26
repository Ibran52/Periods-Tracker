import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, CycleSettings } from "../../types";
import { authApi } from "../../services/api";

interface AuthState {
  user: User | null;
  cycleSettings: CycleSettings | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; defaultCycleLength?: number; defaultPeriodDuration?: number }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    cycleSettings: null,
    token: localStorage.getItem("vy_token") || localStorage.getItem("pp_token"),
    loading: true,
  });

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("vy_token") || localStorage.getItem("pp_token");
    if (!token) {
      setState((s) => ({ ...s, loading: false, user: null }));
      return;
    }
    try {
      const res = await authApi.me();
      setState({ user: res.data.user, cycleSettings: res.data.cycleSettings, token, loading: false });
    } catch {
      localStorage.removeItem("vy_token");
      localStorage.removeItem("pp_token");
      setState({ user: null, cycleSettings: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem("vy_token", res.data.token);
    setState({ user: res.data.user, cycleSettings: res.data.cycleSettings, token: res.data.token, loading: false });
  };

  const register = async (data: Parameters<typeof authApi.register>[0]) => {
    const res = await authApi.register(data);
    localStorage.setItem("vy_token", res.data.token);
    setState({ user: res.data.user, cycleSettings: res.data.cycleSettings, token: res.data.token, loading: false });
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem("vy_token");
    localStorage.removeItem("pp_token");
    setState({ user: null, cycleSettings: null, token: null, loading: false });
  };

  const updateUser = (updates: Partial<User>) => {
    setState((s) => s.user ? { ...s, user: { ...s.user, ...updates } } : s);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
