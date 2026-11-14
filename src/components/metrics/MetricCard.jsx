export default function MetricCard({ label, value, subtitle }) {
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="text-[var(--color-text-label)] text-[13px]">{label}</div>
      <div className="text-[34px] max-[550px]:text-[25px] font-extrabold my-2 leading-tight">
        {value}
      </div>
      <div className="text-[var(--color-text-muted)] text-xs">{subtitle}</div>
    </div>
  );
}
