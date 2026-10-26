import type { User, CycleSettings, PeriodLog, SymptomLog, PredictionData, MLEvaluation } from "../types";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    (err as any).errors = data.errors;
    throw err;
  }
  return data;
}

/* Auth */
export const authApi = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    defaultCycleLength?: number;
    defaultPeriodDuration?: number;
  }) => request<{ success: true; data: { user: User; cycleSettings: CycleSettings; token: string } }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ success: true; data: { user: User; cycleSettings: CycleSettings; token: string } }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  logout: () => request<{ success: true }>("/auth/logout", { method: "POST" }),

  me: () =>
    request<{ success: true; data: { user: User; cycleSettings: CycleSettings | null } }>("/auth/me"),

  updateProfile: (body: Partial<Pick<User, "name" | "themePreference" | "isOnboarded">>) =>
    request<{ success: true; data: { user: User } }>("/auth/profile", { method: "PATCH", body: JSON.stringify(body) }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ success: true; message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
};

/* Periods */
export const periodsApi = {
  list: () => request<{ success: true; count: number; data: PeriodLog[] }>("/periods"),

  create: (body: { startDate: string; endDate?: string | null; flowIntensity?: string | null; notes?: string }) =>
    request<{ success: true; data: PeriodLog }>("/periods", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<PeriodLog>) =>
    request<{ success: true; data: PeriodLog }>(`/periods/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  delete: (id: string) =>
    request<{ success: true; message: string }>(`/periods/${id}`, { method: "DELETE" }),

  calendar: (month: string) =>
    request<{ success: true; data: { month: string; actualPeriods: PeriodLog[]; stats: any; prediction: any } }>(`/periods/calendar?month=${month}`),
};

/* Predictions */
export const predictionsApi = {
  next: () => request<{ success: true; data: PredictionData }>("/predictions/next"),
  insights: () => request<{ success: true; data: { stats: any; mlEvaluation: MLEvaluation; snapshots: any[] } }>("/predictions/insights"),
};

/* Journal */
export const journalApi = {
  list: (month?: string) =>
    request<{ success: true; count: number; data: SymptomLog[] }>(`/journal${month ? `?month=${month}` : ""}`),

  log: (body: { date: string; symptoms?: string[]; mood?: string | null; painLevel?: number; notes?: string }) =>
    request<{ success: true; data: SymptomLog }>("/journal", { method: "POST", body: JSON.stringify(body) }),

  delete: (id: string) =>
    request<{ success: true }>(`/journal/${id}`, { method: "DELETE" }),
};

/* Settings */
export const settingsApi = {
  get: () => request<{ success: true; data: CycleSettings }>("/settings"),

  update: (body: Partial<CycleSettings>) =>
    request<{ success: true; data: CycleSettings }>("/settings", { method: "PATCH", body: JSON.stringify(body) }),

  export: () => request<any>("/settings/export"),

  deleteAccount: () => request<{ success: true; message: string }>("/settings/account", { method: "DELETE" }),
};

export const notificationsApi = {
  getVapidKey: () =>
    request<{ success: boolean; data: { publicKey: string | null } }>("/notifications/vapid-key"),

  subscribe: (data: { endpoint: string; keys: { p256dh: string; auth: string }; timezone?: string }) =>
    request<any>("/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  unsubscribe: (endpoint: string) =>
    request<any>("/notifications/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint })
    }),

  sendTest: () =>
    request<{ success: boolean; message: string }>("/notifications/test", {
      method: "POST"
    })
};
