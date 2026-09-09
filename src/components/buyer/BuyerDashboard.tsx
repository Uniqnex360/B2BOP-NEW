import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  ShoppingBag,
  Package,
  DollarSign,
  Truck,
  Grid,
  Tag,
} from "lucide-react";
import BuyerOrderDetailPage from "./BuyerOrderDetailPage";

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
    deliveredOrders: 0,
    categoriesCount: 0,
    brandsCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const [ordersRes, categoriesRes, brandsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id")
        .eq("seller_id", profile.seller_id)
        .eq("is_active", true),
      supabase
        .from("brands")
        .select("id")
        .eq("seller_id", profile.seller_id)
        .eq("is_active", true),
    ]);

    const orderList = ordersRes.data || [];

    const totalOrders = orderList.length;
    const pendingOrders = orderList.filter(
      (o) => o.status === "pending",
    ).length;
    const deliveredOrders = orderList.filter(
      (o) => o.status === "delivered",
    ).length;
    const totalSpent = orderList.reduce(
      (sum, o) => sum + (parseFloat(o.total_amount) || 0),
      0,
    );

    setStats({
      totalOrders,
      pendingOrders,
      totalSpent,
      deliveredOrders,
      categoriesCount: categoriesRes.data?.length || 0,
      brandsCount: brandsRes.data?.length || 0,
    });
    setRecentOrders(orderList.slice(0, 5));
    setLoading(false);
  };

  if (selectedOrderId) {
    return (
      <BuyerOrderDetailPage
        orderId={selectedOrderId}
        onBack={() => setSelectedOrderId(null)}
      />
    );
  }

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      shipped: "bg-cyan-100 text-cyan-800",
      delivered: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back, {profile?.first_name}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Pending Orders</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.pendingOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-slate-900">
                ${stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Delivered Orders</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.deliveredOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Categories</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.categoriesCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Grid className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Brands</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.brandsCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Recent Orders
        </h2>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
              >
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                  >
                    Order #{order.order_number}
                  </button>
                  <p className="text-sm text-slate-600">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="font-semibold text-slate-900">
                    ${order.total_amount?.toFixed(2)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
