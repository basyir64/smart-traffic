export function getPinColor(risk) {
  if (risk >= 75) return "#dc5d4d";
  if (risk >= 68) return "#eba34b";
  return "#e8bb57";
}

export default function LocationPin({
  location,
  isSelected,
  onSelect,
}) {
  const cx = location.coordinates?.x ?? 300;
  const cy = location.coordinates?.y ?? 140;
  const isBlackspot = Boolean(location.is_blackspot);
  const risk = Number(location.risk ?? 0);
  const fill = getPinColor(risk);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${location.name} (${risk}/100)`}
      onClick={() => onSelect(location.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(location.id);
        }
      }}
      className="cursor-pointer focus:outline-none"
    >
      <title>{`${location.name} — Risiko: ${risk}/100 (${location.cases ?? 0} kes)`}</title>
      <circle
        cx={cx}
        cy={cy}
        r={isBlackspot ? 13 : 10}
        fill={fill}
        stroke={isSelected ? "#ffe9a2" : "#ffffff"}
        strokeWidth={isSelected ? 5 : 2.5}
        strokeDasharray={isBlackspot ? "4 2" : "none"}
      />
    </g>
  );
}
