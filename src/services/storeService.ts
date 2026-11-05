import {
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  db,
  auth,
  storage,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from "../firebase";
import { StoreConfig } from "../types";
import { resizeImageFile } from "../utils/format";

export const STORE_CONFIG_DOC_PATH = "store/config";
export const ADMIN_EMAIL = "antoinejay41@gmail.com";
const ADMIN_AUTH_SESSION_KEY = "kk-admin-authenticated-v2";
const ADMIN_PWD_HASH_KEY = "kk-admin-password-hash";
const ADMIN_CUSTOM_EMAIL_KEY = "kk-admin-email";

/**
 * Compute SHA-256 hex digest of a password string
 */
export async function hashPassword(password: string): Promise<string> {
  const normalized = password.trim();
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`kk_salt_2026_${normalized}`);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback deterministic hash if subtle crypto unavailable
  let h = 2166136261;
  const str = `kk_salt_2026_${normalized}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Get the configured admin email (from config, localStorage, or default)
 */
export function getConfiguredAdminEmail(config?: StoreConfig): string {
  if (config?.adminEmail?.trim()) {
    return config.adminEmail.trim().toLowerCase();
  }
  try {
    const saved = localStorage.getItem(ADMIN_CUSTOM_EMAIL_KEY);
    if (saved?.trim()) return saved.trim().toLowerCase();
  } catch {}
  return ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if an admin password has already been configured
 */
export function hasAdminPasswordConfigured(config?: StoreConfig): boolean {
  if (config?.adminPasswordHash) return true;
  try {
    return Boolean(localStorage.getItem(ADMIN_PWD_HASH_KEY));
  } catch {
    return false;
  }
}

/**
 * Check if the given user or current session is authenticated as store administrator
 */
export function isUserAdmin(user: User | null): boolean {
  if (user?.email) {
    const allowedEmail = getConfiguredAdminEmail();
    if (
      user.email.toLowerCase() === allowedEmail ||
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ) {
      return true;
    }
  }
  try {
    const sessionEmail = sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) || localStorage.getItem(ADMIN_AUTH_SESSION_KEY);
    if (sessionEmail) {
      const allowedEmail = getConfiguredAdminEmail();
      if (
        sessionEmail.toLowerCase() === allowedEmail ||
        sessionEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        return true;
      }
    }
  } catch {}
  return false;
}

/**
 * Persist authenticated admin session
 */
export function setVerifiedAdminSession(email: string, rememberMe: boolean = true): void {
  const clean = email.trim().toLowerCase();
  try {
    sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, clean);
    if (rememberMe) {
      localStorage.setItem(ADMIN_AUTH_SESSION_KEY, clean);
    } else {
      localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    }
  } catch {}
}

/**
 * Get current verified admin email from Firebase Auth or session
 */
export function getActiveAdminEmail(user: User | null): string | null {
  if (user?.email) return user.email;
  try {
    const saved =
      sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) ||
      localStorage.getItem(ADMIN_AUTH_SESSION_KEY);
    if (saved) return saved;
  } catch {}
  return null;
}

/**
 * Authenticate admin using Email & Password.
 * Connects to Firebase Auth Email/Password when enabled in Firebase Console,
 * and verifies/stores SHA-256 hashed credentials in Cloud Firestore.
 */
export async function loginAdminWithEmailPassword(
  email: string,
  password: string,
  config: StoreConfig,
  rememberMe: boolean = true
): Promise<{ email: string; updatedConfig?: StoreConfig; isFirstSetup: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please enter a valid admin email address.");
  }
  if (cleanPass.length < 4) {
    throw new Error("Password must be at least 4 characters.");
  }

  const allowedEmail = getConfiguredAdminEmail(config);
  if (cleanEmail !== allowedEmail && cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error(`Unauthorized email. Please sign in with the store admin email (${allowedEmail}).`);
  }

  const inputHash = await hashPassword(cleanPass);
  let storedHash = config.adminPasswordHash || "";
  if (!storedHash) {
    try {
      storedHash = localStorage.getItem(ADMIN_PWD_HASH_KEY) || "";
    } catch {}
  }

  // Attempt Firebase Auth Email/Password sign-in if enabled on the Firebase project
  try {
    await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
  } catch (fbErr: any) {
    const code = fbErr?.code || "";
    if (!storedHash && (code === "auth/user-not-found" || code === "auth/invalid-credential")) {
      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch {
        // Ignore if Email/Password provider is not enabled in Firebase console yet
      }
    } else if (code === "auth/wrong-password") {
      throw new Error("Incorrect admin password. Please try again.");
    }
  }

  // If a password hash already exists, verify it strictly
  if (storedHash) {
    if (inputHash !== storedHash) {
      throw new Error("Incorrect admin password. Please try again.");
    }
    try {
      localStorage.setItem(ADMIN_PWD_HASH_KEY, storedHash);
      localStorage.setItem(ADMIN_CUSTOM_EMAIL_KEY, cleanEmail);
    } catch {}
    setVerifiedAdminSession(cleanEmail, rememberMe);
    return { email: cleanEmail, isFirstSetup: false };
  }

  // First-time password setup: save hash to localStorage and Cloud Firestore
  try {
    localStorage.setItem(ADMIN_PWD_HASH_KEY, inputHash);
    localStorage.setItem(ADMIN_CUSTOM_EMAIL_KEY, cleanEmail);
  } catch {}

  const updatedConfig: StoreConfig = {
    ...config,
    adminEmail: cleanEmail,
    adminPasswordHash: inputHash,
  };

  try {
    await saveStoreConfigToFirestore(updatedConfig, auth.currentUser);
  } catch (e) {
    console.warn("Saved admin password locally:", e);
  }

  setVerifiedAdminSession(cleanEmail, rememberMe);
  return { email: cleanEmail, updatedConfig, isFirstSetup: true };
}

/**
 * Update admin email and/or password from inside the Admin Panel
 */
export async function updateAdminPassword(
  newEmail: string,
  newPassword: string,
  config: StoreConfig
): Promise<StoreConfig> {
  const cleanEmail = newEmail.trim().toLowerCase();
  const cleanPass = newPassword.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Please provide a valid admin email address.");
  }
  if (cleanPass.length < 4) {
    throw new Error("New password must be at least 4 characters.");
  }

  const newHash = await hashPassword(cleanPass);
  try {
    localStorage.setItem(ADMIN_PWD_HASH_KEY, newHash);
    localStorage.setItem(ADMIN_CUSTOM_EMAIL_KEY, cleanEmail);
  } catch {}

  const updatedConfig: StoreConfig = {
    ...config,
    adminEmail: cleanEmail,
    adminPasswordHash: newHash,
  };

  await saveStoreConfigToFirestore(updatedConfig, auth.currentUser);
  setVerifiedAdminSession(cleanEmail, true);
  return updatedConfig;
}

/**
 * Sign in admin using Google OAuth Popup
 */
export async function signInAdmin(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    if (result.user?.email) {
      setVerifiedAdminSession(result.user.email, true);
    }
    return result.user;
  } catch (err) {
    if (auth.currentUser?.email) {
      setVerifiedAdminSession(auth.currentUser.email, true);
      return auth.currentUser;
    }
    throw err;
  }
}

/**
 * Sign out current admin
 */
export async function signOutAdmin(): Promise<void> {
  try {
    sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    localStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    localStorage.removeItem("kk-admin-verified-email");
  } catch {}
  await signOut(auth);
}

/**
 * Subscribe to admin authentication changes
 */
export function subscribeAdminAuth(
  callback: (user: User | null, isAdmin: boolean) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user?.email) {
      const allowed = getConfiguredAdminEmail();
      if (
        user.email.toLowerCase() === allowed ||
        user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        setVerifiedAdminSession(user.email, true);
      }
    }
    const admin = isUserAdmin(user);
    callback(user, admin);
  });
}

/**
 * Upload an image to Firebase Cloud Storage, with fast automatic high-quality fallback
 */
export async function uploadStoreImage(
  file: File,
  folder: "products" | "logo"
): Promise<string> {
  const maxDimension = folder === "logo" ? 500 : 720;
  const format = folder === "logo" ? "image/png" : "image/jpeg";

  try {
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storageRef = ref(storage, `${folder}/${cleanFileName}`);

    const uploadPromise = (async () => {
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || "image/jpeg",
      });
      return await getDownloadURL(snapshot.ref);
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Storage upload timeout")), 3500)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch {
    return await resizeImageFile(file, maxDimension, format);
  }
}

/**
 * Save store configuration document directly to Cloud Firestore
 */
export async function saveStoreConfigToFirestore(
  config: StoreConfig,
  adminUser?: User | null
): Promise<void> {
  const path = "store";
  const docRef = doc(db, "store", "config");

  const cleanWa = String(config.wa || "18293252827").replace(/\D/g, "") || "18293252827";
  let storedHash = config.adminPasswordHash || "";
  if (!storedHash) {
    try {
      storedHash = localStorage.getItem(ADMIN_PWD_HASH_KEY) || "";
    } catch {}
  }
  const adminEmail = getConfiguredAdminEmail(config);

  const cleanData: Record<string, any> = {
    name: (config.name.trim() || "Krunchy Kravings").slice(0, 200),
    logo: config.logo || "",
    wa: cleanWa.slice(0, 50),
    headline: (config.headline.trim() || "Satisfy your krave.").slice(0, 500),
    sub: (config.sub.trim() || "").slice(0, 1000),
    shippingFee:
      typeof config.shippingFee === "number" && !Number.isNaN(config.shippingFee)
        ? Math.max(0, config.shippingFee)
        : 10.99,
    products: (config.products || []).slice(0, 100).map((p) => ({
      id: String(p.id || "p" + Date.now()),
      name: (p.name.trim() || "Package").slice(0, 150),
      price: Math.max(0, parseFloat(String(p.price)) || 0),
      img: p.img || "",
      soldOut: Boolean(p.soldOut),
    })),
    payment: {
      cashApp:
        config.payment?.cashApp?.trim() ||
        import.meta.env.VITE_CASHAPP_URL ||
        "https://cash.app/$11en11en",
      zelle:
        config.payment?.zelle?.trim() ||
        import.meta.env.VITE_ZELLE_INFO ||
        "viztunellc@gmail.com",
      applePay:
        config.payment?.applePay?.trim() ||
        import.meta.env.VITE_APPLEPAY_INFO ||
        "19432049964",
    },
    adminEmail: adminEmail.slice(0, 128),
    updatedAt: new Date().toISOString(),
    updatedBy: (adminUser?.uid || auth.currentUser?.uid || adminEmail || ADMIN_EMAIL).slice(0, 128),
  };

  if (storedHash) {
    cleanData.adminPasswordHash = storedHash.slice(0, 256);
  }

  try {
    await setDoc(docRef, cleanData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Real-time subscription to store configuration from Cloud Firestore
 */
export function subscribeStoreConfigFromFirestore(
  onUpdate: (config: StoreConfig) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, "store", "config");

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.products) && data.name) {
          if (data.adminPasswordHash) {
            try {
              localStorage.setItem(ADMIN_PWD_HASH_KEY, data.adminPasswordHash);
            } catch {}
          }
          if (data.adminEmail) {
            try {
              localStorage.setItem(ADMIN_CUSTOM_EMAIL_KEY, data.adminEmail);
            } catch {}
          }
          onUpdate({
            name: data.name,
            logo: data.logo,
            wa: data.wa,
            headline: data.headline,
            sub: data.sub,
            shippingFee: typeof data.shippingFee === "number" ? data.shippingFee : 10.99,
            products: data.products,
            payment: data.payment,
            adminEmail: data.adminEmail,
            adminPasswordHash: data.adminPasswordHash,
          });
        }
      }
    },
    (err) => {
      console.warn("Firestore onSnapshot error:", err);
      if (onError) onError(err);
    }
  );
}

export { testConnection };
