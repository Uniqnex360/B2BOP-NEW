import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Package,
  Heart,
} from "lucide-react";
import CheckoutPage from "./CheckoutPage";
import ProductDetailPage from "./ProductDetailPage";
import { getImageUrl, handleImageError } from "../../utils/imageHelper";

interface CartItem {
  product_id: string;
  quantity: number;
  product: any;
  variant_id?: string | null;
}

export default function BuyerCatalogPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (profile?.id) {
      loadCart();
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, selectedBrand]);

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredBrands(brands);
    } else {
      const brandsInCategory = products
        .filter((p) => p.category_id === selectedCategory)
        .map((p) => p.brand_id)
        .filter((v, i, a) => v && a.indexOf(v) === i);
      setFilteredBrands(brands.filter((b) => brandsInCategory.includes(b.id)));
    }
  }, [selectedCategory, brands, products]);

  const loadCart = async () => {
    if (!profile?.id) return;

    const { data: cartData, error } = await supabase
      .from("cart")
      .select(
        `
        product_id,
        variant_id,
        is_variant,
        quantity,
        products (*, categories(name), brands(name)),
        product_variants (*)
      `,
      )
      .eq("buyer_id", profile.id);

    if (error) {
      console.error("🔴 CART FETCH ERROR:", error);
      return;
    }

    if (cartData) {
      const formattedCart = cartData.map((item) => {
        if (item.is_variant && item.product_variants) {
          const productData = {
            ...item.products,
            ...item.product_variants,
            image_url:
              item.product_variants.image_url || item.products.image_url,
            name: item.product_variants.name || item.products.name,
            unit_price: item.product_variants.unit_price,
            discount_price: item.product_variants.discount_price,
            categories: item.products.categories,
            brands: item.products.brands,
          };
          return {
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            product: productData,
          };
        } else {
          return {
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            product: item.products,
          };
        }
      });

      setCart(formattedCart);
    }
  };

  const loadData = async () => {
    console.log("------------------ CATALOG DEBUG START ------------------");
    console.log("🔍 CURRENT USER PROFILE:", profile);

    if (!profile?.id) {
      console.warn("⚠️ NO PROFILE ID FOUND! Stopping catalog load.");
      setLoading(false);
      return;
    }

    if (!profile?.seller_id) {
      console.error("❌ PROFILE HAS NO seller_id ASSIGNED!", {
        profileId: profile.id,
      });
    } else {
      console.log("📌 QUERYING PRODUCTS FOR seller_id:", profile.seller_id);
    }

    setLoading(true);

    const [productsRes, categoriesRes, brandsRes, wishlistRes] =
      await Promise.all([
        supabase
          .from("products")
          .select("*, categories(name), brands(name)")
          .eq("seller_id", profile.seller_id)
          .eq("is_visible", true)
          .eq("is_active", true),
        supabase
          .from("categories")
          .select("*")
          .eq("seller_id", profile.seller_id)
          .eq("is_active", true),
        supabase
          .from("brands")
          .select("*")
          .eq("seller_id", profile.seller_id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("wishlist")
          .select("product_id")
          .eq("buyer_id", profile.id),
      ]);

    console.log("📦 PRODUCTS API RESPONSE:", {
      error: productsRes.error,
      count: productsRes.data?.length || 0,
      data: productsRes.data,
    });

    console.log("🏷️ CATEGORIES API RESPONSE:", {
      error: categoriesRes.error,
      count: categoriesRes.data?.length || 0,
    });

    console.log("🔖 BRANDS API RESPONSE:", {
      error: brandsRes.error,
      count: brandsRes.data?.length || 0,
    });

    if (productsRes.error) {
      console.error("🔴 SUPABASE PRODUCT QUERY FAILED:", productsRes.error);
    }

    if (productsRes.data && productsRes.data.length > 0) {
      const productsWithVariants = await Promise.all(
        productsRes.data.map(async (product) => {
          if (product.has_variants) {
            const { data: variants, count } = await supabase
              .from("product_variants")
              .select("unit_price, stock_quantity", { count: "exact" })
              .eq("product_id", product.id)
              .order("unit_price", { ascending: true })
              .limit(1);

            const firstVariant = variants?.[0];
            const totalStock = await supabase
              .from("product_variants")
              .select("stock_quantity")
              .eq("product_id", product.id);

            const totalQuantity =
              totalStock.data?.reduce(
                (sum, v) => sum + (v.stock_quantity || 0),
                0,
              ) || 0;

            return {
              ...product,
              unit_price: firstVariant?.unit_price || 0,
              stock_quantity: totalQuantity,
              variant_count: count || 0,
            };
          }
          return { ...product, variant_count: 0 };
        }),
      );
      console.log("✅ FINAL FORMATTED PRODUCTS:", productsWithVariants);
      setProducts(productsWithVariants);
    } else {
      console.warn("⚠️ NO PRODUCTS RETURNED FOR SELLER ID:", profile.seller_id);
      setProducts([]);
    }

    setCategories(categoriesRes.data || []);
    setBrands(brandsRes.data || []);
    setFilteredBrands(brandsRes.data || []);
    setWishlistItems(new Set(wishlistRes.data?.map((w) => w.product_id) || []));
    setLoading(false);
    console.log("------------------ CATALOG DEBUG END ------------------");
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (selectedBrand !== "all") {
      filtered = filtered.filter((p) => p.brand_id === selectedBrand);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = async (product: any, quantity: number = 1) => {
    try {
      const isVariant = product.variant_id !== undefined;

      if (!isVariant && product.has_variants) {
        const { data: variants, error: variantError } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", product.id)
          .eq("is_active", true)
          .order("unit_price", { ascending: true })
          .limit(1);

        if (variantError || !variants || variants.length === 0) {
          alert("No active variants available for this product");
          return;
        }

        const firstVariant = variants[0];

        const cartItem = {
          buyer_id: profile.id,
          product_id: product.id,
          variant_id: firstVariant.id,
          is_variant: true,
          quantity: quantity,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("cart").upsert(cartItem, {
          onConflict: "buyer_id,product_id,variant_id",
        });

        if (error) throw error;
      } else {
        const cartItem = {
          buyer_id: profile.id,
          product_id: product.id,
          variant_id: isVariant ? product.variant_id : null,
          is_variant: isVariant,
          quantity: quantity,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("cart").upsert(cartItem, {
          onConflict: "buyer_id,product_id,variant_id",
        });

        if (error) throw error;
      }

      await loadCart();
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Failed to add product to cart");
    }
  };

  const updateQuantity = async (productId: string, delta: number) => {
    if (!profile?.id) return;

    const existingItem = cart.find((item) => item.product_id === productId);
    if (!existingItem) return;

    const newQuantity = Math.max(0, existingItem.quantity + delta);

    if (newQuantity === 0) {
      const { error } = await supabase
        .from("cart")
        .delete()
        .eq("buyer_id", profile.id)
        .eq("product_id", productId);

      if (error) {
        console.error("Error removing from cart:", error);
        return;
      }

      setCart(cart.filter((item) => item.product_id !== productId));
    } else {
      const { error } = await supabase
        .from("cart")
        .update({ quantity: newQuantity })
        .eq("buyer_id", profile.id)
        .eq("product_id", productId);

      if (error) {
        console.error("Error updating cart quantity:", error);
        return;
      }

      setCart(
        cart.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: newQuantity }
            : item,
        ),
      );
    }
  };

  const getCartQuantity = (productId: string) => {
    return cart.find((item) => item.product_id === productId)?.quantity || 0;
  };

  const toggleWishlist = async (productId: string) => {
    if (!profile?.id) return;

    if (wishlistItems.has(productId)) {
      await supabase
        .from("wishlist")
        .delete()
        .eq("buyer_id", profile.id)
        .eq("product_id", productId);

      const newWishlist = new Set(wishlistItems);
      newWishlist.delete(productId);
      setWishlistItems(newWishlist);
    } else {
      await supabase.from("wishlist").insert({
        buyer_id: profile.id,
        product_id: productId,
      });

      setWishlistItems(new Set([...wishlistItems, productId]));
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product?.unit_price || 0) * item.quantity,
    0,
  );

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutSuccess = async () => {
    if (!profile?.id) return;

    const { error } = await supabase
      .from("cart")
      .delete()
      .eq("buyer_id", profile.id);

    if (error) {
      console.error("Error clearing cart after checkout:", error);
    }

    setCart([]);
    setShowCheckout(false);
    setShowCart(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading products...</div>
      </div>
    );
  }

  if (selectedProductId) {
    return (
      <ProductDetailPage
        productId={selectedProductId}
        onBack={() => setSelectedProductId(null)}
        onAddToCart={(product, quantity) => {
          addToCart(product, quantity);
        }}
      />
    );
  }

  if (showCheckout) {
    return (
      <CheckoutPage
        cart={cart}
        onBack={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-40 bg-white py-6 -mx-6 px-6 shadows-sm flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Catalog</h1>
          <p className="text-slate-600 mt-1">
            {filteredProducts.length} products available
          </p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          <ShoppingCart className="w-5 h-5" />
          Cart ({cartItemsCount})
          {cartItemsCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
              {cartItemsCount}
            </span>
          )}
        </button>
      </div>

      <div className="sticky top-24 z-30 bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedBrand("all");
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
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={selectedCategory === "all" && filteredBrands.length === 0}
          >
            <option value="all">
              {selectedCategory === "all"
                ? "All Brands"
                : "All Brands in Category"}
            </option>
            {filteredBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No products found
          </h3>
          <p className="text-slate-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const inCart = getCartQuantity(product.id);
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition flex flex-col h-full"
              >
                <div
                  onClick={() => setSelectedProductId(product.id)}
                  className="aspect-square bg-slate-100 overflow-hidden relative group cursor-pointer"
                >
                  <img
                    src={getImageUrl(product.image_url, product.name)}
                    alt={product.name}
                    onError={(e) => handleImageError(e, product.name)}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3">
                    {product.stock_quantity > 0 ? (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition hover:scale-110"
                  >
                    <Heart
                      className={`w-5 h-5 ${wishlistItems.has(product.id) ? "fill-red-500 text-red-500" : "text-slate-600"}`}
                    />
                  </button>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {product.categories?.name}
                    </span>
                    {product.brands?.name && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {product.brands.name}
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => setSelectedProductId(product.id)}
                    className="font-semibold text-slate-900 mb-1 cursor-pointer hover:text-blue-600 transition truncate"
                    title={product.name}
                  >
                    {product.name.length > 50
                      ? `${product.name.substring(0, 50)}...`
                      : product.name}
                  </h3>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {product.discount_price ? (
                        <div className="price-section">
                          <span className="original-price line-through text-slate-500 text-sm">
                            ${product.original_price}
                          </span>
                          <span className="discount-price text-red-600 font-bold text-lg ml-2">
                            ${product.discount_price}
                          </span>
                          <div className="save-badge bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-1">
                            Save $
                            {(
                              product.original_price - product.discount_price
                            ).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="regular-price text-lg font-semibold">
                          ${product.unit_price}
                        </span>
                      )}
                    </span>
                    {product.has_variants && product.variant_count > 0 && (
                      <span className="ml-2 text-xs text-slate-600">
                        +{product.variant_count} variants
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-2">
                    SKU: {product.sku}
                  </p>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">
                    {product.description}
                  </p>

                  <div className="mt-auto">
                    {inCart > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="flex-1 text-center font-semibold text-blue-600">
                          {inCart} in cart
                        </div>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock_quantity === 0}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition font-medium ${
                          product.stock_quantity === 0
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCart && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50"
          onClick={() => setShowCart(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  Shopping Cart
                </h2>
                <p className="text-slate-600 mt-1">{cartItemsCount} items</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex gap-4 p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="w-16 h-16 bg-slate-200 rounded flex-shrink-0 overflow-hidden">
                          <img
                            src={getImageUrl(
                              item.product?.image_url,
                              item.product?.name,
                            )}
                            alt={item.product?.name}
                            onError={(e) =>
                              handleImageError(e, item.product?.name)
                            }
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className="font-medium text-slate-900 truncate"
                            title={item.product?.name}
                          >
                            {item.product?.name && item.product.name.length > 40
                              ? `${item.product.name.substring(0, 40)}...`
                              : item.product?.name}
                          </h3>
                          <p className="text-sm text-slate-600">
                            $
                            {item.product?.unit_price
                              ? item.product.unit_price.toFixed(2)
                              : "0.00"}{" "}
                            each
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.product_id, -1)
                              }
                              className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-100 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-slate-300 rounded hover:bg-slate-100 transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            $
                            {(
                              (item.product?.unit_price || 0) * item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-slate-900">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-slate-900">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowCart(false);
                      setShowCheckout(true);
                    }}
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
