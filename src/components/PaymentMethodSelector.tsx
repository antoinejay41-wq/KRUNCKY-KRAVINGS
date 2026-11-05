import React, { useState } from "react";
import { PaymentConfig, PaymentMethod } from "../types";
import { formatMoney } from "../utils/format";
import { Check, Copy, ExternalLink, Smartphone } from "lucide-react";

interface PaymentMethodSelectorProps {
  paymentConfig: PaymentConfig;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  totalAmount: number;
}

// Cash App official-style vector logo
const CashAppLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="100" height="100" rx="22" fill="#00D632" />
    <path
      d="M58.2 38.6c-.3-1.8-1.5-3.3-3.4-4-1.9-.7-4.1-.7-6.2-.3l-.8.2 1-5.1c.1-.7-.3-1.4-1-1.6-.7-.1-1.4.3-1.6 1l-1.1 5.6-3.8.9c-.7.2-1.2.9-1 1.6.2.7.9 1.2 1.6 1l3.6-.8-3.4 17.5c-1.3 6.6 2.3 11.2 8.7 10.8l.9-.1-1.1 5.8c-.1.7.3 1.4 1 1.6.1 0 .2 0 .3 0 .6 0 1.2-.4 1.3-1l1.2-6.3 3.9-.9c.7-.2 1.2-.9 1-1.6-.2-.7-.9-1.2-1.6-1l-3.8.9 3.5-17.8c3.2-.9 6.2-3.3 5.7-7.8zm-11.4 17l2.8-14.4c2.8-.7 5 .6 4.6 3.6-.5 3.3-3.7 4.7-7.4 10.8zm2.2-17.5l-2.6 13.5c-2.4-.6-3.9-2.3-3.5-4.5.5-2.8 2.9-4.2 6.1-9z"
      fill="#FFFFFF"
    />
  </svg>
);

// Zelle official-style vector logo
const ZelleLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="100" height="100" rx="22" fill="#ffffffff" />
    <path
      d="M20 30h40L36 68H20v-8h16l14-22H20v-8zm24 40h36v8H44v-8zm24-34h12v8H68v-8z"
      fill="#7414CA"
    />
    <circle cx="74" cy="54" r="6" fill="#7414CA" />
  </svg>
);

// Apple Pay official-style vector badge
const ApplePayLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="100" height="100" rx="22" fill="#000000" />
    {/* Apple Icon */}
    <path
      d="M38.8 39.5c-1.5 1.8-3.6 2.9-5.7 2.7-.3-2.1.6-4.3 2-5.7 1.4-1.6 3.7-2.7 5.6-2.8.3 2.1-.5 4.1-1.9 5.8zm1.9 3.2c-3.1-.2-5.8 1.8-7.3 1.8-1.5 0-3.8-1.7-6.3-1.6-3.2.1-6.2 1.9-7.8 4.8-3.4 5.9-.9 14.6 2.4 19.3 1.6 2.3 3.5 4.9 6 4.8 2.4-.1 3.3-1.5 6.2-1.5s3.7 1.5 6.2 1.5c2.6 0 4.3-2.4 5.9-4.7 1.9-2.7 2.6-5.3 2.7-5.5-.1-.1-5.1-2-5.2-7.8-.1-4.9 4-7.2 4.2-7.4-2.3-3.4-5.9-3.7-7.2-3.9z"
      fill="#FFFFFF"
    />
    {/* Pay text glyph */}
    <path
      d="M56.2 39.6h6.7c3.7 0 6.2 2.4 6.2 5.8s-2.5 5.9-6.2 5.9h-3.6v8.4h-3.1v-20.1zm3.1 8.9h3.4c2.1 0 3.3-1.3 3.3-3.1 0-1.8-1.2-3.1-3.3-3.1h-3.4v6.2zm18 11.2c-1.6 0-3-.7-3.7-2l.1 1.9h-2.8v-14h2.8v1.9c.7-1.2 2.1-2 3.7-2 3.1 0 5.4 2.5 5.4 6.1s-2.3 6.1-5.5 6.1zm-.6-2.6c1.9 0 3.2-1.5 3.2-3.5 0-2-1.3-3.5-3.2-3.5-1.8 0-3.2 1.5-3.2 3.5 0 2 1.4 3.5 3.2 3.5zm11.7 8.2c-.8 2.2-2.1 3.2-4.2 3.2-.8 0-1.6-.2-2.1-.5l.6-2.4c.4.2.9.4 1.4.4 1.2 0 1.9-.6 2.4-2l.4-1.2-5.4-13h3.1l3.7 9.8 3.6-9.8h3.1l-6.6 15.5z"
      fill="#FFFFFF"
    />
  </svg>
);

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentConfig,
  selectedMethod,
  onSelectMethod,
  totalAmount,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = async (textToCopy: string, typeKey: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType(typeKey);
      setTimeout(() => {
        setCopiedType((prev) => (prev === typeKey ? null : prev));
      }, 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedType(typeKey);
      setTimeout(() => {
        setCopiedType((prev) => (prev === typeKey ? null : prev));
      }, 2000);
    }
  };

  // Helper to extract clean Cash App URL and handle
  const cleanCashAppUrl = () => {
    const raw = paymentConfig.cashApp.trim();
    if (!raw) return "https://cash.app";
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw;
    }
    const tag = raw.startsWith("$") ? raw : "$" + raw;
    return `https://cash.app/${tag}`;
  };

  // Deep-link to pay exact total on Cash App if URL has cashtag
  const getCashAppPayLink = () => {
    const baseUrl = cleanCashAppUrl();
    const formatted = totalAmount.toFixed(2);
    // If base URL already has a cashtag like https://cash.app/$11en11en
    if (baseUrl.includes("/$")) {
      return `${baseUrl}/${formatted}`;
    }
    return baseUrl;
  };

  // Apple Pay SMS or phone link
  const getApplePayNumberClean = () => {
    return paymentConfig.applePay.replace(/\D/g, "");
  };

  const getApplePayFormatted = () => {
    const digits = getApplePayNumberClean();
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return paymentConfig.applePay;
  };

  const applePaySmsLink = `sms:${getApplePayNumberClean()}?&body=${encodeURIComponent(
    `Hello Krunchy Kravings, sending payment of ${formatMoney(totalAmount)} for my order.`
  )}`;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          Select Payment Method
        </label>
      </div>

      {/* 3 Payment Options Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {/* Cash App Button */}
        <button
          type="button"
          onClick={() => onSelectMethod("cashapp")}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer relative ${
            selectedMethod === "cashapp"
              ? "border-[#00D632] bg-[#00D632]/10 shadow-[0_0_12px_rgba(0,214,50,0.18)]"
              : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--line)]/80 opacity-80 hover:opacity-100"
          }`}
        >
          {selectedMethod === "cashapp" && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00D632] text-black flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          <CashAppLogo className="w-7 h-7 mb-1" />
          <span className="text-xs font-bold text-[var(--ink)]">Cash App</span>
        </button>

        {/* Zelle Button */}
        <button
          type="button"
          onClick={() => onSelectMethod("zelle")}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer relative ${
            selectedMethod === "zelle"
              ? "border-[#7414CA] bg-[#7414CA]/12 shadow-[0_0_12px_rgba(116,20,202,0.22)]"
              : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--line)]/80 opacity-80 hover:opacity-100"
          }`}
        >
          {selectedMethod === "zelle" && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#7414CA] text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          <ZelleLogo className="w-7 h-7 mb-1" />
          <span className="text-xs font-bold text-[var(--ink)]">Zelle</span>
        </button>

        {/* Apple Pay Button */}
        <button
          type="button"
          onClick={() => onSelectMethod("applepay")}
          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer relative ${
            selectedMethod === "applepay"
              ? "border-white bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--line)]/80 opacity-80 hover:opacity-100"
          }`}
        >
          {selectedMethod === "applepay" && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          )}
          <ApplePayLogo className="w-7 h-7 mb-1" />
          <span className="text-xs font-bold text-[var(--ink)]">Apple Pay</span>
        </button>
      </div>

      {/* Action / Detail Card for Selected Method */}
      <div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] space-y-2.5 text-xs">
        {selectedMethod === "cashapp" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CashAppLogo className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm text-[var(--ink)]">
                  Pay with Cash App
                </span>
              </div>
              <span className="font-extrabold text-[var(--pink)] text-sm font-bagel">
                {formatMoney(totalAmount)}
              </span>
            </div>

            <p className="text-[var(--muted)] leading-relaxed">
              Tap the button below to launch Cash App with your exact order total, or copy the merchant handle.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={getCashAppPayLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-lg bg-[#00D632] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
              >
                <span>Open Cash App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => handleCopy(paymentConfig.cashApp, "cashapp")}
                className="py-2.5 px-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-1.5 hover:border-[#00D632] active:scale-[0.98] transition-all cursor-pointer"
              >
                {copiedType === "cashapp" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00D632]" />
                    <span className="text-[#00D632]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span>Copy Info</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {selectedMethod === "zelle" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ZelleLogo className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm text-[var(--ink)]">
                  Pay with Zelle
                </span>
              </div>
              <span className="font-extrabold text-[var(--pink)] text-sm font-bagel">
                {formatMoney(totalAmount)}
              </span>
            </div>

            <p className="text-[var(--muted)] leading-relaxed">
              Open your banking app and send payment via Zelle to the recipient below:
            </p>

            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[var(--muted)]">
                  Zelle Recipient
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-[var(--ink)] truncate">
                  {paymentConfig.zelle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(paymentConfig.zelle, "zelle")}
                className="py-1.5 px-2.5 rounded-md bg-[#7414CA] text-white font-bold text-xs flex items-center gap-1 hover:brightness-110 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
              >
                {copiedType === "zelle" ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-[var(--muted)]">
                Amount to send: <strong className="text-[var(--ink)]">{formatMoney(totalAmount)}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(totalAmount.toFixed(2), "zelle-amount")}
                className="text-[11px] font-bold text-[var(--brand)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedType === "zelle-amount" ? (
                  <span className="text-green-400">Copied!</span>
                ) : (
                  <span>Copy Amount</span>
                )}
              </button>
            </div>
          </div>
        )}

        {selectedMethod === "applepay" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ApplePayLogo className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm text-[var(--ink)]">
                  Pay with Apple Pay / Cash
                </span>
              </div>
              <span className="font-extrabold text-[var(--pink)] text-sm font-bagel">
                {formatMoney(totalAmount)}
              </span>
            </div>

            <p className="text-[var(--muted)] leading-relaxed">
              Send via Apple Cash in Messages to the contact number below, or tap to open Messages directly:
            </p>

            <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[var(--muted)]">
                  Apple Pay / Cash Contact
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-[var(--ink)] truncate">
                  {getApplePayFormatted()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(getApplePayNumberClean(), "applepay")}
                className="py-1.5 px-2.5 rounded-md bg-white text-black font-bold text-xs flex items-center gap-1 hover:bg-gray-200 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
              >
                {copiedType === "applepay" ? (
                  <>
                    <Check className="w-3 h-3 text-black" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-1">
              <a
                href={applePaySmsLink}
                className="w-full py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-bold text-xs flex items-center justify-center gap-1.5 hover:border-white active:scale-[0.98] transition-all"
              >
                <Smartphone className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span>Open in Messages (Apple Cash)</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
