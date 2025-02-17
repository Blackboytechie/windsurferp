import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { exportData } from '@/utils/exportUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from '@/utils/formatters';

interface Supplier {
  id: string;
  name: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  reference: string;
  notes: string;
  debit: number;
  credit: number;
  amount: number;
  balance: number;
}

export default function SupplierLedgerPage() {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (supplier) {
      fetchLedgerEntries();
    }
  }, [supplier, startDate, endDate]);

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

  const fetchLedgerEntries = async () => {
    if (!supplier) return;
    setLoading(true);

    try {
      // Fetch purchase orders (debits)
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, order_date, total_amount')
        .eq('supplier_id', supplier.id)
        .gte('order_date', startDate || '1900-01-01')
        .lte('order_date', endDate || '2099-12-31')
        .order('order_date');

      if (poError) throw poError;

      // Fetch payments (credits)
      const { data: payments, error: paymentError } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          bills!inner(
            id,
            purchase_order:purchase_orders!inner(
              id,
              supplier_id
            )
          )
        `)
        .eq('bills.purchase_order.supplier_id', supplier.id)
        .gte('payment_date', startDate || '1900-01-01')
        .lte('payment_date', endDate || '2099-12-31')
        .order('payment_date');

      if (paymentError) throw paymentError;

      const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      // Create ledger entries
      const ledgerEntries = [];
      
      // Add purchase order entries
      purchaseOrders?.forEach(po => {
        if (!po) return;
        const totalAmount = Number(po.total_amount) || 0;
        
        
        ledgerEntries.push({
          id: `po-${po.id}`,
          date: po.order_date || new Date().toISOString().split('T')[0],
          type: 'Purchase Order',
          reference: po.po_number || `PO #${po.id}`,
          notes: `Purchase Order generated`,
          debit: totalAmount,
          credit: 0,
          amount: totalAmount,
          balance: totalAmount - totalPayments 
        });
      });

      // Add payment entries
      payments?.forEach((payment, index) => {
        if (!payment) return;
        const relatedPO = purchaseOrders?.find(po => po.id === payment.bills.purchase_order.id);
        const paymentAmount = Number(payment.amount) || 0;

        // Ensure unique key generation
        const paymentId = payment.id ? payment.id : `unknown-${index}`;

        ledgerEntries.push({
          id: `payment-${paymentId}-${new Date(payment.payment_date).getTime()}`, // Ensure unique key
          date: payment.payment_date || new Date().toISOString().split('T')[0],
          type: 'Payment',
          reference: payment.reference_number || `Payment for ${relatedPO?.po_number || 'Unknown PO'}`,
          notes: `Payment made via ${payment.payment_method || 'Unknown method'}`,
          debit: 0,
          credit: paymentAmount,
          amount: -paymentAmount,
          balance: 0
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

      setLedgerEntries(ledgerEntries);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!supplier) return;

    const data = ledgerEntries.map(entry => ({
      Date: new Date(entry.date).toLocaleDateString(),
      Type: entry.type,
      Reference: entry.reference,
      Notes: entry.notes,
      Debit: entry.debit || '',
      Credit: entry.credit || '',
      Balance: entry.balance
    }));

    exportData(data, `supplier_ledger_${supplier.name}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Ledger</h1>
        <Button onClick={handleExport} disabled={!supplier || ledgerEntries.length === 0}>
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Select Supplier</label>
          <Select
            value={supplier?.id || ''}
            onValueChange={(value) => {
              const selected = suppliers.find(s => s.id === value);
              setSupplier(selected || null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>
      </div>

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
                    onClick={() => setSelectedEntry(entry)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`${entry.type === 'Purchase Order' ? 'text-red-600' : 'text-green-600'}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {entry.reference}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-sm">
                      {entry.type === 'Purchase Order' 
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
                    <span className={`${selectedEntry.type === 'Purchase Order' ? 'text-red-600' : 'text-green-600'}`}>
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
                    {selectedEntry.type === 'Purchase Order' 
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
