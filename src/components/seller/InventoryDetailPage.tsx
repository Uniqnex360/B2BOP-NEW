import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';

interface InventoryDetailPageProps {
  productId: string;
  onBack: () => void;
}

export default function InventoryDetailPage({ productId, onBack }: InventoryDetailPageProps) {
  const { profile } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  const loadProductDetails = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const [productRes, variantsRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, categories(name), brands(name)')
        .eq('id', productId)
        .maybeSingle(),
      supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('unit_price', { ascending: true }),
    ]);

    setProduct(productRes.data);
    setVariants(variantsRes.data || []);
    setLoading(false);
  };

  const handleUpdateProductStock = async (newStock: number) => {
    setSaving(true);
    await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', productId);
    await loadProductDetails();
    setSaving(false);
  };

  const handleUpdateVariantStock = async (variantId: string, newStock: number) => {
    setSaving(true);
    await supabase
      .from('product_variants')
      .update({ stock_quantity: newStock })
      .eq('id', variantId);
    await loadProductDetails();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading inventory details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Product not found</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Inventory Details</h1>
      </div>

      {/* Product Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={getImageUrl(product.image_url, product.name)}
              alt={product.name}
              onError={(e) => handleImageError(e, product.name)}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{product.name}</h2>
            <p className="text-sm text-slate-600 mb-2">{product.description}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                SKU: {product.sku}
              </span>
              {product.categories?.name && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  {product.categories.name}
                </span>
              )}
              {product.brands?.name && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  {product.brands.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Base Product Stock (if no variants) */}
      {!product.has_variants && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Product Stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Current Stock
              </label>
              <input
                type="number"
                min="0"
                value={product.stock_quantity}
                onChange={(e) => handleUpdateProductStock(parseInt(e.target.value) || 0)}
                disabled={saving}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unit Price
              </label>
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                ${product.unit_price?.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Total Value
              </label>
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold">
                ${(product.stock_quantity * product.unit_price).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variants Stock */}
      {product.has_variants && variants.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Product Variants ({variants.length})
          </h3>
          <div className="space-y-4">
            {variants.map((variant) => {
              const variantAttrs = [];
              if (variant.variant_1_name) variantAttrs.push(`${variant.variant_1_name}: ${variant.variant_1_value}`);
              if (variant.variant_2_name) variantAttrs.push(`${variant.variant_2_name}: ${variant.variant_2_value}`);
              if (variant.variant_3_name) variantAttrs.push(`${variant.variant_3_name}: ${variant.variant_3_value}`);
              if (variant.variant_4_name) variantAttrs.push(`${variant.variant_4_name}: ${variant.variant_4_value}`);
              if (variant.variant_5_name) variantAttrs.push(`${variant.variant_5_name}: ${variant.variant_5_value}`);
              const variantLabel = variantAttrs.join(', ');

              return (
                <div key={variant.id} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">{variantLabel}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={variant.stock_quantity}
                        onChange={(e) => handleUpdateVariantStock(variant.id, parseInt(e.target.value) || 0)}
                        disabled={saving}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Unit Price
                      </label>
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                        ${variant.unit_price?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cost Price
                      </label>
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
                        ${variant.cost_price?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Total Value
                      </label>
                      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold">
                        ${(variant.stock_quantity * variant.unit_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-slate-600">Min Order: {variant.min_order_quantity || 1}</span>
                    </div>
                    <div>
                      <span className="text-sm text-slate-600">Max Order: {variant.max_order_quantity || 'N/A'}</span>
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
