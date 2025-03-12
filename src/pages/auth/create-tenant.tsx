import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext'; // Add this import
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Alert, { AlertDescription } from '@/components/ui/alert';

export default function CreateTenant() {
  const [tenantName, setTenantName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadTenant } = useTenant(); // Add this to get the loadTenant function

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase letters, numbers, and hyphens
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a tenant');
      return;
    }
    
    if (!tenantName || !subdomain) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if subdomain is available
      const { data: existingTenant, error: checkError } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', subdomain)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingTenant) {
        setError(`Subdomain "${subdomain}" is already taken. Please choose another.`);
        return;
      }
      
      // Get the default free plan
      const { data: freePlan, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('name', 'Free')
        .single();
        
      if (planError) throw planError;
      
      // Create the tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName,
          subdomain,
          plan_id: freePlan.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (tenantError) throw tenantError;
      
      // Add the current user as admin of the tenant
      const { error: userRoleError } = await supabase
        .from('tenant_users')
        .insert({
          tenant_id: newTenant.id,
          user_id: user.id,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      // After successfully creating the tenant and adding the user role
      if (userRoleError) throw userRoleError;
      
      // Force reload tenant data before redirecting
      await loadTenant();
      
      // Add a small delay to ensure the context is updated
      setTimeout(() => {
        // Redirect to the dashboard
        navigate('/dashboard');
      }, 500);
      
      // After creating the tenant, explicitly refresh the tenant context
      await refreshTenantData();
      
      // Clear any cached data
      localStorage.removeItem('selectedPlan');
      
      // Force a page reload to ensure clean state
      window.location.href = '/dashboard';
      
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      setError(error.message || 'An error occurred while creating your organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create Your Organization</CardTitle>
          <CardDescription>
            Set up your organization to get started with WindsurferP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Organization Name</Label>
              <Input
                id="tenantName"
                placeholder="Acme Inc."
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="subdomain"
                  placeholder="acme"
                  value={subdomain}
                  onChange={handleSubdomainChange}
                  required
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">.windsurferp.com</span>
              </div>
              <p className="text-xs text-gray-500">
                This will be your unique URL. Use only lowercase letters, numbers, and hyphens.
              </p>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !tenantName || !subdomain}
            >
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-gray-500">
            Already have an organization?{' '}
            <a href="/dashboard" className="text-primary hover:underline">
              Go to Dashboard
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}