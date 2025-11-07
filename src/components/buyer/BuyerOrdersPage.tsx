import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Eye, Calendar, Package, DollarSign } from 'lucide-react';
import BuyerOrderDetailPage from './BuyerOrderDetailPage';

interface BuyerOrdersPageProps {
  onNavigate?: (page: string) => void;
}

export default function BuyerOrdersPage({ onNavigate }: BuyerOrdersPageProps) {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderItemCounts, setOrderItemCounts] = useState<Record<string, { items: number; units: number }>>({});

  useEffect(() => {
    loadOrders();
  }, [profile]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const loadOrders = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, sku))')
        .eq('buyer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);

      // Load item counts for each order
      if (data) {
        const counts: Record<string, { items: number; units: number }> = {};
        for (const order of data) {
          counts[order.id] = {
            items: order.order_items?.length || 0,
            units: order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
          };
        }
        setOrderItemCounts(counts);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Date filtering
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter((o) => {
        const orderDate = new Date(o.created_at);
        const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

        switch (dateFilter) {
          case 'today':
            return orderDay.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return orderDay.getTime() === yesterday.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDay >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return orderDay >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return orderDay >= yearAgo;
          default:
            return true;
        }
      });
    }

    setFilteredOrders(filtered);
  };

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

  if (selectedOrderId) {
    return (
      <BuyerOrderDetailPage
        orderId={selectedOrderId}
        onBack={() => setSelectedOrderId(null)}
        onNavigate={onNavigate}
      />
    );
  }

  // Calculate totals for all filtered orders
  const totalItems = Object.values(orderItemCounts).reduce((sum, counts) => sum + counts.items, 0);
  const totalUnits = Object.values(orderItemCounts).reduce((sum, counts) => sum + counts.units, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
          <p className="text-slate-600 mt-1">{filteredOrders.length} orders</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-slate-500">Total Items</p>
            <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Total Units</p>
            <p className="text-2xl font-bold text-blue-600">{totalUnits}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order number..."
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
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchTerm || statusFilter !== 'all' ? 'No orders found' : 'No orders yet'}
          </h3>
          <p className="text-slate-600">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Start shopping to create your first order'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order #</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Items</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Units</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const counts = orderItemCounts[order.id] || { items: 0, units: 0 };
                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {order.order_number}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-center font-semibold text-slate-900">{counts.items}</td>
                      <td className="py-4 px-4 text-center font-semibold text-blue-600">{counts.units}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'unpaid' ? 'Unpaid' : 'Partial'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-900">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="text-slate-600 hover:text-slate-900 transition"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}