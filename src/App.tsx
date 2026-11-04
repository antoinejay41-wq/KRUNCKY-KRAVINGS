/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ProductGrid } from "./components/ProductGrid";
import { CartDrawer } from "./components/CartDrawer";
import { AdminModal } from "./components/AdminModal";
import { Footer } from "./components/Footer";
import { initialStoreConfig } from "./data/initialData";
import { StoreConfig, CartState } from "./types";

const STORE_CONFIG_KEY = "kk-store-config";
const CART_STORAGE_KEY = "kk-cart";
const THEME_STORAGE_KEY = "kk-theme";

export default function App() {
  // Store configuration state with localStorage persistence
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => {
    try {
      const saved = localStorage.getItem(STORE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.products && Array.isArray(parsed.products)) {
          // If stored WA is old placeholder or missing, update to configured number
          let wa = parsed.wa;
          if (!wa || wa === "15551234567") {
            wa = import.meta.env.VITE_WHATSAPP_NUMBER || initialStoreConfig.wa;
          }
          const shippingFee =
            typeof parsed.shippingFee === "number"
              ? parsed.shippingFee
              : (initialStoreConfig.shippingFee ?? 10.99);

          return {
            ...initialStoreConfig,
            ...parsed,
            wa,
            shippingFee,
          };
        }
      }
    } catch (e) {
      console.warn("Failed to load store config from localStorage", e);
    }
    return initialStoreConfig;
  });

  // Cart state with localStorage persistence
  const [cart, setCart] = useState<CartState>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load cart from localStorage", e);
    }
    return {};
  });

  // Theme state: dark by default to match provided screenshots
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark";
  });

  // Drawer / modal states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sync theme attribute on document root
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Sync page title with store name
  useEffect(() => {
    document.title = storeConfig.name || "Krunchy Kravings";
  }, [storeConfig.name]);

  // Save cart to localStorage
  const saveCart = (newCart: CartState) => {
    setCart(newCart);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newCart));
    } catch (e) {
      console.warn("Failed to save cart to localStorage", e);
    }
  };

  // Add to cart handler
  const handleAddToCart = (productId: string) => {
    const nextCart = {
      ...cart,
      [productId]: (cart[productId] || 0) + 1,
    };
    saveCart(nextCart);
    // Slide open cart drawer as in the reference experience
    setIsCartOpen(true);
  };

  // Update item quantity handler
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const current = cart[productId] || 0;
    const updated = Math.max(0, current + delta);
    const nextCart = { ...cart };

    if (updated === 0) {
      delete nextCart[productId];
    } else {
      nextCart[productId] = updated;
    }

    saveCart(nextCart);
  };

  // Save admin config handler
  const handleSaveConfig = (newConfig: StoreConfig) => {
    setStoreConfig(newConfig);
    try {
      localStorage.setItem(STORE_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.warn("Failed to save config to localStorage", e);
    }
  };

  // Reset to demo defaults handler
  const handleResetDefaults = () => {
    setStoreConfig(initialStoreConfig);
    try {
      localStorage.removeItem(STORE_CONFIG_KEY);
    } catch {}
  };

  // Calculate total count of items in cart
  const cartCount = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = storeConfig.products.find((p) => p.id === id);
    if (!product || product.soldOut) return sum;
    return sum + qty;
  }, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] selection:bg-[var(--brand)] selection:text-[var(--brand-ink)]">
      {/* Header */}
      <Header
        storeName={storeConfig.name}
        logo={storeConfig.logo}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
      />

      {/* Main Container */}
      <main className="max-w-[1040px] w-full mx-auto px-5 flex-1">
        {/* Hero Section */}
        <Hero headline={storeConfig.headline} sub={storeConfig.sub} />

        {/* Product Grid */}
        <ProductGrid
          products={storeConfig.products}
          cart={cart}
          onAddToCart={handleAddToCart}
        />
      </main>

      {/* Footer */}
      <Footer onOpenAdmin={() => setIsAdminOpen(true)} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={storeConfig.products}
        onUpdateQuantity={handleUpdateQuantity}
        storeName={storeConfig.name}
        whatsAppPhone={storeConfig.wa}
        shippingFee={storeConfig.shippingFee ?? 10.99}
      />

      {/* Store Admin Panel */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        config={storeConfig}
        onSaveConfig={handleSaveConfig}
        onResetDefaults={handleResetDefaults}
      />
    </div>
  );
}
