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
 * Sentinel `location_id` stored on Penguatkuasaan records with a custom ("Lain-lain") location.
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
