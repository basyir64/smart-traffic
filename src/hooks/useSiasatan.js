import { useState, useCallback, useRef } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  startAfter,
  limit,
  where,
  setDoc,
  updateDoc,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../fb_cloud_firestore";
import { bootstrapFirestoreData } from "../services/bootstrapData";
import { getPeriodQueryConstraints } from "./usePeriodData";
import { coerceStoredSamanCategory } from "../utils/saman";

export const SIASATAN_PAGE_SIZE = 5;

export function normalizeSiasatan(raw) {
  const no_saman = raw.no_saman || "";
  const kategori_saman = coerceStoredSamanCategory(raw.kategori_saman);
  const melibatkan_binatang = Boolean(raw.melibatkan_binatang);
  const jenis_kemalangan = raw.jenis_kemalangan || "Rosak sahaja";
  const maut = Boolean(raw.maut ?? jenis_kemalangan === "Maut");
  const bilangan_maut = maut
    ? Math.max(1, Number(raw.bilangan_maut ?? 1))
    : 0;

  return {
    id: raw.id || no_saman.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    no_saman,
    kategori_saman,
    no_kenderaan: raw.no_kenderaan || "",
    no_ic: Number(raw.no_ic ?? 0),
    nama: raw.nama || "",
    umur: Number(raw.umur ?? 0),
    alamat: raw.alamat || "",
    tempat_kemalangan: raw.tempat_kemalangan || "Persekutuan",
    location_id: raw.location_id || "",
    location_name: raw.location_name || "",
    tarikh_kemalangan: raw.tarikh_kemalangan || "",
    waktu_kejadian: raw.waktu_kejadian || "",
    kategori_kenderaan: raw.kategori_kenderaan || "Motosikal",
    kesalahan: raw.kesalahan || "Kelajuan",
    melibatkan_binatang,
    jenis_binatang: melibatkan_binatang
      ? raw.jenis_binatang || "Lain-lain"
      : null,
    jenis_kemalangan,
    maut,
    bilangan_maut,
  };
}

/**
 * Quota-conscious Firestore hook for `siasatan` collection, modeled after
 * `useStoryService` and `useSituationService`:
 * - Uses native Firestore cursor pagination (`orderBy`, `startAfter`, `limit(5)`)
 *   so only 5 records are read when a page is requested.
 * - Uses `getCountFromServer` and `getAggregateFromServer(sum)` for summary counts.
 * - Supports on-demand element breakdown queries when a 9-Elemen row is expanded.
 */
export function useSiasatan() {
  const [pageRecords, setPageRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [loadingPage, setLoadingPage] = useState(false);

  // Cache the last doc snapshot of each page: pageEndCursorsRef.current[1] = lastDocOfPage1
  const pageEndCursorsRef = useRef({});
  const sortOrderRef = useRef("desc");

  // Count all siasatan documents using server-side aggregation
  const countAllSiasatan = useCallback(async (constraints = []) => {
    try {
      await bootstrapFirestoreData();
      const q = query(collection(db, "siasatan"), ...constraints);
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (err) {
      console.error("[useSiasatan] Error getting count:", err.message);
      return 0;
    }
  }, []);

  // Sum bilangan_maut using server-side aggregation
  const sumDeathsByQuery = useCallback(async (constraints = []) => {
    try {
      await bootstrapFirestoreData();
      const q = query(collection(db, "siasatan"), ...constraints);
      const snapshot = await getAggregateFromServer(q, {
        totalDeaths: sum("bilangan_maut"),
      });
      return snapshot.data().totalDeaths || 0;
    } catch (err) {
      console.error("[useSiasatan] Error getting sum:", err.message);
      return 0;
    }
  }, []);

  // Load records matching constraints (used on-demand when a 9-Elemen parent item is expanded, or by period on Dashboard)
  const loadByQuery = useCallback(async (constraints = []) => {
    try {
      await bootstrapFirestoreData();
      const q = query(collection(db, "siasatan"), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) =>
        normalizeSiasatan({ id: d.id, ...d.data() })
      );
    } catch (err) {
      console.error("[useSiasatan] Error in loadByQuery:", err.message);
      return [];
    }
  }, []);

  const loadByPeriod = useCallback(
    async (period = "monthly") => {
      const constraints = getPeriodQueryConstraints(
        "tarikh_kemalangan",
        period
      );
      return loadByQuery(constraints);
    },
    [loadByQuery]
  );

  // Native Firestore cursor-paginated loader (fires ONLY when page or sort order changes)
  const loadPage = useCallback(
    async (targetPage = 1, forceReset = false, customOrder = null) => {
      setLoadingPage(true);
      try {
        await bootstrapFirestoreData();
        const coll = collection(db, "siasatan");
        const effectiveOrder = customOrder || sortOrderRef.current;

        if (customOrder && customOrder !== sortOrderRef.current) {
          sortOrderRef.current = customOrder;
          setSortOrder(customOrder);
          pageEndCursorsRef.current = {};
        } else if (forceReset) {
          pageEndCursorsRef.current = {};
        }

        // Refresh total count on page 1 or reset
        if (targetPage === 1 || forceReset || totalCount === 0) {
          const countSnap = await getCountFromServer(coll);
          setTotalCount(countSnap.data().count);
        }

        if (targetPage === 1) {
          const firstQuery = query(
            coll,
            orderBy("tarikh_kemalangan", effectiveOrder),
            limit(SIASATAN_PAGE_SIZE)
          );
          const snapshot = await getDocs(firstQuery);
          const docs = snapshot.docs.map((d) =>
            normalizeSiasatan({ id: d.id, ...d.data() })
          );
          if (snapshot.docs.length > 0) {
            pageEndCursorsRef.current[1] =
              snapshot.docs[snapshot.docs.length - 1];
          }
          setPageRecords(docs);
          setCurrentPage(1);
          return docs;
        }

        // Ensure we have the cursor for (targetPage - 1); if user jumped ahead, walk cursors sequentially
        for (let p = 1; p < targetPage; p++) {
          if (!pageEndCursorsRef.current[p]) {
            const prevCursor = p === 1 ? null : pageEndCursorsRef.current[p - 1];
            const stepQuery = prevCursor
              ? query(
                  coll,
                  orderBy("tarikh_kemalangan", effectiveOrder),
                  startAfter(prevCursor),
                  limit(SIASATAN_PAGE_SIZE)
                )
              : query(
                  coll,
                  orderBy("tarikh_kemalangan", effectiveOrder),
                  limit(SIASATAN_PAGE_SIZE)
                );
            const stepSnap = await getDocs(stepQuery);
            if (stepSnap.docs.length > 0) {
              pageEndCursorsRef.current[p] =
                stepSnap.docs[stepSnap.docs.length - 1];
            }
          }
        }

        const cursorAfter = pageEndCursorsRef.current[targetPage - 1];
        const nextQuery = cursorAfter
          ? query(
              coll,
              orderBy("tarikh_kemalangan", effectiveOrder),
              startAfter(cursorAfter),
              limit(SIASATAN_PAGE_SIZE)
            )
          : query(
              coll,
              orderBy("tarikh_kemalangan", effectiveOrder),
              limit(SIASATAN_PAGE_SIZE)
            );

        const snapshot = await getDocs(nextQuery);
        const docs = snapshot.docs.map((d) =>
          normalizeSiasatan({ id: d.id, ...d.data() })
        );
        if (snapshot.docs.length > 0) {
          pageEndCursorsRef.current[targetPage] =
            snapshot.docs[snapshot.docs.length - 1];
        }
        setPageRecords(docs);
        setCurrentPage(targetPage);
        return docs;
      } catch (err) {
        console.error("[useSiasatan] Error loading page:", err.message);
        return [];
      } finally {
        setLoadingPage(false);
      }
    },
    [totalCount]
  );

  const toggleSortOrder = useCallback(() => {
    const nextOrder = sortOrderRef.current === "desc" ? "asc" : "desc";
    return loadPage(1, true, nextOrder);
  }, [loadPage]);

  // Fetch top-level summary metrics for 9-Elemen (Elements 1, 2, 3)
  const loadSummaryMetrics = useCallback(
    async (period = "all") => {
      await bootstrapFirestoreData();
      const constraints = getPeriodQueryConstraints(
        "tarikh_kemalangan",
        period
      );

      // When period === 'all', use pure server-side count & sum queries (zero document reads)
      if (period === "all") {
        const [totalCases, fatalCases, totalDeaths, animalCases] =
          await Promise.all([
            countAllSiasatan([]),
            countAllSiasatan([where("maut", "==", true)]),
            sumDeathsByQuery([]),
            countAllSiasatan([where("melibatkan_binatang", "==", true)]),
          ]);
        return { totalCases, fatalCases, totalDeaths, animalCases };
      }

      // With single-field date range constraints, getCountFromServer & getAggregateFromServer work for totalCases & totalDeaths
      const [totalCases, totalDeaths, docs] = await Promise.all([
        countAllSiasatan(constraints),
        sumDeathsByQuery(constraints),
        loadByQuery(constraints),
      ]);
      const fatalCases = docs.filter((r) => r.maut).length;
      const animalCases = docs.filter((r) => r.melibatkan_binatang).length;
      return { totalCases, fatalCases, totalDeaths, animalCases };
    },
    [countAllSiasatan, sumDeathsByQuery, loadByQuery]
  );

  // On-demand Firestore fetch for a specific 9-Elemen parent item when expanded
  const loadElementSubItems = useCallback(
    async (elementNumber, period = "all") => {
      await bootstrapFirestoreData();
      const dateConstraints = getPeriodQueryConstraints(
        "tarikh_kemalangan",
        period
      );

      // When period === 'all', Elements 4, 6, 7, 9 can use server-side getCountFromServer per category
      if (period === "all") {
        if (elementNumber === 4) {
          const types = [
            ["- Lebuhraya", "Lebuh Raya"],
            ["- Persekutuan", "Persekutuan"],
            ["- Negeri", "Negeri"],
            ["- Lain-lain", "Lain-lain"],
          ];
          return Promise.all(
            types.map(async ([label, val]) => ({
              label,
              value: `${await countAllSiasatan([where("tempat_kemalangan", "==", val)])} kes`,
            }))
          );
        }
        if (elementNumber === 6) {
          const animals = ["Kerbau", "Lembu", "Babi", "Lain-lain"];
          return Promise.all(
            animals.map(async (animal) => ({
              label: `- ${animal}`,
              value: `${await countAllSiasatan([where("jenis_binatang", "==", animal)])} kes`,
            }))
          );
        }
        if (elementNumber === 7) {
          const cats = [
            "Motosikal",
            "Kereta",
            "MPV / SUV",
            "Van",
            "Bas",
            "Lori / Kenderaan Berat",
            "Basikal",
            "Lain-lain",
          ];
          return Promise.all(
            cats.map(async (cat) => ({
              label: `- ${cat}`,
              value: `${await countAllSiasatan([where("kategori_kenderaan", "==", cat)])} kes`,
            }))
          );
        }
        if (elementNumber === 9) {
          const faults = [
            "Kelajuan",
            "Tidak peka keadaan sekeliling",
            "Gagal patuh isyarat",
            "Keadaan jalan",
            "Langgar binatang",
            "Faktor kenderaan",
            "Lain-lain",
          ];
          return Promise.all(
            faults.map(async (fault) => ({
              label: `- ${fault}`,
              value: `${await countAllSiasatan([where("kesalahan", "==", fault)])} kes`,
            }))
          );
        }
      }

      // Query period-filtered records on demand when this element is expanded
      const docs = await loadByQuery(dateConstraints);
      const countWhere = (fn) => docs.filter(fn).length;

      const isInTimeBucket = (timeStr, minMin, maxMin) => {
        if (!timeStr) return false;
        if (timeStr === "00:00" && minMin === 0) return true;
        const parts = String(timeStr).split(":");
        if (parts.length < 2) return false;
        const m = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        return !isNaN(m) && m >= minMin && m <= maxMin;
      };

      const isInAgeBucket = (age, minA, maxA) => {
        const n = Number(age);
        return !isNaN(n) && n >= minA && n <= maxA;
      };

      switch (elementNumber) {
        case 4:
          return [
            {
              label: "- Lebuhraya",
              value: `${countWhere((r) => r.tempat_kemalangan === "Lebuh Raya")} kes`,
            },
            {
              label: "- Persekutuan",
              value: `${countWhere((r) => r.tempat_kemalangan === "Persekutuan")} kes`,
            },
            {
              label: "- Negeri",
              value: `${countWhere((r) => r.tempat_kemalangan === "Negeri")} kes`,
            },
            {
              label: "- Lain-lain",
              value: `${countWhere((r) => r.tempat_kemalangan === "Lain-lain")} kes`,
            },
          ];
        case 5:
          return [
            {
              label: "- 0000-0400",
              value: `${countWhere((r) => isInTimeBucket(r.waktu_kejadian, 0, 240))} kes`,
            },
            {
              label: "- 0401-0800",
              value: `${countWhere((r) => isInTimeBucket(r.waktu_kejadian, 241, 480))} kes`,
            },
            {
              label: "- 0801-1200",
              value: `${countWhere((r) => isInTimeBucket(r.waktu_kejadian, 481, 720))} kes`,
            },
            {
              label: "- 1201-1600",
              value: `${countWhere((r) => isInTimeBucket(r.waktu_kejadian, 721, 960))} kes`,
            },
            {
              label: "- 1601-2000",
              value: `${countWhere((r) => isInTimeBucket(r.waktu_kejadian, 961, 1200))} kes`,
            },
            {
              label: "- 2001-2400",
              value: `${countWhere((r) => isInTimeBucket(r.waktu_kejadian, 1201, 1439))} kes`,
            },
          ];
        case 6:
          return [
            {
              label: "- Kerbau",
              value: `${countWhere((r) => r.melibatkan_binatang && r.jenis_binatang === "Kerbau")} kes`,
            },
            {
              label: "- Lembu",
              value: `${countWhere((r) => r.melibatkan_binatang && r.jenis_binatang === "Lembu")} kes`,
            },
            {
              label: "- Babi",
              value: `${countWhere((r) => r.melibatkan_binatang && r.jenis_binatang === "Babi")} kes`,
            },
            {
              label: "- Lain-lain",
              value: `${countWhere((r) => r.melibatkan_binatang && r.jenis_binatang === "Lain-lain")} kes`,
            },
          ];
        case 7:
          return [
            "Motosikal",
            "Kereta",
            "MPV / SUV",
            "Van",
            "Bas",
            "Lori / Kenderaan Berat",
            "Basikal",
            "Lain-lain",
          ].map((cat) => ({
            label: `- ${cat}`,
            value: `${countWhere((r) => r.kategori_kenderaan === cat)} kes`,
          }));
        case 8:
          return [
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
          ]
            .map(([rangeLabel, minA, maxA]) => ({
              label: `- ${rangeLabel}`,
              value: `${countWhere((r) => isInAgeBucket(r.umur, minA, maxA))} kes`,
            }))
            .concat([
              {
                label: "- >75",
                value: `${countWhere((r) => !isNaN(Number(r.umur)) && Number(r.umur) > 75)} kes`,
              },
            ]);
        case 9:
          return [
            "Kelajuan",
            "Tidak peka keadaan sekeliling",
            "Gagal patuh isyarat",
            "Keadaan jalan",
            "Langgar binatang",
            "Faktor kenderaan",
            "Lain-lain",
          ].map((fault) => ({
            label: `- ${fault}`,
            value: `${countWhere((r) => r.kesalahan === fault)} kes`,
          }));
        default:
          return [];
      }
    },
    [countAllSiasatan, loadByQuery]
  );

  const addSiasatan = useCallback(
    async (payload) => {
      const normalized = normalizeSiasatan({
        ...payload,
        id:
          payload.id ||
          `${String(payload.no_saman || "smn")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      });

      const { id, ...docFields } = normalized;
      await setDoc(doc(db, "siasatan", id), {
        ...docFields,
        created_at: serverTimestamp(),
      });

      // Reset pagination cursors and reload page 1 after inserting a new record
      await loadPage(1, true);
      return normalized;
    },
    [loadPage]
  );

  const updateSiasatan = useCallback(
    async (id, payload) => {
      if (!id) throw new Error("ID rekod siasatan diperlukan.");
      const normalized = normalizeSiasatan({
        ...payload,
        id,
      });

      const { id: docId, ...docFields } = normalized;
      await updateDoc(doc(db, "siasatan", docId), {
        ...docFields,
        updated_at: serverTimestamp(),
      });

      await loadPage(currentPage, true);
      return normalized;
    },
    [loadPage, currentPage]
  );

  return {
    pageRecords,
    totalCount,
    currentPage,
    sortOrder,
    loadingPage,
    loadPage,
    toggleSortOrder,
    loadByQuery,
    loadByPeriod,
    countAllSiasatan,
    loadSummaryMetrics,
    loadElementSubItems,
    addSiasatan,
    updateSiasatan,
  };
}
