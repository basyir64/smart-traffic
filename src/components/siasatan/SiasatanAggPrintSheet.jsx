import { Fragment } from "react";
import { createPortal } from "react-dom";
import { COLLAPSIBLE_NINE_ELEMENTS } from "../../utils/siasatan";
import { PRINT_BRAND_TITLE, PRINT_FOOTER_MOTTO } from "../../utils/branding";
import { formatPeriodIndicatorBM } from "../../hooks/usePeriodData";

/**
 * Renders a compact single-page white-paper A4 Portrait HTML report of 9 Elemen Data Kemalangan
 * with Elements 1–3 as a 3-column summary bar and Elements 4–9 split evenly into 2 side-by-side
 * expanded tables (including zero-count categories) for PDF printing.
 */
export default function SiasatanAggPrintSheet({ report }) {
  if (!report || typeof document === "undefined") {
    return null;
  }

  const portalRoot = document.getElementById("siasatan-agg-print-root");
  if (!portalRoot) {
    return null;
  }

  const { summary, subItemsByElement = {}, period = "all", printedAt = "-" } =
    report;

  const getParentValue = (elementNumber) => {
    if (elementNumber === 6) return `${summary?.animalCases ?? 0} kes`;
    if (elementNumber === 7) return `${summary?.totalVehicles ?? 0} kenderaan`;
    return "";
  };

  const leftElements = COLLAPSIBLE_NINE_ELEMENTS.filter(
    ({ number }) => number <= 7
  );
  const rightElements = COLLAPSIBLE_NINE_ELEMENTS.filter(
    ({ number }) => number >= 8
  );

  const renderElementTable = (elements) => (
    <table className="siasatan-agg-print-table">
      <thead>
        <tr>
          <th>Elemen</th>
          <th>Petunjuk</th>
        </tr>
      </thead>
      <tbody>
        {elements.map(({ number, title }) => {
          const children = subItemsByElement[number] || [];
          return (
            <Fragment key={number}>
              <tr className="siasatan-print-row-keep siasatan-agg-print-parent">
                <td>{title}</td>
                <td>{getParentValue(number)}</td>
              </tr>
              {children.map((child, idx) => (
                <tr
                  key={`${number}-${idx}`}
                  className="siasatan-print-row-keep siasatan-agg-print-child"
                >
                  <td>{child.label}</td>
                  <td>{child.value}</td>
                </tr>
              ))}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );

  return createPortal(
    <div className="siasatan-print-sheet" aria-hidden="true">
      <div className="siasatan-print-header">
        <div>
          <div className="siasatan-print-eyebrow">
            PDRM · BSPT · INOVASI IPD
          </div>
          <h1 className="siasatan-print-title">
            {PRINT_BRAND_TITLE} — LAPORAN 9 ELEMEN DATA KEMALANGAN
          </h1>
          <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
            Ringkasan Agregat Kemalangan Jalan Raya (Berdasarkan Tarikh
            Kemalangan)
          </div>
        </div>
        <div className="siasatan-print-meta">
          <div>
            <strong>Tempoh Data:</strong> {formatPeriodIndicatorBM(period)}
          </div>
          <div>
            <strong>Tarikh / Masa Cetakan:</strong> {printedAt}
          </div>
        </div>
      </div>

      <div className="siasatan-print-banner">
        ● DATA SIMULASI — BUKAN IPRS SEBENAR
      </div>

      <table className="siasatan-agg-kpi-table">
        <thead>
          <tr>
            <th>1. Jumlah kemalangan</th>
            <th>2. Kemalangan maut</th>
            <th>3. Jumlah kematian</th>
          </tr>
        </thead>
        <tbody>
          <tr className="siasatan-print-row-keep">
            <td>{summary?.totalCases ?? 0} kes</td>
            <td>{summary?.fatalCases ?? 0} kes</td>
            <td>{summary?.totalDeaths ?? 0} nyawa</td>
          </tr>
        </tbody>
      </table>

      <div className="siasatan-agg-print-cols">
        <div className="siasatan-agg-print-col">
          {renderElementTable(leftElements)}
        </div>
        <div className="siasatan-agg-print-col">
          {renderElementTable(rightElements)}
        </div>
      </div>

      <div className="siasatan-print-footer">
        <span>
          PROTOTAIP KONSEP · PDRM · BSPT · Data simulasi untuk semakan dalaman
          sahaja. Tiada sambungan langsung ke IPRS sebenar.
        </span>
        <span className="siasatan-print-footer-brand">
          {PRINT_FOOTER_MOTTO}
        </span>
      </div>
    </div>,
    portalRoot
  );
}
