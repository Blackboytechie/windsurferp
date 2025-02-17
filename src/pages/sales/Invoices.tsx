import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice, SalesOrder, Customer, SalesPayment } from '@/types/sales';
import { Button } from '@/components/ui/button';
import InvoiceTemplate from '@/components/invoices/InvoiceTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { exportData, formatDataForExport } from '@/utils/exportUtils';
import { generateInvoice } from '@/utils/invoiceUtils';
import PaymentModal from '../../components/PaymentModal';

export default function Invoices() {
  const [invoices, setInvoices] = useState<(Invoice & { 
    sales_order: SalesOrder & { customer: Customer } 
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders(
            *,
            customer:customers(*),
            items:sales_order_items(
              *,
              product:products(*),
              total_amount,
              paid_amount
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: Invoice['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      // Fetch complete invoice data with related records
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders (
            *,
            customer:customers (*),
            items:sales_order_items (
              *,
              product:products (*)
            )
          )
        `)
        .eq('id', invoice.id)
        .single();

      if (error) throw error;
      if (!invoiceData) throw new Error('Invoice not found');

      // Company details (replace with your actual company details)
      const companyDetails = {
        name: 'Your Company Name',
        address: 'Your Company Address\nCity, State, PIN',
        phone: '+91 XXXXXXXXXX',
        email: 'contact@yourcompany.com',
        gst: 'XXXXXXXXXXXX',
      };

      // Create a temporary div for the invoice
      const printDiv = document.createElement('div');
      printDiv.style.position = 'absolute';
      printDiv.style.left = '-9999px';
      document.body.appendChild(printDiv);

      // Render the invoice template
      const root = createRoot(printDiv);
      root.render(
        <InvoiceTemplate
          invoice={invoiceData}
          companyDetails={companyDetails}
        />
      );

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate PDF
      const canvas = await html2canvas(printDiv.firstChild as HTMLElement, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgWidth = 208; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        imgWidth,
        imgHeight
      );

      // Download PDF
      pdf.save(`Invoice-${invoiceData.invoice_number}.pdf`);

      // Cleanup
      document.body.removeChild(printDiv);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    }
  };

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      // Fetch complete invoice data with related records
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders (
            so_number,
            customer:customers (
              name,
              email,
              phone,
              gst_number
            ),
            items:sales_order_items (
              quantity,
              unit_price,
              gst_rate,
              product:products (
                name,
                sku
              )
            )
          ),
          payments:sales_payments (
            amount,
            payment_date,
            payment_mode
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return;

      // Format data for export
      const formattedData = data.map(invoice => ({
        'Invoice Number': invoice.invoice_number,
        'Date': new Date(invoice.invoice_date).toLocaleDateString(),
        'Due Date': new Date(invoice.due_date).toLocaleDateString(),
        'Status': invoice.status,
        'SO Number': invoice.sales_order.so_number,
        'Customer Name': invoice.sales_order.customer.name,
        'Customer GST': invoice.sales_order.customer.gst_number,
        'Customer Phone': invoice.sales_order.customer.phone,
        'Customer Email': invoice.sales_order.customer.email,
        'Items': invoice.sales_order.items.map(item => 
          `${item.product.name} (${item.quantity} x ₹${item.unit_price})`
        ).join('\n'),
        'Subtotal': invoice.subtotal,
        'GST Amount': invoice.gst_amount,
        'Total Amount': invoice.total_amount,
        'Paid Amount': invoice.paid_amount,
        'Balance': invoice.total_amount - invoice.paid_amount,
        'Payments': invoice.payments.map(payment => 
          `₹${payment.amount} (${payment.payment_mode}) on ${new Date(payment.payment_date).toLocaleDateString()}`
        ).join('\n'),
      }));

      // Export the data
      exportData({
        fileName: `Invoices_${new Date().toISOString().split('T')[0]}`,
        format,
        data: formattedData,
      });
    } catch (error) {
      console.error('Error exporting invoices:', error);
      alert('Error exporting invoices. Please try again.');
    }
  };

  const handlePayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const updateInvoiceState = (invoiceId, newPaidAmount) => {
    setInvoices((prevInvoices) =>
      prevInvoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, paid_amount: newPaidAmount } : inv
      )
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.invoice_date).toISOString().split('T')[0];
    return invoiceDate >= startDate && invoiceDate <= endDate;
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Invoices</h1>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            onClick={() => handleExport('xlsx')} 
            variant="outline" 
            size="sm"
            className="flex-1 md:flex-none"
          >
            Export XLSX
          </Button>
          <Button 
            onClick={() => handleExport('csv')} 
            variant="outline" 
            size="sm"
            className="flex-1 md:flex-none"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="text-center col-span-full">Loading...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center col-span-full">No invoices found for the selected date range</div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-white shadow-md rounded-lg p-4 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-semibold">#{invoice.invoice_number}</h2>
                  <p className="text-sm text-gray-600">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  invoice.paid_amount >= invoice.total_amount 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {invoice.paid_amount >= invoice.total_amount ? 'Paid' : 'Pending'}
                </span>
              </div>

              <div className="flex-1">
                <div className="text-sm">
                  <p className="font-medium">{invoice.sales_order.customer.name}</p>
                  <p className="text-gray-600">{invoice.sales_order.customer.contact_person}</p>
                </div>

                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium">₹{invoice.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-medium">₹{invoice.paid_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-600">Balance:</span>
                    <span className="text-primary">₹{(invoice.total_amount - invoice.paid_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handlePrintInvoice(invoice)}
                >
                  View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePayment(invoice)}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onPaymentRecorded={() => {
            fetchInvoices();
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

interface PaymentFormProps {
  invoice: Invoice & { sales_order: SalesOrder & { customer: Customer } };
  onClose: () => void;
  onSave: () => void;
}

function PaymentForm({ invoice, onClose, onSave }: PaymentFormProps) {
  const [formData, setFormData] = useState<Partial<SalesPayment>>({
    payment_date: new Date().toISOString().split('T')[0],
    amount: invoice.total_amount - invoice.paid_amount,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('sales_payments')
        .insert([
          {
            invoice_id: invoice.id,
            ...formData,
            created_at: new Date().toISOString(),
          },
        ]);

      if (paymentError) throw paymentError;

      // Update invoice status and paid amount
      const newPaidAmount = invoice.paid_amount + (formData.amount || 0);
      const newStatus = newPaidAmount >= invoice.total_amount ? 'paid' : 'partial';

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Update customer outstanding balance
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          outstanding_balance: supabase.rpc('decrement', { amount: formData.amount || 0 }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.sales_order.customer_id);

      if (customerError) throw customerError;

      // Create customer ledger entry
      const { error: ledgerError } = await supabase
        .from('customer_ledger')
        .insert([
          {
            customer_id: invoice.sales_order.customer_id,
            date: formData.payment_date,
            type: 'payment',
            reference_id: invoice.id,
            reference_number: formData.reference_number,
            debit: 0,
            credit: formData.amount,
            balance: supabase.rpc('get_customer_balance', { p_customer_id: invoice.sales_order.customer_id }),
            notes: `Payment received for invoice: ${invoice.invoice_number}`,
            created_at: new Date().toISOString(),
          },
        ]);

      if (ledgerError) throw ledgerError;

      onSave();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Payment</h2>
          <p className="text-sm text-gray-600 mb-4">
            Invoice: {invoice.invoice_number}<br />
            Customer: {invoice.sales_order.customer.name}<br />
            Remaining Amount: ₹{(invoice.total_amount - invoice.paid_amount).toFixed(2)}
          </p>

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
                min="0.01"
                step="0.01"
                max={invoice.total_amount - invoice.paid_amount}
                className="mt-1 block w-full border rounded-md px-3 py-2"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                required
                className="mt-1 block w-full border rounded-md px-3 py-2"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as SalesPayment['payment_method'] })}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reference Number</label>
              <input
                type="text"
                className="mt-1 block w-full border rounded-md px-3 py-2"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              />
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
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Payment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
