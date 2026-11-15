import { useState, useEffect, useCallback, Fragment } from "react";
import { COLLAPSIBLE_NINE_ELEMENTS } from "../../utils/siasatan";
import { usePrintSheet } from "../../hooks/usePrintSheet";
import PeriodPrintToolbar from "../shared/PeriodPrintToolbar";
import SiasatanAggPrintSheet from "./SiasatanAggPrintSheet";

export default function SiasatanAggregation({
  loadSummaryMetrics,
  loadElementSubItems,
  loadAllNineElements,
  refreshKey = 0,
}) {
  const [period, setPeriod] = useState("all");
  const [summary, setSummary] = useState({
    totalCases: 0,
    fatalCases: 0,
    totalDeaths: 0,
    animalCases: 0,
    totalVehicles: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [printing, setPrinting] = useState(false);

  // Track which parent elements (4..9) are expanded (all collapsed by default)
  const [expandedMap, setExpandedMap] = useState({});
  // Cache fetched child rows for expanded elements: { [elementNumber]: [{ label, value }] }
  const [subItemsMap, setSubItemsMap] = useState({});
  // Track per-element loading state: { [elementNumber]: boolean }
  const [loadingElementsMap, setLoadingElementsMap] = useState({});

  const { printJob, startPrint } = usePrintSheet({
    portalId: "siasatan-agg-print-root",
    bodyClass: "printing-siasatan-agg",
    orientation: "portrait",
  });

  // Load summary metrics for the active time window (`period`) or when `refreshKey` changes
  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(() => {
        if (!loadSummaryMetrics) return null;
        if (isMounted) setLoadingSummary(true);
        return loadSummaryMetrics(period);
      })
      .then((res) => {
        if (!isMounted) return;
        if (res) {
          setSummary(res);
        }
        // Reset cached sub-items when data/period reloads so Firestore reads happen only when expanded
        setSubItemsMap({});
        setExpandedMap({});
      })
      .catch((err) => {
        console.error("[SiasatanAggregation] Error loading summary:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingSummary(false);
      });

    return () => {
      isMounted = false;
    };
  }, [period, refreshKey, loadSummaryMetrics]);

  const handlePeriodChange = useCallback((nextPeriod) => {
    setPeriod(nextPeriod);
    setLoadingSummary(true);
    setExpandedMap({});
    setSubItemsMap({});
  }, []);

  // Toggle expand/collapse for Elements 4..9; fire Firestore read ONLY when expanded
  const handleToggleElement = useCallback(
    async (elementNumber) => {
      const nextExpanded = !expandedMap[elementNumber];
      setExpandedMap((prev) => ({
        ...prev,
        [elementNumber]: nextExpanded,
      }));

      // Only query Firestore when expanding and not already cached for the active period
      if (nextExpanded && !subItemsMap[elementNumber] && loadElementSubItems) {
        setLoadingElementsMap((prev) => ({ ...prev, [elementNumber]: true }));
        try {
          const items = await loadElementSubItems(elementNumber, period);
          setSubItemsMap((prev) => ({
            ...prev,
            [elementNumber]: items,
          }));
        } finally {
          setLoadingElementsMap((prev) => ({
            ...prev,
            [elementNumber]: false,
          }));
        }
      }
    },
    [expandedMap, subItemsMap, loadElementSubItems, period]
  );

  const handlePrintReport = useCallback(async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const data = loadAllNineElements
        ? await loadAllNineElements(period)
        : { summary, subItemsByElement: subItemsMap };
      startPrint({
        summary: data.summary,
        subItemsByElement: data.subItemsByElement,
        period,
        documentTitle: `Laporan_9_Elemen_${period === "all" ? "Tiada" : period}`,
      });
    } finally {
      setPrinting(false);
    }
  }, [
    printing,
    loadAllNineElements,
    period,
    summary,
    subItemsMap,
    startPrint,
  ]);

  const getParentValue = (elementNumber) => {
    if (elementNumber === 6) {
      return loadingSummary ? "..." : `${summary.animalCases} kes`;
    }
    if (elementNumber === 7) {
      return loadingSummary ? "..." : `${summary.totalVehicles} kenderaan`;
    }
    return "";
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
        <h2 className="text-[17px] font-bold m-0">9 Elemen Data Kemalangan</h2>
        <PeriodPrintToolbar
          period={period}
          onPeriodChange={handlePeriodChange}
          onPrint={handlePrintReport}
          printDisabled={loadingSummary}
          printing={printing}
          selectAriaLabel="Penapis Tempoh Data 9 Elemen Data Kemalangan"
          printTitle="Cetak Laporan 9 Elemen Data Kemalangan sebagai PDF"
        />
      </div>

      <table id="siasatanAggTable" className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-table-border)] text-[var(--color-table-header)] text-[15px]">
            <th className="text-left py-3 px-2">Elemen</th>
            <th className="text-left py-3 px-2">Petunjuk Simulasi</th>
          </tr>
        </thead>
        <tbody>
          {/* Elements 1, 2, 3 (no child rows) */}
          <tr className="border-b border-[var(--color-table-border)] text-[15px]">
            <td className="py-3 px-2 font-bold">1. Jumlah kemalangan</td>
            <td className="py-3 px-2">
              {loadingSummary ? "..." : `${summary.totalCases} kes`}
            </td>
          </tr>
          <tr className="border-b border-[var(--color-table-border)] text-[15px]">
            <td className="py-3 px-2 font-bold">2. Kemalangan maut</td>
            <td className="py-3 px-2">
              {loadingSummary ? "..." : `${summary.fatalCases} kes`}
            </td>
          </tr>
          <tr className="border-b border-[var(--color-table-border)] text-[15px]">
            <td className="py-3 px-2 font-bold">3. Jumlah kematian</td>
            <td className="py-3 px-2">
              {loadingSummary ? "..." : `${summary.totalDeaths} nyawa`}
            </td>
          </tr>

          {/* Elements 4..9 (collapsible parent rows — fire Firestore read only when expanded) */}
          {COLLAPSIBLE_NINE_ELEMENTS.map(({ number, title }) => {
            const isExpanded = Boolean(expandedMap[number]);
            const isLoading = Boolean(loadingElementsMap[number]);
            const children = subItemsMap[number] || [];
            const parentVal = getParentValue(number);

            return (
              <Fragment key={number}>
                <tr
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onClick={() => handleToggleElement(number)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleElement(number);
                    }
                  }}
                  className="border-b border-[var(--color-table-border)] text-[15px] cursor-pointer hover:bg-[var(--color-surface-hover)]/60 transition-colors select-none"
                >
                  <td className="py-3 px-2 font-bold flex items-center gap-2">
                    <span className="text-[var(--color-accent)] text-xs w-4 inline-block">
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span>{title}</span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-between gap-2">
                      <span>{parentVal}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {isExpanded ? "Tutup pecahan" : "Papar pecahan"}
                      </span>
                    </div>
                  </td>
                </tr>

                {isExpanded &&
                  (isLoading ? (
                    <tr className="border-b border-[var(--color-table-border)] text-[14px] bg-[#0d192e]/50">
                      <td
                        colSpan={2}
                        className="py-2.5 pl-8 pr-2 text-xs text-[var(--color-text-secondary)]"
                      >
                        Memuatkan pecahan elemen dari Firestore...
                      </td>
                    </tr>
                  ) : (
                    children.map((child, idx) => (
                      <tr
                        key={`${number}-${idx}`}
                        className="border-b border-[var(--color-table-border)] text-[15px] bg-[#0d192e]/40"
                      >
                        <td className="py-2.5 pl-8 pr-2">{child.label}</td>
                        <td className="py-2.5 px-2">{child.value}</td>
                      </tr>
                    ))
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <SiasatanAggPrintSheet report={printJob} />
    </div>
  );
}
