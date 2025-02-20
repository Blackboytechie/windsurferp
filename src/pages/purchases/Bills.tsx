import { useState, useEffect, useRef, useCallback } from 'react';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { Payment, PurchaseOrder, Supplier } from '@/types/purchase';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useReactToPrint } from "react-to-print";
import { formatCurrency } from '@/utils/formatters';


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

export default function Bills() {
  const [bills, setBills] = useState<(Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [billItems, setBillItems] = useState<{ name: string; quantity: number }[]>([]);
  const contentRef = useRef();
  console.log("billItems :", billItems);
  const handlePrint = useReactToPrint({
    contentRef
  });

  const BillPrintComponent = React.forwardRef<HTMLDivElement, { bill: Bill }>((props, ref) => (
    <div>
      <div ref={ref} className="p-8 max-w-4xl mx-auto bg-white">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">MURALI AGENCIES</h1>
          <p className="text-sm">10 Neela North side, Nagapattinam, Tamil Nadu, 611001</p>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">TAX INVOICE</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-1">
            <p><span className="font-medium">Reverse Charge:</span> No</p>
            <p><span className="font-medium">Invoice No:</span> {props.bill.bill_number}</p>
            <p><span className="font-medium">Invoice Date:</span> {new Date(props.bill.bill_date).toLocaleDateString()}</p>
            <p><span className="font-medium">State:</span> Tamil Nadu <span className="font-medium">State Code:</span> 33</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-medium">Challan No:</span></p>
            <p><span className="font-medium">Vehicle No:</span></p>
            <p><span className="font-medium">Date of Supply:</span> {new Date(props.bill.bill_date).toLocaleDateString()}</p>
            <p><span className="font-medium">Place of Supply:</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm border-t border-b py-4">
          <div>
            <h3 className="font-bold mb-2">Details of Receiver | Billed to:</h3>
            <div className="space-y-1">
              <p><span className="font-medium">Name:</span> {props.bill.purchase_order.supplier.name}</p>
              <p><span className="font-medium">Address:</span> {props.bill.purchase_order.supplier.address}</p>
              <p><span className="font-medium">State:</span> Tamil Nadu <span className="font-medium">State Code:</span> 33</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Details of Consignee | Shipped to:</h3>
            <div className="space-y-1">
              <p><span className="font-medium">Name:</span> {props.bill.purchase_order.supplier.name}</p>
              <p><span className="font-medium">Address:</span> {props.bill.purchase_order.supplier.address}</p>
              <p><span className="font-medium">State:</span> Tamil Nadu <span className="font-medium">State Code:</span> 33</p>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse mb-6 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-2 text-left">Sr. No.</th>
              <th className="border p-2 text-left">Name of product</th>
              <th className="border p-2 text-center">QTY</th>
              <th className="border p-2 text-center">Unit</th>
              <th className="border p-2 text-right">Rate</th>
              <th className="border p-2 text-right">Taxable Value</th>
              <th className="border p-2 text-center" colSpan={2}>CGST</th>
              <th className="border p-2 text-center" colSpan={2}>SGST</th>
              <th className="border p-2 text-right">Total</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border p-2" colSpan={6}></th>
              <th className="border p-2 text-center">Rate</th>
              <th className="border p-2 text-center">Amount</th>
              <th className="border p-2 text-center">Rate</th>
              <th className="border p-2 text-center">Amount</th>
              <th className="border p-2"></th>
            </tr>
          </thead>
          <tbody>
            {props.billItems.map((item, index) => {
              const taxableValue = item.quantity * item.price;
              const gstRate = 9.0; // Split total GST rate between CGST and SGST
              const gstAmount = (taxableValue * gstRate) / 100;
              console.log("item :", item);
              return (
                <tr key={index}>
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2 text-center">{item.quantity}</td>
                  <td className="border p-2 text-center">{item.unit}</td>
                  <td className="border p-2 text-right">{item.price.toFixed(2)}</td>
                  <td className="border p-2 text-right">{taxableValue.toFixed(2)}</td>
                  <td className="border p-2 text-center">{gstRate}%</td>
                  <td className="border p-2 text-right">{gstAmount.toFixed(2)}</td>
                  <td className="border p-2 text-center">{gstRate}%</td>
                  <td className="border p-2 text-right">{gstAmount.toFixed(2)}</td>
                  <td className="border p-2 text-right">{(taxableValue + 2 * gstAmount).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="border p-2" colSpan={2}>Total Quantity</td>
              <td className="border p-2 text-center">{billItems.reduce((sum, item) => sum + item.quantity, 0)}</td>
              <td className="border p-2" colSpan={2}></td>
              <td className="border p-2 text-right">₹{billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</td>
              <td className="border p-2" colSpan={2}>₹{billItems.reduce((sum, item) => sum + ((item.quantity * item.price * 6.0) / 100), 0).toFixed(2)}</td>
              <td className="border p-2" colSpan={2}>₹{billItems.reduce((sum, item) => sum + ((item.quantity * item.price * 6.0) / 100), 0).toFixed(2)}</td>
              <td className="border p-2 text-right">₹{billItems.reduce((sum, item) => sum + (item.quantity * item.price * 1.12), 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mb-6">
          <p className="font-medium">Total Invoice Amount in words:</p>
          <p>Forty One Thousand Seven Hundred Twenty Rupees Only</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <h3 className="font-bold mb-2">Terms And Conditions:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>This is an electronically generated document.</li>
              <li>All disputes are subject to Nagapattinam jurisdiction</li>
            </ol>
          </div>
          <div className="text-right">
            <p className="mb-12">For, MURALI AGENCIES</p>
            <p>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  ));

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
        .select(`unit_price,total,quantity, product:products(name),unit:products(unit)`)
        .eq('bill_id', billId);
      console.log("billItems data :", data);
      if (error) throw error;
      setBillItems(
        (data as unknown as BillItemWithProduct[]).map(item => ({

          name: item.product.name,
          quantity: item.quantity,
          price: item.unit_price,
          total: item.total,
          unit: item.unit.unit
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

  const renderMobileCard = (bill: Bill & { purchase_order: PurchaseOrder & { supplier: Supplier } }) => (
    <div key={bill.id} className="bg-white rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{bill.bill_number}</h3>
          <p className="text-sm text-gray-600">{bill.purchase_order.supplier.name}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(bill.status)}`}>
          {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-600">Bill Date</p>
          <p>{new Date(bill.bill_date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-600">Due Date</p>
          <p>{new Date(bill.due_date).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="border-t pt-2">
        <div className="flex justify-between items-baseline">
          <div>
            <p className="text-gray-600 text-sm">Total Amount</p>
            <p className="font-medium">₹{bill.total_amount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-sm">Paid Amount</p>
            <p className="font-medium">₹{bill.paid_amount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => {
            setSelectedBill(bill);
            setShowBillDetails(true);
            fetchBillItems(bill.id);
          }}
        >
          View
        </Button>
        {bill.status !== 'paid' && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setSelectedBill(bill);
              setShowPaymentForm(true);
            }}
          >
            Add Payment
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setSelectedBill(bill);
            setTimeout(handlePrint, 100);
          }}
        >
          Print
        </Button>
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
                      <td className="">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mr-2"
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowBillDetails(true);
                            fetchBillItems(bill.id);
                          }}
                        >
                          View
                        </Button>
                        {bill.status !== 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowPaymentForm(true);
                            }}
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBill(bill);
                            fetchBillItems(bill.id);
                            setTimeout(handlePrint, 100);
                          }}
                        >
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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

      {selectedBill && (
        <div style={{ display: 'none' }}>
          <BillPrintComponent ref={contentRef} bill={selectedBill} billItems={billItems} />
        </div>
      )}
      <Dialog open={showBillDetails} onOpenChange={setShowBillDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <>
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

              <div className="flex justify-end space-x-3 mt-4">
                <Button variant="outline" >
                  Download PDF
                </Button>
              </div>
            </>
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
