import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PurchaseOrder, Supplier } from '@/types/purchase';
import { Product } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { TableContainer } from '@/components/ui/table-container';

interface PurchaseOrderStats {
  total: number;
  pending: number;
  received: number;
  draft: number;
  [key: string]: number;
}

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<(PurchaseOrder & { supplier: Supplier })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<(PurchaseOrder & { supplier: Supplier }) | null>(null);
  const [stats, setStats] = useState<PurchaseOrderStats>({
    total: 0,
    pending: 0,
    received: 0,
    draft: 0
  });

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchaseOrders(data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Calculate stats whenever purchase orders change
    const newStats = purchaseOrders.reduce<PurchaseOrderStats>((acc, po) => {
      acc.total += po.total_amount || 0;
      acc[po.status] = (acc[po.status] || 0) + 1;
      return acc;
    }, {
      total: 0,
      pending: 0,
      received: 0,
      draft: 0
    });
    setStats(newStats);
  }, [purchaseOrders]);

  const getStatusBadgeColor = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold">Purchase Orders</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => setShowForm(true)} variant="default" size="sm">
                Create Purchase Order
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">Total Orders Value</h3>
          <p className="text-2xl font-semibold mt-1 text-center">₹{stats.total.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">Draft Orders</h3>
          <p className="text-2xl font-semibold mt-1 text-center">{stats.draft}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
          <p className="text-2xl font-semibold mt-1 text-center">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">Received Orders</h3>
          <p className="text-2xl font-semibold mt-1 text-center">{stats.received}</p>
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
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      No purchase orders found
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="px-6 py-4 whitespace-nowrap">PO-{po.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-medium">{po.supplier.name}</p>
                          <p className="text-gray-500">{po.supplier.contact_person}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(po.status)}`}>
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{po.total_amount?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po);
                              setShowForm(true);
                            }}
                          >
                            Edit
                          </Button>
                          {po.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('purchase_orders')
                                    .update({ status: 'pending' })
                                    .eq('id', po.id);
                                  
                                  if (error) throw error;
                                  fetchPurchaseOrders();
                                } catch (error) {
                                  console.error('Error updating PO status:', error);
                                }
                              }}
                            >
                              Submit
                            </Button>
                          )}
                          {po.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPO(po);
                                setShowReceiveForm(true);
                              }}
                            >
                              Receive
                            </Button>
                          )}
                        </div>
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
          ) : purchaseOrders.length === 0 ? (
            <div className="p-4 text-center">No purchase orders found</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4">
              {purchaseOrders.map((po) => (
                <div key={po.id} className="bg-white border rounded-lg p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">PO-{po.id}</h3>
                      <p className="text-sm text-gray-600">{po.supplier.name}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(po.status)}`}>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-gray-600">Contact Person:</span>{' '}
                        <span className="font-medium">{po.supplier.contact_person}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Total Amount:</span>{' '}
                        <span className="font-medium">₹{po.total_amount?.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPO(po);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    {po.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('purchase_orders')
                              .update({ status: 'pending' })
                              .eq('id', po.id);
                            
                            if (error) throw error;
                            fetchPurchaseOrders();
                          } catch (error) {
                            console.error('Error updating PO status:', error);
                          }
                        }}
                      >
                        Submit
                      </Button>
                    )}
                    {po.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPO(po);
                          setShowReceiveForm(true);
                        }}
                      >
                        Receive
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
        <PurchaseOrderForm
          purchaseOrder={selectedPO}
          onClose={() => {
            setShowForm(false);
            setSelectedPO(null);
          }}
          onSave={() => {
            fetchPurchaseOrders();
            setShowForm(false);
            setSelectedPO(null);
          }}
        />
      )}

      {showReceiveForm && selectedPO && (
        <ReceivePOForm
          purchaseOrder={selectedPO}
          onClose={() => {
            setShowReceiveForm(false);
            setSelectedPO(null);
          }}
          onSave={() => {
            fetchPurchaseOrders();
            setShowReceiveForm(false);
            setSelectedPO(null);
          }}
        />
      )}
    </div>
  );
}

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
  onClose: () => void;
  onSave: () => void;
}

function PurchaseOrderForm({ purchaseOrder, onClose, onSave }: PurchaseOrderFormProps) {
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: new Date().toISOString().split('T')[0],
    status: 'draft',
    notes: '',
    ...purchaseOrder,
    ...(purchaseOrder?.order_date && {
      order_date: new Date(purchaseOrder.order_date).toISOString().split('T')[0]
    }),
    ...(purchaseOrder?.expected_delivery && {
      expected_delivery: new Date(purchaseOrder.expected_delivery).toISOString().split('T')[0]
    })
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<(Product & { quantity: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
    if (purchaseOrder?.id) {
      fetchPurchaseOrderItems();
    }
  }, [purchaseOrder?.id]);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
  };

  const fetchPurchaseOrderItems = async () => {
    if (!purchaseOrder?.id) return;
    
    const { data: items, error } = await supabase
      .from('purchase_order_items')
      .select('*, product:products(*)')
      .eq('po_id', purchaseOrder.id);

    if (error) {
      console.error('Error fetching PO items:', error);
      return;
    }

    if (items) {
      const productsWithQuantity = items.map(item => ({
        ...item.product,
        quantity: item.quantity,
        purchase_price: item.unit_price,
        gst_rate: item.gst_rate
      }));
      setSelectedProducts(productsWithQuantity);
    }
  };

  const addProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product && !selectedProducts.some(p => p.id === product.id)) {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
    }
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    const newProducts = [...selectedProducts];
    newProducts[index].quantity = quantity;
    setSelectedProducts(newProducts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Calculate totals
      const subtotal = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
      const gstAmount = selectedProducts.reduce((sum, item) => {
        const itemGst = (item.quantity * item.purchase_price * (item.gst_rate || 0)) / 100;
        return sum + itemGst;
      }, 0);

      const poData = {
        ...formData,
        subtotal,
        gst_amount: gstAmount,
        total_amount: subtotal + gstAmount,
      };

      let poId;

      if (purchaseOrder) {
        // Update existing PO
        const { error: poError } = await supabase
          .from('purchase_orders')
          .update(poData)
          .eq('id', purchaseOrder.id);

        if (poError) throw poError;
        poId = purchaseOrder.id;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('po_id', poId);

        if (deleteError) throw deleteError;
      } else {
        // Create new PO
        const { data: newPO, error: poError } = await supabase
          .from('purchase_orders')
          .insert([{
            ...poData,
            po_number: `PO${Date.now()}`, // Generate PO number
          }])
          .select()
          .single();

        if (poError) throw poError;
        if (!newPO) throw new Error('Failed to create purchase order');
        poId = newPO.id;
      }

      // Insert PO items
      if (selectedProducts.length > 0) {
        const items = selectedProducts.map(product => ({
          po_id: poId,
          product_id: product.id,
          quantity: product.quantity,
          unit_price: product.purchase_price,
          gst_rate: product.gst_rate || 0,
          gst_amount: (product.quantity * product.purchase_price * (product.gst_rate || 0)) / 100,
          total: product.quantity * product.purchase_price * (1 + (product.gst_rate || 0) / 100),
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(items);

        if (itemsError) {
          console.error('Error inserting items:', itemsError);
          throw new Error(`Failed to create purchase order items: ${itemsError.message}`);
        }
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error creating/updating purchase order:', error);
      setError(error.message || 'An error occurred while creating the purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <select
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={formData.supplier_id || ''}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Order Date</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={formData.order_date || ''}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                <input
                  type="date"
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={formData.expected_delivery || ''}
                  onChange={(e) => setFormData({ ...formData, expected_delivery: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Products Section */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Products</h3>
                <select
                  className="border rounded-md px-3 py-2"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addProduct(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Add Product</option>
                  {products
                    .filter(product => !selectedProducts.some(p => p.id === product.id))
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Unit Price</th>
                    <th className="px-4 py-2">GST</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map((product, index) => (
                    <tr key={product.id}>
                      <td className="px-4 py-2">{product.name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          className="w-20 border rounded px-2 py-1"
                          value={product.quantity}
                          onChange={(e) => {
                            updateProductQuantity(index, Number(e.target.value));
                          }}
                        />
                      </td>
                      <td className="px-4 py-2">₹{product.purchase_price}</td>
                      <td className="px-4 py-2">{product.gst_rate}%</td>
                      <td className="px-4 py-2">
                        ₹{(product.quantity * product.purchase_price * (1 + product.gst_rate / 100)).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            removeProduct(product.id);
                          }}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                disabled={loading || selectedProducts.length === 0}
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

interface ReceivePOFormProps {
  purchaseOrder: PurchaseOrder & { supplier: Supplier };
  onClose: () => void;
  onSave: () => void;
}

function ReceivePOForm({ purchaseOrder, onClose, onSave }: ReceivePOFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create the bill
      const billData = {
        bill_number: `BILL${Date.now()}`,
        po_id: purchaseOrder.id,
        bill_date: formData.bill_date,
        due_date: formData.due_date,
        status: 'pending',
        subtotal: purchaseOrder.subtotal,
        gst_amount: purchaseOrder.gst_amount,
        total_amount: purchaseOrder.total_amount,
        paid_amount: 0
      };

      const { data: newBill, error: billError } = await supabase
        .from('bills')
        .insert([billData])
        .select()
        .single();

      if (billError) throw billError;
      if (!newBill) throw new Error('Failed to create bill');

      // 2. Get PO items
      const { data: poItems, error: poItemsError } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('po_id', purchaseOrder.id);

      if (poItemsError) throw poItemsError;
      if (!poItems) throw new Error('Failed to fetch PO items');

      // 3. Create bill items
      if (poItems.length > 0) {
        const billItems = poItems.map(item => ({
          bill_id: newBill.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          gst_rate: item.gst_rate,
          gst_amount: item.gst_amount,
          total: item.total
        }));

        const { error: billItemsError } = await supabase
          .from('bill_items')
          .insert(billItems);

        if (billItemsError) throw billItemsError;

        // 4. Create stock movements and update stock levels
        for (const item of poItems) {
          // Create stock movement
          const { error: movementError } = await supabase
            .from('stock_movements')
            .insert([{
              product_id: item.product_id,
              type: 'in',
              quantity: item.quantity,
              reference_type: 'purchase',
              reference_id: purchaseOrder.id,
              notes: `Received from PO: ${purchaseOrder.po_number}`
            }]);

          if (movementError) throw movementError;

          // Get current stock quantity
          const { data: currentProduct, error: productError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (productError) throw productError;

          // Update both stock quantity and level
          const newStockQuantity = (currentProduct?.stock_quantity || 0) + item.quantity;
          
          const { error: stockUpdateError } = await supabase
            .from('products')
            .update({ 
              stock_quantity: newStockQuantity 
            })
            .eq('id', item.product_id);

          if (stockUpdateError) throw stockUpdateError;

          // Update stock level
          const { error: stockError } = await supabase.rpc(
            'update_stock_level',
            {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
              p_is_increment: true
            }
          );

          if (stockError) throw stockError;
        }
      }

      // 5. Update PO status
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', purchaseOrder.id);

      if (updateError) throw updateError;

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error receiving PO:', error);
      setError(error.message || 'An error occurred while receiving the purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h2 className="text-xl font-bold mb-4">Receive Purchase Order</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bill Date</label>
            <input
              type="date"
              required
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.bill_date}
              onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Due Date</label>
            <input
              type="date"
              required
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}

          <div className="flex justify-end space-x-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Receive and Generate Bill'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
