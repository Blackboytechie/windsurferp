import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PurchaseOrders from './PurchaseOrders';
import Suppliers from './Suppliers';
import Bills from './Bills';
import SupplierLedger from './SupplierLedger';
import Returns from './Returns';

export default function Purchases() {
  return (
    <div className="container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
      <Tabs defaultValue="purchase-orders" className="space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <TabsList className="h-auto p-1 grid grid-cols-3 md:flex md:grid-cols-none gap-1">
            <TabsTrigger value="purchase-orders" className="text-xs md:text-sm whitespace-nowrap">Purchase Orders</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs md:text-sm">Suppliers</TabsTrigger>
            <TabsTrigger value="bills" className="text-xs md:text-sm">Bills</TabsTrigger>
            <TabsTrigger value="supplier-ledger" className="text-xs md:text-sm whitespace-nowrap">Supplier Ledger</TabsTrigger>
            <TabsTrigger value="returns" className="text-xs md:text-sm">Returns</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="purchase-orders" className="space-y-4 mt-2 md:mt-4">
          <PurchaseOrders />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4 mt-2 md:mt-4">
          <Suppliers />
        </TabsContent>

        <TabsContent value="bills" className="space-y-4 mt-2 md:mt-4">
          <Bills />
        </TabsContent>

        <TabsContent value="supplier-ledger" className="space-y-4 mt-2 md:mt-4">
          <SupplierLedger />
        </TabsContent>

        <TabsContent value="returns" className="space-y-4 mt-2 md:mt-4">
          <Returns />
        </TabsContent>
      </Tabs>
    </div>
  );
}
