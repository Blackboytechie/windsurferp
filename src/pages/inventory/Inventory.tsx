import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, ProductFilter } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import ProductForm from './ProductForm';
import StockMovementForm from './StockMovement';
import { TableContainer } from '@/components/ui/table-container';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductFilter>({
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [showProductForm, setShowProductForm] = useState(false);
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*');

      // Apply filters
      if (filter.category) {
        query = query.eq('category', filter.category);
      }

      if (filter.search) {
        query = query.or(`name.ilike.%${filter.search}%,sku.ilike.%${filter.search}%`);
      }

      if (filter.lowStock) {
        query = query.lt('stock_level', 10);
      }

      // Apply sorting
      if (filter.sortBy) {
        query = query.order(filter.sortBy, { ascending: filter.sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowProductForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProducts(products.filter(product => product.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleStockMovement = (product: Product) => {
    setSelectedProduct(product);
    setShowStockMovementForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-semibold">Inventory</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => setShowProductForm(true)} variant="default" size="sm">
                Add Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search products..."
            className="border rounded-md px-3 py-2 text-sm w-full"
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          >
            <option value="">All Categories</option>
            {/* Add categories here */}
          </select>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="lowStock"
              checked={filter.lowStock}
              onChange={(e) => setFilter({ ...filter, lowStock: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="lowStock" className="text-sm">Show Low Stock Items</label>
          </div>
          <div className="flex items-center md:justify-end ">
            <span className="text-sm font-medium">
              Total Products: {products.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table/Card Section */}
      <div className="bg-white rounded-lg shadow">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <TableContainer>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SI NO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product,index) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{index+1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.stock_level <= product.reorder_level
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {product.stock_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{product.selling_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStockMovement(product)}
                          >
                            Stock
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableContainer>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : products.length === 0 ? (
            <div className="p-4 text-center">No products found</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white border rounded-lg p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="text-sm text-gray-600">{product.sku}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.stock_level <= product.reorder_level
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      Stock: {product.stock_level}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-gray-600">Category:</span>{' '}
                        <span className="font-medium">{product.category}</span>
                      </p>
                      <p>
                        <span className="text-gray-600">Price:</span>{' '}
                        <span className="font-medium">₹{product.selling_price.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStockMovement(product)}
                    >
                      Stock
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showProductForm && (
        <ProductForm
          product={selectedProduct}
          onClose={() => {
            setShowProductForm(false);
            setSelectedProduct(null);
          }}
          onSave={() => {
            fetchProducts();
            setShowProductForm(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {showStockMovementForm && selectedProduct && (
        <StockMovementForm
          product={selectedProduct}
          onClose={() => {
            setShowStockMovementForm(false);
            setSelectedProduct(null);
          }}
          onSave={() => {
            fetchProducts();
            setShowStockMovementForm(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
