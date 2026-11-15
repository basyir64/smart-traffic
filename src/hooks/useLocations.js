import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../fb_cloud_firestore";
import { bootstrapFirestoreData } from "../services/bootstrapData";

export const LOKASI_PAGE_SIZE = 5;

function normalizeLocation(raw) {
  const is_blackspot = Boolean(raw.is_blackspot);
  const road_type = raw.road_type || "Persekutuan";
  const coordinates = raw.coordinates || { x: 320, y: 140 };
  const geo = raw.geo || { lat: 4.3606, lng: 100.965 };

  return {
    id: raw.id,
    name: raw.name || "",
    route: raw.route || "",
    km: raw.km || "",
    landmark: raw.landmark || "",
    road_type,
    is_blackspot,
    source: raw.source || "LAMPIRAN BLACKSPOT",
    active: raw.active !== undefined ? Boolean(raw.active) : true,
    coordinates,
    geo,
  };
}

export function useLocations({ paginated = false } = {}) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(!paginated);

  // Native Firestore cursor-based pagination state (5 records per page)
  const [pageLocations, setPageLocations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc");
  const sortOrderRef = useRef("asc");

  // Store the last DocumentSnapshot of each visited page: { [pageNumber]: QueryDocumentSnapshot }
  const pageEndCursorsRef = useRef({});
  const totalCountRef = useRef(0);

  const loadPage = useCallback(
    async (targetPage = 1, forceReset = false, customOrder = null) => {
      setLoadingPage(true);
      try {
        await bootstrapFirestoreData();
        const coll = collection(db, "locations");
        const effectiveOrder = customOrder || sortOrderRef.current;

        if (customOrder && customOrder !== sortOrderRef.current) {
          sortOrderRef.current = customOrder;
          setSortOrder(customOrder);
          pageEndCursorsRef.current = {};
        } else if (forceReset) {
          pageEndCursorsRef.current = {};
        }

        if (targetPage === 1 || forceReset || totalCountRef.current === 0) {
          const countSnap = await getCountFromServer(coll);
          const nextTotal = countSnap.data().count;
          totalCountRef.current = nextTotal;
          setTotalCount(nextTotal);
        }

        if (targetPage === 1) {
          const firstQuery = query(
            coll,
            orderBy("name", effectiveOrder),
            limit(LOKASI_PAGE_SIZE)
          );
          const snapshot = await getDocs(firstQuery);
          const docs = snapshot.docs.map((d) =>
            normalizeLocation({ id: d.id, ...d.data() })
          );
          if (snapshot.docs.length > 0) {
            pageEndCursorsRef.current[1] =
              snapshot.docs[snapshot.docs.length - 1];
          }
          setPageLocations(docs);
          setCurrentPage(1);
          return docs;
        }

        for (let p = 1; p < targetPage; p++) {
          if (!pageEndCursorsRef.current[p]) {
            const prevCursor =
              p === 1 ? null : pageEndCursorsRef.current[p - 1];
            const stepQuery = prevCursor
              ? query(
                  coll,
                  orderBy("name", effectiveOrder),
                  startAfter(prevCursor),
                  limit(LOKASI_PAGE_SIZE)
                )
              : query(
                  coll,
                  orderBy("name", effectiveOrder),
                  limit(LOKASI_PAGE_SIZE)
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
              orderBy("name", effectiveOrder),
              startAfter(cursorAfter),
              limit(LOKASI_PAGE_SIZE)
            )
          : query(
              coll,
              orderBy("name", effectiveOrder),
              limit(LOKASI_PAGE_SIZE)
            );

        const snapshot = await getDocs(nextQuery);
        const docs = snapshot.docs.map((d) =>
          normalizeLocation({ id: d.id, ...d.data() })
        );
        if (snapshot.docs.length > 0) {
          pageEndCursorsRef.current[targetPage] =
            snapshot.docs[snapshot.docs.length - 1];
        }
        setPageLocations(docs);
        setCurrentPage(targetPage);
        return docs;
      } catch (err) {
        console.error("[useLocations] Error loading page:", err.message);
        return [];
      } finally {
        setLoadingPage(false);
      }
    },
    []
  );

  const toggleSortOrder = useCallback(() => {
    const nextOrder = sortOrderRef.current === "asc" ? "desc" : "asc";
    return loadPage(1, true, nextOrder);
  }, [loadPage]);

  useEffect(() => {
    if (paginated) {
      let isMounted = true;
      Promise.resolve().then(() => {
        if (isMounted) return loadPage(1, true);
        return null;
      });
      return () => {
        isMounted = false;
      };
    }

    let unsubscribe = null;
    let isMounted = true;

    bootstrapFirestoreData().finally(() => {
      if (!isMounted) return;
      const collRef = collection(db, "locations");
      unsubscribe = onSnapshot(
        collRef,
        (snapshot) => {
          if (!isMounted) return;
          const docs = snapshot.docs.map((d) =>
            normalizeLocation({ id: d.id, ...d.data() })
          );
          setLocations(docs);
          setLoading(false);
        },
        (err) => {
          console.error("[useLocations] Firestore error:", err.message);
          setLoading(false);
        }
      );
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [paginated, loadPage]);

  const activeLocations = useMemo(
    () => locations.filter((l) => l.active),
    [locations]
  );

  const addLocation = useCallback(
    async (input) => {
      const route = String(input.route || "").trim().toUpperCase();
      const km = String(input.km || "").trim().toUpperCase();
      const landmark = String(input.landmark || "").trim().toUpperCase();

      if (!route) {
        throw new Error("Sila masukkan Nama Laluan.");
      }

      const prefix = km ? `${km} ` : "";
      const suffix = landmark ? ` (${landmark})` : "";
      const name = `${prefix}${route}${suffix}`.trim();

      const slugify = (text) =>
        String(text || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const baseId = slugify(`${km ? km + "-" : ""}${route}`) || `loc-${Date.now()}`;
      let id = baseId;

      const existingBase = await getDoc(doc(db, "locations", id));
      if (existingBase.exists()) {
        if (String(existingBase.data()?.name || "").trim() === name) {
          throw new Error(`Lokasi "${name}" sudah wujud dalam sistem.`);
        }
        const landmarkSlug = slugify(landmark);
        const candidateId = landmarkSlug ? `${baseId}-${landmarkSlug}` : "";
        if (candidateId) {
          const existingCandidate = await getDoc(
            doc(db, "locations", candidateId)
          );
          if (!existingCandidate.exists()) {
            id = candidateId;
          } else if (
            String(existingCandidate.data()?.name || "").trim() === name
          ) {
            throw new Error(`Lokasi "${name}" sudah wujud dalam sistem.`);
          } else {
            id = `${candidateId}-${Date.now().toString(36)}`;
          }
        } else {
          id = `${baseId}-${Date.now().toString(36)}`;
        }
      }

      const is_blackspot = Boolean(input.is_blackspot);
      const active = input.active !== undefined ? Boolean(input.active) : true;
      const road_type = input.road_type || "Persekutuan";
      const source = input.source || "LAMPIRAN BLACKSPOT";

      const parsedLat = parseFloat(input.lat);
      const parsedLng = parseFloat(input.lng);
      const hasValidGeo = !isNaN(parsedLat) && !isNaN(parsedLng);

      const geo = hasValidGeo
        ? { lat: parsedLat, lng: parsedLng }
        : {
            lat: Number((4.32 + Math.random() * 0.12).toFixed(4)),
            lng: Number((100.85 + Math.random() * 0.14).toFixed(4)),
          };

      const coordinates = {
        x: 140 + Math.round(Math.random() * 380),
        y: 70 + Math.round(Math.random() * 160),
      };

      const newLoc = normalizeLocation({
        id,
        name,
        route,
        km,
        landmark,
        road_type,
        is_blackspot,
        source,
        active,
        coordinates,
        geo,
      });

      const { id: docId, ...docFields } = newLoc;
      await setDoc(doc(db, "locations", docId), {
        ...docFields,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      if (paginated) {
        await loadPage(1, true);
      } else {
        setLocations((prev) =>
          prev.some((l) => l.id === newLoc.id) ? prev : [...prev, newLoc]
        );
      }

      return newLoc;
    },
    [paginated, loadPage]
  );

  const updateLocation = useCallback(
    async (locationId, input) => {
      let target =
        pageLocations.find((l) => l.id === locationId) ||
        locations.find((l) => l.id === locationId);
      if (!target) {
        const snap = await getDoc(doc(db, "locations", locationId));
        if (snap.exists()) {
          target = normalizeLocation({ id: snap.id, ...snap.data() });
        }
      }
      if (!target) {
        throw new Error("Lokasi tidak ditemui.");
      }

      const route = String(input.route ?? target.route ?? "")
        .trim()
        .toUpperCase();
      const km = String(input.km ?? target.km ?? "")
        .trim()
        .toUpperCase();
      const landmark = String(input.landmark ?? target.landmark ?? "")
        .trim()
        .toUpperCase();

      if (!route) {
        throw new Error("Sila masukkan Nama Laluan.");
      }

      const nextActive =
        input.active !== undefined ? Boolean(input.active) : target.active;
      if (target.active && !nextActive) {
        const activeSnap = await getCountFromServer(
          query(collection(db, "locations"), where("active", "==", true))
        );
        if (activeSnap.data().count <= 1) {
          throw new Error("Sekurang-kurangnya satu lokasi mesti kekal aktif.");
        }
      }

      const prefix = km ? `${km} ` : "";
      const suffix = landmark ? ` (${landmark})` : "";
      const name = `${prefix}${route}${suffix}`.trim();

      const is_blackspot =
        input.is_blackspot !== undefined
          ? Boolean(input.is_blackspot)
          : target.is_blackspot;
      const road_type = input.road_type || target.road_type || "Persekutuan";
      const source = input.source || target.source || "LAMPIRAN BLACKSPOT";

      const parsedLat = parseFloat(input.lat);
      const parsedLng = parseFloat(input.lng);
      const geo =
        !isNaN(parsedLat) && !isNaN(parsedLng)
          ? { lat: parsedLat, lng: parsedLng }
          : target.geo || { lat: 4.3606, lng: 100.965 };

      const updatedFields = {
        name,
        route,
        km,
        landmark,
        road_type,
        is_blackspot,
        source,
        active: nextActive,
        geo,
        updated_at: serverTimestamp(),
      };

      await updateDoc(doc(db, "locations", locationId), updatedFields);
      if (paginated) {
        await loadPage(currentPage, true);
      }
      return normalizeLocation({ ...target, ...updatedFields, id: locationId });
    },
    [pageLocations, locations, paginated, loadPage, currentPage]
  );

  const toggleLocationActive = useCallback(
    async (locationId) => {
      let target =
        pageLocations.find((l) => l.id === locationId) ||
        locations.find((l) => l.id === locationId);
      if (!target) {
        const snap = await getDoc(doc(db, "locations", locationId));
        if (snap.exists()) {
          target = normalizeLocation({ id: snap.id, ...snap.data() });
        }
      }
      if (!target) return;

      if (target.active) {
        const activeSnap = await getCountFromServer(
          query(collection(db, "locations"), where("active", "==", true))
        );
        if (activeSnap.data().count <= 1) {
          throw new Error("Sekurang-kurangnya satu lokasi mesti kekal aktif.");
        }
      }

      const nextActive = !target.active;

      await updateDoc(doc(db, "locations", locationId), {
        active: nextActive,
        updated_at: serverTimestamp(),
      });
      if (paginated) {
        await loadPage(currentPage, true);
      }
    },
    [pageLocations, locations, paginated, loadPage, currentPage]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / LOKASI_PAGE_SIZE));

  return {
    locations,
    activeLocations,
    loading,
    pageLocations,
    totalCount,
    currentPage,
    totalPages,
    loadingPage,
    loadPage,
    sortOrder,
    toggleSortOrder,
    addLocation,
    updateLocation,
    toggleLocationActive,
  };
}
