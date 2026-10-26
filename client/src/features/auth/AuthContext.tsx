import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User, CycleSettings } from "../../types";
import { authApi } from "../../services/api";

interface AuthState {
  user: User | null;
  cycleSettings: CycleSettings | null;
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
    loading: true,
  });

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setState({ user: res.data.user, cycleSettings: res.data.cycleSettings, loading: false });
    } catch {
      setState({ user: null, cycleSettings: null, loading: false });
    }
  }, []);

  useEffect(() => { void refreshUser(); }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setState({ user: res.data.user, cycleSettings: res.data.cycleSettings, loading: false });
  };

  const register = async (data: Parameters<typeof authApi.register>[0]) => {
    const res = await authApi.register(data);
    setState({ user: res.data.user, cycleSettings: res.data.cycleSettings, loading: false });
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setState({ user: null, cycleSettings: null, loading: false });
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
