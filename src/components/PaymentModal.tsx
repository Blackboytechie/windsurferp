import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice, SalesOrder, Customer } from '@/types/sales';

interface Payment {
  id: number;
  reference_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  type: string;
  notes: string;
}

interface PaymentModalProps {
  invoice: Invoice & { sales_order: SalesOrder & { customer: Customer } };
  onClose: () => void;
  onPaymentRecorded: (amount: number) => void;
}

const PaymentModal = ({ invoice, onClose, onPaymentRecorded }: PaymentModalProps) => {
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balanceAmount, setBalance] = useState(invoice.total_amount - invoice.paid_amount);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' }
  ];

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('reference_id', invoice.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to fetch payment history');
    }
  };

  const validatePayment = () => {
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return false;
    }
    if (paymentAmount > balanceAmount) {
      setError('Payment amount cannot exceed balance amount');
      return false;
    }
    if (paymentMethod === 'bank_transfer' && !referenceNumber) {
      setError('Reference number is required for bank transfer');
      return false;
    }
    return true;
  };

  const handleRecordPayment = async () => {
    setError('');
    if (!validatePayment()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .insert([{ 
          reference_id: invoice.id,
          amount: paymentAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          status: 'completed',
          type: 'invoice',
          notes: `Payment for invoice ${invoice.invoice_number}`
        }]);

      if (error) throw error;

      const newPaidAmount = invoice.paid_amount + paymentAmount;
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          paid_amount: newPaidAmount,
          status: newPaidAmount >= invoice.total_amount ? 'paid' : 'partial'
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      setPaymentAmount(0);
      setReferenceNumber('');
      fetchPayments();
      onPaymentRecorded(paymentAmount);
      
      const updatedBalance = invoice.total_amount - newPaidAmount;
      setBalance(updatedBalance);
      
      if (newPaidAmount >= invoice.total_amount) {
        onClose();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [invoice]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-lg">
        <h2 className="text-xl font-bold mb-4">Record Payment for Invoice {invoice.invoice_number}</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-lg font-medium mb-1">Balance Amount: ₹{balanceAmount.toFixed(2)}</p>
            <p className="text-sm text-gray-500">Total Amount: ₹{invoice.total_amount.toFixed(2)}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Payment Amount</label>
            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setPaymentAmount(Math.min(value, balanceAmount));
                setError('');
              }}
              placeholder="Enter payment amount"
              className="border rounded p-2 w-full focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="border rounded p-2 w-full focus:ring-2 focus:ring-blue-500"
            >
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {paymentMethod === 'bank_transfer' && (
            <div>
              <label className="block text-sm font-medium mb-1">Reference Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter reference number"
                className="border rounded p-2 w-full focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button 
            onClick={handleRecordPayment} 
            disabled={loading}
            className={`w-full p-2 rounded text-white font-medium ${
              loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Processing...' : 'Record Payment'}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Payment History</h3>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">₹{payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </p>
                    {payment.reference_number && (
                      <p className="text-xs text-gray-600">
                        Ref: {payment.reference_number}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="mt-6 text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
