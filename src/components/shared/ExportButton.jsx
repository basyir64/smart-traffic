import { useTranslation } from "react-i18next";

export default function ExportButton({ onExport }) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (onExport) {
      onExport();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="cursor-pointer border border-[var(--color-border-light)] text-[var(--color-text-primary)] bg-[var(--color-nav-bg)] px-3.5 py-2.5 rounded-[10px] font-semibold text-sm hover:border-[var(--color-accent)] transition-colors"
    >
      {t("export.csv")}
    </button>
  );
}
