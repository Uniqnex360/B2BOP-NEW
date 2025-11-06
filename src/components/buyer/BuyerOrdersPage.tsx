import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, Calendar, DollarSign, Eye } from 'lucide-react';
import OrderDetailPage from './OrderDetailPage';

interface BuyerOrdersPageProps {
  onNavigate?: (page: string) => void;
}

export default function BuyerOrdersPage({ onNavigate }: BuyerOrdersPageProps) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [profile]);

  const loadOrders = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, sku))')
      .eq('buyer_id', profile.id)
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: any = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading orders...</div>
      </div>
    );
  }

  if (selectedOrderId) {
    return <OrderDetailPage orderId={selectedOrderId} onBack={() => setSelectedOrderId(null)} onNavigate={onNavigate} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-600 mt-1">{orders.length} orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No orders yet</h3>
          <p className="text-slate-600">Start shopping to create your first order</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Order #{order.order_number}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        ${order.total_amount?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                      {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'unpaid' ? 'Unpaid' : 'Partial'}
                    </span>
                    <button
                      onClick={() => setSelectedOrderId(order.id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition mt-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-medium text-slate-900 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.products?.name}</p>
                          <p className="text-slate-600">SKU: {item.products?.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-900">
                            {item.quantity} × ${item.unit_price?.toFixed(2)}
                          </p>
                          <p className="font-medium text-slate-900">
                            ${item.line_total?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {order.notes && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Note:</span> {order.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
