import { Product } from "../types";

export const formatMoney = (amount: number): string => {
  return "$" + Number(amount || 0).toFixed(2);
};

export const cleanWhatsAppPhone = (phone: string): string => {
  let digits = String(phone || "").replace(/\D/g, "");
  // If 10 digits (e.g. 8293252829 for Dominican Republic / NANP), prefix with country code 1
  if (digits.length === 10) {
    digits = "1" + digits;
  }
  return digits || "18293252829";
};

export const generateWhatsAppUrl = (
  phone: string,
  storeName: string,
  cart: Record<string, number>,
  products: Product[],
  name: string,
  address: string,
  notes?: string,
  shippingFee: number = 10.99
): string => {
  const cleanPhone = cleanWhatsAppPhone(phone);
  
  const lines: string[] = [];
  let subtotal = 0;

  for (const [productId, quantity] of Object.entries(cart)) {
    if (quantity <= 0) continue;
    const product = products.find((p) => p.id === productId);
    if (!product || product.soldOut) continue;

    const itemTotal = product.price * quantity;
    subtotal += itemTotal;
    lines.push(`• ${quantity} x ${product.name} (${formatMoney(itemTotal)})`);
  }

  const grandTotal = subtotal + (lines.length > 0 ? shippingFee : 0);

  const message = [
    `Hello ${storeName}! I’d like to place an order:`,
    "",
    ...lines,
    "",
    `Subtotal: ${formatMoney(subtotal)}`,
    `Shipping: ${formatMoney(shippingFee)}`,
    `Total: ${formatMoney(grandTotal)}`,
    "",
    `Name: ${name}`,
    `Delivery: ${address}`,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const resizeImageFile = (
  file: File,
  maxDimension: number,
  outputType: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(outputType, 0.82));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file"));
    };

    img.src = objectUrl;
  });
};
