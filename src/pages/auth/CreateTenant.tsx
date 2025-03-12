import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';

export default function CreateTenant() {
  const { user } = useAuth();
  const { refreshTenantData } = useTenant();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('free');

  useEffect(() => {
    // Get the selected plan from localStorage
    const storedPlan = localStorage.getItem('selectedPlan');
    if (storedPlan) {
      setSelectedPlan(storedPlan);
    } else {
      // If no plan is selected, redirect to plan selection
      navigate('/auth/plans');
    }
  }, [navigate]);

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase letters, numbers, and hyphens
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !subdomain) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!user) {
      setError('You must be logged in to create an organization');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
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
        setError('This subdomain is already taken. Please choose another one.');
        return;
      }
      
      // Get the plan ID from the plans table
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('name', selectedPlan)
        .single();
        
      if (planError) {
        console.error('Error fetching plan:', planError);
        throw new Error('Could not find the selected plan');
      }
      
      // Calculate expiration date based on plan duration
      const now = new Date();
      let expirationDate = new Date();
      
      if (selectedPlan === 'free') {
        // Free plan expires in 1 day
        expirationDate.setDate(now.getDate() + 1);
      } else if (selectedPlan === 'basic' || selectedPlan === 'premium') {
        // Paid plans expire in 30 days
        expirationDate.setDate(now.getDate() + 30);
      }
      
      // Create the tenant
      const { data: tenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name,
          subdomain,
          owner_id: user.id,
          plan_id: planData.id,
          status: 'active',
          plan_expires_at: expirationDate.toISOString()
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Add the user as an admin of the tenant
      const { error: userError } = await supabase
        .from('tenant_users')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'admin'
        });
        
      if (userError) throw userError;
      
      // Clear the selected plan from localStorage
      localStorage.removeItem('selectedPlan');
      
      // Refresh tenant data in the context
      await refreshTenantData();
      
      // Redirect to dashboard
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      setError(error.message || 'An error occurred while creating your organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            Set up your organization to start using WindsurferP
            {selectedPlan && (
              <div className="mt-2 text-sm font-medium text-primary">
                Selected Plan: {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    placeholder="acme"
                    value={subdomain}
                    onChange={handleSubdomainChange}
                    required
                    className="rounded-r-none"
                  />
                  <div className="bg-gray-100 px-3 py-2 border border-l-0 border-input rounded-r-md text-sm text-gray-500">
                    .windsurferp.com
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  This will be your unique URL to access the system.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}