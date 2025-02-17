import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  bill_number: string;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  bill_id: string;
  bill_number: string;
  quantity: number;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface ReturnFormProps {
  suppliers: Supplier[];
  selectedSupplier: string | null;
  setSelectedSupplier: (id: string | null) => void;
  supplierProducts: Product[];
  returnItems: ReturnItem[];
  setReturnItems: (items: ReturnItem[]) => void;
  selectedProduct: string;
  setSelectedProduct: (id: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  message: Message | null;
  setMessage: (message: Message | null) => void;
  handleSupplierChange: (supplierId: string) => void;
  handleAddItem: () => void;
  handleRemoveItem: (index: number) => void;
  handleSubmitReturn: () => void;
}

export default function ReturnForm({
  suppliers,
  selectedSupplier,
  supplierProducts,
  returnItems,
  selectedProduct,
  setSelectedProduct,
  quantity,
  setQuantity,
  message,
  handleSupplierChange,
  handleAddItem,
  handleRemoveItem,
  handleSubmitReturn
}: ReturnFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">New Purchase Return</h1>
      </div>

      {/* Supplier Selection */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Select Supplier</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Supplier</label>
            <Select onValueChange={handleSupplierChange} value={selectedSupplier || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {selectedSupplier && (
        <>
          {/* Add Products Form */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add Products to Return</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Product</label>
                  <Select onValueChange={setSelectedProduct} value={selectedProduct || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Available: {product.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={1}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
              <Button onClick={handleAddItem} className="w-full">
                Add to Return List
              </Button>
            </div>
          </Card>

          {/* Return Items Table */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Return Items</h2>
            {returnItems.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No items added to return list
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {returnItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.bill_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              onClick={() => handleRemoveItem(index)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  onClick={handleSubmitReturn}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  Submit Returns
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
