import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, Edit2, CreditCard, TrendingUp, Package, ShoppingBag } from 'lucide-react';

interface BuyerDetailPageProps {
  buyerId: string;
  onBack: () => void;
}

export default function BuyerDetailPage({ buyerId, onBack }: BuyerDetailPageProps) {
  const { profile } = useAuth();
  const [buyer, setBuyer] = useState<any>(null);
  const [creditTerms, setCreditTerms] = useState<any>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'orders'>('details');
  const [orders, setOrders] = useState<any[]>([]);
  const [newDiscount, setNewDiscount] = useState({
    type: 'category',
    targetId: '',
    percentage: '',
  });

  useEffect(() => {
    loadData();
  }, [buyerId]);

  const loadData = async () => {
    setLoading(true);

    const [buyerRes, creditRes, discountsRes, categoriesRes, brandsRes, productsRes, ordersRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', buyerId).single(),
      supabase.from('buyer_credit_terms').select('*').eq('buyer_id', buyerId).eq('seller_id', profile!.id).maybeSingle(),
      supabase.from('buyer_discounts').select('*, categories(name), brands(name), products(name, sku)').eq('buyer_id', buyerId),
      supabase.from('categories').select('*').eq('seller_id', profile!.id).eq('is_active', true),
      supabase.from('brands').select('*').eq('seller_id', profile!.id).eq('is_active', true),
      supabase.from('products').select('id, name, sku').eq('seller_id', profile!.id).eq('is_active', true),
      supabase.from('orders').select('*').eq('buyer_id', buyerId).eq('seller_id', profile!.id).order('created_at', { ascending: false }),
    ]);

    setBuyer(buyerRes.data);
    setCreditTerms(creditRes.data);
    setDiscounts(discountsRes.data || []);
    setCategories(categoriesRes.data || []);
    setBrands(brandsRes.data || []);
    setProducts(productsRes.data || []);
    setOrders(ordersRes.data || []);
    setLoading(false);
  };

  const handleAddDiscount = async () => {
    if (!newDiscount.targetId || !newDiscount.percentage) {
      alert('Please fill all fields');
      return;
    }

    try {
      const data: any = {
        buyer_id: buyerId,
        seller_id: profile!.id,
        discount_type: newDiscount.type,
        discount_percentage: parseFloat(newDiscount.percentage),
        is_active: true,
      };

      if (newDiscount.type === 'category') {
        data.category_id = newDiscount.targetId;
      } else if (newDiscount.type === 'brand') {
        data.brand_id = newDiscount.targetId;
      } else if (newDiscount.type === 'product') {
        data.product_id = newDiscount.targetId;
      }

      const { error } = await supabase.from('buyer_discounts').insert(data);
      if (error) throw error;

      setNewDiscount({ type: 'category', targetId: '', percentage: '' });
      setShowAddDiscount(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Remove this discount?')) return;

    await supabase.from('buyer_discounts').delete().eq('id', id);
    loadData();
  };

  const getDiscountLabel = (discount: any) => {
    if (discount.discount_type === 'category') {
      return `${discount.categories?.name || 'Category'}`;
    } else if (discount.discount_type === 'brand') {
      return `${discount.brands?.name || 'Brand'}`;
    } else if (discount.discount_type === 'product') {
      return `${discount.products?.name || 'Product'} (${discount.products?.sku || ''})`;
    }
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading buyer details...</div>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600">Buyer not found</p>
        <button onClick={onBack} className="mt-4 text-slate-900 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{buyer.business_name || buyer.company_name}</h1>
          <p className="text-slate-600 mt-1">{buyer.first_name} {buyer.last_name} • {buyer.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 px-1 border-b-2 font-medium transition ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Details & Discounts
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 border-b-2 font-medium transition ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders ({orders.length})
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <>
      {/* Credit Terms Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-slate-700" />
          <h2 className="text-xl font-bold text-slate-900">Credit Terms</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Credit Limit</p>
            <p className="text-2xl font-bold text-slate-900">
              ${creditTerms?.credit_limit?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Credit Days</p>
            <p className="text-2xl font-bold text-slate-900">
              {creditTerms?.credit_days || 0} days
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              creditTerms?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {creditTerms?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Discounts Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Applied Discounts</h2>
          </div>
          <button
            onClick={() => setShowAddDiscount(!showAddDiscount)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Discount
          </button>
        </div>

        {/* Add Discount Form */}
        {showAddDiscount && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-4">Add New Discount</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                <select
                  value={newDiscount.type}
                  onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value, targetId: '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="category">Category</option>
                  <option value="brand">Brand</option>
                  <option value="product">Product</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {newDiscount.type === 'category' ? 'Category' : newDiscount.type === 'brand' ? 'Brand' : 'Product'}
                </label>
                <select
                  value={newDiscount.targetId}
                  onChange={(e) => setNewDiscount({ ...newDiscount, targetId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {newDiscount.type === 'category' && categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                  {newDiscount.type === 'brand' && brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                  {newDiscount.type === 'product' && products.map((prod) => (
                    <option key={prod.id} value={prod.id}>{prod.name} ({prod.sku})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Discount %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newDiscount.percentage}
                  onChange={(e) => setNewDiscount({ ...newDiscount, percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10.00"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleAddDiscount}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddDiscount(false);
                    setNewDiscount({ type: 'category', targetId: '', percentage: '' });
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discounts List */}
        {discounts.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <p>No discounts applied yet</p>
            <p className="text-sm mt-2">Click "Add Discount" to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {discount.discount_percentage}% OFF
                    </span>
                    <span className="font-medium text-slate-900">
                      {getDiscountLabel(discount)}
                    </span>
                    <span className="text-sm text-slate-600 capitalize">
                      ({discount.discount_type})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDiscount(discount.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available to Add Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-medium text-blue-900 mb-3">Available Discount Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-900">Category Discounts</p>
            <p className="text-blue-700">{categories.length} categories available</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Brand Discounts</p>
            <p className="text-blue-700">{brands.length} brands available</p>
          </div>
          <div>
            <p className="font-medium text-blue-900">Product Discounts</p>
            <p className="text-blue-700">{products.length} products available</p>
          </div>
        </div>
      </div>
      </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Order History</h2>
            <p className="text-sm text-slate-600 mt-1">All orders from this buyer</p>
          </div>
          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No orders yet from this buyer</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Order #</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Payment</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 font-medium text-blue-600">{order.order_number}</td>
                      <td className="py-4 px-4 text-slate-700">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-slate-900">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
