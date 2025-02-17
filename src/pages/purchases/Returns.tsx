import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReturnHistory from './ReturnHistory';
import ReturnForm from './ReturnForm';
import { supabase } from '@/lib/supabase';

export default function Returns() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [supplierProducts, setSupplierProducts] = useState<Product[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('new-return');

  interface Supplier {
    id: string;
    name: string;
  }

  interface Product {
    id: string;
    name: string;
    quantity: number;
    bill_number: string;
  }

  interface ReturnItem {
    product_id: string;
    product_name: string;
    bill_id: string;
    bill_number: string;
    quantity: number;
  }

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setMessage({ type: 'error', text: 'Error fetching suppliers.' });
      setLoading(false);
    }
  };

  const fetchSupplierProducts = async (supplierId: string) => {
    try {
      // First get the products and their current quantity
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .gt('stock_quantity', 0);  // Only get products with quantity > 0

      if (productsError) throw productsError;

      // Then get the bills for these products from this supplier
      const { data: billItems, error: billsError } = await supabase
        .from('bill_items')
        .select(`
          product_id,
          bill:bills(
            id,
            bill_number,
            purchase_order:purchase_orders(
              supplier_id
            )
          )
        `)
        .eq('bill.purchase_order.supplier_id', supplierId);

      if (billsError) throw billsError;

      // Filter products that have bills from this supplier
      const supplierProductIds = new Set(billItems.map(item => item.product_id));
      const availableProducts = products
        .filter(product => supplierProductIds.has(product.id))
        .map(product => {
          const billItem = billItems.find(item => item.product_id === product.id);
          return {
            id: product.id,
            name: product.name,
            quantity: product.stock_quantity, // Use current quantity from products table
            bill_id: billItem?.bill.id,
            bill_number: billItem?.bill.bill_number
          };
        });

      setSupplierProducts(availableProducts);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      setMessage({ type: 'error', text: 'Error fetching products.' });
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    setSelectedProduct('');
    setQuantity(1);
    setReturnItems([]);
    fetchSupplierProducts(supplierId);
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity < 1) {
      setMessage({ type: 'error', text: 'Please select a product and enter a valid quantity.' });
      return;
    }

    const product = supplierProducts.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem: ReturnItem = {
      product_id: product.id,
      product_name: product.name,
      bill_id: product.bill_id,
      bill_number: product.bill_number,
      quantity: quantity
    };

    setReturnItems([...returnItems, newItem]);
    setSelectedProduct('');
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...returnItems];
    newItems.splice(index, 1);
    setReturnItems(newItems);
  };

  const handleSubmitReturn = async () => {
    try {
      if (returnItems.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one item to return.' });
        return;
      }

      const { error } = await supabase
        .from('purchase_returns')
        .insert(
          returnItems.map(item => ({
            bill_id: item.bill_id,
            product_id: item.product_id,
            quantity: item.quantity,
            status: 'pending'
          }))
        );

      if (error) throw error;

      setMessage({ type: 'success', text: 'Returns processed successfully!' });
      setReturnItems([]);
    } catch (error) {
      console.error('Error processing returns:', error);
      setMessage({ type: 'error', text: 'Error processing returns.' });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="new-return" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-return">New Return</TabsTrigger>
          <TabsTrigger value="history">Return History</TabsTrigger>
        </TabsList>
        <TabsContent value="new-return">
          <ReturnForm
            suppliers={suppliers}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
            supplierProducts={supplierProducts}
            returnItems={returnItems}
            setReturnItems={setReturnItems}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            quantity={quantity}
            setQuantity={setQuantity}
            message={message}
            setMessage={setMessage}
            handleSupplierChange={handleSupplierChange}
            handleAddItem={handleAddItem}
            handleRemoveItem={handleRemoveItem}
            handleSubmitReturn={handleSubmitReturn}
          />
        </TabsContent>
        <TabsContent value="history">
          <ReturnHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
