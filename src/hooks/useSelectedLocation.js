import { useState, useMemo } from "react";

/**
 * Manages the currently selected hotspot location on Dashboard Utama.
 * Automatically falls back to the first active location if the selected location becomes inactive.
 */
export function useSelectedLocation(locations = []) {
  const activeLocations = useMemo(
    () => locations.filter((l) => l.active),
    [locations]
  );

  const [selectedLocationId, setSelectedLocationId] = useState(
    () => activeLocations[0]?.id || "km31-jalan-ipoh-lumut"
  );

  const selectedLocation = useMemo(() => {
    return (
      activeLocations.find((l) => l.id === selectedLocationId) ||
      activeLocations[0] ||
      locations[0] ||
      null
    );
  }, [activeLocations, locations, selectedLocationId]);

  return {
    selectedLocationId: selectedLocation?.id || selectedLocationId,
    setSelectedLocationId,
    selectedLocation,
  };
}
