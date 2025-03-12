import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  TrendingUp, 
  Truck, 
  ClipboardList, 
  BarChart4, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';

interface SidebarItemProps {
  icon: React.ReactNode;
  title: string;
  path: string;
  isActive: boolean;
  hasSubMenu?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ 
  icon, 
  title, 
  path, 
  isActive, 
  hasSubMenu = false, 
  isOpen = false, 
  onClick 
}: SidebarItemProps) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center px-4 py-2 my-1 text-sm rounded-md transition-colors",
        isActive 
          ? "bg-primary text-white" 
          : "text-gray-700 hover:bg-gray-100"
      )}
      onClick={onClick}
    >
      <span className="mr-3">{icon}</span>
      <span className="flex-1">{title}</span>
      {hasSubMenu && (
        <span className="ml-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      )}
    </Link>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const { currentTenant } = useTenant();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    sales: false,
    purchases: false
  });

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  if (!currentTenant) return null;

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">WindsurferP</h1>
        <p className="text-sm text-gray-500 mt-1 truncate">{currentTenant.name}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <SidebarItem
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Dashboard"
          path="/dashboard"
          isActive={location.pathname === '/dashboard'}
        />
        
        <SidebarItem
          icon={<Package className="h-5 w-5" />}
          title="Inventory"
          path="/inventory"
          isActive={location.pathname.startsWith('/inventory')}
        />
        
        {/* Sales Section */}
        <SidebarItem
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Sales"
          path="/sales"
          isActive={location.pathname.startsWith('/sales')}
          hasSubMenu={true}
          isOpen={openMenus.sales}
          onClick={() => toggleMenu('sales')}
        />
        
        {openMenus.sales && (
          <div className="ml-6 space-y-1">
            <SidebarItem
              icon={<Users className="h-4 w-4" />}
              title="Customers"
              path="/sales/customers"
              isActive={location.pathname === '/sales/customers'}
            />
            <SidebarItem
              icon={<ClipboardList className="h-4 w-4" />}
              title="Sales Orders"
              path="/sales/orders"
              isActive={location.pathname === '/sales/orders'}
            />
            <SidebarItem
              icon={<FileText className="h-4 w-4" />}
              title="Invoices"
              path="/sales/invoices"
              isActive={location.pathname === '/sales/invoices'}
            />
          </div>
        )}
        
        {/* Purchases Section */}
        <SidebarItem
          icon={<Truck className="h-5 w-5" />}
          title="Purchases"
          path="/purchases"
          isActive={location.pathname.startsWith('/purchases')}
          hasSubMenu={true}
          isOpen={openMenus.purchases}
          onClick={() => toggleMenu('purchases')}
        />
        
        {openMenus.purchases && (
          <div className="ml-6 space-y-1">
            <SidebarItem
              icon={<Users className="h-4 w-4" />}
              title="Suppliers"
              path="/purchases/suppliers"
              isActive={location.pathname === '/purchases/suppliers'}
            />
            <SidebarItem
              icon={<ClipboardList className="h-4 w-4" />}
              title="Purchase Orders"
              path="/purchases/orders"
              isActive={location.pathname === '/purchases/orders'}
            />
            <SidebarItem
              icon={<FileText className="h-4 w-4" />}
              title="Bills"
              path="/purchases/bills"
              isActive={location.pathname === '/purchases/bills'}
            />
          </div>
        )}
        
        <SidebarItem
          icon={<TrendingUp className="h-5 w-5" />}
          title="Quotations"
          path="/quotations"
          isActive={location.pathname.startsWith('/quotations')}
        />
        
        <SidebarItem
          icon={<BarChart4 className="h-5 w-5" />}
          title="Reports"
          path="/reports"
          isActive={location.pathname.startsWith('/reports')}
        />
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          {currentTenant.subdomain}.windsurferp.com
        </div>
      </div>
    </div>
  );
}