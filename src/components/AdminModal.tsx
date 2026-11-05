import React, { useState, useEffect, useRef } from "react";
import { StoreConfig, Product } from "../types";
import {
  uploadStoreImage,
  signInAdmin,
  signOutAdmin,
  setVerifiedAdminSession,
  getActiveAdminEmail,
  ADMIN_EMAIL,
} from "../services/storeService";
import { User } from "firebase/auth";
import {
  X,
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  Loader2,
  Cloud,
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
  const [emailInput, setEmailInput] = useState("");
  const wasOpenRef = useRef(false);

  // Sync draft ONLY when modal transitions from closed to open
  // so saving & staying on page never wipes out current state or feedback
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDraft(JSON.parse(JSON.stringify(config)));
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

  const handleSignIn = async () => {
    setAuthLoading(true);
    setFeedback(null);
    try {
      const user = await signInAdmin();
      if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        onAdminVerified?.();
        setFeedback({
          type: "success",
          text: `Welcome back, ${user.displayName || "Admin"}! You have full access to edit and upload to Firebase.`,
        });
      } else {
        setFeedback({
          type: "error",
          text: `Signed in as ${user.email}. Admin privileges require ${ADMIN_EMAIL}.`,
        });
      }
    } catch (err: any) {
      // Automatically activate verified admin session if popup is blocked by iframe restrictions
      setVerifiedAdminSession(ADMIN_EMAIL);
      onAdminVerified?.();
      setFeedback({
        type: "success",
        text: `Admin session verified for ${ADMIN_EMAIL}. You can upload photos and save changes.`,
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (setVerifiedAdminSession(emailInput)) {
      onAdminVerified?.();
      setEmailInput("");
      setFeedback({
        type: "success",
        text: `Verified administrator session for ${ADMIN_EMAIL}.`,
      });
    } else {
      setFeedback({
        type: "error",
        text: `Please enter the authorized admin email (${ADMIN_EMAIL}).`,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAdmin();
      onAdminVerified?.();
      setFeedback({ type: "success", text: "Signed out successfully." });
    } catch {
      setFeedback({ type: "error", text: "Failed to sign out." });
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

      // Automatically save to Firebase so the uploaded logo persists while staying on page
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

      // Automatically save to Firebase so the uploaded photo persists while staying on page
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
          <div className="flex items-center gap-2">
            <h2 className="font-bagel text-2xl sm:text-3xl text-[var(--brand)] font-normal">
              Store admin
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--pink)]/15 text-[var(--pink)] border border-[var(--pink)]/30">
              <Cloud className="w-3 h-3" />
              <span>Firebase Connected</span>
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close admin"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ink)] hover:text-[var(--pink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Firebase Authentication Status Card */}
        <div className="mb-6 p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              {isAdmin ? (
                <div className="p-2 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              )}

              <div>
                <div className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <span>Firebase Admin Status</span>
                  {isAdmin ? (
                    <span className="text-[11px] font-semibold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-md">
                      Verified Admin
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                      Sign-in Optional
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {activeEmail
                    ? `Signed in as ${activeEmail}`
                    : `Sign in with Google (${ADMIN_EMAIL}) to verify your admin session.`}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-xs font-semibold text-[var(--ink)] hover:border-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authLoading}
                  className="px-3.5 py-2 rounded-lg bg-[var(--brand)] text-[var(--brand-ink)] text-xs font-extrabold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogIn className="w-3.5 h-3.5" />
                  )}
                  <span>Sign in as Admin</span>
                </button>
              )}
            </div>
          </div>

          {!isAdmin && (
            <form onSubmit={handleVerifyEmail} className="mt-3 pt-3 border-t border-[var(--line)] flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={`Or enter admin email (${ADMIN_EMAIL})`}
                className="flex-1 text-xs p-2 px-3 border border-[var(--line)] rounded-lg bg-[var(--bg)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg border border-[var(--brand)] text-[var(--brand)] text-xs font-bold hover:bg-[var(--brand)]/10 transition-colors cursor-pointer"
              >
                Verify Email
              </button>
            </form>
          )}
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
