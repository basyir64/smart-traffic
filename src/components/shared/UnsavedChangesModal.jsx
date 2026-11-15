import { useEffect, useId } from "react";

/**
 * Confirmation modal warning officers when leaving a view or logging out
 * while a form or edit modal has unsaved changes.
 */
export default function UnsavedChangesModal({
  isOpen,
  dirtyLabels = [],
  onStay,
  onDiscard,
  busy = false,
}) {
  const uid = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        e.stopPropagation();
        onStay?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, busy, onStay]);

  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-desc`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={() => !busy && onStay?.()}
    >
      <div
        className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-6 max-[550px]:p-4 shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            aria-hidden="true"
            className="shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-lg"
          >
            ⚠️
          </div>
          <div>
            <h3
              id={`${uid}-title`}
              className="text-[17px] font-bold text-[var(--color-text-primary)] m-0"
            >
              Perubahan Belum Disimpan
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Amaran kehilangan data borang
            </p>
          </div>
        </div>

        <p
          id={`${uid}-desc`}
          className="text-[13px] text-[var(--color-text-primary)] leading-relaxed mb-3"
        >
          Anda mempunyai data atau perubahan borang yang belum disimpan. Jika
          anda meneruskan pertukaran halaman sekarang, semua perubahan tersebut
          akan hilang.
        </p>

        {dirtyLabels.length > 0 && (
          <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[#0e1b33] px-3.5 py-2.5">
            <div className="text-[11px] font-semibold text-[var(--color-text-secondary)] mb-1">
              Borang terlibat:
            </div>
            <ul className="space-y-0.5 text-xs text-[#f3d79b] list-disc list-inside m-0 p-0">
              {dirtyLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 flex-wrap pt-2 border-t border-[var(--color-table-border)]">
          <button
            type="button"
            disabled={busy}
            autoFocus
            onClick={onStay}
            className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-4 py-2 rounded-[10px] font-semibold text-xs hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
          >
            Kekal di Halaman Ini
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDiscard}
            className="cursor-pointer bg-red-600 border border-red-500 text-white font-bold px-4 py-2 rounded-[10px] text-xs hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {busy ? "Memproses..." : "Teruskan & Buang Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
