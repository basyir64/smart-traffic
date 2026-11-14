import { useTranslation } from "react-i18next";

export default function DemoBanner() {
  const { t } = useTranslation();
  return (
    <div className="text-[var(--color-demo-text)] border border-[var(--color-demo-border)] bg-[var(--color-demo-bg)] rounded-full px-3.5 py-2 text-xs">
      {t("brand.demo")}
    </div>
  );
}
