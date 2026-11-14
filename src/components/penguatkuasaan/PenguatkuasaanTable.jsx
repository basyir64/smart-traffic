import { useState } from "react";
import { PENGUATKUASAAN_PAGE_SIZE } from "../../hooks/usePenguatkuasaan";
import Chip from "../shared/Chip";

export default function PenguatkuasaanTable({
  operations = [],
  totalCount = 0,
  currentPage = 1,
  sortOrder = "desc",
  loading = false,
  canEdit = false,
  activeLocations = [],
  onPageChange,
  onToggleSort,
  onUpdateOperation,
}) {
  const [editingOp, setEditingOp] = useState(null);
  const [formState, setFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PENGUATKUASAAN_PAGE_SIZE)
  );
  const startIndex = (currentPage - 1) * PENGUATKUASAAN_PAGE_SIZE;

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

  const openEditModal = (op) => {
    if (!canEdit) return;
    setModalError("");
    setEditingOp(op);
    setFormState({
      tarikh: op.tarikh || "",
      location_id: op.location_id || activeLocations[0]?.id || "",
      location_name: op.location_name || activeLocations[0]?.name || "",
      kategori_kemalangan: op.kategori_kemalangan || "Maut",
      jenis_operasi: op.jenis_operasi || "Pematuhan",
      tangkapan: op.tangkapan ?? 0,
      sita: op.sita ?? 0,
      jam_mula: op.jam_mula || "20:00",
      jam_akhir: op.jam_akhir || "23:00",
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingOp(null);
    setFormState(null);
    setModalError("");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOp || !formState || !onUpdateOperation) return;

    setSaving(true);
    setModalError("");
    try {
      const selectedLoc = activeLocations.find(
        (l) => l.id === formState.location_id
      );

      await onUpdateOperation(editingOp.id, {
        tarikh: formState.tarikh,
        location_id: selectedLoc?.id || formState.location_id,
        location_name: selectedLoc?.name || formState.location_name,
        kategori_kemalangan: formState.kategori_kemalangan,
        jenis_operasi: formState.jenis_operasi,
        tangkapan: Math.max(0, parseInt(formState.tangkapan, 10) || 0),
        sita: Math.max(0, parseInt(formState.sita, 10) || 0),
        jam_mula: formState.jam_mula,
        jam_akhir: formState.jam_akhir,
      });

      setEditingOp(null);
      setFormState(null);
    } catch (err) {
      setModalError(err.message || "Gagal mengemas kini rekod operasi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Senarai Rekod Penguatkuasaan
        </h2>
        <Chip>{totalCount} operasi</Chip>
      </div>

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
                    sortOrder === "desc"
                      ? "Terkini dahulu (Klik untuk susun terlama dahulu)"
                      : "Terlama dahulu (Klik untuk susun terkini dahulu)"
                  }
                  className="inline-flex items-center gap-1 cursor-pointer font-bold text-[var(--color-accent)] hover:underline disabled:opacity-50"
                >
                  <span>Tarikh</span>
                  <span aria-hidden="true">
                    {sortOrder === "desc" ? "↓" : "↑"}
                  </span>
                </button>
              </th>
              <th className="text-left py-3 px-2">Lokasi</th>
              <th className="text-left py-3 px-2">Jenis Operasi</th>
              <th className="text-left py-3 px-2">Kat. Kemalangan</th>
              <th className="text-left py-3 px-2">Tangkapan</th>
              <th className="text-left py-3 px-2">Sita</th>
              <th className="text-left py-3 px-2">Masa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={7}
                  className="py-4 px-2 text-center text-[var(--color-text-secondary)]"
                >
                  Memuatkan halaman {currentPage} dari Firestore...
                </td>
              </tr>
            ) : operations.length === 0 ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={7}
                  className="py-3 px-2 text-[var(--color-text-secondary)]"
                >
                  Tiada rekod operasi penguatkuasaan direkodkan.
                </td>
              </tr>
            ) : (
              operations.map((op) => (
                <tr
                  key={op.id}
                  onClick={() => openEditModal(op)}
                  title={
                    canEdit
                      ? "Klik untuk kemas kini rekod operasi ini"
                      : "Hanya Pegawai Penguatkuasaan atau Admin boleh mengemas kini rekod"
                  }
                  className={`border-b border-[var(--color-table-border)] text-xs transition-colors ${
                    canEdit
                      ? "cursor-pointer hover:bg-[#192b49]/80"
                      : "hover:bg-[#192b49]/35"
                  }`}
                >
                  <td className="py-3 px-2 font-semibold">{op.tarikh}</td>
                  <td className="py-3 px-2">{op.location_name}</td>
                  <td className="py-3 px-2">{op.jenis_operasi}</td>
                  <td className="py-3 px-2">{op.kategori_kemalangan}</td>
                  <td className="py-3 px-2">{op.tangkapan}</td>
                  <td className="py-3 px-2">{op.sita}</td>
                  <td className="py-3 px-2">
                    {op.jam_mula}–{op.jam_akhir}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > PENGUATKUASAAN_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-[var(--color-table-border)] text-xs">
          <span className="text-[var(--color-text-secondary)]">
            Memaparkan{" "}
            <b className="text-[var(--color-text-primary)]">
              {startIndex + 1}–
              {Math.min(startIndex + operations.length, totalCount)}
            </b>{" "}
            daripada{" "}
            <b className="text-[var(--color-text-primary)]">{totalCount}</b>{" "}
            operasi
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

      {/* ── Edit Penguatkuasaan Modal ── */}
      {editingOp && formState && (
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
                  Kemaskini Rekod Penguatkuasaan
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  ID Operasi: {editingOp.id}
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
              {/* 1. Tarikh */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  1. Tarikh
                </label>
                <input
                  type="date"
                  value={formState.tarikh}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, tarikh: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* Lokasi Hotspot / Jalan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  Lokasi Hotspot / Jalan
                </label>
                <select
                  value={formState.location_id}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, location_id: e.target.value }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {activeLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.is_blackspot ? " ⚫" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Kategori Kemalangan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  2. Kategori Kemalangan
                </label>
                <select
                  value={formState.kategori_kemalangan}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      kategori_kemalangan: e.target.value,
                    }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Maut">Maut</option>
                  <option value="Parah">Parah</option>
                  <option value="Ringan">Ringan</option>
                  <option value="Rosak sahaja">Rosak sahaja</option>
                  <option value="Bukan kemalangan">Bukan kemalangan</option>
                </select>
              </div>

              {/* 3. Jenis Operasi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  3. Jenis Operasi
                </label>
                <select
                  value={formState.jenis_operasi}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      jenis_operasi: e.target.value,
                    }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Pematuhan">Pematuhan</option>
                  <option value="Perdagangan">Perdagangan</option>
                  <option value="Motosikal">Motosikal</option>
                  <option value="Mabuk">Mabuk</option>
                  <option value="Bersepadu">Bersepadu</option>
                </select>
              </div>

              {/* 4. Tangkapan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  4. Tangkapan
                </label>
                <input
                  type="number"
                  min="0"
                  value={formState.tangkapan}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, tangkapan: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 5. Sita */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  5. Sita
                </label>
                <input
                  type="number"
                  min="0"
                  value={formState.sita}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, sita: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 6. Jam Mula */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  6. Jam Mula (HH:MM)
                </label>
                <input
                  type="time"
                  value={formState.jam_mula}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, jam_mula: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 7. Jam Akhir */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  7. Jam Akhir (HH:MM)
                </label>
                <input
                  type="time"
                  value={formState.jam_akhir}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, jam_akhir: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
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
