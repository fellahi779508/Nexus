import { exportTraceState } from "next/dist/trace";

export type Product = {
  name: string;
  category: Category;
  id: number;
  createdAt: string;
  updatedAt: string;
};
export type PostProduct = {
  name: string;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
};
export type Category = {
  name: string;
  id: number;
};
export type PostCategory = {
  name: string;
};
export type Meta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};
export type PostVarinat = {
  name: string;
  barcode: string;
  size?: string;
  color?: string;
  weight?: string;
  height?: string;
  flavor?: string;
  productId: number;
  fabricationDate?: string | null;
  expirationDate?: string | null;
  supplierId?: number;
  quantity: number;
  alertPeriodPerDay?: number;
  alertPeriodPerStock?: number;
  purchasePrice: number;
  sellingPriceHT: number;
  profit: number;
  profitRate: number;
  sellingPriceTTC: number;
  promotionPrice?: number;
  promotionRate?: number;
  vatRate: number;
  PPA?: number;
  nLot?: string;
};
export type DetailedProduct = {
  name: string;
  category: Category;
  id: number;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
};
export type Variant = {
  id: number;
  name: string;
  barcode: string;
  size?: string;
  color?: string;
  weight?: number;
  height?: number;
  flavor?: string;
  batches: Batch[];
  createdAt: string;
  updatedAt: string;
  purchasePrice: number;
  sellingPriceHT: number;
  sellingPriceTTC: number;
  vatRate: number;
  promotionPrice?: number;
  promotionRate?: number;
  profit: number;
  profitRate: number;
  PPA?: number;
  product: Product;
};
export type Batch = {
  nLot?: string;
  fabricationDate?: string;
  expirationDate?: string;
  supplier: Supplier | null;
  alertPeriodPerDay?: number;
  alertPeriodPerStock?: number;
  stockQTYStatus: string;
  status: string;
  stock: Stock;
  createdAt: string;
  updatedAt: string;
  id: number;
  variant: Variant;
};
export type Stock = {
  createdAt: string;
  updatedAt: string;
  id: number;
  quantity: number;
  batch: Batch;
};
export type Supplier = {
  createdAt: string;
  updatedAt: string;
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
};
export type PostSupplier = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};
export type PostBatch = {
  nLot?: string;
  fabricationDate?: string;
  expirationDate?: string;
  supplierId?: number;
  quantity: number;
  alertPeriodPerDay?: number;
  alertPeriodPerStock?: number;
  variantId: number;
  primary: boolean;
};
export type PostSale = {
  total: number;
  clientId?: number;
  paid: number;
  isDetailed: boolean;
  date: string;
  payment_methode: string;
  remise: boolean;
  timbre: number;
  remiseAmount: number;
  printType?: string;
  soldItems: {
    batchId: number;
    quantity: number;
    sellingPrice: number;
  }[];
};
export type Cart = {
  total: number;
  soldItems: {
    id?: number;
    name: string;
    barcode: string;
    batchId: number;
    maxStock: number;
    unit: string;
    qtePerUnit: number;
    quantity: number;
    total: number;
    sellingPriceTTC: number;
  }[];
};
export type PurchaseCart = {
  total: number;
  purchasedItems: {
    id?: number;
    name: string;
    barcode: string;
    batchId: number;
    maxStock: number;
    unit: string;
    qtePerUnit: number;
    quantity: number;
    total: number;
    sellingPriceTTC: number;
  }[];
};

export type Client = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
};
export type PostClient = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};
export type Sale = {
  id: number;
  total: number;
  paid: number;
  remise: boolean;
  timbre: number;
  remiseAmount: number;
  payment_methode: string;
  date: string;
  soldItems: SoldItem[];
  client: Client | null;
};
export type SoldItem = {
  id?: number;
  batchId: number;
  quantity: number;
  unit: number;
  qtePerUnit: number;
  sellingPrice: number;
  batch: Batch;
};
export type PostPurchase = {
  total: number;
  supplierId?: number;
  paid: number;
  remise: boolean;
  isDetailed: boolean;
  remiseAmount: number;
  payment_method: string;
  timbre: number;
  date: string;
  purchasedItems: {
    batchId: number;
    quantity: number;
    unit: string;
    qtePerUnit: number;
    sellingPrice: number;
  }[];
};
export type Purchase = {
  id: number;
  total: number;
  paid: number;
  remise: boolean;
  remiseAmount: number;
  payment_method: string;
  date: string;

  timbre: number;
  supplier: Supplier | null;
  credit: Credit | null;
  purchasedItems: PurchasedItem[];
};
export type PurchasedItem = {
  id?: number;
  quantity: number;
  unit: string;
  qtePerUnit: number;
  sellingPrice: number;
  batch: Batch;
};
export type Credit = {
  id: number;
  amount: number;
  date: string;
  sale: Sale | null;
  stockPayment: Purchase | null;
  logs: Log[];
};
export type Log = {
  id: number;
  timestamp: string;
  entityType: string;
  action: string;
  reason: string;
  quantity: number;
  sale: Sale | null;
  client: Client | null;
  supplier: Supplier | null;
  batch: Batch | null;
  stock: Stock | null;
  credit: Credit | null;
  stockPayment: Purchase | null;
};
