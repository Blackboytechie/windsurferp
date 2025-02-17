import React from 'react';
import { Invoice, SalesOrder, Customer } from '@/types/sales';
import { Product } from '@/types/inventory';

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
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice, companyDetails }) => {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="invoice-template">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {companyDetails.logo && (
            <img src={companyDetails.logo} alt="Company Logo" className="h-16 mb-4" />
          )}
          <h1 className="text-2xl font-bold">{companyDetails.name}</h1>
          <p className="text-gray-600 whitespace-pre-line">{companyDetails.address}</p>
          <p className="text-gray-600">Phone: {companyDetails.phone}</p>
          <p className="text-gray-600">Email: {companyDetails.email}</p>
          <p className="text-gray-600">GSTIN: {companyDetails.gst}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-indigo-600 mb-2">TAX INVOICE</h2>
          <p className="text-gray-600">Invoice No: {invoice.invoice_number}</p>
          <p className="text-gray-600">Date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
          <p className="text-gray-600">Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
          <p className="text-gray-600">SO Ref: {invoice.sales_order.so_number}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8">
        <h3 className="text-gray-600 font-medium mb-2">Bill To:</h3>
        <h4 className="font-bold">{invoice.sales_order.customer.name}</h4>
        <p className="text-gray-600 whitespace-pre-line">{invoice.sales_order.customer.address}</p>
        <p className="text-gray-600">GSTIN: {invoice.sales_order.customer.gst_number}</p>
        <p className="text-gray-600">Phone: {invoice.sales_order.customer.phone}</p>
        <p className="text-gray-600">Email: {invoice.sales_order.customer.email}</p>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Rate</th>
            <th className="py-2 text-right">GST %</th>
            <th className="py-2 text-right">GST Amt</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.sales_order.items.map((item, index) => {
            const amount = item.quantity * item.unit_price;
            const gstAmount = (amount * item.gst_rate) / 100;
            return (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2">
                  <div className="font-medium">{item.product.name}</div>
                  <div className="text-sm text-gray-600">SKU: {item.product.sku}</div>
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">₹{item.unit_price.toFixed(2)}</td>
                <td className="py-2 text-right">{item.gst_rate}%</td>
                <td className="py-2 text-right">₹{gstAmount.toFixed(2)}</td>
                <td className="py-2 text-right">₹{(amount + gstAmount).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300">
            <td colSpan={4} className="py-2"></td>
            <td className="py-2 text-right font-medium">Subtotal:</td>
            <td className="py-2 text-right">₹{invoice.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="py-2"></td>
            <td className="py-2 text-right font-medium">GST:</td>
            <td className="py-2 text-right">₹{invoice.gst_amount.toFixed(2)}</td>
          </tr>
          <tr className="border-t-2 border-gray-300 font-bold">
            <td colSpan={4} className="py-2"></td>
            <td className="py-2 text-right">Total:</td>
            <td className="py-2 text-right">₹{invoice.total_amount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Terms and Bank Details */}
      <div className="grid grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold mb-2">Terms & Conditions:</h3>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Payment is due within {new Date(invoice.due_date).getDate() - new Date(invoice.invoice_date).getDate()} days</li>
            <li>Please include invoice number on your payment</li>
            <li>Goods once sold cannot be returned</li>
            <li>This is a computer generated invoice</li>
          </ol>
        </div>
        <div>
          <h3 className="font-bold mb-2">Bank Details:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Bank Name: YOUR BANK NAME</p>
            <p>Account Name: YOUR COMPANY NAME</p>
            <p>Account No: XXXXXXXXXXXX</p>
            <p>IFSC Code: XXXXXXXXX</p>
            <p>Branch: YOUR BRANCH</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-8 border-t border-gray-300">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>Thank you for your business!</p>
            <p>For any queries, please contact us at {companyDetails.phone}</p>
          </div>
          <div className="text-right">
            <p className="font-bold mb-4">For {companyDetails.name}</p>
            <p className="text-gray-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
