import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Payment, PurchaseOrder, Supplier } from '@/types/purchase';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Eye, CreditCard, Printer, Download } from 'lucide-react';

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'paid';
  purchase_order: PurchaseOrder & {
    supplier: Supplier;
    created_at: string;
    po_number: string;
  };
}

interface BillItemWithProduct {
  quantity: number;
  product: {
    name: string;
  };
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BillTemplate } from '@/components/purchases/BillTemplate';

export default function Bills() {
  const [bills, setBills] = useState<(Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [billItems, setBillItems] = useState<{ name: string; quantity: number }[]>([]);
  
  // Add these new state variables for printing
  const contentRef = useRef<HTMLDivElement>(null);
  // Update the state type
  const [printData, setPrintData] = useState<{ 
    bill: Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } }, 
    items: any[],
    totalPages?: number 
  } | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          purchase_order:purchase_orders(
            *,
            supplier:suppliers(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillItems = async (billId: string) => {
    try {
      const { data, error } = await supabase
        .from('bill_items')
        .select(`quantity, product:products(name)`)
        .eq('bill_id', billId);

      if (error) throw error;
      setBillItems(
        (data as unknown as BillItemWithProduct[]).map(item => ({

          name: item.product.name,
          quantity: item.quantity
        })) || []
      );
    } catch (error) {
      console.error('Error fetching bill items:', error);
    }
  };

  const getStatusBadgeColor = (status: Bill['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  // ... existing functions like fetchBills, fetchBillItems, etc.

  // Add these new functions for printing and downloading
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: printData ? `Bill-${printData.bill.bill_number}` : 'Bill',
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
    onAfterPrint: () => {
      setPrintData(null);
    }
  });

  const initiatePrint = async (bill: Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } }) => {
    try {
      const { data: items } = await supabase
        .from('bill_items')
        .select('*, product:products(*)')
        .eq('bill_id', bill.id);

      if (!items || items.length === 0) {
        console.error('No items found for this bill');
        return;
      }
  
      // Calculate total pages
      const ITEMS_PER_PAGE = 10;
      const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  
      setPrintData({ 
        bill, 
        items: items || [],
        totalPages
      });
      
      setTimeout(() => {
        handlePrint();
      }, 100);
    } catch (error) {
      console.error('Error fetching items for print:', error);
    }
  };

  const handleDownloadPDF = async (bill: Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } }) => {
    try {
      const { data: items } = await supabase
        .from('bill_items')
        .select('*, product:products(*)')
        .eq('bill_id', bill.id);

      if (!items || items.length === 0) {
        console.error('No items found for this bill');
        return;
      }

      // Calculate total pages
      const ITEMS_PER_PAGE = 10;
      const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Generate each page
      for (let page = 1; page <= totalPages; page++) {
        // Create a container for the current page
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        
        const root = createRoot(container);
        root.render(
          <BillTemplate 
            bill={bill} 
            items={items} 
            companyDetails={{
              name: 'Your Company Name',
              address: '123 Business Street\nCity, State, ZIP',
              phone: '(123) 456-7890',
              email: 'contact@company.com',
              gst: 'GSTIN12345',
            }}
            pageInfo={{
              currentPage: page,
              totalPages: totalPages,
              isLastPage: page === totalPages
            }}
          />
        );
        
        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(container, {
          // width: container.scrollWidth,
          // height: container.scrollHeight,
          // scale: 2,
          useCORS: true,
          allowTaint: true,
          // backgroundColor: '#ffffff',
          // logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Add page to PDF
        if (page > 1) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        
        // Clean up
        root.unmount();
        document.body.removeChild(container);
      }
      
      pdf.save(`Bill-${bill.bill_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };
  const renderMobileCard = (bill: Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } }) => (
    <div key={bill.id} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
      {/* ... existing card content ... */}

      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => {
            setSelectedBill(bill);
            setShowBillDetails(true);
            fetchBillItems(bill.id);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => initiatePrint(bill)}
        >
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => handleDownloadPDF(bill)}
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        {bill.status !== 'paid' && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedBill(bill);
              setShowPaymentForm(true);
            }}
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Pay
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bills & Payments</h1>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : bills.length === 0 ? (
        <div className="text-center py-4">No bills found</div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {bills.map(renderMobileCard)}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <div className="bg-white rounded-lg shadow">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '15%' }}>
                      Bill Number
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '20%' }}>
                      Supplier
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '12%' }}>
                      Bill Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '12%' }}>
                      Due Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '10%' }}>
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '15%' }}>
                      Amount
                    </th>
                    <th className="px-3 py-3 text-xs font-medium text-gray-500 uppercase" style={{ width: '16%' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-3 py-4">
                        <div className="truncate">{bill.bill_number}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="truncate">{bill.purchase_order.supplier.name}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="truncate">{new Date(bill.bill_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="truncate">{new Date(bill.due_date).toLocaleDateString()}</div>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(bill.status)}`}>
                          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="truncate">₹{bill.total_amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-500 truncate">
                          Paid: ₹{bill.paid_amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowBillDetails(true);
                              fetchBillItems(bill.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => initiatePrint(bill)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(bill)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {bill.status !== 'paid' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowPaymentForm(true);
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
     {/* Add the print template div at the end of the component */}
<div style={{ display: 'none' }}>
  {printData && (
    <div ref={contentRef} className="print-container">
      {Array.from({ length: printData.totalPages || 1 }).map((_, index) => (
        <div key={index} className="print-page">
          <BillTemplate
            bill={printData.bill}
            items={printData.items}
            companyDetails={{
              name: 'Your Company Name',
              address: '123 Business Street\nCity, State, ZIP',
              phone: '(123) 456-7890',
              email: 'contact@company.com',
              gst: 'GSTIN12345',
            }}
            pageInfo={{
              currentPage: index + 1,
              totalPages: printData.totalPages || 1,
              isLastPage: index + 1 === (printData.totalPages || 1)
            }}
          />
        </div>
      ))}
    </div>
  )}
</div>

      {showPaymentForm && selectedBill && (
        <PaymentForm
          bill={selectedBill}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedBill(null);
          }}
          onSave={() => {
            setShowPaymentForm(false);
            setSelectedBill(null);
            fetchBills();
          }}
        />
      )}

      <Dialog open={showBillDetails} onOpenChange={setShowBillDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bill Number</p>
                  <p className="font-medium">{selectedBill.bill_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedBill.purchase_order.supplier.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bill Date</p>
                  <p className="font-medium">{new Date(selectedBill.bill_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">{new Date(selectedBill.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(selectedBill.status)}`}>
                    {selectedBill.status.charAt(0).toUpperCase() + selectedBill.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-medium">₹{selectedBill.total_amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Paid Amount</p>
                    <p className="font-medium">₹{selectedBill.paid_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Items</p>
                <div className="grid grid-cols-2 gap-4">
                  {billItems.map(item => (
                    <div key={item.name} className="flex justify-between">
                      <p className="text-sm text-gray-500">{item.name}</p>
                      <p className="font-medium">{item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Purchase Order Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">PO Number</p>
                    <p className="font-medium">{selectedBill.purchase_order.po_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">PO Date</p>
                    <p className="font-medium">{new Date(selectedBill.purchase_order.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
  
    </div>
  );
}

interface PaymentFormProps {
  bill: Bill;
  onClose: () => void;
  onSave: () => void;
}

function PaymentForm({ bill, onClose, onSave }: PaymentFormProps) {
  const [formData, setFormData] = useState<Partial<Payment>>({
    payment_date: new Date().toISOString().split('T')[0],
    amount: bill.total_amount - bill.paid_amount,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create the payment
        const { error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            bill_id: bill.id,
            payment_date: formData.payment_date,
            amount: formData.amount,
            payment_method: formData.payment_method,
            reference_number: formData.reference_number,
            notes: formData.notes,
            type: 'payment',
          }
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // The bill status and paid_amount will be updated automatically by the trigger
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      setError(error.message || 'An error occurred while creating the payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h2 className="text-xl font-bold mb-4">Add Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
            <input
              type="date"
              required
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              required
              min={0}
              max={bill.total_amount - bill.paid_amount}
              step={0.01}
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            />
            <p className="text-sm text-gray-500 mt-1">
              Remaining: ₹{(bill.total_amount - bill.paid_amount).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              required
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Payment['payment_method'] })}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reference Number</label>
            <input
              type="text"
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="Cheque number, UPI ID, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              className="mt-1 block w-full border rounded-md px-3 py-2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}

          <div className="flex justify-end space-x-3">
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
              {loading ? 'Processing...' : 'Save Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
