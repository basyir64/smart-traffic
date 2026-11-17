import { useState, useMemo, useEffect } from "react";
import { SIASATAN_PAGE_SIZE } from "../../hooks/useSiasatan";
import Chip from "../shared/Chip";
import PihakTerlibatBatchInput from "./PihakTerlibatBatchInput";
import SiasatanPrintSheet from "./SiasatanPrintSheet";
import SiasatanRoadFields from "./SiasatanRoadFields";
import {
  useRegisterUnsavedForm,
  isFormStateDirty,
} from "../../hooks/useUnsavedChanges";
import {
  SAMAN_CATEGORIES,
  IN_INVESTIGATION_SAMAN_CATEGORY,
  UNSET_SAMAN_CATEGORY,
  coerceStoredSamanCategory,
  normalizeSamanCategory,
} from "../../utils/saman";
import {
  CUSTOM_LOCATION_ID,
  ROAD_TYPES,
  resolveSiasatanLocation,
} from "../../utils/locations";
import {
  createEmptyPihakTerlibatRow,
  normalizePihakTerlibatList,
  validatePihakTerlibatRows,
  getFirstPartyVehicleDisplay,
  formatPihakTerlibatTooltip,
  formatPrintDocumentTitle,
} from "../../utils/siasatan";

function formatPrintTimestamp() {
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
  const [initialFormState, setInitialFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalPihakErrors, setModalPihakErrors] = useState({});
  const [printJob, setPrintJob] = useState(null);

  const isEditModalDirty = useMemo(
    () =>
      Boolean(
        editingRecord && isFormStateDirty(initialFormState, formState)
      ),
    [editingRecord, initialFormState, formState]
  );

  useRegisterUnsavedForm(
    "siasatan-edit-modal",
    isEditModalDirty,
    "Kemaskini Rekod Siasatan"
  );

  const locationPool = useMemo(
    () => (allLocations.length ? allLocations : activeLocations),
    [allLocations, activeLocations]
  );

  const selectedModalLocation = useMemo(() => {
    if (!formState?.location_id || formState.location_id === CUSTOM_LOCATION_ID) {
      return null;
    }
    return locationPool.find((l) => l.id === formState.location_id) || null;
  }, [locationPool, formState]);

  const isModalCustomLocation =
    formState?.location_id === CUSTOM_LOCATION_ID;

  const printLocation = useMemo(() => {
    const rec = printJob?.record;
    if (
      !rec ||
      rec.is_custom_location ||
      rec.location_id === CUSTOM_LOCATION_ID ||
      !rec.location_id
    ) {
      return null;
    }
    return locationPool.find((l) => l.id === rec.location_id) || null;
  }, [locationPool, printJob]);

  useEffect(() => {
    if (!printJob) return undefined;

    const prevTitle = document.title;
    document.title = formatPrintDocumentTitle(printJob.record);
    document.body.classList.add("printing-siasatan-record");

    const handleAfterPrint = () => {
      document.body.classList.remove("printing-siasatan-record");
      document.title = prevTitle;
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
      document.body.classList.remove("printing-siasatan-record");
      document.title = prevTitle;
    };
  }, [printJob]);

  const handlePrintRecord = (rec) => {
    if (!rec) return;
    if (
      typeof document !== "undefined" &&
      !document.getElementById("siasatan-print-root")
    ) {
      const portalEl = document.createElement("div");
      portalEl.id = "siasatan-print-root";
      document.body.appendChild(portalEl);
    }
    setPrintJob({
      record: rec,
      printedAt: formatPrintTimestamp(),
    });
  };

  const modalLocationMissingFromActive = useMemo(() => {
    if (
      !formState?.location_id ||
      formState.location_id === CUSTOM_LOCATION_ID
    ) {
      return false;
    }
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
    setModalPihakErrors({});
    setEditingRecord(rec);
    const normalizedParties = normalizePihakTerlibatList(rec);
    const baseParties = normalizedParties.length
      ? normalizedParties
      : [createEmptyPihakTerlibatRow()];
    const isCustom = Boolean(
      rec.is_custom_location || rec.location_id === CUSTOM_LOCATION_ID
    );
    const initialLocationId = isCustom
      ? CUSTOM_LOCATION_ID
      : rec.location_id || activeLocations[0]?.id || CUSTOM_LOCATION_ID;
    const matchedMaster = isCustom
      ? null
      : locationPool.find((l) => l.id === initialLocationId) || null;

    const snapshot = {
      no_saman: rec.no_saman || "",
      kategori_saman: coerceStoredSamanCategory(rec.kategori_saman),
      no_report: rec.no_report || "",
      pihak_terlibat: baseParties.map((p) => ({ ...p })),
      is_custom_location: isCustom,
      nama_jalan: isCustom ? rec.nama_jalan || rec.location_name || "" : "",
      tempat_kemalangan: isCustom
        ? ROAD_TYPES.includes(rec.tempat_kemalangan)
          ? rec.tempat_kemalangan
          : ""
        : rec.tempat_kemalangan || matchedMaster?.road_type || "Persekutuan",
      location_id: initialLocationId,
      location_name: isCustom
        ? rec.location_name || rec.nama_jalan || ""
        : rec.location_name || matchedMaster?.name || "",
      tarikh_kemalangan: rec.tarikh_kemalangan || "",
      waktu_kejadian: rec.waktu_kejadian || "",
      kesalahan: rec.kesalahan || "Kelajuan",
      melibatkan_binatang: Boolean(rec.melibatkan_binatang),
      jenis_binatang: rec.jenis_binatang || "Kerbau",
      jenis_kemalangan: rec.jenis_kemalangan || "Rosak sahaja",
      bilangan_maut: rec.bilangan_maut > 0 ? rec.bilangan_maut : 1,
    };
    setInitialFormState(snapshot);
    setFormState({
      ...snapshot,
      pihak_terlibat: baseParties.map((p) => ({ ...p })),
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditingRecord(null);
    setFormState(null);
    setInitialFormState(null);
    setModalError("");
    setModalPihakErrors({});
  };

  const handleModalLocationChange = (newLocId) => {
    if (newLocId === CUSTOM_LOCATION_ID) {
      setFormState((prev) => ({
        ...prev,
        is_custom_location: true,
        location_id: CUSTOM_LOCATION_ID,
        location_name: "",
        nama_jalan: "",
        tempat_kemalangan: "",
      }));
      return;
    }

    const matched = locationPool.find((l) => l.id === newLocId);
    setFormState((prev) => ({
      ...prev,
      is_custom_location: false,
      location_id: newLocId,
      location_name: matched?.name || prev.location_name,
      nama_jalan: "",
      tempat_kemalangan:
        matched?.road_type || prev.tempat_kemalangan || "Persekutuan",
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

    const normalizedKategori = normalizeSamanCategory(formState.kategori_saman);
    const keepLegacyUnset =
      initialFormState?.kategori_saman === UNSET_SAMAN_CATEGORY &&
      formState.kategori_saman === UNSET_SAMAN_CATEGORY;

    if (!normalizedKategori && !keepLegacyUnset) {
      setModalError(
        "Sila pilih Kategori Saman yang sah (POL 170 A, POL 257, atau Dalam Siasatan)."
      );
      return;
    }

    const savedSaman = (formState.no_saman || "").trim().toUpperCase();
    if (
      !savedSaman &&
      normalizedKategori !== IN_INVESTIGATION_SAMAN_CATEGORY
    ) {
      setModalError(
        'Sila masukkan No. Saman yang sah (atau pilih "Dalam Siasatan").'
      );
      return;
    }

    const savedReport = (formState.no_report || "").trim().toUpperCase();
    const allowEmptyLegacyReport = !(initialFormState?.no_report);
    const hasWhitespaceOnlyReport =
      Boolean(formState.no_report) && savedReport === "";
    if (
      hasWhitespaceOnlyReport ||
      (!savedReport && !allowEmptyLegacyReport)
    ) {
      setModalError("Sila masukkan No. Report yang sah.");
      return;
    }

    const partyCheck = validatePihakTerlibatRows(formState.pihak_terlibat || []);
    if (!partyCheck.valid) {
      setModalPihakErrors(partyCheck.rowErrors);
      setModalError(partyCheck.error);
      return;
    }

    const locResolution = resolveSiasatanLocation(
      formState.location_id,
      formState.nama_jalan,
      formState.tempat_kemalangan,
      locationPool,
      formState.location_name,
      formState.tempat_kemalangan
    );
    if (!locResolution.valid) {
      setModalError(locResolution.error);
      return;
    }

    setSaving(true);
    setModalError("");
    setModalPihakErrors({});
    try {
      const isMaut = formState.jenis_kemalangan === "Maut";

      await onUpdateRecord(editingRecord.id, {
        no_saman: savedSaman,
        kategori_saman: normalizedKategori || UNSET_SAMAN_CATEGORY,
        no_report: savedReport,
        pihak_terlibat: partyCheck.cleanList,
        is_custom_location: locResolution.is_custom_location,
        nama_jalan: locResolution.nama_jalan,
        tempat_kemalangan: locResolution.tempat_kemalangan,
        location_id: locResolution.location_id,
        location_name: locResolution.location_name,
        tarikh_kemalangan: formState.tarikh_kemalangan,
        waktu_kejadian: formState.waktu_kejadian,
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
      setInitialFormState(null);
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
              <th className="text-left py-3 px-2">Kategori Saman</th>
              <th className="text-left py-3 px-2">No. Report</th>
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
              <th className="text-left py-3 px-2 whitespace-nowrap">
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={13}
                  className="py-4 px-2 text-center text-[var(--color-text-secondary)]"
                >
                  Memuatkan halaman {currentPage} dari Firestore...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr className="border-b border-[var(--color-table-border)] text-xs">
                <td
                  colSpan={13}
                  className="py-3 px-2 text-[var(--color-text-secondary)]"
                >
                  Tiada rekod siasatan direkodkan.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const kat = coerceStoredSamanCategory(r.kategori_saman);
                const badgeClass =
                  kat === "POL 170 A"
                    ? "bg-sky-500/15 text-sky-300 border-sky-500/35"
                    : kat === "POL 257"
                      ? "bg-violet-500/15 text-violet-300 border-violet-500/35"
                      : kat === IN_INVESTIGATION_SAMAN_CATEGORY
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/35"
                        : "bg-slate-500/15 text-[var(--color-text-secondary)] border-[var(--color-border-light)]";

                const parties = normalizePihakTerlibatList(r);
                const firstParty = parties[0] || {};
                const extraPartiesCount = Math.max(0, parties.length - 1);
                const partiesTooltip = formatPihakTerlibatTooltip(parties);
                const firstVehicleDisplay =
                  getFirstPartyVehicleDisplay(firstParty);

                return (
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
                    <td className="py-3 px-2 font-semibold">
                      {r.no_saman || "-"}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}`}
                      >
                        {kat}
                      </span>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      {r.no_report || "-"}
                    </td>
                    <td
                      className="py-3 px-2 whitespace-nowrap"
                      title={partiesTooltip || undefined}
                    >
                      <span>{firstVehicleDisplay}</span>
                      {extraPartiesCount > 0 && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/35">
                          +{extraPartiesCount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{r.location_name || "-"}</span>
                        {r.is_custom_location && (
                          <span className="inline-block bg-slate-500/15 text-[var(--color-text-secondary)] border border-[var(--color-border-light)] rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                            Lain-lain
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">{r.tempat_kemalangan}</td>
                    <td className="py-3 px-2">
                      {r.tarikh_kemalangan} {r.waktu_kejadian}
                    </td>
                    <td
                      className="py-3 px-2 whitespace-nowrap"
                      title={partiesTooltip || undefined}
                    >
                      <span>{firstParty.kategori_kenderaan || "-"}</span>
                      {extraPartiesCount > 0 && (
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/35">
                          +{extraPartiesCount}
                        </span>
                      )}
                    </td>
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
                    <td className="py-3 px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintRecord(r);
                        }}
                        title="Cetak rekod siasatan ini sebagai PDF"
                        className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        🖨️ Cetak PDF
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
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-[var(--color-text-label)] font-semibold">
                    1. No. Saman
                  </label>
                  {normalizeSamanCategory(formState.kategori_saman) ===
                    IN_INVESTIGATION_SAMAN_CATEGORY && (
                    <span className="text-[10.5px] font-semibold text-amber-300">
                      Pilihan
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formState.no_saman}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      no_saman: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={
                    normalizeSamanCategory(formState.kategori_saman) ===
                    IN_INVESTIGATION_SAMAN_CATEGORY
                      ? "Pilihan (jika Dalam Siasatan)"
                      : "Cth: SMN-2026-00142"
                  }
                  required={
                    normalizeSamanCategory(formState.kategori_saman) !==
                    IN_INVESTIGATION_SAMAN_CATEGORY
                  }
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 2. Kategori Saman */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  2. Kategori Saman
                </label>
                <select
                  value={formState.kategori_saman}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      kategori_saman: e.target.value,
                    }))
                  }
                  required
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                >
                  {initialFormState?.kategori_saman === UNSET_SAMAN_CATEGORY && (
                    <option value={UNSET_SAMAN_CATEGORY}>
                      {UNSET_SAMAN_CATEGORY} (Rekod Lama)
                    </option>
                  )}
                  {SAMAN_CATEGORIES.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. No. Report */}
              <div className="col-span-full flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  3. No. Report
                </label>
                <input
                  type="text"
                  placeholder="Cth: RPT/00311/26"
                  value={formState.no_report}
                  onChange={(e) =>
                    setFormState((p) => ({
                      ...p,
                      no_report: e.target.value.toUpperCase(),
                    }))
                  }
                  required={Boolean(initialFormState?.no_report)}
                  className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
                {!initialFormState?.no_report && (
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    Rekod lama tanpa No. Report — boleh diisi atau dibiarkan kosong.
                  </span>
                )}
              </div>

              {/* 4. Kenderaan & Pemandu / Pejalan Kaki Terlibat */}
              <PihakTerlibatBatchInput
                value={formState.pihak_terlibat}
                onChange={(nextRows) => {
                  setModalPihakErrors({});
                  setFormState((p) => ({ ...p, pihak_terlibat: nextRows }));
                }}
                disabled={saving}
                fieldNumber={4}
                validationErrors={modalPihakErrors}
                inputPaddingClass="py-2"
              />

              {/* 5. Lokasi Hotspot / Jalan */}
              <div className="col-span-full flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  5. Lokasi Hotspot / Jalan
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
                  <option value={CUSTOM_LOCATION_ID}>Lain-lain</option>
                </select>
              </div>

              {/* Conditional Nama Jalan & Jenis Jalan (read-only master or manual Lain-lain) */}
              <SiasatanRoadFields
                idPrefix="editSiasatan"
                isCustom={isModalCustomLocation}
                namaJalan={
                  isModalCustomLocation
                    ? formState.nama_jalan || ""
                    : selectedModalLocation?.route || ""
                }
                jenisJalan={
                  isModalCustomLocation
                    ? formState.tempat_kemalangan || ""
                    : selectedModalLocation?.road_type ||
                      formState.tempat_kemalangan ||
                      ""
                }
                onNamaJalanChange={(val) =>
                  setFormState((p) => ({ ...p, nama_jalan: val }))
                }
                onJenisJalanChange={(val) =>
                  setFormState((p) => ({ ...p, tempat_kemalangan: val }))
                }
                disabled={saving}
                inputPaddingClass="py-2"
              />

              {/* 6. Tarikh Kemalangan */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  6. Tarikh Kemalangan
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
                  className="w-full min-w-0 max-w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 7. Waktu Kejadian */}
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  7. Waktu Kejadian (HH:MM)
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
                  className="w-full min-w-0 max-w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>

              {/* 8. Kesalahan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  8. Kesalahan (Punca Kemalangan)
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

              {/* 9. Melibatkan Binatang */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  9. Melibatkan Binatang
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

              {/* 10. Jenis Kemalangan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-label)] font-semibold">
                  10. Jenis Kemalangan
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

              <div className="col-span-full flex items-center justify-between flex-wrap gap-2.5 pt-3 border-t border-[var(--color-table-border)] mt-2">
                <button
                  type="button"
                  onClick={() => handlePrintRecord(editingRecord)}
                  disabled={saving}
                  title="Cetak rekod siasatan ini sebagai PDF"
                  className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-4 py-2 rounded-[10px] font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  🖨️ Cetak PDF
                </button>
                <div className="flex gap-2.5 ml-auto">
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
              </div>
            </form>
          </div>
        </div>
      )}

      <SiasatanPrintSheet
        record={printJob?.record || null}
        selectedLocation={printLocation}
        printedAt={printJob?.printedAt || ""}
      />
    </div>
  );
}
