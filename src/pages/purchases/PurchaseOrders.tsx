import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '@/lib/supabase';
import { PurchaseOrder, Supplier } from '@/types/purchase';
import { Product } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { TableContainer } from '@/components/ui/table-container';
import { PurchaseOrderTemplate } from '@/components/purchases/PurchaseOrderTemplate';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';  //
import jsPDF from 'jspdf';
import { Send, FileCheck, Edit, Printer, Download } from 'lucide-react';


interface PurchaseOrderStats {
  total: number;
  pending: number;
  received: number;
  draft: number;
  [key: string]: number;
}

// Add this interface after PurchaseOrderStats
interface PurchaseOrderFilter {
  status: string;
  supplier: string;
  dateFrom: string;
  dateTo: string;
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
  const [filter, setFilter] = useState<PurchaseOrderFilter>({
    status: '',
    supplier: '',
    dateFrom: '',
    dateTo: ''
  });
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

  // Modify fetchPurchaseOrders function
  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter.status) {
        query = query.eq('status', filter.status);
      }

      if (filter.supplier) {
        // First get matching supplier IDs
        const { data: supplierIds } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${filter.supplier}%`);

        if (supplierIds && supplierIds.length > 0) {
          query = query.in('supplier_id', supplierIds.map(s => s.id));
        } else {
          // If no suppliers match, return empty result
          setPurchaseOrders([]);
          setLoading(false);
          return;
        }
      }

      if (filter.dateFrom) {
        query = query.gte('order_date', filter.dateFrom);
      }

      if (filter.dateTo) {
        query = query.lte('order_date', filter.dateTo);
      }

      const { data, error } = await query;

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
  // Add useEffect to trigger fetch on filter change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [filter]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<{ po: PurchaseOrder & { supplier: Supplier }, items: any[] } | null>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    // onBeforeGetContent: async () => {
    //   if (!printData?.po) return;
    //   document.title = `Purchase Order - ${printData.po.po_number}`;
    // },
    // onAfterPrint: () => {
    //   setPrintData(null);
    //   document.title = 'Purchase Orders';
    // },
  });

  const initiatePrint = async (po: PurchaseOrder & { supplier: Supplier }) => {
    const { data: items } = await supabase
      .from('purchase_order_items')
      .select('*, product:products(*)')
      .eq('po_id', po.id);

    setPrintData({ po, items: items || [] });
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handleDownloadPDF = async (po: PurchaseOrder & { supplier: Supplier }) => {
    try {
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('*, product:products(*)')
        .eq('po_id', po.id);

      const element = document.createElement('div');
      element.style.width = '210mm';
      element.style.backgroundColor = 'white';
      document.body.appendChild(element);
      document.body.appendChild(element);
      const root = createRoot(element);
      root.render(<PurchaseOrderTemplate purchaseOrder={po} items={items || []} />);
      // Add delay to ensure component is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      } as any);
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${po.po_number}.pdf`);
      root.unmount(); // Cleanup React root
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error generating PDF:', error);
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
      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              placeholder="Search supplier..."
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filter.supplier}
              onChange={(e) => setFilter({ ...filter, supplier: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
            />
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
                      <td className="px-6 py-4 whitespace-nowrap">{po.po_number}</td>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => initiatePrint(po)}
                          >
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(po)}
                          >
                            Download
                          </Button>
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
                      <h3 className="text-lg font-semibold">{po.po_number}</h3>
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

                  <div className="mt-2 flex flex-wrap justify-end items-center gap-2">
                    {po.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="icon"
                        title="Submit"
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
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    {po.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="icon"
                        title="Receive"
                        onClick={() => {
                          setSelectedPO(po);
                          setShowReceiveForm(true);
                        }}
                      >
                        <FileCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit"
                      onClick={() => {
                        setSelectedPO(po);
                        setShowForm(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Print"
                      onClick={() => initiatePrint(po)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Download"
                      onClick={() => handleDownloadPDF(po)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
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

      {/* Print Template */}
      <div style={{ display: 'none' }}>
        {printData && (
          <PurchaseOrderTemplate
            ref={contentRef}
            purchaseOrder={printData.po}
            items={printData.items}
            companyDetails={{
              name: 'Your Company Name',
              address: '123 Business Street\nCity, State, ZIP',
              phone: '(123) 456-7890',
              email: 'contact@company.com',
              gst: 'GSTIN12345',
            }}
          />
        )}
      </div>

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
    ...(purchaseOrder && {
      supplier_id: purchaseOrder.supplier_id,
      order_date: new Date(purchaseOrder.order_date).toISOString().split('T')[0],
      expected_delivery: new Date(purchaseOrder.expected_delivery).toISOString().split('T')[0],
      status: purchaseOrder.status,
      notes: purchaseOrder.notes,
      id: purchaseOrder.id,
      po_number: purchaseOrder.po_number
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
        const { created_at, updated_at, ...updateData } = poData;
        const { error: poError } = await supabase
          .from('purchase_orders')
          .update(updateData)
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
        // Create new PO with formatted PO number
        const { data: lastPO, error: lastPOError } = await supabase
          .from('purchase_orders')
          .select('po_number')
          .order('created_at', { ascending: false })
          .limit(1);

        if (lastPOError) throw lastPOError;

        // Generate PO number (format: PO/YYYY/XXXX)
        const year = new Date().getFullYear();
        let sequence = 1;

        if (lastPO && lastPO[0]?.po_number) {
          const parts = lastPO[0].po_number.split('/');
          if (parts.length === 3) {
            const lastYear = parseInt(parts[1]);
            const lastNumber = parseInt(parts[2]);

            if (lastYear === year && !isNaN(lastNumber)) {
              sequence = lastNumber + 1;
            }
          }
        }

        const poNumber = `PO/${year}/${sequence.toString().padStart(4, '0')}`;
        const { data: newPO, error: poError } = await supabase
          .from('purchase_orders')
          .insert([{
            ...poData,
            po_number: poNumber,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <h3 className="text-lg font-medium">Products</h3>
                <select
                  className="w-full sm:w-auto border rounded-md px-3 py-2"
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
              {/* Mobile Product Cards */}
              <div className="block sm:hidden">
                {selectedProducts.map((product, index) => (
                  <div key={product.id} className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{product.name}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(product.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Quantity:</span>
                        <input
                          type="number"
                          min="1"
                          className="w-24 border rounded px-2 py-1"
                          value={product.quantity}
                          onChange={(e) => updateProductQuantity(index, Number(e.target.value))}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Unit Price:</span>
                        <span>₹{product.purchase_price}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">GST:</span>
                        <span>{product.gst_rate}%</span>
                      </div>
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span>₹{(product.quantity * product.purchase_price * (1 + product.gst_rate / 100)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
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
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedProducts.length === 0}
                className="w-full sm:w-auto"
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
      // Get last bill number to generate new one
      const { data: lastBill, error: lastBillError } = await supabase
        .from('bills')
        .select('bill_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastBillError) throw lastBillError;

      // Generate bill number (format: BILL/YYYY/XXXX)
      const year = new Date().getFullYear();
      let sequence = 1;

      if (lastBill && lastBill[0]?.bill_number) {
        const parts = lastBill[0].bill_number.split('/');
        if (parts.length === 3) {
          const lastYear = parseInt(parts[1]);
          const lastNumber = parseInt(parts[2]);

          if (lastYear === year && !isNaN(lastNumber)) {
            sequence = lastNumber + 1;
          }
        }
      }

      const billNumber = `BILL/${year}/${sequence.toString().padStart(4, '0')}`;

      // 1. Create the bill
      const billData = {
        bill_number: billNumber,
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
