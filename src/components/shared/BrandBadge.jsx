/**
 * Square gold monogram badge displaying the compact SATRIA brand mark.
 */
export default function BrandBadge({ className = "" }) {
  return (
    <div
      className={`bg-linear-to-br from-[var(--color-accent-light)] to-[var(--color-accent-dark)] text-[#0c1830] font-black w-14 h-14 max-[550px]:w-12 max-[550px]:h-12 rounded-2xl inline-flex items-center justify-center shrink-0 text-[11px] max-[550px]:text-[10px] tracking-[0.06em] leading-none select-none shadow-xs ${className}`.trim()}
    >
      SATRIA
    </div>
  );
}
