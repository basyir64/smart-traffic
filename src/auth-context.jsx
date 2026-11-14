import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, dataSourceInfo } from "./fb_cloud_firestore";
import { seedUsers } from "./data/seedUsers";
import { bootstrapFirestoreData } from "./services/bootstrapData";

const AuthContext = createContext(null);

async function resolveUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  await bootstrapFirestoreData();

  const email = (firebaseUser.email || "").toLowerCase();
  const usernameFromEmail = email.split("@")[0];
  const matchedSeed = seedUsers.find(
    (u) => u.email.toLowerCase() === email || u.username === usernameFromEmail
  );

  const userDocRef = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      uid: firebaseUser.uid,
      username: data.username || usernameFromEmail,
      email: data.email || email,
      name: data.name || matchedSeed?.name || usernameFromEmail.toUpperCase(),
      role: data.role || matchedSeed?.role || "guest",
      active: data.active ?? true,
    };
  }

  // Check if user doc exists under another doc ID (e.g. from CLI script)
  const q = query(
    collection(db, "users"),
    where("username", "==", usernameFromEmail)
  );
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    const data = qSnap.docs[0].data();
    const profile = {
      uid: firebaseUser.uid,
      username: data.username || usernameFromEmail,
      email: data.email || email,
      name: data.name || matchedSeed?.name || usernameFromEmail.toUpperCase(),
      role: data.role || matchedSeed?.role || "guest",
      active: data.active ?? true,
    };
    await setDoc(
      userDocRef,
      { ...profile, created_at: serverTimestamp() },
      { merge: true }
    );
    return profile;
  }

  // If user matches a canonical seedUser, populate users/{uid} in Firestore
  if (matchedSeed) {
    const profile = {
      uid: firebaseUser.uid,
      username: matchedSeed.username,
      email: matchedSeed.email,
      name: matchedSeed.name,
      role: matchedSeed.role,
      active: true,
    };
    await setDoc(
      userDocRef,
      { ...profile, created_at: serverTimestamp() },
      { merge: true }
    );
    return profile;
  }

  return {
    uid: firebaseUser.uid,
    username: usernameFromEmail,
    email,
    name: firebaseUser.displayName || usernameFromEmail.toUpperCase(),
    role: "guest",
    active: true,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await resolveUserProfile(firebaseUser);
          setUser(profile);
        } catch (err) {
          console.error("[Auth] Failed to resolve user profile:", err.message);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (rawUsername, password) => {
    const cleanUsername = String(rawUsername || "")
      .trim()
      .toLowerCase()
      .replace(/@smarttraffic\.internal$/i, "");

    if (!cleanUsername || !password) {
      throw new Error("Sila masukkan nama pengguna dan kata laluan.");
    }

    const email = `${cleanUsername}@smarttraffic.internal`;
    const matchedSeed = seedUsers.find((u) => u.username === cleanUsername);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await resolveUserProfile(cred.user);
      setUser(profile);
      return profile;
    } catch (err) {
      // In Emulator mode only: if a canonical seed user is not yet in Auth Emulator, provision on first login
      const isUserMissingError =
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/invalid-login-credentials";

      if (dataSourceInfo.isEmulator && matchedSeed && isUserMissingError) {
        try {
          const createdCred = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          const profile = await resolveUserProfile(createdCred.user);
          setUser(profile);
          return profile;
        } catch {
          // User already exists in Auth Emulator with a different password
        }
      }

      throw new Error(
        "Gagal log masuk. Nama pengguna atau kata laluan tidak sah."
      );
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  const loginAsRole = useCallback(
    async (targetRole) => {
      if (!targetRole || targetRole === "guest" || targetRole === "Guest") {
        await logout();
        return null;
      }
      const matchedSeed = seedUsers.find((u) => u.role === targetRole);
      if (!matchedSeed) {
        throw new Error(`Tiada akaun seed untuk peranan: ${targetRole}`);
      }
      return login(matchedSeed.username, "EmulatorTest123!");
    },
    [login, logout]
  );

  const role = user?.role || "guest";
  const isAuthenticated = Boolean(user && role !== "guest");

  const value = {
    user,
    role,
    loading,
    isAuthenticated,
    isAdmin: role === "Admin",
    isSiasatan: role === "Siasatan",
    isPenguatkuasaan: role === "Penguatkuasaan",
    canModifySiasatan: role === "Siasatan" || role === "Admin",
    canModifyPenguatkuasaan: role === "Penguatkuasaan" || role === "Admin",
    canModifyLokasi: role === "Admin",
    login,
    loginAsRole,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
