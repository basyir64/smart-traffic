import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads key=value pairs from .env.local into process.env without overwriting existing vars.
 */
export function loadEnvLocal() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const envLocalPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envLocalPath)) return;

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

/**
 * Builds Firebase client config strictly from environment variables (.env.local / process.env).
 */
export function getFirebaseConfigFromEnv() {
  loadEnvLocal();

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID. Ensure .env.local or environment variables are configured."
    );
  }

  return firebaseConfig;
}
