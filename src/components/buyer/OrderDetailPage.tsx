import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Package, Truck, CheckCircle } from 'lucide-react';

interface OrderDetailPageProps {
  orderId: string;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export default function OrderDetailPage({ orderId, onBack, onNavigate }: OrderDetailPageProps) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, sku, image_url))')
      .eq('id', orderId)
      .maybeSingle();

    setOrder(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-purple-100 text-purple-800 border-purple-200',
      shipped: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: any = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: Package },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'processing', label: 'Processing', icon: Package },
      { key: 'shipped', label: 'Shipped', icon: Truck },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    ];

    const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(order?.status || 'pending');

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Order not found</p>
        <button onClick={onBack} className="mt-4 text-slate-900 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const steps = getStatusSteps();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Order #{order.order_number}</h1>
          <p className="text-slate-600 mt-1">
            Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getPaymentStatusColor(order.payment_status)}`}>
            {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'unpaid' ? 'Unpaid' : 'Partially Paid'}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Order Status</h2>
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200" />
          <div className="absolute top-5 left-0 h-0.5 bg-green-600 transition-all duration-500" style={{ width: `${(steps.filter(s => s.completed).length - 1) * 25}%` }} />
          <div className="relative flex justify-between">
            {steps.map((step) => (
              <div key={step.key} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 z-10 transition ${step.completed ? 'bg-green-600 text-white' : 'bg-white border-2 border-slate-300 text-slate-400'}`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <p className={`text-xs text-center font-medium ${step.completed ? 'text-slate-900' : 'text-slate-400'}`}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.products.image_url ? (
                      <img src={item.products.image_url} alt={item.products.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{item.products.name}</h3>
                    <p className="text-sm text-slate-600">SKU: {item.products.sku}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-slate-600">Qty: {item.quantity}</span>
                      <span className="text-sm text-slate-600">${item.unit_price?.toFixed(2)} each</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">${item.line_total?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">${order.subtotal?.toFixed(2)}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax</span>
                  <span className="font-medium text-slate-900">${order.tax_amount?.toFixed(2)}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Discount</span>
                  <span className="font-medium text-green-600">-${order.discount_amount?.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-slate-900 text-xl">${order.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Need Help?</h2>
            <p className="text-sm text-slate-600 mb-4">Contact us if you have any questions about your order.</p>
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('messages');
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Contact Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
