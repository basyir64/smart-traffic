import { useState, useEffect } from "react";
import { isHotspotLocation } from "../../utils/locations";
import Chip from "../shared/Chip";

export const HOTSPOT_PAGE_SIZE = 5;

export default function HotspotList({
  locations = [],
  selectedLocationId,
  onSelectLocation,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const sortedActive = [...locations]
    .filter((l) => l.active)
    .sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0));

  const totalCount = sortedActive.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / HOTSPOT_PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * HOTSPOT_PAGE_SIZE;
  const pageLocations = sortedActive.slice(
    startIndex,
    startIndex + HOTSPOT_PAGE_SIZE
  );

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2.5 mb-4">
          <h2 className="text-[17px] font-bold m-0">Hotspot Keutamaan</h2>
          <Chip>Disusun mengikut risiko</Chip>
        </div>

        <div className="space-y-2">
          {pageLocations.map((loc, idx) => {
            const rankNumber = startIndex + idx + 1;
            const isSelected = loc.id === selectedLocationId;
            const isBlackspot = Boolean(loc.is_blackspot);
            const isHotspot = isHotspotLocation(loc);
            const risk = loc.risk ?? loc.risk_score ?? 70;
            const cases = loc.cases ?? 0;
            const opsCount = loc.ops_count ?? 0;
            const peakTime = loc.peak_time || "18:00–22:00";

            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelectLocation(loc.id)}
                className={`w-full flex items-center justify-between text-left gap-3 rounded-[9px] p-2.5 border cursor-pointer transition-colors ${
                  isSelected
                    ? "border-[var(--color-border-active)] bg-[var(--color-surface-active)] text-[#e9f1ff]"
                    : "border-[var(--color-loc-border)] bg-[var(--color-loc-bg)] text-[#e9f1ff] hover:border-[var(--color-border-active)]/60"
                }`}
              >
                <span>
                  <b className="text-[13px] block">
                    {rankNumber}. {loc.name}
                    {isBlackspot ? " ⚫" : ""}
                    {isHotspot ? " 🔥" : ""}
                  </b>
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {cases} kes · {peakTime}
                    {opsCount ? ` · ${opsCount} op` : ""}
                  </span>
                </span>
                <strong className="text-sm shrink-0">{risk}/100</strong>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > HOTSPOT_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-[var(--color-table-border)] text-xs">
          <span className="text-[var(--color-text-secondary)]">
            Memaparkan{" "}
            <b className="text-[var(--color-text-primary)]">
              {startIndex + 1}–
              {Math.min(startIndex + pageLocations.length, totalCount)}
            </b>{" "}
            daripada{" "}
            <b className="text-[var(--color-text-primary)]">{totalCount}</b>{" "}
            lokasi
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`cursor-pointer border px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    currentPage === pageNum
                      ? "bg-[var(--color-accent)] text-[#0b1629] border-[var(--color-accent)]"
                      : "border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {pageNum}
                </button>
              )
            )}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Seterusnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
