import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ShoppingCart, Heart, Package, Plus, Minus } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onAddToCart?: (product: any, quantity: number) => void;
}

export default function ProductDetailPage({ productId, onBack, onAddToCart }: ProductDetailPageProps) {
  const { profile } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const [productRes, variantsRes, wishlistRes] = await Promise.all([
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
      supabase
        .from('wishlist')
        .select('id')
        .eq('buyer_id', profile.id)
        .eq('product_id', productId)
        .maybeSingle(),
    ]);

    setProduct(productRes.data);
    setVariants(variantsRes.data || []);
    if (variantsRes.data && variantsRes.data.length > 0) {
      setSelectedVariant(variantsRes.data[0]);
    }
    setInWishlist(!!wishlistRes.data);
    setLoading(false);
  };

  const toggleWishlist = async () => {
    if (!profile?.id || !product) return;

    if (inWishlist) {
      await supabase
        .from('wishlist')
        .delete()
        .eq('buyer_id', profile.id)
        .eq('product_id', product.id);
      setInWishlist(false);
    } else {
      await supabase
        .from('wishlist')
        .insert({
          buyer_id: profile.id,
          product_id: product.id,
        });
      setInWishlist(true);
    }
  };

  const handleAddToCart = () => {
    if (product && onAddToCart) {
      const itemToAdd = selectedVariant ? { ...product, ...selectedVariant, variant_id: selectedVariant.id } : product;
      onAddToCart(itemToAdd, quantity);
    }
  };

  const getCurrentPrice = () => {
    return selectedVariant ? selectedVariant.unit_price : product?.unit_price;
  };

  const getCurrentStock = () => {
    return selectedVariant ? selectedVariant.stock_quantity : product?.stock_quantity;
  };

  // Parse features from the string into an array
  const parseFeatures = () => {
    if (!product?.features) return [];
    
    // Split by \r\n or \n to handle different line endings
    return product.features.split(/\r\n|\n/).filter((feature: string) => feature.trim() !== '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading product...</div>
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

  const featuresList = parseFeatures();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Product Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-4 relative">
            <img
              src={getImageUrl(product.image_url, product.name)}
              alt={product.name}
              onError={(e) => handleImageError(e, product.name)}
              className="w-full h-full object-cover"
            />
            <button
              onClick={toggleWishlist}
              className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-lg hover:scale-110 transition"
            >
              <Heart
                className={`w-6 h-6 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-slate-600'}`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-4">
            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">
                {product.categories?.name || 'Uncategorized'}
              </span>
              {product.brands?.name && (
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full mb-3 ml-2">
                  {product.brands.name}
                </span>
              )}
              <h2 className="text-3xl font-bold text-slate-900">{product.name}</h2>
              <p className="text-sm text-slate-500 mt-2">SKU: {product.sku}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-blue-600">
                  ${getCurrentPrice()?.toFixed(2)}
                </span>
                <span className="text-lg text-slate-500">per unit</span>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Select Variant</h3>
                <div className="space-y-2">
                  {variants.map((variant) => {
                    const isAvailable = variant.stock_quantity > 0;
                    return (
                      <div
                        key={variant.id}
                        onClick={() => isAvailable && setSelectedVariant(variant)}
                        className={`p-4 border-2 rounded-lg transition ${
                          selectedVariant?.id === variant.id
                            ? 'border-blue-600 bg-blue-50 cursor-pointer'
                            : isAvailable
                            ? 'border-slate-200 hover:border-slate-300 cursor-pointer'
                            : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
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
                            <div className="text-right flex-shrink-0">
                              <p className="text-2xl font-bold text-blue-600">${variant.unit_price?.toFixed(2)}</p>
                              <p className={`text-sm font-semibold mt-1 ${
                                isAvailable ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {isAvailable ? 'Available' : 'Out of Stock'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
            </div>

            {/* Features Section */}
            {featuresList.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Features & Specifications</h3>
                <div className="space-y-2">
                  {featuresList.map((feature: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 py-2">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div>
                        <p className="text-slate-700">{feature}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Order Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Min Order Quantity</p>
                  <p className="font-medium text-slate-900">{product.min_order_quantity || 1} units</p>
                </div>
                {product.max_order_quantity && (
                  <div>
                    <p className="text-sm text-slate-500">Max Order Quantity</p>
                    <p className="font-medium text-slate-900">{product.max_order_quantity} units</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Quantity</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-slate-100 rounded transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-6 py-2 font-semibold text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(getCurrentStock(), quantity + 1))}
                    className="p-2 hover:bg-slate-100 rounded transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-slate-600">
                  Total: <span className="font-semibold text-slate-900">${(getCurrentPrice() * quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={getCurrentStock() === 0}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition text-lg font-semibold ${
                  getCurrentStock() === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {getCurrentStock() === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}