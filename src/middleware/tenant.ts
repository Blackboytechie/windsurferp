import { supabase } from '@/lib/supabase';

// Tenant middleware for API routes
export async function tenantMiddleware(req: Request, userId: string | undefined) {
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  try {
    // Extract tenant from request headers or URL
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    
    if (!tenantId) {
      return { error: 'Tenant ID is required', status: 400 };
    }
    
    // Check if user has access to this tenant
    const { data: tenantUser, error } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();
    
    if (error || !tenantUser) {
      return { error: 'You do not have access to this tenant', status: 403 };
    }
    
    // User has access, return tenant context
    return { 
      tenantId, 
      userRole: tenantUser.role,
      status: 200 
    };
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return { error: 'Internal server error', status: 500 };
  }
}

// Helper to get tenant ID from URL for client-side components
export function getTenantFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  // First check for subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // If we have a subdomain that's not www
  if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
    // This is a subdomain, we need to look up the tenant by subdomain
    return parts[0];
  }
  
  // Otherwise check for tenant ID in URL params
  const params = new URLSearchParams(window.location.search);
  return params.get('tenant_id');
}