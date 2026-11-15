import { useState, useMemo } from "react";
import Chip from "../shared/Chip";
import LokasiForm from "../locations/LokasiForm";
import PihakTerlibatBatchInput from "./PihakTerlibatBatchInput";
import { useRegisterUnsavedForm } from "../../hooks/useUnsavedChanges";
import {
  SAMAN_CATEGORIES,
  normalizeSamanCategory,
} from "../../utils/saman";
import {
  createEmptyPihakTerlibatRow,
  isPihakTerlibatDefaultDirty,
  validatePihakTerlibatRows,
} from "../../utils/siasatan";

export default function SiasatanForm({
  activeLocations = [],
  onAddRecord,
  onAddLocation,
}) {
  const [noSaman, setNoSaman] = useState("");
  const [kategoriSaman, setKategoriSaman] = useState("");
  const [noReport, setNoReport] = useState("");
  const [pihakTerlibat, setPihakTerlibat] = useState(() => [
    createEmptyPihakTerlibatRow(),
  ]);
  const [pihakValidationErrors, setPihakValidationErrors] = useState({});
  const [alamat, setAlamat] = useState("");
  const [locationId, setLocationId] = useState("");
  const [tarikhKemalangan, setTarikhKemalangan] = useState("");
  const [waktuKejadian, setWaktuKejadian] = useState("");
  const [kesalahan, setKesalahan] = useState("Kelajuan");
  const [melibatkanBinatang, setMelibatkanBinatang] = useState(false);
  const [jenisBinatang, setJenisBinatang] = useState("Kerbau");
  const [jenisKemalangan, setJenisKemalangan] = useState("Rosak sahaja");
  const [bilanganMaut, setBilanganMaut] = useState(1);
  const [showLokasiModal, setShowLokasiModal] = useState(false);
  const [statusText, setStatusText] = useState(
    "Status: Sedia untuk kemasukan rekod baharu (simulasi)."
  );
  const [submitting, setSubmitting] = useState(false);

  const effectiveLocationId = useMemo(() => {
    if (locationId && activeLocations.some((l) => l.id === locationId)) {
      return locationId;
    }
    return activeLocations[0]?.id || "";
  }, [activeLocations, locationId]);

  const selectedLocation = useMemo(
    () => activeLocations.find((l) => l.id === effectiveLocationId) || null,
    [activeLocations, effectiveLocationId]
  );

  const defaultLocationId = activeLocations[0]?.id || "";
  const isDirty = useMemo(
    () =>
      noSaman !== "" ||
      kategoriSaman !== "" ||
      noReport !== "" ||
      isPihakTerlibatDefaultDirty(pihakTerlibat) ||
      alamat !== "" ||
      effectiveLocationId !== defaultLocationId ||
      tarikhKemalangan !== "" ||
      waktuKejadian !== "" ||
      kesalahan !== "Kelajuan" ||
      melibatkanBinatang !== false ||
      jenisBinatang !== "Kerbau" ||
      jenisKemalangan !== "Rosak sahaja" ||
      String(bilanganMaut) !== "1",
    [
      noSaman,
      kategoriSaman,
      noReport,
      pihakTerlibat,
      alamat,
      effectiveLocationId,
      defaultLocationId,
      tarikhKemalangan,
      waktuKejadian,
      kesalahan,
      melibatkanBinatang,
      jenisBinatang,
      jenisKemalangan,
      bilanganMaut,
    ]
  );

  useRegisterUnsavedForm("siasatan-form", isDirty, "Borang Input Data Siasatan");

  const handleKesalahanChange = (newKesalahan) => {
    setKesalahan(newKesalahan);
    if (newKesalahan === "Langgar binatang") {
      setMelibatkanBinatang(true);
    }
  };

  const handlePihakTerlibatChange = (nextRows) => {
    setPihakTerlibat(nextRows);
    if (Object.keys(pihakValidationErrors).length > 0) {
      setPihakValidationErrors({});
    }
  };

  const handleLocationCreated = (created) => {
    setShowLokasiModal(false);
    if (created?.active) {
      setLocationId(created.id);
      setStatusText(
        `Status: Lokasi baharu "${created.name}" berjaya didaftarkan dan dipilih.`
      );
    } else if (created) {
      setStatusText(
        `Status: Lokasi "${created.name}" disimpan sebagai Tidak Aktif dan tidak dipaparkan dalam senarai aktif.`
      );
    }
  };

  const resetFields = () => {
    setNoSaman("");
    setKategoriSaman("");
    setNoReport("");
    setPihakTerlibat([createEmptyPihakTerlibatRow()]);
    setPihakValidationErrors({});
    setAlamat("");
    setLocationId(activeLocations[0]?.id || "");
    setTarikhKemalangan("");
    setWaktuKejadian("");
    setKesalahan("Kelajuan");
    setMelibatkanBinatang(false);
    setJenisBinatang("Kerbau");
    setJenisKemalangan("Rosak sahaja");
    setBilanganMaut(1);
  };

  const handleReset = () => {
    resetFields();
    setStatusText("Status: Borang dikosongkan.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const savedSaman = noSaman.trim().toUpperCase();
    if (!savedSaman) {
      setStatusText("Ralat: Sila masukkan No. Saman yang sah.");
      return;
    }

    const validKategoriSaman = normalizeSamanCategory(kategoriSaman);
    if (!validKategoriSaman) {
      setStatusText(
        "Ralat: Sila pilih Kategori Saman (POL 170 A atau POL 257) sebelum menyimpan."
      );
      return;
    }

    const savedReport = noReport.trim().toUpperCase();
    if (!savedReport) {
      setStatusText("Ralat: Sila masukkan No. Report yang sah.");
      return;
    }

    const partyCheck = validatePihakTerlibatRows(pihakTerlibat);
    if (!partyCheck.valid) {
      setPihakValidationErrors(partyCheck.rowErrors);
      setStatusText(`Ralat: ${partyCheck.error}`);
      return;
    }

    setPihakValidationErrors({});
    setSubmitting(true);

    try {
      const isMaut = jenisKemalangan === "Maut";

      await onAddRecord({
        no_saman: savedSaman,
        kategori_saman: validKategoriSaman,
        no_report: savedReport,
        pihak_terlibat: partyCheck.cleanList,
        alamat: alamat.trim(),
        tempat_kemalangan: selectedLocation?.road_type || "Persekutuan",
        location_id: selectedLocation?.id || effectiveLocationId,
        location_name: selectedLocation?.name || "",
        tarikh_kemalangan: tarikhKemalangan,
        waktu_kejadian: waktuKejadian,
        kesalahan,
        melibatkan_binatang: melibatkanBinatang,
        jenis_binatang: melibatkanBinatang ? jenisBinatang : null,
        jenis_kemalangan: jenisKemalangan,
        maut: isMaut,
        bilangan_maut: isMaut ? Math.max(1, Number(bilanganMaut) || 1) : 0,
      });

      resetFields();
      setStatusText(
        `Status: Rekod ${savedSaman} disimpan & dikemas kini pada Dashboard.`
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
          Borang Input Data Siasatan
        </h2>
        <Chip>Kemasukan Rekod</Chip>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 max-[550px]:grid-cols-1 gap-3.5"
      >
        {/* 1. No. Saman */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="noSaman"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            1. No. Saman
          </label>
          <input
            id="noSaman"
            type="text"
            value={noSaman}
            onChange={(e) => setNoSaman(e.target.value)}
            placeholder="Contoh: SMN-2026-00142"
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] uppercase placeholder:normal-case focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 2. Kategori Saman */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="kategoriSaman"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            2. Kategori Saman
          </label>
          <select
            id="kategoriSaman"
            value={kategoriSaman}
            onChange={(e) => setKategoriSaman(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="">-- Pilih Kategori Saman --</option>
            {SAMAN_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* 3. No. Report */}
        <div className="col-span-full flex flex-col gap-1.5">
          <label
            htmlFor="noReport"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            3. No. Report
          </label>
          <input
            id="noReport"
            type="text"
            value={noReport}
            onChange={(e) => setNoReport(e.target.value)}
            placeholder="Contoh: RPT/00142/26"
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] uppercase placeholder:normal-case focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 4. Kenderaan & Pemandu / Pejalan Kaki Terlibat */}
        <PihakTerlibatBatchInput
          value={pihakTerlibat}
          onChange={handlePihakTerlibatChange}
          disabled={submitting}
          fieldNumber={4}
          validationErrors={pihakValidationErrors}
        />

        {/* 5. Alamat */}
        <div className="col-span-full flex flex-col gap-1.5">
          <label
            htmlFor="alamat"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            5. Alamat
          </label>
          <input
            id="alamat"
            type="text"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            placeholder="Alamat penuh (simulasi)"
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 6. Lokasi Hotspot / Jalan (+ modal tambah lokasi) */}
        <div className="col-span-full flex flex-col gap-1.5">
          <label
            htmlFor="lokasiHotspot"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            6. Lokasi Hotspot / Jalan
          </label>
          <div className="flex gap-2.5 items-stretch max-[550px]:flex-col">
            <select
              id="lokasiHotspot"
              value={effectiveLocationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              className="flex-1 border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
            >
              {activeLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {loc.is_blackspot ? " ⚫" : ""}
                </option>
              ))}
            </select>
            {onAddLocation && (
              <button
                type="button"
                onClick={() => setShowLokasiModal(true)}
                disabled={submitting}
                className="cursor-pointer shrink-0 border border-[var(--color-accent)] text-[var(--color-accent-soft)] bg-[#1c2b48] px-3.5 py-2.5 rounded-[9px] text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
              >
                + Tambah Lokasi
              </button>
            )}
          </div>
        </div>

        {/* Auto-populated read-only location details */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="siasatanNamaJalan"
            className="text-xs text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-2"
          >
            <span>Nama Jalan</span>
            <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
              Auto (Tidak boleh diubah)
            </span>
          </label>
          <input
            id="siasatanNamaJalan"
            type="text"
            readOnly
            aria-readonly="true"
            value={selectedLocation?.route || ""}
            placeholder="-"
            className="w-full border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[#0d192e] px-3 py-2.5 rounded-[9px] text-[13px] cursor-not-allowed focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="siasatanJenisJalan"
            className="text-xs text-[var(--color-text-label)] font-semibold flex items-center justify-between gap-2"
          >
            <span>Jenis Jalan</span>
            <span className="text-[10px] font-normal text-[var(--color-text-secondary)]">
              Auto (Tidak boleh diubah)
            </span>
          </label>
          <input
            id="siasatanJenisJalan"
            type="text"
            readOnly
            aria-readonly="true"
            value={selectedLocation?.road_type || ""}
            placeholder="-"
            className="w-full border border-[var(--color-border)] text-[var(--color-text-secondary)] bg-[#0d192e] px-3 py-2.5 rounded-[9px] text-[13px] cursor-not-allowed focus:outline-none"
          />
        </div>

        {/* 7. Tarikh Kemalangan */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tarikhKemalangan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            7. Tarikh Kemalangan
          </label>
          <input
            id="tarikhKemalangan"
            type="date"
            value={tarikhKemalangan}
            onChange={(e) => setTarikhKemalangan(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 8. Waktu Kejadian (HH:MM) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="waktuKejadian"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            8. Waktu Kejadian (HH:MM)
          </label>
          <input
            id="waktuKejadian"
            type="time"
            value={waktuKejadian}
            onChange={(e) => setWaktuKejadian(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* 9. Kesalahan (Punca Kemalangan) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="kesalahan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            9. Kesalahan (Punca Kemalangan)
          </label>
          <select
            id="kesalahan"
            value={kesalahan}
            onChange={(e) => handleKesalahanChange(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="Kelajuan">Kelajuan</option>
            <option value="Tidak peka keadaan sekeliling">
              Tidak peka keadaan sekeliling
            </option>
            <option value="Gagal patuh isyarat">Gagal patuh isyarat</option>
            <option value="Keadaan jalan">Keadaan jalan</option>
            <option value="Langgar binatang">Langgar binatang</option>
            <option value="Faktor kenderaan">Faktor kenderaan</option>
            <option value="Lain-lain">Lain-lain</option>
          </select>
        </div>

        {/* 10. Melibatkan Binatang */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--color-text-label)] font-semibold">
            10. Melibatkan Binatang
          </label>
          <div className="flex gap-4 items-center py-1.5 text-[13px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="melibatkanBinatang"
                checked={!melibatkanBinatang}
                onChange={() => setMelibatkanBinatang(false)}
                className="accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Tidak</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="melibatkanBinatang"
                checked={melibatkanBinatang}
                onChange={() => setMelibatkanBinatang(true)}
                className="accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Ya</span>
            </label>
          </div>
        </div>

        {/* Conditional Jenis Binatang */}
        {melibatkanBinatang && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="jenisBinatang"
              className="text-xs text-[var(--color-text-label)] font-semibold"
            >
              Jenis Binatang
            </label>
            <select
              id="jenisBinatang"
              value={jenisBinatang}
              onChange={(e) => setJenisBinatang(e.target.value)}
              className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="Kerbau">Kerbau</option>
              <option value="Lembu">Lembu</option>
              <option value="Babi">Babi</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>
        )}

        {/* 11. Jenis Kemalangan */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="jenisKemalangan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            11. Jenis Kemalangan
          </label>
          <select
            id="jenisKemalangan"
            value={jenisKemalangan}
            onChange={(e) => setJenisKemalangan(e.target.value)}
            required
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="Rosak sahaja">Rosak sahaja</option>
            <option value="Cedera ringan">Cedera ringan</option>
            <option value="Cedera parah">Cedera parah</option>
            <option value="Maut">Maut</option>
          </select>
        </div>

        {/* Conditional Bilangan Kematian */}
        {jenisKemalangan === "Maut" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bilanganMaut"
              className="text-xs text-[var(--color-text-label)] font-semibold"
            >
              Bilangan Kematian (Nyawa)
            </label>
            <input
              id="bilanganMaut"
              type="number"
              min="1"
              inputMode="numeric"
              value={bilanganMaut}
              onChange={(e) => setBilanganMaut(e.target.value)}
              required
              className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        )}

        {/* Actions */}
        <div className="col-span-full mt-1">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] border border-[var(--color-accent)] font-bold px-4 py-2.5 rounded-[10px] text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Rekod Siasatan"}
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

      {showLokasiModal && onAddLocation && (
        <LokasiForm
          variant="modal"
          onAddLocation={onAddLocation}
          onSuccess={handleLocationCreated}
          onCancel={() => setShowLokasiModal(false)}
        />
      )}
    </div>
  );
}
