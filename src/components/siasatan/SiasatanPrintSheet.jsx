import { createPortal } from "react-dom";
import { buildSiasatanPrintModel } from "../../utils/siasatan";
import { PRINT_FOOTER_MOTTO } from "../../utils/branding";

/**
 * Renders a printer-friendly A4 white-paper HTML table for a single Siasatan record
 * into `#siasatan-print-root` via React Portal so `@media print` hides the dark UI shell.
 */
export default function SiasatanPrintSheet({
  record,
  selectedLocation = null,
  printedAt = "",
}) {
  if (!record || typeof document === "undefined") {
    return null;
  }

  const portalRoot = document.getElementById("siasatan-print-root");
  if (!portalRoot) {
    return null;
  }

  const model = buildSiasatanPrintModel(record, selectedLocation, printedAt);

  return createPortal(
    <div className="siasatan-print-sheet" aria-hidden="true">
      <div className="siasatan-print-header">
        <div>
          <div className="siasatan-print-eyebrow">{model.eyebrow}</div>
          <h1 className="siasatan-print-title">{model.title}</h1>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>
            Borang Input Data Siasatan — Salinan Cetakan Rekod Tunggal
          </div>
        </div>
        <div className="siasatan-print-meta">
          <div>
            <strong>ID Rekod:</strong> {model.documentId}
          </div>
          <div>
            <strong>Tarikh / Masa Cetakan:</strong> {model.printedAt}
          </div>
        </div>
      </div>

      <div className="siasatan-print-banner">{model.bannerText}</div>

      <table className="siasatan-print-table">
        <tbody>
          {model.fieldsTop.map((field) => (
            <tr key={field.label} className="siasatan-print-row-keep">
              <th scope="row" className="siasatan-print-label">
                {field.label}
              </th>
              <td>{field.value}</td>
            </tr>
          ))}

          <tr className="siasatan-print-row-keep">
            <th colSpan={2} className="siasatan-print-section-cell">
              {model.partiesTitle}
            </th>
          </tr>
          <tr>
            <td colSpan={2} style={{ padding: "6px" }}>
              <table className="siasatan-print-subtable">
                <thead>
                  <tr>
                    <th>Bil.</th>
                    <th>Kategori Kenderaan</th>
                    <th>No. Kenderaan</th>
                    <th>No. IC</th>
                    <th>Nama</th>
                    <th>Umur</th>
                    <th>Bilangan Penumpang</th>
                  </tr>
                </thead>
                <tbody>
                  {model.parties.map((party) => (
                    <tr key={party.index} className="siasatan-print-row-keep">
                      <td>{party.index}</td>
                      <td>{party.kategori_kenderaan}</td>
                      <td>{party.no_kenderaan}</td>
                      <td>{party.no_ic}</td>
                      <td>{party.nama}</td>
                      <td>{party.umur}</td>
                      <td>{party.bilangan_penumpang}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>

          {model.fieldsBottom.map((field) => (
            <tr key={field.label} className="siasatan-print-row-keep">
              <th
                scope="row"
                className={
                  field.isSubField
                    ? "siasatan-print-sublabel"
                    : "siasatan-print-label"
                }
              >
                {field.label}
              </th>
              <td>{field.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
