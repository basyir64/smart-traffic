import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import { useSiasatan } from "../hooks/useSiasatan";
import SiasatanForm from "../components/siasatan/SiasatanForm";
import SiasatanAggregation from "../components/siasatan/SiasatanAggregation";
import SiasatanTable from "../components/siasatan/SiasatanTable";
import FactorBars from "../components/charts/FactorBars";

export default function Siasatan() {
  const { role, canModifySiasatan } = useAuth();
  const { locations, activeLocations, addLocation } = useLocations();
  const {
    pageRecords,
    totalCount,
    currentPage,
    sortOrder,
    loadingPage,
    loadPage,
    toggleSortOrder,
    countAllSiasatan,
    loadSummaryMetrics,
    loadElementSubItems,
    loadAllNineElements,
    addSiasatan,
    updateSiasatan,
  } = useSiasatan();

  const [refreshKey, setRefreshKey] = useState(0);

  // Load only Page 1 (5 newest records) on initial mount
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const handleAddRecord = useCallback(
    async (payload) => {
      const created = await addSiasatan(payload);
      setRefreshKey((k) => k + 1);
      return created;
    },
    [addSiasatan]
  );

  const handleUpdateRecord = useCallback(
    async (id, payload) => {
      const updated = await updateSiasatan(id, payload);
      setRefreshKey((k) => k + 1);
      return updated;
    },
    [updateSiasatan]
  );

  return (
    <div className="space-y-4 mt-4">
      {canModifySiasatan ? (
        <SiasatanForm
          activeLocations={activeLocations}
          onAddRecord={handleAddRecord}
          onAddLocation={addLocation}
        />
      ) : (
        <div className="border border-[var(--color-accent)] bg-[#242a3a] text-[#f3d79b] rounded-xl p-4 text-xs leading-relaxed">
          🔒 <b>Mod Paparan Sahaja ({role})</b>: Anda mempunyai akses melihat
          rekod siasatan, tetapi pendaftaran dan pengemaskinian rekod hanya
          boleh dilakukan oleh Pegawai Siasatan atau Admin.
        </div>
      )}

      <SiasatanAggregation
        loadSummaryMetrics={loadSummaryMetrics}
        loadElementSubItems={loadElementSubItems}
        loadAllNineElements={loadAllNineElements}
        refreshKey={refreshKey}
      />

      <SiasatanTable
        records={pageRecords}
        totalCount={totalCount}
        currentPage={currentPage}
        sortOrder={sortOrder}
        loading={loadingPage}
        canEdit={canModifySiasatan}
        activeLocations={activeLocations}
        allLocations={locations}
        onPageChange={(nextPage) => loadPage(nextPage)}
        onToggleSort={toggleSortOrder}
        onUpdateRecord={handleUpdateRecord}
      />

      <FactorBars
        countAllSiasatan={countAllSiasatan}
        totalCount={totalCount}
        refreshKey={refreshKey}
      />
    </div>
  );
}
