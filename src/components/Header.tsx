import React from "react";
import { ShoppingBag, Moon, Sun } from "lucide-react";

interface HeaderProps {
  storeName: string;
  logo: string;
  cartCount: number;
  onOpenCart: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  storeName,
  logo,
  cartCount,
  onOpenCart,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)] border-b border-[var(--line)] backdrop-blur-md transition-colors duration-200">
      <div className="max-w-[1040px] mx-auto px-5 h-[68px] flex items-center justify-between">
        {/* Logo Badge */}
        <div className="flex items-center">
          <div className="bg-[var(--chip)] rounded-[10px] px-2 py-1 flex items-center shadow-xs transition-colors">
            {logo ? (
              <img
                src={logo}
                alt={storeName}
                className="h-[44px] w-auto max-w-[180px] object-contain select-none"
              />
            ) : (
              <span className="font-bagel text-2xl text-[var(--brand)] tracking-tight">
                {storeName}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-2 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--brand)] transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-purple-700" />
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            aria-label="Open cart"
            className="bg-[var(--brand)] text-[var(--brand-ink)] font-extrabold rounded-full px-4 sm:px-5 py-2 text-[15px] flex items-center gap-2 transition-transform active:scale-95 hover:brightness-105 cursor-pointer shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 hidden xs:block" />
            <span>Cart ({cartCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
