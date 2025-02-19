import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerLedger, Customer } from '@/types/sales';
import { Button } from '@/components/ui/button';
import { exportData } from '@/utils/exportUtils';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CustomerLedgerPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  // Initialize date range to last 30 days by default
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  });

  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customer) {
      fetchLedger();
    } else {
      setLedgerEntries([]);
    }
  }, [customer, dateRange]);

  const fetchCustomers = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please refresh the page.');
    }
  };

  // Add a helper function to format currency
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0.00';
    }
    return `₹${amount.toFixed(2)}`;
  };

  // Add a helper function to validate numeric values
  const validateNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const fetchLedger = async () => {
    if (!customer) return;
    
    setLoading(true);
    setError(null);
    try {
      // Fetch all sales orders for the customer
      const { data: orders, error: ordersError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get all invoice IDs from the orders
      const orderIds = orders?.map(order => order.id) || [];
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .in('order_id', orderIds)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Get all payments for these invoices
      const invoiceIds = invoices?.map(invoice => invoice.id) || [];
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('reference_id', invoiceIds)
        .eq('type', 'invoice')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Create ledger entries
      const ledgerEntries: LedgerEntry[] = [];
      
      // Add invoice entries
      invoices?.forEach(invoice => {
        if (!invoice) return;
        const totalAmount = validateNumber(invoice.total_amount);
        const paidAmount = validateNumber(invoice.paid_amount);
        
        ledgerEntries.push({
          id: `invoice-${invoice.id}`,
          date: invoice.invoice_date || new Date().toISOString().split('T')[0],
          type: 'Invoice',
          reference: invoice.invoice_number || `Invoice #${invoice.id}`,
          notes: `Invoice generated for order #${invoice.order_id}`,
          debit: totalAmount,
          credit: 0,
          amount: totalAmount,
          balance: totalAmount - paidAmount
        });
      });

      // Add payment entries
      payments?.forEach(payment => {
        if (!payment) return;
        const relatedInvoice = invoices?.find(inv => inv.id === payment.reference_id);
        const paymentAmount = validateNumber(payment.amount);
        
        ledgerEntries.push({
          id: `payment-${payment.id}`,
          date: payment.payment_date || new Date().toISOString().split('T')[0],
          type: 'Payment',
          reference: payment.reference_number || `Payment for ${relatedInvoice?.invoice_number || 'Unknown Invoice'}`,
          notes: `Payment received via ${payment.payment_method || 'Unknown method'}`,
          debit: 0,
          credit: paymentAmount,
          amount: -paymentAmount, // Negative amount for payments
          balance: 0 // This will be calculated below
        });
      });

      // Sort entries by date
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = 0;
      ledgerEntries.forEach(entry => {
        runningBalance += (entry.debit - entry.credit);
        entry.balance = runningBalance;
      });

      setLedgerEntries(ledgerEntries.map(entry => ({
        id: entry.id,
        date: entry.date,
        customer_id: customer?.id || '',
        reference_id: entry.id,
        reference: entry.reference,
        reference_number: entry.reference,
        created_at: entry.date,
        type: entry.type.toLowerCase() as 'invoice' | 'payment' | 'credit_note' | 'debit_note',
        notes: entry.notes,
        debit: entry.debit,
        credit: entry.credit,
        amount: entry.amount,
        balance: entry.balance
      })));
      setPayments(payments || []);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      setError(error instanceof Error ? error.message : 'Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  const getTypeDetails = (type: LedgerEntry['type']) => {
    switch (type) {
      case 'Invoice':
        return {
          label: 'Invoice',
          color: 'text-red-600',
          icon: '📄'
        };
      case 'Payment':
        return {
          label: 'Payment',
          color: 'text-green-600',
          icon: '💰'
        };
      default:
        return {
          label: type,
          color: 'text-gray-600',
          icon: '📎'
        };
    }
  };

  const entriesWithBalance = useMemo(() => {
    let balance = 0;
    return ledgerEntries.map(entry => {
      balance = balance + entry.debit - entry.credit;
      return { ...entry, running_balance: balance };
    });
  }, [ledgerEntries]);

  const totals = useMemo(() => {
    return entriesWithBalance.reduce((acc, entry) => ({
      debit: acc.debit + entry.debit,
      credit: acc.credit + entry.credit,
      balance: entry.running_balance // Last entry's running balance
    }), { debit: 0, credit: 0, balance: 0 });
  }, [entriesWithBalance]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!customer) {
      alert('Please select a customer first');
      return;
    }

    try {
      setExportLoading(true);
      setError(null);

      const formattedData = entriesWithBalance.map(entry => ({
        'Date': new Date(entry.date).toLocaleDateString(),
        'Type': getTypeDetails(entry.type.charAt(0).toUpperCase() + entry.type.slice(1) as 'Invoice' | 'Payment').label,
        'Reference': entry.type === 'invoice' 
          ? `Invoice #${entry.reference_number}`
          : `Payment - ${entry.reference}`,
        'Debit': entry.debit || '',
        'Credit': entry.credit || '',
        'Balance': entry.running_balance,
        'Notes': entry.notes || '',
      }));

      const sheets = [
        {
          name: 'Ledger',
          data: formattedData,
        },
        {
          name: 'Summary',
          data: [{
            'Customer Name': customer.name,
            'Customer Code': customer.code,
            'GST Number': customer.gst_number,
            'Period': `${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`,
            'Total Debit': totals.debit,
            'Total Credit': totals.credit,
            'Closing Balance': totals.balance,
            'Report Generated': new Date().toLocaleString(),
          }],
        },
      ];

      await exportData({
        fileName: `${customer.name}_Ledger_${dateRange.from}_to_${dateRange.to}`,
        format,
        sheets,
      });
    } catch (err) {
      console.error('Error exporting customer ledger:', err);
      setError('Failed to export ledger. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDateRangeChange = (type: 'from' | 'to', value: string) => {
    setDateRange(prev => {
      const newRange = { ...prev, [type]: value };
      // Validate date range
      if (new Date(newRange.from) > new Date(newRange.to)) {
        if (type === 'from') {
          return { ...newRange, to: value };
        } else {
          return { ...newRange, from: value };
        }
      }
      return newRange;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customer Ledger</h1>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport('xlsx')}
            disabled={!customer || exportLoading}
          >
            {exportLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export XLSX'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={!customer || exportLoading}
          >
            {exportLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export CSV'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <select
            className="mt-1 block w-full border rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={customer?.id || ''}
            onChange={(e) => {
              const selected = customers.find(c => c.id === e.target.value);
              setCustomer(selected || null);
            }}
          >
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From Date</label>
          <input
            type="date"
            className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={dateRange.from}
            max={dateRange.to}
            onChange={(e) => handleDateRangeChange('from', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To Date</label>
          <input
            type="date"
            className="mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={dateRange.to}
            min={dateRange.from}
            onChange={(e) => handleDateRangeChange('to', e.target.value)}
          />
        </div>
      </div>

      {/* Customer Details */}
      {customer && (
        <div className="bg-white rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-500">Customer Name</label>
            <div className="font-medium">{customer.name}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Contact Person</label>
            <div className="font-medium">{customer.contact_person || '-'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">GST Number</label>
            <div className="font-medium">{customer.gst_number || '-'}</div>
          </div>
          <div>
            <label className="text-sm text-gray-500">Outstanding Balance</label>
            <div className={`font-medium ${totals.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(totals.balance).toFixed(2)}<span className="text-sm ml-1">{totals.balance >= 0 ? 'Dr' : 'Cr'}</span></div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center">
                    No ledger entries found
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr 
                    key={entry.id}
                    onClick={() => setSelectedEntry({
                      id: entry.id,
                      date: entry.date,
                      type: entry.type.charAt(0).toUpperCase() + entry.type.slice(1) as 'Invoice' | 'Payment',
                      reference: entry.reference,
                      notes: entry.notes,
                      debit: entry.debit,
                      credit: entry.credit,
                      amount: entry.amount,
                      balance: entry.balance
                    })}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`${entry.type === 'invoice' ? 'text-red-600' : 'text-green-600'}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {entry.reference}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-sm">
                      {entry.type === 'invoice'
                        ? formatCurrency(entry.debit)
                        : formatCurrency(entry.credit)
                      }
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-sm">
                      <span className={entry.balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(entry.balance))}
                        <span className="text-xs ml-1">{entry.balance >= 0 ? 'Dr' : 'Cr'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-medium text-sm">
                  Totals:
                </td>
                <td className="px-4 py-3 text-right font-medium text-sm">
                  {formatCurrency(ledgerEntries.reduce((sum, entry) => sum + (entry.debit || entry.credit), 0))}
                </td>
                <td className="px-4 py-3 text-right font-medium text-sm">
                  <span className={ledgerEntries[ledgerEntries.length - 1]?.balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(Math.abs(ledgerEntries[ledgerEntries.length - 1]?.balance || 0))}
                    <span className="text-xs ml-1">
                      {ledgerEntries[ledgerEntries.length - 1]?.balance >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="mt-1">{new Date(selectedEntry.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="mt-1">
                    <span className={`${selectedEntry.type === 'Invoice' ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedEntry.type}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference</label>
                  <p className="mt-1">{selectedEntry.reference}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="mt-1">
                    {selectedEntry.type === 'Invoice' 
                      ? formatCurrency(selectedEntry.debit)
                      : formatCurrency(selectedEntry.credit)
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="mt-1 text-sm text-gray-700">{selectedEntry.notes}</p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Running Balance</span>
                  <span className={`font-medium ${selectedEntry.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(selectedEntry.balance))}
                    <span className="text-xs ml-1">{selectedEntry.balance >= 0 ? 'Dr' : 'Cr'}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment';
  reference: string;
  notes: string;
  debit: number;
  credit: number;
  amount: number;
  balance: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  paid_amount: number;
  order_id: string;
}

interface SalesPayment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  reference_id: string;
  type: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment';
  reference: string;
  notes: string;
  debit: number;
  credit: number;
  amount: number;
  balance: number;
  invoice?: Invoice;
  payment?: SalesPayment;
}

