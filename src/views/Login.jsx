import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth-context";
import { dataSourceInfo } from "../fb_cloud_firestore";
import { seedUsers } from "../data/seedUsers";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loginAsRole } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(
        err.message ||
          "Gagal log masuk. Sila semak nama pengguna dan kata laluan."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (role) => {
    setError("");
    setLoading(true);
    try {
      await loginAsRole(role);
      navigate("/");
    } catch (err) {
      setError(err.message || "Gagal menukar peranan ujian.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-8">
      <div className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-7 shadow-2xl backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="inline-block bg-linear-to-br from-[var(--color-accent-light)] to-[var(--color-accent-dark)] text-[#0c1830] font-black px-4 py-2.5 rounded-2xl text-xl select-none mb-3">
            AI
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {t("auth.loginTitle", "Log Masuk Pegawai")}
          </h2>
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">
            {t(
              "auth.loginSubtitle",
              "Khas untuk Pegawai BSPT / PDRM yang mempunyai kelayakan akses."
            )}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5"
              htmlFor="username"
            >
              {t("auth.username", "Nama Pengguna (Username)")}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              placeholder="contoh: abdulaziz"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border-light)] bg-[#0d182e] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5"
              htmlFor="password"
            >
              {t("auth.password", "Kata Laluan")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border-light)] bg-[#0d182e] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-accent)] text-[#0b1629] font-bold py-2.5 px-4 rounded-lg text-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyemak..." : t("auth.loginBtn", "Log Masuk")}
            </button>
          </div>
        </form>

        {dataSourceInfo.isEmulator && (
          <div className="mt-5 pt-4 border-t border-[var(--color-border)]">
            <div className="text-[11px] text-[var(--color-text-secondary)] mb-2">
              Pintasan Ujian Peranan (Emulator):
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickRole("guest")}
                className="cursor-pointer border border-[var(--color-border-light)] bg-[var(--color-nav-bg)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Awam (Guest)
              </button>
              {seedUsers.map((seed) => (
                <button
                  key={seed.username}
                  type="button"
                  disabled={loading}
                  title={`${seed.name} (${seed.username} / ${seed.password})`}
                  onClick={() => handleQuickRole(seed.role)}
                  className="cursor-pointer border border-[var(--color-border-light)] bg-[var(--color-nav-bg)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {seed.role}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-[var(--color-border)] text-center">
          <Link
            to="/"
            className="text-xs text-[var(--color-accent-text)] hover:underline inline-flex items-center gap-1 font-semibold"
          >
            ← {t("auth.backToDashboard", "Kembali ke Dashboard Utama (Mod Awam)")}
          </Link>
        </div>
      </div>
    </div>
  );
}
