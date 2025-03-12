import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { getTenantFromUrl } from '@/middleware/tenant';
import { getPlanFeatures, canUseFeature as checkFeature } from '@/utils/planUtils';

// Add plan information to the Tenant interface
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan_id: string;
  status: string;
}

// Add a new interface for plan features
interface PlanFeatures {
  maxUsers: number;
  maxProjects: number;
  hasInventoryManagement: boolean;
  hasAdvancedReporting: boolean;
  hasMultiCurrency: boolean;
  hasApiAccess: boolean;
}

// Add plan-related functions to the context type
interface TenantContextType {
  currentTenant: Tenant | null;
  userRole: string | null;
  loading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  loadTenant: () => Promise<void>;
  refreshTenantData: () => Promise<boolean>;
  planFeatures: PlanFeatures | null;
  canUseFeature: (featureName: string) => boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);
  
  // Update loadTenant to also load plan information
  // Make sure the loadTenant function properly isolates tenant data
  // Add this interface to properly type the query result
  interface TenantUserResult {
    tenant_id: string;
    role: string;
    tenant: Tenant;
  }
  
  // In the loadTenant function
  const loadTenant = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCurrentTenant(null);
        setLoading(false);
        return;
      }
      
      // Get the user's active tenant with proper typing
      const { data: tenantUser, error: tenantUserError } = await supabase
        .from('tenant_users')
        .select('tenant_id, role, tenant:tenants(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as { data: TenantUserResult | null, error: any };
      
      if (tenantUserError && tenantUserError.code !== 'PGRST116') {
        console.error('Error fetching tenant:', tenantUserError);
        setError('Failed to load tenant data');
        setLoading(false);
        return;
      }
      
      if (!tenantUser) {
        setCurrentTenant(null);
        setLoading(false);
        return;
      }
      
      // Set the current tenant - ensure we're setting a single object, not an array
      if (tenantUser.tenant && !Array.isArray(tenantUser.tenant)) {
        setCurrentTenant(tenantUser.tenant);
        setUserRole(tenantUser.role);
        
        // Clear any previous tenant data from Supabase cache
        supabase.auth.refreshSession();
        
        // Set RLS policies by setting the tenant_id in the user's metadata
        await supabase.functions.invoke('set-tenant-context', {
          body: { tenant_id: tenantUser.tenant_id }
        });
        
        // Load plan features
        const { data: plan } = await supabase
          .from('plans')
          .select('*')
          .eq('id', tenantUser.tenant.plan_id)
          .single();
          
        if (plan) {
          setPlanFeatures(plan.features);
        }
      } else {
        console.error('Invalid tenant data format:', tenantUser.tenant);
        setError('Invalid tenant data format');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in loadTenant:', error);
      setError('Failed to load tenant data');
      setLoading(false);
    }
  };
  async function switchTenant(tenantId: string) {
    try {
      setLoading(true);
      setError(null);
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
        
      if (tenantError) throw tenantError;
      
      if (tenant) {
        // Check if user has access to this tenant
        const { data: tenantUser, error: accessError } = await supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', tenant.id)
          .eq('user_id', user?.id)
          .single();
          
        if (accessError) {
          setError('You do not have access to this organization.');
        } else {
          setCurrentTenant(tenant);
          setUserRole(tenantUser.role);
          
          // Redirect to tenant subdomain in production
          if (process.env.NODE_ENV === 'production') {
            window.location.href = `https://${tenant.subdomain}.windsurferp.com`;
          } else {
            // In development, use query param
            const url = new URL(window.location.href);
            url.searchParams.set('tenant_id', tenant.id);
            window.history.pushState({}, '', url);
          }
        }
      } else {
        setError('Organization not found.');
      }
    } catch (error: any) {
      console.error('Error switching tenant:', error);
      setError(error.message || 'An error occurred while switching the organization.');
    } finally {
      setLoading(false);
    }
  }

  // Add this function to the TenantContext
  async function refreshTenantData() {
    if (user) {
      await loadTenant();
      return true;
    }
    return false;
  }
  
  // Add a function to check if the current tenant can use a feature
  function canUseFeature(featureName: string): boolean {
    if (!currentTenant || !planFeatures) return false;
    
    // First check if the feature exists in the plan features
    if (featureName in planFeatures) {
      return !!planFeatures[featureName as keyof typeof planFeatures];
    }
    
    // For numeric limits (like maxUsers)
    if (featureName.startsWith('max')) {
      const limit = planFeatures[featureName as keyof typeof planFeatures] as number;
      // -1 means unlimited
      return limit === -1 || limit > 0;
    }
    
    return false;
  }
  
  const value = {
    currentTenant,
    userRole,
    loading,
    error,
    switchTenant,
    loadTenant,
    refreshTenantData, // Add this line
    planFeatures,
    canUseFeature
  };
  
  // Update the interface to include the new function
  // Remove this duplicate interface definition inside the component
  // interface TenantContextType {
  //   currentTenant: Tenant | null;
  //   userRole: string | null;
  //   loading: boolean;
  //   error: string | null;
  //   switchTenant: (tenantId: string) => Promise<void>;
  //   refreshTenantData: () => Promise<boolean>; // Add this line
  // }
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}