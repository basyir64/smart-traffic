import { useState, useEffect, useId, useMemo } from "react";
import Chip from "../shared/Chip";
import { useRegisterUnsavedForm } from "../../hooks/useUnsavedChanges";

const DEFAULT_CARD_STATUS =
  "Status: Sedia untuk pendaftaran lokasi baharu. Lokasi aktif akan dipaparkan dalam pilihan Siasatan & Penguatkuasaan.";
const DEFAULT_MODAL_STATUS =
  "Status: Sedia untuk pendaftaran lokasi baharu. Lokasi aktif akan terus dipilih dalam borang siasatan.";

const INPUT_CLASS =
  "w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]";

/**
 * Reusable location & blackspot registration form used both as an inline card
 * in the `/lokasi` Admin tab (`variant="card"`) and inside a modal in
 * `SiasatanForm` (`variant="modal"`).
 */
export default function LokasiForm({
  onAddLocation,
  disabled = false,
  variant = "card",
  onSuccess,
  onCancel,
}) {
  const uid = useId();
  const isModal = variant === "modal";

  const [route, setRoute] = useState("");
  const [km, setKm] = useState("");
  const [landmark, setLandmark] = useState("");
  const [roadType, setRoadType] = useState("Persekutuan");
  const [isBlackspot, setIsBlackspot] = useState(true);
  const [source, setSource] = useState("LAMPIRAN BLACKSPOT");
  const [active, setActive] = useState(true);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    isModal ? DEFAULT_MODAL_STATUS : DEFAULT_CARD_STATUS
  );

  const isDisabled = disabled || submitting;

  const isDirty = useMemo(() => {
    if (disabled) return false;
    return (
      route !== "" ||
      km !== "" ||
      landmark !== "" ||
      roadType !== "Persekutuan" ||
      isBlackspot !== true ||
      source !== "LAMPIRAN BLACKSPOT" ||
      active !== true ||
      lat !== "" ||
      lng !== ""
    );
  }, [
    disabled,
    route,
    km,
    landmark,
    roadType,
    isBlackspot,
    source,
    active,
    lat,
    lng,
  ]);

  useRegisterUnsavedForm(
    isModal ? "siasatan-lokasi-modal" : "lokasi-form",
    isDirty,
    isModal
      ? "Borang Daftar Lokasi (Modal Siasatan)"
      : "Borang Daftar Lokasi & Lampiran Blackspot"
  );

  useEffect(() => {
    if (!isModal || !onCancel) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModal, onCancel, submitting]);

  const resetFields = () => {
    setRoute("");
    setKm("");
    setLandmark("");
    setRoadType("Persekutuan");
    setIsBlackspot(true);
    setSource("LAMPIRAN BLACKSPOT");
    setActive(true);
    setLat("");
    setLng("");
    setErrorMessage("");
  };

  const handleReset = () => {
    resetFields();
    setStatusMessage("Status: Borang lokasi dikosongkan.");
  };

  const handleClose = () => {
    if (submitting) return;
    onCancel?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled || !onAddLocation) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      const created = await onAddLocation({
        route,
        km,
        landmark,
        road_type: roadType,
        is_blackspot: isBlackspot,
        source,
        active,
        lat,
        lng,
      });
      resetFields();
      setStatusMessage(
        `Status: Lokasi "${created.name}" berjaya ditambah dan dikemas kini pada sistem.`
      );
      onSuccess?.(created);
    } catch (err) {
      const msg = err.message || "Gagal menyimpan lokasi baharu.";
      setErrorMessage(msg);
      setStatusMessage(`Ralat: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 max-[550px]:grid-cols-1 gap-3.5"
    >
      {isModal && errorMessage && (
        <div className="col-span-full p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-200 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-route`}
          className="text-xs text-[var(--color-text-label)] font-semibold"
        >
          1. Nama Laluan
        </label>
        <input
          id={`${uid}-route`}
          type="text"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          placeholder="Contoh: JALAN IPOH-LUMUT"
          required
          disabled={isDisabled}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-km`}
          className="text-xs text-[var(--color-text-label)] font-semibold"
        >
          2. Penanda KM
        </label>
        <input
          id={`${uid}-km`}
          type="text"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="Contoh: KM31"
          disabled={isDisabled}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-landmark`}
          className="text-xs text-[var(--color-text-label)] font-semibold"
        >
          3. Penanda / Mercu Tanda
        </label>
        <input
          id={`${uid}-landmark`}
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="Contoh: L/ISYARAT SIDEC"
          disabled={isDisabled}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-roadType`}
          className="text-xs text-[var(--color-text-label)] font-semibold"
        >
          4. Jenis Jalan
        </label>
        <select
          id={`${uid}-roadType`}
          value={roadType}
          onChange={(e) => setRoadType(e.target.value)}
          disabled={isDisabled}
          className={INPUT_CLASS}
        >
          <option value="Persekutuan">Persekutuan</option>
          <option value="Negeri">Negeri</option>
          <option value="Lebuh Raya">Lebuh Raya</option>
          <option value="Lain-lain">Lain-lain</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--color-text-label)] font-semibold">
          5. Status Blackspot
        </label>
        <div className="flex gap-4 items-center py-1.5 text-[13px] flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${uid}-blackspot`}
              checked={isBlackspot === true}
              onChange={() => setIsBlackspot(true)}
              disabled={isDisabled}
              className="accent-[var(--color-accent)] cursor-pointer"
            />
            <span>Ya (Lampiran Blackspot)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${uid}-blackspot`}
              checked={isBlackspot === false}
              onChange={() => setIsBlackspot(false)}
              disabled={isDisabled}
              className="accent-[var(--color-accent)] cursor-pointer"
            />
            <span>Bukan Blackspot (Pantauan)</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-source`}
          className="text-xs text-[var(--color-text-label)] font-semibold"
        >
          6. Sumber Rujukan
        </label>
        <select
          id={`${uid}-source`}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={isDisabled}
          className={INPUT_CLASS}
        >
          <option value="LAMPIRAN BLACKSPOT">LAMPIRAN BLACKSPOT</option>
          <option value="LAMPIRAN HOTSPOT">LAMPIRAN HOTSPOT</option>
          <option value="JKR / MIROS">JKR / MIROS</option>
          <option value="DALAMAN BSPT">DALAMAN BSPT</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${uid}-active`}
          className="text-xs text-[var(--color-text-label)] font-semibold"
        >
          7. Status Aktif
        </label>
        <select
          id={`${uid}-active`}
          value={active ? "Aktif" : "Tidak Aktif"}
          onChange={(e) => setActive(e.target.value === "Aktif")}
          disabled={isDisabled}
          className={INPUT_CLASS}
        >
          <option value="Aktif">Aktif</option>
          <option value="Tidak Aktif">Tidak Aktif</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${uid}-lat`}
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            Latitud
          </label>
          <input
            id={`${uid}-lat`}
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="4.3606"
            disabled={isDisabled}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${uid}-lng`}
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            Longitud
          </label>
          <input
            id={`${uid}-lng`}
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="100.9701"
            disabled={isDisabled}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="col-span-full mt-1">
        <div className="flex gap-2.5 flex-wrap items-center justify-between">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="submit"
              disabled={isDisabled}
              className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] border border-[var(--color-accent)] font-bold px-4 py-2.5 rounded-[10px] text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Lokasi"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isDisabled}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            >
              Kosongkan Borang
            </button>
          </div>
          {isModal && onCancel && (
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          )}
        </div>
        <p className="text-[var(--color-text-muted)] text-xs mt-2.5">
          {statusMessage}
        </p>
      </div>
    </form>
  );

  if (isModal) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-modal-title`}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-2xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-6 max-[550px]:p-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2.5 mb-4 pb-3 border-b border-[var(--color-table-border)]">
            <div>
              <h3 id={`${uid}-modal-title`} className="text-[17px] font-bold m-0">
                Borang Daftar Lokasi & Lampiran Blackspot
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Daftar lokasi hotspot atau blackspot baharu terus daripada borang siasatan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] hover:border-[var(--color-accent)] px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              ✕ Tutup
            </button>
          </div>

          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Borang Daftar Lokasi & Lampiran Blackspot
        </h2>
        <Chip>Akses Admin</Chip>
      </div>

      {formContent}
    </div>
  );
}
