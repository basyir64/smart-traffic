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
| Emulator | Firebase Emulator Suite | Firestore on port `8090`, UI on port `4000` |
| Routing | React Router 7 | |
| i18n | i18next + react-i18next | BM (Malay) primary, EN secondary |
| Deployment | GitHub Actions → Firebase Hosting (or GitHub Pages) | Existing workflow in `.github/workflows/deploy.yml` |

---

## 3. Cleanup Tasks (from samalahkita)

Before building new features, the legacy samalahkita code must be cleaned up:

- [ ] **`vite.config.js`** — Change `base` from `"/samalahkita"` to `"/smarttraffic"` (or `"/"`)
- [ ] **`src/index.jsx`** — Change `BrowserRouter basename` from `'/samalahkita'` to match the new base
- [ ] **Remove legacy views** — `Stories.jsx`, `Disclaimer.jsx`, `PrivacyNotice.jsx`, `ScrollToTop.jsx`
- [ ] **Remove legacy components** — `stories/*`, `situations/*`, `marquee/*`, `face/*`, `chart/*`, `search-bar/*`
- [x] ~~**Remove legacy hooks**~~ — **Superseded:** hooks intentionally kept for persistence debugging (see Phase 1 note)
- [ ] **Remove legacy i18n JSON files** — everything under `src/i18n/components/` and `src/i18n/views/` (will be rebuilt for new views)
- [ ] **Remove legacy routes** — `/stories/situation/:situationid`, `/privacy-notice`, `/disclaimer`
- [ ] **Remove `RedirectHandler`** component from `index.jsx`
- [ ] **Clean `index.css`** — strip old samalahkita styles
- [ ] **Update `package.json`** — confirm `name` is `"smarttraffic"` ✓, remove `html-to-image` if unused
- [ ] **Remove `client_secret_*.json`** — should never be in the repo
- [ ] **Remove `project nimbus.drawio`** — belongs to old project
- [ ] **Update Firestore rules** — replace the temporary allow-all rule (expiring 2026-12-12) with proper role-based rules

---

## 4. Features & Screens

Derived from the prototype, the app has **3 main tabs/sections** plus shared UI:

### 4.1 Dashboard Utama (Main Dashboard) — `/`

The default landing page. Contains:

#### Metric Cards (top row, 4-column grid)
| Metric | Description |
|---|---|
| Jumlah Kemalangan | Total accident cases (all categories) |
| Kemalangan Maut | Fatal accident cases |
| Jumlah Kematian | Total fatalities (persons) |
| Perubahan Kes | % change vs. previous period |

#### Accident Trend Chart
- Bar chart showing accident counts by time period subdivisions
- Adapts labels based on period selector: Minggu (weekly → days), Bulan (monthly → weeks), Suku Tahun (quarterly → months)

#### Location Risk Panel
- Risk score display (0–100, circular badge)
- Selected location name, risk time window, case count
- Risk level badge (RISIKO TINGGI ≥ 75, RISIKO SEDERHANA otherwise)
- Contributing factor + AI recommendation text

#### Schematic Hotspot Map
- SVG-based schematic map (not a real geo map)
- Clickable location pins (color-coded by risk: red/orange/yellow)
- Legend for risk levels
- Clicking a pin selects that location across the dashboard

#### Hotspot Priority List
- Sorted by risk score (descending)
- Each item shows: name, case count, peak time window, risk score
- Clicking selects the location

### 4.2 Siasatan (Investigation Data Input & Aggregation) — `/siasatan`

Stacked vertically into three sections:
1. **Borang Input Data Siasatan** (top)
2. **9 Elemen Data Kemalangan** (middle — live aggregation derived from submitted records)
3. **Senarai Rekod Siasatan (Sesi Ini)** (bottom-most)

#### 1. Investigation Input Form (`Borang Input Data Siasatan`)
13 fields:
1. **No. Saman** (text)
2. **No. Kenderaan** (text)
3. **No. IC** (numerical)
4. **Nama** (text)
5. **Umur** (numerical, 0–120)
6. **Alamat** (text)
7. **Tempat Kemalangan** (select: `Lebuh Raya`, `Persekutuan`, `Negeri`, `Lain-lain`)
8. **Tarikh Kemalangan** (date)
9. **Waktu Kejadian** (time `HH:MM`)
10. **Kategori Kenderaan** (select: `Motosikal`, `Kereta`, `MPV / SUV`, `Van`, `Bas`, `Lori / Kenderaan Berat`, `Basikal`, `Lain-lain`)
11. **Kesalahan / Punca Kemalangan** (select: `Kecuaian`, `Terbabas`, `Langgar binatang`, `Faktor kenderaan`, `Lain-lain`)
12. **Melibatkan Binatang** (radio: `Tidak` / `Ya`)
    - When `Ya` is selected, reveals **Jenis Binatang** (select: `Kerbau`, `Lembu`, `Babi`, `Lain-lain`)
13. **Maut** (radio: `Tidak` / `Ya`)
    - When `Ya` is selected, reveals **Bilangan Kematian (Nyawa)** (numerical, min 1)
- Actions: **Simpan Rekod Siasatan** (submit) and **Kosongkan Borang** (reset)

#### 2. 9 Elemen Data Kemalangan (`#siasatanAggTable`)
Live aggregation table placed directly underneath the input form (font size `15px`, child elements prefixed with `-`):
- **1. Jumlah kemalangan**: `[count] kes`
- **2. Kemalangan maut**: `[count where maut=true] kes`
- **3. Jumlah kematian**: `[sum of bilangan_maut] nyawa`
- **4. Jenis jalan** (`Tempat Kemalangan`):
  - `- Lebuhraya` (`[count] kes`), `- Persekutuan` (`[count] kes`), `- Negeri` (`[count] kes`), `- Lain-lain` (`[count] kes`)
- **5. Waktu kejadian** (`Waktu Kejadian`):
  - `- 0000-0400`, `- 0401-0800`, `- 0801-1200`, `- 1201-1600`, `- 1601-2000`, `- 2001-2400` (`[count] kes` each)
- **6. Kemalangan melibatkan binatang** (`[total] kes`):
  - `- Kerbau`, `- Lembu`, `- Babi`, `- Lain-lain` (`[count] kes` each)
- **7. Kategori kenderaan** (`[total] kes`):
  - `- Motosikal`, `- Kereta`, `- MPV / SUV`, `- Van`, `- Bas`, `- Lori / Kenderaan Berat`, `- Basikal`, `- Lain-lain` (`[count] kes` each)
- **8. Kategori umur** (`Umur`):
  - `- 00-05`, `- 06-10`, `- 11-15`, `- 16-20`, `- 21-25`, `- 26-30`, `- 31-35`, `- 36-40`, `- 41-45`, `- 46-50`, `- 51-55`, `- 56-60`, `- 61-65`, `- 66-70`, `- 71-75`, `- >75` (`[count] kes` each)
- **9. Punca kemalangan** (`Kesalahan`):
  - `- Kecuaian`, `- Terbabas`, `- Langgar binatang`, `- Faktor kenderaan`, `- Lain-lain` (`[count] kes` each)

#### 3. Investigation Records Table (`Senarai Rekod Siasatan (Sesi Ini)`)
- Placed at the bottom-most position of the Siasatan tab
- Displays submitted records with columns: No. Saman, No. Kenderaan, Tempat, Tarikh & Waktu, Kenderaan, Kesalahan, Binatang, Maut
- Includes count badge and privacy notice reminding users not to enter real IC or personal data

### 4.3 9 Elemen IPRS (IPRS Analysis) — `/analysis`

#### Nine Elements Table
Displays the 9 IPRS accident data elements for the selected location:
1. Jumlah kemalangan (total accidents)
2. Kemalangan maut (fatal accidents)
3. Jumlah kematian (fatalities)
4. Lokasi/jenis jalan (location/road type)
5. Waktu kejadian (time of occurrence)
6. Kategori pengguna (road user category)
7. Kategori kenderaan (vehicle category)
8. Kategori umur (age category)
9. Punca kecuaian (cause of negligence — requires investigation)

#### Contributing Factors Chart
- Horizontal bar chart showing factors and percentages:
  - Kelajuan (speed)
  - Tidak peka keadaan sekeliling (lack of awareness)
  - Gagal patuh isyarat (signal non-compliance)
  - Keadaan jalan (road condition)
- Disclaimer notice: factors must come from verified investigation findings

### 4.4 Shared UI

- **Top bar**: Logo ("AI" badge), eyebrow text (PDRM · BSPT · INOVASI IPD), title, subtitle, demo data banner
- **Tab navigation**: 3 tabs (`Dashboard Utama`, `Siasatan`, `9 Elemen IPRS`) + period selector dropdown + CSV export button
- **Period selector**: Mingguan (weekly) / Bulanan (monthly, default) / Suku Tahun (quarterly)
- **CSV Export**: Downloads simulated data as CSV
- **Footer**: Prototype disclaimer notice

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
├── locations/                    # Hotspot locations
│   └── {locationId}/
│       ├── name: string          # e.g. "Jalan Utama A"
│       ├── risk_score: number    # 0–100
│       ├── share: number         # proportion of total cases (0–1)
│       ├── peak_time: string     # e.g. "18:00–22:00"
│       ├── issue: string         # contributing factor description
│       ├── recommendation: string
│       ├── coordinates: { x, y } # schematic map position
│       ├── risk_level: string    # "high" | "medium-high" | "medium"
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
│       ├── no_kenderaan: string  # 2. No. Kenderaan
│       ├── no_ic: number         # 3. No. IC (numerical)
│       ├── nama: string          # 4. Nama
│       ├── umur: number          # 5. Umur (numerical)
│       ├── alamat: string        # 6. Alamat
│       ├── tempat_kemalangan: string # 7. "Lebuh Raya" | "Persekutuan" | "Negeri" | "Lain-lain"
│       ├── tarikh_kemalangan: string # 8. YYYY-MM-DD
│       ├── waktu_kejadian: string    # 9. HH:MM
│       ├── kategori_kenderaan: string # 10. "Motosikal" | "Kereta" | "MPV / SUV" | "Van" | "Bas" | "Lori / Kenderaan Berat" | "Basikal" | "Lain-lain"
│       ├── kesalahan: string     # 11. "Kecuaian" | "Terbabas" | "Langgar binatang" | "Faktor kenderaan" | "Lain-lain"
│       ├── melibatkan_binatang: boolean # 12. true ("Ya") | false ("Tidak")
│       ├── jenis_binatang: string | null # "Kerbau" | "Lembu" | "Babi" | "Lain-lain" | null
│       ├── maut: boolean         # 13. true ("Ya") | false ("Tidak")
│       ├── bilangan_maut: number # 0 when maut=false, >=1 when maut=true
│       └── created_at: timestamp
│
└── factors/                      # Contributing factor data
    └── {factorId}/
        ├── name: string
        ├── percentage: number
        └── location_id: ref
```

---

## 7. Route Structure

```
/                     → Dashboard Utama (main overview)
/siasatan             → Siasatan (investigation data input & records)
/analysis             → 9 Elemen IPRS
```

---

## 8. Component Architecture

```
src/
├── index.jsx                     # Entry: router, providers
├── index.css                     # Tailwind base + design tokens
├── fb_cloud_firestore.js         # Firebase init (keep, already configured)
├── fb_emulator_connect.js        # Emulator connection (keep)
├── i18n.js                       # i18n config (keep, reconfigure)
│
├── views/
│   ├── App.jsx                   # Dashboard Utama
│   ├── Siasatan.jsx              # Siasatan (Borang Input & Senarai Rekod)
│   ├── Analysis.jsx              # 9 Elemen IPRS
│   └── Layout.jsx                # Shell: top bar, nav tabs, footer
│
├── components/
│   ├── metrics/
│   │   └── MetricCard.jsx        # Single KPI card
│   ├── charts/
│   │   ├── TrendBarChart.jsx     # Weekly accident trend bars
│   │   └── FactorBars.jsx        # Contributing factors horizontal bars
│   ├── map/
│   │   ├── SchematicMap.jsx      # SVG hotspot map
│   │   └── LocationPin.jsx       # Clickable map pin
│   ├── locations/
│   │   ├── LocationRisk.jsx      # Risk score panel with recommendation
│   │   └── HotspotList.jsx       # Priority-sorted location list
│   ├── siasatan/
│   │   ├── SiasatanForm.jsx      # 13-field investigation input form
│   │   ├── SiasatanAggregation.jsx # 9 Elemen Data Kemalangan live aggregation table
│   │   └── SiasatanTable.jsx     # Investigation records table (bottom)
│   ├── nav/
│   │   ├── TabNav.jsx            # 3-tab navigation
│   │   └── PeriodSelector.jsx    # Weekly/Monthly/Quarterly dropdown
│   └── shared/
│       ├── Chip.jsx              # Label chip/badge
│       ├── DemoBanner.jsx        # "DATA SIMULASI" warning
│       └── ExportButton.jsx      # CSV download
│
├── hooks/
│   ├── useLocations.js           # Firestore query for locations
│   ├── usePeriodData.js          # Firestore query for period stats
│   ├── useSiasatan.js            # Firestore query & mutation for siasatan records
│   └── useSelectedLocation.js    # Location selection state
│
└── i18n/
    ├── bm.json                   # Bahasa Melayu translations
    └── en.json                   # English translations
```

---

## 9. Development Phases

### Phase 1 — Cleanup & Foundation ✅ COMPLETED (2026-11-13)
1. Run cleanup tasks from Section 3
2. Set up new routing (`/`, `/siasatan`, `/analysis`)
3. Implement `Layout.jsx` shell (top bar, tab nav, period selector)
4. Apply design tokens from Section 5 to Tailwind config / CSS

> [!NOTE]
> **Legacy hooks retained (owner decision):** All samalahkita hooks in `src/hooks/` have been restored on purpose — `useStoryService`, `useSituationService`, `useMediaService`, `useDetectPersonalInfo`, `useUserOptions`, `useTheme`, plus `useDateFormatter`, `useDetectScroll`, `useInView`. They serve as reference for debugging the **persistence** layer (Firestore read/write patterns). Do **not** delete or refactor them as part of cleanup; the "Remove legacy hooks" item in Section 3 is superseded. New hooks (`useLocations`, `usePeriodData`, `useSiasatan`, etc.) should be added alongside them. Note that the legacy hooks target the old stories/situations schema and are not wired into any new views.

### Phase 2 — Dashboard Utama
1. Build `MetricCard` component + metrics grid
2. Build `TrendBarChart` with simulated data
3. Build `SchematicMap` with SVG and clickable pins
4. Build `LocationRisk` panel and `HotspotList`
5. Wire up location selection state across components

### Phase 3 — Siasatan & 9 Elemen IPRS
1. Build `SiasatanForm` (13 fields with conditional `Jenis Binatang` and `Bilangan Kematian` inputs), `SiasatanAggregation` (9 Elemen Data Kemalangan live aggregation table), and `SiasatanTable`
2. Build 9 Elemen IPRS table view
3. Build contributing factors horizontal bar chart

### Phase 4 — Firestore Data & Persistence
1. Seed Firestore with initial demonstration data
2. Connect Dashboard, Siasatan, and Analysis views to Firestore via hooks (`useLocations`, `usePeriodData`, `useSiasatan`)

### Phase 5 — Polish & Deploy
1. CSV export functionality
2. i18n (BM primary, EN secondary)
3. Responsive design (980px, 550px breakpoints)
4. Firestore security rules (role-based)
5. Update GitHub Actions deployment workflow
6. Remove prototype HTML file from production build

---

## 10. Key Constraints

- **Simulation data only** — all numbers are fake; the banner "DATA SIMULASI — BUKAN IPRS SEBENAR" must always be visible
- **Human-in-the-loop** — AI-generated operation plans require officer review/approval before any action
- **No PII** — no personal information of accident victims in analytics views
- **Offline-capable** — the prototype works offline; the React app should gracefully handle offline/emulator scenarios
- **BM-first** — primary language is Bahasa Melayu; all UI labels default to BM
