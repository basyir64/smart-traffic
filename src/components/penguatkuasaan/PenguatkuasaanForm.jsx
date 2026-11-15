import { useState, useMemo } from "react";
import Chip from "../shared/Chip";
import SamanBatchInput from "./SamanBatchInput";
import { useRegisterUnsavedForm } from "../../hooks/useUnsavedChanges";
import { validateSamanRows } from "../../utils/saman";

export default function PenguatkuasaanForm({
  activeLocations = [],
  onAddOperation,
}) {
  const [tarikh, setTarikh] = useState("");
  const [locationId, setLocationId] = useState("");
  const [kategoriKemalangan, setKategoriKemalangan] = useState("Maut");
  const [jenisOperasi, setJenisOperasi] = useState("Pematuhan");
  const [tangkapan, setTangkapan] = useState(0);
  const [sita, setSita] = useState(0);
  const [jamMula, setJamMula] = useState("");
  const [jamAkhir, setJamAkhir] = useState("");
  const [samanRows, setSamanRows] = useState([
    { no_saman: "", kategori_saman: "" },
  ]);
  const [samanValidationErrors, setSamanValidationErrors] = useState({});
  const [samanResetKey, setSamanResetKey] = useState(0);
  const [statusText, setStatusText] = useState(
    "Status: Sedia untuk kemasukan rekod operasi baharu (simulasi)."
  );
  const [submitting, setSubmitting] = useState(false);

  const effectiveLocationId = useMemo(() => {
    if (locationId && activeLocations.some((l) => l.id === locationId)) {
      return locationId;
    }
    return activeLocations[0]?.id || "";
  }, [activeLocations, locationId]);

  const defaultLocationId = activeLocations[0]?.id || "";
  const isDirty = useMemo(
    () =>
      tarikh !== "" ||
      effectiveLocationId !== defaultLocationId ||
      kategoriKemalangan !== "Maut" ||
      jenisOperasi !== "Pematuhan" ||
      String(tangkapan) !== "0" ||
      String(sita) !== "0" ||
      jamMula !== "" ||
      jamAkhir !== "" ||
      samanRows.length !== 1 ||
      Boolean(samanRows[0]?.no_saman || samanRows[0]?.kategori_saman),
    [
      tarikh,
      effectiveLocationId,
      defaultLocationId,
      kategoriKemalangan,
      jenisOperasi,
      tangkapan,
      sita,
      jamMula,
      jamAkhir,
      samanRows,
    ]
  );

  useRegisterUnsavedForm(
    "penguatkuasaan-form",
    isDirty,
    "Borang Input Penguatkuasaan"
  );

  const resetFields = () => {
    setTarikh("");
    setLocationId(activeLocations[0]?.id || "");
    setKategoriKemalangan("Maut");
    setJenisOperasi("Pematuhan");
    setTangkapan(0);
    setSita(0);
    setJamMula("");
    setJamAkhir("");
    setSamanRows([{ no_saman: "", kategori_saman: "" }]);
    setSamanValidationErrors({});
    setSamanResetKey((k) => k + 1);
  };

  const handleSamanChange = (nextRows) => {
    setSamanRows(nextRows);
    if (Object.keys(samanValidationErrors).length > 0) {
      setSamanValidationErrors({});
    }
  };

  const handleReset = () => {
    resetFields();
    setStatusText("Status: Borang dikosongkan.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const samanCheck = validateSamanRows(samanRows, {
      allowUnsetForLegacy: false,
    });
    if (!samanCheck.valid) {
      setSamanValidationErrors(samanCheck.rowErrors);
      setStatusText(`Ralat: ${samanCheck.error}`);
      return;
    }

    setSamanValidationErrors({});
    setSubmitting(true);

    try {
      const selectedLoc = activeLocations.find(
        (l) => l.id === effectiveLocationId
      );
      const savedTarikh = tarikh;
      const samanList = samanCheck.cleanList;

      await onAddOperation({
        tarikh: savedTarikh,
        location_id: selectedLoc?.id || effectiveLocationId,
        location_name: selectedLoc?.name || "",
        kategori_kemalangan: kategoriKemalangan,
        jenis_operasi: jenisOperasi,
        tangkapan: Math.max(0, parseInt(tangkapan, 10) || 0),
        sita: Math.max(0, parseInt(sita, 10) || 0),
        jam_mula: jamMula,
        jam_akhir: jamAkhir,
        saman_list: samanList,
      });

      resetFields();
      setStatusText(
        `Status: Rekod operasi pada ${savedTarikh} disimpan & dikemas kini pada Dashboard.`
      );
    } catch (err) {
      setStatusText(`Ralat: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Borang Input Penguatkuasaan
        </h2>
        <Chip>Rekod Operasi</Chip>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 max-[550px]:grid-cols-1 gap-3.5"
      >
        {/* 1. Tarikh */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="opTarikh"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            1. Tarikh
          </label>
          <input
            id="opTarikh"
            type="date"
            value={tarikh}
            onChange={(e) => setTarikh(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 2. Lokasi Hotspot / Jalan */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="opLokasi"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            2. Lokasi Hotspot / Jalan
          </label>
          <select
            id="opLokasi"
            value={effectiveLocationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          >
            {activeLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.is_blackspot ? " ⚫" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Kategori Kemalangan */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="opKategoriKemalangan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            3. Kategori Kemalangan
          </label>
          <select
            id="opKategoriKemalangan"
            value={kategoriKemalangan}
            onChange={(e) => setKategoriKemalangan(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
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
          <label
            htmlFor="opJenisOperasi"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            4. Jenis Operasi
          </label>
          <select
            id="opJenisOperasi"
            value={jenisOperasi}
            onChange={(e) => setJenisOperasi(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
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
          <label
            htmlFor="opTangkapan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            5. Tangkapan
          </label>
          <input
            id="opTangkapan"
            type="number"
            min="0"
            inputMode="numeric"
            value={tangkapan}
            onChange={(e) => setTangkapan(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 6. Sita */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="opSita"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            6. Sita
          </label>
          <input
            id="opSita"
            type="number"
            min="0"
            inputMode="numeric"
            value={sita}
            onChange={(e) => setSita(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 7. Jam Mula (HH:MM) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="opJamMula"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            7. Jam Mula (HH:MM)
          </label>
          <input
            id="opJamMula"
            type="time"
            value={jamMula}
            onChange={(e) => setJamMula(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 8. Jam Akhir (HH:MM) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="opJamAkhir"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            8. Jam Akhir (HH:MM)
          </label>
          <input
            id="opJamAkhir"
            type="time"
            value={jamAkhir}
            onChange={(e) => setJamAkhir(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 9. Saman */}
        <SamanBatchInput
          key={samanResetKey}
          value={samanRows}
          onChange={handleSamanChange}
          disabled={submitting}
          fieldNumber={9}
          validationErrors={samanValidationErrors}
        />

        {/* Actions */}
        <div className="col-span-full mt-1">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] border border-[var(--color-accent)] font-bold px-4 py-2.5 rounded-[10px] text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Rekod Penguatkuasaan"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={submitting}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            >
              Kosongkan Borang
            </button>
          </div>
          <p className="text-[var(--color-text-muted)] text-xs mt-2.5">
            {statusText}
          </p>
        </div>
      </form>
    </div>
  );
}
