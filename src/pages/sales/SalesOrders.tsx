import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SalesOrder, Customer, SalesOrderItem } from '@/types/sales';
import { Product } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { generateInvoice } from '@/utils/invoiceUtils';
import { exportData, formatDataForExport } from '@/utils/exportUtils';
import { useToast } from "@/components/ui/use-toast";
import { TableContainer } from '@/components/ui/table-container';

const formatDateForInput = (dateString: string | null): string => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().split('T')[0];
};

export default function SalesOrders() {
  const [salesOrders, setSalesOrders] = useState<(SalesOrder & { customer: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSO, setSelectedSO] = useState<(SalesOrder & { customer: Customer }) | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSalesOrders(data || []);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: SalesOrder['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      // Fetch complete sales order data with related records
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers (
            name,
            email,
            phone,
            gst_number
          ),
          items:sales_order_items (
            quantity,
            unit_price,
            tax_rate,
            product:products (
              name,
              sku
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return;
          
      // Format data for export
      const formattedData = data.map(order => ({
        'SO Number': order.so_number,
        'Date': new Date(order.created_at).toLocaleDateString(),
        'Status': order.status,
        'Customer Name': order.customer.name,
        'Customer GST': order.customer.gst_number,
        'Customer Phone': order.customer.phone,
        'Customer Email': order.customer.email,
        'Items': order.items.map(item => 
          `${item.product.name} (${item.quantity} x ₹${item.unit_price})`
        ).join('\n'),
        'Subtotal': order.subtotal,
        'Tax Amount': order.tax_amount,
        'Total Amount': order.total_amount,
      }));

      // Export the data
      exportData({
        fileName: `Sales_Orders_${new Date().toISOString().split('T')[0]}`,
        format,
        data: formattedData,
      });
    } catch (error) {
      console.error('Error exporting sales orders:', error);
      toast({
        title: "Error",
        description: "Error exporting sales orders. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (salesOrder: SalesOrder & { customer: Customer }, newStatus: string) => {
    try {
      // If changing to confirmed status, validate stock first
      if (newStatus === 'confirmed') {
        // Fetch complete order with items and products
        const { data: orderWithItems, error: itemsError } = await supabase
          .from('sales_orders')
          .select(`
            *,
            customer:customers(*),
            items:sales_order_items(
              *,
              product:products(*)
            )
          `)
          .eq('id', salesOrder.id)
          .single();

        if (itemsError) throw itemsError;

        // Validate stock levels
        const stockValidation = await validateStock(orderWithItems);
        
        if (!stockValidation.valid) {
          toast({
            title: "Insufficient Stock",
            description: (
              <div>
                <p>{stockValidation.error}</p>
                <ul className="mt-2 list-disc pl-4">
                  {stockValidation.items.map((item, index) => (
                    <li key={index}>
                      {item.product}: Requested {item.requested}, Available {item.available}
                    </li>
                  ))}
                </ul>
              </div>
            ),
            variant: "destructive",
          });
          return;
        }
      }

      // Update the status
      const { error: updateError } = await supabase
        .from('sales_orders')
        .update({ status: newStatus })
        .eq('id', salesOrder.id);

      if (updateError) throw updateError;

      toast({
        title: "Status Updated",
        description: `Sales order status has been updated to ${newStatus}`,
      });

      // Refresh the sales orders list
      fetchSalesOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = async (salesOrder: SalesOrder & { customer: Customer }) => {
    try {
      // First fetch the complete sales order with items and products
      const { data: orderWithItems, error: itemsError } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customer:customers(*),
          items:sales_order_items(
            *,
            product:products(*)
          )
        `)
        .eq('id', salesOrder.id)
        .single();

      if (itemsError) throw itemsError;

      // Get fresh stock data for validation
      const stockValidationPromises = orderWithItems.items.map(async (item) => {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();
        
        return {
          ...item,
          product: {
            ...item.product,
            stock_quantity: product?.stock_quantity || 0
          }
        };
      });

      const itemsWithFreshStock = await Promise.all(stockValidationPromises);
      const orderWithFreshStock = {
        ...orderWithItems,
        items: itemsWithFreshStock
      };

      // Validate stock levels before generating invoice
      const stockValidation = await validateStock(orderWithFreshStock);
      
      if (!stockValidation.valid) {
        toast({
          title: "Insufficient Stock",
          description: (
            <div>
              <p>{stockValidation.error}</p>
              <ul className="mt-2 list-disc pl-4">
                {stockValidation.items.map((item, index) => (
                  <li key={index}>
                    {item.product}: Requested {item.requested}, Available {item.available}
                  </li>
                ))}
              </ul>
            </div>
          ),
          variant: "destructive",
        });
        return;
      }

      // Generate invoice with stock updates
      const { invoice, error } = await generateInvoice(orderWithFreshStock);
      
      if (error) throw error;

      toast({
        title: "Invoice Generated",
        description: `Invoice #${invoice.invoice_number} has been generated and stock levels have been updated.`,
      });

      // Refresh the sales orders list
      fetchSalesOrders();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold">Sales Orders</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => handleExport('xlsx')} variant="outline" size="sm">
                Export XLSX
              </Button>
              <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                Export CSV
              </Button>
              <Button onClick={() => setShowForm(true)} variant="default" size="sm">
                New Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table/Card Section */}
      <div className="bg-white rounded-lg shadow">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <TableContainer>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : salesOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      No sales orders found
                    </td>
                  </tr>
                ) : (
                  salesOrders.map((so) => (
                    <tr key={so.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{so.order_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>{so.customer.name}</div>
                        <div className="text-sm text-gray-500">{so.customer.contact_person}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(so.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(so.status)}`}>
                          {so.status.charAt(0).toUpperCase() + so.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>₹{so.total_amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">
                          Tax: ₹{so.tax_amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSO(so);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {so.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(so, 'confirmed')}
                          >
                            Confirm Order
                          </Button>
                        )}
                        {so.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateInvoice(so)}
                          >
                            Generate Invoice
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableContainer>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : salesOrders.length === 0 ? (
            <div className="p-4 text-center">No sales orders found</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4">
              {salesOrders.map((so) => (
                <div key={so.id} className="bg-white border rounded-lg p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">#{so.order_number}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(so.order_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(so.status)}`}>
                      {so.status.charAt(0).toUpperCase() + so.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm">
                      <p className="font-medium">{so.customer.name}</p>
                      <p className="text-gray-600">{so.customer.contact_person}</p>
                    </div>

                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium">₹{so.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax Amount:</span>
                        <span className="font-medium">₹{so.tax_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSO(so);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    {so.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(so, 'confirmed')}
                      >
                        Confirm Order
                      </Button>
                    )}
                    {so.status === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateInvoice(so)}
                      >
                        Generate Invoice
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <SalesOrderForm
          salesOrder={selectedSO}
          onClose={() => {
            setShowForm(false);
            setSelectedSO(null);
          }}
          onSave={() => {
            fetchSalesOrders();
            setShowForm(false);
            setSelectedSO(null);
          }}
        />
      )}
    </div>
  );
}

interface SalesOrderFormProps {
  salesOrder?: (SalesOrder & { customer: Customer }) | null;
  onClose: () => void;
  onSave: () => void;
}

function SalesOrderForm({ salesOrder, onClose, onSave }: SalesOrderFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<SalesOrder>({
    order_date: formatDateForInput(salesOrder?.order_date || new Date().toISOString()),
    delivery_date: formatDateForInput(salesOrder?.delivery_date || ''),
    status: salesOrder?.status || 'draft',
    shipping_address: salesOrder?.shipping_address || '',
    billing_address: salesOrder?.billing_address || '',
    customer_id: salesOrder?.customer_id || '',
    notes: salesOrder?.notes || '',
    discount_amount: 0, // Set default value
    tax_amount: salesOrder?.tax_amount || 0,
  });
  console.log("formdata :",formData);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<(SalesOrderItem & { product: Product })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    if (salesOrder) {
      fetchItems();
    }
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    setCustomers(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
  };

  const fetchItems = async () => {
    if (!salesOrder) return;
    
    try {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('order_id', salesOrder.id);

      if (error) throw error;

      // Initialize items with all required fields and calculations
      const initializedItems = (data || []).map(item => {
        // Get tax rate from either the item or the product
        const taxRate = item.tax_rate ?? item.product.tax_rate ?? 0;
        const itemSubtotal = item.quantity * item.unit_price;
        const itemTaxAmount = (itemSubtotal * taxRate) / 100;
        const itemDiscountAmount = (itemSubtotal * (item.discount_rate || 0)) / 100;
        const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;

        return {
          ...item,
          tax_rate: Number(taxRate),
          tax_amount: Number(itemTaxAmount),
          discount_rate: Number(item.discount_rate) || 0,
          discount_amount: Number(itemDiscountAmount),
          total_amount: Number(itemTotal),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        };
      });

      setItems(initializedItems);
      
      // Calculate and update form totals
      const subtotal = initializedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = initializedItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const discountAmount = initializedItems.reduce((sum, item) => sum + item.discount_amount, 0);
      const totalAmount = subtotal + taxAmount - discountAmount;

      setFormData(prev => ({
        ...prev,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount
      }));
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  };

  const updateItem = (index: number, updates: Partial<SalesOrderItem>) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    // Calculate item totals
    const item = updatedItems[index];
    const itemSubtotal = item.quantity * item.unit_price;
    const itemTaxAmount = (itemSubtotal * (Number(item.tax_rate) || 0)) / 100;
    const itemDiscountAmount = (itemSubtotal * (Number(item.discount_rate) || 0)) / 100;
    const itemTotal = itemSubtotal + itemTaxAmount - itemDiscountAmount;

    updatedItems[index] = {
      ...item,
      tax_amount: Number(itemTaxAmount),
      discount_amount: Number(itemDiscountAmount),
      total_amount: Number(itemTotal)
    };

    setItems(updatedItems);
    calculateTotals();
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      return sum + (itemSubtotal * (Number(item.tax_rate) || 0)) / 100;
    }, 0);
    const discountAmount = items.reduce((sum, item) => {
      const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
      return sum + (itemSubtotal * (Number(item.discount_rate) || 0)) / 100;
    }, 0);

    setFormData(prev => ({
      ...prev,
      subtotal: Number(subtotal),
      tax_amount: Number(taxAmount),
      discount_amount: Number(discountAmount),
      total_amount: Number(subtotal + taxAmount - discountAmount)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orderData = {
        ...formData,
        order_date: new Date(formData.order_date!).toISOString(),
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
        customer_id: formData.customer_id,
        status: formData.status as SalesOrderStatus,
        shipping_address: formData.shipping_address || null,
        billing_address: formData.billing_address || null,
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        discount_amount: formData.discount_amount || 0,
        total_amount: formData.total_amount,
        notes: formData.notes || null,
      };

      let orderId: string;

      if (salesOrder) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('id', salesOrder.id);

        if (orderError) throw orderError;
        orderId = salesOrder.id;
      } else {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('sales_orders')
          .insert([orderData])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
      }

      // Handle items
      if (salesOrder) {
        // Delete removed items
        const existingItemIds = items
          .filter(item => item.id)
          .map(item => item.id);

        if (existingItemIds.length === 0) {
          // If no existing items, delete all items for this order
          const { error: deleteError } = await supabase
            .from('sales_order_items')
            .delete()
            .eq('order_id', orderId);

          if (deleteError) throw deleteError;
        } else {
          // Delete items not in the current list
          const { error: deleteError } = await supabase
            .from('sales_order_items')
            .delete()
            .eq('order_id', orderId)
            .not('id', 'in', `(${existingItemIds.join(',')})`);

          if (deleteError) throw deleteError;
        }
      }

      // Update or insert items
      for (const item of items) {
        const itemData = {
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 0,
          tax_amount: (item.quantity * item.unit_price * (item.tax_rate || 0)) / 100,
          discount_rate: item.discount_rate || 0,
          discount_amount: (item.quantity * item.unit_price * (item.discount_rate || 0)) / 100,
          total_amount: item.quantity * item.unit_price * (1 + (item.tax_rate || 0) / 100 - (item.discount_rate || 0) / 100),
        };

        if (item.id) {
          // Update existing item
          const { error: itemError } = await supabase
            .from('sales_order_items')
            .update(itemData)
            .eq('id', item.id);

          if (itemError) throw itemError;
        } else {
          // Insert new item
          const { error: itemError } = await supabase
            .from('sales_order_items')
            .insert([itemData]);

          if (itemError) throw itemError;
        }
      }

      onSave();

      // Generate invoice if status is confirmed
      if (formData.status === 'confirmed' && salesOrder) {
        try {
          const updatedSalesOrder = {
            ...salesOrder,
            ...formData,
            items: items,
          };
          await generateInvoice(updatedSalesOrder as any);
          console.log('Invoice generated successfully');
          // Navigate to invoices page only when invoice is generated
          navigate('/sales/invoices');
        } catch (error) {
          console.error('Error generating invoice:', error);
          setError('Failed to generate invoice. Please try again.');
        }
      }
      // No navigation if just saving a draft order
    } catch (error: any) {
      console.error('Error saving sales order:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (product: Product) => {
    setItems(prev => [
      ...prev,
      {
        id: '',
        order_id: salesOrder?.id || '',
        product_id: product.id,
        quantity: 1,
        unit_price: product.selling_price,
        tax_rate: product.tax_rate,
        tax_amount: 0,
        discount_rate: 0,
        discount_amount: 0,
        total_amount: product.selling_price,
        product,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {salesOrder ? 'Edit Sales Order' : 'Create Sales Order'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <select
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Order Date</label>
                <input
                  type="date"
                  required
                  value={formData.order_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                <input
                  type="date"
                  value={formData.delivery_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as SalesOrder['status'] })}
                >
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Items</h3>
                <select
                  className="border rounded-md px-3 py-2"
                  value=""
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    if (product) addItem(product);
                  }}
                >
                  <option value="">Add Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tax %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          required
                          className="w-20 border rounded-md px-2 py-1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          className="w-24 border rounded-md px-2 py-1"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          className="w-20 border rounded-md px-2 py-1"
                          value={item.tax_rate || 0}
                          onChange={(e) => updateItem(index, { tax_rate: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          required
                          className="w-20 border rounded-md px-2 py-1"
                          value={item.discount_rate || 0}
                          onChange={(e) => updateItem(index, { discount_rate: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{item.total_amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-medium">
                      Subtotal:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{formData.subtotal?.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-medium">
                      Tax:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{formData.tax_amount?.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-medium">
                      Discount:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{formData.discount_amount?.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right font-medium">
                      Total:
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₹{formData.total_amount?.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                className="mt-1 block w-full border rounded-md px-3 py-2"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || items.length === 0}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

async function validateStock(order: SalesOrder & { customer: Customer, items: (SalesOrderItem & { product: Product })[] }) {
  const stockValidation: { valid: boolean, error: string, items: { product: string, requested: number, available: number }[] } = {
    valid: true,
    error: '',
    items: []
  };

  for (const item of order.items) {
    const product = item.product;
    const requestedQuantity = item.quantity;

    // Check if product has sufficient stock
    if (product.stock_quantity < requestedQuantity) {
      stockValidation.valid = false;
      stockValidation.error = `Insufficient stock for some products.`;
      stockValidation.items.push({
        product: product.name,
        requested: requestedQuantity,
        available: product.stock_quantity
      });
    }
  }

  return stockValidation;
}
