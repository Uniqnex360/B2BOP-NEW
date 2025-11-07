import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';
import {
  Plus,
  Grid3x3,
  List,
  Download,
  Upload,
  Search,
  Edit,
  Eye,
  EyeOff,
  Package,
} from 'lucide-react';
import ProductModal from './ProductModal';
import BulkEditModal from './BulkEditModal';
import ImportProductsModal from './ImportProductsModal';
import SellerProductDetailPage from './SellerProductDetailPage';

export default function ProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [totalVariants, setTotalVariants] = useState(0);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [filteredBrands, setFilteredBrands] = useState<any[]>([]);

  useEffect(() => {
    loadProducts();
    loadFilters();
  }, [profile]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, filterStatus, categoryFilter, brandFilter]);

  const loadProducts = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name), brands(id, name)')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const productsWithVariants = await Promise.all(
          data.map(async (product) => {
            if (product.has_variants) {
              const { data: variants, count } = await supabase
                .from('product_variants')
                .select('*', { count: 'exact' })
                .eq('product_id', product.id)
                .order('unit_price', { ascending: true })
                .limit(1);

              const firstVariant = variants?.[0];
              return {
                ...product,
                unit_price: firstVariant?.unit_price || 0,
                stock_quantity: firstVariant?.stock_quantity || 0,
                variant_count: count || 0
              };
            }
            return { ...product, variant_count: 0 };
          })
        );

        setProducts(productsWithVariants);

        const { count } = await supabase
          .from('product_variants')
          .select('id', { count: 'exact', head: true })
          .in('product_id', data.map(p => p.id));
        setTotalVariants(count || 0);
      } else {
        setProducts([]);
        setTotalVariants(0);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    if (!profile?.id) return;

    const [catsRes, brandsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('seller_id', profile.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('brands')
        .select('*')
        .eq('seller_id', profile.id)
        .eq('is_active', true)
        .order('name')
    ]);

    setCategories(catsRes.data || []);
    setBrands(brandsRes.data || []);
    setFilteredBrands(brandsRes.data || []);
  };

  useEffect(() => {
    if (categoryFilter === 'all') {
      setFilteredBrands(brands);
    } else {
      const brandsInCategory = products
        .filter(p => p.category_id === categoryFilter)
        .map(p => p.brand_id)
        .filter((v, i, a) => v && a.indexOf(v) === i);
      setFilteredBrands(brands.filter(b => brandsInCategory.includes(b.id)));
    }
  }, [categoryFilter, brands, products]);

  const filterProducts = () => {
    let filtered = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    if (filterStatus === 'visible') {
      filtered = filtered.filter((p) => p.is_visible && p.is_active);
    } else if (filterStatus === 'hidden') {
      filtered = filtered.filter((p) => !p.is_visible || !p.is_active);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => p.category_id === categoryFilter);
    }

    if (brandFilter !== 'all') {
      filtered = filtered.filter((p) => p.brand_id === brandFilter);
    }

    setFilteredProducts(filtered);
  };

  const toggleProductSelection = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const downloadTemplate = () => {
    try {
      const headers = [
        'item type',
        'product name',
        'sku',
        'vendor name',
        'brand',
        'category_1',
        'category_2',
        'category_3',
        'category_4',
        'category_5',
        'end_category',
        'Prod description',
        'description',
        'features',
        'Specifications (Name: Value)',
        'varation 1 name',
        'varation 1 value',
        'varation 2 name',
        'varation 2 value',
        'varation 3 name',
        'varation 3 value',
        'varation 4 name',
        'varation 4 value',
        'varation 5 name',
        'varation 5 value',
        'unit price',
        'cost price',
        'stock quantity',
        'min order qty',
        'max order qty',
        'unit of measure',
        'image url',
        'is visible',
        'is active'
      ];

      const csv = headers.join(',');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template');
    }
  };

  const exportProducts = async () => {
    try {
      const headers = [
        'item type',
        'product name',
        'sku',
        'vendor name',
        'brand',
        'category_1',
        'category_2',
        'category_3',
        'category_4',
        'category_5',
        'end_category',
        'Prod description',
        'description',
        'features',
        'Specifications (Name: Value)',
        'varation 1 name',
        'varation 1 value',
        'varation 2 name',
        'varation 2 value',
        'varation 3 name',
        'varation 3 value',
        'varation 4 name',
        'varation 4 value',
        'varation 5 name',
        'varation 5 value',
        'unit price',
        'cost price',
        'stock quantity',
        'min order qty',
        'max order qty',
        'unit of measure',
        'image url',
        'is visible',
        'is active'
      ];

      const rows: string[][] = [];

      for (const product of products) {
        const escapeCsv = (value: any) => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        const productRow = [
          'Product',
          escapeCsv(product.name),
          escapeCsv(product.parent_sku || product.sku),
          '',
          escapeCsv(product.brands?.name || ''),
          escapeCsv(product.categories?.name || ''),
          '',
          '',
          '',
          '',
          escapeCsv(product.categories?.name || ''),
          escapeCsv(product.description?.substring(0, 100) || ''),
          escapeCsv(product.description || ''),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          product.unit_price || 0,
          product.cost_price || 0,
          product.stock_quantity || 0,
          product.min_order_quantity || 1,
          product.max_order_quantity || '',
          product.unit_of_measure || 'unit',
          escapeCsv(product.image_url || ''),
          product.is_visible ? 'TRUE' : 'FALSE',
          product.is_active ? 'TRUE' : 'FALSE'
        ];

        rows.push(productRow);

        if (product.has_variants) {
          const { data: variants } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id)
            .eq('is_active', true);

          if (variants && variants.length > 0) {
            for (const variant of variants) {
              const attrs = variant.variant_attributes || {};
              const attrKeys = Object.keys(attrs);

              const variantRow = [
                'Variant',
                '',
                escapeCsv(variant.sku),
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                attrKeys[0] || '',
                attrs[attrKeys[0]] || '',
                attrKeys[1] || '',
                attrs[attrKeys[1]] || '',
                attrKeys[2] || '',
                attrs[attrKeys[2]] || '',
                attrKeys[3] || '',
                attrs[attrKeys[3]] || '',
                attrKeys[4] || '',
                attrs[attrKeys[4]] || '',
                variant.unit_price || 0,
                variant.cost_price || 0,
                variant.stock_quantity || 0,
                product.min_order_quantity || 1,
                product.max_order_quantity || '',
                product.unit_of_measure || 'unit',
                escapeCsv(variant.image_url || ''),
                'TRUE',
                variant.is_active ? 'TRUE' : 'FALSE'
              ];

              rows.push(variantRow);
            }
          }
        }
      }

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Failed to export products');
    }
  };

  if (viewingProductId) {
    return (
      <SellerProductDetailPage
        productId={viewingProductId}
        onBack={() => setViewingProductId(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="sticky top-0 z-40 bg-white py-6 -mx-6 px-6 shadows-sm flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-600 mt-1">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            <span className="text-slate-400 mx-2">•</span>
            <span className="text-sm">{totalVariants} {totalVariants === 1 ? 'variant' : 'variants'}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            <Upload className="w-4 h-4" />
            Import Products
          </button>
          <button
            onClick={exportProducts}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowProductModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="sticky top-24 z-30   bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setBrandFilter('all');
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={categoryFilter === 'all' && filteredBrands.length === 0}
            >
              <option value="all">{categoryFilter === 'all' ? 'All Brands' : 'All Brands in Category'}</option>
              {filteredBrands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Products</option>
              <option value="visible">Visible Only</option>
              <option value="hidden">Hidden Only</option>
            </select>

            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {selectedProducts.size > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-600">{selectedProducts.size} products selected</span>
            <button
              onClick={() => setShowBulkEdit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <Edit className="w-4 h-4" />
              Bulk Edit
            </button>
          </div>
        )}
      </div>

      {/* Products display */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first product'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product.id)}
                  onChange={() => toggleProductSelection(product.id)}
                  className="absolute top-4 left-4 w-5 h-5 rounded border-slate-300 z-10"
                />
                <div className="w-full h-48 overflow-hidden bg-slate-100 flex items-center justify-center">
  <img
    src={getImageUrl(product.image_url, product.name)}
    onError={(e) => handleImageError(e, product.name)}
    alt={product.name}
    className="max-w-full max-h-full object-contain"
  />
</div>
                {(!product.is_visible || !product.is_active) && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Hidden
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                    <span className="text-lg font-bold text-slate-900">${product.unit_price}</span>
                  {product.has_variants && product.variant_count > 0 && (
                    <span className="text-xs text-slate-600">+{product.variant_count} variants</span>
                  )}
                    <p className="text-sm text-slate-600">SKU: {product.sku}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {product.categories?.name && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {product.categories.name}
                    </span>
                  )}
                  {product.brands?.name && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {product.brands.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                  {product.description || 'No description'}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingProductId(product.id)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowProductModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Price</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(product.image_url, product.name)}
                          onError={(e) => handleImageError(e, product.name)}
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-600">{product.brands?.name || 'No brand'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-700">{product.sku}</td>
                    <td className="py-4 px-4 text-slate-700">{product.categories?.name || 'Uncategorized'}</td>
                    <td className="py-4 px-4 font-medium text-slate-900">${product.unit_price}</td>
                    <td className="py-4 px-4 text-slate-700">{product.stock_quantity}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {product.is_visible && product.is_active ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <Eye className="w-4 h-4" />
                            Visible
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <EyeOff className="w-4 h-4" />
                            Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowProductModal(true);
                        }}
                        className="text-slate-600 hover:text-slate-900 transition"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showProductModal && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          productIds={Array.from(selectedProducts)}
          onClose={() => setShowBulkEdit(false)}
          onSuccess={() => {
            setShowBulkEdit(false);
            setSelectedProducts(new Set());
            loadProducts();
          }}
        />
      )}

      {showImport && (
        <ImportProductsModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}
