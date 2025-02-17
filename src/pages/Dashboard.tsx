import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SalesOrder, Invoice, Customer } from '@/types/sales';
import { Product } from '@/types/inventory';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  pendingSalesOrders: number;
  monthlyRevenue: number;
  outstandingAmount: number;
  totalCustomers: number;
  topSellingProducts: (Product & { total_quantity: number })[];
  recentActivity: {
    id: string;
    type: 'sales_order' | 'invoice' | 'payment' | 'stock';
    description: string;
    amount?: number;
    date: string;
  }[];
  salesTrend: {
    date: string;
    amount: number;
  }[];
  categoryDistribution: {
    name: string;
    value: number;
  }[];
  salesByPaymentMode: {
    month: string;
    cash: number;
    upi: number;
    bank_transfer: number;
    cheque: number;
  }[];
}

const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#0d9488', '#059669'];
const PAYMENT_MODE_COLORS = {
  cash: '#059669',
  upi: '#4f46e5',
  bank_transfer: '#0891b2',
  cheque: '#7c3aed',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    pendingSalesOrders: 0,
    monthlyRevenue: 0,
    outstandingAmount: 0,
    totalCustomers: 0,
    topSellingProducts: [],
    recentActivity: [],
    salesTrend: [],
    categoryDistribution: [],
    salesByPaymentMode: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch total products and low stock items
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact' });

      const { count: lowStockItems } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .lt('stock_quantity', 10);

      // Fetch pending sales orders
      const { count: pendingSalesOrders } = await supabase
        .from('sales_orders')
        .select('*', { count: 'exact' })
        .eq('status', 'confirmed');

      // Calculate monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .gte('created_at', startOfMonth.toISOString());

      const monthlyRevenue = monthlyInvoices?.reduce((sum, invoice) => sum + invoice.total_amount, 0) || 0;

      // Get total outstanding amount
      const { data: ledgerEntries } = await supabase
        .from('customer_ledger')
        .select('*');

      const outstandingAmount = ledgerEntries?.reduce((sum, entry) => {
        if (entry.type === 'invoice') {
          return sum + entry.amount;
        } else if (entry.type === 'payment') {
          return sum - entry.credit;
        }
        return sum;
      }, 0) || 0;

      // Get total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // Get top selling products
      const { data: topProducts } = await supabase
        .from('sales_order_items')
        .select(`
          product_id,
          quantity,
          product:products(*)
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const productSales = topProducts?.reduce((acc: Record<string, { product: Product; total_quantity: number }>, item) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            product: item.product,
            total_quantity: 0,
          };
        }
        acc[productId].total_quantity += item.quantity;
        return acc;
      }, {});

      const topSellingProducts = Object.values(productSales || {})
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5)
        .map(({ product, total_quantity }) => ({
          ...product,
          total_quantity,
        }));

      // Get recent activity
      const recentActivity = [];

      // Recent sales orders
      const { data: recentSOs } = await supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          created_at,
          customer:customers(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      recentSOs?.forEach(so => {
        recentActivity.push({
          id: so.id,
          type: 'sales_order',
          description: `New sales order ${so.order_number} from ${so.customer.name}`,
          amount: so.total_amount,
          date: so.created_at,
        });
      });

      // Recent payments
      const { data: recentPayments } = await supabase
        .from('customer_ledger')
        .select(`
          id,
          credit,
          created_at,
          type,
          customer:customers(name)
        `)
        .eq('type', 'payment')
        .order('created_at', { ascending: false })
        .limit(5);

      recentPayments?.forEach(payment => {
        recentActivity.push({
          id: payment.id,
          type: 'payment',
          description: `Payment received from ${payment.customer.name} for amount ${payment.credit}`,
          amount: payment.credit,
          date: payment.created_at,
        });
      });

      // Get sales trend
      const { data: salesTrend } = await supabase
        .from('invoices')
        .select('created_at, total_amount')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      const trend = salesTrend?.reduce((acc: Record<string, number>, invoice) => {
        const date = new Date(invoice.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + invoice.total_amount;
        return acc;
      }, {});

      const salesTrendData = Object.entries(trend || {}).map(([date, amount]) => ({
        date,
        amount,
      }));

      // Get category distribution
      const { data: products } = await supabase
        .from('products')
        .select('category');

      const categoryCount = products?.reduce((acc: Record<string, number>, product) => {
        const category = product.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      const categoryDistribution = Object.entries(categoryCount || {}).map(([name, value]) => ({
        name,
        value,
      }));

      // Get sales by payment mode for last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const { data: payments } = await supabase
        .from('sales_payments')
        .select('amount, payment_mode, payment_date')
        .gte('payment_date', sixMonthsAgo.toISOString())
        .order('payment_date');

      // Process payments by month and mode
      const paymentsByMonth: Record<string, Record<string, number>> = {};
      
      payments?.forEach(payment => {
        const month = new Date(payment.payment_date).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!paymentsByMonth[month]) {
          paymentsByMonth[month] = {
            cash: 0,
            upi: 0,
            bank_transfer: 0,
            cheque: 0,
          };
        }
        paymentsByMonth[month][payment.payment_mode.toLowerCase()] += payment.amount;
      });

      const salesByPaymentMode = Object.entries(paymentsByMonth)
        .map(([month, modes]) => ({
          month,
          ...modes,
        }))
        .sort((a, b) => {
          const [monthA, yearA] = a.month.split(' ');
          const [monthB, yearB] = b.month.split(' ');
          return new Date(`${monthA} 20${yearA}`).getTime() - new Date(`${monthB} 20${yearB}`).getTime();
        });

      setStats({
        totalProducts: totalProducts || 0,
        lowStockItems: lowStockItems || 0,
        pendingSalesOrders: pendingSalesOrders || 0,
        monthlyRevenue,
        outstandingAmount,
        totalCustomers: totalCustomers || 0,
        topSellingProducts,
        recentActivity: recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10),
        salesTrend: salesTrendData,
        categoryDistribution,
        salesByPaymentMode,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Total Products</p>
                <h3 className="text-base md:text-2xl font-bold">{stats.totalProducts}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-primary/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Low Stock Items</p>
                <h3 className="text-base md:text-2xl font-bold text-yellow-600">{stats.lowStockItems}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-yellow-500/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Pending Sales Orders</p>
                <h3 className="text-base md:text-2xl font-bold text-blue-600">{stats.pendingSalesOrders}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Monthly Revenue</p>
                <h3 className="text-base md:text-2xl font-bold text-green-600">₹{stats.monthlyRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-green-500/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Outstanding Amount</p>
                <h3 className="text-base md:text-2xl font-bold text-red-600">₹{stats.outstandingAmount.toLocaleString()}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-red-500/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Total Customers</p>
                <h3 className="text-base md:text-2xl font-bold text-purple-600">{stats.totalCustomers}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-purple-500/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Product Categories</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, 'Products']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Top Selling Products</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.topSellingProducts}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 30,
                  left: 100,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
                <Tooltip
                  formatter={(value: number) => [value, 'Units Sold']}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="total_quantity"
                  name="Units Sold"
                  fill="#4f46e5"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{activity.description}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.date).toLocaleDateString()}
                  </div>
                </div>
                {activity.amount && (
                  <div className="font-medium">
                    ₹{activity.amount.toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sales Trend */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h2 className="text-lg font-medium mb-4">Sales Trend (Last 30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.salesTrend}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                />
                <YAxis
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}K`}
                />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                  labelFormatter={(date) => new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: 'long' })}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name="Sales"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Payment Mode */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h2 className="text-lg font-medium mb-4">Monthly Sales by Payment Mode</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.salesByPaymentMode}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(1)}K`} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="cash"
                  name="Cash"
                  stackId="a"
                  fill={PAYMENT_MODE_COLORS.cash}
                />
                <Bar
                  dataKey="upi"
                  name="UPI"
                  stackId="a"
                  fill={PAYMENT_MODE_COLORS.upi}
                />
                <Bar
                  dataKey="bank_transfer"
                  name="Bank Transfer"
                  stackId="a"
                  fill={PAYMENT_MODE_COLORS.bank_transfer}
                />
                <Bar
                  dataKey="cheque"
                  name="Cheque"
                  stackId="a"
                  fill={PAYMENT_MODE_COLORS.cheque}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
