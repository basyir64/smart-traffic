import { useState, useEffect } from "react";
import { where } from "firebase/firestore";
import Chip from "../shared/Chip";

const FACTOR_CATEGORIES = [
  "Kelajuan",
  "Tidak peka keadaan sekeliling",
  "Gagal patuh isyarat",
  "Keadaan jalan",
  "Langgar binatang",
  "Faktor kenderaan",
  "Lain-lain",
];

export default function FactorBars({
  countAllSiasatan,
  totalCount = 0,
  refreshKey = 0,
}) {
  const [factorItems, setFactorItems] = useState(() =>
    FACTOR_CATEGORIES.map((name) => ({ name, count: 0, pct: 0 }))
  );
  const [resolvedTotal, setResolvedTotal] = useState(totalCount);

  useEffect(() => {
    if (!countAllSiasatan) return;
    let isMounted = true;

    async function loadFactorCounts() {
      const total = await countAllSiasatan([]);
      if (total <= 0) {
        if (isMounted) {
          setResolvedTotal(0);
          setFactorItems(
            FACTOR_CATEGORIES.map((name) => ({ name, count: 0, pct: 0 }))
          );
        }
        return;
      }

      const items = await Promise.all(
        FACTOR_CATEGORIES.map(async (name) => {
          const count = await countAllSiasatan([where("kesalahan", "==", name)]);
          const pct = Math.round((count / total) * 100);
          return {
            name,
            count,
            pct,
          };
        })
      );

      if (isMounted) {
        setResolvedTotal(total);
        setFactorItems(items);
      }
    }

    loadFactorCounts();
    return () => {
      isMounted = false;
    };
  }, [countAllSiasatan, totalCount, refreshKey]);

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl p-5 max-[550px]:p-3.5 shadow-[0_7px_25px_#040a1630]">
      <div className="flex items-center justify-between gap-2.5 mb-4">
        <h2 className="text-[17px] font-bold m-0">
          Faktor Penyumbang Direkodkan
        </h2>
        <Chip>{resolvedTotal} rekod siasatan</Chip>
      </div>

      <div className="space-y-3.5">
        {factorItems.map(({ name, count, pct }) => (
          <div key={name} className="flex items-center gap-2.5">
            <span className="w-[180px] max-[550px]:w-[110px] text-[13px] text-[#d4deef] shrink-0">
              {name}
            </span>
            <div className="flex-1 rounded-[6px] bg-[var(--color-track-bg)] h-[11px] overflow-hidden">
              <div
                className="h-full bg-[#dfbc69] rounded-[6px] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <b className="w-24 text-right text-xs shrink-0">
              {count} kes ({pct}%)
            </b>
          </div>
        ))}
      </div>

      <div className="border border-[var(--color-notice-border)] bg-[var(--color-notice-bg)] text-[var(--color-notice-text)] rounded-xl p-3.5 text-[13px] mt-4">
        Faktor penyumbang perlu diambil daripada dapatan siasatan yang disahkan.
        Kategori mangsa dan sebab kemalangan tidak boleh dianggap sebagai bukti
        salah laku individu.
      </div>
    </div>
  );
}
