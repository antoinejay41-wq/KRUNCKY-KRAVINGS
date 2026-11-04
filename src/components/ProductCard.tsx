import React from "react";
import { Product } from "../types";
import { formatMoney } from "../utils/format";
import { Plus, Check } from "lucide-react";

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
}) => {
  const [justAdded, setJustAdded] = React.useState(false);

  const handleAdd = () => {
    if (product.soldOut) return;
    onAddToCart(product.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <article className="bg-[var(--surface)] border border-[var(--line)] rounded-[18px] overflow-hidden flex flex-col transition-all duration-200 hover:border-[var(--brand)]/50 hover:shadow-lg hover:shadow-[var(--brand)]/10 group">
      {/* Product Image Container */}
      <div className="relative w-full aspect-[2/3] bg-white overflow-hidden flex items-center justify-center">
        <img
          src={product.img}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Sold out overlay */}
        {product.soldOut && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
            <span className="font-bagel text-white text-xl bg-red-600/90 px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
              Sold Out
            </span>
          </div>
        )}

        {/* Cart quantity indicator pill if in cart */}
        {quantityInCart > 0 && !product.soldOut && (
          <div className="absolute top-3 left-3 bg-[var(--brand)] text-[var(--brand-ink)] font-extrabold text-xs px-2.5 py-1 rounded-full shadow-md">
            {quantityInCart} in cart
          </div>
        )}
      </div>

      {/* Info & Action Section */}
      <div className="p-4 flex flex-col gap-3 flex-1 justify-between">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="font-bagel text-[19px] text-[var(--ink)] font-normal leading-snug">
            {product.name}
          </h3>
          <span className="font-bagel text-[24px] text-[var(--pink)] shrink-0">
            {formatMoney(product.price)}
          </span>
        </div>

        <button
          onClick={handleAdd}
          disabled={product.soldOut}
          aria-label={product.soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
          className={`w-full border-0 rounded-[12px] p-3 text-[16px] font-extrabold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.98] ${
            product.soldOut
              ? "bg-[var(--line)] text-[var(--muted)] opacity-50 cursor-not-allowed"
              : justAdded
              ? "bg-[var(--wa)] text-[var(--wa-ink)]"
              : "bg-[var(--brand)] text-[var(--brand-ink)] hover:brightness-110 shadow-xs"
          }`}
        >
          {product.soldOut ? (
            "Sold out"
          ) : justAdded ? (
            <>
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Added to cart</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add to cart</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
