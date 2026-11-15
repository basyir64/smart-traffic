# SMART TRAFFIC AI — Project Specification

> **PDRM · BSPT · INOVASI IPD**
> Command & Accident Prevention Dashboard
> *Prototaip Interaktif*

---

## 0. Developer Environment

> [!IMPORTANT]
> **Shell: Use Git Bash, not CMD or PowerShell.**
> Node.js, npm, and related tooling are configured in `C:\Users\basyir\.bashrc`.
> All terminal commands (install, dev, build, lint, deploy, etc.) **must** be run via bash.
>
> ```
> bash -l -c "cd /c/Users/basyir/smarttraffic && npm run dev"
> ```
>
> When using `run_command`, always invoke through bash:
> ```
> bash -l -c "<your command here>"
> ```

---

## 1. Overview

SMART TRAFFIC AI is an internal command-and-control dashboard for PDRM (Royal Malaysia Police) traffic operations. It helps BSPT (Bahagian Siasatan dan Penguatkuasaan Trafik) officers analyze accident data, identify high-risk hotspot locations, and generate AI-assisted operation plans — all grounded in the 9-element IPRS (Intelligent Policing Risk System) framework.

### 1.1 Origin

The codebase was scaffolded from **samalahkita**, an older social-media/online-diary hybrid SPA. The existing React + Vite + Tailwind + Firebase/Firestore infrastructure is being repurposed for Smart Traffic. The UI, data models, and routing will be completely replaced; reusable plumbing (build config, i18n, hooks architecture, Firebase setup) is carried over.

### 1.2 Prototype Reference

The interactive HTML prototype is at [`SMART_TRAFFIC_AI_Dashboard_Prototype.html`](file:///c:/Users/basyir/smarttraffic/SMART_TRAFFIC_AI_Dashboard_Prototype.html). It defines the feature set, visual language, and data shape that the React app must implement. **All features described below are derived from this prototype.**

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | React 19 | With React Compiler via Babel plugin |
| Bundler | Vite 7 | Dev + build |
| Styling | Tailwind CSS 4 | Via `@tailwindcss/vite` plugin |
| Backend/DB | Firebase Firestore | Project: `smart-traffic-93b67`, region: `asia-northeast1` |
| Auth | Firebase Authentication | Email/Password only, no public sign-up (CLI-provisioned users) |
| Emulator | Firebase Emulator Suite | Firestore on port `8090`, Auth on port `9099`, UI on port `4000` |
| Routing | React Router 7 | |
| Mapping | Google Maps JavaScript API | Via `@vis.gl/react-google-maps` with custom dark theme; includes 10,000 free monthly loads under Dynamic Maps SKU. Graceful fallback to SVG schematic map if offline/unconfigured |
| AI / GenAI | Google Gemini API (Gemini 2.5 Flash) | Via `@google/genai` (or Firebase Vertex AI). Powers contextual hotspot tactical advisory, automated operational patrol briefings, and 9-element IPRS intelligence summaries |
| Bahasa / UI | Bahasa Melayu (BM) sahaja | Antara muka pengguna 100% Bahasa Melayu sahaja (tiada dwi-bahasa / terjemahan bahasa Inggeris) |
| Deployment | GitHub Actions → GitHub Pages | Existing workflow in `.github/workflows/deploy.yml` (`https://basyir64.github.io/smart-traffic/`) |

---

## 3. Cleanup Tasks (from samalahkita)

Before building new features, the legacy samalahkita code must be cleaned up:

- [x] **`vite.config.js`** — Changed `base` to `"/smart-traffic"` (matching GitHub repository `basyir64/smart-traffic`)
- [x] **`src/index.jsx`** — Changed `BrowserRouter basename` to `'/smart-traffic'`
- [x] **Remove legacy views** — `Stories.jsx`, `Disclaimer.jsx`, `PrivacyNotice.jsx`, `ScrollToTop.jsx`
- [x] **Remove legacy components** — `stories/*`, `situations/*`, `marquee/*`, `face/*`, `chart/*`, `search-bar/*`
- [x] ~~**Remove legacy hooks**~~ — **Superseded:** hooks intentionally kept for persistence debugging (see Phase 1 note)
- [x] **Remove legacy i18n JSON files** — everything under `src/i18n/components/` and `src/i18n/views/` (will be rebuilt for new views)
- [x] **Remove legacy routes** — `/stories/situation/:situationid`, `/privacy-notice`, `/disclaimer`
- [x] **Remove `RedirectHandler`** component from `index.jsx`
- [x] **Clean `index.css`** — strip old samalahkita styles
- [x] **Update `package.json`** — confirm `name` is `"smarttraffic"` ✓, remove `html-to-image` if unused
- [x] **Remove `client_secret_*.json`** — should never be in the repo
- [x] **Remove `project nimbus.drawio`** — belongs to old project
- [x] **Update Firestore rules** — replace the temporary allow-all rule (expiring 2026-12-12) with proper role-based rules

---

## 4. Features & Screens

Derived from the prototype, the app has **4 main tabs/sections** plus shared UI:

### 4.1 Dashboard Utama (Main Dashboard) — `/`

The default landing page. Contains:

#### Metric Cards (top row, 5-column responsive grid) — *(Dikemas kini UAT 2)*
| Metric | Description |
|---|---|
| Jumlah Kemalangan | Total accident cases (all categories) |
| Kemalangan Maut | Fatal accident cases |
| Jumlah Kematian | Total fatalities (persons) |
| Perubahan Kes | % change vs. previous period |
| Jumlah Saman | Total unique summonses (`no_saman` deduplicated across `siasatan` + `penguatkuasaan`) in the active period with `POL 170 A` vs `POL 257` (and legacy `Belum Ditetapkan`) breakdown |

#### Accident & Saman Trend Chart (`Trend Kemalangan & Saman`) — *(Dikemas kini UAT 2)*
- Bar chart showing period counts by time subdivisions (`Hari` / `Minggu` / `Bulan`), supporting mode toggle between **`Perbandingan`** (grouped side-by-side Accident vs Saman stacked bars `POL 170 A` / `POL 257`), **`Kemalangan`** only, and **`Saman`** only
- Deduplicates `no_saman` across `siasatan` (`tarikh_kemalangan`) and `penguatkuasaan` (`tarikh`) in the active period so enforcement-to-crash correlation is visible without double-counting

#### Period-Based Filtering (Mingguan / Bulanan / Suku Tahun)
- Metric cards (Jumlah Kemalangan, Kemalangan Maut, Jumlah Kematian, Jumlah Saman), Trend Chart, Hotspot List, Location Risk, and Dashboard CSV Export dynamically derive their counts strictly from live `siasatan` and `penguatkuasaan` records whose date (`tarikh_kemalangan` / `tarikh`) falls within the selected time window:
  - **Mingguan** (weekly): records within the last 7 days (`7 Nov – 14 Nov 2026`)
  - **Bulanan** (monthly, default): records in the current calendar month (`1 Nov – 30 Nov 2026`)
  - **Suku Tahun** (quarterly): records in the current 3-month calendar quarter (`1 Okt – 31 Dis 2026 (Suku 4)`)
- **Explicit Date Window Display**:
  - The Dashboard period filter bar displays a `📅 Tempoh Data: <Tempoh> (<Tarikh Mula> – <Tarikh Akhir>)` badge next to the selector so it is clear that all dashboard panels share the same time window.
- **Tally Formula (`siasatan` + `penguatkuasaan`)**:
  - Each `siasatan` record in the period contributes `+1` to `Jumlah Kemalangan`; if `maut === true`, it contributes `+1` to `Kemalangan Maut` and `+bilangan_maut` to `Jumlah Kematian`.
  - Each `penguatkuasaan` record in the period where `kategori_kemalangan !== "Bukan kemalangan"` contributes `+1` to `Jumlah Kemalangan`; if `kategori_kemalangan === "Maut"`, it also contributes `+1` to `Kemalangan Maut` and `+1` to `Jumlah Kematian`.

#### Location Risk Panel (`Risiko Lokasi Pilihan`)
- **100% Data-Driven & Gemini AI Synthesized (Zero Static Analytical Fields on `locations`)**:
  - **Skor Risiko (`0–100`, circular badge)** with interactive formula tooltip (`i` badge showing the exact formula and the selected location's live arithmetic breakdown): Computed dynamically from the location's live `siasatan` and `penguatkuasaan` records in the active period plus its `is_blackspot` status (`0` when `cases === 0`):
    $$\text{risk} = \begin{cases} 0 & \text{if } \text{cases} = 0 \\ \text{clamp}\big(0, 100,\; (\text{is\_blackspot} ? 35 : 15) + (\text{cases} \times 12) + (\text{fatalCount} \times 15) + (\text{deaths} \times 5) - (\text{opsCount} \times 4)\big) & \text{if } \text{cases} > 0 \end{cases}$$
  - **Waktu Risiko (`peakTime`)**: Computed dynamically by grouping the selected location's period `siasatan` (`waktu_kejadian`) and accident `penguatkuasaan` (`jam_mula`) timestamps into 4-hour IPRS windows (`00:00–04:00`, `04:01–08:00`, `08:01–12:00`, `12:01–16:00`, `16:01–20:00`, `20:01–24:00`) and selecting the window with the highest count (or `"Tiada rekod tempoh ini"` when 0 records).
  - **Selected location name, case count (`cases`), and active operations count (`ops_count`)** derived from live period records.
  - **Risk level badge** (`RISIKO TINGGI` ≥ 75, `RISIKO SEDERHANA` otherwise, or `RISIKO RENDAH (0 KES)` when `risk === 0`) and **Blackspot indicator badge** (`⚫ BLACKSPOT` for gazetted locations).
  - **On-Demand `Faktor` & `Cadangan` Generation via Gemini AI (`gemini-2.5-flash`)** with interactive explanation tooltip (`ⓘ Bagaimana AI Menjana?`):
    - **Button-Triggered Only (Strict Quota Conservation)**: `Faktor` and `Cadangan` are **never** auto-fetched on page load, period change, or location selection. Instead, they are generated strictly when the user clicks the **`[⚡ Jana Faktor & Cadangan AI]`** button in `Risiko Lokasi Pilihan`.
    - When clicked, feeds the location's physical metadata (`name`, `route`, `km`, `landmark`, `road_type`, `is_blackspot`), active period, and aggregated `siasatan` (`kesalahan`, `kategori_kenderaan`, `jenis_binatang`, `jenis_kemalangan`, `umur`, `waktu_kejadian`) + `penguatkuasaan` (`jenis_operasi`, `kategori_kemalangan`, `tangkapan`, `sita`, `jam_mula`–`jam_akhir`) records into Gemini with `responseMimeType: "application/json"` to return `{ "faktor": "...", "cadangan": "..." }`.
    - **Quota Preservation & Caching**: Short-circuits when the location has `0` records in the active period, caches generated responses in memory by `${locationId}:${period}:${recordsSignature}` so revisiting an already-generated location does not re-call the API, and falls back to a deterministic synthesis derived from the location's actual `siasatan` and `penguatkuasaan` tallies when offline or if the API key errors.

#### Geographic & Schematic Hotspot Map (`Peta Skematik & Interaktif Hotspot`)
- **Primary: Google Maps JavaScript API (via `@vis.gl/react-google-maps`)**:
  - Replaces static schematic representation with real interactive geographic mapping centered on the Perak Tengah / Manjung corridor (centered at `lat: 4.3600, lng: 100.9650`, default zoom: 11–12).
  - Custom dark mode styling tailored to the command dashboard palette (`#091327` background, dark blue landmass, muted road lines).
  - **Dynamic Markers**:
    - Placed accurately on the road network using real coordinates (`geo: { lat, lng }`).
    - Color-coded by live risk score: Red (`#dc5d4d`) for High Risk (≥75) / Blackspots, Orange (`#eba34b`) for Medium-High (68–74), Yellow (`#e8bb57`) for Medium (<68).
    - Clicking a marker opens a summary InfoWindow and selects that hotspot synchronously across the entire dashboard (updating the Risk Panel, trend charts, and priority list).
  - **Graceful Fallback**: If offline, in a firewalled environment, or if `VITE_GOOGLE_MAPS_API_KEY` is not configured, the map automatically falls back to the lightweight SVG schematic vector map.
- Legend for risk levels & blackspot markers.

#### Hotspot Priority List (`Hotspot Keutamaan`)
- Sorted by risk score (descending) and paginated at **5 locations per page** (showing the top 5 riskiest active hotspots on Page 1 with `← Sebelumnya`, page numbers, and `Seterusnya →` controls)
- Each item shows: rank number, name, case count, peak time window, ops count, and risk score
- Clicking selects the location

### 4.2 Siasatan (Investigation Data Input & Aggregation) — `/siasatan`

Stacked vertically into four sections:
1. **Borang Input Data Siasatan** (top)
2. **9 Elemen Data Kemalangan** (second — live aggregation derived from submitted records)
3. **Senarai Rekod Siasatan** (third — paginated, showing 5 newest records per page)
4. **Faktor Penyumbang Direkodkan** (bottom-most)

#### 1. Investigation Input Form (`Borang Input Data Siasatan`) — *(Dikemas kini UAT 2)*
14 numbered fields (plus 2 dynamic read-only location preview fields):
1. **No. Saman** (text, required)
2. **Kategori Saman** *(Baharu UAT 2 — wajib)*: Select starting unselected (`"-- Pilih Kategori Saman --"`) with options `POL 170 A` and `POL 257`.
3. **No. Kenderaan** (text)
4. **No. IC** (numerical)
5. **Nama** (text)
6. **Umur** (numerical, 0–120)
7. **Alamat** (text)
8. **Lokasi Hotspot / Jalan** (select populated from active `locations` collection: e.g. `KM31 JALAN IPOH-LUMUT (L/ISYARAT SIDEC)` — links each `siasatan` record via `location_id` + `location_name` to drive `Hotspot Keutamaan` & `Risiko Lokasi Pilihan` on Dashboard)
   - Includes a **`+ Tambah Lokasi`** button next to/inline with the dropdown that opens a modal containing the reusable location registration form (identical to `Lokasi` tab's `Borang Daftar Lokasi & Lampiran Blackspot`).
   - Upon creating a new active location via the modal, it is immediately auto-selected in field `8. Lokasi Hotspot / Jalan` and the modal closes.
   - **Read-only Dynamic Location Preview Fields** *(populated automatically from the selected location; uneditable)*:
     - **Nama Jalan** (populated from `location.route`, corresponding to field 1 `Nama Laluan` of the Lokasi form)
     - **Jenis Jalan** (populated from `location.road_type`, corresponding to field 4 `Jenis Jalan` of the Lokasi form)
   - *(Note: The previous standalone editable field `Tempat Kemalangan (Jenis Jalan)` is removed from both `SiasatanForm` and `SiasatanTable`'s Edit Modal; `tempat_kemalangan` continues to be auto-derived and persisted from `selectedLocation.road_type` in Firestore so `9 Elemen Data Kemalangan` Element 4 and `SiasatanTable` continue working seamlessly.)*
9. **Tarikh Kemalangan** (date)
10. **Waktu Kejadian** (time `HH:MM`)
11. **Kategori Kenderaan** (select: `Motosikal`, `Kereta`, `MPV / SUV`, `Van`, `Bas`, `Lori / Kenderaan Berat`, `Basikal`, `Lain-lain`)
12. **Kesalahan / Punca Kemalangan** (select: `Kelajuan`, `Tidak peka keadaan sekeliling`, `Gagal patuh isyarat`, `Keadaan jalan`, `Langgar binatang`, `Faktor kenderaan`, `Lain-lain` — harmonized with the contributing factors analysis)
13. **Melibatkan Binatang** (radio: `Tidak` / `Ya`)
    - When `Ya` is selected, reveals **Jenis Binatang** (select: `Kerbau`, `Lembu`, `Babi`, `Lain-lain`)
14. **Jenis Kemalangan** (select: `Rosak sahaja`, `Cedera ringan`, `Cedera parah`, `Maut`)
    - When `Maut` is selected, directly reveals **Bilangan Kematian (Nyawa)** (numerical, min 1). (Separate *Maut* radio button removed as redundant).
- Actions: **Simpan Rekod Siasatan** (submit) and **Kosongkan Borang** (reset)

#### 2. 9 Elemen Data Kemalangan (`#siasatanAggTable`)
Live all-time aggregation table placed directly underneath the input form (font size `15px`, child elements prefixed with `-`):
- **All-Time Scope**: Aggregates all records in the `siasatan` collection across all time (no time window filter or date pill).
- **Quota-Preserving Lazy Expansion**:
  - Elements 1–3 load lightweight server-side counts/sums (`getCountFromServer` and `getAggregateFromServer`) on initial render.
  - Parent items with children (Elements 4–9) are **collapsed by default** and **only fire Firestore reads when expanded** by the user, caching the result per `elementNumber` until a record is added or updated.
- **1. Jumlah kemalangan**: `[count] kes`
- **2. Kemalangan maut**: `[count where maut=true] kes`
- **3. Jumlah kematian**: `[sum of bilangan_maut] nyawa`
- **4. Jenis jalan** (`Tempat Kemalangan`, collapsible):
  - `- Lebuhraya` (`[count] kes`), `- Persekutuan` (`[count] kes`), `- Negeri` (`[count] kes`), `- Lain-lain` (`[count] kes`)
- **5. Waktu kejadian** (`Waktu Kejadian`, collapsible):
  - `- 0000-0400`, `- 0401-0800`, `- 0801-1200`, `- 1201-1600`, `- 1601-2000`, `- 2001-2400` (`[count] kes` each)
- **6. Kemalangan melibatkan binatang** (`[total] kes`, collapsible):
  - `- Kerbau`, `- Lembu`, `- Babi`, `- Lain-lain` (`[count] kes` each)
- **7. Kategori kenderaan** (`[total] kes`, collapsible):
  - `- Motosikal`, `- Kereta`, `- MPV / SUV`, `- Van`, `- Bas`, `- Lori / Kenderaan Berat`, `- Basikal`, `- Lain-lain` (`[count] kes` each)
- **8. Kategori umur** (`Umur`, collapsible):
  - `- 00-05`, `- 06-10`, `- 11-15`, `- 16-20`, `- 21-25`, `- 26-30`, `- 31-35`, `- 36-40`, `- 41-45`, `- 46-50`, `- 51-55`, `- 56-60`, `- 61-65`, `- 66-70`, `- 71-75`, `- >75` (`[count] kes` each)
- **9. Punca kemalangan** (`Kesalahan`, collapsible):
  - `- Kelajuan`, `- Tidak peka keadaan sekeliling`, `- Gagal patuh isyarat`, `- Keadaan jalan`, `- Langgar binatang`, `- Faktor kenderaan`, `- Lain-lain` (`[count] kes` each)

#### 3. Investigation Records Table (`Senarai Rekod Siasatan`)
- Displays submitted records sorted newest-first by default (`orderBy("tarikh_kemalangan", "desc")`), paginated at **5 records per page** with columns: No. Saman, Kategori Saman (`POL 170 A` / `POL 257` / `Belum Ditetapkan`), No. Kenderaan, Lokasi Hotspot, Tempat, Tarikh & Waktu (`↓` / `↑`, clickable to toggle sort direction), Kenderaan, Kesalahan, Binatang, Jenis Kemalangan, Maut
- **Quota-Preserving Native Firestore Pagination**: Uses `getCountFromServer` for total record count and `startAfter(cursor)` + `limit(5)` (`getDocs`) so Firestore reads are fired **only when the page or sort order changes** (modeled after `useSituationService` and `useStoryService`).
- **Interactive Row Edit Modal (`Kemaskini Rekod Siasatan`)**: For authorized users (`Siasatan` or `Admin`), each row highlights on hover (`cursor: pointer`) and opens an edit modal on click to update the record in Firestore (`updateDoc`). *(UAT 2: Mirrors `SiasatanForm` fields `1`–`14`, includes `2. Kategori Saman`, replaces editable `Tempat Kemalangan` dropdown with uneditable dynamic `Nama Jalan` and `Jenis Jalan` fields populated from selected `Lokasi Hotspot / Jalan`, and auto-derives/persists `tempat_kemalangan` from `road_type`.)*
- Includes total count badge, pagination controls (`← Sebelumnya`, page numbers, `Seterusnya →`), and privacy notice reminding users not to enter real IC or personal data

#### 4. Contributing Factors Chart (`Faktor Penyumbang Direkodkan`)
- Placed at the bottom-most position of the Siasatan tab
- **100% Dynamically Calculated from `siasatan.kesalahan`** (zero hardcoded baseline percentages):
  - Uses server-side `getCountFromServer` (`where("kesalahan", "==", name)`) to compute exact count and percentage (`Math.round((count / total) * 100)`, or `0%` when `total === 0`) for each of the 7 categories:
    - Kelajuan (speed)
    - Tidak peka keadaan sekeliling (lack of situational awareness)
    - Gagal patuh isyarat (traffic signal non-compliance)
    - Keadaan jalan (road condition)
    - Langgar binatang (animal crossing collision)
    - Faktor kenderaan (mechanical/vehicle failure)
    - Lain-lain (others)
- Disclaimer notice: factors must come from verified investigation findings

### 4.3 Penguatkuasaan (Enforcement Operations Input & Log) — `/penguatkuasaan`

Logs enforcement operations (roadblocks/ops) conducted by BSPT teams. Sections are stacked vertically (full-width) with `Senarai Rekod Penguatkuasaan` placed below `Borang Input Penguatkuasaan`.

#### 1. Enforcement Input Form (`Borang Input Penguatkuasaan`) — *(Dikemas kini UAT 2)*
9 numbered fields (fixing the previously unnumbered `Lokasi Hotspot / Jalan` field):
1. **Tarikh** (date)
2. **Lokasi Hotspot / Jalan** (select populated from `locations` collection — links operation to a hotspot)
3. **Kategori Kemalangan** (select: `Maut`, `Parah`, `Ringan`, `Rosak sahaja`, `Bukan kemalangan`)
4. **Jenis Operasi** (select: `Pematuhan`, `Perdagangan`, `Motosikal`, `Mabuk`, `Bersepadu`)
5. **Tangkapan** (numerical, min 0)
6. **Sita** (numerical, min 0)
7. **Jam Mula** (time `HH:MM`)
8. **Jam Akhir** (time `HH:MM`)
9. **Saman** *(Dikemas kini UAT 2 — pilihan / 0 atau lebih saman)*:
   - Numbered batch input rows starting at `1` (`1.`, `2.`, ...), where each row pairs a text `No. Saman` input (matching `Siasatan` field `1. No. Saman`, placeholder `Contoh: SMN-2026-00142`) with a `Kategori Saman` select (`-- Pilih Kategori Saman --`, `POL 170 A`, `POL 257`), plus a row remove button (`✕`).
   - **`+ Tambah Saman`** button appends a new numbered row (`n + 1`).
   - **CSV Template Download (`Muat Turun Templat CSV`)**: Generates and downloads `templat_saman_penguatkuasaan.csv` containing only the canonical header `no,nombor_saman,kategori_saman` (no sample rows).
   - **CSV Import (`Import CSV`)**: Accepts `.csv` files with headers `no, nombor_saman, kategori_saman` (case-insensitive / trimmed).
     - Normalizes `kategori_saman` inputs (e.g. casing/whitespace variants -> `"POL 170 A"` or `"POL 257"`), rejects blank/unrecognised `kategori_saman` values or invalid sequence numbers with row-specific Bahasa Melayu error messages, detects duplicate `nombor_saman` entries, and sorts sequence `1..N`.
     - When non-empty saman rows already exist in the form, prompts the user to choose **Ganti Senarai Sedia Ada (Replace)**, **Tambah ke Senarai (Append)**, or **Batal** before applying imported rows.
   - **UI & Submit Validation**: Completely blank optional rows are ignored on save (`0` saman allowed; stored as `saman_list: Array<{ no_saman, kategori_saman }>`), while partially filled rows (number without category or category without number) and duplicate `no_saman` entries across rows fail validation with inline row highlights and clear Bahasa Melayu messages.

#### 2. Enforcement Operations Table (`Senarai Rekod Penguatkuasaan`)
- Placed full-width directly below the input form
- Displays logged enforcement operations sorted newest-first by default (`orderBy("tarikh", "desc")`), paginated at **5 operations per page** with columns: Tarikh (`↓` / `↑`, clickable to toggle sort direction), Lokasi, Jenis Operasi, Kat. Kemalangan, Tangkapan, Sita, Saman (`[count] saman` + `POL 170 A` / `POL 257` / `Belum Ditetapkan` breakdown & preview/tooltip), Masa (`jam_mula`–`jam_akhir`)
- **Quota-Preserving Native Firestore Pagination**: Uses `getCountFromServer` for total operation count and `startAfter(cursor)` + `limit(5)` (`getDocs`) so Firestore reads are fired **only when the page or sort order changes**
- **Interactive Row Edit Modal (`Kemaskini Rekod Penguatkuasaan`)**: For authorized users (`Penguatkuasaan` or `Admin`), each row highlights on hover (`cursor: pointer`) and opens an edit modal on click (including numbered fields `1`–`9` and the `9. Saman` batch editor + CSV import) to update the operation in Firestore (`updateDoc`).
- Includes total count badge (`[total] operasi`) and pagination controls (`← Sebelumnya`, page numbers, `Seterusnya →`)

### 4.4 Lokasi (Location & Lampiran Blackspot Management — Admin) — `/lokasi`

Allows `Admin` users to register and manage official route locations and gazetted blackspots (e.g. `NAMA LALUAN: KM31 JALAN IPOH-LUMUT (L/ISYARAT SIDEC) LAMPIRAN BLACKSPOT`). Active locations populate the dropdowns in `Siasatan` and `Penguatkuasaan` and appear on `Dashboard Utama`. Sections are stacked vertically (full-width) with `Senarai Lokasi & Lampiran Blackspot` placed below `Borang Daftar Lokasi & Lampiran Blackspot`.

#### 1. Location & Blackspot Registration Form (`Borang Daftar Lokasi & Lampiran Blackspot`)
7 fields (+ optional geographic coordinates):
1. **Nama Laluan** (text, e.g. `JALAN IPOH-LUMUT`)
2. **Penanda KM** (text, optional, e.g. `KM31`)
3. **Penanda / Mercu Tanda** (text, optional, e.g. `L/ISYARAT SIDEC`)
4. **Jenis Jalan** (select: `Persekutuan`, `Negeri`, `Lebuh Raya`, `Lain-lain` — used to auto-populate `Tempat Kemalangan` in `Siasatan`)
5. **Status Blackspot** (radio: `Ya (Lampiran Blackspot)` / `Bukan Blackspot (Kawasan Pantauan Biasa)`)
6. **Sumber Rujukan** (select: `LAMPIRAN BLACKSPOT`, `LAMPIRAN HOTSPOT`, `JKR / MIROS`, `DALAMAN BSPT`)
7. **Status Aktif** (select: `Aktif` / `Tidak Aktif`)
8. **Latitud & Longitud** (optional numerical coordinates for Google Maps marker placement)

#### 2. Location & Blackspot Master Table (`Senarai Lokasi & Lampiran Blackspot`)
- Placed full-width directly below `Borang Daftar Lokasi & Lampiran Blackspot`.
- Displays all locations (seeded + Admin-added), paginated at **5 locations per page** with columns: Nama Laluan Penuh (`[KM] [NAMA LALUAN] ([MERCU TANDA])`, `↑` / `↓` clickable to toggle A–Z / Z–A sort order), Jenis Jalan, Klasifikasi (`BLACKSPOT` badge vs `PANTAUAN`), Sumber, Status (`AKTIF` / `TIDAK AKTIF`), and Tindakan (`Nyahaktif` / `Aktifkan`).
- **Quota-Preserving Native Firestore Pagination**: Uses `getCountFromServer` for total location count and `orderBy("name", sortOrder)` + `startAfter(cursor)` + `limit(5)` (`getDocs`) so Firestore reads are fired **only when the page or sort order changes**.
- **Interactive Row Edit Modal (`Kemaskini Lokasi & Lampiran Blackspot`)**: For authorized users (`Admin`), each row highlights on hover (`cursor: pointer`) and opens an edit modal on click to update the location details in Firestore (`updateDoc`).
- Uses soft-deactivation (`active: boolean`) rather than hard deletion so historical `siasatan` and `penguatkuasaan` records linked via `location_id` remain intact.

### 4.5 Authentication & Role-Based Access Control (RBAC)

#### 1. Guest / Public Perspective (`/smart-traffic`)
- Unauthenticated public visitors can only access the **Dashboard Utama** (`/smart-traffic`).
- The tab navigation renders **only** the `Dashboard Utama` tab. Siasatan, Penguatkuasaan, and Lokasi tabs are completely hidden from guests.
- **View-Only Mode**: Nothing is modifiable by a guest. The schematic map, priority list, and period selector can be viewed and explored, but no form inputs or administrative actions are accessible.

#### 2. Login Entry & Screen (`/smart-traffic/login`)
- **Login Button**: Positioned at the top bar right next to `● DATA SIMULASI — BUKAN IPRS SEBENAR`.
  - When unauthenticated: displays `🔑 Log Masuk` and navigates to `/smart-traffic/login`.
  - When authenticated: displays the logged-in user badge (`[Nama] · [Peranan]`) with a `[Log Keluar]` button that returns to the Guest perspective.
- **Login Screen (`/smart-traffic/login`)**:
  - Prompts for **Username (Nama Pengguna)** (e.g. `abdulaziz`) and **Kata Laluan (Password)**.
  - **Clean Header on Login Screen**: When on `/smart-traffic/login`, the tab navigation bar (`Dashboard Utama` tab button and `↓ Eksport CSV` button) is hidden so only the top bar and the login card are shown.
  - **Tiada Kredensial Kerajaan Sebenar**: Firebase Authentication tidak memerlukan alamat emel kerajaan yang sah. Di peringkat belakang tabir, sistem memetakan username ke domain dalaman maya (`<username>@smarttraffic.internal`) untuk `signInWithEmailAndPassword`, mengelakkan sebarang pendedahan atau penggunaan emel rasmi kerajaan sebenar.
  - **No public sign-up screen**: Akaun disediakan secara dalaman melalui `scripts/onboard-user.mjs`.
  - Selepas log masuk berjaya, profil dan peranan pegawai diambil daripada Firestore `users/{uid}`, mengemas kini `AuthContext`, dan mengubah hala ke `/smart-traffic` (Option A: Dashboard Utama).

#### 3. Authorization & Permissions Matrix
| Role | URL Routes | Viewable Tabs | Modifiable Tabs | Permissions & Restrictions |
|---|---|---|---|---|
| **Guest (Awam)** | `/smart-traffic` | `Dashboard Utama` only | *None* | Read-only spectator mode. Siasatan, Penguatkuasaan, and Lokasi tabs hidden. |
| **Siasatan** | `/smart-traffic`, `/smart-traffic/siasatan`, `/smart-traffic/penguatkuasaan` | `Dashboard Utama`, `Siasatan`, `Penguatkuasaan` | `Dashboard` (view filters), `Siasatan` (input, submit & edit records), `locations` (create/update/delete via Siasatan modal) | Can create & edit investigation records; can create/update/delete `locations` in Firestore (via Siasatan location modal); can view `Penguatkuasaan` in read-only mode (`Mod Paparan Sahaja (Siasatan)`). Restricted from accessing the `/lokasi` admin tab. |
| **Penguatkuasaan** | `/smart-traffic`, `/smart-traffic/siasatan`, `/smart-traffic/penguatkuasaan` | `Dashboard Utama`, `Siasatan`, `Penguatkuasaan` | `Dashboard` (view filters), `Penguatkuasaan` (input, submit & edit ops) | Can create & edit enforcement operations; can view `Siasatan` in read-only mode (`Mod Paparan Sahaja (Penguatkuasaan)`). Restricted from viewing or modifying `Lokasi`. |
| **Admin** | All routes (`/`, `/siasatan`, `/penguatkuasaan`, `/lokasi`) | **All 4 tabs** (`Dashboard`, `Siasatan`, `Penguatkuasaan`, `Lokasi`) | **All 4 tabs** (`Dashboard`, `Siasatan`, `Penguatkuasaan`, `Lokasi`) | **Super Admin**: Full view, create, and edit access across `Siasatan`, `Penguatkuasaan`, and `Lokasi` (master locations, blackspots, and system accounts). |

#### 4. User Onboarding Guideline (`scripts/onboard-user.mjs`)

New officers are provisioned via the CLI utility `scripts/onboard-user.mjs` in Git Bash (there is no public sign-up screen).

##### A. Onboard a Single New Officer
Pass the officer's **Full Name (with rank)** and **Role** (`Siasatan`, `Penguatkuasaan`, or `Admin`):
```bash
node scripts/onboard-user.mjs --name "INSP FAIZAL BIN AHMAD" --role "Siasatan"

# Optional: specify a custom password instead of an auto-generated one:
node scripts/onboard-user.mjs --name "INSP FAIZAL BIN AHMAD" --role "Siasatan" --password "KataLaluan123!"
```

**What the script does automatically:**
1. **Unique Username**: Automatically strips PDRM ranks (`INSP`, `SJN`, `ASP`, `DSP`, `SUPT`, `KPL`, `SM`, etc.) and patronymics (`BIN`, `BINTI`, `A/L`, `A/K`), extracts a clean slug (e.g. `faizal`, `abdulaziz`), checks Firestore `users` for uniqueness, and formats the synthetic internal email as `<username>@smarttraffic.internal`.
2. **Easy-to-Remember Password**: Combines memorable Malay words with a numeric suffix (e.g. `AmanTrafik726!`, `CekapRondaan2026!`) unless `--password` is explicitly provided.
3. **Persistence**: Creates (or signs into) the account in **Firebase Authentication** and writes the user profile document to **Firestore** at `users/{uid}` with `{ uid, username, email: "<username>@smarttraffic.internal", name, role, active: true, created_at }`.
4. **Terminal Credential Card**: Prints a formatted box in the terminal displaying the officer's **Full Name**, **Role**, **Username**, **Synthetic Email**, **Password**, and **UID** to share with the officer.

##### B. Onboard All 3 Canonical Seed Officers at Once
```bash
npm run seed:users
# or:
node scripts/onboard-user.mjs --seed-all
```
Provisions all 3 canonical officers defined in `src/data/seedUsers.js` with their deterministic default passwords.

##### C. Target Environment: Local Emulator vs. Cloud Production
- **Local Emulator (default)**: Targets Firebase Auth Emulator (`127.0.0.1:9099`) and Firestore Emulator (`127.0.0.1:8090`).
- **Cloud Production (`--prod`)**: Append `--prod` (or set `VITE_APP_ENV=prod`) to provision the user directly into live Firebase Authentication & Cloud Firestore:
  ```bash
  node scripts/onboard-user.mjs --name "INSP FAIZAL BIN AHMAD" --role "Siasatan" --prod
  node scripts/onboard-user.mjs --seed-all --prod
  ```

#### 5. Canonical Seed Users (`src/data/seedUsers.js`)
| Full Name | Role | Username | Default Password | Synthetic Email | Access Scope |
|---|---|---|---|---|---|
| **INSP ABDUL AZIZ BIN ABDUL WAHAB** | `Siasatan` | `abdulaziz` | `AmanTrafik726!` | `abdulaziz@smarttraffic.internal` | Dashboard + Siasatan (Create/Edit) + Penguatkuasaan (View-only) |
| **SJN CORNELIUS A/K BIDAK** | `Penguatkuasaan` | `cornelius` | `CekapRondaan2026!` | `cornelius@smarttraffic.internal` | Dashboard + Penguatkuasaan (Create/Edit) + Siasatan (View-only) |
| **ASP THANGARAJA A/L BALARAMAN** | `Admin` | `thangaraja` | `TegasBSPT2026!` | `thangaraja@smarttraffic.internal` | All 4 tabs (Super Admin: full create/edit on Siasatan, Penguatkuasaan & Lokasi) |

### 4.6 Shared UI

- **Top bar**: Logo ("AI" badge), eyebrow text (PDRM · BSPT · INOVASI IPD), title, subtitle, demo data banner (`● DATA SIMULASI — BUKAN IPRS SEBENAR`), and Login button (or logged-in user badge with Logout button)
- **Tab navigation**: Filtered dynamically by role (`Dashboard Utama` for Guest; `Dashboard Utama` + `Siasatan` + `Penguatkuasaan` for `Siasatan` and `Penguatkuasaan`; all 4 for `Admin`) + CSV export button
- **Period selector (Dashboard Utama Only)**: Mingguan (weekly) / Bulanan (monthly, default) / Suku Tahun (quarterly) — rendered **only** when `Dashboard Utama` is the active tab. When viewing Siasatan, Penguatkuasaan, or Lokasi tabs, the header period selector is omitted.
- **CSV Export**: Downloads simulated data as CSV
- **Footer**: Prototype disclaimer notice

### 4.7 Gemini AI Capabilities Across BSPT Operations

Integrating the Google Gemini API (Gemini 2.5 Flash via `@google/genai` or Firebase Vertex AI) upgrades SMART TRAFFIC AI from a passive monitoring dashboard into an active operational intelligence tool for PDRM command staff.

> [!IMPORTANT]
> **UAT Scope Demarcation**:
> - **Feature 1 (`[⚡ Jana Faktor & Cadangan AI]`)** is **CONFIRMED FOR UAT ROUND 1** and is implemented in Phase 3.
> - **Features 2 & 3** are **BONUS REQUIREMENTS** scheduled for implementation following the successful completion of the first round of UAT.

#### 1. On-Demand Hotspot `Faktor` & `Cadangan` Synthesis (`Risiko Lokasi Pilihan` in Dashboard Utama) — [CONFIRMED FOR UAT 1]
- **Feature**: Dedicated `[⚡ Jana Faktor & Cadangan AI]` button inside the `Risiko Lokasi Pilihan` card.
- **Workflow**:
  - The officer selects any active hotspot or blackspot (e.g. `KM31 JALAN IPOH-LUMUT (L/ISYARAT SIDEC)`) and clicks `[⚡ Jana Faktor & Cadangan AI]`.
  - The client bundles the hotspot's physical metadata, active period, and live `siasatan` + `penguatkuasaan` records and requests structured JSON `{ "faktor": "...", "cadangan": "..." }` from Gemini 2.5 Flash, with in-memory caching and deterministic data-driven fallback.

#### 2. Automated Operational Briefing & Deployment Order Generator (`Penguatkuasaan` tab) — [BONUS REQUIREMENT: POST-UAT 1]
- **Feature**: `[📄 Jana Arahan Penugasan Operasi]` button atop the Enforcement Operations table.
- **Value**: PDRM officers must regularly draft official operation orders (*Perintah Penugasan Operasi / Rondaan Omnipresence*).
- **Workflow**: Gemini takes the week's blackspot metrics and compiles a formatted, police-standard operational briefing note in Bahasa Melayu:
  - *Objektif Operasi* (reduce motorcycle fatal crashes in Seri Iskandar corridor)
  - *Kawasan Sasaran & Waktu Penugasan* (KM30–KM32, 1700–2100 hrs)
  - *Fokus Penguatkuasaan* (top recorded violation: speed & signal compliance)
  - *Tindakan Pegawai Medan* (deployment of patrol cars, static roadblocks, camera spots)
  - Includes a one-click **"Salin Teks (Copy)"** button for instant distribution via WhatsApp or PDRM internal memo.

#### 3. 9-Element IPRS Investigation Intelligence Summarizer (`Siasatan` tab) — [BONUS REQUIREMENT: POST-UAT 1]
- **Feature**: `[🔍 Analisis Korelasi 9 Elemen]` button on the 9 Elemen Aggregation card.
- **Value**: The 9-element IPRS table contains complex multi-dimensional data (age, time, vehicle type, road class, violation, animal). Officers often struggle to manually synthesize cross-tab correlations.
- **Workflow**: Gemini scans the aggregated matrix and synthesizes executive correlation insights for the District Police Chief (Ketua Polis Daerah / OCPD):
  - *Contoh Dapatan*: "82% daripada kemalangan maut melibatkan penunggang motosikal berumur 16–25 tahun antara jam 1800–2200 di laluan Persekutuan, dengan 65% berpunca daripada kelajuan."
  - Provides a concise 3-bullet executive intelligence takeaway (*Laporan Risikan Trafik Ringkas*).

#### 4. Natural Language Traffic Inquiry ("Tanya AI BSPT") — [BONUS REQUIREMENT: POST-UAT 1]
- Command drawer where station commanders or inspectors can query live data in natural Malay:
  - *"Berapa banyak kemalangan maut di laluan Bota bulan ini?"*
  - *"Adakah operasi di KM31 berjaya menurunkan kadar kemalangan?"*
  - Gemini reads the live snapshot and generates instant answers with exact figures and data citations.

---

## 5. Design Language

Extracted from prototype CSS — the visual identity for the React app:

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#091327` → `#101d36` (gradient) | Page background |
| `--surface` | `rgba(18, 34, 60, 0.87)` | Card backgrounds |
| `--border` | `#273855` | Card borders |
| `--text-primary` | `#e7edf8` | Main text |
| `--text-muted` | `#93a5c1` | Secondary text |
| `--accent-gold` | `#d8b765` → `#d7b45e` | Active states, buttons, logo |
| `--accent-gold-dark` | `#89712f` | Gradient endpoints |
| `--danger` | `#dc5d4d` | High-risk indicators |
| `--warning` | `#eba34b` | Medium-high risk |
| `--caution` | `#e8bb57` | Medium risk |
| Border radius | `16px` (cards), `10px` (buttons), `30px` (chips/pills) | |
| Font | Inter, Arial, sans-serif | |

Dark theme only. Responsive breakpoints at 980px and 550px.

---

## 6. Firestore Data Structure (New)

Replace samalahkita's stories/situations model entirely.

```
smarttraffic-db/
├── users/                        # User profiles & RBAC roles (doc ID = Auth UID)
│   └── {uid}/
│       ├── uid: string
│       ├── username: string      # e.g. "abdulaziz", "cornelius", "thangaraja"
│       ├── email: string         # Synthetic internal email, e.g. "abdulaziz@smarttraffic.internal"
│       ├── name: string          # Full officer name & rank, e.g. "INSP ABDUL AZIZ BIN ABDUL WAHAB"
│       ├── role: string          # "Siasatan" | "Penguatkuasaan" | "Admin"
│       ├── active: boolean       # true
│       └── created_at: timestamp
│
├── locations/                    # Hotspot & Blackspot locations (seeded on startup + managed via /lokasi)
│   └── {locationId}/             # Deterministic slug ID, e.g. "km31-jalan-ipoh-lumut"
│       ├── name: string          # Formatted full route name, e.g. "KM31 JALAN IPOH-LUMUT (L/ISYARAT SIDEC)"
│       ├── route: string         # e.g. "JALAN IPOH-LUMUT"
│       ├── km: string            # e.g. "KM31" (or "")
│       ├── landmark: string      # e.g. "L/ISYARAT SIDEC" (or "")
│       ├── road_type: string     # "Persekutuan" | "Negeri" | "Lebuh Raya" | "Lain-lain"
│       ├── is_blackspot: boolean # true = official Lampiran Blackspot (+35 base risk weight vs +15)
│       ├── source: string        # "LAMPIRAN BLACKSPOT" | "LAMPIRAN HOTSPOT 1..4" | "JKR / MIROS" | "DALAMAN BSPT"
│       ├── active: boolean       # true = selectable in Siasatan/Penguatkuasaan forms
│       ├── coordinates: { x, y } # schematic SVG map position
│       ├── geo: { lat, lng }     # real geographic coordinates for Google Maps (e.g. { lat: 4.3606, lng: 100.9701 })
│       └── created_at: timestamp
│
├── periods/                      # Aggregated stats by time period
│   └── {periodId}/               # e.g. "2026-11-monthly"
│       ├── type: string          # "weekly" | "monthly" | "quarterly"
│       ├── cases: number
│       ├── fatal: number
│       ├── deaths: number
│       ├── change: number        # % change
│       ├── trend: number[]       # array of subdivision counts
│       ├── motor: number         # motorcycle-involved count
│       ├── night: number         # nighttime count
│       └── date_range: { start, end }
│
├── siasatan/                     # Investigation records (from Siasatan tab)
│   └── {siasatanId}/
│       ├── no_saman: string      # 1. No. Saman
│       ├── kategori_saman: string # 2. "POL 170 A" | "POL 257" | "Belum Ditetapkan" (legacy)
│       ├── no_kenderaan: string  # 3. No. Kenderaan
│       ├── no_ic: number         # 4. No. IC (numerical)
│       ├── nama: string          # 5. Nama
│       ├── umur: number          # 6. Umur (numerical)
│       ├── alamat: string        # 7. Alamat
│       ├── tempat_kemalangan: string # Auto-derived from selected location.road_type ("Lebuh Raya" | "Persekutuan" | "Negeri" | "Lain-lain")
│       ├── location_id: string   # 8. Deterministic ref to locations/{locationId} (e.g. "km31-jalan-ipoh-lumut")
│       ├── location_name: string # Denormalized location name (e.g. "KM31 JALAN IPOH-LUMUT (L/ISYARAT SIDEC)")
│       ├── tarikh_kemalangan: string # 9. YYYY-MM-DD
│       ├── waktu_kejadian: string    # 10. HH:MM
│       ├── kategori_kenderaan: string # 11. "Motosikal" | "Kereta" | "MPV / SUV" | "Van" | "Bas" | "Lori / Kenderaan Berat" | "Basikal" | "Lain-lain"
│       ├── kesalahan: string     # 12. "Kelajuan" | "Tidak peka keadaan sekeliling" | "Gagal patuh isyarat" | "Keadaan jalan" | "Langgar binatang" | "Faktor kenderaan" | "Lain-lain"
│       ├── melibatkan_binatang: boolean # 13. true ("Ya") | false ("Tidak")
│       ├── jenis_binatang: string | null # "Kerbau" | "Lembu" | "Babi" | "Lain-lain" | null
│       ├── jenis_kemalangan: string # 14. "Maut" | "Cedera parah" | "Cedera ringan" | "Rosak sahaja"
│       ├── maut: boolean         # Derived: true when jenis_kemalangan == "Maut", false otherwise
│       ├── bilangan_maut: number # 0 when maut=false, >=1 when maut=true
│       └── created_at: timestamp
│
├── penguatkuasaan/               # Enforcement operation records (from Penguatkuasaan tab)
│   └── {opId}/
│       ├── tarikh: string        # 1. YYYY-MM-DD
│       ├── location_id: string   # 2. Ref to locations/{locationId} (e.g. "km31-jalan-ipoh-lumut")
│       ├── location_name: string # Denormalized location name
│       ├── kategori_kemalangan: string # 3. "Maut" | "Parah" | "Ringan" | "Rosak sahaja" | "Bukan kemalangan"
│       ├── jenis_operasi: string # 4. "Pematuhan" | "Perdagangan" | "Motosikal" | "Mabuk" | "Bersepadu"
│       ├── tangkapan: number     # 5. Number of arrests
│       ├── sita: number          # 6. Number of vehicle seizures
│       ├── jam_mula: string      # 7. HH:MM
│       ├── jam_akhir: string     # 8. HH:MM
│       ├── saman_list: Array<{ no_saman: string, kategori_saman: string }> # 9. Optional array of { no_saman, kategori_saman } ("POL 170 A" | "POL 257" | "Belum Ditetapkan" for legacy); [] if none
│       └── created_at: timestamp
│
└── factors/                      # Contributing factor data
    └── {factorId}/
        ├── name: string
        ├── percentage: number
        └── location_id: ref
```

### 6.1 Startup Data Dump (Locations & Initial Seed Strategy)

To ensure `users`, `locations`, `periods`, `siasatan`, and `penguatkuasaan` are populated automatically on app startup without duplicating data or relying on in-memory fallbacks:
1. **Seed Payloads (`src/data/seedUsers.js`, `seedLocations.js`, `seedPeriods.js`, `seedSiasatan.js`, `seedPenguatkuasaan.js`)**: Export deterministic objects with fixed document IDs matching official BSPT officers, Lampiran Blackspot, and Lampiran Hotspot routes (Perak zone):
   - `km31-jalan-ipoh-lumut`: `KM31 JALAN IPOH-LUMUT (L/ISYARAT SIDEC)` — `LAMPIRAN BLACKSPOT` (`is_blackspot: true`)
   - `km30-jalan-ipoh-lumut`: `KM30 JALAN IPOH-LUMUT (L/ISYARAT BDR UNIVERSITI)` — `LAMPIRAN HOTSPOT 1` (`is_blackspot: false`)
   - `km32-jalan-ipoh-lumut`: `KM32 JALAN IPOH-LUMUT (L/ISYARAT UITM)` — `LAMPIRAN HOTSPOT 2` (`is_blackspot: false`)
   - `km23-jalan-bruas-parit-ipoh`: `KM23 JALAN BRUAS-PARIT-IPOH (L/ISYARAT PEKAN PARIT)` — `LAMPIRAN HOTSPOT 3` (`is_blackspot: false`)
   - `km1-jalan-bota-kanan-teluk-intan`: `KM1 JALAN BOTA KANAN-TELUK INTAN (PEKAN BOTA)` — `LAMPIRAN HOTSPOT 4` (`is_blackspot: false`)
2. **Idempotent Startup Check & Count Verification (`src/services/bootstrapData.js`)**:
   - Invoked once on app mount after Firebase initializes.
   - Uses `getCountFromServer(collection(db, collectionName))` (following the pattern in `useSituationService.js`) across `users`, `locations`, `periods`, `siasatan`, and `penguatkuasaan`.
   - Whenever `count === 0` for a collection (or `beforeCount < expectedSeedCount` for `users`, ensuring all 3 canonical `seed-*` officers exist even if an active Auth session already wrote 1 user doc), runs a `writeBatch(db)` using `doc(db, collectionName, item.id)` + `batch.set(...)` and commits atomically into Firestore (emulator or cloud).
   - **Post-Seed Count Verification**: Re-queries `getCountFromServer` after seeding (`afterCount`), verifies `tallied: afterCount >= expectedSeedCount`, and logs a structured summary via `console.table(verificationReport)`.
   - **Firestore Security Rules Compatibility**: `firestore.rules` permits initial creation of canonical seed documents when they do not yet exist (`!exists(...)`), while subsequent updates and new records are strictly protected by RBAC roles.
3. **Admin Runtime Management (`/lokasi`)**: After initial seeding, `Admin` users can add new locations/blackspots or soft-toggle `active` status via the `Lokasi` tab without losing historical `siasatan` or `penguatkuasaan` links.
4. **Single Source of Truth (Firestore Only)**: Hooks (`useLocations`, `usePeriodData`, `useSiasatan`, `usePenguatkuasaan`) read and write directly against Firestore with no in-memory fallback arrays.

### 6.2 Single Point of Data Source Connection (`emulator` | `prod`)

All Firebase/Firestore/Auth connections are consolidated into **`src/fb_cloud_firestore.js`** as the single source of truth (deprecating separate imports from `fb_emulator_connect.js`):
1. **Environment Switch (`VITE_APP_ENV`)**:
   - Two environments only: `emulator` (local dev) and `prod` (Cloud Firestore production).
   - Controlled via Vite's `import.meta.env.DEV` (defaults to `emulator` on `npm run dev` and `prod` on `npm run build`), or explicitly overridden via `VITE_APP_ENV=emulator|prod`.
   - `src/fb_cloud_firestore.js` initializes `app`, `db`, and `auth`, and automatically calls `connectFirestoreEmulator(db, "127.0.0.1", 8090)` and `connectAuthEmulator(auth, "http://127.0.0.1:9099")` when in `emulator` mode.
2. **Observable Connection Metadata (`dataSourceInfo`)**:
   - Exports `dataSourceInfo = { env, projectId, isEmulator, host }`.
   - Logs `[Firebase] Connected to <ENV> (<projectId> @ <host>)` once on startup.
   - Rendered in `Layout.jsx` top bar as a status badge (`EMULATOR · 127.0.0.1:8090`) whenever `isEmulator === true`.

---

## 7. Route Structure

All routes are served under the application base path `/smart-traffic` (`basename="/smart-traffic"`), perfectly matching the GitHub Pages repository path `https://basyir64.github.io/smart-traffic/`:

```
URL Path                          Route View          Access & Permissions
----------------------------------------------------------------------------------------------------------
/smart-traffic                    App.jsx             Dashboard Utama (Guest: View-only; Siasatan, Penguatkuasaan, Admin)
/smart-traffic/login              Login.jsx           Login Screen (Firebase Auth Email + Password)
/smart-traffic/siasatan           Siasatan.jsx        Siasatan (Siasatan & Admin: View + Modify; Penguatkuasaan: View-only)
/smart-traffic/penguatkuasaan     Penguatkuasaan.jsx  Penguatkuasaan (Penguatkuasaan & Admin: View + Modify; Siasatan: View-only)
/smart-traffic/lokasi             Lokasi.jsx          Lokasi & Lampiran Blackspot (Admin: View + Modify)
```

Unauthenticated requests to `/smart-traffic/siasatan`, `/smart-traffic/penguatkuasaan`, or `/smart-traffic/lokasi` are intercepted by `ProtectedRoute` and redirected to `/smart-traffic/login`. Non-permitted authenticated roles are redirected back to `/smart-traffic`.

---

## 8. Component Architecture

```
scripts/
├── load-env.mjs                  # Shared .env.local loader & env-based Firebase config helper
├── onboard-user.mjs              # CLI script: creates Auth user + Firestore users/{uid} doc, outputs password
└── seed-firestore.mjs            # CLI script: seeds locations, siasatan, penguatkuasaan & period baselines

src/
├── index.jsx                     # Entry: router, AuthProvider, PeriodProvider
├── index.css                     # Tailwind base + design tokens
├── fb_cloud_firestore.js         # Firebase app, Auth, and Firestore init
├── fb_emulator_connect.js        # Emulator connection (Firestore: 8090, Auth: 9099)
├── i18n.js                       # i18n config (keep, reconfigure)
├── auth-context.jsx              # Auth state + Firestore user profile (name, role)
├── period-context.jsx            # Period state (weekly/monthly/quarterly)
├── unsaved-changes-context.jsx   # Global unsaved form/modal tracking & navigation blocker state
│
├── data/
│   ├── seedLocations.js          # Canonical hotspot & Lampiran Blackspot locations dump payload
│   ├── seedUsers.js              # Canonical seed users payload (3 official officers)
│   ├── seedSiasatan.js           # Canonical investigation records (14 records across Weekly, Monthly, Quarterly)
│   └── seedPenguatkuasaan.js     # Canonical enforcement operations (7 ops across Weekly, Monthly, Quarterly)
├── services/
│   └── bootstrapData.js          # Idempotent startup seeder (getCountFromServer + writeBatch)
├── utils/
│   └── saman.js                  # Shared Kategori Saman constants, CSV/input normalizers, UI validators & Dashboard saman deduplication aggregator
│
├── views/
│   ├── Login.jsx                 # Email/password login screen (no sign-up)
│   ├── App.jsx                   # Dashboard Utama
│   ├── Siasatan.jsx              # Siasatan (Borang Input, 9 Elemen Aggregation, Senarai Rekod, Faktor Penyumbang)
│   ├── Penguatkuasaan.jsx        # Penguatkuasaan (Borang Input & Senarai Rekod Operasi)
│   ├── Lokasi.jsx                # Lokasi & Lampiran Blackspot management (Admin)
│   └── Layout.jsx                # Shell: startup seeder trigger, top bar, role-aware nav tabs, footer
│
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.jsx    # Auth & role guard wrapper
│   ├── metrics/
│   │   └── MetricCard.jsx        # Single KPI card
│   ├── charts/
│   │   ├── TrendBarChart.jsx     # Weekly accident trend bars
│   │   └── FactorBars.jsx        # Contributing factors horizontal bars
│   ├── map/
│   │   ├── GoogleHotspotMap.jsx  # Interactive Google Map (via @vis.gl/react-google-maps)
│   │   ├── SchematicMap.jsx      # SVG fallback hotspot map (offline / no API key)
│   │   └── LocationPin.jsx       # Clickable map pin / AdvancedMarker
│   ├── locations/
│   │   ├── LocationRisk.jsx      # Risk score panel with on-demand AI Faktor & Cadangan + blackspot badge
│   │   ├── HotspotList.jsx       # Priority-sorted location list
│   │   ├── LokasiForm.jsx        # Reusable location & blackspot registration form (supports inline card & modal variants)
│   │   └── LokasiTable.jsx       # Locations master table with active/inactive toggle
│   ├── siasatan/
│   │   ├── SiasatanForm.jsx      # 14-field investigation input form + Kategori Saman + inline location modal & read-only location fields
│   │   ├── SiasatanAggregation.jsx # 9 Elemen Data Kemalangan live aggregation table
│   │   └── SiasatanTable.jsx     # Investigation records table & edit modal
│   ├── penguatkuasaan/
│   │   ├── PenguatkuasaanForm.jsx # 9-field enforcement operation input form (with batch Saman, Kategori Saman & CSV template/import)
│   │   ├── SamanBatchInput.jsx   # Reusable numbered batch saman + Kategori Saman input, template download & CSV import/validator
│   │   └── PenguatkuasaanTable.jsx # Enforcement operations table & edit modal
│   ├── nav/
│   │   ├── TabNav.jsx            # 4-tab navigation
│   │   └── PeriodSelector.jsx    # Weekly/Monthly/Quarterly dropdown
│   └── shared/
│       ├── Chip.jsx              # Label chip/badge
│       ├── DemoBanner.jsx        # "DATA SIMULASI" warning
│       ├── ExportButton.jsx      # CSV download
│       └── UnsavedChangesModal.jsx # Styled Bahasa Melayu navigation loss warning dialog
│
├── hooks/
│   ├── useLocations.js           # Firestore query & mutations (add/toggle active) for locations
│   ├── usePeriodData.js          # Firestore query for period stats
│   ├── useSiasatan.js            # Firestore query & mutation for siasatan records
│   ├── usePenguatkuasaan.js      # Firestore query & mutation for penguatkuasaan records
│   ├── useSelectedLocation.js    # Location selection state
│   └── useUnsavedChanges.js      # Form dirty-state hook & modal snapshot comparator
│
└── i18n/
    └── bm.json                   # Bahasa Melayu (UI 100% BM sahaja)
```

---

## 9. Development Phases

> [!IMPORTANT]
> **First Round of User Acceptance Testing (UAT 1) Scope**:
> Phases 1 through 5 constitute the full scope for the **First Round of UAT**.
> - **Gemini AI Feature #1 (`[⚡ Jana Faktor & Cadangan AI]` on `LocationRisk`)** is included directly in Phase 3 for UAT 1.
> - **Gemini AI Features #2 & #3** are designated as **Bonus Requirements** and will be implemented in a subsequent phase after UAT 1 concludes.

### Phase 1 — Cleanup & Foundation ✅ COMPLETED (2026-11-13)
1. Run cleanup tasks from Section 3
2. Set up new routing (`/`, `/siasatan`, `/penguatkuasaan`, `/lokasi`)
3. Implement `Layout.jsx` shell (top bar, tab nav, period selector)
4. Apply design tokens from Section 5 to Tailwind config / CSS

> [!NOTE]
> **Legacy hooks retained (owner decision):** All samalahkita hooks in `src/hooks/` have been restored on purpose — `useStoryService`, `useSituationService`, `useMediaService`, `useDetectPersonalInfo`, `useUserOptions`, `useTheme`, plus `useDateFormatter`, `useDetectScroll`, `useInView`. They serve as reference for debugging the **persistence** layer (Firestore read/write patterns). Do **not** delete or refactor them as part of cleanup; the "Remove legacy hooks" item in Section 3 is superseded. New hooks (`useLocations`, `usePeriodData`, `useSiasatan`, `usePenguatkuasaan`, etc.) should be added alongside them. Note that the legacy hooks target the old stories/situations schema and are not wired into any new views.

### Phase 2 — Authentication, RBAC & Single Connection ✅ COMPLETED (2026-11-14)
1. Enable Firebase Auth & Firestore connection consolidation in `src/fb_cloud_firestore.js` (`emulator` vs `prod` switching, Auth emulator port `9099`, Firestore port `8090`, export `dataSourceInfo`, and emulator badge in `Layout.jsx`)
2. Create `scripts/onboard-user.mjs` CLI script (`--name`, `--role`, `--seed-all`) that derives a unique username from the officer's full name, generates an easy-to-remember password (e.g. `AmanTrafik726!`), persists user records to Firebase Auth and Firestore `users/{uid}`, and prints credentials; seed the 3 official accounts (`INSP ABDUL AZIZ BIN ABDUL WAHAB`, `SJN CORNELIUS A/K BIDAK`, `ASP THANGARAJA A/L BALARAMAN`) via `src/data/seedUsers.js`
3. Build `auth-context.jsx`, `Login.jsx` (`/smarttraffic/login`, no sign-up screen, username + password login), and `ProtectedRoute.jsx` role guard
4. Wire role-based UI visibility into `Layout.jsx`:
   - Top bar: `[Log Masuk]` button right next to `● DATA SIMULASI — BUKAN IPRS SEBENAR` (or user profile badge + `[Log Keluar]` when signed in)
   - Guest / Public default: only the `Dashboard Utama` tab is rendered; view-only spectator mode
   - Role-aware tabs: Siasatan and Penguatkuasaan see Dashboard + Siasatan + Penguatkuasaan (with read-only mode on each other's tab); Admin sees and can modify all 4 tabs (Super Admin)
5. Update `firestore.rules` to enforce exact RBAC permissions:
   - `siasatan`: write allowed if `role == 'Siasatan'` or `role == 'Admin'`
   - `penguatkuasaan`: write allowed if `role == 'Penguatkuasaan'` or `role == 'Admin'`
   - `locations`: write allowed only if `role == 'Admin'` (with unauthenticated initial create allowed when collection is empty)
   - `users`: read for owner or admin; write only via onboard script/admin

### Phase 3 — Startup Data Dump, Lokasi Tab & Dashboard Utama ✅ COMPLETED (2026-11-14)
1. Create `src/data/seedLocations.js` (canonical Lampiran Blackspot & Lampiran Hotspot master route seeds without static analytical fields) and `src/services/bootstrapData.js` (`getCountFromServer` + `writeBatch` + post-seed count verification) to auto-dump seed collections (`users`, `locations`, `periods`, `siasatan`, `penguatkuasaan`) into Firestore on app startup when collections are empty
2. Implement `useLocations` hook to fetch locations directly from Firestore (no in-memory fallback) and mutate locations (add new location, edit location via modal, toggle `active`)
3. Build `LokasiForm` and `LokasiTable` in `/lokasi` (stacked vertically, accessible only to `Admin`, with native Firestore cursor pagination at `5` per page, `↑`/`↓` sort toggle on `Nama Laluan Penuh`, and row-click edit modal)
4. Build `MetricCard` component + metrics grid with date-window filtering (Mingguan, Bulanan, Suku Tahun) derived strictly from live `siasatan` + `penguatkuasaan` records
5. Build `TrendBarChart` derived dynamically from live `siasatan` + `penguatkuasaan` accident dates
6. Build `GoogleHotspotMap` with Google Maps JavaScript API using custom dark palette (`#091327`) and `geo: { lat, lng }` coordinates; integrate graceful fallback to `SchematicMap` (SVG) when offline or API key is absent/restricted
7. Build `LocationRisk` panel (`Risiko Lokasi Pilihan`) and paginated `HotspotList` (`5` riskiest per page):
   - Dynamically compute `Skor Risiko` (`0–100`, returning `0` when `cases === 0`, with interactive `i` formula & live breakdown tooltip) and `Waktu Risiko` (`peakTime`) from the location's live `siasatan` (`waktu_kejadian`, `maut`, `bilangan_maut`) and `penguatkuasaan` (`jam_mula`, `kategori_kemalangan`) records in the active period.
   - **On-Demand Button-Triggered `Faktor` & `Cadangan`**: Only generate `Faktor` and `Cadangan` when the user explicitly clicks `[⚡ Jana Faktor & Cadangan AI]` in `Risiko Lokasi Pilihan` (never automatically on mount or location switch) to conserve Gemini API quota, accompanied by an `ⓘ Bagaimana AI Menjana?` tooltip. Uses `gemini-2.5-flash` structured JSON output `{ faktor, cadangan }` fed with the location's metadata + live period `siasatan` & `penguatkuasaan` records, with in-memory caching, zero-record short-circuiting, and data-driven fallback synthesis.
8. Wire up location selection state across components and period filtering

### Phase 4 — Siasatan & Penguatkuasaan ✅ COMPLETED (2026-11-14)
1. Build `SiasatanForm` (14 fields with `Jenis Kemalangan`, conditional `Jenis Binatang` and `Bilangan Kematian` inputs, auto-filling `Tempat Kemalangan` from selected `locations.road_type`, and harmonized `Punca Kemalangan` options; writable by `Siasatan` and `Admin`)
2. Build `SiasatanAggregation` (9 Elemen Data Kemalangan live all-time aggregation table with quota-preserving collapsible on-demand elements 4–9 and harmonized Element 9 punca kemalangan)
3. Build `SiasatanTable` (native Firestore cursor pagination at `5` per page, clickable `Tarikh & Waktu ↓/↑` sort toggle, and interactive row-click edit modal for `Siasatan` & `Admin`) and `FactorBars` (`Faktor Penyumbang Direkodkan` at bottom of Siasatan, 100% dynamically calculating count & percentage breakdown from `siasatan.kesalahan` via `getCountFromServer`)
4. Connect Siasatan form & table to Firestore `siasatan` collection via `useSiasatan` hook
5. Build `PenguatkuasaanForm` and `PenguatkuasaanTable` (stacked vertically, native Firestore cursor pagination at `5` per page, clickable `Tarikh ↓/↑` sort toggle, and interactive row-click edit modal for `Penguatkuasaan` & `Admin`)
6. Connect Penguatkuasaan form & table to Firestore `penguatkuasaan` collection via `usePenguatkuasaan` hook (ensuring accident-related operations tally into Dashboard metrics and operations reduce hotspot risk scores)

### Phase 5 — Polish & Deploy (UAT Round 1 Release) ✅ COMPLETED (2026-11-14)
1. **CSV Export & Login Screen Nav Cleanup**:
   - Keep `↓ Eksport CSV` scoped to `Dashboard Utama` only (active period cases, fatal cases, deaths, top hotspot, and dynamic risk score aligned with Dashboard formula).
   - Hide the entire tab navigation bar (`Dashboard Utama` tab button, period controls, and `↓ Eksport CSV` button) in `Layout.jsx` when on `/smart-traffic/login`.
2. **Semakan teks & label Bahasa Melayu** (PDRM & BSPT standard)
3. **Responsive design** (980px, 550px breakpoints)
4. **Environment Secrets Consolidation & GitHub Actions Workflow (`.github/workflows/deploy.yml`)**:
   - Removed all hardcoded Firebase configuration fallback values from `src/fb_cloud_firestore.js`, `scripts/onboard-user.mjs`, and `scripts/seed-firestore.mjs` (via shared `scripts/load-env.mjs`) and consolidated them into `.env.local`.
   - Stripped passwords from `src/data/seedUsers.js` and moved seed passwords into `.env.local` (`SEED_PASSWORD_*`) so `seedUsers.js` stays tracked in Git without exposing credentials.
   - Configured `.github/workflows/deploy.yml` (Node 24) to pass `VITE_APP_ENV: prod`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GEMINI_API_KEY`, and all 7 `VITE_FIREBASE_*` secrets during the `Build` step.
5. **SPA Deep-Link Redirect & Prototype Exclusion**:
   - Updated `public/404.html` base path to `/smart-traffic` and added `SpaRedirectHandler` in `src/index.jsx` for GitHub Pages refresh support.
   - Excluded `SMART_TRAFFIC_AI_Dashboard_Prototype.html` from the Vite `dist/` production build while retaining it in the repository for reference.
6. **Deploy UAT Round 1 build to GitHub Pages** (`https://basyir64.github.io/smart-traffic/`)

---

### Post-UAT Enhancements (Bonus Requirements)

To be prioritized and implemented after the conclusion of the First Round of UAT:

1. **Gemini Patrol Briefing & Order Generator (`[📄 Jana Arahan Penugasan Operasi]`)**: Automated generation of police-standard operational orders in the `Penguatkuasaan` tab, complete with copy-to-clipboard functionality for WhatsApp/memo distribution.
2. **Gemini 9-Element IPRS Multi-Variable Intelligence Summarizer (`[🔍 Analisis Korelasi 9 Elemen]`)**: Executive cross-tab correlation analysis in the `Siasatan` tab providing 3-bullet intelligence summaries for the OCPD.
3. **Natural Language Traffic Inquiry ("Tanya AI BSPT")**: Interactive command drawer for station commanders to ask real-time questions in natural Malay against the live incident database.
4. **Hotspot, Map & LocationRisk Saman Context (`Dashboard Utama`)**: Per-location deduplicated saman count and `POL 170 A` / `POL 257` breakdown badges in `Hotspot Keutamaan`, Google Maps `InfoWindow`, and `Risiko Lokasi Pilihan` (plus feeding summons enforcement volume into `synthesizeFromRecords` and Gemini AI prompts while preserving the mathematical `Skor Risiko` formula).

---

### UAT Round 2 — Development Phases

> [!IMPORTANT]
> **Second Round of User Acceptance Testing (UAT 2) Scope**:
> Tracks new and changing operational requirements discovered during UAT 1.
> Each phase below is specified for direct consumption by implementing agents. **Do not begin implementation until reviewed and approved by the project owner.**

#### UAT 2 · Phase 1 — Inline Location Registration in Siasatan & Batch Saman Input in Penguatkuasaan ✅ COMPLETED (2026-11-15)

##### 1. Reusable `LokasiForm` Component & Siasatan Inline Location Creation + Dynamic Read-Only Location Fields
1. **Abstract & Reuse `LokasiForm` (`src/components/locations/LokasiForm.jsx`)**:
   - Refactor `LokasiForm` so the exact same form fields, validation, reset behavior, and styling (`var(--color-surface)`, `var(--color-nav-bg)`, `var(--color-border-light)`, `var(--color-accent)`) are reusable across both:
     - **`Lokasi` tab (`src/views/Lokasi.jsx`)**: Inline card layout (`variant="card"`, preserving existing `Borang Daftar Lokasi & Lampiran Blackspot` header and `Akses Admin` chip).
     - **`Siasatan` tab (`src/components/siasatan/SiasatanForm.jsx`)**: Modal layout (`variant="modal"`, triggered from field `7. Lokasi Hotspot / Jalan`) with `onSuccess(createdLocation)` and `onCancel()` callbacks.
   - Ensure form field IDs/radio `name` attributes do not collide if rendered in a modal (e.g., use `useId()` or an optional `idPrefix` prop).
2. **RBAC & `firestore.rules` Updates (`locations` Collection)**:
   - Update `firestore.rules` for `/locations/{locationId}` so both **`Siasatan`** and **`Admin`** roles have `create, update, delete` permissions:
     ```
     allow create: if !exists(/databases/$(database)/documents/locations/km31-jalan-ipoh-lumut)
       || hasRole('Siasatan')
       || hasRole('Admin');
     allow update, delete: if hasRole('Siasatan') || hasRole('Admin');
     ```
   - Keep `/smart-traffic/lokasi` route/tab navigation restricted to `Admin` (`canModifyLokasi` in `auth-context.jsx` continues gating the `Lokasi` tab), while allowing `canModifySiasatan` users (`Siasatan` & `Admin`) to open the `+ Tambah Lokasi` modal inside `SiasatanForm`.
   - **Slug Collision Guard in `useLocations.js` (`addLocation`)**: Currently `addLocation` derives `docId` from `${km}-${route}` and calls `setDoc(...)`, which could silently overwrite an existing location if a user enters the same `km` + `route` with a different `landmark`. Check `getDoc(doc(db, "locations", baseId))` before writing and append a short unique suffix (or include `landmark` in slug / surface a clear conflict message) so existing locations are never unintentionally overwritten.
   - Wire `addLocation` from `useLocations()` in `src/views/Siasatan.jsx` into `SiasatanForm`.
3. **Refactor `SiasatanForm.jsx` & `SiasatanTable.jsx` Edit Modal**:
   - **Remove Field 7 (`Tempat Kemalangan (Jenis Jalan)`)** from both `SiasatanForm.jsx` and `SiasatanTable.jsx`'s `Kemaskini Rekod Siasatan` edit modal.
   - **Renumber Fields Sequentially (`1`–`13`)** in both `SiasatanForm` and `SiasatanTable` Edit Modal to prevent numbering mismatch:
     - `1. No. Saman`
     - `2. No. Kenderaan`
     - `3. No. IC`
     - `4. Nama`
     - `5. Umur`
     - `6. Alamat`
     - `7. Lokasi Hotspot / Jalan` *(was 8)* — includes an inline **`+ Tambah Lokasi`** button alongside the `<select>` dropdown.
     - `8. Tarikh Kemalangan` *(was 9)*
     - `9. Waktu Kejadian (HH:MM)` *(was 10)*
     - `10. Kategori Kenderaan` *(was 11)*
     - `11. Kesalahan (Punca Kemalangan)` *(was 12)*
     - `12. Melibatkan Binatang` *(was 13)* (+ conditional `Jenis Binatang`)
     - `13. Jenis Kemalangan` *(was 14)* (+ conditional `Bilangan Kematian (Nyawa)`)
   - **Render Uneditable Dynamic Location Preview Fields**:
     - Immediately below/adjacent to `7. Lokasi Hotspot / Jalan`, render two **read-only / disabled** fields (`readOnly` / styled muted non-editable inputs matching the dark theme) that dynamically populate whenever `locationId` changes:
       - **`Nama Jalan`** — populated from `selectedLocation.route` *(field 1 `Nama Laluan` of the Lokasi form)*
       - **`Jenis Jalan`** — populated from `selectedLocation.road_type` *(field 4 `Jenis Jalan` of the Lokasi form)*
     - Keep these two preview fields unnumbered (or clearly labelled as auto-populated location attributes) so the main form numbering `1`–`13` remains clean and unambiguous even if Lokasi form field numbering changes in the future.
     - Mirror these same two uneditable preview fields in `SiasatanTable.jsx`'s `Kemaskini Rekod Siasatan` edit modal.
   - **Modal Post-Creation Selection**:
     - When `LokasiForm` inside the Siasatan modal succeeds (`onSuccess(created)`):
       - Close the modal.
       - If `created.active` is `true`, automatically select `created.id` in `7. Lokasi Hotspot / Jalan` (which updates the read-only `Nama Jalan` and `Jenis Jalan` fields).
       - If `created.active` is `false`, display a clear Bahasa Melayu status notice explaining that the location was saved as `Tidak Aktif` and therefore does not appear in the active dropdown.
   - **Firestore Persistence Compatibility**:
     - Continue auto-deriving and saving `tempat_kemalangan: selectedLoc?.road_type || "Persekutuan"` on `siasatan` documents during `addSiasatan` and `updateSiasatan` so `SiasatanAggregation.jsx` (Element `4. Jenis jalan`), `SiasatanTable.jsx` (`Tempat` column), and `LocationRisk.jsx` continue operating with zero schema regression.

##### 2. Penguatkuasaan Field Numbering Fix & Field `9. Saman` (Numbered Batch Input + CSV Import)
1. **Fix Missing Numbering & Shift Fields (`1`–`9`) in `PenguatkuasaanForm.jsx` & `PenguatkuasaanTable.jsx` Edit Modal**:
   - Fix the existing bug where `Lokasi Hotspot / Jalan` had no number; renumber all fields sequentially:
     - `1. Tarikh`
     - `2. Lokasi Hotspot / Jalan` *(previously unnumbered)*
     - `3. Kategori Kemalangan` *(was 2)*
     - `4. Jenis Operasi` *(was 3)*
     - `5. Tangkapan` *(was 4)*
     - `6. Sita` *(was 5)*
     - `7. Jam Mula (HH:MM)` *(was 6)*
     - `8. Jam Akhir (HH:MM)` *(was 7)*
     - `9. Saman` *(new field)*
2. **Build Reusable `SamanBatchInput` Component (`src/components/penguatkuasaan/SamanBatchInput.jsx`)**:
   - Used by both `PenguatkuasaanForm.jsx` and `PenguatkuasaanTable.jsx`'s `Kemaskini Rekod Penguatkuasaan` edit modal (spanning full grid width `col-span-full` for clean row alignment).
   - **Numbered Dynamic Input Rows**:
     - Starts with row `1` (e.g., `1.` badge + text input matching `SiasatanForm` field `1. No. Saman` styling and placeholder `Contoh: SMN-2026-00142`).
     - **`+ Tambah Saman`** button appends a new row numbered `n + 1`.
     - Per-row **remove button (`✕`)** deletes a row and automatically renumbers remaining rows `1..N` (if the last row is removed, either resets to 1 empty row `1` or allows `0` rows).
   - **CSV Import (`no, nombor_saman`)**:
     - Include an **`Import CSV`** button (hidden `<input type="file" accept=".csv,text/csv" />`) plus a concise format hint (`Format CSV: no, nombor_saman`).
     - Parse CSV cleanly (handle CRLF/LF, optional surrounding quotes, BOM, header whitespace/casing):
       - Validate header contains `no` and `nombor_saman` (report clear Bahasa Melayu error if missing/invalid).
       - Trim each `nombor_saman`, skip rows with empty `nombor_saman`, and sort/normalize sequence numbers to `1..N`.
       - Detect and warn/deduplicate or reject duplicate `nombor_saman` entries cleanly.
     - **Existing Non-Empty Rows Prompt (Replace vs Append)**:
       - If the form currently contains only blank row(s), populate immediately from the parsed CSV.
       - If at least one non-empty `nombor_saman` row already exists in the form, prompt the user with a clear modal/inline confirmation choice before applying:
         - **`Ganti Senarai Sedia Ada` (Replace)** — replaces current rows with imported CSV rows (`1..N`).
         - **`Tambah ke Senarai` (Append)** — appends imported CSV rows after existing non-empty rows and renumbers `1..N`.
         - **`Batal` (Cancel)** — aborts import without modifying current rows.
     - Reset the `<input type="file">` value after each import attempt so the same file can be re-selected if needed.
3. **Firestore Schema, Persistence Hook & Table Display**:
   - **Optional Validation (`0` or more saman)**: On submit/save, trim all entries and filter out empty rows (`samanList = rows.map(r => r.trim()).filter(Boolean)`). Empty saman lists (`[]`) are valid.
   - **Firestore Data Model (`penguatkuasaan/{opId}`)**:
     - Store `saman_list: string[]` (array of non-empty saman strings; `[]` when none).
   - **Hook & Seed Updates**:
     - Update `normalizeOperation` in `src/hooks/usePenguatkuasaan.js` to normalize `saman_list: Array.isArray(raw.saman_list) ? raw.saman_list.map(s => String(s || "").trim()).filter(Boolean) : []`.
     - Update `src/data/seedPenguatkuasaan.js` with optional `saman_list` arrays on seed records (defaulting safely to `[]` if omitted).
   - **Table & Edit Modal Updates (`PenguatkuasaanTable.jsx`)**:
     - Add a `Saman` column in `Senarai Rekod Penguatkuasaan` displaying the count/summary (e.g., `0` or `[count] saman` with hover/inline preview of saman numbers).
     - Load and edit `saman_list` inside `Kemaskini Rekod Penguatkuasaan` modal using `SamanBatchInput`, persisting updates via `updatePenguatkuasaan`.

##### 3. Verification Checklist (for Implementing Agent)
- Confirm `npm run build` succeeds with zero errors/warnings.
- Verify `firestore.rules` allows `Siasatan` and `Admin` to `create`, `update`, and `delete` `/locations/{locationId}` while `Penguatkuasaan` and unauthenticated users remain denied.
- Verify `SiasatanForm` and `SiasatanTable` Edit Modal:
  - Field numbering is strictly `1`–`13` with no `Tempat Kemalangan` dropdown.
  - Selecting or creating a location updates uneditable `Nama Jalan` (`route`) and `Jenis Jalan` (`road_type`) immediately, and `tempat_kemalangan` persists accurately to Firestore (`9 Elemen Data Kemalangan` Element 4 tallies correctly).
- Verify `PenguatkuasaanForm` and `PenguatkuasaanTable`:
  - Field numbering is strictly `1`–`9` (including `2. Lokasi Hotspot / Jalan` and `9. Saman`).
  - Batch `+ Tambah Saman`, row removal, CSV import (`no, nombor_saman`) with Replace/Append confirmation on non-empty rows, optional empty submission, and table/edit modal persistence all work end-to-end.

#### UAT 2 · Phase 2 — Navigation Safety, `Kategori Saman` & Dashboard Saman Analytics ✅ COMPLETED (2026-11-15)

##### 1. Unsaved Form Data Loss Warning on Tab Switch & Navigation ✅ COMPLETED
1. **Data Router Migration (`src/index.jsx`)**:
   - Upgrade React Router setup from declarative `<BrowserRouter basename="/smart-traffic">` to `createBrowserRouter(..., { basename: "/smart-traffic" })` + `<RouterProvider>` so native SPA navigation blocking (`useBlocker`) works uniformly across `<NavLink>` tab clicks, `<Link>` navigation (`[Log Masuk]`), programmatic `navigate()`, and browser **Back / Forward** history navigation.
   - Retain `SpaRedirectHandler` inside the root layout route (`Layout.jsx`) so GitHub Pages `?redirect=...` deep linking works identically.
2. **Unsaved Changes Registry & Hook (`src/unsaved-changes-context.jsx`, `src/hooks/useUnsavedChanges.js`)**:
   - Provide `UnsavedChangesProvider` wrapping the root layout route in `src/index.jsx`.
   - Track active dirty forms/modals by unique ID & Bahasa Melayu label (`setFormDirty(id, isDirty, label)`), clearing automatically on unmount, on `Kosongkan Borang`, or after successful Save/Submit.
   - Provide `useRegisterUnsavedForm(id, isDirty, label)` for forms/modals and shared `isFormStateDirty(initialState, currentState)` comparison helper for modal edit forms.
   - Expose `clearAllDirtyAndBypass()` / `resetBypass()` so confirmed `[Log Keluar]` actions can sign out and redirect to `/` cleanly without being double-blocked by `ProtectedRoute`.
3. **All Tracked Forms & Modals**:
   - Track **all 3 inline creation forms**:
     - `SiasatanForm` (`"siasatan-form"` — *Borang Input Data Siasatan*)
     - `PenguatkuasaanForm` (`"penguatkuasaan-form"` — *Borang Input Penguatkuasaan*)
     - `LokasiForm` (`"lokasi-form"` — *Borang Daftar Lokasi & Lampiran Blackspot*, when not disabled)
   - Track **all open & edited modals**:
     - `LokasiForm` modal inside `SiasatanForm` (`"siasatan-lokasi-modal"` — *Borang Daftar Lokasi (Modal Siasatan)*)
     - `SiasatanTable` Edit Modal (`"siasatan-edit-modal"` — *Kemaskini Rekod Siasatan*)
     - `PenguatkuasaanTable` Edit Modal (`"penguatkuasaan-edit-modal"` — *Kemaskini Rekod Penguatkuasaan*)
     - `LokasiTable` Edit Modal (`"lokasi-edit-modal"` — *Kemaskini Lokasi*)
4. **Navigation Interception & Styled Bahasa Melayu Warning Modal (`src/views/Layout.jsx`, `src/components/shared/UnsavedChangesModal.jsx`)**:
   - Guard **tab switches, `[Log Masuk]` / `[Log Keluar]`, Browser Back/Forward (`useBlocker`)** (ignoring same-route clicks where `currentLocation.pathname === nextLocation.pathname`), plus **browser tab close / reload (`useBeforeUnload`)**.
   - On blocked navigation or `[Log Keluar]` with unsaved changes, present a styled dark-theme Bahasa Melayu confirmation modal (`UnsavedChangesModal`, rendered above other modals at `z-[70]`) listing affected form(s) and offering two clear actions:
     - **`Kekal di Halaman Ini`** *(stays on current page and preserves all form edits; also triggered by `Escape` or backdrop click)*.
     - **`Teruskan & Buang Perubahan`** *(discards unsaved edits and completes the pending tab switch / Back-Forward / `[Log Keluar]` action)*.

##### 2. `Kategori Saman`, CSV Import Template + Validation & Dashboard Saman Visualizations ✅ COMPLETED
1. **Shared Saman Utilities (`src/utils/saman.js`)**:
   - Canonical constants: `SAMAN_CATEGORIES = ["POL 170 A", "POL 257"]`, `UNSET_SAMAN_CATEGORY = "Belum Ditetapkan"`.
   - `normalizeSamanCategory(raw)`: normalizes case and spacing variants (e.g., `"pol 170a"`, `"POL170A"` -> `"POL 170 A"`; `"pol257"`, `"POL  257"` -> `"POL 257"`; returns `""` if unrecognised).
   - `coerceStoredSamanCategory(raw)`: returns canonical `"POL 170 A"` / `"POL 257"`, or `"Belum Ditetapkan"` when missing on historical Firestore records.
   - `normalizeSamanList(rawList)`: backward-compatibly coerces both legacy `string[]` entries and structured `{ no_saman, kategori_saman }` entries into canonical `{ no_saman, kategori_saman }[]`.
   - `validateSamanRows(rows, { allowUnsetForLegacy })`: validates numbered UI batch rows before submission (allows totally empty rows as optional `0` saman; rejects partial rows missing either `no_saman` or `kategori_saman`, rejects `"Belum Ditetapkan"` on newly typed saman, and catches case-insensitive duplicate `no_saman` entries across rows).
   - `aggregatePeriodSaman(records, operations)`: collects saman across both `siasatan` (`no_saman`, `kategori_saman`, `tarikh_kemalangan`) and `penguatkuasaan` (`saman_list`, `tarikh`), **deduplicating identical `no_saman` values** (case-insensitive) to compute `{ total, pol170a, pol257, unset, items }`.
2. **Siasatan Field `2. Kategori Saman` & Renumbering `1`–`14`**:
   - Add **`2. Kategori Saman`** immediately after `1. No. Saman` in both `SiasatanForm.jsx` and `SiasatanTable.jsx`'s Edit Modal, starting unselected (`""` / `"-- Pilih Kategori Saman --"`) with required selection of `"POL 170 A"` or `"POL 257"` (legacy records with `"Belum Ditetapkan"` preserve that label until explicitly changed).
   - Shift remaining field labels from `2`–`13` to **`3`–`14`** (`3. No. Kenderaan` through `14. Jenis Kemalangan`) across both `SiasatanForm.jsx` and `SiasatanTable.jsx`.
   - Include `Kategori Saman` dirty detection in `SiasatanForm.jsx` (`useRegisterUnsavedForm`) and reset it in `resetFields()`.
   - Update `normalizeSiasatan` (`src/hooks/useSiasatan.js`) and `seedSiasatan.js` (`kategori_saman` persisted on `siasatan` docs; legacy docs default to `"Belum Ditetapkan"`).
   - Display **`Kategori Saman`** badge column in `SiasatanTable.jsx` (`Senarai Rekod Siasatan`), keeping `SiasatanAggregation.jsx` unchanged at its 9 elements.
3. **Penguatkuasaan CSV Template Download & Per-Saman `Kategori Saman` Validation**:
   - Upgrade `SamanBatchInput.jsx` so every numbered row includes:
     - `No. Saman` text input (`placeholder="Contoh: SMN-2026-00142"`)
     - `Kategori Saman` `<select>` defaulting unselected (`"-- Pilih Kategori Saman --"` -> `POL 170 A` / `POL 257`, preserving `"Belum Ditetapkan"` option only for legacy rows already saved that way in Edit Modal)
     - Row removal button (`✕`) and per-row inline validation styling/hint when incomplete or duplicated.
   - Add **`↓ Muat Turun Templat CSV`** button downloading header-only `templat_saman_penguatkuasaan.csv` (`\ufeffno,nombor_saman,kategori_saman\r\n` — **no sample rows**).
   - Update CSV parser (`parseSamanCsv`):
     - Require `no`, `nombor_saman`, and `kategori_saman` headers (Bahasa Melayu error if missing).
     - Validate non-empty sequence `no` (positive number), require non-empty `nombor_saman` whenever `kategori_saman` is present, normalize & validate `kategori_saman` against `POL 170 A` / `POL 257`, and surface row-numbered Bahasa Melayu errors for invalid rows.
     - Keep `Ganti Senarai Sedia Ada` / `Tambah ke Senarai` / `Batal` confirmation when non-empty rows exist, plus case-insensitive duplicate `no_saman` deduplication.
   - Update `PenguatkuasaanForm.jsx` (including dirty tracking for `{ no_saman, kategori_saman }` rows & `validateSamanRows` guard on submit), `PenguatkuasaanTable.jsx` (`Saman` column summarizing count + `POL 170 A` / `POL 257` / `Belum Ditetapkan` breakdown + Edit Modal validation & recursive `isFormStateDirty` support for object arrays), `usePenguatkuasaan.js`, and `seedPenguatkuasaan.js`.
4. **Dashboard Saman Metrics, Comparison Trend Chart & CSV Export (`App.jsx`, `TrendBarChart.jsx`, `Layout.jsx`)**:
   - **Idea A (Top KPI Card)**: Expand KPI row (`App.jsx`) to a 5-column responsive grid (`grid-cols-5 max-[1100px]:grid-cols-3 max-[980px]:grid-cols-2`) with a 5th `MetricCard` for **`Jumlah Saman`** showing deduplicated active-period saman total and subtitle **`POL 170 A: X · POL 257: Y`** (plus `Belum Ditetapkan: Z` if non-zero).
   - **Idea B (`TrendBarChart.jsx`)**: Add view mode toggle (`Perbandingan` | `Kemalangan` | `Saman`) showing deduplicated saman counts bucketed across `Hari` / `Minggu` / `Bulan` alongside accidents, with stacked `POL 170 A` and `POL 257` (plus legacy `Belum Ditetapkan`) bars, interactive tooltips, and legend. Keep the existing `Skor Risiko` mathematical formula (`LocationRisk.jsx` / `App.jsx`) completely unchanged.
   - **Idea D (`Layout.jsx` `handleExportCsv`)**: Append `Jumlah saman (unik)`, `Saman POL 170 A`, `Saman POL 257` (and legacy `Saman Belum Ditetapkan` when > 0) rows to `SMART_TRAFFIC_AI_demo.csv`.
   - *(Idea C — HotspotList, GoogleHotspotMap & LocationRisk AI Saman Context — recorded separately under Post-UAT Bonus Requirements.)*

##### 3. Verification Checklist (for Implementing Agent)
- Confirm ESLint passes with zero errors/warnings on all created/modified files and `npm run build` succeeds.
- Verify Phase 2 Item 1 (Navigation Safety): editing forms/modals warns on tab switches, `[Log Keluar]`, Browser Back/Forward, and `beforeunload`, and clears on submit/`Kosongkan Borang` (including edited `Kategori Saman` & `SamanBatchInput` object arrays).
- Verify `SiasatanForm` & `SiasatanTable`: field numbering is `1`–`14` (`2. Kategori Saman` required, starting unselected), `Kategori Saman` column/badge renders cleanly, and legacy records without `kategori_saman` display `"Belum Ditetapkan"`.
- Verify `PenguatkuasaanForm` & `PenguatkuasaanTable`: `Muat Turun Templat CSV` downloads header-only CSV (`no,nombor_saman,kategori_saman`), CSV import normalizes/validates `POL 170 A` & `POL 257` with row-specific BM errors, UI blocks partial/duplicate saman rows, and legacy `string[]` `saman_list` records coerce safely to `"Belum Ditetapkan"`.
- Verify Dashboard (`App.jsx`, `TrendBarChart.jsx`, `Layout.jsx`): `Jumlah Saman` KPI card & trend comparison bars deduplicate `no_saman` across `Siasatan` + `Penguatkuasaan`, CSV export includes Saman rows, and the existing `Skor Risiko` formula remains untouched.

---

## 10. Key Constraints

- **Simulation data only** — all numbers are fake; the banner "DATA SIMULASI — BUKAN IPRS SEBENAR" must always be visible
- **Human-in-the-loop** — AI-generated operation plans require officer review/approval before any action
- **No PII** — no personal information of accident victims in analytics views
- **Offline-capable** — the prototype works offline; the React app should gracefully handle offline/emulator scenarios
- **BM Sahaja (Malay Only)** — Antara muka pengguna 100% dalam Bahasa Melayu. Tiada fungsi dwi-bahasa atau terjemahan Bahasa Inggeris
- **Tiada Kredensial Kerajaan Sebenar** — Sistem menggunakan username dalaman dan domain maya (@smarttraffic.internal) bagi mengelakkan sebarang pendedahan atau penggunaan emel rasmi kerajaan sebenar
