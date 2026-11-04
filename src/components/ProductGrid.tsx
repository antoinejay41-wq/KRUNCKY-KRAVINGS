import React from "react";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  cart: Record<string, number>;
  onAddToCart: (productId: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  cart,
  onAddToCart,
}) => {
  return (
    <section aria-label="Products" className="pb-14">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantityInCart={cart[product.id] || 0}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
};
