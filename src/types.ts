export interface Product {
  id: string;
  name: string;
  price: number;
  img: string;
  soldOut: boolean;
}

export interface StoreConfig {
  name: string;
  logo: string;
  wa: string;
  headline: string;
  sub: string;
  shippingFee: number;
  products: Product[];
}

export type CartState = Record<string, number>;

export interface CustomerInfo {
  name: string;
  address: string;
  notes: string;
}
