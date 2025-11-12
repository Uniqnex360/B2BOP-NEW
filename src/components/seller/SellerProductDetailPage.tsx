import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, Layers, Eye, EyeOff, Edit } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';

interface SellerProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onEdit?: (productId: string) => void;
}

export default function SellerProductDetailPage({ productId, onBack, onEdit }: SellerProductDetailPageProps) {
  const { profile } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  const loadProductDetails = async () => {
    if (!profile?.id) return;

    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, categories(id, name), brands(id, name)')
        .eq('id', productId)
        .eq('seller_id', profile.id)
        .maybeSingle();

      if (productError) throw productError;
      setProduct(productData);

      if (productData?.has_variants) {
        const { data: variantsData, error: variantsError } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId)
          .order('unit_price');

        if (variantsError) throw variantsError;
        setVariants(variantsData || []);
      }
    } catch (error) {
      console.error('Error loading product details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Product not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const totalStock = product.has_variants
    ? variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
    : product.stock_quantity || 0;

  const totalValue = product.has_variants
    ? variants.reduce((sum, v) => sum + (v.stock_quantity || 0) * (v.unit_price || 0), 0)
    : (product.stock_quantity || 0) * (product.unit_price || 0);
  console.log('variants',variants)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Product Details</h1>
            <p className="text-slate-600 mt-1">View complete product information</p>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(productId)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            Edit Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4">
            <img
              src={getImageUrl(product.image_url, product.name)}
              alt={product.name}
              onError={(e) => handleImageError(e, product.name)}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {product.is_visible ? (
                <span className="flex items-center text-green-600 text-sm font-medium">
                  <Eye className="w-4 h-4 mr-1" />
                  Visible to buyers
                </span>
              ) : (
                <span className="flex items-center text-slate-500 text-sm font-medium">
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hidden from buyers
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {product.categories?.name && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    {product.categories.name}
                  </span>
                )}
                {product.brands?.name && (
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                    {product.brands.name}
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{product.name}</h2>
              <p className="text-sm text-slate-500 mt-2">SKU: {product.sku}</p>
              {product.parent_sku && (
                <p className="text-sm text-slate-500">Parent SKU: {product.parent_sku}</p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
            </div>
             <div className="border-t border-slate-200 pt-4">
  <p className="text-sm font-medium text-slate-900 mb-3">Features</p>
  <div className="space-y-2">
    {product.features?.split('\n').map((feature, index) => (
      feature.trim() && (
        <div key={index} className="flex items-start">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
          <p className="text-slate-600 leading-relaxed">{feature.trim()}</p>
        </div>
      )
    ))}
  </div>
</div>
            <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Stock</p>
                <p className="text-2xl font-bold text-slate-900">{totalStock}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Inventory Value</p>
                <p className="text-2xl font-bold text-green-600">${totalValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Unit of Measure</p>
                <p className="text-lg font-medium text-slate-900">{product.unit_of_measure || 'unit'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!product.has_variants ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Pricing & Inventory
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit Price
              </label>
              <div className="text-2xl font-bold text-slate-900">
                ${product.unit_price?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cost Price
              </label>
              <div className="text-2xl font-semibold text-slate-600">
                ${product.cost_price?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Quantity
              </label>
              <div className="text-2xl font-bold text-blue-600">{product.stock_quantity || 0}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Stock Value
              </label>
              <div className="text-2xl font-bold text-green-600">
                ${((product.stock_quantity || 0) * (product.unit_price || 0)).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Min Order Quantity
              </label>
              <div className="text-lg text-slate-900">{product.min_order_quantity || 1}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Order Quantity
              </label>
              <div className="text-lg text-slate-900">{product.max_order_quantity || 'Unlimited'}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Margin
              </label>
              <div className="text-lg font-semibold text-green-600">
                {product.cost_price && product.unit_price
                  ? `${(((product.unit_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Product Variants ({variants.length})
            </h3>
          </div>
          <div className="space-y-4">
            {variants.map((variant) => {
              const isAvailable = variant.stock_quantity > 0;
              const margin = variant.cost_price && variant.unit_price
                ? (((variant.unit_price - variant.cost_price) / variant.unit_price) * 100).toFixed(1)
                : '0';

              return (
                <div
                  key={variant.id}
                  className={`border-2 rounded-lg p-4 ${
                    isAvailable ? 'border-slate-200' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {variant.variant_1_name && (
                            <div className="inline-flex items-baseline gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
                              <span className="text-sm font-semibold text-slate-700 uppercase">{variant.variant_1_name}:</span>
                              <span className="text-base font-bold text-slate-900">{variant.variant_1_value}</span>
                            </div>
                          )}
                          {variant.variant_2_name && (
                            <div className="inline-flex items-baseline gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
                              <span className="text-sm font-semibold text-slate-700 uppercase">{variant.variant_2_name}:</span>
                              <span className="text-base font-bold text-slate-900">{variant.variant_2_value}</span>
                            </div>
                          )}
                          {variant.variant_3_name && (
                            <div className="inline-flex items-baseline gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
                              <span className="text-sm font-semibold text-slate-700 uppercase">{variant.variant_3_name}:</span>
                              <span className="text-base font-bold text-slate-900">{variant.variant_3_value}</span>
                            </div>
                          )}
                          {variant.variant_4_name && (
                            <div className="inline-flex items-baseline gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
                              <span className="text-sm font-semibold text-slate-700 uppercase">{variant.variant_4_name}:</span>
                              <span className="text-base font-bold text-slate-900">{variant.variant_4_value}</span>
                            </div>
                          )}
                          {variant.variant_5_name && (
                            <div className="inline-flex items-baseline gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md">
                              <span className="text-sm font-semibold text-slate-700 uppercase">{variant.variant_5_name}:</span>
                              <span className="text-base font-bold text-slate-900">{variant.variant_5_value}</span>
                            </div>
                          )}
                        </div>
                        {variant.sku && (
                          <div>
                            <span className="text-xs text-slate-500">SKU: </span>
                            <span className="text-sm font-medium text-slate-700">{variant.sku}</span>
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isAvailable ? 'In Stock' : 'Out of Stock'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Unit Price</p>
                        <p className="text-lg font-bold text-slate-900">${variant.unit_price?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Cost Price</p>
                        <p className="text-lg font-semibold text-slate-600">${variant.cost_price?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Stock</p>
                        <p className="text-lg font-bold text-blue-600">{variant.stock_quantity || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Stock Value</p>
                        <p className="text-lg font-bold text-green-600">
                          ${((variant.stock_quantity || 0) * (variant.unit_price || 0)).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Margin</p>
                        <p className="text-lg font-semibold text-green-600">{margin}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="text-sm text-slate-600">Min Order: {variant.min_order_quantity || 1}</span>
                      </div>
                      <div>
                        <span className="text-sm text-slate-600">Max Order: {variant.max_order_quantity || 'Unlimited'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
