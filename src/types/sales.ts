import { Product } from '@/types/product';
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  gst_number: string;
  billing_address: string;
  shipping_address: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  contact_person?: string; 
  address?: string; 
}

export type SalesOrderStatus = 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface SalesOrder {
  id: string;
  order_number: string;
  so_number: string; 
  customer_id: string;
  customer?: Customer;
  order_date: string;
  delivery_date: string | null;
  status: SalesOrderStatus;
  shipping_address: string | null;
  billing_address: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  gst_rate?: number; 
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  so_id: string;
  invoice_date: string;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  updated_at: string;
}

export interface SalesPayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'upi';
  reference_number: string;
  notes: string;
  created_at: string;
}

export interface CustomerLedger {
  id: string;
  customer_id: string;
  date: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'debit_note';
  reference_id: string;
  reference_number: string;
  debit: number;
  credit: number;
  balance: number;
  notes: string;
  created_at: string;
}
