import { formatPeriodIndicatorBM } from "../../hooks/usePeriodData";

/**
 * Shared dark-theme time-window filter controls (`Tiada`, `Mingguan`, `Bulanan`, `Suku Tahun`),
 * `📅 Tempoh Data:` indicator badge, and `🖨️ Cetak PDF` action button.
 */
export default function PeriodPrintToolbar({
  period = "all",
  onPeriodChange,
  onPrint,
  printDisabled = false,
  printing = false,
  selectAriaLabel = "Penapis Tempoh Data",
  printTitle = "Cetak laporan ini sebagai PDF",
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center gap-1.5 border border-[var(--color-chip-border)] bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] px-3 py-1.5 rounded-[10px] text-xs font-semibold">
        <span>📅 Tempoh Data:</span>
        <span className="text-[var(--color-accent)]">
          {formatPeriodIndicatorBM(period)}
        </span>
      </div>

      <select
        value={period}
        onChange={(e) => onPeriodChange?.(e.target.value)}
        aria-label={selectAriaLabel}
        className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-1.5 rounded-[10px] font-semibold text-xs focus:outline-none focus:border-[var(--color-accent)]"
      >
        <option value="all">Tiada</option>
        <option value="weekly">Mingguan</option>
        <option value="monthly">Bulanan</option>
        <option value="quarterly">Suku Tahun</option>
      </select>

      <button
        type="button"
        onClick={onPrint}
        disabled={printDisabled || printing}
        title={printTitle}
        className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
      >
        {printing ? "Menjana PDF..." : "🖨️ Cetak PDF"}
      </button>
    </div>
  );
}
