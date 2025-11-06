import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, AlertTriangle, Package, TrendingDown, Eye } from 'lucide-react';
import InventoryDetailPage from './InventoryDetailPage';

export default function InventoryPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [profile]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, filterType]);

  const loadProducts = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, categories(name), brands(name)')
      .eq('seller_id', profile.id)
      .order('stock_quantity', { ascending: true });

    if (data && data.length > 0) {
      const productsWithVariants = await Promise.all(
        data.map(async (product) => {
          if (product.has_variants) {
            const { data: variants } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', product.id)
              .order('unit_price', { ascending: true });

            const totalStock = variants?.reduce((sum, v) => sum + (v.stock_quantity || 0), 0) || 0;
            const lowestPrice = variants?.[0]?.unit_price || 0;

            return {
              ...product,
              stock_quantity: totalStock,
              unit_price: lowestPrice,
              variant_count: variants?.length || 0,
              variants: variants || []
            };
          }
          return { ...product, variant_count: 0, variants: [] };
        })
      );

      setProducts(productsWithVariants);
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  const filterProducts = () => {
    let filtered = products;

    if (filterType === 'low_stock') {
      filtered = filtered.filter((p) => p.stock_quantity <= (p.min_order_quantity || 10));
    } else if (filterType === 'out_of_stock') {
      filtered = filtered.filter((p) => p.stock_quantity === 0);
    }

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product: any) => {
    if (product.stock_quantity === 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    } else if (product.stock_quantity <= (product.min_order_quantity || 10)) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', productId);
    loadProducts();
  };

  const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= (p.min_order_quantity || 10)).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.unit_price), 0);

  if (viewingProductId) {
    return <InventoryDetailPage productId={viewingProductId} onBack={() => setViewingProductId(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-600 mt-1">Monitor stock levels and manage inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Inventory Value</p>
              <p className="text-3xl font-bold text-slate-900">
                ${totalValue.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold text-yellow-600">
                {lowStockCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">Needs restock</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600">
                {outOfStockCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">Urgent action needed</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Products</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-600">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Add products to start managing inventory'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Stock Value
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  return (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900">{product.name}</div>
                          <div className="text-sm text-slate-600">{product.categories?.name}</div>
                          {product.has_variants && product.variants && product.variants.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {product.variants.slice(0, 3).map((variant: any, idx: number) => {
                                const variantLabel = [
                                  variant.variant_1_value,
                                  variant.variant_2_value,
                                  variant.variant_3_value
                                ].filter(Boolean).join(', ');
                                return variantLabel ? (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                                    {variantLabel}
                                  </span>
                                ) : null;
                              })}
                              {product.variants.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                                  +{product.variants.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-slate-600 font-mono">{product.sku}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {product.stock_quantity}
                          {product.has_variants && product.variant_count > 0 && (
                            <span className="ml-1 text-xs text-slate-600">+{product.variant_count} variants</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">Min: {product.min_order_quantity || 10}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        ${product.unit_price?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        ${(product.stock_quantity * product.unit_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingProductId(product.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
