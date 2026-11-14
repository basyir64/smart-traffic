import { useState, useEffect, useMemo } from "react";
import { usePeriod } from "../period-context";
import { usePeriodData, getPeriodLabelBM } from "../hooks/usePeriodData";
import { useLocations } from "../hooks/useLocations";
import { useSiasatan } from "../hooks/useSiasatan";
import { usePenguatkuasaan } from "../hooks/usePenguatkuasaan";
import { useSelectedLocation } from "../hooks/useSelectedLocation";
import MetricCard from "../components/metrics/MetricCard";
import TrendBarChart from "../components/charts/TrendBarChart";
import LocationRisk from "../components/locations/LocationRisk";
import GoogleHotspotMap from "../components/map/GoogleHotspotMap";
import HotspotList from "../components/locations/HotspotList";

const TIME_WINDOWS = [
  { label: "00:00–04:00", start: 0, end: 240 },
  { label: "04:01–08:00", start: 241, end: 480 },
  { label: "08:01–12:00", start: 481, end: 720 },
  { label: "12:01–16:00", start: 721, end: 960 },
  { label: "16:01–20:00", start: 961, end: 1200 },
  { label: "20:01–24:00", start: 1201, end: 1440 },
];

function computePeakTimeWindow(locRecs, locAccOps) {
  const times = [
    ...locRecs.map((r) => r.waktu_kejadian),
    ...locAccOps.map((o) => o.jam_mula),
  ].filter(Boolean);

  if (times.length === 0) {
    return "Tiada rekod tempoh ini";
  }

  const counts = TIME_WINDOWS.map(() => 0);
  times.forEach((hhmm) => {
    const [hStr, mStr] = String(hhmm).split(":");
    const mins = (Number(hStr) || 0) * 60 + (Number(mStr) || 0);
    const idx = TIME_WINDOWS.findIndex((w) => mins >= w.start && mins <= w.end);
    if (idx !== -1) {
      counts[idx] += 1;
    }
  });

  let bestIdx = 0;
  counts.forEach((c, idx) => {
    if (c > counts[bestIdx]) {
      bestIdx = idx;
    }
  });

  return TIME_WINDOWS[bestIdx].label;
}

export default function App() {
  const { period } = usePeriod();
  const { currentPeriodBaseline } = usePeriodData(period);
  const { locations } = useLocations();
  const { loadByPeriod: loadSiasatanByPeriod } = useSiasatan();
  const { loadByPeriod: loadOpsByPeriod } = usePenguatkuasaan();

  const [periodRecords, setPeriodRecords] = useState([]);
  const [periodOperations, setPeriodOperations] = useState([]);

  // Query Firestore only for records matching the selected period
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      loadSiasatanByPeriod(period),
      loadOpsByPeriod(period),
    ]).then(([recs, ops]) => {
      if (isMounted) {
        setPeriodRecords(recs);
        setPeriodOperations(ops);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [period, loadSiasatanByPeriod, loadOpsByPeriod]);

  // Accident-linked operations from Penguatkuasaan (where Kategori Kemalangan !== "Bukan kemalangan")
  const accidentOperations = useMemo(
    () =>
      periodOperations.filter(
        (o) => o.kategori_kemalangan && o.kategori_kemalangan !== "Bukan kemalangan"
      ),
    [periodOperations]
  );

  // Compute live location risk scores, case counts & peak time strictly from Siasatan + Penguatkuasaan
  const enrichedLocations = useMemo(() => {
    return locations.map((loc) => {
      const locRecs = periodRecords.filter((r) => r.location_id === loc.id);
      const locOps = periodOperations.filter((o) => o.location_id === loc.id);
      const locAccOps = locOps.filter(
        (o) => o.kategori_kemalangan && o.kategori_kemalangan !== "Bukan kemalangan"
      );
      const locFatalOps = locOps.filter(
        (o) => o.kategori_kemalangan === "Maut"
      );

      const cases = locRecs.length + locAccOps.length;
      const fatalCount =
        locRecs.filter((r) => r.maut).length + locFatalOps.length;
      const deathsCount =
        locRecs.reduce((sum, r) => sum + (r.maut ? r.bilangan_maut : 0), 0) +
        locFatalOps.length;

      const baseWeight = loc.is_blackspot ? 35 : 15;
      const risk =
        cases === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                100,
                baseWeight +
                  cases * 12 +
                  fatalCount * 15 +
                  deathsCount * 5 -
                  locOps.length * 4
              )
            );

      const peak_time = computePeakTimeWindow(locRecs, locAccOps);

      return {
        ...loc,
        cases,
        fatal_count: fatalCount,
        deaths_count: deathsCount,
        risk,
        peak_time,
        ops_count: locOps.length,
      };
    });
  }, [locations, periodRecords, periodOperations]);

  const {
    selectedLocationId,
    setSelectedLocationId,
    selectedLocation,
  } = useSelectedLocation(enrichedLocations);

  const siasatanFatalCount = periodRecords.filter((r) => r.maut).length;
  const siasatanDeathsCount = periodRecords.reduce(
    (sum, r) => sum + (r.maut ? r.bilangan_maut : 0),
    0
  );
  const opsFatalCount = accidentOperations.filter(
    (o) => o.kategori_kemalangan === "Maut"
  ).length;

  const totalCases = periodRecords.length + accidentOperations.length;
  const totalFatal = siasatanFatalCount + opsFatalCount;
  const totalDeaths = siasatanDeathsCount + opsFatalCount;
  const changePct = currentPeriodBaseline?.change ?? 0;

  // Build trend buckets strictly from actual Siasatan + Penguatkuasaan accident dates
  const liveTrend = useMemo(() => {
    const allDates = [
      ...periodRecords.map((r) => r.tarikh_kemalangan),
      ...accidentOperations.map((o) => o.tarikh),
    ].filter(Boolean);

    if (period === "weekly") {
      const now = new Date();
      const buckets = [0, 0, 0, 0, 0, 0, 0];
      const pad2 = (n) => String(n).padStart(2, "0");
      const dayKeys = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      });
      allDates.forEach((dt) => {
        const idx = dayKeys.indexOf(dt);
        if (idx !== -1) {
          buckets[idx] += 1;
        } else {
          buckets[0] += 1;
        }
      });
      return buckets;
    }

    if (period === "quarterly") {
      const now = new Date();
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
      const buckets = [0, 0, 0];
      allDates.forEach((dt) => {
        const monthNum = Number(dt.slice(5, 7));
        const idx = Math.max(0, Math.min(2, monthNum - qStartMonth));
        buckets[idx] += 1;
      });
      return buckets;
    }

    // Default: "monthly" -> 4 weekly buckets in the month (Days 1-7, 8-14, 15-21, 22-31)
    const buckets = [0, 0, 0, 0];
    allDates.forEach((dt) => {
      const dayNum = Number(dt.slice(8, 10));
      const idx = Math.max(0, Math.min(3, Math.floor((dayNum - 1) / 7)));
      buckets[idx] += 1;
    });
    return buckets;
  }, [period, periodRecords, accidentOperations]);

  const periodLabel = getPeriodLabelBM(period);

  return (
    <div>
      {/* ── Top Row: 4 Metric Cards ── */}
      <div className="grid grid-cols-4 max-[980px]:grid-cols-2 gap-3.5 max-[550px]:gap-2.5">
        <MetricCard
          label="Jumlah Kemalangan"
          value={totalCases}
          subtitle={`Semua kategori kes (${periodLabel})`}
        />
        <MetricCard
          label="Kemalangan Maut"
          value={totalFatal}
          subtitle="Kes berstatus maut"
        />
        <MetricCard
          label="Jumlah Kematian"
          value={totalDeaths}
          subtitle="Jumlah orang terkorban"
        />
        <MetricCard
          label="Perubahan Kes"
          value={`${changePct}%`}
          subtitle="Berbanding tempoh sebelumnya (simulasi)"
        />
      </div>

      {/* ── Middle Row: Trend Bar Chart + Location Risk Panel ── */}
      <div className="grid grid-cols-[1.45fr_1fr] max-[980px]:grid-cols-1 gap-4 mt-4">
        <TrendBarChart
          trend={liveTrend}
          period={period}
        />
        <LocationRisk
          location={selectedLocation}
          period={period}
          records={periodRecords}
          operations={periodOperations}
        />
      </div>

      {/* ── Bottom Row: Hotspot Map + Priority List ── */}
      <div className="grid grid-cols-[1.45fr_1fr] max-[980px]:grid-cols-1 gap-4 mt-4">
        <GoogleHotspotMap
          locations={enrichedLocations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
        />
        <HotspotList
          locations={enrichedLocations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
        />
      </div>
    </div>
  );
}
