import { PurchaseOrder, Supplier } from '@/types/purchase';
import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';

interface PurchaseOrderItem {
  product: {
    name: string;
  };
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
}

interface PurchaseOrderTemplateProps {
  purchaseOrder: PurchaseOrder & { supplier: Supplier };
  items: PurchaseOrderItem[];
  companyDetails?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gst: string;
    logo?: string;
  };
  pageInfo?: {
    currentPage: number;
    totalPages: number;
    isLastPage: boolean;
  };
}

export const PurchaseOrderTemplate = forwardRef<HTMLDivElement, PurchaseOrderTemplateProps>(({ purchaseOrder, items, companyDetails = { name: 'Your Company Name', address: '123 Business Street\nCity, State, ZIP', phone: '(123) 456-7890', email: 'contact@company.com', gst: 'GSTIN12345', }, pageInfo }, ref) => {
  const ITEMS_PER_PAGE = 10;

  // Update the useMemo to better handle pagination
  const { currentPageItems, startIndex } = useMemo(() => {
    const start = pageInfo ? (pageInfo.currentPage - 1) * ITEMS_PER_PAGE : 0;
    const end = pageInfo ? Math.min(start + ITEMS_PER_PAGE, items.length) : items.length;
    return {
      currentPageItems: items.slice(start, end),
      startIndex: start
    };
  }, [items, pageInfo, ITEMS_PER_PAGE]);


  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy');
  };

  return (
    <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto print:p-6 print:max-w-none print:shadow-none print:min-h-[297mm] print:w-[210mm] print:relative">
      {/* Header Section - Show on every page */}
      <div className="border-b-2 border-gray-200 mb-6 print:mb-4 print:pb-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{companyDetails.name}</h1>
          <p className="text-gray-600 whitespace-pre-line">{companyDetails.address}</p>
          <p className="text-gray-600">Tamil Nadu, {companyDetails.gst}</p>
        </div>

        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">PURCHASE ORDER</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">PO Number: {purchaseOrder.po_number}</p>
            <p className="text-gray-600">Date: {formatDate(purchaseOrder.order_date)}</p>
            <p className="text-gray-600">State Code: 33</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Vehicle No.: {purchaseOrder.vehicle_no || 'N/A'}</p>
            <p className="text-gray-600">Place of Supply: {purchaseOrder.place_of_supply || 'Tamil Nadu'}</p>
          </div>
        </div>

        {/* Show supplier details only on first page */}
        {(!pageInfo || pageInfo.currentPage === 1) && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border p-3 rounded">
              <h3 className="font-semibold mb-1">Details of Receiver | Billed to:</h3>
              <p className="text-sm">{purchaseOrder.supplier.name}</p>
              <p className="text-sm">{purchaseOrder.supplier.address}</p>
              <p className="text-sm">State: Tamil Nadu</p>
              <p className="text-sm">State Code: 33</p>
            </div>
            <div className="border p-3 rounded">
              <h3 className="font-semibold mb-1">Details of Consignee | Shipped to:</h3>
              <p className="text-sm">{purchaseOrder.supplier.name}</p>
              <p className="text-sm">{purchaseOrder.supplier.address}</p>
              <p className="text-sm">State: Tamil Nadu</p>
              <p className="text-sm">State Code: 33</p>
            </div>
          </div>
        )}
      </div>

      {/* Items Table Section */}
      <div className="overflow-x-auto print:overflow-visible mb-4">
        <table className="w-full border-collapse border print:border print:border-gray-300">
          <thead className="print:table-header-group bg-gray-50">
            <tr>
              <th className="px-3 py-2 border text-left font-semibold text-sm print:border print:border-gray-300">Sr. No.</th>
              <th className="px-3 py-2 border text-left font-semibold text-sm print:border print:border-gray-300">Name of Product</th>
              <th className="px-3 py-2 border text-right font-semibold text-sm print:border print:border-gray-300">QTY</th>
              <th className="px-3 py-2 border text-right font-semibold text-sm print:border print:border-gray-300">Rate</th>
              <th className="px-3 py-2 border text-right font-semibold text-sm print:border print:border-gray-300">Taxable Value</th>
              <th className="px-3 py-2 border text-center font-semibold text-sm print:border print:border-gray-300" colSpan={2}>CGST</th>
              <th className="px-3 py-2 border text-center font-semibold text-sm print:border print:border-gray-300" colSpan={2}>SGST</th>
              <th className="px-3 py-2 border text-right font-semibold text-sm print:border print:border-gray-300">Total</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-3 py-1 border print:border print:border-gray-300"></th>
              <th className="px-3 py-1 border print:border print:border-gray-300"></th>
              <th className="px-3 py-1 border print:border print:border-gray-300"></th>
              <th className="px-3 py-1 border print:border print:border-gray-300"></th>
              <th className="px-3 py-1 border print:border print:border-gray-300"></th>
              <th className="px-3 py-1 border text-center text-sm print:border print:border-gray-300">Rate</th>
              <th className="px-3 py-1 border text-center text-sm print:border print:border-gray-300">Amount</th>
              <th className="px-3 py-1 border text-center text-sm print:border print:border-gray-300">Rate</th>
              <th className="px-3 py-1 border text-center text-sm print:border print:border-gray-300">Amount</th>
              <th className="px-3 py-1 border print:border print:border-gray-300"></th>
            </tr>
          </thead>
          <tbody>
            {currentPageItems.map((item, index) => (
              <tr key={startIndex + index} className="border print:border-gray-300">
                <td className="px-3 py-2 border text-sm print:border print:border-gray-300">{startIndex + index + 1}</td>
                <td className="px-3 py-2 border text-sm print:border print:border-gray-300">{item.product.name}</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">{item.quantity}</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{item.unit_price.toFixed(2)}</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.quantity * item.unit_price).toFixed(2)}</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">{(item.gst_rate/2).toFixed(1)}%</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.gst_amount/2).toFixed(2)}</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">{(item.gst_rate/2).toFixed(1)}%</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.gst_amount/2).toFixed(2)}</td>
                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Table - Show after items on each page */}
      {(!pageInfo || pageInfo.isLastPage) && (
        <div className="mb-6">
          <table className="w-full border-collapse border print:border print:border-gray-300">
            <tbody>
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-3 py-2 border text-right font-medium print:border print:border-gray-300">Total Quantity:</td>
                <td className="px-3 py-2 border text-right print:border print:border-gray-300">{items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td colSpan={4} className="px-3 py-2 border text-right font-medium print:border print:border-gray-300">Total Amount Before Tax:</td>
                <td className="px-3 py-2 border text-right print:border print:border-gray-300">₹{purchaseOrder.subtotal.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-3 py-2 border text-right font-medium print:border print:border-gray-300">Add: CGST</td>
                <td colSpan={2} className="px-3 py-2 border text-right print:border print:border-gray-300">₹{(purchaseOrder.gst_amount/2).toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td colSpan={8} className="px-3 py-2 border text-right font-medium print:border print:border-gray-300">Add: SGST</td>
                <td colSpan={2} className="px-3 py-2 border text-right print:border print:border-gray-300">₹{(purchaseOrder.gst_amount/2).toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={8} className="px-3 py-2 border text-right print:border print:border-gray-300">Amount With Tax:</td>
                <td colSpan={2} className="px-3 py-2 border text-right print:border print:border-gray-300">₹{purchaseOrder.total_amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Section - Show only on last page */}
      {(!pageInfo || pageInfo.isLastPage) && (
        <div className="print:absolute print:bottom-0 print:left-0 print:right-0 print:pb-8 print:px-6 print:bg-white">
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="text-sm font-semibold mb-2">Terms And Conditions:</h3>
              <ol className="list-decimal list-inside text-sm text-gray-600">
                <li>This is an electronically generated document.</li>
                <li>All disputes are subject to local jurisdiction</li>
              </ol>
            </div>
            <div>
              <div className="mt-8 pt-8 border-t text-center">
                <p className="text-sm text-gray-600">For, {companyDetails.name}</p>
                <p className="mt-8 text-sm text-gray-600">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Number */}
      {pageInfo && (
        <div className="text-right text-xs text-gray-500 mt-4 print:absolute print:bottom-4 print:right-6">
          Page {pageInfo.currentPage} of {pageInfo.totalPages}
        </div>
      )}
    </div>
  );
});

PurchaseOrderTemplate.displayName = 'PurchaseOrderTemplate';