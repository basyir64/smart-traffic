import { useState, useCallback, useRef } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  startAfter,
  limit,
  setDoc,
  updateDoc,
  getCountFromServer,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../fb_cloud_firestore";
import { bootstrapFirestoreData } from "../services/bootstrapData";
import { getPeriodQueryConstraints } from "./usePeriodData";
import { normalizeSamanList } from "../utils/saman";
import { CUSTOM_LOCATION_ID } from "../utils/locations";

export const PENGUATKUASAAN_PAGE_SIZE = 5;

export function normalizeOperation(raw) {
  const saman_list = normalizeSamanList(raw.saman_list);
  const location_id = raw.location_id || "";
  const is_custom_location = Boolean(
    raw.is_custom_location || location_id === CUSTOM_LOCATION_ID
  );

  return {
    id: raw.id || `op-${Date.now()}`,
    tarikh: raw.tarikh || "",
    location_id,
    location_name: is_custom_location
      ? String(raw.location_name || "").trim().toUpperCase()
      : raw.location_name || "",
    is_custom_location,
    kategori_kemalangan: raw.kategori_kemalangan || "Maut",
    jenis_operasi: raw.jenis_operasi || "Pematuhan",
    tangkapan: Math.max(0, Number(raw.tangkapan ?? 0)),
    sita: Math.max(0, Number(raw.sita ?? 0)),
    jam_mula: raw.jam_mula || "20:00",
    jam_akhir: raw.jam_akhir || "23:00",
    saman_list,
  };
}

/**
 * Quota-conscious Firestore hook for `penguatkuasaan` collection, modeled after
 * `useSituationService` and `useStoryService`:
 * - Uses native Firestore cursor pagination (`orderBy("tarikh", "desc")`, `startAfter`, `limit(5)`)
 *   so only 5 records are read when a page is requested.
 * - Uses `getCountFromServer` for total operation count.
 */
export function usePenguatkuasaan() {
  const [pageOperations, setPageOperations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [loadingPage, setLoadingPage] = useState(false);

  // Cache the last doc snapshot of each page: pageEndCursorsRef.current[1] = lastDocOfPage1
  const pageEndCursorsRef = useRef({});
  const sortOrderRef = useRef("desc");
  const periodFilterRef = useRef("all");
  const totalCountRef = useRef(0);

  const loadByQuery = useCallback(async (constraints = []) => {
    try {
      await bootstrapFirestoreData();
      const q = query(collection(db, "penguatkuasaan"), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) =>
        normalizeOperation({ id: d.id, ...d.data() })
      );
    } catch (err) {
      console.error("[usePenguatkuasaan] Error in loadByQuery:", err.message);
      return [];
    }
  }, []);

  const loadByPeriod = useCallback(
    async (period = "monthly") => {
      const constraints = getPeriodQueryConstraints("tarikh", period);
      return loadByQuery(constraints);
    },
    [loadByQuery]
  );

  // Native Firestore cursor-paginated loader (fires ONLY when page, sort order, or period changes)
  const loadPage = useCallback(
    async (
      targetPage = 1,
      forceReset = false,
      customOrder = null,
      customPeriod = null
    ) => {
      setLoadingPage(true);
      try {
        await bootstrapFirestoreData();
        const coll = collection(db, "penguatkuasaan");
        const effectiveOrder = customOrder || sortOrderRef.current;
        const effectivePeriod = customPeriod ?? periodFilterRef.current;

        if (customOrder && customOrder !== sortOrderRef.current) {
          sortOrderRef.current = customOrder;
          setSortOrder(customOrder);
          pageEndCursorsRef.current = {};
        }
        if (customPeriod !== null && customPeriod !== periodFilterRef.current) {
          periodFilterRef.current = customPeriod;
          setPeriodFilter(customPeriod);
          pageEndCursorsRef.current = {};
        }
        if (forceReset) {
          pageEndCursorsRef.current = {};
        }

        const dateConstraints = getPeriodQueryConstraints(
          "tarikh",
          effectivePeriod
        );

        // Refresh total count on page 1, filter change, reset, or before first count
        if (
          targetPage === 1 ||
          forceReset ||
          customPeriod !== null ||
          totalCountRef.current === 0
        ) {
          const countQuery = dateConstraints.length
            ? query(coll, ...dateConstraints)
            : coll;
          const countSnap = await getCountFromServer(countQuery);
          const freshCount = countSnap.data().count;
          totalCountRef.current = freshCount;
          setTotalCount(freshCount);
        }

        const maxPages = Math.max(
          1,
          Math.ceil(totalCountRef.current / PENGUATKUASAAN_PAGE_SIZE)
        );
        const safeTargetPage = Math.min(Math.max(1, targetPage), maxPages);

        if (safeTargetPage === 1) {
          const firstQuery = query(
            coll,
            ...dateConstraints,
            orderBy("tarikh", effectiveOrder),
            limit(PENGUATKUASAAN_PAGE_SIZE)
          );
          const snapshot = await getDocs(firstQuery);
          const docs = snapshot.docs.map((d) =>
            normalizeOperation({ id: d.id, ...d.data() })
          );
          if (snapshot.docs.length > 0) {
            pageEndCursorsRef.current[1] =
              snapshot.docs[snapshot.docs.length - 1];
          }
          setPageOperations(docs);
          setCurrentPage(1);
          return docs;
        }

        // Ensure we have the cursor for (safeTargetPage - 1); if user jumped ahead, walk cursors sequentially
        for (let p = 1; p < safeTargetPage; p++) {
          if (!pageEndCursorsRef.current[p]) {
            const prevCursor = p === 1 ? null : pageEndCursorsRef.current[p - 1];
            const stepQuery = prevCursor
              ? query(
                  coll,
                  ...dateConstraints,
                  orderBy("tarikh", effectiveOrder),
                  startAfter(prevCursor),
                  limit(PENGUATKUASAAN_PAGE_SIZE)
                )
              : query(
                  coll,
                  ...dateConstraints,
                  orderBy("tarikh", effectiveOrder),
                  limit(PENGUATKUASAAN_PAGE_SIZE)
                );
            const stepSnap = await getDocs(stepQuery);
            if (stepSnap.docs.length > 0) {
              pageEndCursorsRef.current[p] =
                stepSnap.docs[stepSnap.docs.length - 1];
            }
          }
        }

        const cursorAfter = pageEndCursorsRef.current[safeTargetPage - 1];
        const nextQuery = cursorAfter
          ? query(
              coll,
              ...dateConstraints,
              orderBy("tarikh", effectiveOrder),
              startAfter(cursorAfter),
              limit(PENGUATKUASAAN_PAGE_SIZE)
            )
          : query(
              coll,
              ...dateConstraints,
              orderBy("tarikh", effectiveOrder),
              limit(PENGUATKUASAAN_PAGE_SIZE)
            );

        const snapshot = await getDocs(nextQuery);
        const docs = snapshot.docs.map((d) =>
          normalizeOperation({ id: d.id, ...d.data() })
        );
        if (snapshot.docs.length > 0) {
          pageEndCursorsRef.current[safeTargetPage] =
            snapshot.docs[snapshot.docs.length - 1];
        }
        setPageOperations(docs);
        setCurrentPage(safeTargetPage);
        return docs;
      } catch (err) {
        console.error("[usePenguatkuasaan] Error loading page:", err.message);
        return [];
      } finally {
        setLoadingPage(false);
      }
    },
    []
  );

  const toggleSortOrder = useCallback(() => {
    const nextOrder = sortOrderRef.current === "desc" ? "asc" : "desc";
    return loadPage(1, true, nextOrder);
  }, [loadPage]);

  const changePeriodFilter = useCallback(
    (nextPeriod) => {
      return loadPage(1, true, null, nextPeriod || "all");
    },
    [loadPage]
  );

  const loadAllForPrint = useCallback(
    async (period = periodFilterRef.current, order = sortOrderRef.current) => {
      const dateConstraints = getPeriodQueryConstraints("tarikh", period);
      return loadByQuery([...dateConstraints, orderBy("tarikh", order)]);
    },
    [loadByQuery]
  );

  const addPenguatkuasaan = useCallback(
    async (payload) => {
      const normalized = normalizeOperation({
        ...payload,
        id: payload.id || `op-${Date.now()}`,
      });

      const { id, ...docFields } = normalized;
      await setDoc(doc(db, "penguatkuasaan", id), {
        ...docFields,
        created_at: serverTimestamp(),
      });

      await loadPage(1, true);
      return normalized;
    },
    [loadPage]
  );

  const updatePenguatkuasaan = useCallback(
    async (id, payload) => {
      if (!id) throw new Error("ID rekod operasi diperlukan.");
      const normalized = normalizeOperation({
        ...payload,
        id,
      });

      const { id: docId, ...docFields } = normalized;
      await updateDoc(doc(db, "penguatkuasaan", docId), {
        ...docFields,
        updated_at: serverTimestamp(),
      });

      await loadPage(currentPage, true);
      return normalized;
    },
    [loadPage, currentPage]
  );

  return {
    pageOperations,
    totalCount,
    currentPage,
    sortOrder,
    periodFilter,
    loadingPage,
    loadPage,
    toggleSortOrder,
    changePeriodFilter,
    loadAllForPrint,
    loadByQuery,
    loadByPeriod,
    addPenguatkuasaan,
    updatePenguatkuasaan,
  };
}
