/**
 * Canonical Baseline Period Statistics for SMART TRAFFIC AI (PDRM BSPT)
 */
export const seedPeriods = {
  weekly: {
    id: "weekly",
    type: "weekly",
    name: "Mingguan",
    cases: 72,
    fatal: 3,
    deaths: 4,
    change: -6,
    trend: [10, 16, 12, 19, 15],
    motor: 42,
    night: 39,
  },
  monthly: {
    id: "monthly",
    type: "monthly",
    name: "Bulanan",
    cases: 320,
    fatal: 12,
    deaths: 15,
    change: -8,
    trend: [56, 81, 69, 114],
    motor: 188,
    night: 160,
  },
  quarterly: {
    id: "quarterly",
    type: "quarterly",
    name: "Suku Tahun",
    cases: 970,
    fatal: 37,
    deaths: 44,
    change: -4,
    trend: [290, 315, 365],
    motor: 559,
    night: 482,
  },
};
