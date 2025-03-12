import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function AppLayout() {
  const { currentTenant, loading, error, loadTenant, planFeatures, canUseFeature } = useTenant();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [planStatus, setPlanStatus] = useState<'active'|'expired'|'trial'|null>(null);

  useEffect(() => {
    // Add debugging
    console.log('AppLayout useEffect:', { 
      user: !!user, 
      loading, 
      currentTenant: !!currentTenant, 
      error 
    });
    
    // Check tenant plan status
    if (currentTenant) {
      // Determine plan status based on tenant data
      if (currentTenant.status === 'active') {
        setPlanStatus('active');
      } else if (currentTenant.status === 'trial') {
        setPlanStatus('trial');
      } else if (currentTenant.status === 'expired') {
        setPlanStatus('expired');
      }
    }
    
    // If user is logged in but has no tenant, redirect to create tenant
    if (user && !loading && !currentTenant && !error) {
      console.log('Redirecting to create tenant page');
      navigate('/auth/create-tenant');
    }
    
    // Force tenant refresh if stuck in loading state for too long
    if (user && loading && isInitialLoad) {
      const timer = setTimeout(() => {
        console.log('Tenant loading taking too long, forcing refresh');
        loadTenant().then(() => {
          setIsInitialLoad(false);
        }).catch(err => {
          console.error('Error loading tenant:', err);
          setIsInitialLoad(false);
        });
      }, 5000); // Wait 5 seconds before forcing refresh
      
      return () => clearTimeout(timer);
    }
    
    if (!loading) {
      setIsInitialLoad(false);
    }
  }, [user, currentTenant, loading, error, navigate, loadTenant, isInitialLoad]);

  // Handle plan expiration or payment required
  const handleUpgradePlan = () => {
    navigate('/billing/plans');
  };

  // Add debugging
  console.log('AppLayout render:', { 
    user: !!user, 
    loading, 
    currentTenant: !!currentTenant, 
    error,
    planStatus
  });

  if (loading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-2">Loading tenant data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/auth/create-tenant')}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Create Organization
          </button>
        </div>
      </div>
    );
  }

  // Show plan expired notice
  if (planStatus === 'expired') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">Subscription Expired</h2>
          <p className="text-gray-700 mb-4">
            Your subscription has expired. Please renew your plan to continue using the system.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleUpgradePlan}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Renew Subscription
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {planStatus === 'trial' && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 px-4">
          You are using a trial version. <button onClick={handleUpgradePlan} className="underline font-medium">Upgrade now</button> to unlock all features.
        </div>
      )}
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-y-auto p-4 ${planStatus === 'trial' ? 'pt-10' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}