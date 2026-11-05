import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseAppletConfig from "../firebase-applet-config.json";

/**
 * Resolve Firebase configuration from Vercel VITE_FIREBASE_* environment variables
 * with automatic fallback to firebase-applet-config.json
 */
export const resolvedFirebaseConfig = {
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    firebaseAppletConfig.firestoreDatabaseId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseAppletConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseAppletConfig.messagingSenderId,
  oAuthClientId:
    import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID ||
    firebaseAppletConfig.oAuthClientId,
};

/**
 * Patch Firebase Auth 13.x BrowserPopupRedirectResolver before initializing Auth
 * to prevent "INTERNAL ASSERTION FAILED: Pending promise was never set" in cross-origin iframes
 * and COOP-protected Google OAuth popup windows.
 */
function patchPopupRedirectResolver() {
  try {
    const ResolverProto = (browserPopupRedirectResolver as any)?.prototype;
    if (!ResolverProto || ResolverProto.__kkPatched) return;
    ResolverProto.__kkPatched = true;

    // 1. Avoid false web-storage-unsupported rejection & internal-error throw in nested iframes
    ResolverProto._isIframeWebStorageSupported = function (
      _authInstance: unknown,
      cb: (supported: boolean) => void
    ) {
      if (typeof cb === "function") {
        cb(true);
      }
    };

    // 2. Avoid origin validation race condition during popup token exchange
    ResolverProto._originValidation = function () {
      return Promise.resolve();
    };

    // 3. Guard PopupOperation resolve/reject and cancel premature COOP 8s window.closed timer
    const origInitAndGetManager = ResolverProto.initAndGetManager;
    if (typeof origInitAndGetManager === "function") {
      ResolverProto.initAndGetManager = async function (authInstance: unknown) {
        const manager = await origInitAndGetManager.call(this, authInstance);
        if (manager && typeof manager.registerConsumer === "function" && !manager.__kkPatched) {
          manager.__kkPatched = true;
          const origRegisterConsumer = manager.registerConsumer.bind(manager);
          manager.registerConsumer = function (consumer: any) {
            if (consumer) {
              // Cancel the premature 8-second COOP window.closed timeout
              if (consumer.pollId) {
                window.clearTimeout(consumer.pollId);
                consumer.pollId = null;
              }
              consumer.pollUserCancellation = () => {};

              // Safe resolve that never triggers debugAssert(this.pendingPromise)
              consumer.resolve = function (cred: unknown) {
                if (!this.pendingPromise) return;
                const pending = this.pendingPromise;
                this.unregisterAndCleanUp();
                pending.resolve(cred);
              };

              // Safe reject that never triggers debugAssert(this.pendingPromise)
              consumer.reject = function (error: unknown) {
                if (!this.pendingPromise) return;
                const pending = this.pendingPromise;
                this.unregisterAndCleanUp();
                pending.reject(error);
              };
            }
            return origRegisterConsumer(consumer);
          };
        }
        return manager;
      };
    }
  } catch (e) {
    console.warn("PopupRedirectResolver patch skipped:", e);
  }
}

patchPopupRedirectResolver();

// Initialize Firebase App
const app = initializeApp(resolvedFirebaseConfig);

// CRITICAL: Initialize Firestore with firestoreDatabaseId from configuration
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Keep storage retry times short so fallback is instant if bucket rules restrict direct upload
try {
  storage.maxUploadRetryTime = 4000;
  storage.maxOperationRetryTime = 4000;
} catch {}

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: "select_account",
});

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "store", "config"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline. Check connection or project settings.");
    }
  }
}
