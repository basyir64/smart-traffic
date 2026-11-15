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

export const PENGUATKUASAAN_PAGE_SIZE = 5;

export function normalizeOperation(raw) {
  const saman_list = normalizeSamanList(raw.saman_list);

  return {
    id: raw.id || `op-${Date.now()}`,
    tarikh: raw.tarikh || "",
    location_id: raw.location_id || "",
    location_name: raw.location_name || "",
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
  const [loadingPage, setLoadingPage] = useState(false);

  // Cache the last doc snapshot of each page: pageEndCursorsRef.current[1] = lastDocOfPage1
  const pageEndCursorsRef = useRef({});
  const sortOrderRef = useRef("desc");

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

  // Native Firestore cursor-paginated loader (fires ONLY when page or sort order changes)
  const loadPage = useCallback(
    async (targetPage = 1, forceReset = false, customOrder = null) => {
      setLoadingPage(true);
      try {
        await bootstrapFirestoreData();
        const coll = collection(db, "penguatkuasaan");
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

        // Ensure we have the cursor for (targetPage - 1); if user jumped ahead, walk cursors sequentially
        for (let p = 1; p < targetPage; p++) {
          if (!pageEndCursorsRef.current[p]) {
            const prevCursor = p === 1 ? null : pageEndCursorsRef.current[p - 1];
            const stepQuery = prevCursor
              ? query(
                  coll,
                  orderBy("tarikh", effectiveOrder),
                  startAfter(prevCursor),
                  limit(PENGUATKUASAAN_PAGE_SIZE)
                )
              : query(
                  coll,
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

        const cursorAfter = pageEndCursorsRef.current[targetPage - 1];
        const nextQuery = cursorAfter
          ? query(
              coll,
              orderBy("tarikh", effectiveOrder),
              startAfter(cursorAfter),
              limit(PENGUATKUASAAN_PAGE_SIZE)
            )
          : query(
              coll,
              orderBy("tarikh", effectiveOrder),
              limit(PENGUATKUASAAN_PAGE_SIZE)
            );

        const snapshot = await getDocs(nextQuery);
        const docs = snapshot.docs.map((d) =>
          normalizeOperation({ id: d.id, ...d.data() })
        );
        if (snapshot.docs.length > 0) {
          pageEndCursorsRef.current[targetPage] =
            snapshot.docs[snapshot.docs.length - 1];
        }
        setPageOperations(docs);
        setCurrentPage(targetPage);
        return docs;
      } catch (err) {
        console.error("[usePenguatkuasaan] Error loading page:", err.message);
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
    loadingPage,
    loadPage,
    toggleSortOrder,
    loadByQuery,
    loadByPeriod,
    addPenguatkuasaan,
    updatePenguatkuasaan,
  };
}
