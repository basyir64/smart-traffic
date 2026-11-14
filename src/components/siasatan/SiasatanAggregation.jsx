import { useState, useEffect, useCallback, Fragment } from "react";

const COLLAPSIBLE_ELEMENTS = [
  { number: 4, title: "4. Jenis jalan" },
  { number: 5, title: "5. Waktu kejadian" },
  { number: 6, title: "6. Kemalangan melibatkan binatang" },
  { number: 7, title: "7. Kategori kenderaan" },
  { number: 8, title: "8. Kategori umur" },
  { number: 9, title: "9. Punca kemalangan (Kesalahan)" },
];

export default function SiasatanAggregation({
  loadSummaryMetrics,
  loadElementSubItems,
  refreshKey = 0,
}) {
  const [summary, setSummary] = useState({
    totalCases: 0,
    fatalCases: 0,
    totalDeaths: 0,
    animalCases: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Track which parent elements (4..9) are expanded (all collapsed by default)
  const [expandedMap, setExpandedMap] = useState({});
  // Cache fetched child rows for expanded elements: { [elementNumber]: [{ label, value }] }
  const [subItemsMap, setSubItemsMap] = useState({});
  // Track per-element loading state: { [elementNumber]: boolean }
  const [loadingElementsMap, setLoadingElementsMap] = useState({});

  // Load all-time top-level summary metrics (Elements 1, 2, 3) when refreshKey changes
  useEffect(() => {
    let isMounted = true;
    setLoadingSummary(true);
    // Reset cached sub-items when data changes; collapse elements so Firestore is only read when expanded
    setSubItemsMap({});
    setExpandedMap({});

    if (loadSummaryMetrics) {
      loadSummaryMetrics("all")
        .then((res) => {
          if (isMounted && res) {
            setSummary(res);
          }
        })
        .finally(() => {
          if (isMounted) setLoadingSummary(false);
        });
    } else {
      setLoadingSummary(false);
    }

    return () => {
      isMounted = false;
    };
  }, [refreshKey, loadSummaryMetrics]);

  // Toggle expand/collapse for Elements 4..9; fire Firestore read ONLY when expanded
  const handleToggleElement = useCallback(
    async (elementNumber) => {
      const nextExpanded = !expandedMap[elementNumber];
      setExpandedMap((prev) => ({
        ...prev,
        [elementNumber]: nextExpanded,
      }));

      // Only query Firestore when expanding and not already cached
      if (nextExpanded && !subItemsMap[elementNumber] && loadElementSubItems) {
        setLoadingElementsMap((prev) => ({ ...prev, [elementNumber]: true }));
        try {
          const items = await loadElementSubItems(elementNumber, "all");
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
    [expandedMap, subItemsMap, loadElementSubItems]
  );

  const getParentValue = (elementNumber) => {
    if (elementNumber === 6) {
      return loadingSummary ? "..." : `${summary.animalCases} kes`;
    }
    if (elementNumber === 7) {
      return loadingSummary ? "..." : `${summary.totalCases} kes`;
    }
    return "";
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
        <h2 className="text-[17px] font-bold m-0">9 Elemen Data Kemalangan</h2>
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
          {COLLAPSIBLE_ELEMENTS.map(({ number, title }) => {
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
    </div>
  );
}
