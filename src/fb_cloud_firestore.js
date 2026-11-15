import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const metaEnv =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const procEnv =
  typeof globalThis !== "undefined" && globalThis.process?.env
    ? globalThis.process.env
    : {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || procEnv.VITE_FIREBASE_API_KEY,
  authDomain:
    metaEnv.VITE_FIREBASE_AUTH_DOMAIN || procEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:
    metaEnv.VITE_FIREBASE_PROJECT_ID || procEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket:
    metaEnv.VITE_FIREBASE_STORAGE_BUCKET ||
    procEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    procEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: metaEnv.VITE_FIREBASE_APP_ID || procEnv.VITE_FIREBASE_APP_ID,
  measurementId:
    metaEnv.VITE_FIREBASE_MEASUREMENT_ID ||
    procEnv.VITE_FIREBASE_MEASUREMENT_ID,
};

const rawEnv = metaEnv.VITE_APP_ENV || procEnv.VITE_APP_ENV;
const env =
  rawEnv === "emulator" || rawEnv === "prod"
    ? rawEnv
    : metaEnv.DEV
      ? "emulator"
      : "prod";

const isEmulator = env === "emulator";
const firestoreHost = "127.0.0.1";
const firestorePort = 8090;
const authEmulatorUrl = "http://127.0.0.1:9099";
const host = isEmulator
  ? `${firestoreHost}:${firestorePort}`
  : "firestore.googleapis.com";

export const dataSourceInfo = {
  env,
  projectId: firebaseConfig.projectId,
  isEmulator,
  host,
  authHost: isEmulator ? "127.0.0.1:9099" : firebaseConfig.authDomain,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (isEmulator) {
  try {
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
  } catch {
    // Already connected during HMR
  }
  try {
    connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  } catch {
    // Already connected during HMR
  }
}

console.info(
  `[Firebase] Connected to ${env.toUpperCase()} (${firebaseConfig.projectId} @ ${host})`
);
