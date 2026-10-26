import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#FAF5F7]">
      <div className="w-full max-w-md">
        {/* Brand Logo & Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl p-3 bg-white border border-[#EFE4EC] mb-3 shadow-soft">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#302337] tracking-tight">
            Welcome to Veyora
          </h1>
          <p className="mt-1 text-xs font-semibold text-[#8A7890]">
            Sign in to track your personal cycle rhythm
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[#EFE4EC] bg-white/95 backdrop-blur-xl p-7 sm:p-8 shadow-card">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750] transition-colors"
                placeholder="shreya@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
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
                  className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A7890] hover:text-[#503750]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 rounded-2xl px-4 py-2.5 border border-rose-200 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full font-semibold text-sm text-white bg-[#503750] hover:bg-[#3E293E] shadow-plum disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#EFE4EC] text-center">
            <p className="text-xs text-[#8A7890]">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={onSwitch}
                className="font-bold text-[#503750] hover:underline cursor-pointer ml-1"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
