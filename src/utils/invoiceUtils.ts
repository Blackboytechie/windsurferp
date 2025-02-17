import { supabase } from '@/lib/supabase';
import { SalesOrder, Customer, SalesOrderItem, Product } from '@/types/sales';

export const generateInvoice = async (salesOrder: SalesOrder & { customer: Customer, items: (SalesOrderItem & { product: Product })[] }) => {
  try {
    // Start a Supabase transaction to handle both invoice creation and stock updates
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([
        {
          invoice_number: `INV${Date.now()}`,
          order_id: salesOrder.id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          subtotal: salesOrder.subtotal,
          tax_amount: salesOrder.tax_amount,
          discount_amount: salesOrder.discount_amount,
          total_amount: salesOrder.total_amount,
          paid_amount: 0,
        },
      ])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create stock movement entries and update stock for each item
    for (const item of salesOrder.items) {
      // Get current stock quantity
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (productError) throw productError;

      const currentStockQuantity = currentProduct?.stock_quantity || 0;
      const newStockQuantity = currentStockQuantity - item.quantity;

      if (newStockQuantity < 0) {
        throw new Error(`Insufficient stock for product ${item.product.name}`);
      }

      // Create stock movement record
      const { error: stockMovementError } = await supabase
        .from('stock_movements')
        .insert([
          {
            product_id: item.product_id,
            type: 'out',
            quantity: item.quantity,
            reference_type: 'sale',
            reference_id: invoice.id,
            notes: `Stock deduction for Invoice #${invoice.invoice_number}`,
            created_at: new Date().toISOString(),
          },
        ]);

      if (stockMovementError) throw stockMovementError;

      // Update product stock quantity
      const { error: stockUpdateError } = await supabase
        .from('products')
        .update({
          stock_quantity: newStockQuantity,
        })
        .eq('id', item.product_id);

      if (stockUpdateError) throw stockUpdateError;

      // Update stock level
      const { error: stockLevelError } = await supabase.rpc(
        'update_stock_level',
        {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
          p_is_increment: false
        }
      );

      if (stockLevelError) throw stockLevelError;
    }

    // Update sales order status
    const { error: updateError } = await supabase
      .from('sales_orders')
      .update({ status: 'delivered' })
      .eq('id', salesOrder.id);

    if (updateError) throw updateError;

    return { invoice, error: null };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { invoice: null, error };
  }
};

// Add a helper function to validate stock before generating invoice
export const validateStock = async (salesOrder: SalesOrder & { items: (SalesOrderItem & { product: Product })[] }) => {
  try {
    const insufficientStockItems = [];

    // Get fresh stock data for all products
    for (const item of salesOrder.items) {
      // Get current stock quantity
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('stock_quantity, name')
        .eq('id', item.product_id)
        .single();

      if (productError) throw productError;

      const currentStockQuantity = currentProduct?.stock_quantity || 0;

      if (item.quantity > currentStockQuantity) {
        insufficientStockItems.push({
          product: currentProduct.name,
          requested: item.quantity,
          available: currentStockQuantity
        });
      }
    }

    if (insufficientStockItems.length > 0) {
      return {
        valid: false,
        error: 'Insufficient stock for some items',
        items: insufficientStockItems
      };
    }

    return { valid: true, error: null, items: [] };
  } catch (error) {
    console.error('Error validating stock:', error);
    return { valid: false, error: 'Error validating stock', items: [] };
  }
};
