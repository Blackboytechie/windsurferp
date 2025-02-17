import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReturnHistory from './ReturnHistory';
import ReturnForm from './ReturnForm';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types/sales';

export default function Returns() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerProducts, setCustomerProducts] = useState<Product[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('new-return');
  const [reason, setReason] = useState<string>('');

  interface Product {
    id: string;
    name: string;
    quantity: number;
    order_number: string;
  }

  interface ReturnItem {
    product_id: string;
    product_name: string;
    order_id: string;
    order_number: string;
    quantity: number;
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setMessage({ type: 'error', text: 'Error fetching customers.' });
      setLoading(false);
    }
  };

  const fetchCustomerProducts = async (customerId: string) => {
    try {
      // First get the products and their current quantity
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .gt('stock_quantity', 0);  // Only get products with quantity > 0

      if (productsError) throw productsError;

      // Then get the sales orders for these products from this customer
      const { data: orderItems, error: ordersError } = await supabase
        .from('sales_order_items')
        .select(`
          product_id,
          sales_order:sales_orders(
            id,
            order_number,
            customer_id
          )
        `)
        .eq('sales_order.customer_id', customerId);

      if (ordersError) throw ordersError;

      // Filter products that have orders from this customer
      const customerProductIds = new Set(orderItems?.map(item => item.product_id) || []);
      const availableProducts = products
        .filter(product => customerProductIds.has(product.id))
        .map(product => {
          const orderItem = orderItems?.find(item => item.product_id === product.id);
          return {
            id: product.id,
            name: product.name,
            quantity: product.stock_quantity,
            order_id: orderItem?.sales_order?.id,
            order_number: orderItem?.sales_order?.order_number
          };
        });

      setCustomerProducts(availableProducts);
    } catch (error) {
      console.error('Error fetching customer products:', error);
      setMessage({ type: 'error', text: 'Error fetching products.' });
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    setCustomerProducts([]);
    setReturnItems([]);
    setSelectedProduct('');
    if (customerId) {
      fetchCustomerProducts(customerId);
    }
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    setQuantity(0);
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity < 0) return;

    const product = customerProducts.find(p => p.id === selectedProduct);
    if (!product) return;

    // Check if item already exists
    const existingItemIndex = returnItems.findIndex(item => item.product_id === selectedProduct);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...returnItems];
      const currentItem = updatedItems[existingItemIndex];
      const newQuantity = currentItem.quantity + quantity;

      if (newQuantity > product.quantity) {
        setMessage({ type: 'error', text: 'Cannot exceed available quantity.' });
        return;
      }

      updatedItems[existingItemIndex] = {
        ...currentItem,
        quantity: newQuantity
      };
      setReturnItems(updatedItems);
    } else {
      // Add new item
      if (quantity > product.quantity) {
        setMessage({ type: 'error', text: 'Cannot exceed available quantity.' });
        return;
      }

      setReturnItems([
        ...returnItems,
        {
          product_id: product.id,
          product_name: product.name,
          order_id: product.order_id,
          order_number: product.order_number,
          quantity
        }
      ]);
    }

    setSelectedProduct('');
    setQuantity(0);
    setMessage(null);
  };

  const handleRemoveItem = (productId: string) => {
    setReturnItems(returnItems.filter(item => item.product_id !== productId));
  };

  const handleQuantityChange = (value: number) => {
    if (value < 0) return;
    
    const product = customerProducts.find(p => p.id === selectedProduct);
    if (product && value <= product.quantity) {
      setQuantity(value);
      setMessage(null);
    } else {
      setMessage({ type: 'error', text: 'Cannot exceed available quantity.' });
    }
  };

  const handleSubmit = async (reason: string) => {
    if (returnItems.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one item to return.' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      // Generate return number (SR-YYYYMMDD-XXX format)
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get the last return number for today
      const { data: lastReturn } = await supabase
        .from('sales_returns')
        .select('return_number')
        .ilike('return_number', `SR-${dateStr}-%`)
        .order('return_number', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (lastReturn && lastReturn.length > 0) {
        const lastSequence = parseInt(lastReturn[0].return_number.split('-')[2]);
        sequence = lastSequence + 1;
      }

      const returnNumber = `SR-${dateStr}-${sequence.toString().padStart(3, '0')}`;

      // Calculate totals
      const total = returnItems.reduce((sum, item) => {
        const product = customerProducts.find(p => p.id === item.product_id);
        if (!product) return sum;
        return sum + (product.quantity * item.quantity);
      }, 0);

      // Create return record
      const { data: returnData, error: returnError } = await supabase
        .from('sales_returns')
        .insert([
          {
            return_number: returnNumber,
            customer_id: selectedCustomer,
            return_date: new Date().toISOString(),
            status: 'pending',
            total_amount: total,
            reason: reason,
            notes: '',
          }
        ])
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItemsData = returnItems.map(item => ({
        return_id: returnData.id,
        product_id: item.product_id,
        order_id: item.order_id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sales_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Reset form
      setReturnItems([]);
      setSelectedProduct('');
      setQuantity(1);
      setMessage({ type: 'success', text: 'Return created successfully.' });
      setActiveTab('return-history');
    } catch (error) {
      console.error('Error creating return:', error);
      setMessage({ type: 'error', text: 'Failed to create return. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-return">New Return</TabsTrigger>
          <TabsTrigger value="return-history">Return History</TabsTrigger>
        </TabsList>

        <TabsContent value="new-return" className="space-y-4">
          <ReturnForm
            customers={customers}
            selectedCustomer={selectedCustomer}
            onCustomerChange={handleCustomerChange}
            products={customerProducts}
            selectedProduct={selectedProduct}
            onProductChange={handleProductChange}
            quantity={quantity}
            onQuantityChange={handleQuantityChange}
            onAddItem={handleAddItem}
            returnItems={returnItems}
            onRemoveItem={handleRemoveItem}
            onSubmit={(reason) => handleSubmit(reason)}
            message={message}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="return-history">
          <ReturnHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
