export interface Product {
  id: string;
  name: string;
  price: number;
  img: string;
  soldOut: boolean;
}

export interface PaymentConfig {
  cashApp: string;
  zelle: string;
  applePay: string;
}

export type PaymentMethod = "cashapp" | "zelle" | "applepay";

export interface StoreConfig {
  name: string;
  logo: string;
  wa: string;
  headline: string;
  sub: string;
  shippingFee: number;
  products: Product[];
  payment?: PaymentConfig;
}

export type CartState = Record<string, number>;

export interface CustomerInfo {
  name: string;
  address: string;
  notes: string;
}
