import { createContext, useContext } from "react";

export const PeriodContext = createContext(null);

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error("usePeriod must be used inside PeriodProvider");
  }
  return ctx;
}
