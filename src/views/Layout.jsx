import { useState, useEffect, useCallback } from "react";
import {
  Outlet,
  NavLink,
  Link,
  useLocation,
  useNavigate,
  useBlocker,
  useBeforeUnload,
} from "react-router";
import { useTranslation } from "react-i18next";
import { usePeriod } from "../period-context";
import { useAuth } from "../auth-context";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import UnsavedChangesModal from "../components/shared/UnsavedChangesModal";
import { dataSourceInfo } from "../fb_cloud_firestore";
import { bootstrapFirestoreData } from "../services/bootstrapData";
import {
  getPeriodLabelBM,
  formatPeriodDateRangeBM,
} from "../hooks/usePeriodData";
import { useLocations } from "../hooks/useLocations";
import { useSiasatan } from "../hooks/useSiasatan";
import { usePenguatkuasaan } from "../hooks/usePenguatkuasaan";
import { aggregatePeriodSaman } from "../utils/saman";

const allTabs = [
  {
    to: "/",
    key: "nav.dashboard",
    roles: ["guest", "Siasatan", "Penguatkuasaan", "Admin"],
  },
  {
    to: "/siasatan",
    key: "nav.siasatan",
    roles: ["Siasatan", "Penguatkuasaan", "Admin"],
  },
  {
    to: "/penguatkuasaan",
    key: "nav.penguatkuasaan",
    roles: ["Siasatan", "Penguatkuasaan", "Admin"],
  },
  { to: "/lokasi", key: "nav.lokasi", roles: ["Admin"] },
];

export default function Layout() {
  const { t } = useTranslation();
  const { period, setPeriod } = usePeriod();
  const { user, role, isAuthenticated, logout } = useAuth();
  const { activeLocations } = useLocations();
  const { loadByPeriod: loadSiasatanByPeriod } = useSiasatan();
  const { loadByPeriod: loadOpsByPeriod } = usePenguatkuasaan();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    hasUnsavedChanges,
    dirtyFormLabels,
    clearAllDirtyAndBypass,
    resetBypass,
    shouldBlockNavigation,
  } = useUnsavedChanges();

  const [pendingLogout, setPendingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const blocker = useBlocker(shouldBlockNavigation);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (hasUnsavedChanges) {
          e.preventDefault();
          e.returnValue = "";
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Restore GitHub Pages SPA deep links redirected via 404.html (?redirect=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      navigate(redirect, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      resetBypass();
    }
  }, [hasUnsavedChanges, resetBypass]);

  // Trigger idempotent Firestore startup seeding on app mount
  useEffect(() => {
    bootstrapFirestoreData();
  }, []);

  const visibleTabs = allTabs.filter((tab) => tab.roles.includes(role));
  const isDashboard =
    location.pathname === "/" ||
    location.pathname === "/smart-traffic" ||
    location.pathname === "/smarttraffic";
  const isLogin =
    location.pathname === "/login" || location.pathname.endsWith("/login");

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = async () => {
    if (hasUnsavedChanges) {
      setPendingLogout(true);
      return;
    }
    await performLogout();
  };

  const handleStayOnPage = useCallback(() => {
    if (pendingLogout) {
      setPendingLogout(false);
    }
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [pendingLogout, blocker]);

  const handleDiscardAndProceed = async () => {
    clearAllDirtyAndBypass();
    if (pendingLogout) {
      setPendingLogout(false);
      await performLogout();
      return;
    }
    if (blocker.state === "blocked") {
      blocker.proceed();
    }
  };

  const handleExportCsv = async () => {
    const [recs, ops] = await Promise.all([
      loadSiasatanByPeriod(period),
      loadOpsByPeriod(period),
    ]);
    const accOps = ops.filter(
      (o) => o.kategori_kemalangan && o.kategori_kemalangan !== "Bukan kemalangan"
    );
    const fatalOpsCount = accOps.filter(
      (o) => o.kategori_kemalangan === "Maut"
    ).length;

    const totalCases = recs.length + accOps.length;
    const totalFatal = recs.filter((r) => r.maut).length + fatalOpsCount;
    const totalDeaths =
      recs.reduce((s, r) => s + (r.maut ? r.bilangan_maut : 0), 0) +
      fatalOpsCount;

    const scoredLocs = activeLocations
      .map((loc) => {
        const locSiasatan = recs.filter((r) => r.location_id === loc.id);
        const locAllOps = ops.filter((o) => o.location_id === loc.id);
        const locAccOps = accOps.filter((o) => o.location_id === loc.id);
        const locFatalOps = locAccOps.filter(
          (o) => o.kategori_kemalangan === "Maut"
        );
        const cases = locSiasatan.length + locAccOps.length;
        const fatal =
          locSiasatan.filter((r) => r.maut).length + locFatalOps.length;
        const deaths =
          locSiasatan.reduce((s, r) => s + (r.maut ? r.bilangan_maut : 0), 0) +
          locFatalOps.length;
        const baseWeight = loc.is_blackspot ? 35 : 15;
        const risk =
          cases === 0
            ? 0
            : Math.max(
                0,
                Math.min(
                  100,
                  baseWeight +
                    cases * 12 +
                    fatal * 15 +
                    deaths * 5 -
                    locAllOps.length * 4
                )
              );
        return { ...loc, risk };
      })
      .sort((a, b) => b.risk - a.risk);

    const topLoc = scoredLocs[0];
    const samanStats = aggregatePeriodSaman(recs, ops);
    const rows = [
      ["Perkara", "Nilai", "Nota"],
      [
        "Tempoh",
        `${getPeriodLabelBM(period)} (${formatPeriodDateRangeBM(period)})`,
        "Data Firestore",
      ],
      ["Jumlah kemalangan", totalCases, "Siasatan + Penguatkuasaan"],
      ["Kemalangan maut", totalFatal, "Siasatan + Penguatkuasaan"],
      ["Jumlah kematian", totalDeaths, "Siasatan + Penguatkuasaan"],
      ["Jumlah saman (unik)", samanStats.total, "Siasatan + Penguatkuasaan (dinyahtindih)"],
      ["Saman POL 170 A", samanStats.pol170a, "Siasatan + Penguatkuasaan (unik)"],
      ["Saman POL 257", samanStats.pol257, "Siasatan + Penguatkuasaan (unik)"],
      ...(samanStats.unset > 0
        ? [
            [
              "Saman Belum Ditetapkan",
              samanStats.unset,
              "Rekod lama (tanpa kategori)",
            ],
          ]
        : []),
      ["Lokasi utama", topLoc?.name ?? "-", "Lokasi rujukan"],
      ["Skor risiko", topLoc?.risk ?? 0, "Dinamik (Siasatan + Penguatkuasaan)"],
    ];
    const csv =
      "\ufeff" +
      rows
        .map((r) =>
          r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")
        )
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SMART_TRAFFIC_AI_demo.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="max-w-[1500px] mx-auto px-6 py-6 max-[550px]:p-3.5">
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
            <h1 className="text-2xl max-[550px]:text-xl font-bold my-1">
              {t("brand.title")}
            </h1>
            <div className="text-[var(--color-text-secondary)] text-xs">
              {t("brand.subtitle")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {dataSourceInfo.isEmulator && (
            <div
              className="text-[#93c5fd] border border-[#1e40af] bg-[#0f2447] rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide"
              title={`Bersambung ke Emulator Firebase (${dataSourceInfo.projectId})`}
            >
              EMULATOR · {dataSourceInfo.host}
            </div>
          )}
          <div className="text-[var(--color-demo-text)] border border-[var(--color-demo-border)] bg-[var(--color-demo-bg)] rounded-full px-3.5 py-2 text-xs">
            {t("brand.demo")}
          </div>
          {!isAuthenticated ? (
            <Link
              to="/login"
              className="bg-[var(--color-accent)] text-[#0b1629] font-bold px-3.5 py-2 rounded-full text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>🔑</span>
              <span>{t("auth.loginBtn", "Log Masuk")}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 bg-[#172a48] border border-[#344967] rounded-full px-3.5 py-1.5 text-xs">
              <span className="text-[var(--color-text-primary)] font-medium">
                {user.name} ·{" "}
                <span className="text-[var(--color-accent-soft)] font-semibold">
                  {role}
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[var(--color-accent-light)] hover:underline font-bold text-[11px] cursor-pointer ml-1"
              >
                [{t("auth.logoutBtn", "Log Keluar")}]
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Navigation (Hidden on Login screen) ── */}
      {!isLogin && (
        <nav className="flex gap-2 flex-wrap items-center mt-7 mb-1">
          {visibleTabs.map(({ to, key }) => (
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

          {/* Period selector + CSV export (Dashboard Utama only) — pushed right */}
          {isDashboard && (
            <div className="ml-auto max-[980px]:ml-0 flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 border border-[var(--color-chip-border)] bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] px-3 py-2 rounded-[10px] text-xs font-semibold">
                <span>📅 Tempoh Data:</span>
                <span className="text-[var(--color-accent)]">
                  {getPeriodLabelBM(period)} ({formatPeriodDateRangeBM(period)})
                </span>
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Penapis Tempoh Dashboard"
                className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3.5 py-2.5 rounded-[10px] font-semibold text-sm"
              >
                <option value="weekly">{t("period.weekly")}</option>
                <option value="monthly">{t("period.monthly")}</option>
                <option value="quarterly">{t("period.quarterly")}</option>
              </select>
              <button
                type="button"
                onClick={handleExportCsv}
                className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3.5 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors"
              >
                {t("export.csv")}
              </button>
            </div>
          )}
        </nav>
      )}

      {/* ── Page Content ── */}
      <main className="mt-4">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="text-[var(--color-footer)] text-xs mt-6 mb-2 leading-relaxed">
        {t("footer.text")}
      </footer>

      <UnsavedChangesModal
        isOpen={blocker.state === "blocked" || pendingLogout}
        dirtyLabels={dirtyFormLabels}
        onStay={handleStayOnPage}
        onDiscard={handleDiscardAndProceed}
        busy={loggingOut}
      />
    </div>
  );
}
