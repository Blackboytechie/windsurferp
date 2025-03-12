import React, { forwardRef, useMemo } from 'react';
import { Invoice, SalesOrder, Customer } from '@/types/sales';
import { Product } from '@/types/inventory';
import { format } from 'date-fns';

interface InvoiceTemplateProps {
  invoice: Invoice & {
    sales_order: SalesOrder & {
      customer: Customer;
      items: (SalesOrder['items'][0] & {
        product: Product;
      })[];
    };
  };
  companyDetails: {
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
    startIndex?: number;
    currentPageItems?: (SalesOrder['items'][0] & {
      product: Product;
    })[];
  };
  payments?: any[]; // Added missing payments property
}


const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({ invoice, companyDetails, pageInfo }, ref) => {
  const ITEMS_PER_PAGE = 10;

  // Handle pagination for items
  const { currentPageItems, startIndex } = useMemo(() => {
    const start = pageInfo ? (pageInfo.currentPage - 1) * ITEMS_PER_PAGE : 0;
    const end = pageInfo ? Math.min(start + ITEMS_PER_PAGE, invoice.sales_order.items.length) : invoice.sales_order.items.length;
    return {
      currentPageItems: invoice.sales_order.items.slice(start, end),
      startIndex: start
    };
  }, [invoice.sales_order.items, pageInfo, ITEMS_PER_PAGE]);

  // Remove console logs
  const formatDate = (date: string) => {
    return format(new Date(date), 'dd-MM-yyyy');
  };
console.log("invoice : ",invoice);
console.log("currentpageitems : ",currentPageItems);
// Calculate the correct tax amount based on 18% GST
const calculatedTaxAmount = invoice.subtotal * 0.18;
  
  return (

    // Remove the empty rows section and update the container styling
    <div ref={ref} className="bg-white p-4 max-w-4xl mx-auto print:p-4 print:max-w-none print:shadow-none print:min-h-[297mm] print:w-[210mm] print:relative border-2 border-gray-300 flex flex-col">
      {/* Header - Fixed for every page */}
      <div className="border-b-2 border-gray-300">
        <div className="text-center border-b-2 border-gray-300 py-6 relative">
          <h1 className="text-2xl font-bold text-gray-800">{companyDetails.name}</h1>
          <p className="text-gray-600">{companyDetails.address}</p>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 grid grid-cols-1 gap-1 text-xs">
            <div className="border border-gray-300 px-2 py-1 bg-white shadow-sm">Original for Recipient</div>
            <div className="border border-gray-300 px-2 py-1 bg-white shadow-sm">Duplicate for Transporter</div>
            <div className="border border-gray-300 px-2 py-1 bg-white shadow-sm">Triplicate for Supplier</div>
          </div>
        </div>

        <div className="text-center bg-blue-100 py-2 border-b-2 border-gray-300 relative">
          <h2 className="text-xl font-bold">TAX INVOICE</h2>
          {/* <div className="absolute right-4 top-1/2 -translate-y-1/2 grid grid-cols-1 gap-1 text-xs">
            <div className="border border-gray-300 px-2 py-1 bg-white shadow-sm">Original for Recipient</div>
            <div className="border border-gray-300 px-2 py-1 bg-white shadow-sm">Duplicate for Transporter</div>
            <div className="border border-gray-300 px-2 py-1 bg-white shadow-sm">Triplicate for Supplier</div>
          </div> */}
        </div>

        <div className="grid grid-cols-2 border-b-2 border-gray-300">
          <div className="p-2 border-r-2 border-gray-300">
            <p className="text-sm"><span className="font-semibold">Reverse Charge</span> : No</p>
            <p className="text-sm"><span className="font-semibold">Invoice No.</span> : {invoice.invoice_number}</p>
            <p className="text-sm"><span className="font-semibold">Invoice Date</span> : {formatDate(invoice.invoice_date)}</p>
            <p className="text-sm"><span className="font-semibold">State</span> : Tamil Nadu</p>
          </div>
          <div className="p-2">
            <p className="text-sm"><span className="font-semibold">Challan No.</span> : </p>
            <p className="text-sm"><span className="font-semibold">Vehicle No.</span> : </p>
            <p className="text-sm"><span className="font-semibold">Date of Supply</span> : {formatDate(invoice.invoice_date)}</p>
            <div className="flex items-center">
              <p className="text-sm mr-2"><span className="font-semibold">Place of Supply</span> : </p>
              <div className="inline-block border border-gray-300 px-2 py-1 text-xs">
                <span className="font-semibold">State Code</span> : 33
              </div>
            </div>
          </div>
        </div>

        {/* Show customer details only on first page */}
        {(!pageInfo || pageInfo.currentPage === 1) && (
          <div className="grid grid-cols-2 bg-blue-100">
            <div className="p-2 border-r-2 border-gray-300">
              <h3 className="font-semibold mb-1 text-center text-sm">Details of Receiver | Billed to:</h3>
              <p className="text-xs"><span className="font-semibold">Name</span> : {invoice.sales_order.customer.name}</p>
              <p className="text-xs"><span className="font-semibold">Address</span> : {invoice.sales_order.customer.address}</p>
              <div className="text-xs flex items-center">
                <span className="font-semibold mr-1">State</span> : Tamil Nadu
                <div className="inline-block border border-gray-300 px-2 py-1 text-xs ml-2">
                  <span className="font-semibold">State Code</span> : 33
                </div>
              </div>
            </div>
            <div className="p-2">
              <h3 className="font-semibold mb-1 text-center text-sm">Details of Consignee | Shipped to:</h3>
              <p className="text-xs"><span className="font-semibold">Name</span> : {invoice.sales_order.customer.name}</p>
              <p className="text-xs"><span className="font-semibold">Address</span> : {invoice.sales_order.customer.address}</p>
              <div className="text-xs flex items-center">
                <span className="font-semibold mr-1">State</span> : Tamil Nadu
                <div className="inline-block border border-gray-300 px-2 py-1 text-xs ml-2">
                  <span className="font-semibold">State Code</span> : 33
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto print:overflow-visible my-2">
        <table className="w-full border-collapse border-2 border-gray-300">
          <thead className="print:table-header-group bg-gray-50">
            <tr>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">Sr. No.</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">Name of product</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">QTY</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">Unit</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">Rate</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">Taxable Value</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs" colSpan={2}>CGST</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs" colSpan={2}>SGST</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center font-semibold text-xs">Total</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 border-2 border-gray-300"></th>
              <th className="px-2 py-1 border-2 border-gray-300"></th>
              <th className="px-2 py-1 border-2 border-gray-300"></th>
              <th className="px-2 py-1 border-2 border-gray-300"></th>
              <th className="px-2 py-1 border-2 border-gray-300"></th>
              <th className="px-2 py-1 border-2 border-gray-300"></th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center text-xs">Rate</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center text-xs">Amount</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center text-xs">Rate</th>
              <th className="px-2 py-1 border-2 border-gray-300 text-center text-xs">Amount</th>
              <th className="px-2 py-1 border-2 border-gray-300"></th>
            </tr>
          </thead>
          <tbody>
            {currentPageItems.map((item, index) => {
              const quantity = item.quantity || 0;
              const unitPrice = item.unit_price || 0;
              const taxableValue = quantity * unitPrice;
              
              // For GST calculation - always use 18% if tax_rate is 0 but we know it should be 18%
              const gstRate = item.tax_rate && item.tax_rate > 0 ? item.tax_rate : 18;
              const gstAmount = (taxableValue * gstRate) / 100;
              
              // Split GST into CGST and SGST (always half of total GST)
              const cgstRate = gstRate / 2;
              const cgstAmount = gstAmount / 2;
              const sgstRate = gstRate / 2;
              const sgstAmount = gstAmount / 2;
              
              const totalAmount = taxableValue + gstAmount;
              
              return (
                <tr key={startIndex + index} className="border-2 border-gray-300">
                  <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">{startIndex + index + 1}</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-xs">
                    {item.product ? item.product.name : 'Unknown Product'}
                    {item.product?.sku && <div className="text-xs text-gray-500">{item.product.sku}</div>}
                  </td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">{quantity}</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs"></td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">{unitPrice.toFixed(2)}</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">{taxableValue.toFixed(2)}</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">{cgstRate.toFixed(1)}%</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">{cgstAmount.toFixed(2)}</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">{sgstRate.toFixed(1)}%</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">{sgstAmount.toFixed(2)}</td>
                  <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">{totalAmount.toFixed(2)}</td>
                </tr>
              );
            })}
            {(!pageInfo || pageInfo.isLastPage) && (
              <tr className="bg-blue-100">
                <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs"></td>
                <td className="px-2 py-1 border-2 border-gray-300 text-right font-medium text-xs">Total</td>
                <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">
                  {invoice.sales_order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                </td>
                <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs"></td>
                <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs"></td>
                <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">
                  ₹{invoice.subtotal.toFixed(2)}
                </td>
                <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">9.0%</td>
                <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">
                  ₹{(calculatedTaxAmount / 2).toFixed(2)}
                </td>
                <td className="px-2 py-1 border-2 border-gray-300 text-center text-xs">9.0%</td>
                <td className="px-2 py-1 border-2 border-gray-300 text-right text-xs">
                  ₹{(calculatedTaxAmount / 2).toFixed(2)}
                </td>
                <td className="px-2 py-1 border-2 border-gray-300 text-right font-medium text-xs">
                  ₹{(invoice.subtotal + calculatedTaxAmount).toFixed(2)}
                </td>
              </tr>
            )}
            {/* Remove the empty rows section */}
          </tbody>
        </table>
      </div>

      {/* Summary Table - Show after items on last page only */}
      {(!pageInfo || pageInfo.isLastPage) && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border-2 border-gray-300 p-2">
              <p className="font-semibold mb-2 text-xs">Total Invoice Amount in words</p>
              <p className="text-xs">{(invoice.subtotal + calculatedTaxAmount).toFixed(2)} Rupees Only</p>
            </div>
            <div className="border-2 border-gray-300 p-2">
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1">Total Amount Before Tax:</td>
                    <td className="py-1 text-right">₹{invoice.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Add: CGST @ 9%</td>
                    <td className="py-1 text-right">₹{(invoice.subtotal * 0.09).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Add: SGST @ 9%</td>
                    <td className="py-1 text-right">₹{(invoice.subtotal * 0.09).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Tax Amount: GST @ 18%</td>
                    <td className="py-1 text-right">₹{calculatedTaxAmount.toFixed(2)}</td>
                  </tr>
                  <tr className="font-bold bg-blue-100">
                    <td className="py-1">Amount With Tax</td>
                    <td className="py-1 text-right">₹{(invoice.subtotal + calculatedTaxAmount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Paid Amount:</td>
                    <td className="py-1 text-right">₹{invoice.paid_amount.toFixed(2)}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-1">Balance Due:</td>
                    <td className="py-1 text-right">₹{((invoice.subtotal + calculatedTaxAmount) - invoice.paid_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Payment Status Section
          <div className="mb-4 border-2 border-gray-300 p-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold">Payment Status:</p>
                <p className="text-xs">{invoice.paid_amount >= invoice.total_amount ? 'PAID' : 
                  invoice.paid_amount > 0 ? 'PARTIALLY PAID' : 'UNPAID'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">Due Date:</p>
                <p className="text-xs">{formatDate(invoice.due_date)}</p>
              </div>
            </div>
          </div> */}
        </>
      )}


         {/* Footer Section - Only on last page, positioned at bottom */}
      {(!pageInfo || pageInfo.isLastPage) && (
        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border-t-2 border-gray-300 pt-2">
              <h3 className="text-xs font-semibold mb-1">Terms And Conditions:</h3>
              <ol className="list-decimal list-inside text-xs text-gray-600">
                <li>This is an electronically generated document.</li>
                <li>All disputes are subject to Nagapattinam jurisdiction</li>
              </ol>
            </div>
            <div className="text-center">
              <p className="text-xs mb-1">Certified that the particular given above are true and correct</p>
              <p className="font-bold text-sm">For, {companyDetails.name}</p>
              <div className="mt-12">
                <p className="text-xs">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

export default InvoiceTemplate;