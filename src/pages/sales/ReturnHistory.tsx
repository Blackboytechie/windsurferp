import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Alert, { AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SalesReturn {
  id: string;
  return_number: string;
  customer_id: string;
  customer: {
    id: string;
    name: string;
  } | null;
  return_date: string;
  status: string;
  total_amount: number;
  reason: string;
}

export default function ReturnHistory() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchCustomers();
    fetchReturns();
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [selectedStatus, selectedCustomer]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('sales_returns')
        .select(`
          id,
          return_number,
          customer_id,
          customer:customers(id, name),
          return_date,
          status,
          total_amount,
          reason
        `)
        .order('created_at', { ascending: false });

      if (selectedCustomer !== 'all') {
        query = query.eq('customer_id', selectedCustomer);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setReturns(
        (data || []).map((item): SalesReturn => ({
          id: item.id,
          return_number: item.return_number,
          customer_id: item.customer_id,
          customer: Array.isArray(item.customer) ? item.customer[0] as { id: string; name: string } : item.customer as { id: string; name: string } || {
            id: '',
            name: 'Unknown Customer'
          },
          return_date: item.return_date,
          status: item.status,
          total_amount: item.total_amount,
          reason: item.reason
        }))
      );
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('Failed to fetch returns history');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (returnId: string, newStatus: string) => {
    try {
      setLoading(true);

      // Fetch return items to get product and quantity
      const { data: returnItems, error: returnItemsError } = await supabase
        .from('sales_return_items')
        .select('product_id, quantity')
        .eq('return_id', returnId);
      
      if (returnItemsError) throw returnItemsError;

      if (newStatus === 'approved') {
        for (const item of returnItems) {
          // Get current stock quantity and stock level
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('stock_quantity, stock_level')
            .eq('id', item.product_id)
            .single();

          if (productError) throw productError;

          const newStockQuantity = productData.stock_quantity - item.quantity;
          const newStockLevel = productData.stock_level - item.quantity;

          if (newStockQuantity < 0 || newStockLevel < 0) {
            setError('Not enough stock to process return!');
            return;
          }

          // Update product stock quantity and stock level
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newStockQuantity, stock_level: newStockLevel })
            .eq('id', item.product_id);

          if (updateError) throw updateError;
        }
      }

      // Update return status
      const { error: statusError } = await supabase
        .from('sales_returns')
        .update({ status: newStatus })
        .eq('id', returnId);

      if (statusError) throw statusError;

      // Update local state
      setReturns((prevReturns) =>
        prevReturns.map((returnItem) =>
          returnItem.id === returnId ? { ...returnItem, status: newStatus } : returnItem
        )
      );
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerFilterChange = (value: string) => {
    setSelectedCustomer(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setSelectedStatus(value);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'approved':
        return 'text-green-600 bg-green-50 border-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-100';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Returns History</CardTitle>
            <CardDescription>View all sales returns</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={fetchReturns}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Customer</label>
            <Select onValueChange={handleCustomerFilterChange} value={selectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Status</label>
            <Select onValueChange={handleStatusFilterChange} value={selectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {returns.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No returns found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-medium">
                      {returnItem.return_number}
                    </TableCell>
                    <TableCell>{returnItem.customer?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {format(new Date(returnItem.return_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <select
                        value={returnItem.status}
                        onChange={(e) => handleStatusChange(returnItem.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          returnItem.status
                        )}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                      </select>
                    </TableCell>
                    <TableCell>₹{returnItem.total_amount.toLocaleString()}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {returnItem.reason}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
