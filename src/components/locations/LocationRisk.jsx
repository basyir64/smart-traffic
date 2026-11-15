import { useState, useEffect, useMemo } from "react";
import { getPeriodLabelBM } from "../../hooks/usePeriodData";
import { isHotspotLocation } from "../../utils/locations";
import { normalizePihakTerlibatList } from "../../utils/siasatan";
import Chip from "../shared/Chip";

// In-memory cache keyed by `${locationId}:${period}:${recordsSignature}` to preserve Gemini quota
const insightCache = new Map();

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

async function fetchGeminiLocationInsight({
  apiKey,
  location,
  periodLabel,
  locRecords,
  locOps,
}) {
  const siasatanDigest =
    locRecords.length > 0
      ? locRecords
          .map((r) => {
            const parties = normalizePihakTerlibatList(r);
            const kenderaanList =
              parties
                .map((p) => p.kategori_kenderaan)
                .filter(Boolean)
                .join(", ") || "-";
            const umurList =
              parties
                .map((p) => p.umur)
                .filter((u) => u !== null && u !== undefined && u !== "")
                .join(", ") || "-";
            return `- ${r.tarikh_kemalangan} ${r.waktu_kejadian}: Kenderaan=[${kenderaanList}], Kesalahan=${r.kesalahan}, Jenis=${r.jenis_kemalangan}, Maut=${r.maut ? `Ya (${r.bilangan_maut})` : "Tidak"}, Binatang=${r.melibatkan_binatang ? r.jenis_binatang : "Tiada"}, Umur=[${umurList}]`;
          })
          .join("\n")
      : "Tiada rekod siasatan.";

  const opsDigest =
    locOps.length > 0
      ? locOps
          .map(
            (o) =>
              `- ${o.tarikh} (${o.jam_mula}-${o.jam_akhir}): Jenis Op=${o.jenis_operasi}, Kategori Kemalangan=${o.kategori_kemalangan}, Tangkapan=${o.tangkapan}, Sita=${o.sita}`
          )
          .join("\n")
      : "Tiada rekod operasi penguatkuasaan.";

  const prompt = `Anda ialah sistem analisis trafik AI untuk BSPT PDRM. Berdasarkan data sebenar Siasatan dan Penguatkuasaan bagi lokasi berikut, rumuskan "faktor" (punca utama risiko/kemalangan) dan "cadangan" (tindakan taktikal BSPT / JKR) secara padat dalam Bahasa Melayu (maksimum 1-2 ayat bagi setiap satu).

Lokasi: ${location.name} (${location.road_type}, ${location.is_blackspot ? "Blackspot Rasmi" : "Kawasan Pantauan"})
Tempoh: ${periodLabel}
Skor Risiko: ${location.risk}/100 | Jumlah Kes: ${location.cases} | Waktu Risiko: ${location.peak_time}

Rekod Siasatan:
${siasatanDigest}

Rekod Penguatkuasaan:
${opsDigest}

Pulangkan JSON sahaja dengan kunci "faktor" dan "cadangan".`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 300,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim() || "";

  const parsed = JSON.parse(rawText);
  if (!parsed.faktor || !parsed.cadangan) {
    throw new Error("Format JSON Gemini tidak lengkap");
  }

  return {
    faktor: String(parsed.faktor).trim(),
    cadangan: String(parsed.cadangan).trim(),
    source: "gemini",
  };
}

export default function LocationRisk({
  location,
  period = "monthly",
  records = [],
  operations = [],
}) {
  const locRecords = useMemo(
    () =>
      location ? records.filter((r) => r.location_id === location.id) : [],
    [location, records]
  );

  const locOps = useMemo(
    () =>
      location ? operations.filter((o) => o.location_id === location.id) : [],
    [location, operations]
  );

  const recordsSignature = useMemo(() => {
    const rSig = locRecords
      .map((r) => {
        const partiesSig = normalizePihakTerlibatList(r)
          .map((p) => `${p.kategori_kenderaan}@${p.umur ?? ""}`)
          .join(",");
        return `${r.id}:${r.kesalahan}:${partiesSig}:${r.jenis_kemalangan}:${r.maut}:${r.bilangan_maut}:${r.waktu_kejadian}`;
      })
      .join("|");
    const oSig = locOps
      .map(
        (o) =>
          `${o.id}:${o.jenis_operasi}:${o.kategori_kemalangan}:${o.tangkapan}:${o.sita}:${o.jam_mula}`
      )
      .join("|");
    return `${rSig}::${oSig}`;
  }, [locRecords, locOps]);

  const fallbackInsight = useMemo(
    () =>
      location
        ? synthesizeFromRecords(location, locRecords, locOps)
        : { faktor: "", cadangan: "", source: "empty" },
    [location, locRecords, locOps]
  );

  const cacheKey = useMemo(
    () => (location ? `${location.id}:${period}:${recordsSignature}` : ""),
    [location, period, recordsSignature]
  );

  const [insight, setInsight] = useState(null);
  const [loadingGemini, setLoadingGemini] = useState(false);

  // Sync from cache when switching locations/periods, without firing any API call automatically
  useEffect(() => {
    if (!location) {
      setInsight(null);
      setLoadingGemini(false);
      return;
    }
    if (insightCache.has(cacheKey)) {
      setInsight(insightCache.get(cacheKey));
    } else {
      setInsight(null);
    }
    setLoadingGemini(false);
  }, [location, cacheKey]);

  const handleGenerateInsight = async () => {
    if (!location || loadingGemini) return;

    // Short-circuit when 0 records in this period to preserve Gemini quota
    if (locRecords.length === 0 && locOps.length === 0) {
      insightCache.set(cacheKey, fallbackInsight);
      setInsight(fallbackInsight);
      return;
    }

    const apiKey =
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_GEMINI_API_KEY) ||
      "";

    if (
      !apiKey ||
      !apiKey.startsWith("AIza") ||
      typeof navigator === "undefined" ||
      !navigator.onLine
    ) {
      insightCache.set(cacheKey, fallbackInsight);
      setInsight(fallbackInsight);
      return;
    }

    setLoadingGemini(true);
    try {
      const geminiRes = await fetchGeminiLocationInsight({
        apiKey,
        location,
        periodLabel: getPeriodLabelBM(period),
        locRecords,
        locOps,
      });
      insightCache.set(cacheKey, geminiRes);
      setInsight(geminiRes);
    } catch {
      insightCache.set(cacheKey, fallbackInsight);
      setInsight(fallbackInsight);
    } finally {
      setLoadingGemini(false);
    }
  };

  if (!location) return null;

  const risk = Number(location.risk ?? 0);
  const isHighRisk = risk >= 75;
  const isBlackspot = Boolean(location.is_blackspot);
  const isHotspot = isHotspotLocation(location);
  const cases = location.cases ?? 0;
  const fatalCount = location.fatal_count ?? 0;
  const deathsCount = location.deaths_count ?? 0;
  const opsCount = location.ops_count ?? 0;
  const baseWeight = isBlackspot ? 35 : 15;
  const peakTime = location.peak_time || "Tiada rekod tempoh ini";
  const periodLabel = getPeriodLabelBM(period);

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold m-0">Risiko Lokasi Pilihan</h2>

          {/* Tooltip 1: Risk Calculation Formula */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              aria-label="Formula Pengiraan Skor Risiko"
              className="w-5 h-5 rounded-full border border-[#3d5685] bg-[#16243e] text-[#ffd58c] text-[11px] font-bold inline-flex items-center justify-center cursor-help hover:border-[var(--color-accent)] focus:outline-none"
            >
              i
            </button>
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute left-0 top-7 z-30 w-[320px] max-[550px]:w-[260px] p-3 rounded-xl border border-[#3d5685] bg-[#0b1528] text-[#e3ecfa] text-[11px] leading-relaxed shadow-2xl">
              <div className="font-bold text-[#ffd58c] mb-1">
                📐 Formula Pengiraan Skor Risiko (0–100)
              </div>
              <div className="text-[#b8c7de] space-y-1">
                <div>
                  • Jika <b>Kes = 0</b>: Skor = <b>0 / 100</b>
                </div>
                <div>
                  • Jika <b>Kes &gt; 0</b>:<br />
                  <code className="text-[#ffd58c] text-[10.5px]">
                    clamp(0, 100, Asas + 12×Kes + 15×Maut + 5×Kematian − 4×Op)
                  </code>
                </div>
                <div className="text-[10.5px] text-[#8fa5c6]">
                  *Pemberat Asas: <b>35</b> (Blackspot) atau <b>15</b> (Pantauan)
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-[#223454] text-[#d5e3f7]">
                  <b>Kiraan Semasa ({periodLabel}):</b>{" "}
                  {cases === 0
                    ? "0 kes → 0/100"
                    : `${baseWeight} + 12(${cases}) + 15(${fatalCount}) + 5(${deathsCount}) − 4(${opsCount}) = ${risk}/100`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Chip>
          {loadingGemini
            ? "Menjana AI..."
            : insight?.source === "gemini"
            ? "Nasihat AI (Gemini)"
            : insight
            ? "Analisis Data Langsung"
            : "Sedia Dijana"}
        </Chip>
      </div>

      <div className="grid grid-cols-[115px_1fr] max-[550px]:grid-cols-1 gap-4 items-center">
        <div
          className="w-[110px] h-[110px] rounded-full flex flex-col items-center justify-center text-[32px] font-extrabold"
          style={{
            border: "9px solid #e9b65e",
            borderLeftColor: "#54617c",
          }}
        >
          <span>{risk}</span>
          <small className="text-[11px] font-normal">/100</small>
        </div>

        <div>
          <strong className="text-sm font-bold block leading-snug">
            {location.name}
          </strong>
          <p className="text-[var(--color-text-muted)] text-xs my-2">
            Waktu risiko: {peakTime} · {cases} kes · {opsCount} operasi (
            {periodLabel})
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <span
              className="inline-block rounded-[7px] px-2.5 py-1 text-[11px] font-semibold"
              style={{
                background:
                  risk === 0
                    ? "#1c3329"
                    : isHighRisk
                    ? "#693a31"
                    : "#3a3622",
                color:
                  risk === 0
                    ? "#9ae6b4"
                    : isHighRisk
                    ? "#ffbbb1"
                    : "#ffe29a",
              }}
            >
              {risk === 0
                ? "RISIKO RENDAH (0 KES)"
                : isHighRisk
                ? "RISIKO TINGGI"
                : "RISIKO SEDERHANA"}
            </span>
            {isBlackspot && (
              <span
                className="inline-block rounded-[7px] px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: "#1c2536",
                  color: "#ffd58c",
                  border: "1px solid #7c6439",
                }}
              >
                ⚫ BLACKSPOT
              </span>
            )}
            {isHotspot && (
              <span
                className="inline-block rounded-[7px] px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  background: "#352216",
                  color: "#fdb46c",
                  border: "1px solid #9a5b25",
                }}
              >
                🔥 HOTSPOT
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-recommend-bg)] border-l-4 border-[var(--color-recommend-border)] p-3.5 rounded-lg mt-4 text-[13px] leading-relaxed">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-bold tracking-wide uppercase text-[#ffd58c]">
            Rumusan Faktor & Cadangan
          </span>

          {/* Tooltip 2: AI Explanation for Faktor & Cadangan */}
          <div className="relative group inline-flex items-center">
            <button
              type="button"
              aria-label="Penjelasan Penjanaan Faktor dan Cadangan AI"
              className="px-2 py-0.5 rounded-md border border-[#3d5685] bg-[#16243e] text-[#ffd58c] text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-help hover:border-[var(--color-accent)] focus:outline-none"
            >
              <span>ⓘ Bagaimana AI Menjana?</span>
            </button>
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute right-0 bottom-7 z-30 w-[330px] max-[550px]:w-[260px] p-3 rounded-xl border border-[#3d5685] bg-[#0b1528] text-[#e3ecfa] text-[11px] leading-relaxed shadow-2xl">
              <div className="font-bold text-[#ffd58c] mb-1">
                🤖 Penjanaan Faktor & Cadangan (Gemini AI)
              </div>
              <div className="text-[#b8c7de] space-y-1">
                <div>
                  1. <b>Data Input:</b> Menggabungkan profil lokasi (
                  <i>Jenis Jalan, Status Blackspot</i>) bersama rekod{" "}
                  <b>Siasatan</b> (<i>Kesalahan, Kenderaan, Waktu, Binatang, Maut</i>) &{" "}
                  <b>Penguatkuasaan</b> (<i>Jenis Operasi, Tangkapan, Sita</i>)
                  bagi tempoh aktif.
                </div>
                <div>
                  2. <b>Sintesis AI:</b> Dihantar atas permintaan (on-demand) ke{" "}
                  <b>Gemini 2.5 Flash</b> (JSON mode) untuk merumuskan{" "}
                  <b>Faktor</b> punca kemalangan & <b>Cadangan</b> taktikal
                  BSPT/JKR.
                </div>
              </div>
            </div>
          </div>
        </div>

        {insight ? (
          <>
            <div>
              <b>Faktor:</b> {insight.faktor}
            </div>
            <div className="mt-1">
              <b>Cadangan:</b> {insight.cadangan}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[var(--color-text-muted)] text-xs">
              {loadingGemini
                ? "Sedang menjana rumusan Faktor & Cadangan melalui Gemini AI..."
                : "Klik butang untuk menjana rumusan Faktor & Cadangan berdasarkan rekod semasa."}
            </span>
            <button
              type="button"
              onClick={handleGenerateInsight}
              disabled={loadingGemini}
              className="cursor-pointer bg-[#1c2b48] text-[#ffd58c] border border-[#3d5685] font-bold px-3 py-1.5 rounded-[8px] text-xs hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loadingGemini
                ? "⏳ Menjana..."
                : "⚡ Jana Faktor & Cadangan AI"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
