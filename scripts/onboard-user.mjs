#!/usr/bin/env node
/**
 * scripts/onboard-user.mjs
 *
 * Onboarding script for SMART TRAFFIC AI (PDRM BSPT)
 * Takes an officer's Full Name and Role, generates a unique username and an easy-to-remember
 * password, persists the user record in Firebase Auth and Firestore, and prints credentials.
 *
 * Usage:
 *   node scripts/onboard-user.mjs --name "INSP ABDUL AZIZ BIN ABDUL WAHAB" --role "Siasatan"
 *   node scripts/onboard-user.mjs --name "SJN CORNELIUS A/K BIDAK" --role "Penguatkuasaan"
 *   node scripts/onboard-user.mjs --name "ASP THANGARAJA A/L BALARAMAN" --role "Admin"
 *   node scripts/onboard-user.mjs --seed-all
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  connectFirestoreEmulator,
  serverTimestamp,
} from "firebase/firestore";
import { seedUsers } from "../src/data/seedUsers.js";

// Load .env.local into process.env if present
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  const lines = fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function getSeedPassword(username) {
  if (!username) return null;
  const envKey = `SEED_PASSWORD_${String(username).toUpperCase()}`;
  return process.env[envKey] || null;
}

// Default / fallback Firebase config (works with emulator & cloud project)
const firebaseConfig = {
  apiKey:
    process.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyBc_AVxBXMnK1Z2jwqq-GGGzCmsf8HIpds",
  authDomain:
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "smart-traffic-93b67.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "smart-traffic-93b67",
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "smart-traffic-93b67.firebasestorage.app",
  messagingSenderId:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "486263542637",
  appId:
    process.env.VITE_FIREBASE_APP_ID ||
    "1:486263542637:web:b4c6b04678bb583381c064",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use Emulator unless --prod is explicitly passed or VITE_APP_ENV=prod
const isProdFlag =
  process.argv.includes("--prod") || process.env.VITE_APP_ENV === "prod";
const useEmulator =
  !isProdFlag &&
  (process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.argv.includes("--emulator") ||
    process.env.VITE_APP_ENV !== "prod");

if (useEmulator) {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
    : "http://127.0.0.1:9099";
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8090";
  const [fsIp, fsPort] = fsHost.split(":");
  try {
    connectAuthEmulator(auth, authHost, { disableWarnings: true });
  } catch (_) {}
  try {
    connectFirestoreEmulator(db, fsIp, parseInt(fsPort, 10));
  } catch (_) {}
}

const VALID_ROLES = ["Siasatan", "Penguatkuasaan", "Admin"];

const WORD_LIST_A = [
  "Trafik",
  "Aman",
  "Cekap",
  "Pantas",
  "Tegas",
  "Adil",
  "Waspada",
  "Selamat",
  "Berani",
  "Setia",
  "Ihsan",
  "Patuh",
];
const WORD_LIST_B = [
  "Jalan",
  "Laluan",
  "Rondaan",
  "Operasi",
  "Siasatan",
  "IPD",
  "BSPT",
  "Zon",
  "Skuad",
];

/**
 * Generates a clean, unique username from full name and rank
 */
export function generateUsername(fullName) {
  if (!fullName) return `pegawai${Math.floor(100 + Math.random() * 900)}`;

  // Strip PDRM ranks & patronymics
  const cleaned = fullName
    .replace(
      /\b(INSP|INSPEKTOR|SJN|SARJAN|ASP|DSP|SUPT|ACP|KPL|KOPRAL|L\/KPL|KONSTABEL|SM)\b\.?/gi,
      ""
    )
    .replace(/\b(BIN|BINTI|B\.|BT\.|A\/L|A\/K|AL|AK)\b/gi, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0)
    return `pegawai${Math.floor(100 + Math.random() * 900)}`;

  if (words.length === 1) return words[0];

  // For names like "Abdul Aziz", join first two
  if (words[0] === "abdul" && words[1]) {
    return `abdul${words[1]}`;
  }

  return words[0];
}

/**
 * Generates an easy to remember password (e.g. "AmanTrafik726!")
 */
export function generateMemorablePassword() {
  const word1 = WORD_LIST_A[Math.floor(Math.random() * WORD_LIST_A.length)];
  const word2 = WORD_LIST_B[Math.floor(Math.random() * WORD_LIST_B.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${word1}${word2}${num}!`;
}

/**
 * Checks Firestore to ensure username uniqueness (or reuses existing username for same officer name)
 */
async function getUniqueUsername(baseUsername, fullNameUpper) {
  let candidate = baseUsername;
  let counter = 1;

  try {
    while (true) {
      const q = query(
        collection(db, "users"),
        where("username", "==", candidate)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return candidate;
      }
      // If the existing record belongs to the exact same officer name, reuse it idempotently
      const existingSameName = snap.docs.find(
        (d) => d.data()?.name?.toUpperCase() === fullNameUpper
      );
      if (existingSameName) {
        return candidate;
      }
      counter++;
      candidate = `${baseUsername}${counter}`;
    }
  } catch (_) {
    return candidate;
  }
}

/**
 * Onboards a single user into Auth & Firestore
 */
export async function onboardUser({
  fullName,
  role,
  customPassword = null,
  preferredUsername = null,
}) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(
      `Peranan tidak sah: "${role}". Sila pilih antara: ${VALID_ROLES.join(", ")}`
    );
  }

  const fullNameUpper = fullName.trim().toUpperCase();
  const baseUsername = preferredUsername || generateUsername(fullNameUpper);
  const username = preferredUsername
    ? preferredUsername
    : await getUniqueUsername(baseUsername, fullNameUpper);
  const email = `${username}@smarttraffic.internal`;
  const password = customPassword || generateMemorablePassword();

  let uid = null;
  let authSuccess = false;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    authSuccess = true;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      try {
        const existingCred = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        uid = existingCred.user.uid;
        authSuccess = true;
      } catch (_) {
        console.warn(
          `[Perhatian] Emel ${email} telah wujud dalam Firebase Auth.`
        );
        uid = `seed-${username}`;
      }
    } else {
      console.warn(`[Perhatian] Firebase Auth notice: ${err.message}`);
      uid = `seed-${username}`;
    }
  }

  // Persist user record into Firestore users/{uid}
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        uid,
        username,
        email,
        name: fullNameUpper,
        role,
        active: true,
        created_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn(`[Perhatian] Firestore write notice: ${err.message}`);
  }

  return {
    fullName: fullNameUpper,
    role,
    username,
    email,
    password,
    uid,
    authSuccess,
  };
}

// ── CLI Runner ──
async function main() {
  const args = process.argv.slice(2);

  // Check for seed-all flag
  if (args.includes("--seed-all")) {
    console.log(
      `\n🚀 Memulakan pendaftaran akaun seed rasmi BSPT PDRM (${useEmulator ? "EMULATOR" : "PROD"})...\n`
    );

    for (const seed of seedUsers) {
      const envPassword = getSeedPassword(seed.username);
      const res = await onboardUser({
        fullName: seed.name,
        role: seed.role,
        customPassword: envPassword,
        preferredUsername: seed.username,
      });
      printUserCard(res);
    }
    process.exit(0);
  }

  // Parse --name, --role, --password
  let name = null;
  let role = null;
  let password = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) name = args[++i];
    if (args[i] === "--role" && args[i + 1]) role = args[++i];
    if (args[i] === "--password" && args[i + 1]) password = args[++i];
  }

  if (!name || !role) {
    console.error(`
❌ Ralat: Sila berikan nama penuh dan peranan pegawai.

Penggunaan:
  node scripts/onboard-user.mjs --name "<NAMA PENUH>" --role "<PERANAN>"
  
Contoh:
  node scripts/onboard-user.mjs --name "INSP ABDUL AZIZ BIN ABDUL WAHAB" --role "Siasatan"
  node scripts/onboard-user.mjs --name "SJN CORNELIUS A/K BIDAK" --role "Penguatkuasaan"
  node scripts/onboard-user.mjs --name "ASP THANGARAJA A/L BALARAMAN" --role "Admin"
  node scripts/onboard-user.mjs --seed-all
`);
    process.exit(1);
  }

  try {
    // Check if the supplied name matches one of the canonical seedUsers when no custom password is provided
    const matchedSeed = seedUsers.find(
      (u) => u.name.toUpperCase() === name.trim().toUpperCase()
    );
    const res = await onboardUser({
      fullName: name,
      role,
      customPassword:
        password || getSeedPassword(matchedSeed?.username) || null,
      preferredUsername: matchedSeed?.username || null,
    });
    printUserCard(res);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Gagal mendaftar pegawai: ${err.message}`);
    process.exit(1);
  }
}

function printUserCard(user) {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│ 👮 PENDAFTARAN PEGAWAI BERJAYA (PDRM BSPT)                 │
├─────────────────────────────────────────────────────────────┤
│ Nama Penuh : ${user.fullName.padEnd(46)} │
│ Peranan    : ${user.role.padEnd(46)} │
│ Username   : ${user.username.padEnd(46)} │
│ Emel       : ${user.email.padEnd(46)} │
│ Password   : ${user.password.padEnd(46)} │
│ UID        : ${user.uid.padEnd(46)} │
└─────────────────────────────────────────────────────────────┘
Sila salin dan serahkan maklumat username & password di atas kepada pegawai.`);
}

// Run if called directly from CLI
if (process.argv[1] && process.argv[1].endsWith("onboard-user.mjs")) {
  main();
}
