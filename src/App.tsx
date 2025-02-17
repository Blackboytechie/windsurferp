import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/auth/Login';

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
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Dashboard */}
            <Route 
              path="dashboard" 
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Dashboard />
                </Suspense>
              } 
            />

            {/* Sales Routes */}
            <Route path="sales">
              <Route 
                index 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Sales />
                  </Suspense>
                } 
              />
              <Route 
                path="customers" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Customers />
                  </Suspense>
                } 
              />
              <Route 
                path="sales-orders" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <SalesOrders />
                  </Suspense>
                } 
              />
              <Route 
                path="invoices" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Invoices />
                  </Suspense>
                } 
              />
              <Route 
                path="customer-ledger" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <CustomerLedger />
                  </Suspense>
                } 
              />
            </Route>

            {/* Purchase Routes */}
            <Route path="purchases">
              <Route 
                index 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Purchases />
                  </Suspense>
                } 
              />
              <Route 
                path="suppliers" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Suppliers />
                  </Suspense>
                } 
              />
              <Route 
                path="purchase-orders" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <PurchaseOrders />
                  </Suspense>
                } 
              />
              <Route 
                path="bills" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <Bills />
                  </Suspense>
                } 
              />
              <Route 
                path="returns" 
                element={
                  <Suspense fallback={<div>Loading...</div>}>
                    <PurchaseReturns />
                  </Suspense>
                } 
              />
            </Route>

            {/* Other Routes */}
            <Route 
              path="inventory" 
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Inventory />
                </Suspense>
              } 
            />
            <Route 
              path="quotations" 
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Quotations />
                </Suspense>
              } 
            />
            <Route 
              path="finance" 
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Finance />
                </Suspense>
              } 
            />
            <Route 
              path="reports" 
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Reports />
                </Suspense>
              } 
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
