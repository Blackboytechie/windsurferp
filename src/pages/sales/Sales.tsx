import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import Customers from './Customers';
import SalesOrders from './SalesOrders';
import Invoices from './Invoices';
import CustomerLedger from './CustomerLedger';
import Returns from './Returns';
import { supabase } from '@/lib/supabase';

interface SalesStats {
  totalSales: number;
  pendingInvoices: number;
  totalCustomers: number;
  recentOrders: number;
}

export default function Sales() {
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    recentOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesStats();
  }, []);

  const fetchSalesStats = async () => {
    try {
      setLoading(true);
      
      // Get total sales amount from invoices
      const { data: salesData } = await supabase
        .from('invoices')
        .select('total_amount')
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());
      
      const totalSales = salesData?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0;

      // Get pending invoices count
      const { count: pendingInvoices } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get total customers count
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get recent orders (last 7 days)
      const { count: recentOrders } = await supabase
        .from('sales_orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString());

      setStats({
        totalSales,
        pendingInvoices: pendingInvoices || 0,
        totalCustomers: totalCustomers || 0,
        recentOrders: recentOrders || 0
      });
    } catch (error) {
      console.error('Error fetching sales stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center justify-between space-x-2 md:space-x-4">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Sales (30d)</p>
                <h3 className="text-base md:text-2xl font-bold">₹{stats.totalSales.toLocaleString()}</h3>
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
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Pending</p>
                <h3 className="text-base md:text-2xl font-bold">{stats.pendingInvoices}</h3>
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
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Customers</p>
                <h3 className="text-base md:text-2xl font-bold">{stats.totalCustomers}</h3>
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
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Orders (7d)</p>
                <h3 className="text-base md:text-2xl font-bold">{stats.recentOrders}</h3>
              </div>
              <div className="p-1.5 md:p-2 bg-blue-500/10 rounded-full">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales-orders" className="space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <TabsList className="h-auto p-1 grid grid-cols-3 md:flex md:grid-cols-none gap-1">
            <TabsTrigger value="sales-orders" className="text-xs md:text-sm whitespace-nowrap">Sales Orders</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs md:text-sm">Customers</TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs md:text-sm">Invoices</TabsTrigger>
            <TabsTrigger value="customer-ledger" className="text-xs md:text-sm whitespace-nowrap">Customer Ledger</TabsTrigger>
            <TabsTrigger value="returns" className="text-xs md:text-sm">Returns</TabsTrigger>
          </TabsList>
          <Button 
            variant="outline"
            onClick={fetchSalesStats}
            disabled={loading}
            className="w-full md:w-auto text-xs md:text-sm"
          >
            Refresh Stats
          </Button>
        </div>

        <TabsContent value="sales-orders" className="space-y-4 mt-2 md:mt-4">
          <SalesOrders />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 mt-2 md:mt-4">
          <Customers />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-2 md:mt-4">
          <Invoices />
        </TabsContent>

        <TabsContent value="customer-ledger" className="space-y-4 mt-2 md:mt-4">
          <CustomerLedger />
        </TabsContent>

        <TabsContent value="returns" className="space-y-4 mt-2 md:mt-4">
          <Returns />
        </TabsContent>
      </Tabs>
    </div>
  );
}
