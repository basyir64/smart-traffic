import { useState } from "react";
import { PeriodContext } from "./hooks/usePeriod";

export function PeriodProvider({ children }) {
  const [period, setPeriod] = useState("monthly");

  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}
