import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  bm: {
    translation: {
      // Brand
      "brand.eyebrow": "PDRM · BSPT · INOVASI IPD",
      "brand.title": "SMART TRAFFIC AI",
      "brand.subtitle": "Command & Accident Prevention Dashboard · Prototaip Interaktif",
      "brand.demo": "● DATA SIMULASI — BUKAN IPRS SEBENAR",

      // Tabs
      "nav.dashboard": "Dashboard Utama",
      "nav.siasatan": "Siasatan",
      "nav.analysis": "9 Elemen IPRS",

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
      "risk.chip": "AI Advisory",
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
    },
  },
  en: {
    translation: {
      "brand.eyebrow": "PDRM · BSPT · IPD INNOVATION",
      "brand.title": "SMART TRAFFIC AI",
      "brand.subtitle": "Command & Accident Prevention Dashboard · Interactive Prototype",
      "brand.demo": "● SIMULATED DATA — NOT ACTUAL IPRS",

      "nav.dashboard": "Main Dashboard",
      "nav.siasatan": "Investigation",
      "nav.analysis": "9 IPRS Elements",

      "period.weekly": "Weekly",
      "period.monthly": "Monthly",
      "period.quarterly": "Quarterly",

      "export.csv": "↓ Export CSV",

      "metric.cases": "Total Accidents",
      "metric.cases.sub": "All case categories",
      "metric.fatal": "Fatal Accidents",
      "metric.fatal.sub": "Fatal status cases",
      "metric.deaths": "Total Deaths",
      "metric.deaths.sub": "Total persons killed",
      "metric.change": "Case Change",
      "metric.change.sub": "Compared to previous period (simulated)",

      "trend.title": "Accident Trend by Week",
      "trend.weekly": "Current Week",
      "trend.monthly": "Current Month",
      "trend.quarterly": "Current Quarter",
      "trend.label.weekly": "Day",
      "trend.label.monthly": "Week",
      "trend.label.quarterly": "Month",

      "risk.title": "Selected Location Risk",
      "risk.chip": "AI Advisory",
      "risk.high": "HIGH RISK",
      "risk.medium": "MEDIUM RISK",
      "risk.time": "Risk time",
      "risk.cases": "sample cases",
      "risk.factor": "Factor",
      "risk.recommendation": "Recommendation",
      "risk.generate": "Generate Operations Plan",

      "map.title": "Schematic Hotspot Map",
      "map.chip": "Click location markers",
      "map.high": "High risk",
      "map.mediumHigh": "Medium-high risk",
      "map.medium": "Medium risk",
      "map.disclaimer": "Not an actual geographic map",

      "hotspot.title": "Priority Hotspots",
      "hotspot.chip": "Sorted by risk",

      "footer.text": "CONCEPT PROTOTYPE · All figures, road names, hotspot locations and scores in this dashboard are designed for demonstration only. No direct IPRS connection, no victim data, and no actual AI predictions.",

      "coming_soon": "Coming soon",
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
