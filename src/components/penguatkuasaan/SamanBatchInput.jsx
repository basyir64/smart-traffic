import { useMemo, useRef, useState } from "react";
import {
  SAMAN_CATEGORIES,
  UNSET_SAMAN_CATEGORY,
  deduplicateSamanObjects,
  normalizeSamanCategory,
} from "../../utils/saman";

/**
 * Parses a single RFC-4180 CSV line supporting quoted values with commas.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parses and validates CSV text with required headers `no,nombor_saman,kategori_saman`.
 * Normalizes category casing/spacing variants and rejects invalid/blank rows with
 * row-numbered Bahasa Melayu error messages.
 */
function parseSamanCsv(text) {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { error: "Fail CSV kosong." };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const noIdx = headers.indexOf("no");
  const samanIdx = headers.indexOf("nombor_saman");
  const katIdx = headers.indexOf("kategori_saman");

  if (noIdx === -1 || samanIdx === -1 || katIdx === -1) {
    return {
      error:
        'Pengepala CSV mesti mengandungi lajur "no", "nombor_saman", dan "kategori_saman". Muat turun templat CSV untuk format yang tepat.',
    };
  }

  if (lines.length < 2) {
    return {
      error: "Tiada baris data dijumpai di bawah pengepala CSV.",
    };
  }

  const parsed = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const rawNo = (cols[noIdx] ?? "").trim();
    const rawSaman = (cols[samanIdx] ?? "").trim();
    const rawKat = (cols[katIdx] ?? "").trim();

    if (!rawNo && !rawSaman && !rawKat) {
      continue;
    }

    const rowNum = i + 1;
    if (!/^\d+$/.test(rawNo) || Number(rawNo) < 1) {
      return {
        error: `Baris ${rowNum} CSV: Lajur "no" mesti nombor bulat positif (1, 2, 3...).`,
      };
    }

    if (!rawSaman) {
      return {
        error: `Baris ${rowNum} CSV: Lajur "nombor_saman" tidak boleh kosong.`,
      };
    }

    const canonicalKat = normalizeSamanCategory(rawKat);
    if (!rawKat) {
      return {
        error: `Baris ${rowNum} CSV: Lajur "kategori_saman" tidak boleh kosong. Gunakan "POL 170 A" atau "POL 257".`,
      };
    }
    if (!canonicalKat) {
      return {
        error: `Baris ${rowNum} CSV: Kategori Saman "${rawKat}" tidak sah. Hanya "POL 170 A" atau "POL 257" dibenarkan.`,
      };
    }

    parsed.push({
      seq: Number(rawNo),
      no_saman: rawSaman,
      kategori_saman: canonicalKat,
    });
  }

  if (parsed.length === 0) {
    return {
      error: "Tiada nombor saman yang sah dijumpai dalam fail CSV.",
    };
  }

  parsed.sort((a, b) => a.seq - b.seq);
  const { result, duplicateCount } = deduplicateSamanObjects(parsed);

  return { entries: result, duplicateCount };
}

export default function SamanBatchInput({
  value = [{ no_saman: "", kategori_saman: "" }],
  onChange,
  disabled = false,
  fieldNumber = 9,
  validationErrors = {},
}) {
  const fileInputRef = useRef(null);
  const [csvError, setCsvError] = useState("");
  const [csvNotice, setCsvNotice] = useState("");
  const [pendingCsv, setPendingCsv] = useState(null);

  const rows = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.map((item) => {
        if (typeof item === "string") {
          return { no_saman: item, kategori_saman: "" };
        }
        return {
          no_saman: item?.no_saman ?? "",
          kategori_saman: item?.kategori_saman ?? "",
        };
      });
    }
    return [{ no_saman: "", kategori_saman: "" }];
  }, [value]);

  const emit = (nextRows) => {
    if (onChange) {
      onChange(
        nextRows.length > 0
          ? nextRows
          : [{ no_saman: "", kategori_saman: "" }]
      );
    }
  };

  const handleNoChange = (index, nextNo) => {
    const next = rows.map((row, idx) =>
      idx === index ? { ...row, no_saman: nextNo } : row
    );
    emit(next);
  };

  const handleKategoriChange = (index, nextKat) => {
    const next = rows.map((row, idx) =>
      idx === index ? { ...row, kategori_saman: nextKat } : row
    );
    emit(next);
  };

  const handleAddRow = () => {
    emit([...rows, { no_saman: "", kategori_saman: "" }]);
  };

  const handleRemoveRow = (index) => {
    if (rows.length <= 1) {
      emit([{ no_saman: "", kategori_saman: "" }]);
      return;
    }
    const next = rows.filter((_, idx) => idx !== index);
    emit(next);
  };

  const handleDownloadTemplate = () => {
    const templateCsv = "\ufeffno,nombor_saman,kategori_saman\r\n";
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "templat_saman_penguatkuasaan.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCsvError("");
    setCsvNotice("");
    setPendingCsv(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      const parsed = parseSamanCsv(content);
      if (parsed.error) {
        setCsvError(parsed.error);
        return;
      }

      const existingFilled = rows.filter((r) => r.no_saman.trim().length > 0);
      if (existingFilled.length === 0) {
        emit(parsed.entries);
        const dupNote =
          parsed.duplicateCount > 0
            ? ` (${parsed.duplicateCount} pendua digugurkan)`
            : "";
        setCsvNotice(
          `${parsed.entries.length} rekod saman diimport dari "${file.name}"${dupNote}.`
        );
      } else {
        setPendingCsv({
          fileName: file.name,
          entries: parsed.entries,
          duplicateCount: parsed.duplicateCount,
        });
      }
    };
    reader.onerror = () => {
      setCsvError("Gagal membaca fail CSV. Sila cuba lagi.");
    };
    reader.readAsText(file);
  };

  const applyCsvEntries = (mode) => {
    if (!pendingCsv) return;
    if (mode === "replace") {
      emit(pendingCsv.entries);
      setCsvNotice(
        `Senarai digantikan dengan ${pendingCsv.entries.length} rekod saman dari "${pendingCsv.fileName}".`
      );
    } else if (mode === "append") {
      const existingNonEmpty = rows.filter((r) => r.no_saman.trim().length > 0);
      const { result, duplicateCount } = deduplicateSamanObjects([
        ...existingNonEmpty,
        ...pendingCsv.entries,
      ]);
      const addedCount = result.length - existingNonEmpty.length;
      emit(result);
      setCsvNotice(
        `${addedCount} rekod saman baharu ditambah dari "${pendingCsv.fileName}"${
          duplicateCount > 0 ? ` (${duplicateCount} pendua dilangkau)` : ""
        }.`
      );
    }
    setPendingCsv(null);
  };

  const filledCount = rows.filter((r) => r.no_saman.trim().length > 0).length;

  const duplicateCounts = useMemo(() => {
    const counts = new Map();
    rows.forEach((r) => {
      const key = r.no_saman.trim().toUpperCase();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [rows]);

  return (
    <div className="col-span-full flex flex-col gap-2 border border-[var(--color-border-light)] bg-[#0d192e]/60 rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-label)] font-semibold">
            {fieldNumber}. Saman
          </label>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1c2b48] text-[var(--color-accent-soft)] border border-[#364d75] font-semibold">
            {filledCount} direkodkan
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFilePicked}
            disabled={disabled}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={handleDownloadTemplate}
            title="Muat turun templat CSV kosong (no, nombor_saman, kategori_saman)"
            className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            ↓ Muat Turun Templat CSV
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            title="Import fail CSV (lajur: no, nombor_saman, kategori_saman)"
            className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            ↑ Import CSV
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddRow}
            className="cursor-pointer border border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/25 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            + Tambah Saman
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-text-secondary)]">
        Format CSV: lajur{" "}
        <code className="text-[var(--color-accent-soft)]">no</code>,{" "}
        <code className="text-[var(--color-accent-soft)]">nombor_saman</code>{" "}
        dan{" "}
        <code className="text-[var(--color-accent-soft)]">
          kategori_saman
        </code>{" "}
        (POL 170 A atau POL 257).
      </p>

      {csvError && (
        <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
          {csvError}
        </div>
      )}

      {csvNotice && (
        <div className="p-2.5 bg-sky-950/50 border border-sky-800/70 rounded-lg text-sky-200 text-xs">
          {csvNotice}
        </div>
      )}

      {pendingCsv && (
        <div className="p-3 bg-amber-950/40 border border-amber-700/70 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
          <div className="text-amber-100">
            <strong>{pendingCsv.entries.length}</strong> rekod saman dibaca dari{" "}
            <strong>{pendingCsv.fileName}</strong>. Anda sudah mempunyai saman
            dalam senarai — pilih tindakan:
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyCsvEntries("replace")}
              className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] px-2.5 py-1.5 rounded-lg font-bold hover:brightness-110"
            >
              Ganti Senarai
            </button>
            <button
              type="button"
              onClick={() => applyCsvEntries("append")}
              className="cursor-pointer border border-[var(--color-accent)]/60 text-[var(--color-accent)] bg-[var(--color-nav-bg)] px-2.5 py-1.5 rounded-lg font-semibold hover:bg-[var(--color-accent)]/15"
            >
              Tambah ke Senarai
            </button>
            <button
              type="button"
              onClick={() => setPendingCsv(null)}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-secondary)] px-2 py-1.5 rounded-lg hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {rows.map((row, idx) => {
          const rowError = validationErrors[idx];
          const key = row.no_saman.trim().toUpperCase();
          const isLiveDuplicate = key && (duplicateCounts.get(key) || 0) > 1;

          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 max-[550px]:flex-wrap">
                <span className="w-7 text-right text-xs font-semibold text-[var(--color-text-secondary)] shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={row.no_saman}
                  onChange={(e) => handleNoChange(idx, e.target.value)}
                  disabled={disabled}
                  placeholder={`Cth: SMN-2026-0040${idx + 1}`}
                  aria-label={`Nombor saman ${idx + 1}`}
                  className={`flex-1 min-w-[140px] border ${
                    rowError
                      ? "border-red-500/80"
                      : isLiveDuplicate
                        ? "border-amber-500/70"
                        : "border-[var(--color-border-light)]"
                  } text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]`}
                />
                <select
                  value={row.kategori_saman}
                  onChange={(e) => handleKategoriChange(idx, e.target.value)}
                  disabled={disabled}
                  aria-label={`Kategori saman ${idx + 1}`}
                  className={`w-48 max-[550px]:flex-1 border ${
                    rowError
                      ? "border-red-500/80"
                      : "border-[var(--color-border-light)]"
                  } text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]`}
                >
                  <option value="">-- Pilih Kategori Saman --</option>
                  {row.kategori_saman === UNSET_SAMAN_CATEGORY && (
                    <option value={UNSET_SAMAN_CATEGORY}>
                      {UNSET_SAMAN_CATEGORY} (Rekod Lama)
                    </option>
                  )}
                  {SAMAN_CATEGORIES.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={
                    disabled ||
                    (rows.length === 1 && !row.no_saman && !row.kategori_saman)
                  }
                  onClick={() => handleRemoveRow(idx)}
                  title="Padam baris ini"
                  aria-label={`Padam saman ${idx + 1}`}
                  className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:text-red-300 hover:border-red-500/60 bg-[var(--color-nav-bg)] w-8 h-9 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  ✕
                </button>
              </div>
              {rowError ? (
                <div className="pl-9 text-[11px] text-red-300">{rowError}</div>
              ) : isLiveDuplicate ? (
                <div className="pl-9 text-[11px] text-amber-300">
                  Amaran: Nombor saman ini berulang dalam senarai.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
