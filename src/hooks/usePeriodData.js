import { useState, useEffect } from "react";
import { collection, getDocs, where } from "firebase/firestore";
import { db } from "../fb_cloud_firestore";
import { bootstrapFirestoreData } from "../services/bootstrapData";

const BM_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mac",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Ogo",
  "Sep",
  "Okt",
  "Nov",
  "Dis",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatYMD(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateBM(ymd, includeYear = true) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const monthName = BM_MONTHS_SHORT[(m || 1) - 1] || "";
  return includeYear ? `${d} ${monthName} ${y}` : `${d} ${monthName}`;
}

export function getPeriodLabelBM(period) {
  if (period === "weekly") return "Mingguan";
  if (period === "monthly") return "Bulanan";
  if (period === "quarterly") return "Suku Tahun";
  if (period === "all") return "Semua Rekod";
  return period || "Bulanan";
}

/**
 * Returns { startDate, endDate } in YYYY-MM-DD format for a given period
 * ("weekly" | "monthly" | "quarterly" | "all") using the strict system clock (new Date()).
 */
export function getPeriodDateRange(period) {
  if (!period || period === "all") {
    return { startDate: null, endDate: null };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === "weekly") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: formatYMD(start), endDate: formatYMD(now) };
  }

  if (period === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { startDate: formatYMD(start), endDate: formatYMD(end) };
  }

  if (period === "quarterly") {
    const qStartMonth = Math.floor(month / 3) * 3;
    const start = new Date(year, qStartMonth, 1);
    const end = new Date(year, qStartMonth + 3, 0);
    return { startDate: formatYMD(start), endDate: formatYMD(end) };
  }

  return { startDate: null, endDate: null };
}

/**
 * Formats the active period's date range in Bahasa Melayu, e.g.:
 * - weekly: "7 Nov – 14 Nov 2026"
 * - monthly: "1 Nov – 30 Nov 2026"
 * - quarterly: "1 Okt – 31 Dis 2026 (S4)"
 * - all: "Semua Rekod"
 */
export function formatPeriodDateRangeBM(period) {
  if (!period || period === "all") {
    return "Semua Rekod";
  }
  const { startDate, endDate } = getPeriodDateRange(period);
  if (!startDate || !endDate) return "Semua Rekod";

  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const startFormatted = formatDateBM(startDate, !sameYear);
  const endFormatted = formatDateBM(endDate, true);

  if (period === "quarterly") {
    const monthNum = Number(startDate.slice(5, 7));
    const qNum = Math.floor((monthNum - 1) / 3) + 1;
    return `${startFormatted} – ${endFormatted} (Suku ${qNum})`;
  }

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Builds Firestore query constraints on a date field (e.g. "tarikh_kemalangan" or "tarikh")
 * for the selected period. Uses single-field range constraints so no composite index is required.
 */
export function getPeriodQueryConstraints(dateField, period) {
  const { startDate, endDate } = getPeriodDateRange(period);
  if (!startDate || !endDate) return [];
  return [
    where(dateField, ">=", startDate),
    where(dateField, "<=", endDate),
  ];
}

/**
 * Checks whether a YYYY-MM-DD date string falls within the selected period
 * ("weekly" | "monthly" | "quarterly" | "all") using the strict system clock (new Date()).
 */
export function isDateInPeriod(dateStr, period) {
  if (!dateStr || period === "all") return true;
  const { startDate, endDate } = getPeriodDateRange(period);
  if (!startDate || !endDate) return true;
  return dateStr >= startDate && dateStr <= endDate;
}

export function usePeriodData(activePeriod = "monthly") {
  const [periods, setPeriods] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    bootstrapFirestoreData()
      .then(() => getDocs(collection(db, "periods")))
      .then((snapshot) => {
        if (!isMounted) return;
        const map = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const key = data.type || d.id;
          if (key) {
            map[key] = { ...data, id: d.id };
          }
        });
        setPeriods(map);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[usePeriodData] Firestore error:", err.message);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentPeriodBaseline = periods[activePeriod] || null;

  return {
    periods,
    currentPeriodBaseline,
    loading,
    isDateInPeriod,
    getPeriodDateRange,
    getPeriodQueryConstraints,
    getPeriodLabelBM,
    formatPeriodDateRangeBM,
  };
}
