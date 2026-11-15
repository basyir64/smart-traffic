import { normalizePihakTerlibatList } from "./siasatan";

function countTopKey(items, getKey) {
  const counts = {};
  items.forEach((item) => {
    const k = getKey(item);
    if (k) counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/**
 * Data-driven synthesis of Faktor & Cadangan strictly from the location's
 * live Siasatan + Penguatkuasaan records (used while Gemini loads or as fallback).
 */
export function synthesizeFromRecords(location, locRecords = [], locOps = []) {
  const accOps = locOps.filter(
    (o) => o.kategori_kemalangan && o.kategori_kemalangan !== "Bukan kemalangan"
  );
  const totalCases = locRecords.length + accOps.length;

  if (totalCases === 0 && locOps.length === 0) {
    return {
      faktor:
        "Tiada rekod siasatan atau operasi penguatkuasaan direkodkan di lokasi ini bagi tempoh semasa.",
      cadangan:
        "Teruskan rondaan pemantauan berkala mengikut jadual BSPT; tiada intervensi khusus diperlukan buat masa ini.",
      source: "empty",
    };
  }

  const topViolations = countTopKey(locRecords, (r) => r.kesalahan);
  const allParties = locRecords.flatMap((r) => normalizePihakTerlibatList(r));
  const topVehicles = countTopKey(allParties, (p) => p.kategori_kenderaan);
  const topOpsTypes = countTopKey(locOps, (o) => o.jenis_operasi);
  const animalRecs = locRecords.filter((r) => r.melibatkan_binatang);
  const fatalSiasatan = locRecords.filter((r) => r.maut).length;
  const fatalOps = accOps.filter((o) => o.kategori_kemalangan === "Maut").length;
  const totalFatal = fatalSiasatan + fatalOps;
  const totalTangkapan = locOps.reduce((s, o) => s + (o.tangkapan || 0), 0);
  const totalSita = locOps.reduce((s, o) => s + (o.sita || 0), 0);

  const partsFaktor = [];
  if (topViolations.length > 0) {
    const vText = topViolations
      .slice(0, 2)
      .map(([k, c]) => `${k} (${c} kes)`)
      .join(" & ");
    partsFaktor.push(`Punca utama siasatan: ${vText}`);
  }
  if (topVehicles.length > 0) {
    const vehText = topVehicles
      .slice(0, 2)
      .map(([k, c]) => `${k} (${c})`)
      .join(", ");
    partsFaktor.push(`melibatkan ${vehText}`);
  }
  if (animalRecs.length > 0) {
    const animals = [
      ...new Set(animalRecs.map((r) => r.jenis_binatang).filter(Boolean)),
    ].join("/");
    partsFaktor.push(`isu lintasan binatang (${animals})`);
  }
  if (accOps.length > 0) {
    const opCats = countTopKey(accOps, (o) => o.kategori_kemalangan)
      .map(([k, c]) => `${k} (${c})`)
      .join(", ");
    partsFaktor.push(`rekod penguatkuasaan kategori kemalangan: ${opCats}`);
  }

  const faktor =
    partsFaktor.length > 0
      ? `${partsFaktor.join("; ")}${
          totalFatal > 0 ? ` — termasuk ${totalFatal} kes maut.` : "."
        }`
      : `Terdapat ${locOps.length} operasi pencegahan direkodkan tanpa insiden kemalangan.`;

  const landmarkRef = location.landmark || location.route || location.name;
  const peakRef =
    location.peak_time && location.peak_time !== "Tiada rekod tempoh ini"
      ? ` pada waktu puncak ${location.peak_time}`
      : "";

  const topVName = topViolations[0]?.[0] || "";
  let actionFocus = "rondaan omnipresence dan kawalan lalu lintas bersasar";
  if (topVName === "Gagal patuh isyarat") {
    actionFocus =
      "Op Pematuhan Lampu Isyarat serta semakan masa kitaran lampu isyarat bersama JKR";
  } else if (topVName === "Kelajuan") {
    actionFocus =
      "Op Had Laju (Speed Trap) dan pemasangan jalur bergetar melintang (rumble strips)";
  } else if (topVName === "Langgar binatang" || animalRecs.length > 0) {
    actionFocus =
      "pemasangan papan tanda amaran lintasan ternakan & audit pencahayaan jalan waktu malam";
  } else if (topVName === "Keadaan jalan") {
    actionFocus =
      "audit permukaan jalan dan garisan pantul cahaya bersama JKR / PBT";
  }

  const opsNote =
    locOps.length > 0
      ? ` (${locOps.length} Op ${topOpsTypes[0]?.[0] || ""} telah dilaksanakan: ${totalTangkapan} tangkapan, ${totalSita} sita)`
      : "";

  const cadangan = `Perketatkan ${actionFocus} di sekitar ${landmarkRef}${peakRef}${opsNote}.`;

  return { faktor, cadangan, source: "data" };
}
