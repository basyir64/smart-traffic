# Pre-Existing ESLint Cleanup — Audit Findings & Regression Test Cases

> **Document Purpose**: Reference audit and regression test plan for clearing the **24 pre-existing ESLint problems (23 errors, 1 warning)** documented under *Section 9 · UAT Round 4 · Deferred Maintenance* in [`spec/SPEC.md`](file:///c:/Users/basyir/smarttraffic/spec/SPEC.md#L1162-L1168).
> **Scope Rule**: All UAT Round 4 created/modified files already pass targeted ESLint with **0 errors / 0 warnings**. This document tracks the **14 files** cleaned up outside UAT Round 4 so interactive regression checks can be run cleanly.
> **Cleanup Status (`2026-11-15`)**: Applied fixes across all 14 files (Category A legacy hooks cleaned surgically in place without deletion). Automated checks `TC-LINT-01`–`TC-LINT-03` and manual Suites 2–5 (`TC-LINT-04`–`TC-LINT-10`) are **`✅ VERIFIED`** (**0 ESLint errors, 0 warnings**; Vite build succeeded; `LocationRisk.jsx` updated for `AQ.` keys + `gemini-3.5-flash-lite` + 15s timeout). Suites 6–7 (`TC-LINT-11`–`TC-LINT-15`) remain pending later UAT verification.

---

## 1. ESLint Baseline Snapshot (`2026-11-15`)

Command executed:
```bash
npm run lint   # runs `eslint .` via eslint.config.js
```

| Category | Severity & Count | Affected Files | Runtime Risk | Regression Focus |
|---|---:|---|---|---|
| **A. Unused Legacy `samalahkita` Hooks** | 12 errors | 5 legacy hook files | **None** *(not imported by active UI)* | Retention check only ([SPEC.md §9 Note](file:///c:/Users/basyir/smarttraffic/spec/SPEC.md#L640)) |
| **B. Optional Catch Binding in Firebase Init** | 2 errors | 1 active config file | **Negligible** *(emulator HMR block only)* | Emulator startup + HMR save |
| **C. React Fast Refresh Co-Export Splits** | 4 errors | 4 active files | **Low** *(module/import reorganization only)* | Build + auth/period/map/risk smoke test |
| **D. Effect State Sync & Hook Dependencies** | 5 errors, 1 warning | 5 active files *(note: `LocationRisk.jsx` overlaps C & D)* | **Moderate–High** *(controls pagination, AI cache, map fallback, Firestore reads)* | Full interactive verification across `/` Dashboard & `/lokasi` |
| **Total Remaining** | **24 problems (23 errors, 1 warning)** | **14 unique files** | — | — |

---

## 2. Detailed Findings by File & Recommended Fix Strategy

### Category A — Legacy `samalahkita` Reference Hooks *(12 Errors · 5 Files)*

> [!NOTE]
> Per [`spec/SPEC.md`](file:///c:/Users/basyir/smarttraffic/spec/SPEC.md#L640), these legacy hooks are intentionally retained as Firestore persistence examples and **must NOT be deleted**. A repo search confirmed **zero active views or hooks import them**.
>
> **Two Cleanup Approaches**:
> 1. **Zero-Edit Reference Preservation (Lowest Risk)**: Ignore these 5 explicit legacy paths in [`eslint.config.js`](file:///c:/Users/basyir/smarttraffic/eslint.config.js) with a comment pointing to the legacy-hook retention note.
> 2. **Surgical Lint Cleanup**: Remove unused imports/variables in place while leaving the reference queries/transactions intact (note `useTheme.jsx` and `useSituationService.js` also contain pre-existing logic bugs below).

| File | Line | ESLint Rule | Finding Details | Surgical Fix Note |
|---|---:|---|---|---|
| [`useDetectScroll.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useDetectScroll.js#L5) | 5 | `no-unused-vars` | `'setIsAtDivEnd'` assigned a value (`useState(false)`), never used. | Remove unused setter/state tuple element or remove dead `isAtDivEnd` state if unused. |
| [`useMediaService.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useMediaService.js#L54) | 54 | `no-unused-vars` | `catch (err)` parameter `'err'` is never used. | Change `catch (err)` to `catch`. *(Also imports `../theme-context` which is inactive legacy scaffolding).* |
| [`useSituationService.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useSituationService.js#L1) | 1 | `no-unused-vars` | `'useState'` imported, never used. | Remove unused `useState` import. |
| [`useSituationService.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useSituationService.js#L54-L55) | 54–55 | `no-unsafe-finally` | Two `return` statements (`return ref.id` / `return false`) inside `finally { ... }` block of `save()`. | Return after `try/catch` or inside `try`/`catch` instead of returning inside `finally`. |
| [`useStoryService.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useStoryService.js#L1-L2) | 1–2 | `no-unused-vars` | `'useEffect'`, `'addDoc'`, `'orderBy'`, `'updateDoc'` imported, never used. | Remove the 4 unused imports. |
| [`useTheme.jsx`](file:///c:/Users/basyir/smarttraffic/src/hooks/useTheme.jsx#L2) | 2 | `no-unused-vars` | `'useEffect'`, `'useState'` imported, never used. | Remove unused React hook imports (or implement boolean state). |
| [`useTheme.jsx`](file:///c:/Users/basyir/smarttraffic/src/hooks/useTheme.jsx#L7) | 7 | `no-undef` | `return { isDark };` references undeclared identifier `isDark`. | Declare `const [isDark] = useState(true);` (since Smart Traffic uses dark theme) or clean stub safely. |

---

### Category B — Firebase Bootstrap Config *(2 Errors · 1 File)*

| File | Line | ESLint Rule | Finding Details | Minimal Safe Fix |
|---|---:|---|---|---|
| [`fb_cloud_firestore.js`](file:///c:/Users/basyir/smarttraffic/src/fb_cloud_firestore.js#L62) | 62 | `no-unused-vars` | `catch (_)` around `connectFirestoreEmulator(...)` inside `if (isEmulator)`. ESLint config only specifies `varsIgnorePattern: '^[A-Z_]'` (not `caughtErrorsIgnorePattern`). | Replace `catch (_)` with ES2019 optional catch binding `catch {`. |
| [`fb_cloud_firestore.js`](file:///c:/Users/basyir/smarttraffic/src/fb_cloud_firestore.js#L67) | 67 | `no-unused-vars` | `catch (_)` around `connectAuthEmulator(...)` inside `if (isEmulator)`. | Replace `catch (_)` with `catch {`. |

---

### Category C — Vite React Fast Refresh Co-Export Splits *(4 Errors · 4 Active Files)*

| File | Line | ESLint Rule | Exported Non-Component Symbol | Existing Callers to Update / Check | Minimal Safe Fix |
|---|---:|---|---|---|---|
| [`auth-context.jsx`](file:///c:/Users/basyir/smarttraffic/src/auth-context.jsx#L212) | 212 | `react-refresh/only-export-components` | `useAuth` exported alongside `<AuthProvider>` | **6 files**: [`index.jsx`](file:///c:/Users/basyir/smarttraffic/src/index.jsx), [`ProtectedRoute.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/auth/ProtectedRoute.jsx), [`Layout.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/Layout.jsx), [`Login.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/Login.jsx), [`Siasatan.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/Siasatan.jsx), [`Penguatkuasaan.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/Penguatkuasaan.jsx) *(check `Lokasi.jsx` if added)* | Move `AuthContext` + `useAuth()` into a non-component module (e.g. `src/hooks/useAuth.js` or `src/auth-store.js`) and update imports (keep `<AuthProvider>` alone in `auth-context.jsx` or split provider vs hook cleanly). |
| [`period-context.jsx`](file:///c:/Users/basyir/smarttraffic/src/period-context.jsx#L15) | 15 | `react-refresh/only-export-components` | `usePeriod` exported alongside `<PeriodProvider>` | **3 files**: [`index.jsx`](file:///c:/Users/basyir/smarttraffic/src/index.jsx), [`Layout.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/Layout.jsx), [`App.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/App.jsx) | Move `PeriodContext` + `usePeriod()` hook out of `<PeriodProvider>` file and update imports. |
| [`LocationRisk.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx#L23) | 23 | `react-refresh/only-export-components` | `synthesizeFromRecords` exported alongside `<LocationRisk>` | Only called internally inside [`LocationRisk.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx#L248). | Move `synthesizeFromRecords` (+ helper `countTopKey`) into [`src/utils/locations.js`](file:///c:/Users/basyir/smarttraffic/src/utils/locations.js) or a dedicated utility and import it into `LocationRisk.jsx`. |
| [`LocationPin.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/LocationPin.jsx#L1) | 1 | `react-refresh/only-export-components` | `getPinColor` exported alongside `<LocationPin>` | Called internally in [`LocationPin.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/LocationPin.jsx#L16) and imported in [`GoogleHotspotMap.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/GoogleHotspotMap.jsx#L3). | Move `getPinColor(risk)` to [`src/utils/locations.js`](file:///c:/Users/basyir/smarttraffic/src/utils/locations.js) (or shared map utility) and update both imports. |

---

### Category D — Effect State Sync & Hook Dependency Refactors *(5 Errors, 1 Warning · 5 Active Files)*

| File | Line | ESLint Rule | Current Behavior & Why Flagged | Recommended Refactor | Specific Behavioral Risks |
|---|---:|---|---|---|---|
| [`HotspotList.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/HotspotList.jsx#L23) | 23 | `react-hooks/set-state-in-effect` | `useEffect` calls `setCurrentPage(totalPages)` synchronously whenever `currentPage > totalPages`. | Derive `const effectivePage = Math.min(currentPage, totalPages);` during render; use `effectivePage` for `startIndex`, button highlight, and `±1` page navigation handlers, eliminating the `useEffect`. | If `±1` handlers read stale `currentPage` instead of `effectivePage`, clicking `← Sebelumnya` from a clamped page could jump wrong; use `effectivePage` everywhere. |
| [`useSelectedLocation.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useSelectedLocation.js#L23) | 23 | `react-hooks/set-state-in-effect` | `useEffect` resets `selectedLocationId` synchronously to `activeLocations[0].id` when selected location disappears or becomes inactive. | Notice `selectedLocation` (`useMemo`) **already** computes the active fallback cleanly (`activeLocations.find(...) \|\| activeLocations[0] \|\| locations[0] \|\| null`). Remove the `useEffect` and expose `resolvedSelectedLocationId = selectedLocation?.id \|\| ""` so all downstream UI stays synced via derived state. | Returning raw `selectedLocationId` instead of `resolvedSelectedLocationId` would leave map marker highlight (`isSelected`) out of sync with `Risiko Lokasi Pilihan` after a location is deactivated. |
| [`LocationRisk.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx#L264) | 264 | `react-hooks/set-state-in-effect` | `useEffect` calls `setInsight(...)` and `setLoadingGemini(false)` synchronously on `location` / `cacheKey` change. | Store `{ cacheKey, data }` in state (`insightState`) instead of plain `insight`, and compute displayed `activeInsight` during render from `insightState.cacheKey === cacheKey ? insightState.data : (insightCache.get(cacheKey) ?? null)`. Handle `loadingGemini` in async `handleGenerateInsight` with a `latestCacheKeyRef` guard against stale responses if user switches locations mid-request. | **High attention (Gemini Quota & UX)**: Must guarantee switching locations/periods **never** triggers Gemini automatically, clears non-cached location insight immediately, restores cached location insight on return, and discards stale async responses if user switches away while Gemini is loading. |
| [`GoogleHotspotMap.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/GoogleHotspotMap.jsx#L177) | 177 | `react-hooks/set-state-in-effect` | Inside `useEffect`, when `mapMode === "google"` and `!apiKey \|\| googleMapsAuthFailed`, calls `setMapsError(true)` and `setMapMode("schematic")` synchronously. | Guard in derived render state (`effectiveMapMode = !apiKey \|\| googleMapsAuthFailed \|\| mapsError ? "schematic" : mapMode`) and/or inside the toggle button handler, so the `useEffect` simply returns early (`if (mapMode !== "google" \|\| !apiKey \|\| googleMapsAuthFailed) return;`) without calling `setState` synchronously. | Must cleanly avoid rendering Google Maps container or firing script requests offline/without key/after `gm_authFailure`, while keeping `🗺️ Tukar ke Peta Google` / `📐 Tukar ke Peta Skematik` toggling functional when online with valid key. |
| [`useLocations.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useLocations.js#L165) | 165 | `react-hooks/set-state-in-effect` | `useEffect` (when `paginated === true`) calls `loadPage(1, true)`, which immediately runs `setLoadingPage(true)` synchronously. | Use `totalCountRef` (same pattern as [`usePenguatkuasaan.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/usePenguatkuasaan.js)) so `loadPage` has `[]` dependencies, invoke initial `loadPage(1, true)` via microtask (`Promise.resolve().then(...)` with `isMounted` guard, or manage loading inside async `loadPage` cleanly without synchronous `setLoadingPage` in `useEffect`), and include `loadPage` in `[paginated, loadPage]`. | **Touches all 4 tabs**: `Lokasi` (`paginated: true`) must not infinite-loop or double-fetch on mount; `App`, `Layout`, `Siasatan`, and `Penguatkuasaan` (`paginated: false`) must keep receiving live `onSnapshot` updates when locations are created/edited/deactivated. |
| [`useLocations.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useLocations.js#L196) | 196 | `react-hooks/exhaustive-deps` *(warning)* | `loadPage` omitted from `useEffect(..., [paginated])` dependencies because `loadPage` previously depended on `[totalCount]`. | Resolved simultaneously when `loadPage` switches from `totalCount` state to `totalCountRef` (making `loadPage` referentially stable `[]`) and adding `loadPage` to the `useEffect` dependency array. | Same as above (`useLocations.js`). |

---

## 3. Regression & Verification Test Cases (Pre-Merge Gate)

> **Instructions**: After applying the ESLint fixes, execute **every suite** applicable to the files modified. If Category A (unused legacy hooks) is resolved via ESLint ignore rather than code edits, Suite 1 (`TC-LINT-03`) confirms zero reference deletion while Suites 2–7 cover all active code changes.

### Suite 1 — Automated Tooling & Static Integrity ✅ VERIFIED (2026-11-15)

#### `TC-LINT-01`: Full-Repo ESLint Passes Zero Problems ✅ VERIFIED
- **Covers**: All 14 files (23 errors + 1 warning cleared).
- **Command**: `npm run lint` *(or `node ./node_modules/eslint/bin/eslint.js .`)*
- **Expected Result**: Exit code `0`, **0 errors, 0 warnings** across the entire repository.

#### `TC-LINT-02`: Production Bundle Compiles Cleanly ✅ VERIFIED
- **Covers**: Category C import splits (`auth-context`, `period-context`, `LocationPin`, `LocationRisk`) and all refactors.
- **Command**: `npm run build`
- **Expected Result**: Vite production build succeeds with exit code `0` and zero unresolved import/export errors.

#### `TC-LINT-03`: Legacy Hook Retention Check ✅ VERIFIED
- **Covers**: [`spec/SPEC.md` §9 Note](file:///c:/Users/basyir/smarttraffic/spec/SPEC.md#L640) (`useDetectScroll.js`, `useMediaService.js`, `useSituationService.js`, `useStoryService.js`, `useTheme.jsx`).
- **Steps**:
  1. Confirm all 5 files still exist in `src/hooks/`.
  2. If edited (rather than ESLint-ignored), diff them to verify their Firestore read/write/transaction examples remain structurally intact and unreferenced by active views.
- **Expected Result**: No legacy reference hook deleted; zero accidental runtime imports introduced.

---

### Suite 2 — Firebase Emulator & HMR Stability *(Category B)* ✅ VERIFIED (2026-11-15)

#### `TC-LINT-04`: Emulator Connection & Vite Hot Module Replacement (`fb_cloud_firestore.js`) ✅ VERIFIED
- **Covers**: [`fb_cloud_firestore.js`](file:///c:/Users/basyir/smarttraffic/src/fb_cloud_firestore.js#L62-L67).
- **Precondition**: Firebase Emulators running (`VITE_APP_ENV=emulator` or local emulator config).
- **Steps**:
  1. Start dev server (`npm run dev`) and open the app at `/smart-traffic/`.
  2. Verify `[Firebase] Connected to EMULATOR` logs cleanly with zero uncaught exceptions.
  3. Trigger HMR (make a minor whitespace save in a component or `App.jsx`) while keeping the tab open.
- **Expected Result**: Re-evaluation of HMR modules swallows duplicate `connectFirestoreEmulator`/`connectAuthEmulator` calls silently via `catch {` with zero crashes or uncaught errors.

---

### Suite 3 — Auth & Period Context Split Smoke Tests *(Category C)* ✅ VERIFIED (2026-11-15)

#### `TC-LINT-05`: AuthProvider / `useAuth` Routing, Login, Role Guards & Logout ✅ VERIFIED
- **Covers**: [`auth-context.jsx`](file:///c:/Users/basyir/smarttraffic/src/auth-context.jsx) split and all 6 callers.
- **Steps**:
  1. As unauthenticated `Guest`: verify only `Dashboard Utama` tab is visible; navigating directly to `/smart-traffic/siasatan`, `/smart-traffic/penguatkuasaan`, or `/smart-traffic/lokasi` redirects to `/smart-traffic/login`.
  2. Sign in as `Siasatan` (`abdulaziz`): verify `Siasatan` editable, `Penguatkuasaan` shows `🔒 Mod Paparan Sahaja (Siasatan)`, `/lokasi` redirects away; verify `+ Tambah Lokasi` modal works in `Siasatan`.
  3. Sign in as `Penguatkuasaan` (`cornelius`): verify `Penguatkuasaan` editable, `Siasatan` shows `🔒 Mod Paparan Sahaja (Penguatkuasaan)`.
  4. Sign in as `Admin` (`thangaraja` / `admin`): verify all 4 tabs (`Dashboard`, `Siasatan`, `Penguatkuasaan`, `Lokasi`) are accessible and editable.
  5. Test `[Log Keluar]` while a form is dirty (`UnsavedChangesModal` still intercepts and clears on confirm).
- **Expected Result**: Identical RBAC behavior and navigation guards across all roles; zero broken `useAuth()` runtime errors.

#### `TC-LINT-06`: PeriodProvider / `usePeriod` Dashboard Filtering & Independence ✅ VERIFIED
- **Covers**: [`period-context.jsx`](file:///c:/Users/basyir/smarttraffic/src/period-context.jsx) split (`index.jsx`, `Layout.jsx`, `App.jsx`).
- **Steps**:
  1. On `/` (`Dashboard Utama`), switch top period `<select>` between `Mingguan`, `Bulanan` (default), and `Suku Tahun`.
  2. Observe `📅 Tempoh Data:` header indicator, all 5 KPI cards, `TrendBarChart`, `Hotspot Keutamaan`, `Risiko Lokasi Pilihan`, and `↓ Eksport CSV`.
  3. Switch to `/siasatan` (`9 Elemen Data Kemalangan`) and `/penguatkuasaan` (`Senarai Rekod Penguatkuasaan`).
- **Expected Result**: Dashboard metrics and CSV update smoothly on period change; UAT 4 filters on `9 Elemen` and `Penguatkuasaan` still default independently to `Tiada (Semua Rekod)`.

---

### Suite 4 — `HotspotList` Pagination & `useSelectedLocation` Fallback *(Category D)* ✅ VERIFIED (2026-11-15)

#### `TC-LINT-07`: `HotspotList` Page Clamping When List Shrinks (`HotspotList.jsx`) ✅ VERIFIED
- **Covers**: [`HotspotList.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/HotspotList.jsx#L21-L25).
- **Precondition**: At least 6 active locations exist (`totalPages >= 2` at `HOTSPOT_PAGE_SIZE = 5`).
- **Steps**:
  1. On `/` (`Dashboard Utama`), click Page `2` (`Seterusnya →`) in `Hotspot Keutamaan`. Verify page `2` rows display cleanly (`Memaparkan 6–...`).
  2. Log in as `Admin`, open `/lokasi`, deactivate enough locations (`Nyahaktif`) so active count `<= 5` (`totalPages = 1`), then return to `/`.
  3. Re-activate locations so `totalPages = 2`, select Page `2`, then click `← Sebelumnya` and `Seterusnya →`.
- **Expected Result**:
  - When active count drops to `<= 5`, `Hotspot Keutamaan` cleanly displays Page `1` (no empty slice / out-of-range page bug, no React `setState` effect warning).
  - Pagination controls (`← Sebelumnya`, numbered page buttons, `Seterusnya →`) disable/enable accurately at page boundaries.

#### `TC-LINT-08`: `useSelectedLocation` Fallback When Active Location Deactivated (`useSelectedLocation.js`) ✅ VERIFIED
- **Covers**: [`useSelectedLocation.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useSelectedLocation.js#L17-L25).
- **Steps**:
  1. On `/`, click the **2nd or 3rd** location in `Hotspot Keutamaan` so it is selected (highlighted border, active map pin ring, `Risiko Lokasi Pilihan` title matches it).
  2. As `Admin`, go to `/lokasi` and click `Nyahaktif` on that selected location.
  3. Navigate back to `/`.
- **Expected Result**:
  - `Hotspot Keutamaan`, the map pin highlight (`isSelected` gold ring), and `Risiko Lokasi Pilihan` **all agree** on the fallback first active location immediately on render — no mismatched selection IDs or stale deactivated location displayed.

---

### Suite 5 — `LocationRisk` & On-Demand Gemini AI Gating *(Category C + D)* ✅ VERIFIED (2026-11-15)

#### `TC-LINT-09`: Zero Automatic Gemini Calls & Clean Reset on Switch (`LocationRisk.jsx`) ✅ VERIFIED
- **Covers**: [`locationInsight.js`](file:///c:/Users/basyir/smarttraffic/src/utils/locationInsight.js#L16) (`synthesizeFromRecords`), [`LocationRisk.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx#L162-L181).
- **Precondition**: Browser DevTools **Network** tab open (filter by `generativelanguage` or `gemini`), valid `VITE_GEMINI_API_KEY` present.
- **Steps**:
  1. Load `/` and switch across 3 different hotspot locations in `Hotspot Keutamaan`.
  2. Switch Dashboard `Tempoh` (`Bulanan` → `Mingguan` → `Suku Tahun`).
- **Expected Result**: **Zero** outgoing Gemini network requests fire automatically. Data-driven `synthesizeFromRecords` fallback summary updates cleanly for each location/period.

#### `TC-LINT-10`: On-Demand Gemini Generation, Cache Hit/Miss & In-Flight Stale Guard (`LocationRisk.jsx`) ✅ VERIFIED
- **Covers**: [`LocationRisk.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx#L62-L109), [`#L162-L231`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx#L162-L231).
- **Resolution Note (`2026-11-15`)**: During UAT of this case, [`LocationRisk.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/locations/LocationRisk.jsx) was updated to accept both `AIza` and `AQ.` Gemini key prefixes, switch from deprecated `gemini-2.5-flash` / overloaded `gemini-3.8-flash` to `gemini-3.5-flash-lite`, add a 15s `AbortController` timeout, and stop caching transient error fallbacks in `insightCache`.
- **Steps**:
  1. Select **Location A** (with ≥1 record in active period) and click **`⚡ Jana Faktor & Cadangan AI`**. Wait for Gemini response (`source: "gemini"` badge).
  2. Switch to **Location B**: verify Location A's Gemini insight disappears immediately (not shown under Location B's name!) and **no** Gemini request fires.
  3. Switch back to **Location A** (same period): verify Location A's previously generated Gemini insight restores immediately from `insightCache` with **0** new network requests.
  4. *(Optional in-flight check)* Throttle network to *Slow 3G*, click **`⚡ Jana Faktor & Cadangan AI`** on Location B, and immediately click Location C before the request finishes.
- **Expected Result**: Cached insights restore instantaneously on `cacheKey` hit; Location B's in-flight response does **not** overwrite Location C's panel after switching away, and `loadingGemini` spinner stops cleanly.

---

### Suite 6 — `GoogleHotspotMap` & `LocationPin` Marker/Fallback Tests *(Category C + D)*

#### `TC-LINT-11`: Google Maps Mode, Pin Colors & Toggle Button (`GoogleHotspotMap.jsx`, `LocationPin.jsx`)
- **Covers**: [`LocationPin.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/LocationPin.jsx#L1) (`getPinColor`), [`GoogleHotspotMap.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/GoogleHotspotMap.jsx#L174-L325).
- **Precondition**: Valid `VITE_GOOGLE_MAPS_API_KEY` configured and network online.
- **Steps**:
  1. Load `/`: verify Google Map renders with markers colored accurately by risk threshold (`>=75` `#dc5d4d`, `68–74` `#eba34b`, `<68` `#e8bb57`) and larger markers (`scale: 11`) for `⚫ BLACKSPOT` locations.
  2. Click a map marker: verify `InfoWindow` opens with risk score/cases/operations/peak time and `Risiko Lokasi Pilihan` updates to that location.
  3. Click `📐 Tukar ke Peta Skematik`: verify `<SchematicMap>` renders with matching pin colors and selected ring.
  4. Click `🗺️ Tukar ke Peta Google`: verify Google Map restores cleanly without blank container.
- **Expected Result**: All markers, colors (`getPinColor`), `InfoWindow`, and mode toggle work with zero console errors or re-render loops.

#### `TC-LINT-12`: Offline / Missing Key / Auth Failure Fallback (`GoogleHotspotMap.jsx`)
- **Covers**: [`GoogleHotspotMap.jsx`](file:///c:/Users/basyir/smarttraffic/src/components/map/GoogleHotspotMap.jsx#L159-L200).
- **Steps**:
  1. Test with missing/empty `VITE_GOOGLE_MAPS_API_KEY` (or DevTools Network set to *Offline* before load).
  2. Test when `window.gm_authFailure()` fires (simulated invalid API key).
- **Expected Result**: Component immediately renders `<SchematicMap>` (`⚠ Peta skematik vektor`), hides `🗺️ Tukar ke Peta Google` toggle when error/no-key, displays auth failure notice banner when `gm_authFailure` triggered, and triggers zero cascading React warnings.

---

### Suite 7 — `useLocations` Master Hook Pagination & Cross-Tab Live Sync *(Category D)*

#### `TC-LINT-13`: `/lokasi` Initial Load, Cursor Pagination & Sort Toggle (`useLocations.js`)
- **Covers**: [`useLocations.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useLocations.js#L59-L196), [`Lokasi.jsx`](file:///c:/Users/basyir/smarttraffic/src/views/Lokasi.jsx).
- **Precondition**: Signed in as `Admin`, DevTools Console/Network open.
- **Steps**:
  1. Navigate to `/lokasi`: observe network requests to Firestore (`RunQuery` / `RunAggregationQuery`).
  2. Click Page `2` (`Seterusnya →`), then Page `1` (`← Sebelumnya`).
  3. Click `Nama Laluan Penuh ↑` header sort toggle twice (`asc` → `desc` → `asc`).
- **Expected Result**:
  - Mount triggers **exactly 1** `loadPage(1, true)` sequence (zero infinite loops from `totalCount`/`loadPage` dependency updates!).
  - Page size remains `5` per page (`Memaparkan 1–5 daripada ... lokasi`), cursors paginate forward/back accurately, and sorting resets cleanly to Page `1`.

#### `TC-LINT-14`: `/lokasi` Create, Edit, `Nyahaktif` & Last-Active Guard (`useLocations.js`)
- **Covers**: [`useLocations.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useLocations.js#L203-L419).
- **Steps**:
  1. Submit a new location via `Borang Daftar Lokasi & Lampiran Blackspot`: verify `totalCount` increments and Page `1` refreshes accurately.
  2. Click a row to open `Kemaskini Lokasi`, modify `Nama Laluan` / `Lampiran`, save: verify table updates cleanly in place at current page.
  3. Toggle `Nyahaktif` / `Aktifkan` on a row; also verify attempting to deactivate the very last remaining active location surfaces error `"Sekurang-kurangnya satu lokasi mesti kekal aktif."`.
- **Expected Result**: All mutations update Firestore and refresh paginated UI without stale cursor mismatches.

#### `TC-LINT-15`: Cross-Tab Live `onSnapshot` Sync When `paginated: false` (`useLocations.js`)
- **Covers**: [`useLocations.js`](file:///c:/Users/basyir/smarttraffic/src/hooks/useLocations.js#L168-L195) (`onSnapshot` branch used by `App.jsx`, `Layout.jsx`, `Siasatan.jsx`, `Penguatkuasaan.jsx`).
- **Steps**:
  1. Log in as `Siasatan` or `Admin` and open `/siasatan`.
  2. Click `+ Tambah Lokasi` next to `5. Lokasi Hotspot / Jalan`, create an active location.
  3. Verify the newly created location immediately appears and is auto-selected in `5. Lokasi Hotspot / Jalan` (`SiasatanForm.jsx`).
  4. Switch to `/penguatkuasaan` and `/` (`Dashboard Utama`): confirm the new active location immediately appears in `2. Lokasi Hotspot / Jalan`, `Hotspot Keutamaan`, and the Map.
- **Expected Result**: `onSnapshot` listener stays subscribed cleanly across views and propagates location mutations live with zero manual reload needed.

---

### Suite 8 — Final Cleanup Sign-Off

#### `TC-LINT-16`: Post-Cleanup Verification Checklist
- [x] `npm run lint` (`eslint .`) outputs **0 errors, 0 warnings** (`exit 0`, verified `2026-11-15`).
- [x] `npm run build` (`vite build`) completes with `exit 0` (`146 modules transformed`, verified `2026-11-15`).
- [x] All legacy `samalahkita` hooks from `SPEC.md` §9 Note remain preserved.
- [x] `Suites 2–5` (`TC-LINT-04`–`TC-LINT-10`) verified in browser/emulator testing (`2026-11-15`).
- [ ] `Suites 6–7` (`TC-LINT-11`–`TC-LINT-15`) pass in browser/emulator testing *(remaining)*.
- [x] Update [`spec/SPEC.md`](file:///c:/Users/basyir/smarttraffic/spec/SPEC.md#L1162-L1168) Section 9 (`Deferred Maintenance`) to **`✅ COMPLETED`**.
