/**
 * Standard selectable values for field `6. Sumber Rujukan` in location registration & editing.
 */
export const STANDARD_LOCATION_SOURCES = [
  "LAMPIRAN BLACKSPOT",
  "LAMPIRAN HOTSPOT",
  "JKR / MIROS",
  "DALAMAN BSPT",
];

/**
 * Canonical values for `4. Jenis Jalan` in master locations and Siasatan manual `"Lain-lain"` input.
 * Must stay aligned with `9 Elemen Data Kemalangan` Element `4. Jenis jalan` queries.
 */
export const ROAD_TYPES = ["Persekutuan", "Negeri", "Lebuh Raya", "Lain-lain"];

/**
 * Sentinel `location_id` stored on Penguatkuasaan & Siasatan records with a custom ("Lain-lain") location.
 */
export const CUSTOM_LOCATION_ID = "__LAIN_LAIN__";

/**
 * Returns true when a location's `6. Sumber Rujukan` (`source`) designates a Lampiran Hotspot
 * (covering both `"LAMPIRAN HOTSPOT"` and seeded `"LAMPIRAN HOTSPOT 1..4"`).
 *
 * @param {object|null|undefined} loc
 * @returns {boolean}
 */
export function isHotspotLocation(loc) {
  return String(loc?.source || "")
    .trim()
    .toUpperCase()
    .startsWith("LAMPIRAN HOTSPOT");
}

/**
 * Resolves Penguatkuasaan `2. Lokasi Hotspot / Jalan` selection into persistence fields
 * without mutating the `locations` master collection.
 *
 * @param {string} locationId
 * @param {string} customLocationName
 * @param {Array<object>} locationsList
 * @param {string} [fallbackLocationName=""]
 * @returns {{ valid: boolean, location_id: string, location_name: string, is_custom_location: boolean }}
 */
export function resolvePenguatkuasaanLocation(
  locationId,
  customLocationName,
  locationsList = [],
  fallbackLocationName = ""
) {
  if (locationId === CUSTOM_LOCATION_ID) {
    const normalizedCustom = String(customLocationName || "")
      .trim()
      .toUpperCase();
    return {
      valid: normalizedCustom.length > 0,
      location_id: CUSTOM_LOCATION_ID,
      location_name: normalizedCustom,
      is_custom_location: true,
    };
  }

  const selectedLoc = locationsList.find((l) => l.id === locationId);
  const resolvedId = selectedLoc?.id || locationId || "";
  return {
    valid: Boolean(resolvedId),
    location_id: resolvedId,
    location_name: selectedLoc?.name || fallbackLocationName || "",
    is_custom_location: false,
  };
}

/**
 * Resolves Siasatan `5. Lokasi Hotspot / Jalan` + `Nama Jalan` / `Jenis Jalan` selection
 * into canonical persistence fields without mutating the `locations` master collection.
 * When `"Lain-lain"` (`CUSTOM_LOCATION_ID`) is selected, both `nama_jalan` and `location_name`
 * persist the uppercased manual road name and `tempat_kemalangan` persists the chosen `ROAD_TYPES` value.
 *
 * @param {string} locationId
 * @param {string} customNamaJalan
 * @param {string} customJenisJalan
 * @param {Array<object>} [locationsList=[]]
 * @param {string} [fallbackLocationName=""]
 * @param {string} [fallbackRoadType=""]
 */
export function resolveSiasatanLocation(
  locationId,
  customNamaJalan,
  customJenisJalan,
  locationsList = [],
  fallbackLocationName = "",
  fallbackRoadType = ""
) {
  if (locationId === CUSTOM_LOCATION_ID) {
    const normalizedRoad = String(customNamaJalan || "")
      .trim()
      .toUpperCase();
    const normalizedType = ROAD_TYPES.includes(customJenisJalan)
      ? customJenisJalan
      : "";
    return {
      valid: normalizedRoad.length > 0 && normalizedType.length > 0,
      error:
        normalizedRoad.length === 0
          ? "Sila masukkan Nama Jalan bagi lokasi Lain-lain."
          : normalizedType.length === 0
            ? "Sila pilih Jenis Jalan bagi lokasi Lain-lain."
            : "",
      is_custom_location: true,
      location_id: CUSTOM_LOCATION_ID,
      location_name: normalizedRoad,
      nama_jalan: normalizedRoad,
      tempat_kemalangan: normalizedType,
    };
  }

  const selectedLoc = locationsList.find((l) => l.id === locationId);
  const resolvedId = selectedLoc?.id || locationId || "";
  return {
    valid: Boolean(resolvedId),
    error: resolvedId ? "" : "Sila pilih Lokasi Hotspot / Jalan yang sah.",
    is_custom_location: false,
    location_id: resolvedId,
    location_name: selectedLoc?.name || fallbackLocationName || "",
    nama_jalan: "",
    tempat_kemalangan:
      selectedLoc?.road_type || fallbackRoadType || "Persekutuan",
  };
}

/**
 * Maps a location risk score (0–100) to its map pin fill color.
 */
export function getPinColor(risk) {
  if (risk >= 75) return "#dc5d4d";
  if (risk >= 68) return "#eba34b";
  return "#e8bb57";
}
