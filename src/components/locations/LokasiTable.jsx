import { useState } from "react";
import { LOKASI_PAGE_SIZE } from "../../hooks/useLocations";
import Chip from "../shared/Chip";

export default function LokasiTable({
  locations = [],
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  loading = false,
  onPageChange,
  sortOrder = "asc",
  onToggleSort,
  onToggleActive,
  onUpdateLocation,
  canEdit = true,
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [editingLoc, setEditingLoc] = useState(null);
  const [formState, setFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const startIndex = (currentPage - 1) * LOKASI_PAGE_SIZE;

  const handlePageSelect = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === currentPage ||
      loading
    ) {
      return;
    }
    if (onPageChange) {
      onPageChange(nextPage);
    }
  };

  const handleToggle = async (e, id) => {
    e.stopPropagation();
    setErrorMsg("");
    try {
      await onToggleActive(id);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const openEditModal = (loc) => {
    if (!canEdit) return;
    setModalError("");
    setEditingLoc(loc);
    setFormState({
      route: loc.route || loc.name || "",
      km: loc.km || "",
      landmark: loc.landmark || "",
      road_type: loc.road_type || "Persekutuan",
      is_blackspot: Boolean(loc.is_blackspot),
      source: loc.source || "LAMPIRAN BLACKSPOT",
      active: Boolean(loc.active),
      lat: loc.geo?.lat ?? "",
      lng: loc.geo?.lng ?? "",
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingLoc(null);
    setFormState(null);
    setModalError("");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLoc || !formState || !onUpdateLocation) return;

    setSaving(true);
    setModalError("");
    try {
      await onUpdateLocation(editingLoc.id, formState);
      setEditingLoc(null);
      setFormState(null);
    } catch (err) {
      setModalError(err.message || "Gagal mengemas kini lokasi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Senarai Lokasi & Lampiran Blackspot
        </h2>
        <Chip>{totalCount} lokasi</Chip>
      </div>

      {errorMsg && (
        <div className="mb-3 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-table-border)] text-[var(--color-table-header)] text-xs">
              <th className="text-left py-3 px-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onToggleSort && onToggleSort()}
                  title={
                    sortOrder === "asc"
                      ? "Susunan A–Z (Klik untuk susun Z–A)"
                      : "Susunan Z–A (Klik untuk susun A–Z)"
                  }
                  className="inline-flex items-center gap-1 cursor-pointer font-bold text-[var(--color-accent)] hover:underline disabled:opacity-50"
                >
                  <span>Nama Laluan Penuh</span>
                  <span aria-hidden="true">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                </button>
              </th>
              <th className="text-left py-3 px-2">Jenis Jalan</th>
              <th className="text-left py-3 px-2">Klasifikasi</th>
              <th className="text-left py-3 px-2">Sumber</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-left py-3 px-2">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={6}
                  className="py-4 px-2 text-center text-[var(--color-text-secondary)]"
                >
                  Memuatkan halaman {currentPage} dari Firestore...
                </td>
              </tr>
            ) : locations.length === 0 ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={6}
                  className="py-3 px-2 text-[var(--color-text-secondary)]"
                >
                  Tiada lokasi didaftarkan.
                </td>
              </tr>
            ) : (
              locations.map((loc) => {
                const isBlackspot = Boolean(loc.is_blackspot);
                return (
                  <tr
                    key={loc.id}
                    onClick={() => openEditModal(loc)}
                    title={
                      canEdit
                        ? "Klik untuk kemas kini lokasi ini"
                        : "Hanya Admin boleh mengemas kini lokasi"
                    }
                    className={`border-b border-[var(--color-table-border)] text-xs transition-colors ${
                      canEdit
                        ? "cursor-pointer hover:bg-[#192b49]/80"
                        : "hover:bg-[#192b49]/35"
                    }`}
                  >
                    <td className="py-3 px-2 font-bold">{loc.name}</td>
                    <td className="py-3 px-2">{loc.road_type}</td>
                    <td className="py-3 px-2">
                      {isBlackspot ? (
                        <span
                          className="inline-block rounded-[7px] px-2 py-1 text-[11px] font-semibold"
                          style={{
                            background: "#1c2536",
                            color: "#ffd58c",
                            border: "1px solid #7c6439",
                          }}
                        >
                          ⚫ BLACKSPOT
                        </span>
                      ) : (
                        <span className="inline-block rounded-[7px] px-2 py-1 text-[11px] bg-[#1e2f4d] text-[#c2d3e9]">
                          PANTAUAN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">{loc.source}</td>
                    <td className="py-3 px-2">
                      <span
                        className={
                          loc.active
                            ? "text-emerald-300 font-semibold"
                            : "text-[var(--color-text-secondary)]"
                        }
                      >
                        {loc.active ? "AKTIF" : "TIDAK AKTIF"}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={(e) => handleToggle(e, loc.id)}
                        className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
                      >
                        {loc.active ? "Nyahaktif" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > LOKASI_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-[var(--color-table-border)] text-xs">
          <span className="text-[var(--color-text-secondary)]">
            Memaparkan{" "}
            <b className="text-[var(--color-text-primary)]">
              {startIndex + 1}–
              {Math.min(startIndex + locations.length, totalCount)}
            </b>{" "}
            daripada{" "}
            <b className="text-[var(--color-text-primary)]">{totalCount}</b>{" "}
            lokasi
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1 || loading}
              onClick={() => handlePageSelect(currentPage - 1)}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Sebelumnya
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  disabled={loading}
                  onClick={() => handlePageSelect(pageNum)}
                  className={`cursor-pointer border px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                    currentPage === pageNum
                      ? "bg-[var(--color-accent)] text-[#0b1629] border-[var(--color-accent)]"
                      : "border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {pageNum}
                </button>
              )
            )}

            <button
              type="button"
              disabled={currentPage === totalPages || loading}
              onClick={() => handlePageSelect(currentPage + 1)}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Seterusnya →
            </button>
          </div>
        </div>
      )}

      <div className="border border-[var(--color-notice-border)] bg-[var(--color-notice-bg)] text-[var(--color-notice-text)] rounded-xl p-3.5 text-[13px] mt-4">
        Lokasi diimport semasa permulaan aplikasi (startup seed) dan hanya boleh
        ditambah atau dinyahaktifkan oleh peranan <b>Admin</b>. Penyahaktifan
        mengekalkan pautan sejarah rekod siasatan dan penguatkuasaan.
      </div>

      {/* ── Edit Lokasi Modal ── */}
      {editingLoc && formState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-6 max-[550px]:p-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-[var(--color-table-border)]">
              <div>
                <h3 className="text-[17px] font-bold m-0">
                  Kemaskini Lokasi & Lampiran Blackspot
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  ID Lokasi: {editingLoc.id}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                ✕ Tutup
              </button>
            </div>

            {modalError && (
              <div className="mb-3 p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
                {modalError}
              </div>
            )}

            <form
              onSubmit={handleSaveEdit}
              className="grid grid-cols-2 max-[550px]:grid-cols-1 gap-3.5"
            >
              {/* 1. Nama Laluan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  1. Nama Laluan
                </label>
                <input
                  type="text"
                  value={formState.route}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, route: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 2. Penanda KM */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  2. Penanda KM
                </label>
                <input
                  type="text"
                  value={formState.km}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, km: e.target.value }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 3. Penanda / Mercu Tanda */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  3. Penanda / Mercu Tanda
                </label>
                <input
                  type="text"
                  value={formState.landmark}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, landmark: e.target.value }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 4. Jenis Jalan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  4. Jenis Jalan
                </label>
                <select
                  value={formState.road_type}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, road_type: e.target.value }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Persekutuan">Persekutuan</option>
                  <option value="Negeri">Negeri</option>
                  <option value="Lebuh Raya">Lebuh Raya</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              {/* 5. Status Blackspot */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  5. Status Blackspot
                </label>
                <div className="flex gap-4 items-center py-1.5 text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editLocBlackspot"
                      checked={formState.is_blackspot === true}
                      onChange={() =>
                        setFormState((p) => ({ ...p, is_blackspot: true }))
                      }
                      className="accent-[var(--color-accent)] cursor-pointer"
                    />
                    <span>Ya (Lampiran Blackspot)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editLocBlackspot"
                      checked={formState.is_blackspot === false}
                      onChange={() =>
                        setFormState((p) => ({ ...p, is_blackspot: false }))
                      }
                      className="accent-[var(--color-accent)] cursor-pointer"
                    />
                    <span>Bukan Blackspot (Pantauan)</span>
                  </label>
                </div>
              </div>

              {/* 6. Sumber Rujukan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  6. Sumber Rujukan
                </label>
                <select
                  value={formState.source}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, source: e.target.value }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="LAMPIRAN BLACKSPOT">LAMPIRAN BLACKSPOT</option>
                  <option value="LAMPIRAN HOTSPOT">LAMPIRAN HOTSPOT</option>
                  <option value="JKR / MIROS">JKR / MIROS</option>
                  <option value="DALAMAN BSPT">DALAMAN BSPT</option>
                </select>
              </div>

              {/* 7. Status Aktif */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  7. Status Aktif
                </label>
                <select
                  value={formState.active ? "Aktif" : "Tidak Aktif"}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      active: e.target.value === "Aktif",
                    }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>

              {/* Latitud & Longitud */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-label)] font-semibold">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formState.lat}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, lat: e.target.value }))
                    }
                    className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-label)] font-semibold">
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formState.lng}
                    onChange={(e) =>
                      setFormState((p) => ({ ...p, lng: e.target.value }))
                    }
                    className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div className="col-span-full flex justify-end gap-2.5 pt-3 border-t border-[var(--color-table-border)] mt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-4 py-2 rounded-[10px] font-semibold text-xs hover:border-[var(--color-accent)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] border border-[var(--color-accent)] font-bold px-4 py-2 rounded-[10px] text-xs hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
