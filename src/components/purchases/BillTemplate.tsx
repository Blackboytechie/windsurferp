import { forwardRef, useMemo } from 'react';
import { format } from 'date-fns';

interface BillTemplateProps {
    bill: any;
    items: any[];
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

export const BillTemplate = forwardRef<HTMLDivElement, BillTemplateProps>(({ bill, items, companyDetails, pageInfo }, ref) => {
    const ITEMS_PER_PAGE = 10;

    // Use useMemo to handle pagination similar to PurchaseOrderTemplate
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

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalGst = items.reduce((sum, item) => sum + (item.gst_amount || 0), 0);
    const total = bill.total_amount;

    // Function to convert number to words
    // const numberToWords = (num: number): string => {
    //     const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    //     const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    //     const convertLessThanOneThousand = (n: number): string => {
    //         if (n === 0) return '';
    //         if (n < 20) return units[n];

    //         const digit = n % 10;
    //         if (n < 100) return tens[Math.floor(n / 10)] + (digit ? ' ' + units[digit] : '');

    //         return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertLessThanOneThousand(n % 100) : '');
    //     };

    //     if (num === 0) return 'Zero';

    //     const intNum = Math.floor(num);
    //     const decimalPart = Math.round((num - intNum) * 100);

    //     let result = '';
    //     let remaining = intNum;

    //     if (remaining >= 10000000) {
    //         result += convertLessThanOneThousand(Math.floor(remaining / 10000000)) + ' Crore ';
    //         remaining %= 10000000;
    //     }

    //     if (remaining >= 100000) {
    //         result += convertLessThanOneThousand(Math.floor(remaining / 100000)) + ' Lakh ';
    //         remaining %= 100000;
    //     }

    //     if (remaining >= 1000) {
    //         result += convertLessThanOneThousand(Math.floor(remaining / 1000)) + ' Thousand ';
    //         remaining %= 1000;
    //     }

    //     if (remaining > 0) {
    //         result += convertLessThanOneThousand(remaining);
    //     }

    //     if (decimalPart > 0) {
    //         result += ' and ' + convertLessThanOneThousand(decimalPart) + ' Paise';
    //     }

    //     return result.trim();
    // };

    return (
        <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto print:p-6 print:max-w-none print:shadow-none print:min-h-[297mm] print:w-[210mm] print:relative">
            {/* Header Section - Show on every page */}
            <div className="border-b-2 border-gray-200 mb-6 print:mb-4 print:pb-4">
                <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">{companyDetails?.name}</h1>
                    <p className="text-gray-600 whitespace-pre-line">{companyDetails?.address}</p>
                    <p className="text-gray-600">Phone: {companyDetails?.phone} | Email: {companyDetails?.email}</p>
                    <p className="text-gray-600">GSTIN: {companyDetails?.gst}</p>
                </div>

                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">BILL</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-gray-600">Bill Number: {bill.bill_number}</p>
                        <p className="text-gray-600">Date: {formatDate(bill.bill_date)}</p>
                        <p className="text-gray-600">Due Date: {formatDate(bill.due_date)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-600">PO Number: {bill.purchase_order.po_number}</p>
                        <p className="text-gray-600">Status: {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}</p>
                    </div>
                </div>

                {/* Show supplier details only on first page */}
                {(!pageInfo || pageInfo.currentPage === 1) && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="border p-3 rounded">
                            <h3 className="font-semibold mb-1">Supplier Details:</h3>
                            <p className="text-sm">{bill.purchase_order.supplier.name}</p>
                            <p className="text-sm">{bill.purchase_order.supplier.address}</p>
                            <p className="text-sm">GST: {bill.purchase_order.supplier.gst_number || 'N/A'}</p>
                        </div>
                        <div className="border p-3 rounded">
                            <h3 className="font-semibold mb-1">Bill To:</h3>
                            <p className="text-sm">{companyDetails?.name}</p>
                            <p className="text-sm">{companyDetails?.address}</p>
                            <p className="text-sm">GST: {companyDetails?.gst}</p>
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
                            <th className="px-3 py-2 border text-right font-semibold text-sm print:border print:border-gray-300">Amount</th>
                            {currentPageItems[0]?.gst_rate && (
                                <>
                                    <th className="px-3 py-2 border text-center font-semibold text-sm print:border print:border-gray-300" colSpan={2}>CGST</th>
                                    <th className="px-3 py-2 border text-center font-semibold text-sm print:border print:border-gray-300" colSpan={2}>SGST</th>
                                    <th className="px-3 py-2 border text-right font-semibold text-sm print:border print:border-gray-300">Total</th>
                                </>
                            )}
                        </tr>
                        {currentPageItems[0]?.gst_rate && (
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
                        )}
                    </thead>
                    <tbody>
                        {currentPageItems.map((item, index) => (
                            <tr key={startIndex + index} className="border print:border-gray-300">
                                <td className="px-3 py-2 border text-sm print:border print:border-gray-300">{startIndex + index + 1}</td>
                                <td className="px-3 py-2 border text-sm print:border print:border-gray-300">{item.product.name}</td>
                                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">{item.quantity}</td>
                                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.unit_price || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                                {item.gst_rate && (
                                    <>
                                        <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">{(item.gst_rate / 2 || 0).toFixed(1)}%</td>
                                        <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.gst_amount / 2 || 0).toFixed(2)}</td>
                                        <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">{(item.gst_rate / 2 || 0).toFixed(1)}%</td>
                                        <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.gst_amount / 2 || 0).toFixed(2)}</td>
                                        <td className="px-3 py-2 border text-right text-sm print:border print:border-gray-300">₹{(item.total || ((item.quantity || 0) * (item.unit_price || 0) + (item.gst_amount || 0))).toFixed(2)}</td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary Section - Show only on last page */}
            {(!pageInfo || pageInfo.isLastPage) && (
                <>
                    <div className="mt-6">
                        <div className="flex justify-end">
                            <div className="w-1/2">
                                <div className="border p-4 space-y-2 rounded shadow-sm">
                                    <div className="flex justify-between">
                                        <span className="font-medium">Subtotal:</span>
                                        <span>₹{subtotal.toFixed(2)}</span>
                                    </div>
                                    {totalGst > 0 && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="font-medium">CGST:</span>
                                                <span>₹{(totalGst / 2).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">SGST:</span>
                                                <span>₹{(totalGst / 2).toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between pt-2 border-t font-semibold">
                                        <span>Total:</span>
                                        <span>₹{total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t">
                                        <span className="font-medium">Paid Amount:</span>
                                        <span>₹{bill.paid_amount.toFixed(2)}</span>
                                    </div>
                                    {bill.status !== 'paid' && (
                                        <div className="flex justify-between pt-2 border-t font-semibold text-red-600">
                                            <span>Balance Due:</span>
                                            <span>₹{(bill.total_amount - bill.paid_amount).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Amount in words
                <div className="mt-3 text-sm italic">
                  <span>Amount in words: </span>
                  <span className="font-medium">Rupees {numberToWords(total)} only</span>
                </div> */}
                            </div>
                        </div>
                    </div>

                    {/* Terms and Notes Section
                    <div className="mt-8 border-t pt-4">
                        <h3 className="font-semibold mb-2">Terms & Conditions:</h3>
                        <ol className="list-decimal pl-5 text-sm space-y-1">
                            <li>Payment is due within {bill.due_date ? `${Math.ceil((new Date(bill.due_date).getTime() - new Date(bill.bill_date).getTime()) / (1000 * 60 * 60 * 24))} days` : '30 days'} of invoice date.</li>
                            <li>Please make payment to the bank account details provided.</li>
                            <li>Late payments may be subject to a penalty fee.</li>
                            <li>This is a computer-generated bill and does not require a signature.</li>
                        </ol>
                    </div> */}

                    {/* Footer Section */}
                    <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500 print:absolute print:bottom-0 print:left-0 print:right-0 print:pb-8 print:px-6 print:bg-white">
                        <div className="grid grid-cols-2 gap-8 mt-4">

                            <div className="text-left">
                                <div className="mt-4 pt-4">
                                    <p className="text-sm text-gray-600">Received By</p>
                                    <p className="mt-8 text-sm text-gray-600">Authorised Signatory</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="mt-4 pt-4">
                                    <p className="text-sm text-gray-600">For, {companyDetails?.name}</p>
                                    <p className="mt-8 text-sm text-gray-600">Authorised Signatory</p>
                                </div>
                            </div>
                        </div>

                        {/* Thank you message moved to the very end */}
                        <div className="mt-8 text-center border-t pt-4">
                            <p>Thank you for your business!</p>
                            <p className="mt-1">For any queries regarding this bill, please contact us at {companyDetails?.email}</p>
                        </div>
                    </div>
                </>
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

BillTemplate.displayName = 'BillTemplate';