import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Printer, Package, MapPin, CreditCard } from 'lucide-react';

interface BuyerOrderDetailPageProps {
  orderId: string;
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export default function BuyerOrderDetailPage({ orderId, onBack, onNavigate }: BuyerOrderDetailPageProps) {
  const { profile } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId, profile]);

  const loadOrderDetails = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const [orderRes, itemsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          user_profiles!orders_seller_id_fkey(
            id,
            first_name,
            last_name,
            email,
            company_name,
            business_name,
            phone,
            address,
            city,
            state,
            zip_code,
            country
          )
        `)
        .eq('id', orderId)
        .eq('buyer_id', profile.id)
        .maybeSingle(),
      supabase
        .from('order_items')
        .select(`
          *,
          products(id, name, sku, image_url)
        `)
        .eq('order_id', orderId)
        .order('created_at')
    ]);
    setOrder(orderRes.data);
    setOrderItems(itemsRes.data || []);
    setLoading(false);
  };
    console.log("ORDER",order)

  const handlePrint = () => {
    window.print();
  };
  console.log("ORDERRES",order)


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
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
      <div className="text-center py-12">
        <p className="text-slate-600">Order not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const seller = order.user_profiles;
  const itemsCount = orderItems.length;
  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition print:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Order Details</h1>
            <p className="text-slate-600">Order #{order.order_number}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition print:hidden"
        >
          <Printer className="w-4 h-4" />
          Print Invoice
        </button>
      </div>

      {/* Invoice */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 print:border-0 print:shadow-none">
        {/* Invoice Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">INVOICE</h2>
            <div className="text-sm text-slate-600 space-y-1">
              <p>Invoice #: {order.order_number}</p>
              <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                  {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'unpaid' ? 'Unpaid' : 'Partial'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            {/* <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-white">B2B</span>
            </div> */}
            {/* <p className="text-sm font-semibold text-slate-900">{seller?.business_name || seller?.company_name}</p>
            <p className="text-xs text-slate-600">{seller?.email}</p> */}
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Bill To */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Bill To:</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-900">
                {profile?.company_name || profile?.business_name || `${profile?.first_name} ${profile?.last_name}`}
              </p>
              <p>{profile?.email}</p>
              {profile?.phone && <p>{profile.phone}</p>}
              {profile?.address && (
                <>
                  <p>{profile.address}</p>
                  <p>{profile.city}, {profile.state} {profile.zip_code}</p>
                  <p>{profile.country || 'USA'}</p>
                </>
              )}
            </div>
          </div>

          {/* Ship To */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Ship To:</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p className="font-medium text-slate-900">
                {profile?.company_name || profile?.business_name || `${profile?.first_name} ${profile?.last_name}`}
              </p>
              {profile?.address && (
                <>
                  <p>{profile.address}</p>
                  <p>{profile.city}, {profile.state} {profile.zip_code}</p>
                  <p>{profile.country || 'USA'}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">
                  {itemsCount} Item{itemsCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-700">
                {totalUnits} Total Unit{totalUnits !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Order Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Item</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SKU</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Units</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Unit Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Discount</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {item.products?.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium text-slate-900">{item.products?.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 text-sm">{item.products?.sku}</td>
                    <td className="py-4 px-4 text-center font-semibold text-slate-900">{item.quantity}</td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      ${parseFloat(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      {item.discount_percentage > 0 ? (
                        <span className="text-red-600">
                          -{item.discount_percentage}% (${parseFloat(item.discount_amount).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-900">
                      ${parseFloat(item.line_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium text-slate-900">
                ${parseFloat(order.subtotal || '0').toFixed(2)}
              </span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount:</span>
                <span className="font-medium text-red-600">
                  -${parseFloat(order.discount_amount).toFixed(2)}
                </span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-medium text-slate-900">
                  ${parseFloat(order.tax_amount).toFixed(2)}
                </span>
              </div>
            )}
            {order.shipping_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Shipping:</span>
                <span className="font-medium text-slate-900">
                  ${parseFloat(order.shipping_amount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between">
              <span className="font-semibold text-slate-900">Total:</span>
              <span className="font-bold text-xl text-blue-600">
                ${parseFloat(order.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Notes:</h4>
            <p className="text-sm text-slate-600">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}