import { Outlet, NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { usePeriod } from "../period-context";

const tabs = [
  { to: "/", key: "nav.dashboard" },
  { to: "/siasatan", key: "nav.siasatan" },
  { to: "/analysis", key: "nav.analysis" },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { period, setPeriod } = usePeriod();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === "bm" ? "en" : "bm");
  };

  return (
    <div className="max-w-[1500px] mx-auto px-6 py-6">
      {/* ── Top Bar ── */}
      <div className="flex justify-between items-center gap-5 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="bg-linear-to-br from-[var(--color-accent-light)] to-[var(--color-accent-dark)] text-[#0c1830] font-black px-4 py-3.5 rounded-2xl text-xl select-none">
            AI
          </div>
          <div>
            <div className="text-[11px] tracking-[2px] text-[var(--color-accent-text)] font-bold">
              {t("brand.eyebrow")}
            </div>
            <h1 className="text-2xl font-bold my-1">{t("brand.title")}</h1>
            <div className="text-[var(--color-text-secondary)] text-xs">
              {t("brand.subtitle")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="text-[var(--color-text-secondary)] border border-[var(--color-border-light)] bg-[var(--color-nav-bg)] rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            {i18n.language === "bm" ? "EN" : "BM"}
          </button>
          <div className="text-[var(--color-demo-text)] border border-[var(--color-demo-border)] bg-[var(--color-demo-bg)] rounded-full px-3.5 py-2 text-xs">
            {t("brand.demo")}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <nav className="flex gap-2 flex-wrap items-center mt-7 mb-1">
        {tabs.map(({ to, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `cursor-pointer border font-semibold px-3.5 py-2.5 rounded-[10px] text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-accent)] text-[#0b1629] border-[var(--color-accent)]"
                  : "border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)]"
              }`
            }
          >
            {t(key)}
          </NavLink>
        ))}

        {/* Period selector + export — pushed right */}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3.5 py-2.5 rounded-[10px] font-semibold text-sm"
          >
            <option value="weekly">{t("period.weekly")}</option>
            <option value="monthly">{t("period.monthly")}</option>
            <option value="quarterly">{t("period.quarterly")}</option>
          </select>
          <button className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3.5 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors">
            {t("export.csv")}
          </button>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <main className="mt-4">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="text-[var(--color-footer)] text-xs mt-6 mb-2 leading-relaxed">
        {t("footer.text")}
      </footer>
    </div>
  );
}
