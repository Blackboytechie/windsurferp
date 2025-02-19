import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Customer } from '@/types/sales';
import Alert, { AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  order_number: string;
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  order_id: string;
  order_number: string;
  quantity: number;
}

interface ReturnFormProps {
  customers: Customer[];
  selectedCustomer: string | null;
  onCustomerChange: (customerId: string) => void;
  products: Product[];
  selectedProduct: string;
  onProductChange: (productId: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddItem: () => void;
  returnItems: ReturnItem[];
  onRemoveItem: (productId: string) => void;
  onSubmit: (reason: string) => void;
  message: { type: 'success' | 'error'; text: string } | null;
  loading: boolean;
}

export default function ReturnForm({
  customers,
  selectedCustomer,
  onCustomerChange,
  products,
  selectedProduct,
  onProductChange,
  quantity,
  onQuantityChange,
  onAddItem,
  returnItems,
  onRemoveItem,
  onSubmit,
  message,
  loading,
}: ReturnFormProps) {
  const [reason, setReason] = React.useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Sales Return</CardTitle>
          <CardDescription>
            Select customer and products to create a sales return
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <Select
              value={selectedCustomer || ''}
              onValueChange={onCustomerChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection */}
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product</label>
                  <Select
                    value={selectedProduct}
                    onValueChange={onProductChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - Available: {product.quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min={0}
                    value={quantity}
                    onChange={(e) => onQuantityChange(parseInt(e.target.value))}
                    disabled={!selectedProduct}
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={onAddItem}
                    disabled={!selectedProduct || quantity < 1}
                    className="w-full"
                  >
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Reason for Return */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Return</label>
                <Input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for return"
                />
              </div>

              {/* Message */}
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {/* Return Items List */}
              {returnItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Return Items</h3>
                  <div className="space-y-2">
                    {returnItems.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} | Order: {item.order_number}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveItem(item.product_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Submit Button */}
                  <div className="pt-4 flex justify-end">
                    <Button 
                      onClick={() => onSubmit(reason)}
                      disabled={loading}
                      className="w-full md:w-auto"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Return'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
