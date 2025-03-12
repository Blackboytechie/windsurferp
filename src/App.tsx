import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import LandingPage from '@/pages/LandingPage';
import PlanSelection from '@/pages/auth/PlanSelection';
import { TenantProvider } from './contexts/TenantContext';
import { Toaster } from './components/ui/toaster';
import CreateTenant from '@/pages/auth/create-tenant';

// Lazy load pages
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Inventory = React.lazy(() => import('@/pages/inventory/Inventory'));
const Sales = React.lazy(() => import('@/pages/sales/Sales'));
const Customers = React.lazy(() => import('@/pages/sales/Customers'));
const SalesOrders = React.lazy(() => import('@/pages/sales/SalesOrders'));
const Invoices = React.lazy(() => import('@/pages/sales/Invoices'));
const CustomerLedger = React.lazy(() => import('@/pages/sales/CustomerLedger'));

// Purchase pages
const Purchases = React.lazy(() => import('@/pages/purchases/Purchases'));
const Suppliers = React.lazy(() => import('@/pages/purchases/Suppliers'));
const PurchaseOrders = React.lazy(() => import('@/pages/purchases/PurchaseOrders'));
const Bills = React.lazy(() => import('@/pages/purchases/Bills'));
const PurchaseReturns = React.lazy(() => import('@/pages/purchases/PurchaseReturns'));

// Other pages
const Quotations = React.lazy(() => import('@/pages/quotations/Quotations'));
const Finance = React.lazy(() => import('@/pages/finance/Finance'));
const Reports = React.lazy(() => import('@/pages/reports/Reports'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <TenantProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              
              {/* Add the plan selection route */}
              <Route path="/auth/plans" element={<PlanSelection />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/auth/create-tenant" element={<CreateTenant />} />
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  {/* Inventory Routes */}
                  <Route path="/inventory" element={<Inventory />} />
                  
                  {/* Sales Routes */}
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/sales/customers" element={<Customers />} />
                  <Route path="/sales/orders" element={<SalesOrders />} />
                  <Route path="/sales/invoices" element={<Invoices />} />
                  <Route path="/sales/customer-ledger" element={<CustomerLedger />} />
                  
                  {/* Purchase Routes */}
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/purchases/suppliers" element={<Suppliers />} />
                  <Route path="/purchases/orders" element={<PurchaseOrders />} />
                  <Route path="/purchases/bills" element={<Bills />} />
                  <Route path="/purchases/returns" element={<PurchaseReturns />} />
                  
                  {/* Other Routes */}
                  <Route path="/quotations" element={<Quotations />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
          <Toaster />
        </TenantProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
