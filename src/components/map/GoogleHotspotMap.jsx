import { useState, useEffect, useRef, useMemo } from "react";
import SchematicMap from "./SchematicMap";
import { getPinColor } from "../../utils/locations";
import Chip from "../shared/Chip";

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#091327" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#091327" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8494aa" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c2d3e9" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1c3354" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#273855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2c4870" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3d5d8a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#050b18" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4e6d8c" }],
  },
];

let googleMapsPromise = null;
let googleMapsAuthFailed = false;
const authFailureListeners = new Set();

if (typeof window !== "undefined") {
  const prevAuthFailure = window.gm_authFailure;
  window.gm_authFailure = () => {
    googleMapsAuthFailed = true;
    authFailureListeners.forEach((fn) => fn());
    if (typeof prevAuthFailure === "function") {
      prevAuthFailure();
    }
  };
}

function loadGoogleMapsScript(apiKey) {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (googleMapsAuthFailed) {
    return Promise.reject(new Error("Google Maps API auth failure"));
  }
  if (window.google && window.google.maps && window.google.maps.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("smarttraffic-gmaps-script");
    if (existing) {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        return;
      }
      // Remove stale script tag if it previously failed or hung during HMR
      existing.remove();
    }

    const script = document.createElement("script");
    script.id = "smarttraffic-gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=quarterly`;
    script.async = true;
    script.defer = true;
    script.onload = async () => {
      try {
        if (window.google?.maps?.importLibrary) {
          await window.google.maps.importLibrary("maps");
        }
        if (window.google && window.google.maps && window.google.maps.Map) {
          resolve(window.google.maps);
        } else {
          googleMapsPromise = null;
          reject(new Error("Google Maps objek tidak ditemui"));
        }
      } catch (err) {
        googleMapsPromise = null;
        reject(err);
      }
    };
    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error("Rangkaian atau kunci API Google Maps disekat"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export default function GoogleHotspotMap({
  locations = [],
  selectedLocationId,
  onSelectLocation,
}) {
  const apiKey =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    "";

  const [mapMode, setMapMode] = useState(() =>
    apiKey &&
    !googleMapsAuthFailed &&
    typeof navigator !== "undefined" &&
    navigator.onLine
      ? "google"
      : "schematic"
  );
  const [mapsLoaded, setMapsLoaded] = useState(() =>
    Boolean(
      typeof window !== "undefined" &&
        window.google?.maps?.Map &&
        !googleMapsAuthFailed
    )
  );
  const [mapsError, setMapsError] = useState(googleMapsAuthFailed);
  const [authErrorMsg, setAuthErrorMsg] = useState("");

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const activeLocations = useMemo(
    () => locations.filter((l) => l.active),
    [locations]
  );

  // Listen for asynchronous gm_authFailure from Google Maps JS API
  useEffect(() => {
    const onAuthFail = () => {
      setMapsError(true);
      setAuthErrorMsg(
        "Kunci API Google Maps ditolak atau Maps JavaScript API belum diaktifkan — memaparkan Peta Skematik Interaktif."
      );
      setMapMode("schematic");
    };
    authFailureListeners.add(onAuthFail);
    return () => {
      authFailureListeners.delete(onAuthFail);
    };
  }, []);

  // Load Google Maps script when in 'google' mode and API key is present
  useEffect(() => {
    if (mapMode !== "google") return;
    if (!apiKey || googleMapsAuthFailed) return;

    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!cancelled && !googleMapsAuthFailed) {
          setMapsLoaded(true);
          setMapsError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapsError(true);
          setMapMode("schematic");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, mapMode]);

  // Initialize map & markers
  useEffect(() => {
    if (
      mapMode !== "google" ||
      !mapsLoaded ||
      !mapContainerRef.current ||
      !window.google?.maps?.Map
    ) {
      return;
    }

    const gmaps = window.google.maps;

    // Recreate Map instance if container DOM node changed (e.g. after tab switch or mode toggle)
    if (
      !mapInstanceRef.current ||
      mapInstanceRef.current.getDiv() !== mapContainerRef.current
    ) {
      mapInstanceRef.current = new gmaps.Map(mapContainerRef.current, {
        center: { lat: 4.35, lng: 100.89 },
        zoom: 11,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "greedy",
        backgroundColor: "#091327",
      });
      infoWindowRef.current = new gmaps.InfoWindow();
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    activeLocations.forEach((loc) => {
      const position = {
        lat: Number(loc.geo?.lat ?? 4.3606),
        lng: Number(loc.geo?.lng ?? 100.9701),
      };
      const isSelected = loc.id === selectedLocationId;
      const isBlackspot = Boolean(loc.is_blackspot);
      const risk = Number(loc.risk ?? loc.risk_score ?? 70);
      const fillColor = getPinColor(risk);

      const marker = new gmaps.Marker({
        position,
        map,
        title: `${loc.name} (${risk}/100)`,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          fillColor,
          fillOpacity: 0.95,
          strokeColor: isSelected ? "#ffe9a2" : "#ffffff",
          strokeWeight: isSelected ? 4 : 2,
          scale: isBlackspot ? 11 : 8.5,
        },
        zIndex: isSelected ? 100 : isBlackspot ? 50 : 10,
      });

      const openInfo = () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(
            `<div style="color:#0b1629;font-family:Inter,Arial,sans-serif;padding:4px 6px;max-width:240px;">
              <div style="font-weight:800;font-size:12px;margin-bottom:3px;">${loc.name}</div>
              <div style="font-size:11px;color:#334155;">
                <b>Skor Risiko:</b> ${risk}/100 ${isBlackspot ? "⚫ BLACKSPOT" : ""}<br/>
                <b>Kes:</b> ${loc.cases ?? 0} kes · <b>Operasi:</b> ${loc.ops_count ?? 0}<br/>
                <b>Waktu Puncak:</b> ${loc.peak_time}
              </div>
            </div>`
          );
          infoWindowRef.current.open(map, marker);
        }
      };

      marker.addListener("click", () => {
        onSelectLocation(loc.id);
        openInfo();
      });

      if (isSelected) {
        map.panTo(position);
      }

      markersRef.current.push(marker);
    });
  }, [
    mapMode,
    mapsLoaded,
    activeLocations,
    selectedLocationId,
    onSelectLocation,
  ]);

  const showSchematic =
    mapMode === "schematic" || mapsError || !apiKey || googleMapsAuthFailed;

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
        <h2 className="text-[17px] font-bold m-0">
          Peta Skematik & Interaktif Hotspot
        </h2>
        <div className="flex items-center gap-2">
          {apiKey && !mapsError && !googleMapsAuthFailed && (
            <button
              type="button"
              onClick={() => {
                if (googleMapsAuthFailed) {
                  setMapsError(true);
                  setMapMode("schematic");
                  return;
                }
                setMapMode((prev) =>
                  prev === "google" ? "schematic" : "google"
                );
              }}
              className="cursor-pointer border border-[var(--color-border-light)] bg-[var(--color-nav-bg)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
            >
              {showSchematic
                ? "🗺️ Tukar ke Peta Google"
                : "📐 Tukar ke Peta Skematik"}
            </button>
          )}
          <Chip>Klik penanda lokasi</Chip>
        </div>
      </div>

      {authErrorMsg && (
        <div className="mb-3 px-3 py-2 rounded-lg border border-[#7c6439] bg-[#1c2536] text-[#ffd58c] text-[11px]">
          ℹ️ {authErrorMsg}
        </div>
      )}

      {showSchematic ? (
        <SchematicMap
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={onSelectLocation}
        />
      ) : (
        <div className="h-[275px] relative border border-[var(--color-map-border)] rounded-xl overflow-hidden bg-[#091327]">
          {!mapsLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-text-secondary)] z-10">
              Memuatkan Peta Google...
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      )}

      <div className="flex justify-between flex-wrap gap-2 text-[11px] text-[#abc0d5] mt-2.5">
        <span>🔴 Risiko tinggi (≥75)</span>
        <span>🟠 Risiko sederhana-tinggi (68–74)</span>
        <span>🟡 Risiko sederhana (&lt;68)</span>
        <span>⚫ Lokasi Blackspot</span>
        <span>
          {showSchematic
            ? "⚠ Peta skematik vektor (luar talian / tanpa kunci API)"
            : "📍 Koordinat koridor Perak Tengah / Manjung"}
        </span>
      </div>
    </div>
  );
}
