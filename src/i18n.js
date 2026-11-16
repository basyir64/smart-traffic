import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  bm: {
    translation: {
      // Brand
      "brand.eyebrow": "PDRM · BSPT · INOVASI IPD · PROTOTAIP INTERAKTIF",
      "brand.title": "SATRIA PerTH AI",
      "brand.subtitle":
        "Sistem Analitik Trafik, Risiko dan Intervensi Automatik",
      "brand.tagline": '"Data Tepat, Operasi Berfokus, Nyawa Diselamatkan"',
      "brand.demo": "● DATA SIMULASI — BUKAN IPRS SEBENAR",

      // Tabs
      "nav.dashboard": "Dashboard Utama",
      "nav.siasatan": "Siasatan",
      "nav.penguatkuasaan": "Penguatkuasaan",
      "nav.lokasi": "Lokasi",

      // Period selector
      "period.weekly": "Mingguan",
      "period.monthly": "Bulanan",
      "period.quarterly": "Suku Tahun",

      // Export
      "export.csv": "↓ Eksport CSV",

      // Metrics
      "metric.cases": "Jumlah Kemalangan",
      "metric.cases.sub": "Semua kategori kes",
      "metric.fatal": "Kemalangan Maut",
      "metric.fatal.sub": "Kes berstatus maut",
      "metric.deaths": "Jumlah Kematian",
      "metric.deaths.sub": "Jumlah orang terkorban",
      "metric.change": "Perubahan Kes",
      "metric.change.sub": "Berbanding tempoh sebelumnya (simulasi)",

      // Trend
      "trend.title": "Trend Kemalangan Mengikut Minggu",
      "trend.weekly": "Minggu Semasa",
      "trend.monthly": "Bulan Semasa",
      "trend.quarterly": "Suku Tahun Semasa",
      "trend.label.weekly": "Hari",
      "trend.label.monthly": "Minggu",
      "trend.label.quarterly": "Bulan",

      // Risk
      "risk.title": "Risiko Lokasi Pilihan",
      "risk.chip": "Nasihat AI",
      "risk.high": "RISIKO TINGGI",
      "risk.medium": "RISIKO SEDERHANA",
      "risk.time": "Waktu risiko",
      "risk.cases": "kes contoh",
      "risk.factor": "Faktor",
      "risk.recommendation": "Cadangan",
      "risk.generate": "Jana Cadangan Operasi",

      // Map
      "map.title": "Peta Skematik Hotspot",
      "map.chip": "Klik penanda lokasi",
      "map.high": "Risiko tinggi",
      "map.mediumHigh": "Risiko sederhana-tinggi",
      "map.medium": "Risiko sederhana",
      "map.disclaimer": "Bukan peta geografi sebenar",

      // Hotspot list
      "hotspot.title": "Hotspot Keutamaan",
      "hotspot.chip": "Disusun mengikut risiko",

      // Footer
      "footer.text": "PROTOTAIP KONSEP · Semua angka, nama jalan, lokasi hotspot dan skor dalam dashboard ini direka untuk demonstrasi sahaja. Tiada sambungan langsung ke IPRS, tiada maklumat mangsa, dan tiada ramalan AI sebenar.",

      // Placeholder pages
      "coming_soon": "Akan datang",

      // Auth
      "auth.loginTitle": "Log Masuk Pegawai",
      "auth.loginSubtitle": "Khas untuk Pegawai BSPT / PDRM yang mempunyai kelayakan akses.",
      "auth.username": "Nama Pengguna (Username)",
      "auth.password": "Kata Laluan",
      "auth.loginBtn": "Log Masuk",
      "auth.logoutBtn": "Log Keluar",
      "auth.backToDashboard": "Kembali ke Dashboard Utama (Mod Awam)",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "bm",
  fallbackLng: "bm",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
