import { useEffect, useId } from "react";

/**
 * Accessible dark-glassmorphism dialog used for touch-friendly info explanations
 * on Dashboard cards (matching UnsavedChangesModal styling).
 */
export default function InfoModal({
  isOpen,
  title,
  subtitle = "",
  icon = "ℹ️",
  onClose,
  children,
}) {
  const uid = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${uid}-title`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={() => onClose?.()}
    >
      <div
        className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-4 shadow-2xl my-auto max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[var(--color-table-border)]">
          <div className="flex items-start gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="shrink-0 w-8 h-8 rounded-xl bg-[#16243e] border border-[#3d5685] flex items-center justify-center text-base"
            >
              {icon}
            </span>
            <div className="min-w-0">
              <h3
                id={`${uid}-title`}
                className="text-[15px] font-bold text-[#ffd58c] m-0 leading-snug"
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 mb-0">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="shrink-0 cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          >
            ✕ Tutup
          </button>
        </div>

        <div className="text-xs text-[#e3ecfa] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
