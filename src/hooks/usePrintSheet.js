import { useState, useEffect, useCallback } from "react";

/**
 * Formats the current local timestamp in Bahasa Melayu for PDF report headers.
 */
export function formatPrintTimestamp() {
  try {
    return new Intl.DateTimeFormat("ms-MY", {
      dateStyle: "medium",
      timeStyle: "medium",
      hour12: false,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString();
  }
}

/**
 * Manages React Portal creation, `document.title`, body print class, optional landscape
 * `@page` sizing override, `window.print()`, and `afterprint` cleanup for PDF sheets.
 */
export function usePrintSheet({
  portalId,
  bodyClass,
  orientation = "portrait",
}) {
  const [printJob, setPrintJob] = useState(null);

  useEffect(() => {
    if (!printJob) return undefined;

    const prevTitle = document.title;
    if (printJob.documentTitle) {
      document.title = printJob.documentTitle;
    }
    document.body.classList.add(bodyClass);

    let styleEl = null;
    if (orientation === "landscape") {
      styleEl = document.createElement("style");
      styleEl.setAttribute("data-print-page-orientation", "landscape");
      styleEl.textContent = "@media print { @page { size: A4 landscape; margin: 12mm; } }";
      document.head.appendChild(styleEl);
    }

    const cleanup = () => {
      document.body.classList.remove(bodyClass);
      document.title = prevTitle;
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };

    const handleAfterPrint = () => {
      cleanup();
      setPrintJob(null);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        window.print();
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.removeEventListener("afterprint", handleAfterPrint);
      cleanup();
    };
  }, [printJob, bodyClass, orientation]);

  const startPrint = useCallback(
    (payload) => {
      if (!payload) return;
      if (typeof document !== "undefined" && !document.getElementById(portalId)) {
        const portalEl = document.createElement("div");
        portalEl.id = portalId;
        document.body.appendChild(portalEl);
      }
      setPrintJob({
        ...payload,
        printedAt: payload.printedAt || formatPrintTimestamp(),
      });
    },
    [portalId]
  );

  return { printJob, startPrint };
}
