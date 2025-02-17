import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, StockMovement } from '@/types/inventory';
import { Button } from '@/components/ui/button';

interface StockMovementFormProps {
  product: Product;
  onClose: () => void;
  onSave: () => void;
}

export default function StockMovementForm({ product, onClose, onSave }: StockMovementFormProps) {
  const [formData, setFormData] = useState<Partial<StockMovement>>({
    type: 'in',
    quantity: 0,
    reference_type: 'adjustment',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Start a Supabase transaction
      const { data: stockMovement, error: movementError } = await supabase
        .from('stock_movements')
        .insert([
          {
            product_id: product.id,
            ...formData,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (movementError) throw movementError;

      // Update product stock level
      const newStockLevel = formData.type === 'in'
        ? product.stock_level + (formData.quantity || 0)
        : product.stock_level - (formData.quantity || 0);

      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_level: newStockLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      onSave();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Stock Movement</h2>
          <p className="text-sm text-gray-600 mb-4">
            Product: {product.name} (Current Stock: {product.stock_level})
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Movement Type</label>
              <select
                className="mt-1 block w-full border rounded-md px-3 py-2"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'in' | 'out' })}
              >
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                required
                min="1"
                className="mt-1 block w-full border rounded-md px-3 py-2"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reference Type</label>
              <select
                className="mt-1 block w-full border rounded-md px-3 py-2"
                value={formData.reference_type}
                onChange={(e) => setFormData({ ...formData, reference_type: e.target.value as 'purchase' | 'sale' | 'adjustment' })}
              >
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                className="mt-1 block w-full border rounded-md px-3 py-2"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
