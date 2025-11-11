import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
} from "lucide-react";

export default function SellerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalBuyers: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    totalProfit: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [productTrends, setProductTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [categoryOrdersData, setCategoryOrdersData] = useState<any[]>([]);
  const [brandOrdersData, setBrandOrdersData] = useState<any[]>([]);

  const categoryOrders: Record<
    string,
    { name: string; orders: number; revenue: number }
  > = {};
  const brandOrders: Record<
    string,
    { name: string; orders: number; revenue: number }
  > = {};
  useEffect(() => {
    loadDashboardData();
  }, [profile, timeRange]);

  const loadDashboardData = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name, sku, cost_price))")
        .eq("seller_id", profile.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      let totalRevenue = 0;
      let totalCost = 0;

      orders?.forEach((order) => {
        totalRevenue += parseFloat(order.total_amount || 0);

        order.order_items?.forEach((item: any) => {
          const costPrice = parseFloat(item.products?.cost_price || 0);
          totalCost += costPrice * item.quantity;
        });
      });
      const { data: allBuyers, error: buyersError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("seller_id", profile.id);
      if (buyersError) throw buyersError;
      const totalProfit = totalRevenue - totalCost;
      const totalOrders = orders?.length || 0;

      const totalBuyers = allBuyers?.length || 0;

      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", profile.id);

      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysAgo);

      const { data: prevOrders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("seller_id", profile.id)
        .gte("created_at", prevStartDate.toISOString())
        .lt("created_at", startDate.toISOString());

      const prevRevenue =
        prevOrders?.reduce(
          (sum, order) => sum + parseFloat(order.total_amount || 0),
          0
        ) || 0;
      const prevOrdersCount = prevOrders?.length || 0;

      const revenueGrowth =
        prevRevenue > 0
          ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
          : 0;
      const ordersGrowth =
        prevOrdersCount > 0
          ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100
          : 0;

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts: productsCount || 0,
        totalBuyers: totalBuyers,
        revenueGrowth,
        ordersGrowth,
        totalProfit,
      });

      const revenueByDay: Record<
        string,
        { revenue: number; cost: number; orders: number }
      > = {};

      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        if (!revenueByDay[date]) {
          revenueByDay[date] = { revenue: 0, cost: 0, orders: 0 };
        }

        revenueByDay[date].revenue += parseFloat(order.total_amount || 0);
        revenueByDay[date].orders += 1;

        order.order_items?.forEach((item: any) => {
          const costPrice = parseFloat(item.products?.cost_price || 0);
          revenueByDay[date].cost += costPrice * item.quantity;
        });
      });

      const chartData = Object.entries(revenueByDay).map(([date, data]) => ({
        date,
        revenue: parseFloat(data.revenue.toFixed(2)),
        profit: parseFloat((data.revenue - data.cost).toFixed(2)),
        orders: data.orders,
      }));

      setRevenueData(chartData);
      setProfitData(chartData);
      setOrdersData(chartData);

      const productSales: Record<
        string,
        { name: string; quantity: number; revenue: number; cost: number }
      > = {};

      orders?.forEach((order) => {
        order.order_items?.forEach((item: any) => {
          const productId = item.product_id;
          const categoryName = item.products?.category_name || "Unknown";
          if (!categoryOrders[categoryName])
            categoryOrders[categoryName] = {
              name: categoryName,
              orders: 0,
              revenue: 0,
            };
          categoryOrders[categoryName].orders += item.quantity;
          categoryOrders[categoryName].revenue += parseFloat(
            item.line_total || 0
          );

          const brandName = item.products?.brand_name || "Unknown";
          if (!brandOrders[brandName])
            brandOrders[brandName] = { name: brandName, orders: 0, revenue: 0 };
          brandOrders[brandName].orders += item.quantity;
          brandOrders[brandName].revenue += parseFloat(item.line_total || 0);

          const productName = item.products?.name || "Unknown";
          const costPrice = parseFloat(item.products?.cost_price || 0);

          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              quantity: 0,
              revenue: 0,
              cost: 0,
            };
          }

          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += parseFloat(item.line_total || 0);
          productSales[productId].cost += costPrice * item.quantity;
        });
      });
      const categorySortData = Object.values(categoryOrders)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10);
      const brandSortData = Object.values(brandOrders)
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 10);
      setCategoryOrdersData(categorySortData);
      setBrandOrdersData(brandSortData);

      const topProductsList = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((p) => ({
          ...p,
          profit: parseFloat((p.revenue - p.cost).toFixed(2)),
        }));

      setTopProducts(topProductsList);

      const midPoint = new Date(startDate);
      midPoint.setDate(midPoint.getDate() + Math.floor(daysAgo / 2));

      const productTrendsData: any[] = [];

      Object.entries(productSales).forEach(([productId, data]) => {
        const firstHalfOrders =
          orders?.filter((o) => new Date(o.created_at) < midPoint) || [];
        const secondHalfOrders =
          orders?.filter((o) => new Date(o.created_at) >= midPoint) || [];

        let firstHalfQty = 0;
        let secondHalfQty = 0;

        firstHalfOrders.forEach((order) => {
          order.order_items?.forEach((item: any) => {
            if (item.product_id === productId) {
              firstHalfQty += item.quantity;
            }
          });
        });

        secondHalfOrders.forEach((order) => {
          order.order_items?.forEach((item: any) => {
            if (item.product_id === productId) {
              secondHalfQty += item.quantity;
            }
          });
        });

        const growthRate =
          firstHalfQty > 0
            ? ((secondHalfQty - firstHalfQty) / firstHalfQty) * 100
            : secondHalfQty > 0
            ? 100
            : 0;

        if (
          Math.abs(growthRate) > 5 &&
          (firstHalfQty > 0 || secondHalfQty > 0)
        ) {
          productTrendsData.push({
            name: data.name,
            growthRate: parseFloat(growthRate.toFixed(1)),
            trend: growthRate > 0 ? "up" : "down",
            firstHalf: firstHalfQty,
            secondHalf: secondHalfQty,
          });
        }
      });

      productTrendsData.sort(
        (a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate)
      );
      setProductTrends(productTrendsData.slice(0, 8));
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1);
  const maxProfit = Math.max(...profitData.map((d) => d.profit), 1);
  const maxOrders = Math.max(...ordersData.map((d) => d.orders), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Overview of your business performance
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="7">Last 7 Days</option>
          <option value="14">Last 14 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            {stats.revenueGrowth !== 0 && (
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  stats.revenueGrowth > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stats.revenueGrowth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(stats.revenueGrowth).toFixed(1)}%
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            ${stats.totalRevenue.toFixed(2)}
          </h3>
          <p className="text-sm text-slate-600 mt-1">Gross Revenue</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            ${stats.totalProfit.toFixed(2)}
          </h3>
          <p className="text-sm text-slate-600 mt-1">Net Profit</p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.totalRevenue > 0
              ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
              : 0}
            % margin
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            {stats.ordersGrowth !== 0 && (
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  stats.ordersGrowth > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stats.ordersGrowth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(stats.ordersGrowth).toFixed(1)}%
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {stats.totalOrders}
          </h3>
          <p className="text-sm text-slate-600 mt-1">Total Orders</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {stats.totalBuyers}
          </h3>
          <p className="text-sm text-slate-600 mt-1">Active Buyers</p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.totalProducts} products
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Gross Revenue Trend
            </h2>
          </div>
          {revenueData.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No revenue data for this period
            </div>
          ) : (
            <div className="space-y-2">
              {revenueData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-slate-600 font-medium">
                    {item.date}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{
                          width: `${Math.max(
                            (item.revenue / maxRevenue) * 100,
                            2
                          )}%`,
                        }}
                      >
                        {item.revenue > maxRevenue * 0.2 && (
                          <span className="text-white text-xs font-semibold">
                            ${item.revenue.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.revenue <= maxRevenue * 0.2 && (
                      <span className="text-xs font-semibold text-slate-900 w-16">
                        ${item.revenue.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Top categories
            </h2>
            {categoryOrdersData.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                No category data available!
              </div>
            ) : (
              <div className="space-y-2">
                {categoryOrdersData.map((category, index) => {
                  const maxOrders = Math.max(
                    ...categoryOrdersData.map((d) => d.orders),
                    1
                  );
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-slate-600 font-medium truncate">
                        {category.name}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${(category.orders / maxOrders) * 100}%` }}

                        />
                      </div>
                      <div className="w-12 text-right text-xs font-semibold text-slate-900">
                        {category.orders}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Top Brands
            </h2>
            {brandOrdersData.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                No brand data available!
              </div>
            ) : (
              <div className="space-y-2">
                {brandOrdersData.map((brand, index) => {
                  const maxOrders = Math.max(
                    ...brandOrdersData.map((d) => d.orders),
                    1
                  );
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-24 text-xs text-slate-600 font-medium truncate">
                        {brand.name}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{
                            width: `${(brand.orders / maxOrders) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="w-12 text-right text-xs font-semibold text-slate-900">
                        {brand.orders}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Net Profit Trend
            </h2>
          </div>
          {profitData.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No profit data for this period
            </div>
          ) : (
            <div className="space-y-2">
              {profitData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-slate-600 font-medium">
                    {item.date}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{
                          width: `${Math.max(
                            (item.profit / maxProfit) * 100,
                            2
                          )}%`,
                        }}
                      >
                        {item.profit > maxProfit * 0.2 && (
                          <span className="text-white text-xs font-semibold">
                            ${item.profit.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.profit <= maxProfit * 0.2 && (
                      <span className="text-xs font-semibold text-slate-900 w-16">
                        ${item.profit.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Top Selling Products
          </h2>
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              No sales data available
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        {product.quantity} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold text-slate-900">
                      ${product.revenue.toFixed(0)}
                    </p>
                    <p className="text-xs text-green-600">
                      ${product.profit.toFixed(0)} profit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Sales Trends by Product
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Comparing first half vs second half of period
          </p>
          {productTrends.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              Not enough data to show trends
            </div>
          ) : (
            <div className="space-y-3">
              {productTrends.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {product.firstHalf} → {product.secondHalf} units
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-2 shrink-0 ml-4 ${
                      product.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {product.trend === "up" ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    <span className="font-bold text-lg">
                      {Math.abs(product.growthRate)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-900">
            Orders Volume Trend
          </h2>
        </div>
        {ordersData.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            No orders data for this period
          </div>
        ) : (
          <div className="space-y-3">
            {ordersData.map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-sm text-slate-600 font-medium">
                  {item.date}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-10 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-center transition-all"
                      style={{
                        width: `${Math.max(
                          (item.orders / maxOrders) * 100,
                          5
                        )}%`,
                      }}
                    >
                      <span className="text-white text-sm font-bold">
                        {item.orders}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 w-24">
                    ${item.revenue.toFixed(0)} rev
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
