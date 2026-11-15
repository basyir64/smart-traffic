/**
 * Shared constants, normalization, validation, and aggregation helpers
 * for Siasatan (`pihak_terlibat` multi-party records & 9-Elemen computations).
 */
import { coerceStoredSamanCategory } from "./saman.js";

export const VEHICLE_CATEGORIES = [
  "Motosikal",
  "Kereta",
  "MPV / SUV",
  "Van",
  "Bas",
  "Lori / Kenderaan Berat",
  "Basikal",
  "Pejalan Kaki",
  "Lain-lain",
];

export const AGE_BRACKETS = [
  ["00-05", 0, 5],
  ["06-10", 6, 10],
  ["11-15", 11, 15],
  ["16-20", 16, 20],
  ["21-25", 21, 25],
  ["26-30", 26, 30],
  ["31-35", 31, 35],
  ["36-40", 36, 40],
  ["41-45", 41, 45],
  ["46-50", 46, 50],
  ["51-55", 51, 55],
  ["56-60", 56, 60],
  ["61-65", 61, 65],
  ["66-70", 66, 70],
  ["71-75", 71, 75],
];

/**
 * Creates a blank `pihak_terlibat` entry with default category and 0 passengers.
 */
export function createEmptyPihakTerlibatRow() {
  return {
    kategori_kenderaan: "Motosikal",
    no_kenderaan: "",
    no_ic: "",
    nama: "",
    umur: "",
    bilangan_penumpang: 0,
  };
}

/**
 * Strips non-digit characters while preserving leading zeros cleanly as a string.
 */
export function coerceIcDigits(rawIc) {
  if (rawIc === null || rawIc === undefined || rawIc === "" || rawIc === 0) {
    return "";
  }
  return String(rawIc).trim().replace(/\D/g, "");
}

/**
 * Parses an age value into a valid finite number or `null` when missing/empty
 * (avoiding JavaScript `Number("") === 0` or `Number(null) === 0` pitfalls).
 */
export function parseValidAge(rawAge) {
  if (rawAge === "" || rawAge === null || rawAge === undefined) {
    return null;
  }
  const parsed = Number(rawAge);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.min(120, parsed));
}

/**
 * Normalizes a single involved vehicle/driver/pedestrian entry.
 * Automatically clears `no_kenderaan` and forces `bilangan_penumpang = 0` for `Pejalan Kaki`.
 */
export function normalizePihakTerlibatRow(row = {}) {
  const kategori_kenderaan =
    String(row.kategori_kenderaan || "Motosikal").trim() || "Motosikal";
  const isPedestrian = kategori_kenderaan === "Pejalan Kaki";
  const parsedPenumpang = parseInt(row.bilangan_penumpang ?? 0, 10);

  return {
    kategori_kenderaan,
    no_kenderaan: isPedestrian
      ? ""
      : String(row.no_kenderaan || "").trim().toUpperCase(),
    no_ic: coerceIcDigits(row.no_ic),
    nama: String(row.nama || "").trim().toUpperCase(),
    umur: parseValidAge(row.umur),
    bilangan_penumpang: isPedestrian
      ? 0
      : Math.max(0, Number.isNaN(parsedPenumpang) ? 0 : parsedPenumpang),
  };
}

/**
 * Backward-compatibly extracts `pihak_terlibat` from either modern UAT 3 array docs
 * or legacy UAT 1/2 scalar siasatan fields.
 */
export function normalizePihakTerlibatList(raw = {}) {
  if (Array.isArray(raw.pihak_terlibat) && raw.pihak_terlibat.length > 0) {
    return raw.pihak_terlibat.map(normalizePihakTerlibatRow);
  }
  return [
    normalizePihakTerlibatRow({
      kategori_kenderaan: raw.kategori_kenderaan,
      no_kenderaan: raw.no_kenderaan,
      no_ic: raw.no_ic,
      nama: raw.nama,
      umur: raw.umur,
      bilangan_penumpang: raw.bilangan_penumpang ?? 0,
    }),
  ];
}

/**
 * Checks whether `pihakTerlibat` rows differ from an untouched single default empty row.
 */
export function isPihakTerlibatDefaultDirty(rows = []) {
  if (!Array.isArray(rows) || rows.length !== 1) return true;
  const first = rows[0] || {};
  return (
    (first.kategori_kenderaan || "Motosikal") !== "Motosikal" ||
    Boolean(first.no_kenderaan) ||
    Boolean(first.no_ic) ||
    Boolean(first.nama) ||
    String(first.umur ?? "") !== "" ||
    String(first.bilangan_penumpang ?? 0) !== "0"
  );
}

/**
 * Validates dynamic `pihak_terlibat` batch rows before saving.
 * Returns `{ valid, error, rowErrors, cleanList }`.
 */
export function validatePihakTerlibatRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      valid: false,
      error: "Sekurang-kurangnya 1 pihak terlibat diperlukan.",
      rowErrors: {},
      cleanList: [],
    };
  }

  const rowErrors = {};
  const cleanList = [];

  rows.forEach((row = {}, idx) => {
    const kategori = String(row.kategori_kenderaan || "").trim();
    const isPedestrian = kategori === "Pejalan Kaki";
    const isBicycle = kategori === "Basikal";
    const plate = String(row.no_kenderaan || "").trim().toUpperCase();
    const ic = coerceIcDigits(row.no_ic);
    const nama = String(row.nama || "").trim().toUpperCase();
    const age = parseValidAge(row.umur);
    const rawAgeNum =
      row.umur === "" || row.umur === null || row.umur === undefined
        ? NaN
        : Number(row.umur);
    const rawPenumpang = isPedestrian ? 0 : row.bilangan_penumpang;
    const penumpangMissing =
      !isPedestrian &&
      (rawPenumpang === "" || rawPenumpang === null || rawPenumpang === undefined);
    const penumpangNum = Number(rawPenumpang);

    if (!kategori) {
      rowErrors[idx] = "Sila pilih Kategori Kenderaan.";
    } else if (!isPedestrian && !isBicycle && !plate) {
      rowErrors[idx] =
        "Sila masukkan No. Kenderaan (atau pilih Basikal / Pejalan Kaki).";
    } else if (!ic) {
      rowErrors[idx] = "Sila masukkan No. IC (digit nombor sahaja).";
    } else if (!nama) {
      rowErrors[idx] = "Sila masukkan Nama penuh.";
    } else if (
      age === null ||
      Number.isNaN(rawAgeNum) ||
      rawAgeNum < 0 ||
      rawAgeNum > 120
    ) {
      rowErrors[idx] = "Sila masukkan Umur yang sah (0–120).";
    } else if (
      penumpangMissing ||
      Number.isNaN(penumpangNum) ||
      penumpangNum < 0 ||
      !Number.isInteger(penumpangNum)
    ) {
      rowErrors[idx] = "Bilangan penumpang mestilah nombor bulat ≥ 0.";
    }

    cleanList.push(normalizePihakTerlibatRow(row));
  });

  const errorIndices = Object.keys(rowErrors);
  if (errorIndices.length > 0) {
    const firstIdx = Number(errorIndices[0]);
    return {
      valid: false,
      error: `Baris pihak terlibat #${firstIdx + 1}: ${rowErrors[firstIdx]}`,
      rowErrors,
      cleanList: [],
    };
  }

  return { valid: true, error: "", rowErrors: {}, cleanList };
}

/**
 * Formats table cell text & full hover tooltip for multi-party Siasatan rows.
 */
export function getFirstPartyVehicleDisplay(party) {
  if (!party) return "-";
  if (party.kategori_kenderaan === "Pejalan Kaki") return "Pejalan Kaki";
  if (party.no_kenderaan) return party.no_kenderaan;
  if (party.kategori_kenderaan === "Basikal") return "Basikal (Tiada No.)";
  return "-";
}

export function formatPihakTerlibatTooltip(parties = []) {
  if (!Array.isArray(parties) || parties.length === 0) return "";
  return parties
    .map((p, idx) => {
      const unitLabel =
        p.kategori_kenderaan === "Pejalan Kaki"
          ? "Pejalan Kaki"
          : p.no_kenderaan
            ? `${p.kategori_kenderaan} (${p.no_kenderaan})`
            : p.kategori_kenderaan;
      const ageText =
        p.umur !== null && p.umur !== undefined && p.umur !== ""
          ? `, Umur ${p.umur}`
          : "";
      const passengerText =
        p.kategori_kenderaan === "Pejalan Kaki"
          ? ""
          : `, ${Number(p.bilangan_penumpang ?? 0)} penumpang`;
      return `${idx + 1}. ${unitLabel} — ${p.nama || "-"}${ageText}${passengerText}`;
    })
    .join("\n");
}

/**
 * Computes Element `7. Kategori kenderaan` breakdown across all `pihak_terlibat` rows (`kenderaan`).
 */
export function countVehicleCategoriesFromRecords(docs = []) {
  const allParties = docs.flatMap((r) => normalizePihakTerlibatList(r));
  return VEHICLE_CATEGORIES.map((cat) => ({
    label: `- ${cat}`,
    value: `${allParties.filter((p) => p.kategori_kenderaan === cat).length} kenderaan`,
  }));
}

/**
 * Computes Element `8. Kategori umur` counting unique age brackets per case (`kes`).
 */
export function countUniqueAgeBracketsFromRecords(docs = []) {
  const isInBucket = (age, minA, maxA) => {
    const valid = parseValidAge(age);
    return valid !== null && valid >= minA && valid <= maxA;
  };

  const rows = AGE_BRACKETS.map(([rangeLabel, minA, maxA]) => ({
    label: `- ${rangeLabel}`,
    value: `${
      docs.filter((r) =>
        normalizePihakTerlibatList(r).some((p) => isInBucket(p.umur, minA, maxA))
      ).length
    } kes`,
  }));

  rows.push({
    label: "- >75",
    value: `${
      docs.filter((r) =>
        normalizePihakTerlibatList(r).some((p) => {
          const valid = parseValidAge(p.umur);
          return valid !== null && valid > 75;
        })
      ).length
    } kes`,
  });

  return rows;
}

/**
 * Formats a clean document title used by browsers as the default Save-as-PDF filename.
 */
export function formatPrintDocumentTitle(record) {
  const raw = String(record?.no_saman || record?.id || "Rekod")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_");
  return `Rekod_Siasatan_${raw || "Rekod"}`;
}

/**
 * Builds structured fields `1`–`11` and multi-party table rows for A4 PDF printing,
 * handling legacy scalar records and resolved master location details safely.
 */
export function buildSiasatanPrintModel(
  record = {},
  selectedLocation = null,
  printedAt = ""
) {
  const parties = normalizePihakTerlibatList(record).map((p, idx) => ({
    index: idx + 1,
    kategori_kenderaan: p.kategori_kenderaan || "-",
    no_kenderaan:
      p.kategori_kenderaan === "Pejalan Kaki" ? "-" : p.no_kenderaan || "-",
    no_ic: p.no_ic || "-",
    nama: p.nama || "-",
    umur:
      p.umur !== null && p.umur !== undefined && p.umur !== ""
        ? String(p.umur)
        : "-",
    bilangan_penumpang:
      p.kategori_kenderaan === "Pejalan Kaki"
        ? "-"
        : String(Number(p.bilangan_penumpang ?? 0)),
  }));

  const isAnimal = Boolean(record?.melibatkan_binatang);
  const isMaut = record?.jenis_kemalangan === "Maut" || Boolean(record?.maut);

  return {
    documentId: record?.id || "-",
    printedAt: printedAt || "-",
    eyebrow: "PDRM · BSPT · INOVASI IPD",
    title: "SMART TRAFFIC AI — REKOD SIASATAN KEMALANGAN",
    bannerText: "● DATA SIMULASI — BUKAN IPRS SEBENAR",
    fieldsTop: [
      { label: "1. No. Saman", value: record?.no_saman || "-" },
      {
        label: "2. Kategori Saman",
        value: coerceStoredSamanCategory(record?.kategori_saman),
      },
      {
        label: "3. No. Report",
        value: record?.no_report ? String(record.no_report) : "-",
      },
    ],
    partiesTitle: "4. Kenderaan & Pemandu / Pejalan Kaki Terlibat",
    parties,
    fieldsBottom: [
      { label: "5. Alamat", value: record?.alamat || "-" },
      {
        label: "6. Lokasi Hotspot / Jalan",
        value: selectedLocation?.name || record?.location_name || "-",
      },
      {
        label: "Nama Jalan",
        value: selectedLocation?.route || "-",
        isSubField: true,
      },
      {
        label: "Jenis Jalan",
        value:
          selectedLocation?.road_type || record?.tempat_kemalangan || "-",
        isSubField: true,
      },
      {
        label: "7. Tarikh Kemalangan",
        value: record?.tarikh_kemalangan || "-",
      },
      {
        label: "8. Waktu Kejadian (HH:MM)",
        value: record?.waktu_kejadian || "-",
      },
      {
        label: "9. Kesalahan (Punca Kemalangan)",
        value: record?.kesalahan || "-",
      },
      {
        label: "10. Melibatkan Binatang",
        value: isAnimal ? "Ya" : "Tidak",
      },
      ...(isAnimal
        ? [
            {
              label: "Jenis Binatang",
              value: record?.jenis_binatang || "-",
              isSubField: true,
            },
          ]
        : []),
      {
        label: "11. Jenis Kemalangan",
        value: record?.jenis_kemalangan || "-",
      },
      ...(isMaut
        ? [
            {
              label: "Bilangan Kematian (Nyawa)",
              value: String(Math.max(1, Number(record?.bilangan_maut) || 1)),
              isSubField: true,
            },
          ]
        : []),
    ],
  };
}
