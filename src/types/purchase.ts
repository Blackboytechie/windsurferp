export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  gst_number: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery: string;
  status: 'draft' | 'pending' | 'received' | 'cancelled';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  po_id: string;
  bill_date: string;
  due_date: string;
  status: 'pending' | 'partial' | 'paid';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque';
  reference_number: string;
  notes: string;
  created_at: string;
}
