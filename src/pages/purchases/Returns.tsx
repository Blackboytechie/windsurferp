import { useState, useEffect } from 'react';
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

  interface Supplier {
    id: string;
    name: string;
  }

  interface Product {
    id: string;
    name: string;
    quantity: number;
    bill_number: string;
    bill_id: string;
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

  interface BillItem {
    product_id: string;
    bill: {
      id: string;
      bill_number: string;
      purchase_order: {
        supplier_id: string;
      };
    };
  }

  const fetchSupplierProducts = async (supplierId: string) => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .gt('stock_quantity', 0);

      if (productsError) throw productsError;

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
        .eq('bill.purchase_order.supplier_id', supplierId) as { data: BillItem[] | null; error: any };

      if (billsError) throw billsError;
      if (!products || !billItems) return;

      const supplierProductIds = new Set(billItems.map(item => item.product_id));
      const availableProducts = products
        .filter(product => supplierProductIds.has(product.id))
        .map(product => {
          const billItem = billItems.find(item => item.product_id === product.id);
          return {
            id: product.id,
            name: product.name,
            quantity: product.stock_quantity,
            bill_id: billItem?.bill?.id,
            bill_number: billItem?.bill?.bill_number
          };
        });

      setSupplierProducts(availableProducts
        .filter((product): product is (Product & { bill_id: string; bill_number: string }) => 
          product.bill_id !== undefined && 
          product.bill_number !== undefined
        )
        .map(product => ({
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          bill_number: product.bill_number,
          bill_id: product.bill_id // Added missing bill_id property
        }))
      );
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
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
