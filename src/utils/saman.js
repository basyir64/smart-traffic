export const IN_INVESTIGATION_SAMAN_CATEGORY = "Dalam Siasatan";
export const SAMAN_CATEGORIES = [
  "POL 170 A",
  "POL 257",
  IN_INVESTIGATION_SAMAN_CATEGORY,
];
export const UNSET_SAMAN_CATEGORY = "Belum Ditetapkan";

/**
 * Normalizes user or CSV input strings (e.g. "pol 170a", "POL170A", "pol257",
 * "dalam siasatan") to canonical category strings, returning "" if unrecognised.
 */
export function normalizeSamanCategory(raw) {
  const collapsed = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  if (!collapsed) return "";
  const compact = collapsed.replace(/\s+/g, "");
  if (compact === "POL170A") return "POL 170 A";
  if (compact === "POL257") return "POL 257";
  if (compact === "DALAMSIASATAN") return IN_INVESTIGATION_SAMAN_CATEGORY;
  return "";
}

function getSamanCategoryPriority(cat) {
  if (cat === "POL 170 A" || cat === "POL 257") return 3;
  if (cat === IN_INVESTIGATION_SAMAN_CATEGORY) return 2;
  if (cat === UNSET_SAMAN_CATEGORY) return 1;
  return 0;
}

/**
 * Coerces a persisted Firestore `kategori_saman` value into canonical category
 * text, defaulting missing legacy values to "Belum Ditetapkan".
 */
export function coerceStoredSamanCategory(raw) {
  return normalizeSamanCategory(raw) || UNSET_SAMAN_CATEGORY;
}

/**
 * Normalizes an enforcement operation `saman_list` field, supporting both
 * legacy `string[]` records and structured `{ no_saman, kategori_saman }[]`.
 */
export function normalizeSamanList(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((item) => {
      if (typeof item === "string") {
        const no = item.trim();
        if (!no) return null;
        return {
          no_saman: no,
          kategori_saman: UNSET_SAMAN_CATEGORY,
        };
      }
      if (item && typeof item === "object") {
        const no = String(item.no_saman ?? item.nombor_saman ?? "").trim();
        const coercedCat = coerceStoredSamanCategory(item.kategori_saman);
        if (!no && coercedCat !== IN_INVESTIGATION_SAMAN_CATEGORY) {
          return null;
        }
        return {
          no_saman: no,
          kategori_saman: coercedCat,
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Deduplicates `{ no_saman, kategori_saman }` entries case-insensitively while
 * preserving insertion order. Preserves blank-no_saman "Dalam Siasatan" rows
 * independently and upgrades duplicate entries using priority:
 * POL 170 A / POL 257 > Dalam Siasatan > Belum Ditetapkan.
 */
export function deduplicateSamanObjects(list = []) {
  const seenMap = new Map();
  const deduped = [];
  let duplicateCount = 0;

  for (const item of list) {
    const no = String(item?.no_saman ?? "").trim();
    const canonicalCat = normalizeSamanCategory(item?.kategori_saman);
    const resolvedCat =
      canonicalCat ||
      (item?.kategori_saman === UNSET_SAMAN_CATEGORY
        ? UNSET_SAMAN_CATEGORY
        : "");

    if (!no) {
      if (canonicalCat === IN_INVESTIGATION_SAMAN_CATEGORY) {
        deduped.push({
          no_saman: "",
          kategori_saman: IN_INVESTIGATION_SAMAN_CATEGORY,
        });
      }
      continue;
    }

    const key = no.toUpperCase();
    const existing = seenMap.get(key);
    if (existing) {
      duplicateCount += 1;
      if (
        getSamanCategoryPriority(resolvedCat) >
        getSamanCategoryPriority(existing.kategori_saman)
      ) {
        existing.kategori_saman = resolvedCat;
      }
      continue;
    }

    const entry = {
      no_saman: no,
      kategori_saman: resolvedCat,
    };
    seenMap.set(key, entry);
    deduped.push(entry);
  }

  return { result: deduped, duplicateCount };
}

/**
 * Validates batch saman rows from UI forms before saving.
 * Totally empty rows (blank number & blank category) are skipped as optional.
 * Allows blank `no_saman` when `kategori_saman === "Dalam Siasatan"`.
 */
export function validateSamanRows(
  rows = [],
  { allowUnsetForLegacy = false } = {}
) {
  const rowErrors = {};
  const cleanList = [];
  const seenMap = new Map();
  let firstError = "";

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || {};
    const no = String(row.no_saman ?? "").trim();
    const rawKat = String(row.kategori_saman ?? "").trim();
    const canonicalKat = normalizeSamanCategory(rawKat);
    const isLegacyUnset =
      allowUnsetForLegacy && rawKat === UNSET_SAMAN_CATEGORY;

    if (!no && !rawKat) {
      continue;
    }

    if (!no && rawKat) {
      if (canonicalKat === IN_INVESTIGATION_SAMAN_CATEGORY) {
        cleanList.push({
          no_saman: "",
          kategori_saman: IN_INVESTIGATION_SAMAN_CATEGORY,
        });
        continue;
      }
      const msg =
        rawKat === UNSET_SAMAN_CATEGORY
          ? 'Masukkan No. Saman atau pilih "-- Pilih Kategori Saman --" untuk mengosongkan baris.'
          : 'Sila masukkan No. Saman atau pilih kategori "Dalam Siasatan".';
      rowErrors[i] = msg;
      if (!firstError) {
        firstError = `Baris ${i + 1}: ${msg}`;
      }
      continue;
    }

    if (!canonicalKat && !isLegacyUnset) {
      const msg =
        "Sila pilih Kategori Saman (POL 170 A, POL 257, atau Dalam Siasatan).";
      rowErrors[i] = msg;
      if (!firstError) {
        firstError = `Baris ${i + 1}: ${msg} (No. Saman: ${no})`;
      }
      continue;
    }

    const key = no.toUpperCase();
    if (seenMap.has(key)) {
      const prevRow = seenMap.get(key) + 1;
      const msg = `Nombor saman berulang dengan baris ${prevRow}.`;
      rowErrors[i] = msg;
      if (!firstError) {
        firstError = `Baris ${i + 1}: Nombor saman "${no}" berulang dengan baris ${prevRow}.`;
      }
      continue;
    }

    seenMap.set(key, i);
    cleanList.push({
      no_saman: no,
      kategori_saman: canonicalKat || UNSET_SAMAN_CATEGORY,
    });
  }

  return {
    valid: !firstError,
    error: firstError,
    rowErrors,
    cleanList,
  };
}

/**
 * Counts POL 170 A, POL 257, Dalam Siasatan, and Belum Ditetapkan inside a single operation's saman_list.
 */
export function summarizeSamanCategories(samanList = []) {
  const normalized = normalizeSamanList(samanList);
  let pol170a = 0;
  let pol257 = 0;
  let dalamSiasatan = 0;
  let unset = 0;

  normalized.forEach((item) => {
    if (item.kategori_saman === "POL 170 A") pol170a += 1;
    else if (item.kategori_saman === "POL 257") pol257 += 1;
    else if (item.kategori_saman === IN_INVESTIGATION_SAMAN_CATEGORY)
      dalamSiasatan += 1;
    else unset += 1;
  });

  return {
    total: normalized.length,
    pol170a,
    pol257,
    dalamSiasatan,
    unset,
  };
}

/**
 * Formats non-zero saman category counts into display strings (`["POL 170 A (2)", ...]`).
 */
export function formatSamanCategoryBreakdown(summary = {}) {
  const parts = [];
  if (summary.pol170a > 0) parts.push(`POL 170 A (${summary.pol170a})`);
  if (summary.pol257 > 0) parts.push(`POL 257 (${summary.pol257})`);
  if (summary.dalamSiasatan > 0)
    parts.push(`${IN_INVESTIGATION_SAMAN_CATEGORY} (${summary.dalamSiasatan})`);
  if (summary.unset > 0) parts.push(`${UNSET_SAMAN_CATEGORY} (${summary.unset})`);
  return parts;
}

/**
 * Aggregates all summons across active-period `siasatan` and `penguatkuasaan`
 * documents: deduplicates numbered `no_saman` entries case-insensitively with
 * priority (`POL 170 A` / `POL 257` > `Dalam Siasatan` > `Belum Ditetapkan`),
 * and includes blank-`no_saman` `"Dalam Siasatan"` items individually.
 */
export function aggregatePeriodSaman(records = [], operations = []) {
  const uniqueMap = new Map();

  const upsert = ({ no_saman, kategori_saman, date, source, fallbackKey }) => {
    const trimmedNo = String(no_saman || "").trim();
    const coercedCat = coerceStoredSamanCategory(kategori_saman);

    if (!trimmedNo) {
      if (coercedCat !== IN_INVESTIGATION_SAMAN_CATEGORY) return;
      uniqueMap.set(fallbackKey, {
        no_saman: "",
        kategori_saman: IN_INVESTIGATION_SAMAN_CATEGORY,
        date: date || "",
        fromSiasatan: source === "siasatan",
        fromPenguatkuasaan: source === "penguatkuasaan",
      });
      return;
    }

    const key = trimmedNo.toUpperCase();
    const existing = uniqueMap.get(key);

    if (!existing) {
      uniqueMap.set(key, {
        no_saman: trimmedNo,
        kategori_saman: coercedCat,
        date: date || "",
        fromSiasatan: source === "siasatan",
        fromPenguatkuasaan: source === "penguatkuasaan",
      });
      return;
    }

    if (
      getSamanCategoryPriority(coercedCat) >
      getSamanCategoryPriority(existing.kategori_saman)
    ) {
      existing.kategori_saman = coercedCat;
    }
    if (!existing.date && date) {
      existing.date = date;
    }
    if (source === "siasatan") existing.fromSiasatan = true;
    if (source === "penguatkuasaan") existing.fromPenguatkuasaan = true;
  };

  records.forEach((r, idx) => {
    const coerced = coerceStoredSamanCategory(r?.kategori_saman);
    if (!r?.no_saman && coerced !== IN_INVESTIGATION_SAMAN_CATEGORY) return;
    upsert({
      no_saman: r?.no_saman || "",
      kategori_saman: r?.kategori_saman,
      date: r?.tarikh_kemalangan || "",
      source: "siasatan",
      fallbackKey: `__blank__:siasatan:${r?.id || idx}`,
    });
  });

  operations.forEach((op, opIdx) => {
    const list = normalizeSamanList(op?.saman_list);
    list.forEach((entry, entryIdx) => {
      upsert({
        no_saman: entry.no_saman,
        kategori_saman: entry.kategori_saman,
        date: op.tarikh || "",
        source: "penguatkuasaan",
        fallbackKey: `__blank__:penguatkuasaan:${op?.id || opIdx}:${entryIdx}`,
      });
    });
  });

  const items = Array.from(uniqueMap.values());
  let pol170a = 0;
  let pol257 = 0;
  let dalamSiasatan = 0;
  let unset = 0;

  items.forEach((item) => {
    if (item.kategori_saman === "POL 170 A") pol170a += 1;
    else if (item.kategori_saman === "POL 257") pol257 += 1;
    else if (item.kategori_saman === IN_INVESTIGATION_SAMAN_CATEGORY)
      dalamSiasatan += 1;
    else unset += 1;
  });

  return {
    total: items.length,
    pol170a,
    pol257,
    dalamSiasatan,
    unset,
    items,
  };
}

/**
 * Maps an ISO YYYY-MM-DD date string into the active dashboard trend bucket
 * index (`0..6` for weekly, `0..3` for monthly, `0..2` for quarterly).
 */
export function getTrendBucketCount(period = "monthly") {
  if (period === "weekly") return 7;
  if (period === "quarterly") return 3;
  return 4;
}

export function buildWeeklyDayKeys(now = new Date()) {
  const pad2 = (n) => String(n).padStart(2, "0");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  });
}

export function getTrendBucketIndex(dateStr, period = "monthly", context = {}) {
  const dt = String(dateStr || "").trim();
  if (period === "weekly") {
    const dayKeys = context.dayKeys || buildWeeklyDayKeys();
    const idx = dayKeys.indexOf(dt);
    return idx !== -1 ? idx : 0;
  }
  if (period === "quarterly") {
    const now = context.now || new Date();
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
    const monthNum = Number(dt.slice(5, 7));
    return Math.max(0, Math.min(2, monthNum - qStartMonth));
  }
  const dayNum = Number(dt.slice(8, 10));
  return Math.max(0, Math.min(3, Math.floor((dayNum - 1) / 7)));
}
