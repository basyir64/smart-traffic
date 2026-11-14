import LocationPin from "./LocationPin";

export default function SchematicMap({
  locations = [],
  selectedLocationId,
  onSelectLocation,
}) {
  const activeLocations = locations.filter((l) => l.active);

  return (
    <div
      className="h-[275px] relative border border-[var(--color-map-border)] rounded-xl overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #1a3650, #10253c 65%)",
      }}
    >
      <svg
        viewBox="0 0 620 280"
        role="img"
        aria-label="Peta skematik lokasi contoh; bukan koordinat sebenar"
        className="w-full h-full"
      >
        {/* Major corridors */}
        <path
          d="M-30 220L150 170 260 190 390 115 660 70"
          stroke="#546980"
          fill="none"
          strokeWidth="10"
          opacity="0.75"
        />
        <path
          d="M120 -20L160 95 260 190 320 310"
          stroke="#546980"
          fill="none"
          strokeWidth="10"
          opacity="0.75"
        />
        {/* Minor corridors */}
        <path
          d="M-10 78L200 85 345 64 620 222"
          stroke="#3a5469"
          fill="none"
          strokeWidth="4"
        />
        <path
          d="M360 -20L390 115 490 200 570 310"
          stroke="#3a5469"
          fill="none"
          strokeWidth="4"
        />
        <path
          d="M25 285L120 205 200 85"
          stroke="#3a5469"
          fill="none"
          strokeWidth="4"
        />
        {/* Schematic Labels */}
        <g fill="#8494aa" fontSize="11">
          <text x="18" y="39">
            ZON SIMULASI IPD
          </text>
          <text x="355" y="95">
            KM31 IPOH-LUMUT
          </text>
          <text x="225" y="220">
            KM14 SITIAWAN
          </text>
          <text x="440" y="230">
            PERSIMPANGAN SERI MANJUNG
          </text>
        </g>
        {/* Interactive Pins */}
        <g>
          {activeLocations.map((loc) => (
            <LocationPin
              key={loc.id}
              location={loc}
              isSelected={loc.id === selectedLocationId}
              onSelect={onSelectLocation}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
