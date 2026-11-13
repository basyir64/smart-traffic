import { useTranslation } from "react-i18next";

export default function Siasatan() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-6 text-center">
        <h2 className="text-lg font-bold mb-2">{t("nav.siasatan")}</h2>
        <p className="text-[var(--color-text-secondary)] text-sm">
          {t("coming_soon")} — Phase 3
        </p>
      </div>
    </div>
  );
}
