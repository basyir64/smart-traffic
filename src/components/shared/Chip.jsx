export default function Chip({ children, className = "" }) {
  return (
    <span
      className={`bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] rounded-full px-2.5 py-1.5 text-[11px] font-medium inline-block ${className}`}
    >
      {children}
    </span>
  );
}
