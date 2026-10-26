import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff } from "lucide-react";
import veyoraLogo from "../../assets/veyora-logo-transparent.png";

interface Props {
  onSwitch: () => void;
}

export function LoginPage({ onSwitch }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg-base)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl p-2.5 bg-brand-500/10 border border-brand-500/20 mb-4 shadow-lg shadow-brand-500/10">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Welcome back to Veyora
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sign in to your Veyora account
          </p>
        </div>

        <div className="rounded-2xl border p-8"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 rounded-lg px-4 py-2.5 border border-red-400/20">
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
            Don't have an account?{" "}
            <button
              onClick={onSwitch}
              className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
