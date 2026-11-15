import { useState, useRef, useId } from "react";

/**
 * Parse a single CSV line respecting quoted fields and escaped quotes ("").
 */
function parseCsvLine(line) {
  const cells = [];
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
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse a CSV string with headers `no, nombor_saman` into ordered, deduplicated
 * saman strings.
 */
function parseSamanCsv(text) {
  const cleanText = String(text || "").replace(/^\uFEFF/, "");
  const lines = cleanText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Fail CSV kosong.");
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const noIdx = headers.indexOf("no");
  const samanIdx = headers.indexOf("nombor_saman");

  if (noIdx === -1 || samanIdx === -1) {
    throw new Error(
      'Header CSV tidak sah. Pastikan lajur "no" dan "nombor_saman" wujud pada baris pertama.'
    );
  }

  const parsedEntries = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const rawNo = cols[noIdx] ?? "";
    const rawSaman = (cols[samanIdx] ?? "").trim();
    if (!rawSaman) continue;

    const parsedNum = Number(rawNo);
    parsedEntries.push({
      seq: rawNo !== "" && !Number.isNaN(parsedNum) ? parsedNum : Number.MAX_SAFE_INTEGER,
      order: i,
      saman: rawSaman,
    });
  }

  parsedEntries.sort((a, b) => a.seq - b.seq || a.order - b.order);

  const seen = new Set();
  const rows = [];
  let duplicateCount = 0;

  for (const entry of parsedEntries) {
    const key = entry.saman.toUpperCase();
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    rows.push(entry.saman);
  }

  if (rows.length === 0) {
    throw new Error(
      "Tiada nombor saman yang sah ditemui dalam fail CSV tersebut."
    );
  }

  return { rows, duplicateCount };
}

function deduplicateList(list) {
  const seen = new Set();
  const result = [];
  let duplicateCount = 0;

  for (const raw of list) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return { result, duplicateCount };
}

/**
 * Reusable numbered batch saman input with dynamic row addition/removal and
 * CSV import (`no, nombor_saman`), shared by `PenguatkuasaanForm` and
 * `PenguatkuasaanTable`'s edit modal.
 */
export default function SamanBatchInput({
  value = [""],
  onChange,
  disabled = false,
  fieldNumber = 9,
}) {
  const uid = useId();
  const fileInputRef = useRef(null);
  const [csvError, setCsvError] = useState("");
  const [csvNotice, setCsvNotice] = useState("");
  const [pendingImport, setPendingImport] = useState(null);

  const rows = value.length > 0 ? value : [""];
  const nonEmptyCount = rows.filter((r) => r.trim() !== "").length;

  const handleRowChange = (index, nextVal) => {
    const updated = [...rows];
    updated[index] = nextVal;
    onChange(updated);
  };

  const handleAddRow = () => {
    onChange([...rows, ""]);
  };

  const handleRemoveRow = (index) => {
    if (rows.length <= 1) {
      onChange([""]);
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : [""]);
  };

  const handleCsvTrigger = () => {
    setCsvError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCsvError("");
    setCsvNotice("");

    try {
      const text = await file.text();
      const { rows: importedRows, duplicateCount } = parseSamanCsv(text);
      const existingNonEmpty = rows.map((r) => r.trim()).filter(Boolean);

      if (existingNonEmpty.length === 0) {
        onChange(importedRows);
        setPendingImport(null);
        const dupText =
          duplicateCount > 0
            ? ` (${duplicateCount} pendua dalam CSV diabaikan)`
            : "";
        setCsvNotice(
          `${importedRows.length} nombor saman berjaya diimport daripada "${file.name}"${dupText}.`
        );
      } else {
        setPendingImport({
          fileName: file.name,
          rows: importedRows,
          duplicateCount,
          existingCount: existingNonEmpty.length,
        });
      }
    } catch (err) {
      setPendingImport(null);
      setCsvError(err.message || "Gagal membaca fail CSV.");
    }
  };

  const handleConfirmReplace = () => {
    if (!pendingImport) return;
    onChange(pendingImport.rows);
    const dupText =
      pendingImport.duplicateCount > 0
        ? ` (${pendingImport.duplicateCount} pendua dalam CSV diabaikan)`
        : "";
    setCsvNotice(
      `Senarai diganti dengan ${pendingImport.rows.length} nombor saman daripada "${pendingImport.fileName}"${dupText}.`
    );
    setPendingImport(null);
  };

  const handleConfirmAppend = () => {
    if (!pendingImport) return;
    const existingNonEmpty = rows.map((r) => r.trim()).filter(Boolean);
    const { result: merged, duplicateCount: mergeDuplicates } = deduplicateList(
      [...existingNonEmpty, ...pendingImport.rows]
    );
    const totalDuplicates = pendingImport.duplicateCount + mergeDuplicates;
    onChange(merged);
    const dupText =
      totalDuplicates > 0
        ? ` (${totalDuplicates} nombor saman pendua diabaikan)`
        : "";
    setCsvNotice(
      `${pendingImport.rows.length} nombor saman ditambah. Jumlah semasa: ${merged.length}${dupText}.`
    );
    setPendingImport(null);
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setCsvNotice("Import CSV dibatalkan. Senarai sedia ada dikekalkan.");
  };

  return (
    <div className="col-span-full flex flex-col gap-2.5 border border-[var(--color-border)] bg-[#0f1c34]/75 rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <label
            htmlFor={`${uid}-row-0`}
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            {fieldNumber}. Saman
          </label>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] font-semibold">
            {nonEmptyCount} saman diisi
          </span>
          <span className="text-[11px] text-[var(--color-text-secondary)]">
            (Pilihan · Format CSV: <code className="text-[var(--color-accent-soft)]">no, nombor_saman</code>)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleCsvTrigger}
            disabled={disabled}
            className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            ↑ Import CSV
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            disabled={disabled}
            className="cursor-pointer border border-[var(--color-accent)] text-[var(--color-accent-soft)] bg-[#1c2b48] px-3 py-1.5 rounded-[9px] text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
          >
            + Tambah Saman
          </button>
        </div>
      </div>

      {csvError && (
        <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
          {csvError}
        </div>
      )}

      {csvNotice && !csvError && (
        <div className="p-2.5 bg-[#162744] border border-[#34507d] rounded-lg text-[#cfe0fa] text-xs">
          {csvNotice}
        </div>
      )}

      {pendingImport && (
        <div className="p-3 bg-[var(--color-notice-bg)] border border-[var(--color-notice-border)] text-[var(--color-notice-text)] rounded-xl text-xs space-y-2.5">
          <div>
            Fail <b>{pendingImport.fileName}</b> mengandungi{" "}
            <b>{pendingImport.rows.length}</b> nombor saman, manakala borang
            sudah mempunyai <b>{pendingImport.existingCount}</b> saman. Pilih
            tindakan import:
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleConfirmReplace}
              disabled={disabled}
              className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] border border-[var(--color-accent)] font-bold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 transition-all disabled:opacity-50"
            >
              Ganti Senarai Sedia Ada
            </button>
            <button
              type="button"
              onClick={handleConfirmAppend}
              disabled={disabled}
              className="cursor-pointer border border-[var(--color-accent)] text-[var(--color-accent-soft)] bg-[#1c2b48] font-semibold px-3 py-1.5 rounded-lg text-xs hover:brightness-110 transition-all disabled:opacity-50"
            >
              Tambah ke Senarai
            </button>
            <button
              type="button"
              onClick={handleCancelImport}
              disabled={disabled}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
        {rows.map((samanVal, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-center py-2 rounded-[9px] border border-[var(--color-border)] bg-[#14243e] text-xs font-bold text-[var(--color-accent-soft)]">
              {index + 1}
            </span>
            <input
              id={`${uid}-row-${index}`}
              type="text"
              value={samanVal}
              onChange={(e) => handleRowChange(index, e.target.value)}
              placeholder="Contoh: SMN-2026-00142"
              disabled={disabled}
              aria-label={`Nombor Saman ${index + 1}`}
              className="flex-1 border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="button"
              onClick={() => handleRemoveRow(index)}
              disabled={disabled || (rows.length === 1 && samanVal === "")}
              title={
                rows.length === 1
                  ? "Kosongkan baris saman"
                  : `Buang baris saman ${index + 1}`
              }
              aria-label={`Buang saman ${index + 1}`}
              className="cursor-pointer shrink-0 border border-[var(--color-border-light)] text-[var(--color-text-secondary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-danger)] hover:text-[#ffbbb1] px-2.5 py-2.5 rounded-[9px] text-xs font-bold transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
