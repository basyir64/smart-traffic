import { ROAD_TYPES } from "../../utils/locations";

/**
 * Shared conditional `Nama Jalan` and `Jenis Jalan` sub-fields rendered immediately
 * under `5. Lokasi Hotspot / Jalan` in `SiasatanForm` and `SiasatanTable` edit modal.
 * Locked read-only for master locations; enabled for manual entry when `"Lain-lain"` is active.
 */
export default function SiasatanRoadFields({
  idPrefix = "siasatan",
  isCustom = false,
  namaJalan = "",
  jenisJalan = "",
  onNamaJalanChange,
  onJenisJalanChange,
  disabled = false,
  inputPaddingClass = "py-2.5",
}) {
  const inputBaseClass = `w-full px-3 ${inputPaddingClass} rounded-[9px] text-[13px]`;
  const readOnlyClass = `${inputBaseClass} border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[#0d192e] cursor-not-allowed focus:outline-none`;
  const editableClass = `${inputBaseClass} border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] focus:outline-none focus:border-[var(--color-accent)]`;
  const modeHint = isCustom ? "Input Manual" : "Auto (Tidak boleh diubah)";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}NamaJalan`}
          className="text-xs text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-2"
        >
          <span>Nama Jalan</span>
          <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
            {modeHint}
          </span>
        </label>
        {isCustom ? (
          <input
            id={`${idPrefix}NamaJalan`}
            type="text"
            value={namaJalan}
            onChange={(e) => onNamaJalanChange?.(e.target.value)}
            placeholder="Contoh: JALAN KAMPUNG GAJAH / KM12 JALAN PARIT"
            required
            disabled={disabled}
            className={`${editableClass} uppercase placeholder:normal-case`}
          />
        ) : (
          <input
            id={`${idPrefix}NamaJalan`}
            type="text"
            readOnly
            aria-readonly="true"
            value={namaJalan}
            placeholder="-"
            className={readOnlyClass}
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}JenisJalan`}
          className="text-xs text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-2"
        >
          <span>Jenis Jalan</span>
          <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
            {modeHint}
          </span>
        </label>
        {isCustom ? (
          <select
            id={`${idPrefix}JenisJalan`}
            value={jenisJalan}
            onChange={(e) => onJenisJalanChange?.(e.target.value)}
            required
            disabled={disabled}
            className={editableClass}
          >
            <option value="">-- Pilih Jenis Jalan --</option>
            {ROAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`${idPrefix}JenisJalan`}
            type="text"
            readOnly
            aria-readonly="true"
            value={jenisJalan}
            placeholder="-"
            className={readOnlyClass}
          />
        )}
      </div>
    </>
  );
}
