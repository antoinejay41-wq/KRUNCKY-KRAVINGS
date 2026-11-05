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
const ADMIN_SESSION_KEY = "kk-admin-verified-email";

/**
 * Check if the given authenticated user or session is authorized as store administrator
 */
export function isUserAdmin(user: User | null): boolean {
  if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const savedEmail = localStorage.getItem(ADMIN_SESSION_KEY);
    if (savedEmail && savedEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Persist verified admin email session locally
 */
export function setVerifiedAdminSession(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (clean === ADMIN_EMAIL.toLowerCase()) {
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, ADMIN_EMAIL);
    } catch {}
    return true;
  }
  return false;
}

/**
 * Get current verified admin email from Firebase Auth or session
 */
export function getActiveAdminEmail(user: User | null): string | null {
  if (user?.email) return user.email;
  try {
    const saved = localStorage.getItem(ADMIN_SESSION_KEY);
    if (saved && saved.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return saved;
    }
  } catch {}
  return null;
}

/**
 * Sign in admin using Google OAuth Popup
 */
export async function signInAdmin(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    if (result.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setVerifiedAdminSession(result.user.email);
    }
    return result.user;
  } catch (err) {
    // If Firebase Auth already completed sign-in before popup cleanup
    if (auth.currentUser) {
      if (auth.currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setVerifiedAdminSession(auth.currentUser.email);
      }
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
    localStorage.removeItem(ADMIN_SESSION_KEY);
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
    if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setVerifiedAdminSession(user.email);
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
    // Reliable fallback: optimized compressed image stored in Firestore config document
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

  const cleanData = {
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
    updatedAt: new Date().toISOString(),
    updatedBy: (adminUser?.uid || auth.currentUser?.uid || ADMIN_EMAIL).slice(0, 128),
  };

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
          onUpdate({
            name: data.name,
            logo: data.logo,
            wa: data.wa,
            headline: data.headline,
            sub: data.sub,
            shippingFee: typeof data.shippingFee === "number" ? data.shippingFee : 10.99,
            products: data.products,
            payment: data.payment,
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
