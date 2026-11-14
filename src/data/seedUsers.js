/**
 * Canonical Seed Users for SMART TRAFFIC AI (PDRM BSPT)
 * Note: Passwords are NOT stored here; they reside in .env.local (SEED_PASSWORD_*)
 * and are provisioned via scripts/onboard-user.mjs.
 */
export const seedUsers = [
  {
    uid: "seed-abdulaziz",
    username: "abdulaziz",
    email: "abdulaziz@smarttraffic.internal",
    name: "INSP ABDUL AZIZ BIN ABDUL WAHAB",
    role: "Siasatan",
    active: true,
  },
  {
    uid: "seed-cornelius",
    username: "cornelius",
    email: "cornelius@smarttraffic.internal",
    name: "SJN CORNELIUS A/K BIDAK",
    role: "Penguatkuasaan",
    active: true,
  },
  {
    uid: "seed-thangaraja",
    username: "thangaraja",
    email: "thangaraja@smarttraffic.internal",
    name: "ASP THANGARAJA A/L BALARAMAN",
    role: "Admin",
    active: true,
  },
  {
    uid: "seed-admin",
    username: "admin",
    email: "admin@smarttraffic.internal",
    name: "Admin",
    role: "Admin",
    active: true,
  },
];
