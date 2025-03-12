import  { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice, SalesOrder, Customer, } from '@/types/sales';
import { Button } from '@/components/ui/button';
import InvoiceTemplate from '@/components/invoices/InvoiceTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { exportData } from '@/utils/exportUtils';
import PaymentModal from '../../components/PaymentModal';
import { createRoot } from 'react-dom/client';
import { useReactToPrint } from 'react-to-print';
import InvoicePrintTemplate from '@/components/invoices/InvoicePrintTemplate';

// Define a custom interface that extends the html2canvas options
type Html2CanvasOptions = Parameters<typeof html2canvas>[1];
// interface ExtendedHtml2CanvasOptions extends Partial<Html2CanvasOptions> {
//   onclone?: (document: Document, element: HTMLElement) => void;
// }

export default function Invoices() {
  const [invoices, setInvoices] = useState<(Invoice & {
    sales_order: SalesOrder & { customer: Customer }
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & { sales_order: SalesOrder & { customer: Customer } }) | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice & {
    sales_order: SalesOrder & {
      customer: Customer;
      items: (SalesOrder['items'][0] & { product: { id: string; name: string; sku: string; } })[]
    }
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [printData, setPrintData] = useState<{ invoice: Invoice & { sales_order: SalesOrder & { customer: Customer } }, payments: any[] } | null>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: printData ? `Invoice-${printData.invoice.invoice_number}` : 'Invoice',
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page {
          page-break-after: always;
          min-height: 297mm;
          width: 210mm;
          position: relative;
        }
        .print-page:last-child {
          page-break-after: auto;
        }
      }
    `,
    onAfterPrint: () => {
      setPrintData(null);
    }
  });

  const handlePrintInvoice = async (invoice: Invoice & { sales_order: SalesOrder & { customer: Customer } }) => {
    try {
      // Fetch complete invoice data with related records
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders (
            *,
            customer:customers (*),
            items:sales_order_items (
              *,
              product:products (*)
            )
          )
        `)
        .eq('id', invoice.id)
        .single();

      if (error) throw error;
      if (!invoiceData) throw new Error('Invoice not found');

      // Fetch payments separately
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('bill_id', invoice.id);

      if (paymentsError) throw paymentsError;

      setPrintData({
        invoice: invoiceData,
        payments: paymentsData || []
      });

      setTimeout(() => {
        handlePrint();
      }, 100);
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('Error printing invoice. Please try again.');
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders(
            *,
            customer:customers(*),
            items:sales_order_items(
              *,
              product:products(*),
              total_amount,
              paid_amount
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };


  const handlePdfInvoice = async (invoice: Invoice) => {
    try {
      // Fetch complete invoice data with related records
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
        *,
        sales_order:sales_orders (
          *,
          customer:customers (*),
          items:sales_order_items (
            *,
            product:products (*)
          )
        )
      `)
        .eq('id', invoice.id)
        .single();

      if (error) throw error;
      if (!invoiceData) throw new Error('Invoice not found');

      // Fetch payments separately
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('bill_id', invoice.id);

      if (paymentsError) throw paymentsError;

      // Company details
      const companyDetails = {
        name: 'MURALI AGENCIES',
        address: '10 Neela North side, Nagapattinam, Tamil Nadu, 611001',
        phone: '+91 XXXXXXXXXX',
        email: 'contact@muraliagencies.com',
        gst: 'XXXXXXXXXXXX',
      };

      // Calculate total pages needed
      const ITEMS_PER_PAGE = 10;
      const totalItems = invoiceData.sales_order.items.length;
      const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

      // Create a PDF document with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Generate each page
      for (let page = 1; page <= totalPages; page++) {
        if (page > 1) {
          pdf.addPage();
        }

        // Create a temporary div for the invoice page
        const printDiv = document.createElement('div');
        printDiv.style.position = 'absolute';
        printDiv.style.left = '-9999px';
        printDiv.style.width = '210mm'; // A4 width
        printDiv.style.height = '297mm'; // A4 height
        printDiv.style.padding = '0';
        printDiv.style.margin = '0';
        printDiv.style.overflow = 'hidden';
        printDiv.className = 'print-page';
        document.body.appendChild(printDiv);

        // Calculate items for this page
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
        const currentPageItems = invoiceData.sales_order.items.slice(startIndex, endIndex);

        // Render the invoice template for this page
        const root = createRoot(printDiv);
        root.render(
          <div style={{ width: '210mm', height: '297mm', position: 'relative', overflow: 'hidden' }}>
            <InvoiceTemplate
              invoice={invoiceData as any}
              companyDetails={companyDetails}
              pageInfo={{
                currentPage: page,
                totalPages: totalPages,
                isLastPage: page === totalPages,
                startIndex: startIndex,
                currentPageItems: currentPageItems
              }}
              payments={paymentsData || []}
            />
          </div>
        );

        // Wait for rendering to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate PDF for this page with improved settings
        const canvas = await html2canvas(printDiv.firstChild as HTMLElement, {
          scale: 1.5,
          logging: false,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          onclone: (element: Document) => {
            // Ensure all content is visible and properly positioned
            const container = element.querySelector('div');
            if (container) {
              container.style.transform = 'none';
              container.style.position = 'relative';
              container.style.width = '210mm';
              container.style.height = '297mm';
              container.style.overflow = 'hidden';
            }
          }
        } as unknown as Html2CanvasOptions);

        // Add image to PDF with proper dimensions
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(
          imgData,
          'PNG',
          0,
          0,
          210, // A4 width in mm
          297, // A4 height in mm
          undefined,
          'FAST'
        );

        // Cleanup
        root.unmount();
        document.body.removeChild(printDiv);
      }

      // Download PDF
      pdf.save(`Invoice-${invoiceData.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Error generating invoice. Please try again.');
    }
  };
  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      // Fetch complete invoice data with related records
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders (
            *,
            customer:customers (*),
            items:sales_order_items (
              *,
              product:products (*)
            )
          )
        `)
        .eq('id', invoice.id)
        .single();

      if (error) throw error;
      if (!invoiceData) throw new Error('Invoice not found');

      setPreviewInvoice(invoiceData as any); // Type assertion to match expected type
      setShowInvoicePreview(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      alert('Error loading invoice. Please try again.');
    }
  };
  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      // Fetch complete invoice data with related records
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_order:sales_orders (
            so_number,
            customer:customers (
              name,
              email,
              phone,
              gst_number
            ),
            items:sales_order_items (
              quantity,
              unit_price,
              gst_rate,
              product:products (
                name,
                sku
              )
            )
          ),
          payments:sales_payments (
            amount,
            payment_date,
            payment_mode
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return;

      // Format data for export
      const formattedData = data.map(invoice => ({
        'Invoice Number': invoice.invoice_number,
        'Date': new Date(invoice.invoice_date).toLocaleDateString(),
        'Due Date': new Date(invoice.due_date).toLocaleDateString(),
        'Status': invoice.status,
        'SO Number': invoice.sales_order.so_number,
        'Customer Name': invoice.sales_order.customer.name,
        'Customer GST': invoice.sales_order.customer.gst_number,
        'Customer Phone': invoice.sales_order.customer.phone,
        'Customer Email': invoice.sales_order.customer.email,
        'Items': invoice.sales_order.items.map((item: { product: { name: string }, quantity: number, unit_price: number }) =>
          `${item.product.name} (${item.quantity} x ₹${item.unit_price})`
        ).join('\n'),
        'Subtotal': invoice.subtotal,
        'GST Amount': invoice.gst_amount,
        'Total Amount': invoice.total_amount,
        'Paid Amount': invoice.paid_amount,
        'Balance': invoice.total_amount - invoice.paid_amount,
        'Payments': invoice.payments.map((payment: { amount: number, payment_mode: string, payment_date: string }) =>
          `₹${payment.amount} (${payment.payment_mode}) on ${new Date(payment.payment_date).toLocaleDateString()}`
        ).join('\n'),
      }));

      // Export the data
      exportData({
        fileName: `Invoices_${new Date().toISOString().split('T')[0]}`,
        format,
        data: formattedData,
      });
    } catch (error) {
      console.error('Error exporting invoices:', error);
      alert('Error exporting invoices. Please try again.');
    }
  };

  const handlePayment = (invoice: Invoice & { sales_order: SalesOrder & { customer: Customer } }) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  
  // Add this function to clear all filters
  const clearFilters = () => {
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumberFilter('');
    setCustomerNameFilter('');
  };

  // Update the filtering logic
  const filteredInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.invoice_date).toISOString().split('T')[0];
    const dateMatches = invoiceDate >= startDate && invoiceDate <= endDate;
    
    const invoiceNumberMatches = invoice.invoice_number
      .toLowerCase()
      .includes(invoiceNumberFilter.toLowerCase());
      
    const customerNameMatches = invoice.sales_order.customer.name
      .toLowerCase()
      .includes(customerNameFilter.toLowerCase());
    
    return dateMatches && 
           (invoiceNumberFilter === '' || invoiceNumberMatches) && 
           (customerNameFilter === '' || customerNameMatches);
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Invoices</h1>
      <div className="flex flex-col gap-4 mb-6">
        {/* Date and Search Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">Date Range:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm flex-1"
              />
              <span className="text-sm text-gray-600">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm flex-1"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={() => handleExport('xlsx')}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
            >
              Export XLSX
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-none"
            >
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Additional Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by invoice number..."
              value={invoiceNumberFilter}
              onChange={(e) => setInvoiceNumberFilter(e.target.value)}
              className="border rounded-md pl-10 pr-3 py-2 text-sm w-full"
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={customerNameFilter}
              onChange={(e) => setCustomerNameFilter(e.target.value)}
              className="border rounded-md pl-10 pr-3 py-2 text-sm w-full"
            />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Improved grid layout for better space utilization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {loading ? (
          <div className="text-center col-span-full">Loading...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center col-span-full">No invoices found for the selected date range</div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-white shadow-md hover:shadow-lg transition-shadow rounded-lg p-4 flex flex-col h-full border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">#{invoice.invoice_number}</h2>
                  <p className="text-xs text-gray-500">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  invoice.paid_amount >= invoice.total_amount
                    ? 'bg-green-100 text-green-700'
                    : invoice.paid_amount > 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {invoice.paid_amount >= invoice.total_amount 
                    ? 'Paid' 
                    : invoice.paid_amount > 0 
                      ? 'Partial' 
                      : 'Unpaid'}
                </span>
              </div>

              <div className="text-xs mb-2">
                <p className="font-medium text-gray-800 flex items-center truncate">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-gray-500">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {invoice.sales_order.customer.name}
                </p>
              </div>

              <div className="flex-1 mt-2 space-y-1 bg-gray-50 p-2 rounded-md text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">₹{invoice.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className={`font-medium ${invoice.paid_amount > 0 ? 'text-green-600' : ''}`}>
                    ₹{invoice.paid_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t border-gray-200">
                  <span className="text-gray-700">Balance:</span>
                  <span className={`${invoice.total_amount - invoice.paid_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{(invoice.total_amount - invoice.paid_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewInvoice(invoice)}
                  className="flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors text-blue-600 p-1 h-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span className="text-xs">View</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePrintInvoice(invoice)}
                  className="flex items-center justify-center gap-1 hover:bg-green-50 transition-colors text-green-600 p-1 h-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span className="text-xs">Print</span>
                </Button>
                <Button
                  variant={invoice.paid_amount >= invoice.total_amount ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => handlePayment(invoice)}
                  className={`flex items-center justify-center gap-1 p-1 h-auto ${
                    invoice.paid_amount >= invoice.total_amount 
                      ? 'text-gray-500 hover:bg-gray-50' 
                      : 'text-primary hover:bg-primary-50 border-primary'
                  }`}
                  disabled={invoice.paid_amount >= invoice.total_amount}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                  <span className="text-xs">Pay</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
          onPaymentRecorded={() => {
            fetchInvoices();
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {showInvoicePreview && previewInvoice && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            // Close modal when clicking the backdrop (outside the modal content)
            if (e.target === e.currentTarget) {
              setShowInvoicePreview(false);
            }
          }}
        >
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Invoice #{previewInvoice.invoice_number}</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePdfInvoice(previewInvoice)}
                  className="flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download PDF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInvoicePreview(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              <InvoiceTemplate
                invoice={previewInvoice as any}
                companyDetails={{
                  name: 'MURALI AGENCIES',
                  address: '10 Neela North side, Nagapattinam, Tamil Nadu, 611001',
                  phone: '+91 XXXXXXXXXX',
                  email: 'contact@muraliagencies.com',
                  gst: 'XXXXXXXXXXXX',
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Print Template */}
      <div style={{ display: 'none' }}>
        {printData && <InvoicePrintTemplate ref={contentRef} data={printData} />}
      </div>
    </div>
  );
}


