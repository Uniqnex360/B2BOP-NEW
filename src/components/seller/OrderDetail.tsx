// OrderDetailPage.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Package, DollarSign, Truck, Calendar, User } from 'lucide-react';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

export default function OrderDetailPage({ orderId, onBack }: OrderDetailPageProps) {
  const { profile } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      // Load order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Load order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(name, sku, unit_price)')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Order not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Order #{order.order_number}</h1>
          <p className="text-slate-600 mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-6 h-6 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Order Status</h3>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
            'bg-slate-100 text-slate-800'
          }`}>
            {order.status}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-6 h-6 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Payment Status</h3>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
            order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
            order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {order.payment_status}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-6 h-6 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Total Amount</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ${parseFloat(order.total_amount).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Order Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SKU</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quantity</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Price</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-4 px-4">
                    <p className="font-medium text-slate-900">{item.products?.name}</p>
                  </td>
                  <td className="py-4 px-4 text-slate-700">{item.products?.sku}</td>
                  <td className="py-4 px-4 text-right text-slate-900">{item.quantity}</td>
                  <td className="py-4 px-4 text-right text-slate-900">
                    ${parseFloat(item.products?.unit_price || item.unit_price).toFixed(2)}

                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-900">
                   ${(parseFloat(item.products?.unit_price || item.unit_price) * item.quantity).toFixed(2)}

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}