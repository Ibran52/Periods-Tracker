import { useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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

  const field = (
    label: string,
    id: string,
    type: string,
    val: string,
    onChange: any,
    placeholder: string,
    err?: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={val}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-2xl border text-sm outline-none transition-colors"
        style={{
          background: "#FAF5F7",
          borderColor: err ? "#f43f5e" : "#EFE4EC",
          color: "#302337",
        }}
      />
      {err && <p className="text-xs text-rose-600 mt-1 font-medium">{err}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#FAF5F7]">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl p-3 bg-white border border-[#EFE4EC] mb-3 shadow-soft">
            <img src={veyoraLogo} alt="Veyora Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#302337] tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-1 text-xs font-semibold text-[#8A7890]">
            Begin tracking your cycle with personalized AI forecasting
          </p>
        </div>

        <div className="rounded-3xl border border-[#EFE4EC] bg-white/95 backdrop-blur-xl p-7 sm:p-8 shadow-card">
          <form onSubmit={submit} className="space-y-4">
            {field("Full name", "reg-name", "text", form.name, set("name"), "Lena Vance", fieldErrors["name"])}
            {field("Email address", "reg-email", "email", form.email, set("email"), "lena@example.com", fieldErrors["email"])}

            <div>
              <label htmlFor="reg-password" className="block text-xs font-bold text-[#8A7890] uppercase tracking-wider mb-1.5">
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
                  className="w-full px-4 py-2.5 pr-10 rounded-2xl border border-[#EFE4EC] bg-[#FAF5F7] text-sm text-[#302337] outline-none focus:border-[#503750] transition-colors"
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
              {fieldErrors["password"] && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors["password"]}</p>
              )}
            </div>

            {field(
              "Typical Cycle Length (days)",
              "reg-cycle",
              "number",
              form.cycleLength,
              set("cycleLength"),
              "28",
              fieldErrors["defaultCycleLength"]
            )}

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
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#EFE4EC] text-center">
            <p className="text-xs text-[#8A7890]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitch}
                className="font-bold text-[#503750] hover:underline cursor-pointer ml-1"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
