# Matriks Peranan & Kawalan Akses — SMART TRAFFIC AI

Dokumen ini menerangkan secara terperinci siapa yang boleh **melihat**, **mendaftar/mencipta**, **mengemas kini**, **menyahaktifkan**, dan **mengeksport** data merentas keseluruhan aplikasi **SMART TRAFFIC AI (PDRM · BSPT)**.

> **Nota Keselamatan & Status Akaun**
> - Aplikasi ini tidak mempunyai skrin pendaftaran awam. Akaun pegawai disediakan oleh pentadbir melalui skrip dalaman (`scripts/onboard-user.mjs`) menggunakan nama pengguna dengan domain maya `@smarttraffic.internal`.
> - Pegawai yang berdaftar mesti berstatus aktif (`active: true`) dalam koleksi `users` untuk dibenarkan menulis atau mengubah rekod pada peringkat pangkalan data Firestore.

---

## 1. Gambaran Keseluruhan Peranan Pengguna

| Peranan | Penerangan Ringkas | Contoh Akaun Benih (`seedUsers.js`) | Skop Utama |
|---|---|---|---|
| **Awam (`guest`)** | Pelawat yang tidak log masuk | *(Tiada — mod lalai pelawat)* | Paparan baca sahaja di **Dashboard Utama**. |
| **Siasatan (`Siasatan`)** | Pegawai Bahagian Siasatan | `abdulaziz` *(INSP ABDUL AZIZ BIN ABDUL WAHAB)* | Daftar & kemas kini rekod **Siasatan**, daftar lokasi baharu melalui modal Siasatan, tapis & cetak PDF **9 Elemen Data Kemalangan**, serta lihat & cetak PDF senarai **Penguatkuasaan** (baca sahaja). |
| **Penguatkuasaan (`Penguatkuasaan`)** | Pegawai Bahagian Penguatkuasaan / Operasi | `cornelius` *(SJN CORNELIUS A/K BIDAK)* | Daftar & kemas kini rekod **Penguatkuasaan** (termasuk kelompok saman, import CSV, lokasi `"Lain-lain"`, penapis tempoh & cetak PDF senarai operasi), serta lihat & cetak PDF **9 Elemen** / rekod **Siasatan** (baca sahaja). |
| **Admin (`Admin`)** | Pentadbir Sistem / Pegawai Pemerintah BSPT | `thangaraja` *(ASP THANGARAJA A/L BALARAMAN)*, `admin` *(Admin)* | Akses penuh ke semua 4 modul termasuk pengurusan induk **Lokasi & Lampiran Blackspot**. |

---

## 2. Matriks Akses Tab & Laluan URL

| Tab / Halaman | Laluan URL (di bawah `/smart-traffic`) | Awam (`guest`) | `Siasatan` | `Penguatkuasaan` | `Admin` | Kelakuan Jika Tiada Akses |
|---|---|:---:|:---:|:---:|:---:|---|
| **Dashboard Utama** | `/` | ✅ | ✅ | ✅ | ✅ | Terbuka kepada semua pengguna. |
| **Log Masuk Pegawai** | `/login` | ✅ | ✅ | ✅ | ✅ | Terbuka untuk log masuk atau tukar peranan ujian (mod Emulator). |
| **Siasatan** | `/siasatan` | ❌ | ✅ | ✅ *(Baca sahaja)* | ✅ | Tab disembunyikan bagi Awam; akses terus URL diarahkan ke `/login`. |
| **Penguatkuasaan** | `/penguatkuasaan` | ❌ | ✅ *(Baca sahaja)* | ✅ | ✅ | Tab disembunyikan bagi Awam; akses terus URL diarahkan ke `/login`. |
| **Lokasi** | `/lokasi` | ❌ | ❌ | ❌ | ✅ | Tab disembunyikan bagi bukan Admin; Awam diarahkan ke `/login`, manakala `Siasatan` & `Penguatkuasaan` diarahkan semula ke `/`. |

---

## 3. Matriks Keupayaan Terperinci Mengikut Modul (Antara Muka Web / UI)

**Petunjuk:**
- ✅ **Boleh** — Fungsi dipaparkan dan dibenarkan
- 👁️ **Lihat Sahaja** — Boleh lihat data, tetapi borang/tindakan suntingan dikunci atau disembunyikan
- ❌ **Tiada Akses** — Tidak dipaparkan dan disekat

### A. Dashboard Utama (`/`)

| Ciri / Tindakan | Awam (`guest`) | `Siasatan` | `Penguatkuasaan` | `Admin` | Catatan |
|---|:---:|:---:|:---:|:---:|---|
| Lihat Kad KPI (`Jumlah Kemalangan`, `Kemalangan Maut`, `Jumlah Kematian`, `Jumlah Saman`, `Perubahan Kes`) | ✅ | ✅ | ✅ | ✅ | `Jumlah Saman` memaparkan bilangan saman unik serta pecahan `POL 170 A` / `POL 257`. |
| Tukar Penapis Tempoh (`Mingguan`, `Bulanan`, `Suku Tahun`) | ✅ | ✅ | ✅ | ✅ | Menapis paparan papan pemuka sahaja; tidak mengubah pangkalan data. |
| Lihat & Tukar Mod Graf Trend (`Perbandingan`, `Kemalangan`, `Saman`) | ✅ | ✅ | ✅ | ✅ | Menukar paparan visual graf trend secara interaktif. |
| Lihat Peta Hotspot & Klik Pilih Lokasi (`Hotspot Keutamaan`) | ✅ | ✅ | ✅ | ✅ | Klik penanda peta atau senarai keutamaan memilih lokasi untuk panel risiko. |
| Lihat `Risiko Lokasi Pilihan` & Tooltip Formula Skor Risiko | ✅ | ✅ | ✅ | ✅ | Skor dikira secara dinamik daripada rekod aktif dalam tempoh terpilih. |
| Klik Butang **`⚡ Jana Faktor & Cadangan AI`** | ✅ | ✅ | ✅ | ✅ | Penjanaan Gemini AI atas permintaan (dengan cache memori & sandaran data langsung). |
| Klik **`↓ Eksport CSV`** (`SMART_TRAFFIC_AI_demo.csv`) | ✅ | ✅ | ✅ | ✅ | Muat turun ringkasan kes, kematian, saman unik (`POL 170 A` / `POL 257`), dan skor risiko tertinggi. |

### B. Modul Siasatan (`/siasatan`)

| Ciri / Tindakan | Awam (`guest`) | `Siasatan` | `Penguatkuasaan` | `Admin` | Catatan |
|---|:---:|:---:|:---:|:---:|---|
| Akses Halaman `Siasatan` | ❌ | ✅ | ✅ | ✅ | Awam disekat oleh `ProtectedRoute`. |
| Isi & Hantar **`Borang Input Data Siasatan`** (Medan `1`–`10`, termasuk `2. Kategori Saman`, `3. No. Report`, `4. Kenderaan & Pemandu / Pejalan Kaki Terlibat` & lokasi `"Lain-lain"`) | ❌ | ✅ | ❌ | ✅ | `Penguatkuasaan` melihat sepanduk `🔒 Mod Paparan Sahaja (Penguatkuasaan)`. |
| Klik **`+ Tambah Lokasi`** dalam Borang Siasatan (Daftar Lokasi Baharu) | ❌ | ✅ | ❌ | ✅ | Membuka modal pendaftaran lokasi; lokasi aktif baharu terus dipilih dalam medan `5` (`Lokasi Hotspot / Jalan`). |
| Lihat, Tapis Tempoh (`Tiada` / `Mingguan` / `Bulanan` / `Suku Tahun`) & Kembang/Tutup **`9 Elemen Data Kemalangan`** | ❌ | ✅ | 👁️ | ✅ | Menapis berdasarkan `6. Tarikh Kemalangan` (lalai `Tiada`). Elemen 4–9 memuatkan kiraan apabila dikembangkan (`7. Kategori kenderaan` dalam unit `kenderaan`); `Senarai Rekod Siasatan` & `Faktor Penyumbang Direkodkan` kekal sepanjang masa. |
| Cetak PDF **`9 Elemen Data Kemalangan`** (`🖨️ Cetak PDF`) | ❌ | ✅ | ✅ *(Baca sahaja)* | ✅ | Menjana cetakan A4 Potret berlatar putih dengan kesemua pecahan Elemen 4–9 dikembangkan (termasuk kategori `0 kes`/`0 kenderaan`) mengikut penapis tempoh aktif. Butang kekal aktif walaupun `0 kes`. |
| Lihat **`Senarai Rekod Siasatan`**, Tukar Susunan (`↓`/`↑`) & Paginasi | ❌ | ✅ | 👁️ | ✅ | Memaparkan lajur termasuk lencana `Kategori Saman`, `No. Report`, lencana `Lain-lain`, dan lencana `+N` pihak terlibat. |
| Kemas Kini Rekod Siasatan (Klik baris → Modal **`Kemaskini Rekod Siasatan`**) | ❌ | ✅ | ❌ | ✅ | Klik baris tidak membuka modal bagi `Penguatkuasaan`. |
| Cetak PDF Rekod Siasatan Tunggal (`🖨️ Cetak PDF` pada lajur `Tindakan` / modal suntingan) | ❌ | ✅ | ✅ *(Dari Jadual)* | ✅ | Menjana cetakan A4 berlatar putih (jadual HTML) bersama sepanduk `DATA SIMULASI — BUKAN IPRS SEBENAR`, butiran medan `1`–`10`, dan senarai penuh `pihak_terlibat`. |
| Lihat Carta **`Faktor Penyumbang Direkodkan`** | ❌ | ✅ | 👁️ | ✅ | Kiraan peratusan dinamik daripada punca kemalangan siasatan. |
| Padam Rekod Siasatan dalam UI | ❌ | ❌ | ❌ | ❌ | Tiada butang padam dalam antara muka pengguna untuk mana-mana peranan. |

### C. Modul Penguatkuasaan (`/penguatkuasaan`)

| Ciri / Tindakan | Awam (`guest`) | `Siasatan` | `Penguatkuasaan` | `Admin` | Catatan |
|---|:---:|:---:|:---:|:---:|---|
| Akses Halaman `Penguatkuasaan` | ❌ | ✅ | ✅ | ✅ | Awam disekat oleh `ProtectedRoute`. |
| Isi & Hantar **`Borang Input Penguatkuasaan`** (Medan `1`–`9`) | ❌ | ❌ | ✅ | ✅ | `Siasatan` melihat sepanduk `🔒 Mod Paparan Sahaja (Siasatan)`. |
| Guna Medan **`9. Saman`** (`+ Tambah Saman`, `↓ Muat Turun Templat CSV`, `↑ Import CSV`, Ganti/Tambah Senarai) | ❌ | ❌ | ✅ | ✅ | Mengesahkan `no`, `nombor_saman`, dan `kategori_saman` (`POL 170 A` / `POL 257`). |
| Lihat, Tapis Tempoh (`Tiada` / `Mingguan` / `Bulanan` / `Suku Tahun`), Pecahan Saman, Susunan (`↓`/`↑`) & Paginasi **`Senarai Rekod Penguatkuasaan`** | ❌ | 👁️ | ✅ | ✅ | Menapis berdasarkan `1. Tarikh` (lalai `Tiada`) dengan jumlah saman, pecahan kategori, lencana `Lain-lain`, dan paginasi 5 rekod/halaman. |
| Cetak PDF **`Senarai Rekod Penguatkuasaan`** (`🖨️ Cetak PDF`) | ❌ | ✅ *(Baca sahaja)* | ✅ | ✅ | Menjana cetakan A4 Landskap berbilang halaman bagi **kesemua** operasi dalam penapis tempoh aktif (senarai saman tidak dipendekkan serta baris `JUMLAH` saman mentah & unik). Butang dinyahdayakan apabila `0 operasi`. |
| Kemas Kini Operasi (Klik baris → Modal **`Kemaskini Rekod Penguatkuasaan`**) | ❌ | ❌ | ✅ | ✅ | Klik baris tidak membuka modal bagi `Siasatan`. |
| Padam Rekod Penguatkuasaan dalam UI | ❌ | ❌ | ❌ | ❌ | Tiada butang padam dalam antara muka pengguna untuk mana-mana peranan. |

### D. Modul Lokasi & Lampiran Blackspot (`/lokasi` & Data Lokasi)

| Ciri / Tindakan | Awam (`guest`) | `Siasatan` | `Penguatkuasaan` | `Admin` | Catatan |
|---|:---:|:---:|:---:|:---:|---|
| Akses Tab & Halaman **`Lokasi`** (`/lokasi`) | ❌ | ❌ | ❌ | ✅ | Khusus untuk `Admin` sahaja. |
| Lihat Dropdown Lokasi Aktif / Data Peta | 👁️ | 👁️ | 👁️ | ✅ | Semua lokasi aktif digunakan untuk paparan Dashboard & dropdown borang. |
| Daftar Lokasi Baharu melalui **`Borang Daftar Lokasi & Lampiran Blackspot`** (`/lokasi`) | ❌ | ❌ | ❌ | ✅ | `Admin` mendaftar dari tab `Lokasi`. *(Lihat bawah untuk pengecualian modal Siasatan)*. |
| Daftar Lokasi Baharu melalui Modal **`+ Tambah Lokasi`** dalam Tab `Siasatan` | ❌ | ✅ | ❌ | ✅ | Dibenarkan supaya pegawai Siasatan tidak tersekat apabila lokasi baharu belum didaftarkan. |
| Lihat **`Senarai Lokasi & Lampiran Blackspot`** (Termasuk lokasi `TIDAK AKTIF`) | ❌ | ❌ | ❌ | ✅ | Memerlukan akses halaman `/lokasi`. |
| Kemas Kini Lokasi Sedia Ada (Modal **`Kemaskini Lokasi`**) | ❌ | ❌ | ❌ | ✅ | Hanya tersedia pada jadual `/lokasi` untuk `Admin`. |
| Nyahaktif / Aktifkan Lokasi (Butang **`Nyahaktif`** / **`Aktifkan`**) | ❌ | ❌ | ❌ | ✅ | Menggunakan nyahaktif lembut (`active: true/false`) supaya rekod lama kekal utuh. |
| Padam Kekal Dokumen Lokasi dalam UI | ❌ | ❌ | ❌ | ❌ | Tiada butang padam dalam UI; nyahaktif lembut digunakan. |

### E. Pengurusan Sesi & Keselamatan Borang

| Ciri / Tindakan | Awam (`guest`) | `Siasatan` | `Penguatkuasaan` | `Admin` | Catatan |
|---|:---:|:---:|:---:|:---:|---|
| Log Masuk melalui Nama Pengguna & Kata Laluan (`/login`) | ✅ | ✅ | ✅ | ✅ | Boleh log masuk atau bertukar akaun. |
| Pintasan Ujian Peranan Pantas di `/login` *(Mod Emulator Sahaja)* | ✅ | ✅ | ✅ | ✅ | Disembunyikan secara automatik apabila disambung ke persekitaran `prod`. |
| Log Keluar (`[Log Keluar]`) | ❌ | ✅ | ✅ | ✅ | Mengembalikan pengguna kepada mod Awam (`guest`) di `/`. |
| Amaran Data Belum Disimpan (`UnsavedChangesModal`) semasa tukar tab / tutup / log keluar | — | ✅ | ✅ | ✅ | Aktif secara automatik apabila mana-mana borang atau modal mempunyai suntingan belum disimpan. |

---

## 4. Matriks Peraturan Keselamatan Pangkalan Data (`firestore.rules`)

Jadual ini menerangkan penguatkuasaan hak capaian pada **peringkat pelayan/pangkalan data Firestore** (`firestore.rules`). Sekiranya pengguna bukan pentadbir cuba membuat permintaan terus ke API tanpa melalui antara muka UI, Firestore akan menguatkuasakan peraturan berikut:

| Koleksi Firestore | Baca (`read`) | Cipta (`create`) | Kemas Kini (`update`) | Padam (`delete`) | Syarat & Nota Teknikal |
|---|---|---|---|---|---|
| **`locations`** | Semua pengguna (`true`) | `Siasatan`, `Admin`, atau bootstrap awal | `Siasatan`, `Admin` | `Siasatan`, `Admin` | Bootstrap awal dibenarkan jika `km31-jalan-ipoh-lumut` belum wujud. Walaupun `Siasatan` mempunyai hak `update`/`delete` dalam `firestore.rules`, antara muka web mengehadkan kemas kini dan `Nyahaktif` di `/lokasi` kepada `Admin` sahaja. |
| **`siasatan`** | Semua pengguna (`true`) | `Siasatan`, `Admin`, atau dokumen benih `smn-2026-*` | `Siasatan`, `Admin` | `Siasatan`, `Admin` | `Penguatkuasaan` dan `guest` disekat sepenuhnya daripada menulis atau memadam rekod siasatan. |
| **`penguatkuasaan`** | Semua pengguna (`true`) | `Penguatkuasaan`, `Admin`, atau dokumen benih `op-2026-*` | `Penguatkuasaan`, `Admin` | `Penguatkuasaan`, `Admin` | `Siasatan` dan `guest` disekat sepenuhnya daripada menulis atau memadam rekod penguatkuasaan. |
| **`users`** | Semua pengguna (`true`) | Pengguna sendiri (`uid == userId`), `seed-*`, atau `Admin` | Pengguna sendiri (`uid == userId`), `seed-*`, atau `Admin` | `Admin` sahaja | Digunakan untuk menyelesaikan profil & peranan (`hasRole`) pegawai yang telah log masuk dan aktif (`active == true`). |
| **`periods`** | Semua pengguna (`true`) | `Admin`, atau bootstrap awal jika dokumen tempoh belum wujud | `Admin` sahaja | `Admin` sahaja | Menyimpan data garis asas tempoh. |
| **`factors`** | Semua pengguna (`true`) | `Admin` sahaja | `Admin` sahaja | `Admin` sahaja | Diuruskan oleh pentadbir sahaja (`allow write: if hasRole('Admin')`). |

> **Perhatian:** Semua koleksi kini mempunyai `allow read: if true` supaya papan pemuka awam dan statistik agregat dapat berfungsi. Oleh itu, **jangan masukkan maklumat pengenalan diri sebenar (No. IC sebenar atau data peribadi mangsa sebenar)** ke dalam sistem prototaip/simulasi ini.

---

## 5. Ringkasan Pantas: Siapa Boleh Ubah Apa?

1. **Awam (`guest`)**: Hanya melihat Dashboard Utama, menggunakan penapis tempoh, menukar mod graf trend, menjana rumusan AI lokasi, dan mengeksport ringkasan CSV. Tidak boleh melihat atau mengubah tab `Siasatan`, `Penguatkuasaan`, dan `Lokasi`.
2. **Pegawai `Siasatan`**: Boleh mendaftar & mengemas kini rekod `Siasatan`, menambah lokasi baharu melalui modal `+ Tambah Lokasi` di borang Siasatan, serta menapis tempoh dan mencetak PDF **`9 Elemen Data Kemalangan`** & rekod tunggal. Boleh melihat data `Penguatkuasaan` dalam mod baca sahaja termasuk menapis tempoh & mencetak PDF senarai operasi (`🖨️ Cetak PDF`), tetapi tidak boleh membuka atau mengubah tab `Lokasi`.
3. **Pegawai `Penguatkuasaan`**: Boleh mendaftar & mengemas kini operasi `Penguatkuasaan` (termasuk kelompok saman, muat turun/import CSV, dan lokasi `"Lain-lain"`), serta menapis tempoh & mencetak PDF senarai operasi. Boleh melihat data `Siasatan` dalam mod baca sahaja serta mencetak PDF **`9 Elemen Data Kemalangan`** dan rekod siasatan tunggal (`🖨️ Cetak PDF`), tetapi tidak boleh membuka atau mengubah tab `Lokasi`.
4. **Pegawai `Admin`**: Mempunyai kuasa penuh untuk melihat, mendaftar, dan mengemas kini kesemua modul (**Dashboard**, **Siasatan**, **Penguatkuasaan**, dan **Lokasi**) termasuk pengaktifan/penyahaktifan lokasi hotspot dan Lampiran Blackspot.
