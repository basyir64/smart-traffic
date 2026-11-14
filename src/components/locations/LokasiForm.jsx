import { useState } from "react";
import Chip from "../shared/Chip";

export default function LokasiForm({ onAddLocation, disabled = false }) {
  const [route, setRoute] = useState("");
  const [km, setKm] = useState("");
  const [landmark, setLandmark] = useState("");
  const [roadType, setRoadType] = useState("Persekutuan");
  const [isBlackspot, setIsBlackspot] = useState(true);
  const [source, setSource] = useState("LAMPIRAN BLACKSPOT");
  const [active, setActive] = useState(true);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Status: Sedia untuk pendaftaran lokasi baharu. Lokasi aktif akan dipaparkan dalam pilihan Siasatan & Penguatkuasaan."
  );

  const handleReset = () => {
    setRoute("");
    setKm("");
    setLandmark("");
    setRoadType("Persekutuan");
    setIsBlackspot(true);
    setSource("LAMPIRAN BLACKSPOT");
    setActive(true);
    setLat("");
    setLng("");
    setStatusMessage("Status: Borang lokasi dikosongkan.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;

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
      setRoute("");
      setKm("");
      setLandmark("");
      setRoadType("Persekutuan");
      setIsBlackspot(true);
      setSource("LAMPIRAN BLACKSPOT");
      setActive(true);
      setLat("");
      setLng("");
      setStatusMessage(
        `Status: Lokasi "${created.name}" berjaya ditambah dan dikemas kini pada sistem.`
      );
    } catch (err) {
      setStatusMessage(`Ralat: ${err.message}`);
    }
  };

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Borang Daftar Lokasi & Lampiran Blackspot
        </h2>
        <Chip>Akses Admin</Chip>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 max-[550px]:grid-cols-1 gap-3.5"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="locNamaLaluan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            1. Nama Laluan
          </label>
          <input
            id="locNamaLaluan"
            type="text"
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="Contoh: JALAN IPOH-LUMUT"
            required
            disabled={disabled}
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="locKm"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            2. Penanda KM
          </label>
          <input
            id="locKm"
            type="text"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="Contoh: KM31"
            disabled={disabled}
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="locLandmark"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            3. Penanda / Mercu Tanda
          </label>
          <input
            id="locLandmark"
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Contoh: L/ISYARAT SIDEC"
            disabled={disabled}
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="locJenisJalan"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            4. Jenis Jalan
          </label>
          <select
            id="locJenisJalan"
            value={roadType}
            onChange={(e) => setRoadType(e.target.value)}
            disabled={disabled}
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
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
          <div className="flex gap-4 items-center py-1.5 text-[13px]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="locBlackspot"
                checked={isBlackspot === true}
                onChange={() => setIsBlackspot(true)}
                disabled={disabled}
                className="accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Ya (Lampiran Blackspot)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="locBlackspot"
                checked={isBlackspot === false}
                onChange={() => setIsBlackspot(false)}
                disabled={disabled}
                className="accent-[var(--color-accent)] cursor-pointer"
              />
              <span>Bukan Blackspot (Pantauan)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="locSumber"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            6. Sumber Rujukan
          </label>
          <select
            id="locSumber"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={disabled}
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="LAMPIRAN BLACKSPOT">LAMPIRAN BLACKSPOT</option>
            <option value="LAMPIRAN HOTSPOT">LAMPIRAN HOTSPOT</option>
            <option value="JKR / MIROS">JKR / MIROS</option>
            <option value="DALAMAN BSPT">DALAMAN BSPT</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="locAktif"
            className="text-xs text-[var(--color-text-label)] font-semibold"
          >
            7. Status Aktif
          </label>
          <select
            id="locAktif"
            value={active ? "Aktif" : "Tidak Aktif"}
            onChange={(e) => setActive(e.target.value === "Aktif")}
            disabled={disabled}
            className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
          >
            <option value="Aktif">Aktif</option>
            <option value="Tidak Aktif">Tidak Aktif</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="locLat"
              className="text-xs text-[var(--color-text-label)] font-semibold"
            >
              Latitud
            </label>
            <input
              id="locLat"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="4.3606"
              disabled={disabled}
              className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="locLng"
              className="text-xs text-[var(--color-text-label)] font-semibold"
            >
              Longitud
            </label>
            <input
              id="locLng"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="100.9701"
              disabled={disabled}
              className="w-full border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3 py-2.5 rounded-[9px] text-[13px] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>

        <div className="col-span-full mt-1">
          <div className="flex gap-2.5 flex-wrap">
            <button
              type="submit"
              disabled={disabled}
              className="cursor-pointer bg-[var(--color-accent)] text-[#0b1629] border border-[var(--color-accent)] font-bold px-4 py-2.5 rounded-[10px] text-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              Simpan Lokasi
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled}
              className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-4 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            >
              Kosongkan Borang
            </button>
          </div>
          <p className="text-[var(--color-text-muted)] text-xs mt-2.5">
            {statusMessage}
          </p>
        </div>
      </form>
    </div>
  );
}
