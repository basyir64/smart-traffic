import { useMemo, useState } from "react";
import Chip from "../shared/Chip";

const PERIOD_CAPTION = {
  weekly: "Minggu Semasa",
  monthly: "Bulan Semasa",
  quarterly: "Suku Tahun Semasa",
  all: "Semua Rekod",
};

const SUBDIVISION_LABEL = {
  weekly: "Hari",
  monthly: "Minggu",
  quarterly: "Bulan",
  all: "Minggu",
};

const VIEW_MODES = [
  { id: "comparison", label: "Perbandingan" },
  { id: "accidents", label: "Kemalangan" },
  { id: "saman", label: "Saman" },
];

const MAX_BAR_PX = 148;

export default function TrendBarChart({
  trend = [],
  samanTrend = [],
  period = "monthly",
}) {
  const [viewMode, setViewMode] = useState("comparison");
  const caption = PERIOD_CAPTION[period] || "Bulan Semasa";
  const unitLabel = SUBDIVISION_LABEL[period] || "Minggu";

  const mergedBuckets = useMemo(() => {
    const count = Math.max(trend.length, samanTrend.length);
    return Array.from({ length: count }, (_, idx) => {
      const accRaw = trend[idx];
      const accidents =
        typeof accRaw === "number" ? accRaw : Number(accRaw?.value || 0);
      const samItem = samanTrend[idx] || {};
      const pol170a = Number(samItem.pol170a || 0);
      const pol257 = Number(samItem.pol257 || 0);
      const unset = Number(samItem.unset || 0);
      const samanTotal =
        samItem.total !== undefined
          ? Number(samItem.total)
          : pol170a + pol257 + unset;

      return {
        label: samItem.label || `${unitLabel} ${idx + 1}`,
        accidents,
        pol170a,
        pol257,
        unset,
        samanTotal,
      };
    });
  }, [trend, samanTrend, unitLabel]);

  const totals = useMemo(() => {
    return mergedBuckets.reduce(
      (acc, b) => ({
        accidents: acc.accidents + b.accidents,
        pol170a: acc.pol170a + b.pol170a,
        pol257: acc.pol257 + b.pol257,
        unset: acc.unset + b.unset,
        samanTotal: acc.samanTotal + b.samanTotal,
      }),
      { accidents: 0, pol170a: 0, pol257: 0, unset: 0, samanTotal: 0 }
    );
  }, [mergedBuckets]);

  const hasUnset = totals.unset > 0;

  const maxValue = useMemo(() => {
    const vals = mergedBuckets.flatMap((b) => {
      if (viewMode === "accidents") return [b.accidents];
      if (viewMode === "saman") {
        return hasUnset
          ? [b.pol170a, b.pol257, b.unset]
          : [b.pol170a, b.pol257];
      }
      return [b.accidents, b.samanTotal];
    });
    return Math.max(1, ...vals);
  }, [mergedBuckets, viewMode, hasUnset]);

  const barPx = (val) => {
    if (!val || val <= 0) return 3;
    return Math.max(8, Math.round((val / maxValue) * MAX_BAR_PX));
  };

  const titleByMode =
    viewMode === "accidents"
      ? `Trend Kemalangan Mengikut ${unitLabel}`
      : viewMode === "saman"
        ? `Trend Saman Mengikut ${unitLabel}`
        : `Trend Kemalangan & Saman Mengikut ${unitLabel}`;

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630] flex flex-col justify-between gap-3.5">
      {/* Header & View Mode Switcher */}
      <div className="flex items-start justify-between gap-2.5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[17px] font-bold m-0">{titleByMode}</h2>
            <Chip>{caption}</Chip>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {viewMode === "accidents"
              ? "Jumlah kes kemalangan (Siasatan + Operasi)"
              : viewMode === "saman"
                ? "Pecahan saman unik mengikut kategori (POL 170 A vs POL 257)"
                : "Perbandingan jumlah kemalangan dengan saman unik dikeluarkan"}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Mod paparan graf trend"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--color-nav-bg)] border border-[var(--color-border)]"
        >
          {VIEW_MODES.map((m) => {
            const active = viewMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(m.id)}
                className={`cursor-pointer px-2.5 py-1 rounded-lg text-xs transition-colors ${
                  active
                    ? "bg-[var(--color-accent)] text-[#0b1629] font-bold"
                    : "text-[var(--color-text-secondary)] font-semibold hover:text-[var(--color-text-primary)]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--color-text-secondary)]">
        {viewMode !== "saman" && (
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block"
              style={{ background: "linear-gradient(#d8b665, #7a663d)" }}
            />
            <span>Kemalangan ({totals.accidents})</span>
          </div>
        )}
        {viewMode !== "accidents" && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs inline-block bg-sky-400" />
              <span>POL 170 A ({totals.pol170a})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs inline-block bg-violet-400" />
              <span>POL 257 ({totals.pol257})</span>
            </div>
            {hasUnset && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs inline-block bg-slate-400" />
                <span>Belum Ditetapkan ({totals.unset})</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bar Plot */}
      <div
        className="grid gap-3 max-[550px]:gap-1.5 items-end"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, mergedBuckets.length)}, minmax(0, 1fr))`,
        }}
      >
        {mergedBuckets.map((b) => {
          if (viewMode === "accidents") {
            return (
              <div
                key={b.label}
                className="flex flex-col items-center justify-end gap-1.5"
              >
                <div className="w-full h-[175px] flex items-end justify-center border-b border-[var(--color-bar-border)] pb-1">
                  <div
                    title={`${b.label}: ${b.accidents} kemalangan`}
                    className="w-full max-w-[46px] flex flex-col items-center justify-end"
                  >
                    <strong className="text-xs mb-1">{b.accidents}</strong>
                    <div
                      className="w-full rounded-t-[6px] transition-all duration-300"
                      style={{
                        height: `${barPx(b.accidents)}px`,
                        background: "linear-gradient(#d8b665, #7a663d)",
                        opacity: b.accidents > 0 ? 1 : 0.25,
                      }}
                    />
                  </div>
                </div>
                <small className="text-[var(--color-bar-label)] text-xs text-center truncate w-full">
                  {b.label}
                </small>
              </div>
            );
          }

          if (viewMode === "saman") {
            return (
              <div
                key={b.label}
                className="flex flex-col items-center justify-end gap-1.5"
              >
                <div className="w-full h-[175px] flex items-end justify-center gap-1.5 max-[550px]:gap-1 border-b border-[var(--color-bar-border)] pb-1">
                  <div
                    title={`${b.label} · POL 170 A: ${b.pol170a}`}
                    className="flex-1 max-w-[24px] flex flex-col items-center justify-end"
                  >
                    <strong className="text-[11px] text-sky-300 mb-1">
                      {b.pol170a}
                    </strong>
                    <div
                      className="w-full rounded-t-[5px] bg-sky-400 transition-all duration-300"
                      style={{
                        height: `${barPx(b.pol170a)}px`,
                        opacity: b.pol170a > 0 ? 1 : 0.2,
                      }}
                    />
                  </div>

                  <div
                    title={`${b.label} · POL 257: ${b.pol257}`}
                    className="flex-1 max-w-[24px] flex flex-col items-center justify-end"
                  >
                    <strong className="text-[11px] text-violet-300 mb-1">
                      {b.pol257}
                    </strong>
                    <div
                      className="w-full rounded-t-[5px] bg-violet-400 transition-all duration-300"
                      style={{
                        height: `${barPx(b.pol257)}px`,
                        opacity: b.pol257 > 0 ? 1 : 0.2,
                      }}
                    />
                  </div>

                  {hasUnset && (
                    <div
                      title={`${b.label} · Belum Ditetapkan: ${b.unset}`}
                      className="flex-1 max-w-[24px] flex flex-col items-center justify-end"
                    >
                      <strong className="text-[11px] text-slate-300 mb-1">
                        {b.unset}
                      </strong>
                      <div
                        className="w-full rounded-t-[5px] bg-slate-400 transition-all duration-300"
                        style={{
                          height: `${barPx(b.unset)}px`,
                          opacity: b.unset > 0 ? 1 : 0.2,
                        }}
                      />
                    </div>
                  )}
                </div>
                <small className="text-[var(--color-bar-label)] text-xs text-center truncate w-full">
                  {b.label}
                </small>
              </div>
            );
          }

          // Comparison mode: Kemalangan bar + stacked Saman bar side by side
          const samanHeightPx = barPx(b.samanTotal);
          const pol170Pct =
            b.samanTotal > 0 ? (b.pol170a / b.samanTotal) * 100 : 0;
          const pol257Pct =
            b.samanTotal > 0 ? (b.pol257 / b.samanTotal) * 100 : 0;
          const unsetPct =
            b.samanTotal > 0 ? (b.unset / b.samanTotal) * 100 : 0;

          return (
            <div
              key={b.label}
              className="flex flex-col items-center justify-end gap-1.5"
            >
              <div className="w-full h-[175px] flex items-end justify-center gap-1.5 max-[550px]:gap-1 border-b border-[var(--color-bar-border)] pb-1">
                <div
                  title={`${b.label} · Kemalangan: ${b.accidents}`}
                  className="flex-1 max-w-[26px] flex flex-col items-center justify-end"
                >
                  <strong className="text-[11px] text-[var(--color-accent)] mb-1">
                    {b.accidents}
                  </strong>
                  <div
                    className="w-full rounded-t-[5px] transition-all duration-300"
                    style={{
                      height: `${barPx(b.accidents)}px`,
                      background: "linear-gradient(#d8b665, #7a663d)",
                      opacity: b.accidents > 0 ? 1 : 0.22,
                    }}
                  />
                </div>

                <div
                  title={`${b.label} · Saman Unik: ${b.samanTotal} (POL 170 A: ${b.pol170a}, POL 257: ${b.pol257}${b.unset > 0 ? `, Belum Ditetapkan: ${b.unset}` : ""})`}
                  className="flex-1 max-w-[26px] flex flex-col items-center justify-end"
                >
                  <strong className="text-[11px] text-sky-300 mb-1">
                    {b.samanTotal}
                  </strong>
                  <div
                    className="w-full rounded-t-[5px] overflow-hidden flex flex-col-reverse bg-[#1c2b48] transition-all duration-300"
                    style={{
                      height: `${samanHeightPx}px`,
                      opacity: b.samanTotal > 0 ? 1 : 0.22,
                    }}
                  >
                    {b.pol170a > 0 && (
                      <div
                        className="w-full bg-sky-400"
                        style={{ height: `${pol170Pct}%` }}
                      />
                    )}
                    {b.pol257 > 0 && (
                      <div
                        className="w-full bg-violet-400"
                        style={{ height: `${pol257Pct}%` }}
                      />
                    )}
                    {b.unset > 0 && (
                      <div
                        className="w-full bg-slate-400"
                        style={{ height: `${unsetPct}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <small className="text-[var(--color-bar-label)] text-xs text-center truncate w-full">
                {b.label}
              </small>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="pt-2.5 border-t border-[var(--color-table-border)] flex items-center justify-between gap-2 flex-wrap text-[11px] text-[var(--color-text-secondary)]">
        <span>
          Jumlah Tempoh:{" "}
          <strong className="text-[var(--color-text-primary)]">
            {totals.accidents} kemalangan
          </strong>{" "}
          ·{" "}
          <strong className="text-[var(--color-accent-soft)]">
            {totals.samanTotal} saman unik
          </strong>{" "}
          (POL 170 A: {totals.pol170a}, POL 257: {totals.pol257}
          {hasUnset ? `, Belum Ditetapkan: ${totals.unset}` : ""})
        </span>
        <span>Nota: Nombor saman bertindih dinyahtindih secara automatik.</span>
      </div>
    </div>
  );
}
