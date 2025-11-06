import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Printer, Package, MapPin, CreditCard, Truck } from 'lucide-react';

interface SellerOrderDetailPageProps {
  orderId: string;
  onBack: () => void;
}

interface FulfillmentModalProps {
  orderItem: any;
  warehouses: any[];
  onClose: () => void;
  onFulfill: (orderItemId: string, warehouseId: string, quantity: number) => void;
}

function FulfillmentModal({ orderItem, warehouses, onClose, onFulfill }: FulfillmentModalProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [quantity, setQuantity] = useState(orderItem.quantity);

  const handleSubmit = () => {
    if (selectedWarehouse && quantity > 0) {
      onFulfill(orderItem.id, selectedWarehouse, quantity);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          Fulfill Item: {orderItem.products?.name}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.city}, {w.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantity to Fulfill
            </label>
            <input
              type="number"
              min="1"
              max={orderItem.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Max: {orderItem.quantity} units
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              This will create a shipment for {quantity} unit(s) from the selected warehouse.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedWarehouse || quantity <= 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Move to Logistics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerOrderDetailPage({ orderId, onBack }: SellerOrderDetailPageProps) {
  const { profile } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any>(null);

  useEffect(() => {
    loadOrderDetails();
    loadWarehouses();
  }, [orderId, profile]);

  const loadWarehouses = async () => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .eq('seller_id', profile.id)
      .eq('is_active', true)
      .order('name');

    setWarehouses(data || []);
  };

  const loadOrderDetails = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const [orderRes, itemsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          user_profiles!orders_buyer_id_fkey(
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
        .eq('seller_id', profile.id)
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

  const handleFulfillItem = async (orderItemId: string, warehouseId: string, quantity: number) => {
    try {
      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          order_id: orderId,
          seller_id: profile?.id,
          warehouse_id: warehouseId,
          status: 'pending',
          shipping_date: new Date().toISOString()
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create shipment item
      const { error: itemError } = await supabase
        .from('shipment_items')
        .insert({
          shipment_id: shipment.id,
          order_item_id: orderItemId,
          warehouse_id: warehouseId,
          quantity: quantity
        });

      if (itemError) throw itemError;

      alert('Item moved to logistics successfully!');
      loadOrderDetails();
    } catch (error) {
      console.error('Error fulfilling item:', error);
      alert('Failed to move item to logistics');
    }
  };

  const handlePrint = () => {
    window.print();
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

  const buyer = order.user_profiles;
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
              <p>Status: <span className="font-medium text-slate-900 capitalize">{order.status}</span></p>
            </div>
          </div>
          <div className="text-right">
            <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-white">B2B</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{profile?.business_name}</p>
            <p className="text-xs text-slate-600">{profile?.email}</p>
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
                {buyer?.company_name || buyer?.business_name || `${buyer?.first_name} ${buyer?.last_name}`}
              </p>
              <p>{buyer?.email}</p>
              {buyer?.phone && <p>{buyer?.phone}</p>}
              {buyer?.address && (
                <>
                  <p>{buyer.address}</p>
                  <p>{buyer.city}, {buyer.state} {buyer.zip_code}</p>
                  <p>{buyer.country || 'USA'}</p>
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
                {buyer?.company_name || buyer?.business_name || `${buyer?.first_name} ${buyer?.last_name}`}
              </p>
              {buyer?.address && (
                <>
                  <p>{buyer.address}</p>
                  <p>{buyer.city}, {buyer.state} {buyer.zip_code}</p>
                  <p>{buyer.country || 'USA'}</p>
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
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 print:hidden">Actions</th>
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
                    <td className="py-4 px-4 text-center print:hidden">
                      <button
                        onClick={() => {
                          setSelectedOrderItem(item);
                          setShowFulfillmentModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
                      >
                        <Truck className="w-3 h-3" />
                        Fulfill
                      </button>
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
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-600">Payment Status:</span>
              <span className={`font-semibold capitalize ${
                order.payment_status === 'paid' ? 'text-green-600' :
                order.payment_status === 'partial' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {order.payment_status}
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

      {/* Fulfillment Modal */}
      {showFulfillmentModal && selectedOrderItem && (
        <FulfillmentModal
          orderItem={selectedOrderItem}
          warehouses={warehouses}
          onClose={() => {
            setShowFulfillmentModal(false);
            setSelectedOrderItem(null);
          }}
          onFulfill={handleFulfillItem}
        />
      )}
    </div>
  );
}
