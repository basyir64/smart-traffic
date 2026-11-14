import {
  collection,
  doc,
  getCountFromServer,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../fb_cloud_firestore";
import { seedUsers } from "../data/seedUsers";
import { seedLocations } from "../data/seedLocations";
import { seedPeriods } from "../data/seedPeriods";
import { seedSiasatan } from "../data/seedSiasatan";
import { seedPenguatkuasaan } from "../data/seedPenguatkuasaan";

let bootstrapPromise = null;

const sanitizedSeedUsers = seedUsers.map(
  ({ uid, username, email, name, role, active }) => ({
    id: uid,
    uid,
    username,
    email,
    name,
    role,
    active: active ?? true,
  })
);

async function seedAndVerifyCollection(collectionName, items) {
  try {
    const collRef = collection(db, collectionName);
    const beforeSnap = await getCountFromServer(collRef);
    const beforeCount = beforeSnap.data().count;
    const expectedSeedCount = items.length;

    const shouldSeed =
      expectedSeedCount > 0 &&
      (beforeCount === 0 ||
        (collectionName === "users" && beforeCount < expectedSeedCount));

    if (shouldSeed) {
      const batch = writeBatch(db);
      for (const item of items) {
        const { id, ...fields } = item;
        const docRef = doc(db, collectionName, id);
        batch.set(
          docRef,
          {
            ...fields,
            created_at: fields.created_at || serverTimestamp(),
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();

      // Post-seed count verification
      const afterSnap = await getCountFromServer(collRef);
      const afterCount = afterSnap.data().count;
      const tallyOk = afterCount === expectedSeedCount;

      if (!tallyOk) {
        console.warn(
          `[Bootstrap][Count Mismatch] '${collectionName}': seeded ${expectedSeedCount}, but Firestore count is ${afterCount}.`
        );
      } else {
        console.info(
          `[Bootstrap] Seeded & verified '${collectionName}': ${afterCount}/${expectedSeedCount} documents.`
        );
      }

      return {
        collection: collectionName,
        seedCount: expectedSeedCount,
        firestoreCount: afterCount,
        action: "seeded",
        tallied: tallyOk,
      };
    }

    const tallyOk = beforeCount === expectedSeedCount;
    if (!tallyOk) {
      console.info(
        `[Bootstrap][Count Verification] '${collectionName}' has ${beforeCount} docs in Firestore (seed file has ${expectedSeedCount}). Keeping existing Firestore data.`
      );
    }

    return {
      collection: collectionName,
      seedCount: expectedSeedCount,
      firestoreCount: beforeCount,
      action: "existing",
      tallied: tallyOk,
    };
  } catch (err) {
    console.error(
      `[Bootstrap] Failed to check/seed '${collectionName}':`,
      err.message
    );
    return {
      collection: collectionName,
      seedCount: items.length,
      firestoreCount: -1,
      action: "error",
      tallied: false,
    };
  }
}

/**
 * Checks Firestore (emulator or cloud) on startup, populates empty collections,
 * and runs a count verification check across `users`, `locations`, `periods`,
 * `siasatan`, and `penguatkuasaan`.
 */
export async function bootstrapFirestoreData() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = Promise.all([
    seedAndVerifyCollection("users", sanitizedSeedUsers),
    seedAndVerifyCollection("locations", seedLocations),
    seedAndVerifyCollection("periods", Object.values(seedPeriods)),
    seedAndVerifyCollection("siasatan", seedSiasatan),
    seedAndVerifyCollection("penguatkuasaan", seedPenguatkuasaan),
  ]).then((results) => {
    console.table(results);
    return results;
  });

  return bootstrapPromise;
}
