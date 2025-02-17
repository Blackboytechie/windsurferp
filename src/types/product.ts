export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  tax_rate: number;
  stock_quantity: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}
