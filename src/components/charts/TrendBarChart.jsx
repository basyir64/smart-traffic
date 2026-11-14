import Chip from "../shared/Chip";

const PERIOD_CAPTION = {
  weekly: "Minggu Semasa",
  monthly: "Bulan Semasa",
  quarterly: "Suku Tahun Semasa",
};

const SUBDIVISION_LABEL = {
  weekly: "Hari",
  monthly: "Minggu",
  quarterly: "Bulan",
};

export default function TrendBarChart({ trend = [], period = "monthly" }) {
  const maxVal = Math.max(1, ...trend);
  const caption = PERIOD_CAPTION[period] || "Bulan Semasa";
  const unitLabel = SUBDIVISION_LABEL[period] || "Minggu";

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Trend Kemalangan Mengikut {unitLabel}
        </h2>
        <Chip>{caption}</Chip>
      </div>

      <div className="flex gap-3 items-end h-[215px] pt-2.5 border-b border-[var(--color-bar-border)]">
        {trend.map((val, idx) => {
          const heightPx = Math.max(8, Math.round((val / maxVal) * 175));
          return (
            <div
              key={idx}
              className="flex-1 text-center flex flex-col items-center justify-end h-full gap-2"
            >
              <strong className="text-xs">{val}</strong>
              <div
                className="w-full max-w-[46px] rounded-t-[6px] min-h-[8px] transition-all duration-300"
                style={{
                  height: `${heightPx}px`,
                  background: "linear-gradient(#d8b665, #7a663d)",
                }}
              />
              <small className="text-[var(--color-bar-label)] text-xs pb-1.5">
                {unitLabel} {idx + 1}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
