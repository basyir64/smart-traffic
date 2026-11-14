import { useLocations } from "../hooks/useLocations";
import { useAuth } from "../auth-context";
import LokasiForm from "../components/locations/LokasiForm";
import LokasiTable from "../components/locations/LokasiTable";

export default function Lokasi() {
  const {
    pageLocations,
    totalCount,
    currentPage,
    totalPages,
    loadingPage,
    loadPage,
    sortOrder,
    toggleSortOrder,
    addLocation,
    updateLocation,
    toggleLocationActive,
  } = useLocations({ paginated: true });
  const { canModifyLokasi } = useAuth();

  return (
    <div className="space-y-4 mt-4">
      <LokasiForm
        onAddLocation={addLocation}
        disabled={!canModifyLokasi}
      />
      <LokasiTable
        locations={pageLocations}
        totalCount={totalCount}
        currentPage={currentPage}
        totalPages={totalPages}
        loading={loadingPage}
        onPageChange={(page) => loadPage(page)}
        sortOrder={sortOrder}
        onToggleSort={toggleSortOrder}
        onToggleActive={toggleLocationActive}
        onUpdateLocation={updateLocation}
        canEdit={canModifyLokasi}
      />
    </div>
  );
}
