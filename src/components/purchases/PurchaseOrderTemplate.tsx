import { PurchaseOrder, Supplier } from '@/types/purchase';
import { forwardRef } from 'react';

interface PurchaseOrderTemplateProps {
  purchaseOrder: PurchaseOrder & { supplier: Supplier };
  items: any[];
  companyDetails?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gst: string;
    logo?: string;
  };
}

export const PurchaseOrderTemplate = forwardRef<HTMLDivElement, PurchaseOrderTemplateProps>(({ purchaseOrder, items, companyDetails = {
  name: 'Your Company Name',
  address: '123 Business Street\nCity, State, ZIP',
  phone: '(123) 456-7890',
  email: 'contact@company.com',
  gst: 'GSTIN12345',
} }, ref) => {
    console.log("PurchaseOrder", purchaseOrder);
    
  return (
    <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto print:p-6 print:max-w-none print:shadow-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">PURCHASE ORDER</h1>
          <p className="text-gray-600 mt-1">PO Number: {purchaseOrder.po_number}</p>
          <p className="text-gray-600">Date: {new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-gray-800">{companyDetails.name}</h2>
          <p className="text-gray-600 whitespace-pre-line">{companyDetails.address}</p>
          <p className="text-gray-600">Phone: {companyDetails.phone}</p>
          <p className="text-gray-600">Email: {companyDetails.email}</p>
          <p className="text-gray-600">GSTIN: {companyDetails.gst}</p>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Supplier Details:</h3>
          <div className="border p-4 rounded">
            <p className="font-medium">{purchaseOrder.supplier.name}</p>
            <p>{purchaseOrder.supplier.address}</p>
            <p>Contact: {purchaseOrder.supplier.contact_person}</p>
            <p>Email: {purchaseOrder.supplier.email}</p>
            <p>Phone: {purchaseOrder.supplier.phone}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Order Details:</h3>
          <div className="border p-4 rounded">
            <p><span className="font-medium">Order Date:</span> {new Date(purchaseOrder.order_date).toLocaleDateString()}</p>
            <p><span className="font-medium">Expected Delivery:</span> {new Date(purchaseOrder.expected_delivery).toLocaleDateString()}</p>
            <p><span className="font-medium">Status:</span> {purchaseOrder.status.charAt(0).toUpperCase() + purchaseOrder.status.slice(1)}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8 overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 border text-left">Item</th>
              <th className="px-4 py-2 border text-right">Quantity</th>
              <th className="px-4 py-2 border text-right">Unit Price</th>
              <th className="px-4 py-2 border text-right">GST %</th>
              <th className="px-4 py-2 border text-right">GST Amount</th>
              <th className="px-4 py-2 border text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border">
                <td className="px-4 py-2 border">{item.product.name}</td>
                <td className="px-4 py-2 border text-right">{item.quantity}</td>
                <td className="px-4 py-2 border text-right">₹{item.unit_price.toFixed(2)}</td>
                <td className="px-4 py-2 border text-right">{item.gst_rate}%</td>
                <td className="px-4 py-2 border text-right">₹{item.gst_amount.toFixed(2)}</td>
                <td className="px-4 py-2 border text-right">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-4 py-2 border text-right font-medium">Subtotal:</td>
              <td colSpan={2} className="px-4 py-2 border text-right">₹{purchaseOrder.subtotal.toFixed(2)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-4 py-2 border text-right font-medium">GST Total:</td>
              <td colSpan={2} className="px-4 py-2 border text-right">₹{purchaseOrder.gst_amount.toFixed(2)}</td>
            </tr>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={4} className="px-4 py-2 border text-right">Total Amount:</td>
              <td colSpan={2} className="px-4 py-2 border text-right">₹{purchaseOrder.total_amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {purchaseOrder.notes && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Notes:</h3>
          <p className="border p-4 rounded">{purchaseOrder.notes}</p>
        </div>
      )}

      {/* Terms and Signature */}
      <div className="grid grid-cols-2 gap-8 mt-12">
        <div>
          <h3 className="text-lg font-semibold mb-2">Terms and Conditions:</h3>
          <ol className="list-decimal list-inside text-sm text-gray-600">
            <li>Payment terms: Net 30 days</li>
            <li>Please include PO number on invoice</li>
            <li>Goods must meet specified quality standards</li>
            <li>Delivery as per agreed schedule</li>
          </ol>
        </div>
        <div>
          <div className="mt-8 pt-8 border-t">
            <p className="text-center text-gray-600">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
});

PurchaseOrderTemplate.displayName = 'PurchaseOrderTemplate';