export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  stock_level: number;
  reorder_level: number;
  purchase_price: number;
  selling_price: number;
  gst_rate: number;
  created_at: string;
  updated_at: string;
  tax_rate?: number;
  stock_quantity: number;
  min_stock_level: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  reference_type: 'purchase' | 'sale' | 'adjustment';
  reference_id: string;
  notes: string;
  created_at: string;
}

export interface ProductFilter {
  category?: string;
  search?: string;
  lowStock?: boolean;
  sortBy?: 'name' | 'stock_level' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
