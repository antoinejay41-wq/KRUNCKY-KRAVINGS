import React, { useState, useEffect, useRef } from "react";
import { StoreConfig, Product } from "../types";
import {
  uploadStoreImage,
  signInAdmin,
  signOutAdmin,
  loginAdminWithEmailPassword,
  updateAdminPassword,
  hasAdminPasswordConfigured,
  getConfiguredAdminEmail,
  getActiveAdminEmail,
  ADMIN_EMAIL,
} from "../services/storeService";
import { User } from "firebase/auth";
import { resolvedFirebaseConfig } from "../firebase";
import {
  X,
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  ShieldCheck,
  LogIn,
  LogOut,
  Loader2,
  Cloud,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Copy,
} from "lucide-react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StoreConfig;
  onSaveConfig: (newConfig: StoreConfig) => Promise<void> | void;
  onResetDefaults: () => void;
  adminUser: User | null;
  isAdmin: boolean;
  onAdminVerified?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDefaults,
  adminUser,
  isAdmin,
  onAdminVerified,
}) => {
  const [draft, setDraft] = useState<StoreConfig>(config);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Login Page form states
  const [loginEmail, setLoginEmail] = useState(() => getConfiguredAdminEmail(config));
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Change Password inside Admin Editor states
  const [newAdminEmail, setNewAdminEmail] = useState(() => getConfiguredAdminEmail(config));
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const wasOpenRef = useRef(false);

  // Sync draft ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDraft(JSON.parse(JSON.stringify(config)));
      setLoginEmail(getConfiguredAdminEmail(config));
      setNewAdminEmail(getConfiguredAdminEmail(config));
      setLoginPassword("");
      setLoginError(null);
      setFeedback(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, config]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving && !uploadingTarget) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSaving, uploadingTarget]);

  if (!isOpen) return null;

  const activeEmail = getActiveAdminEmail(adminUser);
  const isPasswordSet = hasAdminPasswordConfigured(config);

  const normalizeConfig = (sourceDraft: StoreConfig): StoreConfig => {
    let cleanWa = String(sourceDraft.wa || "").replace(/\D/g, "");
    if (!cleanWa) {
      cleanWa = import.meta.env.VITE_WHATSAPP_NUMBER || "18293252827";
    }
    if (cleanWa.length === 10) {
      cleanWa = "1" + cleanWa;
    }

    const cleanedProducts = (sourceDraft.products || []).map((p) => ({
      ...p,
      price: Math.max(0, parseFloat(String(p.price)) || 0),
      name: p.name.trim() || "Package",
    }));

    const payment = {
      cashApp:
        sourceDraft.payment?.cashApp?.trim() ||
        import.meta.env.VITE_CASHAPP_URL ||
        "https://cash.app/$11en11en",
      zelle:
        sourceDraft.payment?.zelle?.trim() ||
        import.meta.env.VITE_ZELLE_INFO ||
        "viztunellc@gmail.com",
      applePay:
        sourceDraft.payment?.applePay?.trim() ||
        import.meta.env.VITE_APPLEPAY_INFO ||
        "19432049964",
    };

    return {
      ...sourceDraft,
      wa: cleanWa,
      shippingFee:
        typeof sourceDraft.shippingFee === "number"
          ? Math.max(0, sourceDraft.shippingFee)
          : 10.99,
      payment,
      name: sourceDraft.name.trim() || "Krunchy Kravings",
      headline: sourceDraft.headline.trim() || "Satisfy your krave.",
      sub:
        sourceDraft.sub.trim() ||
        "Pick a size, add it to your cart, and finish your order with us on WhatsApp.",
      products: cleanedProducts,
    };
  };

  // Handle Email & Password Login submission
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError(null);

    try {
      const result = await loginAdminWithEmailPassword(
        loginEmail,
        loginPassword,
        config,
        rememberMe
      );

      if (result.updatedConfig) {
        setDraft(result.updatedConfig);
        await onSaveConfig(result.updatedConfig);
      }

      onAdminVerified?.();
      setLoginPassword("");
      setFeedback({
        type: "success",
        text: result.isFirstSetup
          ? `Admin password saved and signed in as ${result.email}!`
          : `Welcome back! Signed in as ${result.email}.`,
      });
    } catch (err: any) {
      setLoginError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Optional Google Sign-In handler on Login Page
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setLoginError(null);
    try {
      const user = await signInAdmin();
      const allowed = getConfiguredAdminEmail(config);
      if (
        user.email?.toLowerCase() === allowed ||
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      ) {
        onAdminVerified?.();
        setFeedback({
          type: "success",
          text: `Welcome back, ${user.displayName || user.email}!`,
        });
      } else {
        setLoginError(`Signed in as ${user.email}, which is not authorized as store admin.`);
      }
    } catch (err: any) {
      setLoginError(
        err?.message || "Google sign-in popup was closed or blocked. Please sign in with your email and password above."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAdmin();
      onAdminVerified?.();
      setLoginPassword("");
      setLoginError(null);
      setFeedback(null);
    } catch {
      setFeedback({ type: "error", text: "Failed to sign out." });
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword.trim()) {
      setFeedback({
        type: "error",
        text: "Please enter a new password (at least 4 characters) to update credentials.",
      });
      return;
    }
    setIsUpdatingCreds(true);
    setFeedback(null);
    try {
      const updated = await updateAdminPassword(newAdminEmail, newAdminPassword, draft);
      setDraft(updated);
      await onSaveConfig(updated);
      setNewAdminPassword("");
      setFeedback({
        type: "success",
        text: "Admin login email & password updated and synced to Firebase!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to update admin password.",
      });
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTarget("logo");
    setFeedback(null);
    try {
      const downloadUrl = await uploadStoreImage(file, "logo");
      const nextDraft: StoreConfig = { ...draft, logo: downloadUrl };
      setDraft(nextDraft);

      await onSaveConfig(normalizeConfig(nextDraft));

      setFeedback({
        type: "success",
        text: "Store logo uploaded & saved to Firebase! You can continue editing on this page.",
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Logo image couldn’t be uploaded. Try a valid PNG or JPG.",
      });
    } finally {
      setUploadingTarget(null);
      e.target.value = "";
    }
  };

  const handleProductImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetKey = `product-${index}`;
    setUploadingTarget(targetKey);
    setFeedback(null);
    try {
      const downloadUrl = await uploadStoreImage(file, "products");
      const nextProducts = [...draft.products];
      nextProducts[index] = { ...nextProducts[index], img: downloadUrl };
      const nextDraft: StoreConfig = { ...draft, products: nextProducts };
      setDraft(nextDraft);

      await onSaveConfig(normalizeConfig(nextDraft));

      setFeedback({
        type: "success",
        text: `Photo for package #${index + 1} uploaded & saved to Firebase!`,
      });
    } catch {
      setFeedback({
        type: "error",
        text: "Product photo couldn’t be processed. Try a valid JPG or PNG.",
      });
    } finally {
      setUploadingTarget(null);
      e.target.value = "";
    }
  };

  const handleUpdateProduct = (index: number, field: keyof Product, value: any) => {
    setDraft((prev) => {
      const nextProducts = [...prev.products];
      nextProducts[index] = { ...nextProducts[index], [field]: value };
      return { ...prev, products: nextProducts };
    });
  };

  const handleDeleteProduct = (index: number) => {
    setDraft((prev) => {
      const nextProducts = prev.products.filter((_, i) => i !== index);
      return { ...prev, products: nextProducts };
    });
    setFeedback({
      type: "success",
      text: "Package removed from list. Click Save below to publish changes.",
    });
  };

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: "p" + Date.now(),
      name: "New package size",
      price: 24.99,
      img: draft.products[0]?.img || "",
      soldOut: false,
    };
    setDraft((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
    }));
  };

  const executeSave = async (shouldCloseAfter: boolean) => {
    const cleanWa = String(draft.wa || "").replace(/\D/g, "");
    if (!cleanWa) {
      setFeedback({
        type: "error",
        text: "Please provide a valid WhatsApp number with country code.",
      });
      return;
    }

    const finalConfig = normalizeConfig(draft);
    setDraft(finalConfig);

    setIsSaving(true);
    setFeedback(null);
    try {
      await onSaveConfig(finalConfig);
      setFeedback({
        type: "success",
        text: "Store updates saved and synced to Firebase Cloud Storage & Firestore!",
      });

      if (shouldCloseAfter) {
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to save to Firebase. Changes are preserved locally.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // GATE 1: DEDICATED ADMIN LOGIN PAGE (SHOWN BEFORE ACCESSING THE EDIT PART)
  // ============================================================================
  if (!isAdmin) {
    return (
      <div
        id="admin-login"
        role="dialog"
        aria-modal="true"
        aria-label="Admin Login"
        className="fixed inset-0 bg-[var(--bg)] z-50 overflow-y-auto flex flex-col justify-between p-5 pt-[env(safe-area-inset-top,20px)]"
      >
        {/* Top bar */}
        <div className="max-w-[440px] w-full mx-auto flex items-center justify-between py-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to store</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--pink)]/15 text-[var(--pink)] border border-[var(--pink)]/30">
            <Lock className="w-3 h-3" />
            <span>Protected Admin Area</span>
          </span>
        </div>

        {/* Center Login Card */}
        <div className="max-w-[440px] w-full mx-auto my-auto py-6">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Store Logo & Title */}
            <div className="flex flex-col items-center text-center mb-6">
              {config.logo ? (
                <div className="bg-white px-3.5 py-2 rounded-xl border border-gray-200 mb-4 shadow-sm">
                  <img
                    src={config.logo}
                    alt={config.name}
                    className="h-11 w-auto max-w-[160px] object-contain"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/20 border border-[var(--brand)]/40 flex items-center justify-center text-[var(--brand)] mb-4">
                  <Lock className="w-6 h-6" />
                </div>
              )}

              <h2 className="font-bagel text-2xl sm:text-3xl text-[var(--brand)] font-normal">
                Admin Login
              </h2>
              <p className="text-xs sm:text-sm text-[var(--muted)] mt-1.5">
                {isPasswordSet
                  ? "Enter your administrator email and password to unlock store settings, prices, and photo uploads."
                  : `First-time admin setup: Enter your admin email (${getConfiguredAdminEmail(config)}) and choose a password to protect your store.`}
              </p>
            </div>

            {/* Login Error Message */}
            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Email & Password Login Form */}
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-email-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5"
                >
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-email-input"
                    type="email"
                    required
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={ADMIN_EMAIL}
                    className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5"
                >
                  {isPasswordSet ? "Password" : "Create Admin Password"}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-password-input"
                    type={showLoginPassword ? "text" : "password"}
                    required
                    minLength={4}
                    autoComplete={isPasswordSet ? "current-password" : "new-password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={isPasswordSet ? "Enter your password" : "Choose a password (min 4 chars)"}
                    className="w-full pl-10 pr-10 py-3 text-sm rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] p-1 cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--brand)]"
                  />
                  <span>Keep me signed in on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--brand)] text-[var(--brand-ink)] font-extrabold text-sm sm:text-base hover:brightness-110 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>
                  {isPasswordSet ? "Sign In to Admin Panel" : "Save Password & Sign In"}
                </span>
              </button>
            </form>

            {/* Optional Google OAuth Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--line)]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2.5 bg-[var(--surface)] text-[var(--muted)] font-semibold">
                  OR
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-xs sm:text-sm font-bold hover:border-[var(--brand)] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Cloud className="w-4 h-4 text-[var(--brand)]" />
              <span>Continue with Google ({ADMIN_EMAIL})</span>
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="max-w-[440px] w-full mx-auto text-center py-2">
          <p className="text-xs text-[var(--muted)]">
            Protected by Firebase Authentication & Cloud Firestore Security
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // GATE 2: AUTHENTICATED STORE ADMIN EDITOR
  // ============================================================================
  return (
    <div
      id="admin"
      role="dialog"
      aria-modal="true"
      aria-label="Store Admin"
      className="fixed inset-0 bg-[var(--bg)] z-50 overflow-y-auto pt-[env(safe-area-inset-top,0px)]"
    >
      <div className="max-w-[640px] mx-auto px-5 pb-36 pt-4">
        {/* Header */}
        <div className="flex justify-between items-center py-4 border-b border-[var(--line)] mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bagel text-2xl sm:text-3xl text-[var(--brand)] font-normal">
              Store admin
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
              <ShieldCheck className="w-3 h-3" />
              <span>Authenticated</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-bold text-[var(--ink)] hover:border-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close admin"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ink)] hover:text-[var(--pink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Active Admin Session Banner */}
        <div className="mb-5 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-[var(--brand)] shrink-0" />
            <span className="text-xs text-[var(--muted)]">
              Logged in as <strong className="text-[var(--ink)]">{activeEmail || ADMIN_EMAIL}</strong> — All photo uploads & price edits sync to Firebase.
            </span>
          </div>
        </div>

        {/* Feedback message at top for immediate visibility when staying on page */}
        {feedback && (
          <div
            className={`mb-5 p-3 rounded-lg flex items-center gap-2 text-sm font-semibold ${
              feedback.type === "success"
                ? "bg-green-500/15 text-green-300 border border-green-500/30"
                : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--ink)]">
            Store name
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            WhatsApp phone number (country code + number, digits only)
            <input
              type="text"
              inputMode="numeric"
              value={draft.wa}
              onChange={(e) => setDraft({ ...draft, wa: e.target.value })}
              placeholder="e.g. 18293252827"
              className="mt-1 w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            Standard Shipping Cost ($)
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.shippingFee ?? 10.99}
              onChange={(e) =>
                setDraft({ ...draft, shippingFee: parseFloat(e.target.value) || 0 })
              }
              className="mt-1 w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
            />
          </label>

          {/* Payment Methods Configuration */}
          <div className="pt-2 border-t border-[var(--line)]">
            <h3 className="font-bagel text-lg text-[var(--ink)] mb-3">
              Payment Methods Configuration
            </h3>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--muted)]">
                Cash App Link or Cashtag ($cashtag)
                <input
                  type="text"
                  value={draft.payment?.cashApp ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      payment: {
                        cashApp: e.target.value,
                        zelle: draft.payment?.zelle ?? "",
                        applePay: draft.payment?.applePay ?? "",
                      },
                    })
                  }
                  placeholder="e.g. https://cash.app/$yourhandle"
                  className="mt-1 w-full text-sm p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
                />
              </label>

              <label className="block text-xs font-semibold text-[var(--muted)]">
                Zelle Email or Phone Number
                <input
                  type="text"
                  value={draft.payment?.zelle ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      payment: {
                        cashApp: draft.payment?.cashApp ?? "",
                        zelle: e.target.value,
                        applePay: draft.payment?.applePay ?? "",
                      },
                    })
                  }
                  placeholder="e.g. yourbusiness@gmail.com"
                  className="mt-1 w-full text-sm p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
                />
              </label>

              <label className="block text-xs font-semibold text-[var(--muted)]">
                Apple Pay / Apple Cash Contact Number
                <input
                  type="text"
                  value={draft.payment?.applePay ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      payment: {
                        cashApp: draft.payment?.cashApp ?? "",
                        zelle: draft.payment?.zelle ?? "",
                        applePay: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. 19432049964"
                  className="mt-1 w-full text-sm p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
                />
              </label>
            </div>
          </div>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            Headline
            <input
              type="text"
              value={draft.headline}
              onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
              className="mt-1 w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            Subtext
            <textarea
              rows={2}
              value={draft.sub}
              onChange={(e) => setDraft({ ...draft, sub: e.target.value })}
              className="mt-1 w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none resize-none"
            />
          </label>

          {/* Logo Editor with Firebase Cloud Storage */}
          <div className="text-sm font-semibold text-[var(--ink)]">
            <span>Store Logo (Cloud Storage)</span>
            <div className="mt-1 p-3 border border-[var(--line)] rounded-[12px] bg-[var(--surface)] flex flex-col sm:flex-row items-center gap-4">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shrink-0">
                <img
                  src={draft.logo}
                  alt="Logo preview"
                  className="h-12 w-auto max-w-[180px] object-contain"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--brand)] text-xs font-semibold cursor-pointer transition-colors">
                  {uploadingTarget === "logo" ? (
                    <Loader2 className="w-4 h-4 text-[var(--brand)] animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-[var(--brand)]" />
                  )}
                  <span>
                    {uploadingTarget === "logo"
                      ? "Uploading & saving..."
                      : "Upload new logo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingTarget !== null}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-[var(--muted)] mt-1.5">
                  Automatically uploads & saves to Firebase while keeping you on this page.
                </p>
              </div>
            </div>
          </div>

          {/* Products Catalog Editor with Cloud Storage */}
          <div className="pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bagel text-xl text-[var(--ink)] font-normal">
                Products Catalog ({draft.products.length})
              </h3>
              <button
                type="button"
                onClick={handleAddProduct}
                className="text-xs font-extrabold text-[var(--brand)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add product</span>
              </button>
            </div>

            <div className="space-y-3">
              {draft.products.map((p, index) => (
                <div
                  key={p.id || index}
                  className="flex flex-col sm:flex-row gap-3 border border-[var(--line)] rounded-[12px] p-3.5 bg-[var(--surface)]"
                >
                  {/* Thumbnail & image change with Cloud Storage upload */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-16 h-24 object-cover rounded-lg bg-white border border-gray-200"
                    />
                    <label className="text-[11px] font-bold text-[var(--brand)] hover:underline cursor-pointer flex items-center gap-1">
                      {uploadingTarget === `product-${index}` ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[var(--brand)]" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      <span>
                        {uploadingTarget === `product-${index}`
                          ? "Saving..."
                          : "Upload photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProductImageUpload(index, e)}
                        disabled={uploadingTarget !== null}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Product Details Form */}
                  <div className="flex-1 grid gap-2">
                    <div>
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        Product name
                      </span>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdateProduct(index, "name", e.target.value)}
                        placeholder="e.g. 6 x 10 inch package"
                        className="w-full text-sm p-2 px-2.5 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          Price ($)
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={p.price}
                          onChange={(e) =>
                            handleUpdateProduct(index, "price", parseFloat(e.target.value) || 0)
                          }
                          className="w-full text-sm p-2 px-2.5 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
                        />
                      </div>

                      <div className="flex items-center pt-4">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={p.soldOut}
                            onChange={(e) =>
                              handleUpdateProduct(index, "soldOut", e.target.checked)
                            }
                            className="w-4 h-4 rounded text-[var(--brand)] focus:ring-[var(--brand)]"
                          />
                          <span>Sold out</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(index)}
                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete package</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddProduct}
              className="mt-3 w-full py-3 border border-dashed border-[var(--line)] rounded-[12px] text-sm font-extrabold text-[var(--brand)] hover:border-[var(--brand)] hover:bg-[var(--surface)]/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add another package</span>
            </button>
          </div>

          {/* Admin Login Credentials Settings */}
          <div className="pt-4 border-t border-[var(--line)]">
            <h3 className="font-bagel text-lg text-[var(--ink)] mb-2">
              Admin Login Security (Email & Password)
            </h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              Update the administrator email or change the password required to access this admin panel.
            </p>
            <form
              onSubmit={handleUpdateCredentials}
              className="p-3.5 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] space-y-3"
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    Admin Email
                  </span>
                  <input
                    type="email"
                    required
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="mt-1 w-full text-sm p-2 px-2.5 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    New Password
                  </span>
                  <div className="relative mt-1">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      minLength={4}
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full text-sm p-2 pl-2.5 pr-8 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingCreds}
                  className="px-3.5 py-2 rounded-lg bg-[var(--brand)]/20 border border-[var(--brand)] text-[var(--brand)] text-xs font-extrabold hover:bg-[var(--brand)] hover:text-[var(--brand-ink)] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingCreds ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>

          {/* Vercel Environment Variables Export */}
          <div className="pt-4 border-t border-[var(--line)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bagel text-lg text-[var(--ink)]">
                  Vercel Environment Variables (.env)
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Copy and paste directly into Vercel → Project Settings → Environment Variables.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const envText = [
                    `VITE_FIREBASE_PROJECT_ID="${resolvedFirebaseConfig.projectId}"`,
                    `VITE_FIREBASE_APP_ID="${resolvedFirebaseConfig.appId}"`,
                    `VITE_FIREBASE_API_KEY="${resolvedFirebaseConfig.apiKey}"`,
                    `VITE_FIREBASE_AUTH_DOMAIN="${resolvedFirebaseConfig.authDomain}"`,
                    `VITE_FIREBASE_DATABASE_ID="${resolvedFirebaseConfig.firestoreDatabaseId}"`,
                    `VITE_FIREBASE_STORAGE_BUCKET="${resolvedFirebaseConfig.storageBucket}"`,
                    `VITE_FIREBASE_MESSAGING_SENDER_ID="${resolvedFirebaseConfig.messagingSenderId}"`,
                    `VITE_FIREBASE_OAUTH_CLIENT_ID="${resolvedFirebaseConfig.oAuthClientId}"`,
                    `VITE_ADMIN_EMAIL="${newAdminEmail || ADMIN_EMAIL}"`,
                    `Whatsappnumber="${draft.wa}"`,
                    `Cashapp="${draft.payment?.cashApp || ""}"`,
                    `Zelle="${draft.payment?.zelle || ""}"`,
                    `Applapay="${draft.payment?.applePay || ""}"`,
                  ].join("\n");
                  navigator.clipboard.writeText(envText);
                  setFeedback({
                    type: "success",
                    text: "All 13 Vercel environment variables copied to clipboard! Paste directly into Vercel.",
                  });
                }}
                className="px-3.5 py-2 rounded-lg bg-[var(--brand)] text-[var(--brand-ink)] text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All .env for Vercel</span>
              </button>
            </div>
          </div>

          {/* Reset Demo Option */}
          <div className="pt-4 border-t border-[var(--line)]">
            <button
              type="button"
              onClick={() => {
                onResetDefaults();
                setFeedback({
                  type: "success",
                  text: "Reset store to original defaults.",
                });
              }}
              className="text-xs font-bold text-[var(--muted)] hover:text-[var(--pink)] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset store to original demo defaults</span>
            </button>
          </div>
        </div>

        {/* Bottom feedback message */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-semibold ${
              feedback.type === "success"
                ? "bg-green-500/15 text-green-300 border border-green-500/30"
                : "bg-red-500/15 text-red-300 border border-red-500/30"
            }`}
          >
            {feedback.type === "success" ? (
              <Check className="w-4 h-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-[var(--bg)] border-t border-[var(--line)] p-4 shadow-lg z-50">
        <div className="max-w-[640px] mx-auto flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-extrabold text-sm hover:bg-[var(--surface)]/80 active:scale-[0.98] transition-all cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => executeSave(false)}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-[12px] border border-[var(--brand)] bg-[var(--surface)] text-[var(--brand)] font-extrabold text-sm hover:bg-[var(--brand)]/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save & Stay on Page</span>
          </button>

          <button
            type="button"
            onClick={() => executeSave(true)}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-[12px] border-0 bg-[var(--brand)] text-[var(--brand-ink)] font-extrabold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save & Publish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
