import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RawReturnData {
  id: string;
  bill_id: string;
  product_id: string;
  quantity: number;
  status: string;
  product: {
    name: string | null;
  } | null;
  bill: {
    bill_number: string | null;
    purchase_order: {
      supplier: {
        id: string;
        name: string;
      } | null;
    } | null;
  } | null;
}

interface Return {
  id: string;
  bill_id: string;
  product_id: string;
  quantity: number;
  status: string;
  product: {
    name: string;
  };
  bill: {
    bill_number: string;
    purchase_order?: {
      supplier?: {
        id: string;
        name: string;
      };
    };
  };
}

interface FormattedReturn extends Return {}

export default function ReturnHistory() {
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<FormattedReturn[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; }[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [stockLevel, setStockLevel] = useState<number | null>(null);

  useEffect(() => {
    fetchSuppliers();
    fetchReturns();
    fetchUniqueStatuses();
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [selectedStatus, selectedSupplier]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchReturns = async () => {
    try {
      console.log('Fetching returns with status:', selectedStatus);
      setLoading(true);
      let query = supabase
        .from('purchase_returns')
        .select(`
          id,
          bill_id,
          product_id,
          quantity,
          status,
          bill:bills(
            bill_number,
            purchase_order:purchase_orders(
              supplier:suppliers(
                id,
                name
              )
            )
          ),
          product:products(name)
        `)
        .order('id', { ascending: false });

      if (selectedSupplier !== 'all') {
        query = query.eq('bill.purchase_orders.supplier.id', selectedSupplier);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const formattedReturns = (data as unknown as RawReturnData[])?.map(item => ({
        id: item.id,
        bill_id: item.bill_id,
        product_id: item.product_id,
        quantity: item.quantity,
        status: item.status,
        product: {
          name: item.product?.name || ''
        },
        bill: {
          bill_number: item.bill?.bill_number ?? '',
          purchase_order: item.bill?.purchase_order ? {
            supplier: item.bill.purchase_order.supplier ? {
              id: String(item.bill.purchase_order.supplier.id),
              name: String(item.bill.purchase_order.supplier.name)
            } : undefined
          } : undefined
        }
      })) || [];
      
      setReturns(formattedReturns.map(item => ({
        ...item,
        product: {
          name: item.product?.name ?? ''
        },
        bill: {
          ...item.bill,
          purchase_order: item.bill.purchase_order ? {
            supplier: item.bill.purchase_order.supplier ? {
              id: String(item.bill.purchase_order.supplier.id),
              name: String(item.bill.purchase_order.supplier.name)
            } : undefined
          } : undefined
        }
      })) as Return[]);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUniqueStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_returns')
        .select('status'); // Fetch all statuses

      if (error) throw error;

      // Extract unique statuses using a Set
      const uniqueStatuses = new Set(data.map(item => item.status));
      console.log('Unique statuses:', Array.from(uniqueStatuses));
    } catch (error) {
      console.error('Error fetching unique statuses:', error);
    }
  };

  const handleStatusChange = (value: string) => {
    console.log('Changing status to:', value);
    setSelectedStatus(value);
  };

  const handleSupplierChange = (value: string) => {
    console.log('Changing supplier to:', value);
    setSelectedSupplier(value);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateStatus = async (returnId: string, newStatus: string) => {
    try {
      // Start a Supabase transaction
      const { data: returnData, error: returnError } = await supabase
        .from('purchase_returns')
        .select('product_id, quantity')
        .eq('id', returnId)
        .single();

      if (returnError) throw returnError;

      if (newStatus === 'approved') {
        // Get current stock quantity
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', returnData.product_id)
          .single();

        if (productError) throw productError;

        const newQuantity = productData.stock_quantity - returnData.quantity;
        
        if (newQuantity < 0) {
          setMessage({ type: 'error', text: 'Not enough stock to process return!' });
          return;
        }

        // Update product stock quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: newQuantity })
          .eq('id', returnData.product_id);

        if (updateError) throw updateError;
      }

      // Update return status
      const { error: statusError } = await supabase
        .from('purchase_returns')
        .update({ status: newStatus })
        .eq('id', returnId);

      if (statusError) throw statusError;

      // Refresh the product data to reflect updated stock levels
      fetchReturns();
      fetchSupplierProducts(returnData.product_id);  // Refresh product data for UI

      // Fetch updated stock level for the specific product
      const { data: updatedProductData, error: updatedProductError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', returnData.product_id)
        .single();

      if (updatedProductError) throw updatedProductError;

      // Update the UI with the new stock level
      setStockLevel(updatedProductData.stock_quantity);

      setMessage({ type: 'success', text: `Return ${newStatus} successfully!` });
    } catch (error) {
      console.error('Error updating return status:', error);
      setMessage({ type: 'error', text: 'Error updating return status.' });
    }
  };

  const fetchSupplierProducts = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (error) throw error;
      // Update the product data in the UI
      // This code is not implemented as it depends on the UI structure
    } catch (error) {
      console.error('Error fetching supplier products:', error);
    }
  };

  return (
    <div className="space-y-6 ">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Return History</h1>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Supplier</label>
            <Select onValueChange={handleSupplierChange} value={selectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Status</label>
            <Select onValueChange={handleStatusChange} value={selectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Returns Table */}
      <Card className="p-6">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : returns.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No returns found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returns.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.bill.purchase_order?.supplier?.name || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.bill.bill_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'pending' && (
                        <div className="space-x-2">
                          <Button
                            onClick={() => handleUpdateStatus(item.id, 'approved')}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(item.id, 'rejected')}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {message && (
        <div className={`text-${message.type === 'success' ? 'green' : 'red'}-500`}>
          {message.text}
        </div>
      )}
      {stockLevel !== null && (
        <div>
          Current Stock Level: {stockLevel}
        </div>
      )}
    </div>
  );
}
