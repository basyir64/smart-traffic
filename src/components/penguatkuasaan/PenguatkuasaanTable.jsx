import { useState, useMemo } from "react";
import { PENGUATKUASAAN_PAGE_SIZE } from "../../hooks/usePenguatkuasaan";
import { usePrintSheet } from "../../hooks/usePrintSheet";
import Chip from "../shared/Chip";
import PeriodPrintToolbar from "../shared/PeriodPrintToolbar";
import PenguatkuasaanPrintSheet from "./PenguatkuasaanPrintSheet";
import SamanBatchInput from "./SamanBatchInput";
import {
  useRegisterUnsavedForm,
  isFormStateDirty,
} from "../../hooks/useUnsavedChanges";
import {
  UNSET_SAMAN_CATEGORY,
  normalizeSamanList,
  summarizeSamanCategories,
  formatSamanCategoryBreakdown,
  validateSamanRows,
} from "../../utils/saman";
import {
  CUSTOM_LOCATION_ID,
  resolvePenguatkuasaanLocation,
} from "../../utils/locations";

export default function PenguatkuasaanTable({
  operations = [],
  totalCount = 0,
  currentPage = 1,
  sortOrder = "desc",
  periodFilter = "all",
  loading = false,
  canEdit = false,
  activeLocations = [],
  allLocations = [],
  onPageChange,
  onToggleSort,
  onPeriodChange,
  onLoadAllForPrint,
  onUpdateOperation,
}) {
  const [printing, setPrinting] = useState(false);
  const { printJob, startPrint } = usePrintSheet({
    portalId: "penguatkuasaan-print-root",
    bodyClass: "printing-penguatkuasaan-list",
    orientation: "landscape",
  });
  const [editingOp, setEditingOp] = useState(null);
  const [formState, setFormState] = useState(null);
  const [initialFormState, setInitialFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSamanErrors, setModalSamanErrors] = useState({});

  const isEditModalDirty = useMemo(
    () =>
      Boolean(editingOp && isFormStateDirty(initialFormState, formState)),
    [editingOp, initialFormState, formState]
  );

  useRegisterUnsavedForm(
    "penguatkuasaan-edit-modal",
    isEditModalDirty,
    "Kemaskini Rekod Penguatkuasaan"
  );

  const locationPool = useMemo(
    () => (allLocations.length ? allLocations : activeLocations),
    [allLocations, activeLocations]
  );

  const isModalCustomLocation = formState?.location_id === CUSTOM_LOCATION_ID;

  const selectedModalLocation = useMemo(() => {
    if (!formState?.location_id || formState.location_id === CUSTOM_LOCATION_ID) {
      return null;
    }
    return locationPool.find((l) => l.id === formState.location_id) || null;
  }, [locationPool, formState]);

  const modalLocationMissingFromActive = useMemo(() => {
    if (!formState?.location_id || formState.location_id === CUSTOM_LOCATION_ID) {
      return false;
    }
    return !activeLocations.some((l) => l.id === formState.location_id);
  }, [activeLocations, formState]);

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
    setModalSamanErrors({});
    setEditingOp(op);
    const normalizedSaman = normalizeSamanList(op.saman_list);
    const samanRows = normalizedSaman.length
      ? normalizedSaman.map((item) => ({ ...item }))
      : [{ no_saman: "", kategori_saman: "" }];
    const isCustom = Boolean(
      op.is_custom_location || op.location_id === CUSTOM_LOCATION_ID
    );
    const snapshot = {
      tarikh: op.tarikh || "",
      location_id: isCustom
        ? CUSTOM_LOCATION_ID
        : op.location_id || activeLocations[0]?.id || CUSTOM_LOCATION_ID,
      location_name: op.location_name || activeLocations[0]?.name || "",
      custom_location: isCustom ? op.location_name || "" : "",
      kategori_kemalangan: op.kategori_kemalangan || "Maut",
      jenis_operasi: op.jenis_operasi || "Pematuhan",
      tangkapan: op.tangkapan ?? 0,
      sita: op.sita ?? 0,
      jam_mula: op.jam_mula || "20:00",
      jam_akhir: op.jam_akhir || "23:00",
      saman_rows: samanRows,
    };
    setInitialFormState(snapshot);
    setFormState({
      ...snapshot,
      saman_rows: samanRows.map((item) => ({ ...item })),
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingOp(null);
    setFormState(null);
    setInitialFormState(null);
    setModalError("");
    setModalSamanErrors({});
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOp || !formState || !onUpdateOperation) return;

    const resolvedLocation = resolvePenguatkuasaanLocation(
      formState.location_id,
      formState.custom_location,
      locationPool,
      formState.location_name
    );
    if (!resolvedLocation.valid) {
      setModalError(
        formState.location_id === CUSTOM_LOCATION_ID
          ? "Sila nyatakan nama Lokasi Lain-lain yang sah."
          : "Sila pilih Lokasi Hotspot / Jalan."
      );
      return;
    }

    const hasLegacyUnset = (initialFormState?.saman_rows || []).some(
      (r) => r.kategori_saman === UNSET_SAMAN_CATEGORY
    );
    const samanCheck = validateSamanRows(formState.saman_rows || [], {
      allowUnsetForLegacy: hasLegacyUnset,
    });
    if (!samanCheck.valid) {
      setModalSamanErrors(samanCheck.rowErrors);
      setModalError(samanCheck.error);
      return;
    }

    setSaving(true);
    setModalError("");
    setModalSamanErrors({});
    try {
      await onUpdateOperation(editingOp.id, {
        tarikh: formState.tarikh,
        location_id: resolvedLocation.location_id,
        location_name: resolvedLocation.location_name,
        is_custom_location: resolvedLocation.is_custom_location,
        kategori_kemalangan: formState.kategori_kemalangan,
        jenis_operasi: formState.jenis_operasi,
        tangkapan: Math.max(0, parseInt(formState.tangkapan, 10) || 0),
        sita: Math.max(0, parseInt(formState.sita, 10) || 0),
        jam_mula: formState.jam_mula,
        jam_akhir: formState.jam_akhir,
        saman_list: samanCheck.cleanList,
      });

      setEditingOp(null);
      setFormState(null);
      setInitialFormState(null);
    } catch (err) {
      setModalError(err.message || "Gagal mengemas kini rekod operasi.");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintList = async () => {
    if (printing || loading || totalCount === 0 || !onLoadAllForPrint) return;
    setPrinting(true);
    try {
      const allOps = await onLoadAllForPrint(periodFilter, sortOrder);
      if (!allOps || allOps.length === 0) return;
      startPrint({
        operations: allOps,
        period: periodFilter,
        sortOrder,
        documentTitle: `Senarai_Penguatkuasaan_${
          periodFilter === "all" ? "Tiada" : periodFilter
        }`,
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-[17px] font-bold m-0">
            Senarai Rekod Penguatkuasaan
          </h2>
          <Chip>{totalCount} operasi</Chip>
        </div>
        <PeriodPrintToolbar
          period={periodFilter}
          onPeriodChange={onPeriodChange}
          onPrint={handlePrintList}
          printDisabled={loading || totalCount === 0}
          printing={printing}
          selectAriaLabel="Penapis Tempoh Data Senarai Rekod Penguatkuasaan"
          printTitle={
            totalCount === 0
              ? "Tiada rekod untuk dicetak"
              : "Cetak Senarai Rekod Penguatkuasaan sebagai PDF"
          }
        />
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
              <th className="text-left py-3 px-2">Saman</th>
              <th className="text-left py-3 px-2">Masa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={8}
                  className="py-4 px-2 text-center text-[var(--color-text-secondary)]"
                >
                  Memuatkan halaman {currentPage} dari Firestore...
                </td>
              </tr>
            ) : operations.length === 0 ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={8}
                  className="py-3 px-2 text-[var(--color-text-secondary)]"
                >
                  {periodFilter !== "all"
                    ? "Tiada rekod operasi penguatkuasaan bagi tempoh ini."
                    : "Tiada rekod operasi penguatkuasaan direkodkan."}
                </td>
              </tr>
            ) : (
              operations.map((op) => {
                const samanList = normalizeSamanList(op.saman_list);
                const samanSummary = summarizeSamanCategories(samanList);
                const samanCount = samanSummary.total;
                const breakdown = formatSamanCategoryBreakdown(samanSummary);
                const samanTooltip = samanList
                  .map((s) =>
                    s.no_saman
                      ? `${s.no_saman} (${s.kategori_saman})`
                      : s.kategori_saman
                  )
                  .join(", ");
                const numberedSamanText = samanList
                  .map((s) => s.no_saman)
                  .filter(Boolean)
                  .join(", ");

                return (
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
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{op.location_name || "-"}</span>
                        {op.is_custom_location && (
                          <span className="inline-block bg-slate-500/15 text-[var(--color-text-secondary)] border border-[var(--color-border-light)] rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                            Lain-lain
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">{op.jenis_operasi}</td>
                    <td className="py-3 px-2">{op.kategori_kemalangan}</td>
                    <td className="py-3 px-2">{op.tangkapan}</td>
                    <td className="py-3 px-2">{op.sita}</td>
                    <td
                      className="py-3 px-2"
                      title={
                        samanCount > 0
                          ? samanTooltip
                          : "Tiada saman direkodkan"
                      }
                    >
                      {samanCount > 0 ? (
                        <div>
                          <span className="inline-block rounded-[6px] px-1.5 py-0.5 text-[11px] font-semibold bg-[#1c2b48] text-[var(--color-accent-soft)] border border-[#364d75]">
                            {samanCount} saman
                          </span>
                          {breakdown.length > 0 && (
                            <div className="text-[11px] text-[var(--color-text-primary)] mt-0.5 leading-snug">
                              {breakdown.join(" · ")}
                            </div>
                          )}
                          {numberedSamanText && (
                            <div className="text-[11px] text-[var(--color-text-secondary)] truncate max-w-[170px]">
                              {numberedSamanText}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-secondary)]">
                          0
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {op.jam_mula}–{op.jam_akhir}
                    </td>
                  </tr>
                );
              })
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
              <div className="flex flex-col gap-1.5 min-w-0">
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
                  className="w-full min-w-0 max-w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 2. Lokasi Hotspot / Jalan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  2. Lokasi Hotspot / Jalan
                </label>
                <select
                  value={formState.location_id}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setFormState((p) => ({
                      ...p,
                      location_id: nextId,
                      custom_location:
                        nextId === CUSTOM_LOCATION_ID ? p.custom_location : "",
                    }));
                  }}
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
                  <option value={CUSTOM_LOCATION_ID}>Lain-lain</option>
                </select>
                {isModalCustomLocation && (
                  <div className="mt-1 flex flex-col gap-1">
                    <label
                      htmlFor="editOpLokasiLainLain"
                      className="text-[11px] text-[var(--color-text-label)] font-semibold"
                    >
                      Lokasi Lain-lain (Nyatakan)
                    </label>
                    <input
                      id="editOpLokasiLainLain"
                      type="text"
                      value={formState.custom_location || ""}
                      onChange={(e) =>
                        setFormState((p) => ({
                          ...p,
                          custom_location: e.target.value,
                        }))
                      }
                      placeholder="Contoh: JALAN KAMPUNG GAJAH / KM12 JALAN PARIT"
                      required
                      className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] uppercase placeholder:normal-case focus:outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                )}
              </div>

              {/* 3. Kategori Kemalangan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  3. Kategori Kemalangan
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

              {/* 4. Jenis Operasi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  4. Jenis Operasi
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

              {/* 5. Tangkapan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  5. Tangkapan
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

              {/* 6. Sita */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  6. Sita
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

              {/* 7. Jam Mula */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  7. Jam Mula (HH:MM)
                </label>
                <input
                  type="time"
                  value={formState.jam_mula}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, jam_mula: e.target.value }))
                  }
                  required
                  className="w-full min-w-0 max-w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 8. Jam Akhir */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  8. Jam Akhir (HH:MM)
                </label>
                <input
                  type="time"
                  value={formState.jam_akhir}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, jam_akhir: e.target.value }))
                  }
                  required
                  className="w-full min-w-0 max-w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 9. Saman */}
              <SamanBatchInput
                key={editingOp.id}
                value={formState.saman_rows}
                onChange={(nextRows) => {
                  setFormState((p) => ({ ...p, saman_rows: nextRows }));
                  if (Object.keys(modalSamanErrors).length > 0) {
                    setModalSamanErrors({});
                  }
                }}
                disabled={saving}
                fieldNumber={9}
                validationErrors={modalSamanErrors}
              />

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

      <PenguatkuasaanPrintSheet report={printJob} />
    </div>
  );
}
