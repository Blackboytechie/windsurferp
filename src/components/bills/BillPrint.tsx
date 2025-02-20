import { useRef } from 'react';
import { Bill, PurchaseOrder, Supplier } from '@/types/purchase';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '../ui/button';
import { useReactToPrint } from 'react-to-print';



export default function BillPrint({ props, ref }) {
  return (
    <div>
    <div ref={ref} className="p-8 max-w-4xl mx-auto bg-white">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">MURALI AGENCIES</h1>
        <p className="text-sm">10 Neela North side, Nagapattinam, Tamil Nadu, 611001</p>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">TAX INVOICE</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="space-y-1">
          <p><span className="font-medium">Reverse Charge:</span> No</p>
          <p><span className="font-medium">Invoice No:</span> {props.bill.bill_number}</p>
          <p><span className="font-medium">Invoice Date:</span> {new Date(props.bill.bill_date).toLocaleDateString()}</p>
          <p><span className="font-medium">State:</span> Tamil Nadu <span className="font-medium">State Code:</span> 33</p>
        </div>
        <div className="space-y-1">
          <p><span className="font-medium">Challan No:</span></p>
          <p><span className="font-medium">Vehicle No:</span></p>
          <p><span className="font-medium">Date of Supply:</span> {new Date(props.bill.bill_date).toLocaleDateString()}</p>
          <p><span className="font-medium">Place of Supply:</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm border-t border-b py-4">
        <div>
          <h3 className="font-bold mb-2">Details of Receiver | Billed to:</h3>
          <div className="space-y-1">
            <p><span className="font-medium">Name:</span> {props.bill.purchase_order.supplier.name}</p>
            <p><span className="font-medium">Address:</span> {props.bill.purchase_order.supplier.address}</p>
            <p><span className="font-medium">State:</span> Tamil Nadu <span className="font-medium">State Code:</span> 33</p>
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-2">Details of Consignee | Shipped to:</h3>
          <div className="space-y-1">
            <p><span className="font-medium">Name:</span> {props.bill.purchase_order.supplier.name}</p>
            <p><span className="font-medium">Address:</span> {props.bill.purchase_order.supplier.address}</p>
            <p><span className="font-medium">State:</span> Tamil Nadu <span className="font-medium">State Code:</span> 33</p>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse mb-6 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="border p-2 text-left">Sr. No.</th>
            <th className="border p-2 text-left">Name of product</th>
            <th className="border p-2 text-center">QTY</th>
            <th className="border p-2 text-center">Unit</th>
            <th className="border p-2 text-right">Rate</th>
            <th className="border p-2 text-right">Taxable Value</th>
            <th className="border p-2 text-center" colSpan={2}>CGST</th>
            <th className="border p-2 text-center" colSpan={2}>SGST</th>
            <th className="border p-2 text-right">Total</th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border p-2" colSpan={6}></th>
            <th className="border p-2 text-center">Rate</th>
            <th className="border p-2 text-center">Amount</th>
            <th className="border p-2 text-center">Rate</th>
            <th className="border p-2 text-center">Amount</th>
            <th className="border p-2"></th>
          </tr>
        </thead>
        <tbody>
          {props.billItems.map((item, index) => {
            const taxableValue = item.quantity * item.price;
            const gstRate = 9.0; // Split total GST rate between CGST and SGST
            const gstAmount = (taxableValue * gstRate) / 100;
            console.log("item :", item);
            return (
              <tr key={index}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2 text-center">{item.quantity}</td>
                <td className="border p-2 text-center">{item.unit}</td>
                <td className="border p-2 text-right">{item.price.toFixed(2)}</td>
                <td className="border p-2 text-right">{taxableValue.toFixed(2)}</td>
                <td className="border p-2 text-center">{gstRate}%</td>
                <td className="border p-2 text-right">{gstAmount.toFixed(2)}</td>
                <td className="border p-2 text-center">{gstRate}%</td>
                <td className="border p-2 text-right">{gstAmount.toFixed(2)}</td>
                <td className="border p-2 text-right">{(taxableValue + 2 * gstAmount).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="border p-2" colSpan={2}>Total Quantity</td>
            <td className="border p-2 text-center">{billItems.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td className="border p-2" colSpan={2}></td>
            <td className="border p-2 text-right">₹{billItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</td>
            <td className="border p-2" colSpan={2}>₹{billItems.reduce((sum, item) => sum + ((item.quantity * item.price * 6.0) / 100), 0).toFixed(2)}</td>
            <td className="border p-2" colSpan={2}>₹{billItems.reduce((sum, item) => sum + ((item.quantity * item.price * 6.0) / 100), 0).toFixed(2)}</td>
            <td className="border p-2 text-right">₹{billItems.reduce((sum, item) => sum + (item.quantity * item.price * 1.12), 0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mb-6">
        <p className="font-medium">Total Invoice Amount in words:</p>
        <p>Forty One Thousand Seven Hundred Twenty Rupees Only</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <h3 className="font-bold mb-2">Terms And Conditions:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>This is an electronically generated document.</li>
            <li>All disputes are subject to Nagapattinam jurisdiction</li>
          </ol>
        </div>
        <div className="text-right">
          <p className="mb-12">For, MURALI AGENCIES</p>
          <p>Authorised Signatory</p>
        </div>
      </div>
    </div>
  </div>
  );
}
