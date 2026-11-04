import React, { useState, useEffect } from "react";
import { StoreConfig, Product } from "../types";
import { resizeImageFile } from "../utils/format";
import { X, Upload, Plus, Trash2, RotateCcw, Check, AlertCircle } from "lucide-react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StoreConfig;
  onSaveConfig: (newConfig: StoreConfig) => void;
  onResetDefaults: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetDefaults,
}) => {
  const [draft, setDraft] = useState<StoreConfig>(config);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Sync draft when opened or when config changes
  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(config)));
      setFeedback(null);
    }
  }, [isOpen, config]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImageFile(file, 600, "image/png");
      setDraft((prev) => ({ ...prev, logo: resized }));
      setFeedback(null);
    } catch {
      setFeedback({ type: "error", text: "Logo image couldn’t be processed. Try a valid PNG or JPG." });
    }
  };

  const handleProductImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resized = await resizeImageFile(file, 840, "image/jpeg");
      setDraft((prev) => {
        const nextProducts = [...prev.products];
        nextProducts[index] = { ...nextProducts[index], img: resized };
        return { ...prev, products: nextProducts };
      });
      setFeedback(null);
    } catch {
      setFeedback({ type: "error", text: "Product image couldn’t be processed. Try a valid JPG or PNG." });
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
    if (window.confirm("Are you sure you want to delete this product package?")) {
      setDraft((prev) => {
        const nextProducts = prev.products.filter((_, i) => i !== index);
        return { ...prev, products: nextProducts };
      });
    }
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

  const handleSave = () => {
    let cleanWa = String(draft.wa).replace(/\D/g, "");
    if (!cleanWa) {
      setFeedback({ type: "error", text: "Please provide a valid WhatsApp number with country code." });
      return;
    }
    if (cleanWa.length === 10) {
      cleanWa = "1" + cleanWa;
    }

    const cleanedProducts = draft.products.map((p) => ({
      ...p,
      price: Math.max(0, parseFloat(String(p.price)) || 0),
      name: p.name.trim() || "Package",
    }));

    const finalConfig: StoreConfig = {
      ...draft,
      wa: cleanWa,
      shippingFee: typeof draft.shippingFee === "number" ? Math.max(0, draft.shippingFee) : 10.99,
      name: draft.name.trim() || "Krunchy Kravings",
      headline: draft.headline.trim() || "Satisfy your krave.",
      sub: draft.sub.trim() || "Pick a size, add it to your cart, and finish your order with us on WhatsApp.",
      products: cleanedProducts,
    };

    onSaveConfig(finalConfig);
    setFeedback({ type: "success", text: "Store settings saved and published successfully!" });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      id="admin"
      role="dialog"
      aria-modal="true"
      aria-label="Store Admin"
      className="fixed inset-0 bg-[var(--bg)] z-50 overflow-y-auto pt-[env(safe-area-inset-top,0px)]"
    >
      <div className="max-w-[640px] mx-auto px-5 pb-28 pt-4">
        {/* Header */}
        <div className="flex justify-between items-center py-4 border-b border-[var(--line)] mb-5">
          <h2 className="font-bagel text-2xl sm:text-3xl text-[var(--brand)] font-normal">
            Store admin
          </h2>
          <button
            onClick={onClose}
            aria-label="Close admin"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--ink)] hover:text-[var(--pink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

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
              placeholder="e.g. 15551234567"
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
              onChange={(e) => setDraft({ ...draft, shippingFee: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--surface)] text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none font-mono"
            />
          </label>

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

          {/* Logo Editor */}
          <div className="text-sm font-semibold text-[var(--ink)]">
            <span>Store Logo</span>
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
                  <Upload className="w-4 h-4 text-[var(--brand)]" />
                  <span>Upload new logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-[var(--muted)] mt-1.5">
                  Best with a transparent PNG or clean SVG/JPG logo
                </p>
              </div>
            </div>
          </div>

          {/* Products Catalog Editor */}
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
                  {/* Thumbnail & image change */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-16 h-24 object-cover rounded-lg bg-white border border-gray-200"
                    />
                    <label className="text-[11px] font-bold text-[var(--brand)] hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      <span>Change</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProductImageUpload(index, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Product Details Form */}
                  <div className="flex-1 grid gap-2">
                    <div>
                      <span className="text-xs font-semibold text-[var(--muted)]">Product name</span>
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
                        <span className="text-xs font-semibold text-[var(--muted)]">Price ($)</span>
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
                            onChange={(e) => handleUpdateProduct(index, "soldOut", e.target.checked)}
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
                if (window.confirm("Reset all products and text back to original Krunchy Kravings demo defaults?")) {
                  onResetDefaults();
                  onClose();
                }
              }}
              className="text-xs font-bold text-[var(--muted)] hover:text-[var(--pink)] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset store to original demo defaults</span>
            </button>
          </div>
        </div>

        {/* Feedback message */}
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
        <div className="max-w-[640px] mx-auto flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-extrabold text-base hover:bg-[var(--surface)]/80 active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-[12px] border-0 bg-[var(--brand)] text-[var(--brand-ink)] font-extrabold text-base hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            Save and publish
          </button>
        </div>
      </div>
    </div>
  );
};
