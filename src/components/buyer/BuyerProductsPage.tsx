import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, ShoppingCart, Plus, Minus } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/imageHelper';

export default function BuyerProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [profile]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const loadProducts = async () => {
    if (!profile?.seller_id) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name), brands(name), buyer_discounts!buyer_discounts_product_id_fkey(*)')
        .eq('seller_id', profile.seller_id)
        .eq('is_visible', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const productsWithDiscounts = data?.map((product) => {
        let finalPrice = parseFloat(product.unit_price);
        let discountPercentage = 0;

        const productDiscount = product.buyer_discounts?.find(
          (d: any) => d.buyer_id === profile.id && d.discount_type === 'product'
        );

        if (productDiscount) {
          discountPercentage = productDiscount.discount_percentage;
        }

        if (discountPercentage > 0) {
          finalPrice = finalPrice * (1 - discountPercentage / 100);
        }

        return {
          ...product,
          discountPercentage,
          finalPrice,
        };
      });

      setProducts(productsWithDiscounts || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }

    const term = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      )
    );
  };

  const updateCart = (productId: string, change: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const newValue = Math.max(0, current + change);
      if (newValue === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newValue };
    });
  };

  const getTotalItems = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const getTotalAmount = () => {
    return Object.entries(cart).reduce((sum, [productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      return sum + (product?.finalPrice || 0) * qty;
    }, 0);
  };

  const handleCheckout = async () => {
    if (getTotalItems() === 0) return;

    try {
      const orderNumber = `ORD-${Date.now()}`;
      const subtotal = getTotalAmount();
      const total = subtotal;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          buyer_id: profile!.id,
          seller_id: profile!.seller_id,
          status: 'pending',
          subtotal,
          total_amount: total,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = Object.entries(cart).map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        return {
          order_id: order.id,
          product_id: productId,
          quantity: qty,
          unit_price: product.finalPrice,
          line_total: product.finalPrice * qty,
        };
      });

      const { error: itemsError } = await supabase.from('order_items').insert(items);

      if (itemsError) throw itemsError;

      alert('Order placed successfully!');
      setCart({});
    } catch (error: any) {
      alert(error.message || 'Failed to place order');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-600 mt-1">{filteredProducts.length} products available</p>
        </div>

        {getTotalItems() > 0 && (
          <button
            onClick={handleCheckout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            Checkout ({getTotalItems()} items - ${getTotalAmount().toFixed(2)})
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No products available</h3>
          <p className="text-slate-600">Check back soon for new products</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
              <img
                src={getImageUrl(product.image_url, product.name)}
                alt={product.name}
                onError={(e) => handleImageError(e, product.name)}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                <p className="text-sm text-slate-600 mb-2">{product.brands?.name || 'No brand'}</p>
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                  {product.description || 'No description'}
                </p>

                <div className="mb-3">
                  {product.discountPercentage > 0 ? (
                    <div>
                      <span className="text-lg font-bold text-green-600">
                        ${product.finalPrice.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500 line-through ml-2">
                        ${product.unit_price}
                      </span>
                      <span className="text-xs text-green-600 ml-2">
                        {product.discountPercentage}% off
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-slate-900">
                      ${product.finalPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mb-3">In stock: {product.stock_quantity}</p>

                {cart[product.id] ? (
                  <div className="flex items-center justify-between bg-slate-100 rounded-lg p-2">
                    <button
                      onClick={() => updateCart(product.id, -1)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium">{cart[product.id]}</span>
                    <button
                      onClick={() => updateCart(product.id, 1)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => updateCart(product.id, 1)}
                    className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
