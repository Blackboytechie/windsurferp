import { forwardRef } from 'react';
import { Invoice, SalesOrder, Customer } from '@/types/sales';
import InvoiceTemplate from './InvoiceTemplate';

interface InvoicePrintTemplateProps {
  data: {
    invoice: Invoice & {
      sales_order: SalesOrder & {
        customer: Customer;
        items: any[];
      };
    };
    payments: any[];
  };
}

const InvoicePrintTemplate = forwardRef<HTMLDivElement, InvoicePrintTemplateProps>(
  ({ data }, ref) => {
    const { invoice} = data;
    
    // Company details
    const companyDetails = {
      name: 'MURALI AGENCIES',
      address: '10 Neela North side, Nagapattinam, Tamil Nadu, 611001',
      phone: '+91 XXXXXXXXXX',
      email: 'contact@muraliagencies.com',
      gst: 'XXXXXXXXXXXX',
    };
    
    // Calculate total pages needed for pagination
    const ITEMS_PER_PAGE = 10;
    const totalItems = invoice.sales_order.items.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    return (
      <div ref={ref}>
        {/* Generate multiple pages with 10 items per page */}
        {Array.from({ length: totalPages }).map((_, index) => {
          const pageNumber = index + 1;
          return (
            <div key={`page-${pageNumber}`} className="print-page">
              <InvoiceTemplate
                invoice={invoice}
                companyDetails={companyDetails}
                pageInfo={{
                  currentPage: pageNumber,
                  totalPages: totalPages,
                  isLastPage: pageNumber === totalPages
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;