import { useState, useMemo } from "react";
import { getPeriodLabelBM } from "../../hooks/usePeriodData";
import { isHotspotLocation } from "../../utils/locations";
import { synthesizeFromRecords } from "../../utils/locationInsight";
import { normalizePihakTerlibatList } from "../../utils/siasatan";
import Chip from "../shared/Chip";
import InfoModal from "../shared/InfoModal";

// In-memory cache keyed by `${locationId}:${period}:${recordsSignature}` to preserve Gemini quota
const insightCache = new Map();

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text || "")
      .join("")
      .trim() || "";
  const cleanJson = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleanJson);
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

  const [insightState, setInsightState] = useState({
    cacheKey: "",
    data: null,
  });
  const [loadingCacheKey, setLoadingCacheKey] = useState("");
  const [activeInfoModal, setActiveInfoModal] = useState(null);

  const insight = !location
    ? null
    : insightState.cacheKey === cacheKey
      ? insightState.data
      : cacheKey && insightCache.has(cacheKey)
        ? insightCache.get(cacheKey)
        : null;
  const loadingGemini =
    Boolean(location && cacheKey) && loadingCacheKey === cacheKey;

  const handleGenerateInsight = async () => {
    const targetCacheKey = cacheKey;
    if (!location || !targetCacheKey || loadingGemini) return;

    // Short-circuit when 0 records in this period to preserve Gemini quota
    if (locRecords.length === 0 && locOps.length === 0) {
      insightCache.set(targetCacheKey, fallbackInsight);
      setInsightState({ cacheKey: targetCacheKey, data: fallbackInsight });
      return;
    }

    const apiKey = String(
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_GEMINI_API_KEY) ||
        ""
    ).trim();

    if (
      !apiKey ||
      (!apiKey.startsWith("AIza") && !apiKey.startsWith("AQ.")) ||
      typeof navigator === "undefined" ||
      !navigator.onLine
    ) {
      insightCache.set(targetCacheKey, fallbackInsight);
      setInsightState({ cacheKey: targetCacheKey, data: fallbackInsight });
      return;
    }

    setLoadingCacheKey(targetCacheKey);
    try {
      const geminiRes = await fetchGeminiLocationInsight({
        apiKey,
        location,
        periodLabel: getPeriodLabelBM(period),
        locRecords,
        locOps,
      });
      insightCache.set(targetCacheKey, geminiRes);
      setInsightState({ cacheKey: targetCacheKey, data: geminiRes });
    } catch (err) {
      console.warn(
        "[LocationRisk] Gemini unavailable, using live data synthesis:",
        err?.message || err
      );
      setInsightState({ cacheKey: targetCacheKey, data: fallbackInsight });
    } finally {
      setLoadingCacheKey((curr) => (curr === targetCacheKey ? "" : curr));
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

          {/* Modal trigger 1: Risk Calculation Formula */}
          <button
            type="button"
            onClick={() => setActiveInfoModal("formula")}
            aria-label="Formula Pengiraan Skor Risiko"
            className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-full border border-[#3d5685] bg-[#16243e] text-[#ffd58c] text-xs font-bold inline-flex items-center justify-center cursor-pointer hover:border-[var(--color-accent)] transition-colors focus:outline-none"
          >
            i
          </button>
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

          {/* Modal trigger 2: AI Explanation for Faktor & Cadangan */}
          <button
            type="button"
            onClick={() => setActiveInfoModal("ai")}
            aria-label="Penjelasan Penjanaan Faktor dan Cadangan AI"
            className="px-2.5 py-1 rounded-md border border-[#3d5685] bg-[#16243e] text-[#ffd58c] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:border-[var(--color-accent)] transition-colors focus:outline-none"
          >
            <span>ⓘ Bagaimana AI Menjana?</span>
          </button>
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

      <InfoModal
        isOpen={activeInfoModal === "formula"}
        icon="📐"
        title="Formula Pengiraan Skor Risiko (0–100)"
        subtitle={`${location.name} (${periodLabel})`}
        onClose={() => setActiveInfoModal(null)}
      >
        <div className="text-[#b8c7de] space-y-2">
          <div>
            • Jika <b>Kes = 0</b>: Skor = <b>0 / 100</b>
          </div>
          <div>
            • Jika <b>Kes &gt; 0</b>:
            <div className="mt-1 rounded-lg border border-[#223454] bg-[#0b1528] px-3 py-2">
              <code className="text-[#ffd58c] text-[11px] break-words">
                clamp(0, 100, Asas + 12×Kes + 15×Maut + 5×Kematian − 4×Op)
              </code>
            </div>
          </div>
          <div className="text-[11px] text-[#8fa5c6]">
            *Pemberat Asas: <b>35</b> (Blackspot) atau <b>15</b> (Pantauan)
          </div>
          <div className="pt-2 border-t border-[#223454] text-[#d5e3f7]">
            <b>Kiraan Semasa ({periodLabel}):</b>{" "}
            {cases === 0
              ? "0 kes → 0/100"
              : `${baseWeight} + 12(${cases}) + 15(${fatalCount}) + 5(${deathsCount}) − 4(${opsCount}) = ${risk}/100`}
          </div>
        </div>
      </InfoModal>

      <InfoModal
        isOpen={activeInfoModal === "ai"}
        icon="🤖"
        title="Penjanaan Faktor & Cadangan (Gemini AI)"
        subtitle="Analisis Lokasi atas Permintaan"
        onClose={() => setActiveInfoModal(null)}
      >
        <div className="text-[#b8c7de] space-y-2">
          <div>
            1. <b>Data Input:</b> Menggabungkan profil lokasi (
            <i>Jenis Jalan, Status Blackspot</i>) bersama rekod{" "}
            <b>Siasatan</b> (<i>Kesalahan, Kenderaan, Waktu, Binatang, Maut</i>) &{" "}
            <b>Penguatkuasaan</b> (<i>Jenis Operasi, Tangkapan, Sita</i>) bagi
            tempoh aktif.
          </div>
          <div>
            2. <b>Sintesis AI:</b> Dihantar atas permintaan (on-demand) ke{" "}
            <b>Gemini 3.5 Flash-Lite</b> (JSON mode) untuk merumuskan{" "}
            <b>Faktor</b> punca kemalangan & <b>Cadangan</b> taktikal BSPT/JKR.
          </div>
          <div className="text-[11px] text-[#8fa5c6] pt-1 border-t border-[#223454]">
            *Jika tiada rekod dalam tempoh aktif, luar talian, atau kuota API
            terhad, sistem memaparkan rumusan automatik berasaskan data langsung
            (fallback).
          </div>
        </div>
      </InfoModal>
    </div>
  );
}
