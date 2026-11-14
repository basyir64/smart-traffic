#!/usr/bin/env node
/**
 * scripts/seed-firestore.mjs
 *
 * Comprehensive Seeding Script for SMART TRAFFIC AI (PDRM BSPT)
 * Seeds canonical collections into Firestore (emulator or production):
 * - `locations` (Lampiran Blackspot & Hotspot routes)
 * - `siasatan` (14 realistic investigation records across Weekly, Monthly, Quarterly in Q4 2026)
 * - `penguatkuasaan` (7 enforcement operations across Weekly, Monthly, Quarterly in Q4 2026)
 * - `periods` (baseline period aggregations for weekly, monthly, quarterly)
 *
 * Usage:
 *   node scripts/seed-firestore.mjs --emulator
 *   node scripts/seed-firestore.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  writeBatch,
  connectFirestoreEmulator,
  serverTimestamp,
} from "firebase/firestore";

import { seedLocations } from "../src/data/seedLocations.js";
import { seedPeriods } from "../src/data/seedPeriods.js";
import { seedSiasatan } from "../src/data/seedSiasatan.js";
import { seedPenguatkuasaan } from "../src/data/seedPenguatkuasaan.js";
import { getFirebaseConfigFromEnv } from "./load-env.mjs";

const firebaseConfig = getFirebaseConfigFromEnv();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const isProdFlag =
  process.argv.includes("--prod") || process.env.VITE_APP_ENV === "prod";
const useEmulator =
  !isProdFlag &&
  (process.env.FIRESTORE_EMULATOR_HOST ||
    process.argv.includes("--emulator") ||
    process.env.VITE_APP_ENV !== "prod");

if (useEmulator) {
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8090";
  const [fsIp, fsPort] = fsHost.split(":");
  try {
    connectFirestoreEmulator(db, fsIp, parseInt(fsPort, 10));
    console.log(`🔌 Connected to Firestore Emulator at ${fsHost}`);
  } catch (err) {
    console.warn(`Could not connect to emulator: ${err.message}`);
  }
}

async function seedAll() {
  console.log("🚦 Starting Firestore Seeding for SMART TRAFFIC AI...");

  // 1. Seed Locations
  console.log(`\n📍 Seeding ${seedLocations.length} locations...`);
  const batchLoc = writeBatch(db);
  for (const loc of seedLocations) {
    const ref = doc(db, "locations", loc.id);
    batchLoc.set(ref, {
      ...loc,
      created_at: serverTimestamp(),
    });
  }
  await batchLoc.commit();
  console.log(`✅ ${seedLocations.length} locations seeded successfully.`);

  // 2. Seed Periods
  console.log(
    `\n📅 Seeding 3 period baselines (weekly, monthly, quarterly)...`
  );
  const batchPeriod = writeBatch(db);
  for (const [key, periodData] of Object.entries(seedPeriods)) {
    const ref = doc(db, "periods", key);
    batchPeriod.set(ref, {
      ...periodData,
      updated_at: serverTimestamp(),
    });
  }
  await batchPeriod.commit();
  console.log(`✅ Period baselines seeded successfully.`);

  // 3. Seed Siasatan
  console.log(
    `\n📝 Seeding ${seedSiasatan.length} siasatan records across time windows...`
  );
  const batchSiasatan = writeBatch(db);
  for (const s of seedSiasatan) {
    const ref = doc(db, "siasatan", s.id);
    batchSiasatan.set(ref, {
      ...s,
      seeded_at: serverTimestamp(),
    });
  }
  await batchSiasatan.commit();
  console.log(
    `✅ ${seedSiasatan.length} siasatan records seeded successfully.`
  );

  // 4. Seed Penguatkuasaan
  console.log(
    `\n🚔 Seeding ${seedPenguatkuasaan.length} penguatkuasaan records across time windows...`
  );
  const batchOps = writeBatch(db);
  for (const op of seedPenguatkuasaan) {
    const ref = doc(db, "penguatkuasaan", op.id);
    batchOps.set(ref, {
      ...op,
      seeded_at: serverTimestamp(),
    });
  }
  await batchOps.commit();
  console.log(
    `✅ ${seedPenguatkuasaan.length} penguatkuasaan records seeded successfully.`
  );

  console.log("\n🎉 All collections seeded successfully!");
}

seedAll().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
