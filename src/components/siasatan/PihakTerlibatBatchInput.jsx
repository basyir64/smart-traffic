import {
  VEHICLE_CATEGORIES,
  createEmptyPihakTerlibatRow,
} from "../../utils/siasatan";

/**
 * Repeatable batch input for Siasatan field `4. Kenderaan & Pemandu / Pejalan Kaki Terlibat`.
 * Styled after `SamanBatchInput.jsx` without CSV template/import controls.
 */
export default function PihakTerlibatBatchInput({
  value = [],
  onChange,
  disabled = false,
  fieldNumber = 4,
  validationErrors = {},
  inputPaddingClass = "py-2.5",
}) {
  const rows =
    Array.isArray(value) && value.length > 0
      ? value
      : [createEmptyPihakTerlibatRow()];

  const emit = (nextRows) => {
    if (onChange) {
      onChange(
        nextRows.length > 0 ? nextRows : [createEmptyPihakTerlibatRow()]
      );
    }
  };

  const updateRow = (idx, updater) => {
    const next = rows.map((row, i) => (i === idx ? updater(row) : row));
    emit(next);
  };

  const handleKategoriChange = (idx, nextKategori) => {
    updateRow(idx, (row) => {
      if (nextKategori === "Pejalan Kaki") {
        return {
          ...row,
          kategori_kenderaan: nextKategori,
          no_kenderaan: "",
          bilangan_penumpang: 0,
        };
      }
      return {
        ...row,
        kategori_kenderaan: nextKategori,
      };
    });
  };

  const handleAddRow = () => {
    emit([...rows, createEmptyPihakTerlibatRow()]);
  };

  const handleRemoveRow = (idx) => {
    if (rows.length <= 1) return;
    emit(rows.filter((_, i) => i !== idx));
  };

  const baseInputClass = `w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 ${inputPaddingClass} rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]`;
  const disabledInputClass = `w-full border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[#0d192e] px-3 ${inputPaddingClass} rounded-[9px] text-[13px] opacity-60 cursor-not-allowed focus:outline-none`;

  return (
    <div className="col-span-full flex flex-col gap-2.5 border border-[var(--color-border-light)] bg-[#0d192e]/60 rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-[var(--color-text-label)] font-semibold">
            {fieldNumber}. Kenderaan &amp; Pemandu / Pejalan Kaki Terlibat
          </label>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1c2b48] text-[var(--color-accent-soft)] border border-[#364d75] font-semibold">
            {rows.length} pihak terlibat
          </span>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={handleAddRow}
          className="cursor-pointer border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
        >
          + Tambah Pihak Terlibat
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row, idx) => {
          const isPedestrian = row.kategori_kenderaan === "Pejalan Kaki";
          const isBicycle = row.kategori_kenderaan === "Basikal";
          const rowError = validationErrors[idx];

          return (
            <div
              key={idx}
              className={`border ${
                rowError ? "border-red-500/80" : "border-[var(--color-border)]"
              } bg-[#091327]/70 rounded-xl p-3 flex flex-col gap-2.5`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-accent-soft)]">
                    {idx + 1}. Pihak Terlibat #{idx + 1}
                  </span>
                  {isPedestrian && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/35 font-semibold">
                      Pejalan Kaki
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={disabled || rows.length <= 1}
                  onClick={() => handleRemoveRow(idx)}
                  title={
                    rows.length <= 1
                      ? "Sekurang-kurangnya 1 pihak terlibat diperlukan"
                      : "Padam baris pihak terlibat ini"
                  }
                  aria-label={`Padam pihak terlibat ${idx + 1}`}
                  className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:text-red-300 hover:border-red-500/60 bg-[var(--color-nav-bg)] w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 max-[900px]:grid-cols-2 max-[550px]:grid-cols-1 gap-2.5">
                {/* Kategori Kenderaan */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--color-text-label)] font-semibold">
                    Kategori Kenderaan
                  </label>
                  <select
                    value={row.kategori_kenderaan || "Motosikal"}
                    onChange={(e) => handleKategoriChange(idx, e.target.value)}
                    disabled={disabled}
                    required
                    aria-label={`Kategori Kenderaan ${idx + 1}`}
                    className={baseInputClass}
                  >
                    {VEHICLE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* No. Kenderaan */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-1">
                    <span>No. Kenderaan</span>
                    {isPedestrian ? (
                      <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
                        Tidak berkaitan
                      </span>
                    ) : isBicycle ? (
                      <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
                        Pilihan
                      </span>
                    ) : null}
                  </label>
                  <input
                    type="text"
                    value={isPedestrian ? "" : row.no_kenderaan || ""}
                    onChange={(e) =>
                      updateRow(idx, (r) => ({
                        ...r,
                        no_kenderaan: e.target.value,
                      }))
                    }
                    disabled={disabled || isPedestrian}
                    required={!isPedestrian && !isBicycle}
                    placeholder={
                      isPedestrian
                        ? "Dinyahaktif (Pejalan Kaki)"
                        : isBicycle
                          ? "Pilihan (jika ada)"
                          : "Contoh: VAB 1234"
                    }
                    aria-label={`No. Kenderaan ${idx + 1}`}
                    className={
                      isPedestrian
                        ? disabledInputClass
                        : `${baseInputClass} uppercase placeholder:normal-case`
                    }
                  />
                </div>

                {/* No. IC */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--color-text-label)] font-semibold">
                    No. IC
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.no_ic ?? ""}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "");
                      updateRow(idx, (r) => ({ ...r, no_ic: digitsOnly }));
                    }}
                    disabled={disabled}
                    required
                    placeholder="Contoh: 040812085123"
                    aria-label={`No. IC ${idx + 1}`}
                    className={baseInputClass}
                  />
                </div>

                {/* Nama */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--color-text-label)] font-semibold">
                    Nama
                  </label>
                  <input
                    type="text"
                    value={row.nama || ""}
                    onChange={(e) =>
                      updateRow(idx, (r) => ({ ...r, nama: e.target.value }))
                    }
                    disabled={disabled}
                    required
                    placeholder="Nama penuh (simulasi)"
                    aria-label={`Nama ${idx + 1}`}
                    className={`${baseInputClass} uppercase placeholder:normal-case`}
                  />
                </div>

                {/* Umur */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--color-text-label)] font-semibold">
                    Umur
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    inputMode="numeric"
                    value={row.umur ?? ""}
                    onChange={(e) =>
                      updateRow(idx, (r) => ({ ...r, umur: e.target.value }))
                    }
                    disabled={disabled}
                    required
                    placeholder="Contoh: 31"
                    aria-label={`Umur ${idx + 1}`}
                    className={baseInputClass}
                  />
                </div>

                {/* Bilangan Penumpang */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-1">
                    <span>Bilangan Penumpang</span>
                    <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
                      {isPedestrian ? "Tetap 0" : "Tidak termasuk pemandu"}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={isPedestrian ? 0 : row.bilangan_penumpang ?? 0}
                    onChange={(e) =>
                      updateRow(idx, (r) => ({
                        ...r,
                        bilangan_penumpang: e.target.value,
                      }))
                    }
                    disabled={disabled || isPedestrian}
                    required={!isPedestrian}
                    aria-label={`Bilangan Penumpang ${idx + 1}`}
                    className={isPedestrian ? disabledInputClass : baseInputClass}
                  />
                </div>
              </div>

              {rowError && (
                <div className="text-[11px] text-red-300">{rowError}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
