import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building, ChevronDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

export default function TenantSelector() {
  const { user } = useAuth();
  const { currentTenant, switchTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadTenants();
    }
  }, [user]);

  async function loadTenants() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          tenants:tenants!tenant_id(
            id,
            name,
            subdomain
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      if (data) {
        // Extract tenant objects from the nested structure and filter out any undefined values
        const tenantList = data
          .map(item => item.tenants && item.tenants[0])
          .filter(tenant => tenant !== undefined && tenant !== null);
        setTenants(tenantList);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSwitchTenant = async (tenantId: string) => {
    await switchTenant(tenantId);
  };

  const handleCreateTenant = () => {
    navigate('/auth/create-tenant');
  };

  if (!currentTenant) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Building className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{currentTenant.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitchTenant(tenant.id)}
            className={`cursor-pointer ${tenant.id === currentTenant.id ? 'bg-gray-100' : ''}`}
          >
            {tenant.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateTenant} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}