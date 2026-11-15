import { createPortal } from "react-dom";
import {
  normalizeSamanList,
  summarizeSamanCategories,
  formatSamanCategoryBreakdown,
  aggregatePeriodSaman,
} from "../../utils/saman";
import { formatPeriodIndicatorBM } from "../../hooks/usePeriodData";

/**
 * Renders a printer-friendly A4 Landscape multi-page HTML table of all Penguatkuasaan
 * records matching the active period and sort order into `#penguatkuasaan-print-root`.
 */
export default function PenguatkuasaanPrintSheet({ report }) {
  if (!report || typeof document === "undefined") {
    return null;
  }

  const portalRoot = document.getElementById("penguatkuasaan-print-root");
  if (!portalRoot) {
    return null;
  }

  const {
    operations = [],
    period = "all",
    sortOrder = "desc",
    printedAt = "-",
  } = report;

  const totalTangkapan = operations.reduce(
    (sum, op) => sum + Math.max(0, Number(op.tangkapan ?? 0)),
    0
  );
  const totalSita = operations.reduce(
    (sum, op) => sum + Math.max(0, Number(op.sita ?? 0)),
    0
  );
  const totalRawSaman = operations.reduce(
    (sum, op) => sum + normalizeSamanList(op.saman_list).length,
    0
  );
  const uniqueSamanAgg = aggregatePeriodSaman([], operations);

  return createPortal(
    <div className="siasatan-print-sheet" aria-hidden="true">
      <div className="siasatan-print-header">
        <div>
          <div className="siasatan-print-eyebrow">
            PDRM · BSPT · INOVASI IPD
          </div>
          <h1 className="siasatan-print-title">
            SMART TRAFFIC AI — SENARAI REKOD PENGUATKUASAAN
          </h1>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
            Laporan Lengkap Operasi Penguatkuasaan Lalu Lintas (
            {operations.length} Operasi)
          </div>
        </div>
        <div className="siasatan-print-meta">
          <div>
            <strong>Tempoh Data:</strong> {formatPeriodIndicatorBM(period)}
          </div>
          <div>
            <strong>Susunan Tarikh:</strong>{" "}
            {sortOrder === "asc" ? "Terlama dahulu (↑)" : "Terkini dahulu (↓)"}
          </div>
          <div>
            <strong>Tarikh / Masa Cetakan:</strong> {printedAt}
          </div>
        </div>
      </div>

      <div className="siasatan-print-banner">
        ● DATA SIMULASI — BUKAN IPRS SEBENAR
      </div>

      <table className="penguatkuasaan-print-table">
        <thead>
          <tr>
            <th style={{ width: "4%" }}>Bil.</th>
            <th style={{ width: "9%" }}>Tarikh</th>
            <th style={{ width: "19%" }}>Lokasi</th>
            <th style={{ width: "10%" }}>Jenis Operasi</th>
            <th style={{ width: "11%" }}>Kat. Kemalangan</th>
            <th style={{ width: "7%" }}>Tangkapan</th>
            <th style={{ width: "6%" }}>Sita</th>
            <th style={{ width: "24%" }}>Saman</th>
            <th style={{ width: "10%" }}>Masa</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((op, idx) => {
            const samanList = normalizeSamanList(op.saman_list);
            const samanSummary = summarizeSamanCategories(samanList);
            const breakdown = formatSamanCategoryBreakdown(samanSummary);

            return (
              <tr key={op.id || idx} className="siasatan-print-row-keep">
                <td>{idx + 1}</td>
                <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                  {op.tarikh || "-"}
                </td>
                <td>
                  <span>{op.location_name || "-"}</span>
                  {op.is_custom_location && (
                    <span className="print-custom-badge">Lain-lain</span>
                  )}
                </td>
                <td>{op.jenis_operasi || "-"}</td>
                <td>{op.kategori_kemalangan || "-"}</td>
                <td>{Number(op.tangkapan ?? 0)}</td>
                <td>{Number(op.sita ?? 0)}</td>
                <td>
                  {samanSummary.total > 0 ? (
                    <div>
                      <div>
                        <strong>{samanSummary.total} saman</strong>
                        {breakdown.length > 0 && (
                          <span> · {breakdown.join(" · ")}</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "8.5px",
                          color: "#334155",
                          marginTop: "2px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {samanList.map((s) => s.no_saman).join(", ")}
                      </div>
                    </div>
                  ) : (
                    <span>0</span>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {op.jam_mula || "-"}–{op.jam_akhir || "-"}
                </td>
              </tr>
            );
          })}

          <tr className="siasatan-print-row-keep penguatkuasaan-print-summary-row">
            <td colSpan={5}>JUMLAH ({operations.length} operasi)</td>
            <td>{totalTangkapan}</td>
            <td>{totalSita}</td>
            <td>
              {totalRawSaman} saman ({uniqueSamanAgg.total} unik)
            </td>
            <td>-</td>
          </tr>
        </tbody>
      </table>

      <div className="siasatan-print-footer">
        <span>
          PROTOTAIP KONSEP · PDRM · BSPT · Data simulasi untuk semakan dalaman
          sahaja. Tiada sambungan langsung ke IPRS sebenar.
        </span>
        <span>SMART TRAFFIC AI</span>
      </div>
    </div>,
    portalRoot
  );
}
