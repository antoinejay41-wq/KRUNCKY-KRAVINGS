import React from "react";
import { Settings } from "lucide-react";

interface FooterProps {
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
  return (
    <footer className="border-t border-[var(--line)] py-6 text-sm text-[var(--muted)]">
      <div className="max-w-[1040px] mx-auto px-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <span>
          Payment and delivery are arranged on WhatsApp after you send your order. Standard shipping: $10.99.
        </span>

        <button
          onClick={onOpenAdmin}
          className="bg-transparent border-0 text-[var(--brand)] hover:text-[var(--pink)] font-extrabold text-sm p-0 cursor-pointer transition-colors inline-flex items-center gap-1.5"
          aria-label="Open Store Admin"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>
      </div>
    </footer>
  );
};
