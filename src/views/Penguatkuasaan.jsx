import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import { usePenguatkuasaan } from "../hooks/usePenguatkuasaan";
import PenguatkuasaanForm from "../components/penguatkuasaan/PenguatkuasaanForm";
import PenguatkuasaanTable from "../components/penguatkuasaan/PenguatkuasaanTable";

export default function Penguatkuasaan() {
  const { role, canModifyPenguatkuasaan } = useAuth();
  const { locations, activeLocations } = useLocations();
  const {
    pageOperations,
    totalCount,
    currentPage,
    sortOrder,
    periodFilter,
    loadingPage,
    loadPage,
    toggleSortOrder,
    changePeriodFilter,
    loadAllForPrint,
    addPenguatkuasaan,
    updatePenguatkuasaan,
  } = usePenguatkuasaan();

  // Load only Page 1 (5 newest operations) on initial mount
  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  return (
    <div className="space-y-4 mt-4">
      {canModifyPenguatkuasaan ? (
        <PenguatkuasaanForm
          activeLocations={activeLocations}
          onAddOperation={addPenguatkuasaan}
        />
      ) : (
        <div className="border border-[var(--color-accent)] bg-[#242a3a] text-[#f3d79b] rounded-xl p-4 text-xs leading-relaxed">
          🔒 <b>Mod Paparan Sahaja ({role})</b>: Anda mempunyai akses melihat
          rekod operasi, tetapi pendaftaran dan pengemaskinian operasi hanya
          boleh dilakukan oleh Pegawai Penguatkuasaan atau Admin.
        </div>
      )}

      <PenguatkuasaanTable
        operations={pageOperations}
        totalCount={totalCount}
        currentPage={currentPage}
        sortOrder={sortOrder}
        periodFilter={periodFilter}
        loading={loadingPage}
        canEdit={canModifyPenguatkuasaan}
        activeLocations={activeLocations}
        allLocations={locations}
        onPageChange={(nextPage) => loadPage(nextPage)}
        onToggleSort={toggleSortOrder}
        onPeriodChange={changePeriodFilter}
        onLoadAllForPrint={loadAllForPrint}
        onUpdateOperation={updatePenguatkuasaan}
      />
    </div>
  );
}
