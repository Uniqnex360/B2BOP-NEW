import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Truck, Package, MapPin, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function LogisticsPage() {
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  useEffect(() => {
    loadShipments();
  }, [profile]);

  useEffect(() => {
    filterShipments();
  }, [shipments, searchTerm, statusFilter]);

  const loadShipments = async () => {
    if (!profile?.id) return;

    setLoading(true);

    // Load shipments with all related data
    const { data: shipmentsData } = await supabase
      .from('shipments')
      .select(`
        *,
        orders (
          id,
          order_number,
          buyer_id,
          total_amount,
          user_profiles!orders_buyer_id_fkey(first_name, last_name, business_name, address, city, state, zip_code)
        ),
        warehouses (
          id,
          name,
          city,
          state
        )
      `)
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false });

    // Load shipment items for each shipment
    if (shipmentsData) {
      const shipmentsWithItems = await Promise.all(
        shipmentsData.map(async (shipment) => {
          const { data: items } = await supabase
            .from('shipment_items')
            .select(`
              *,
              order_items (
                id,
                quantity,
                products (
                  id,
                  name,
                  sku,
                  image_url
                )
              ),
              warehouses (
                name,
                city,
                state
              )
            `)
            .eq('shipment_id', shipment.id);

          return {
            ...shipment,
            items: items || []
          };
        })
      );

      setShipments(shipmentsWithItems);
    }

    setLoading(false);
  };

  const filterShipments = () => {
    let filtered = shipments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((s) =>
        s.orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.orders?.user_profiles?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredShipments(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      picked_up: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_transit':
      case 'picked_up':
        return <Truck className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getFulfillmentStatus = (shipment: any) => {
    if (!shipment.orders || !shipment.items) return 'Unknown';

    // This is simplified - in real app you'd compare total order items vs shipped items
    const shippedItemsCount = shipment.items.length;

    return shippedItemsCount > 0 ? 'Partial/Complete' : 'Pending';
  };

  const updateShipmentStatus = async (shipmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', shipmentId);

      if (error) throw error;
      loadShipments();
    } catch (error) {
      console.error('Error updating shipment:', error);
      alert('Failed to update shipment status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading shipments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Logistics & Shipping</h1>
          <p className="text-slate-600 mt-1">Track and manage order shipments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order number, buyer, or tracking number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No shipments found</h3>
          <p className="text-slate-600">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Shipments will appear here when you fulfill orders'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShipments.map((shipment) => {
            const buyer = shipment.orders?.user_profiles;
            const totalItems = shipment.items.reduce(
              (sum: number, item: any) => sum + item.quantity,
              0
            );

            return (
              <div
                key={shipment.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Order #{shipment.orders?.order_number}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          shipment.status
                        )}`}
                      >
                        {getStatusIcon(shipment.status)}
                        {shipment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>
                          {shipment.items.length} item(s), {totalItems} unit(s)
                        </span>
                      </div>
                      {shipment.tracking_number && (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          <span>Tracking: {shipment.tracking_number}</span>
                        </div>
                      )}
                      {shipment.carrier && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{shipment.carrier}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <select
                    value={shipment.status}
                    onChange={(e) => updateShipmentStatus(shipment.id, e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Pending</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Buyer & Shipping Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ship To</p>
                    <p className="font-medium text-slate-900">
                      {buyer?.business_name || `${buyer?.first_name} ${buyer?.last_name}`}
                    </p>
                    {buyer?.address && (
                      <p className="text-sm text-slate-600">
                        {buyer.address}, {buyer.city}, {buyer.state} {buyer.zip_code}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ship From</p>
                    {shipment.warehouses ? (
                      <>
                        <p className="font-medium text-slate-900">{shipment.warehouses.name}</p>
                        <p className="text-sm text-slate-600">
                          {shipment.warehouses.city}, {shipment.warehouses.state}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600">Multiple warehouses</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Shipping Date</p>
                    <p className="font-medium text-slate-900">
                      {shipment.shipping_date
                        ? new Date(shipment.shipping_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                    {shipment.estimated_delivery && (
                      <p className="text-sm text-slate-600">
                        Est. delivery: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipment Items */}
                {shipment.items.length > 0 && (
                  <div>
                    <button
                      onClick={() =>
                        setSelectedShipment(selectedShipment?.id === shipment.id ? null : shipment)
                      }
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2"
                    >
                      {selectedShipment?.id === shipment.id ? 'Hide' : 'Show'} Items Detail
                    </button>

                    {selectedShipment?.id === shipment.id && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left py-2 px-3 font-medium text-slate-700">
                                Product
                              </th>
                              <th className="text-left py-2 px-3 font-medium text-slate-700">SKU</th>
                              <th className="text-center py-2 px-3 font-medium text-slate-700">
                                Quantity
                              </th>
                              <th className="text-left py-2 px-3 font-medium text-slate-700">
                                Warehouse
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {shipment.items.map((item: any) => (
                              <tr key={item.id} className="border-t border-slate-100">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    {item.order_items?.products?.image_url ? (
                                      <img
                                        src={item.order_items.products.image_url}
                                        alt={item.order_items?.products?.name}
                                        className="w-10 h-10 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                        <Package className="w-5 h-5 text-slate-400" />
                                      </div>
                                    )}
                                    <span className="font-medium text-slate-900">
                                      {item.order_items?.products?.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  {item.order_items?.products?.sku}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="font-semibold text-blue-600">
                                    {item.quantity}
                                  </span>
                                  <span className="text-slate-500">
                                    {' '}
                                    / {item.order_items?.quantity}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  {item.warehouses?.name}
                                  <br />
                                  <span className="text-xs text-slate-500">
                                    {item.warehouses?.city}, {item.warehouses?.state}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {shipment.notes && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-900">
                      <span className="font-medium">Note:</span> {shipment.notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
