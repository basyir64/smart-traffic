import { useState, useMemo } from "react";
import { SIASATAN_PAGE_SIZE } from "../../hooks/useSiasatan";
import Chip from "../shared/Chip";

export default function SiasatanTable({
  records = [],
  totalCount = 0,
  currentPage = 1,
  sortOrder = "desc",
  loading = false,
  canEdit = false,
  activeLocations = [],
  allLocations = [],
  onPageChange,
  onToggleSort,
  onUpdateRecord,
}) {
  const [editingRecord, setEditingRecord] = useState(null);
  const [formState, setFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const locationPool = useMemo(
    () => (allLocations.length ? allLocations : activeLocations),
    [allLocations, activeLocations]
  );

  const selectedModalLocation = useMemo(() => {
    if (!formState?.location_id) return null;
    return locationPool.find((l) => l.id === formState.location_id) || null;
  }, [locationPool, formState]);

  const modalLocationMissingFromActive = useMemo(() => {
    if (!formState?.location_id) return false;
    return !activeLocations.some((l) => l.id === formState.location_id);
  }, [activeLocations, formState]);

  const totalPages = Math.max(1, Math.ceil(totalCount / SIASATAN_PAGE_SIZE));
  const startIndex = (currentPage - 1) * SIASATAN_PAGE_SIZE;

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

  const openEditModal = (rec) => {
    if (!canEdit) return;
    setModalError("");
    setEditingRecord(rec);
    setFormState({
      no_saman: rec.no_saman || "",
      no_kenderaan: rec.no_kenderaan || "",
      no_ic: rec.no_ic ?? "",
      nama: rec.nama || "",
      umur: rec.umur ?? "",
      alamat: rec.alamat || "",
      tempat_kemalangan: rec.tempat_kemalangan || "Persekutuan",
      location_id: rec.location_id || activeLocations[0]?.id || "",
      location_name: rec.location_name || activeLocations[0]?.name || "",
      tarikh_kemalangan: rec.tarikh_kemalangan || "",
      waktu_kejadian: rec.waktu_kejadian || "",
      kategori_kenderaan: rec.kategori_kenderaan || "Motosikal",
      kesalahan: rec.kesalahan || "Kelajuan",
      melibatkan_binatang: Boolean(rec.melibatkan_binatang),
      jenis_binatang: rec.jenis_binatang || "Kerbau",
      jenis_kemalangan: rec.jenis_kemalangan || "Rosak sahaja",
      bilangan_maut: rec.bilangan_maut > 0 ? rec.bilangan_maut : 1,
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingRecord(null);
    setFormState(null);
    setModalError("");
  };

  const handleModalLocationChange = (newLocId) => {
    const matched = locationPool.find((l) => l.id === newLocId);
    setFormState((prev) => ({
      ...prev,
      location_id: newLocId,
      location_name: matched?.name || prev.location_name,
      tempat_kemalangan: matched?.road_type || prev.tempat_kemalangan,
    }));
  };

  const handleModalKesalahanChange = (newKesalahan) => {
    setFormState((prev) => ({
      ...prev,
      kesalahan: newKesalahan,
      melibatkan_binatang:
        newKesalahan === "Langgar binatang" ? true : prev.melibatkan_binatang,
    }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord || !formState || !onUpdateRecord) return;

    setSaving(true);
    setModalError("");
    try {
      const selectedLoc = locationPool.find(
        (l) => l.id === formState.location_id
      );
      const isMaut = formState.jenis_kemalangan === "Maut";

      await onUpdateRecord(editingRecord.id, {
        no_saman: formState.no_saman.trim(),
        no_kenderaan: formState.no_kenderaan.trim().toUpperCase(),
        no_ic: Number(formState.no_ic),
        nama: formState.nama.trim().toUpperCase(),
        umur: Number(formState.umur),
        alamat: formState.alamat.trim(),
        tempat_kemalangan:
          selectedLoc?.road_type ||
          formState.tempat_kemalangan ||
          "Persekutuan",
        location_id: selectedLoc?.id || formState.location_id,
        location_name: selectedLoc?.name || formState.location_name,
        tarikh_kemalangan: formState.tarikh_kemalangan,
        waktu_kejadian: formState.waktu_kejadian,
        kategori_kenderaan: formState.kategori_kenderaan,
        kesalahan: formState.kesalahan,
        melibatkan_binatang: Boolean(formState.melibatkan_binatang),
        jenis_binatang: formState.melibatkan_binatang
          ? formState.jenis_binatang || "Kerbau"
          : null,
        jenis_kemalangan: formState.jenis_kemalangan,
        maut: isMaut,
        bilangan_maut: isMaut
          ? Math.max(1, Number(formState.bilangan_maut) || 1)
          : 0,
      });

      setEditingRecord(null);
      setFormState(null);
    } catch (err) {
      setModalError(err.message || "Gagal mengemas kini rekod siasatan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">Senarai Rekod Siasatan</h2>
        <Chip>{totalCount} rekod</Chip>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-table-border)] text-[var(--color-table-header)] text-xs">
              <th className="text-left py-3 px-2">No. Saman</th>
              <th className="text-left py-3 px-2">No. Kenderaan</th>
              <th className="text-left py-3 px-2">Lokasi Hotspot</th>
              <th className="text-left py-3 px-2">Tempat</th>
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
                  <span>Tarikh & Waktu</span>
                  <span aria-hidden="true">
                    {sortOrder === "desc" ? "↓" : "↑"}
                  </span>
                </button>
              </th>
              <th className="text-left py-3 px-2">Kenderaan</th>
              <th className="text-left py-3 px-2">Kesalahan</th>
              <th className="text-left py-3 px-2">Binatang</th>
              <th className="text-left py-3 px-2">Jenis Kemalangan</th>
              <th className="text-left py-3 px-2">Maut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={10}
                  className="py-4 px-2 text-center text-[var(--color-text-secondary)]"
                >
                  Memuatkan halaman {currentPage} dari Firestore...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={10}
                  className="py-3 px-2 text-[var(--color-text-secondary)]"
                >
                  Tiada rekod siasatan direkodkan.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr
                  key={r.id || r.no_saman}
                  onClick={() => openEditModal(r)}
                  title={
                    canEdit
                      ? "Klik untuk kemas kini rekod siasatan ini"
                      : "Hanya Pegawai Siasatan atau Admin boleh mengemas kini rekod"
                  }
                  className={`border-b border-[var(--color-table-border)] text-xs transition-colors ${
                    canEdit
                      ? "cursor-pointer hover:bg-[#192b49]/80"
                      : "hover:bg-[#192b49]/35"
                  }`}
                >
                  <td className="py-3 px-2 font-semibold">{r.no_saman}</td>
                  <td className="py-3 px-2">{r.no_kenderaan}</td>
                  <td className="py-3 px-2">{r.location_name}</td>
                  <td className="py-3 px-2">{r.tempat_kemalangan}</td>
                  <td className="py-3 px-2">
                    {r.tarikh_kemalangan} {r.waktu_kejadian}
                  </td>
                  <td className="py-3 px-2">{r.kategori_kenderaan}</td>
                  <td className="py-3 px-2">{r.kesalahan}</td>
                  <td className="py-3 px-2">
                    {r.melibatkan_binatang
                      ? `Ya (${r.jenis_binatang})`
                      : "Tidak"}
                  </td>
                  <td className="py-3 px-2">{r.jenis_kemalangan}</td>
                  <td className="py-3 px-2">
                    {r.maut ? `Ya (${r.bilangan_maut} nyawa)` : "Tidak"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalCount > SIASATAN_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-3 border-t border-[var(--color-table-border)] text-xs">
          <span className="text-[var(--color-text-secondary)]">
            Memaparkan{" "}
            <b className="text-[var(--color-text-primary)]">
              {startIndex + 1}–
              {Math.min(startIndex + records.length, totalCount)}
            </b>{" "}
            daripada{" "}
            <b className="text-[var(--color-text-primary)]">{totalCount}</b>{" "}
            rekod
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
        Data dalam borang ini adalah untuk tujuan demonstrasi prototaip sahaja.
        Jangan masukkan No. IC atau maklumat peribadi sebenar.
      </div>

      {/* ── Edit Siasatan Modal ── */}
      {editingRecord && formState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-3xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-6 max-[550px]:p-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-[var(--color-table-border)]">
              <div>
                <h3 className="text-[17px] font-bold m-0">
                  Kemaskini Rekod Siasatan
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  ID Rekod: {editingRecord.id}
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
              {/* 1. No. Saman */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  1. No. Saman
                </label>
                <input
                  type="text"
                  value={formState.no_saman}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, no_saman: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 2. No. Kenderaan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  2. No. Kenderaan
                </label>
                <input
                  type="text"
                  value={formState.no_kenderaan}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      no_kenderaan: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 3. No. IC */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  3. No. IC
                </label>
                <input
                  type="number"
                  value={formState.no_ic}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, no_ic: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 4. Nama */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  4. Nama
                </label>
                <input
                  type="text"
                  value={formState.nama}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, nama: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 5. Umur */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  5. Umur
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formState.umur}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, umur: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 6. Alamat */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  6. Alamat
                </label>
                <input
                  type="text"
                  value={formState.alamat}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, alamat: e.target.value }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 7. Lokasi Hotspot / Jalan */}
              <div className="col-span-full flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  7. Lokasi Hotspot / Jalan
                </label>
                <select
                  value={formState.location_id}
                  onChange={(e) => handleModalLocationChange(e.target.value)}
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {modalLocationMissingFromActive && (
                    <option value={formState.location_id}>
                      {selectedModalLocation?.name || formState.location_name}{" "}
                      (Tidak Aktif)
                    </option>
                  )}
                  {activeLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.is_blackspot ? " ⚫" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated read-only location details */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-2">
                  <span>Nama Jalan</span>
                  <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
                    Auto (Tidak boleh diubah)
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  aria-readonly="true"
                  value={selectedModalLocation?.route || ""}
                  placeholder="-"
                  className="w-full border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[#0d192e] px-3 py-2 rounded-[9px] text-[13px] cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-2">
                  <span>Jenis Jalan</span>
                  <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
                    Auto (Tidak boleh diubah)
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  aria-readonly="true"
                  value={
                    selectedModalLocation?.road_type ||
                    formState.tempat_kemalangan ||
                    ""
                  }
                  placeholder="-"
                  className="w-full border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[#0d192e] px-3 py-2 rounded-[9px] text-[13px] cursor-not-allowed focus:outline-none"
                />
              </div>

              {/* 8. Tarikh Kemalangan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  8. Tarikh Kemalangan
                </label>
                <input
                  type="date"
                  value={formState.tarikh_kemalangan}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      tarikh_kemalangan: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 9. Waktu Kejadian */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  9. Waktu Kejadian (HH:MM)
                </label>
                <input
                  type="time"
                  value={formState.waktu_kejadian}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      waktu_kejadian: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 10. Kategori Kenderaan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  10. Kategori Kenderaan
                </label>
                <select
                  value={formState.kategori_kenderaan}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      kategori_kenderaan: e.target.value,
                    }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Motosikal">Motosikal</option>
                  <option value="Kereta">Kereta</option>
                  <option value="MPV / SUV">MPV / SUV</option>
                  <option value="Van">Van</option>
                  <option value="Bas">Bas</option>
                  <option value="Lori / Kenderaan Berat">
                    Lori / Kenderaan Berat
                  </option>
                  <option value="Basikal">Basikal</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              {/* 11. Kesalahan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  11. Kesalahan (Punca Kemalangan)
                </label>
                <select
                  value={formState.kesalahan}
                  onChange={(e) => handleModalKesalahanChange(e.target.value)}
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Kelajuan">Kelajuan</option>
                  <option value="Tidak peka keadaan sekeliling">
                    Tidak peka keadaan sekeliling
                  </option>
                  <option value="Gagal patuh isyarat">
                    Gagal patuh isyarat
                  </option>
                  <option value="Keadaan jalan">Keadaan jalan</option>
                  <option value="Langgar binatang">Langgar binatang</option>
                  <option value="Faktor kenderaan">Faktor kenderaan</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              {/* 12. Melibatkan Binatang */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  12. Melibatkan Binatang
                </label>
                <div className="flex gap-4 items-center py-1.5 text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMelibatkanBinatang"
                      checked={!formState.melibatkan_binatang}
                      onChange={() =>
                        setFormState((p) => ({
                          ...p,
                          melibatkan_binatang: false,
                        }))
                      }
                      className="accent-[var(--color-accent)] cursor-pointer"
                    />
                    <span>Tidak</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editMelibatkanBinatang"
                      checked={Boolean(formState.melibatkan_binatang)}
                      onChange={() =>
                        setFormState((p) => ({
                          ...p,
                          melibatkan_binatang: true,
                        }))
                      }
                      className="accent-[var(--color-accent)] cursor-pointer"
                    />
                    <span>Ya</span>
                  </label>
                </div>
              </div>

              {/* Conditional Jenis Binatang */}
              {formState.melibatkan_binatang && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-label)] font-semibold">
                    Jenis Binatang
                  </label>
                  <select
                    value={formState.jenis_binatang}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        jenis_binatang: e.target.value,
                      }))
                    }
                    className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="Kerbau">Kerbau</option>
                    <option value="Lembu">Lembu</option>
                    <option value="Babi">Babi</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              )}

              {/* 13. Jenis Kemalangan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  13. Jenis Kemalangan
                </label>
                <select
                  value={formState.jenis_kemalangan}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      jenis_kemalangan: e.target.value,
                    }))
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="Rosak sahaja">Rosak sahaja</option>
                  <option value="Cedera ringan">Cedera ringan</option>
                  <option value="Cedera parah">Cedera parah</option>
                  <option value="Maut">Maut</option>
                </select>
              </div>

              {/* Conditional Bilangan Kematian */}
              {formState.jenis_kemalangan === "Maut" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--color-text-label)] font-semibold">
                    Bilangan Kematian (Nyawa)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formState.bilangan_maut}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        bilangan_maut: e.target.value,
                      }))
                    }
                    required
                    className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              )}

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
