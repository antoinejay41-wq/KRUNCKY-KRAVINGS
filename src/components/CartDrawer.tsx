import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { formatMoney, generateWhatsAppUrl } from "../utils/format";
import { X, Plus, Minus, ShoppingBag, Send, Trash2 } from "lucide-react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Record<string, number>;
  products: Product[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  storeName: string;
  whatsAppPhone: string;
  shippingFee?: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQuantity,
  storeName,
  whatsAppPhone,
  shippingFee = 10.99,
}) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Calculate items in cart
  const cartEntries = Object.entries(cart)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === id);
      return { product, qty, id };
    })
    .filter((entry): entry is { product: Product; qty: number; id: string } => {
      return entry.product !== undefined && !entry.product.soldOut;
    });

  const subtotalAmount = cartEntries.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  );

  const currentShippingFee = cartEntries.length > 0 ? shippingFee : 0;
  const totalAmount = subtotalAmount + currentShippingFee;

  const handleOrder = () => {
    const trimmedName = name.trim();
    const trimmedAddr = address.trim();

    if (!trimmedName || !trimmedAddr) {
      setErrorMessage("Enter your name and delivery address or city.");
      return;
    }

    setErrorMessage("");
    const url = generateWhatsAppUrl(
      whatsAppPhone,
      storeName,
      cart,
      products,
      trimmedName,
      trimmedAddr,
      notes.trim(),
      currentShippingFee
    );

    window.open(url, "_blank");
  };

  return (
    <>
      {/* Scrim / Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-[#14051e]/60 backdrop-blur-xs z-40 transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        id="drawer"
        role="dialog"
        aria-label="Your Cart"
        aria-modal="true"
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-[var(--surface)] text-[var(--ink)] z-50 flex flex-col shadow-2xl transition-transform duration-250 ease-in-out pt-[env(safe-area-inset-top,0px)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-bagel text-[22px] text-[var(--ink)] font-normal">
              Your cart
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="w-8 h-8 rounded-full flex items-center justify-center text-2xl text-[var(--ink)] hover:text-[var(--pink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-[var(--line)]">
          {cartEntries.length === 0 ? (
            <div className="py-14 text-center text-[var(--muted)] flex flex-col items-center justify-center gap-3">
              <ShoppingBag className="w-12 h-12 text-[var(--line)] stroke-[1.5]" />
              <p className="text-base max-w-[240px]">
                Your cart is empty. Add a package to get started.
              </p>
            </div>
          ) : (
            cartEntries.map(({ product, qty }) => (
              <div key={product.id} className="py-3 flex gap-3 items-center">
                <img
                  src={product.img}
                  alt={product.name}
                  className="w-12 h-[72px] object-cover rounded-md bg-white border border-[var(--line)] shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm sm:text-base text-[var(--ink)] truncate">
                    {product.name}
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
                    {formatMoney(product.price)} each
                  </div>
                  <div className="text-xs font-bold text-[var(--pink)] mt-0.5">
                    Subtotal: {formatMoney(product.price * qty)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(product.id, -1)}
                    aria-label={`Decrease ${product.name} quantity`}
                    className="w-[30px] h-[30px] rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center font-bold hover:border-[var(--brand)] active:scale-95 transition-all cursor-pointer"
                  >
                    {qty === 1 ? (
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="font-bold text-sm w-6 text-center select-none">
                    {qty}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(product.id, 1)}
                    aria-label={`Increase ${product.name} quantity`}
                    className="w-[30px] h-[30px] rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] flex items-center justify-center font-bold hover:border-[var(--brand)] active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer with Customer Fields and Checkout */}
        {cartEntries.length > 0 && (
          <div className="p-5 border-t border-[var(--line)] bg-[var(--surface)] grid gap-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            {/* Price Breakdown */}
            <div className="space-y-1.5 pb-2 border-b border-[var(--line)]">
              <div className="flex justify-between items-baseline text-sm text-[var(--muted)]">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--ink)]">
                  {formatMoney(subtotalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-baseline text-sm text-[var(--muted)]">
                <span>Shipping</span>
                <span className="font-semibold text-[var(--ink)]">
                  {formatMoney(currentShippingFee)}
                </span>
              </div>
              <div className="flex justify-between items-baseline font-extrabold text-lg pt-1">
                <span className="font-bagel text-xl text-[var(--ink)]">Total</span>
                <span className="font-bagel text-2xl text-[var(--pink)]">
                  {formatMoney(totalAmount)}
                </span>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Your name"
                autoComplete="name"
                className="w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--muted)]/70 focus:border-[var(--brand)] focus:outline-none"
              />
            </div>

            <div>
              <input
                id="addr"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Delivery address or city"
                autoComplete="street-address"
                className="w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--muted)]/70 focus:border-[var(--brand)] focus:outline-none"
              />
            </div>

            <div>
              <textarea
                id="note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notes (optional)"
                className="w-full text-sm sm:text-base p-2.5 px-3 border border-[var(--line)] rounded-[10px] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--muted)]/70 focus:border-[var(--brand)] focus:outline-none resize-none"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="text-[#d0384a] text-xs sm:text-sm font-semibold min-h-[1.25rem] py-0.5"
              >
                {errorMessage}
              </div>
            )}

            {/* WhatsApp Checkout Button */}
            <button
              onClick={handleOrder}
              className="w-full bg-[var(--wa)] text-[var(--wa-ink)] border-0 rounded-[12px] p-3.5 font-extrabold text-[16px] flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <Send className="w-5 h-5" />
              <span>Order on WhatsApp</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
