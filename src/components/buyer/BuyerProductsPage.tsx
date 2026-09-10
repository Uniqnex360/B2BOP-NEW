import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Search, Plus, Minus, Layers } from "lucide-react";
import { getImageUrl, handleImageError } from "../../utils/imageHelper";
import ShoppingCart from "./ShopingCart";
import { CartButton, CartItem } from "./ShopingCart";

export default function BuyerProductsPage() {
  const { profile } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [profile]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const loadProducts = async () => {
    if (!profile?.seller_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          categories(name),
          brands(name),
          product_variants(*),
          buyer_discounts!buyer_discounts_product_id_fkey(*)
        `,
        )
        .eq("seller_id", profile.seller_id)
        .eq("is_visible", true)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      const productsWithDiscounts = (data || []).map((product) => {
        const basePrice = Number(product.unit_price) || 0;

        let finalPrice = basePrice;
        let discountPercentage = 0;

        const productDiscount = product.buyer_discounts?.find(
          (d: any) =>
            d.buyer_id === profile.id && d.discount_type === "product",
        );

        if (productDiscount) {
          discountPercentage = Number(productDiscount.discount_percentage) || 0;
        }

        if (discountPercentage > 0) {
          finalPrice = basePrice * (1 - discountPercentage / 100);
        }

        const activeVariants = (product.product_variants || []).filter(
          (variant: any) => variant.is_active !== false,
        );

        const hasVariants =
          product.has_variants === true && activeVariants.length > 0;

        const variantStock = activeVariants.reduce(
          (total: number, variant: any) =>
            total + (Number(variant.stock_quantity) || 0),
          0,
        );

        const availableStock = hasVariants
          ? variantStock
          : Number(product.stock_quantity) || 0;
        const isAvailable = availableStock > 0;

        return {
          ...product,
          discountPercentage,
          finalPrice,
          activeVariants,
          hasVariants,
          availableStock,
          isAvailable,
        };
      });

      setProducts(productsWithDiscounts);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }

    const term = searchTerm.toLowerCase();

    setFilteredProducts(
      products.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.sku?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term),
      ),
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

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  const getTotalItems = () =>
    Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const getTotalAmount = () => {
    return Object.entries(cart).reduce((sum, [productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return sum;
      return sum + (Number(product.finalPrice) || 0) * qty;
    }, 0);
  };

  // Map the {productId: qty} cart state into the shared component's CartItem shape.
  const cartItems: CartItem[] = Object.entries(cart)
    .map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return null;

      return {
        cartId: productId,
        productId,
        name: product.name,
        imageUrl: product.image_url,
        price: Number(product.finalPrice) || 0,
        quantity: qty,
        stock: Number(product.availableStock) || 0,
      } as CartItem;
    })
    .filter((item): item is CartItem => item !== null);

  const handleCheckout = async () => {
    if (getTotalItems() === 0 || !profile) return;

    try {
      const orderNumber = `ORD-${Date.now()}`;
      const subtotal = getTotalAmount();
      const total = subtotal;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          buyer_id: profile.id,
          seller_id: profile.seller_id,
          status: "pending",
          subtotal,
          total_amount: total,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = Object.entries(cart)
        .map(([productId, qty]) => {
          const product = products.find((p) => p.id === productId);
          if (!product) return null;

          return {
            order_id: order.id,
            product_id: product.id,
            quantity: qty,
            unit_price: Number(product.finalPrice) || 0,
            line_total: (Number(product.finalPrice) || 0) * qty,
          };
        })
        .filter(Boolean);

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

      alert("Order placed successfully!");
      setCart({});
      setShowCart(false);
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "Failed to place order");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-600 mt-1">
            {filteredProducts.length} products available
          </p>
        </div>

        <CartButton
          itemCount={getTotalItems()}
          onClick={() => setShowCart(true)}
        />
      </div>

      <ShoppingCart
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        items={cartItems}
        onUpdateQuantity={updateCart}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />

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
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No products available
          </h3>
          <p className="text-slate-600">Check back soon for new products</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const cartQuantity = cart[product.id] || 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition"
              >
                <img
                  src={getImageUrl(product.image_url, product.name)}
                  alt={product.name}
                  onError={(e) => handleImageError(e, product.name)}
                  className="w-full h-48 object-cover"
                />

                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    {product.brands?.name || "No brand"}
                  </p>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {product.description || "No description"}
                  </p>

                  <div className="mb-3">
                    {product.discountPercentage > 0 ? (
                      <div>
                        <span className="text-lg font-bold text-green-600">
                          ${Number(product.finalPrice).toFixed(2)}
                        </span>

                        <span className="text-sm text-slate-500 line-through ml-2">
                          ${Number(product.unit_price).toFixed(2)}
                        </span>

                        <span className="text-xs text-green-600 ml-2">
                          {product.discountPercentage}% off
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-slate-900">
                        ${Number(product.finalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {product.hasVariants && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-blue-600">
                      <Layers className="w-4 h-4" />
                      <span>
                        {product.activeVariants.length} variant
                        {product.activeVariants.length !== 1 ? "s" : ""}{" "}
                        available
                      </span>
                    </div>
                  )}

                  <p
                    className={`text-xs mb-3 ${
                      product.isAvailable ? "text-slate-600" : "text-red-600"
                    }`}
                  >
                    {product.isAvailable
                      ? `In stock: ${product.availableStock}`
                      : "Out of Stock"}
                  </p>

                  {cartQuantity > 0 ? (
                    <div className="flex items-center justify-between bg-slate-100 rounded-lg p-2">
                      <button
                        onClick={() => updateCart(product.id, -1)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="font-medium">{cartQuantity}</span>

                      <button
                        onClick={() => updateCart(product.id, 1)}
                        disabled={cartQuantity >= product.availableStock}
                        className="p-1 hover:bg-slate-200 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateCart(product.id, 1)}
                      disabled={!product.isAvailable}
                      className={`w-full px-4 py-2 rounded-lg transition text-sm ${
                        product.isAvailable
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {product.isAvailable ? "Add to Cart" : "Out of Stock"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
