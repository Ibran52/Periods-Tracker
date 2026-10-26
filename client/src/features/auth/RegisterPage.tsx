import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff } from "lucide-react";
import veyoraLogo from "../../assets/veyora-logo-transparent.png";

interface Props {
  onSwitch: () => void;
}

export function RegisterPage({ onSwitch }: Props) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", cycleLength: "28" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        defaultCycleLength: Number(form.cycleLength) || 28,
      });
    } catch (err: any) {
      if (err.errors) {
        const map: Record<string, string> = {};
        err.errors.forEach((e: { field: string; message: string }) => { map[e.field] = e.message; });
        setFieldErrors(map);
      } else {
        setError(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, id: string, type: string, val: string, onChange: any, placeholder: string, err?: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={val}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        style={{ background: "var(--bg-surface)", borderColor: err ? "#f87171" : "var(--border-color)", color: "var(--text-primary)" }}
      />
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl p-2.5 bg-brand-500/10 border border-brand-500/20 mb-4 shadow-lg shadow-brand-500/10">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Create your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Start tracking your cycle with Veyora
          </p>
        </div>

        <div className="rounded-2xl border p-8"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <form onSubmit={submit} className="space-y-4">
            {field("Full name", "reg-name", "text", form.name, set("name"), "Jane Doe", fieldErrors["name"])}
            {field("Email address", "reg-email", "email", form.email, set("email"), "jane@example.com", fieldErrors["email"])}

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  style={{ background: "var(--bg-surface)", borderColor: fieldErrors["password"] ? "#f87171" : "var(--border-color)", color: "var(--text-primary)" }}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors["password"] && <p className="text-xs text-red-400 mt-1">{fieldErrors["password"]}</p>}
            </div>

            <div>
              <label htmlFor="reg-cycle" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Typical cycle length <span style={{ color: "var(--text-secondary)" }}>(days)</span>
              </label>
              <input
                id="reg-cycle"
                type="number"
                min={15}
                max={60}
                value={form.cycleLength}
                onChange={set("cycleLength")}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Don't know it yet? Leave as 28 — you can update this later.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-2.5 border border-red-400/20">
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all mt-2"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "var(--text-secondary)" }}>
            <span className="text-xs block mb-3 opacity-70">
              Veyora is not a medical device. Predictions are estimates only.
            </span>
            Already have an account?{" "}
            <button onClick={onSwitch} className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
