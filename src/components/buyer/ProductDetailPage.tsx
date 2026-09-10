import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Heart, Plus, Minus, CheckCircle } from "lucide-react";
import { getImageUrl, handleImageError } from "../../utils/imageHelper";

// import ShoppingCart, { CartButton, CartItem } from "./ShoppingCart";
import ShoppingCart from "./ShopingCart";
import { CartButton, CartItem } from "./ShopingCart";

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onAddToCart?: (product: any, quantity: number) => void;
}

// Internal (raw) cart line — kept close to the original product/variant shape.
interface RawCartItem {
  cartId: string;
  product_id: string;
  name: string;
  image_url?: string;
  unit_price: number;
  discount_price?: number;
  stock_quantity: number;
  variant_1_name?: string;
  variant_1_value?: string;
  variant_2_name?: string;
  variant_2_value?: string;
  quantity: number;
}

export default function ProductDetailPage({
  productId,
  onBack,
  onAddToCart,
}: ProductDetailPageProps) {
  const { profile } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);

  // Cart
  const [cart, setCart] = useState<RawCartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  /*
   * Keep quantity valid whenever the selected variant/product changes.
   */
  useEffect(() => {
    if (!product) return;

    const minQuantity = getMinOrderQuantity();
    const maxQuantity = getMaxOrderQuantity();

    // No stock
    if (maxQuantity <= 0) {
      setQuantity(0);
      return;
    }

    // If stock is less than minimum order quantity,
    // the customer cannot place an order.
    if (maxQuantity < minQuantity) {
      setQuantity(0);
      return;
    }

    setQuantity((currentQuantity) => {
      const current =
        Number(currentQuantity) > 0 ? Number(currentQuantity) : minQuantity;

      return Math.min(Math.max(current, minQuantity), maxQuantity);
    });
  }, [selectedVariant, product]);

  /*
   * Refresh stock periodically so the displayed quantity
   * stays reasonably current while the customer is on the page.
   *
   * IMPORTANT:
   * This only reads stock.
   * It does NOT reduce stock.
   */
  useEffect(() => {
    if (!productId) return;

    const refreshStock = async () => {
      try {
        if (selectedVariant?.id) {
          const { data, error } = await supabase
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", selectedVariant.id)
            .eq("product_id", productId)
            .maybeSingle();

          if (error) {
            console.error("Failed to refresh variant stock:", error);
            return;
          }

          if (data) {
            setSelectedVariant((prev: any) =>
              prev
                ? {
                    ...prev,
                    stock_quantity: Number(data.stock_quantity) || 0,
                  }
                : prev,
            );

            setVariants((prev) =>
              prev.map((variant) =>
                variant.id === selectedVariant.id
                  ? {
                      ...variant,
                      stock_quantity: Number(data.stock_quantity) || 0,
                    }
                  : variant,
              ),
            );
          }
        } else {
          const { data, error } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", productId)
            .maybeSingle();

          if (error) {
            console.error("Failed to refresh product stock:", error);
            return;
          }

          if (data) {
            setProduct((prev: any) =>
              prev
                ? {
                    ...prev,
                    stock_quantity: Number(data.stock_quantity) || 0,
                  }
                : prev,
            );
          }
        }
      } catch (error) {
        console.error("Stock refresh error:", error);
      }
    };

    // Refresh every 10 seconds.
    const interval = setInterval(refreshStock, 10000);

    return () => clearInterval(interval);
  }, [productId, selectedVariant?.id]);

  const loadProduct = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const [productRes, variantsRes, wishlistRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, categories(name), brands(name)")
        .eq("id", productId)
        .maybeSingle(),

      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("unit_price", { ascending: true }),

      supabase
        .from("wishlist")
        .select("id")
        .eq("buyer_id", profile.id)
        .eq("product_id", productId)
        .maybeSingle(),
    ]);

    if (productRes.error) {
      console.error("Failed to load product:", productRes.error);
    }

    if (variantsRes.error) {
      console.error("Failed to load variants:", variantsRes.error);
    }

    setProduct(productRes.data);
    setVariants(variantsRes.data || []);

    if (variantsRes.data && variantsRes.data.length > 0) {
      setSelectedVariant(variantsRes.data[0]);
    } else if (productRes.data) {
      const minQuantity = Number(productRes.data.min_order_quantity) || 1;

      const stockQuantity = Number(productRes.data.stock_quantity) || 0;

      if (stockQuantity >= minQuantity) {
        setQuantity(minQuantity);
      } else {
        setQuantity(0);
      }
    }

    setInWishlist(!!wishlistRes.data);
    setLoading(false);
  };

  const toggleWishlist = async () => {
    if (!profile?.id || !product) return;

    if (inWishlist) {
      await supabase
        .from("wishlist")
        .delete()
        .eq("buyer_id", profile.id)
        .eq("product_id", product.id);

      setInWishlist(false);
    } else {
      await supabase.from("wishlist").insert({
        buyer_id: profile.id,
        product_id: product.id,
      });

      setInWishlist(true);
    }
  };

  const getCurrentPrice = () => {
    const basePrice = selectedVariant
      ? selectedVariant.unit_price
      : product?.unit_price;

    const discountPrice = selectedVariant
      ? selectedVariant.discount_price
      : product?.discount_price;

    return discountPrice || basePrice || 0;
  };

  /*
   * Current available stock.
   *
   * Variant products use the selected variant's stock.
   * Non-variant products use the product's stock.
   */
  const getCurrentStock = () => {
    const stock = selectedVariant
      ? selectedVariant.stock_quantity
      : product?.stock_quantity;

    const parsedStock = Number(stock);

    return Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : 0;
  };

  /*
   * Minimum order quantity.
   *
   * Invalid/null/zero values fall back to 1.
   */
  const getMinOrderQuantity = () => {
    const minQuantity = Number(product?.min_order_quantity);

    return Number.isFinite(minQuantity) && minQuantity > 0
      ? Math.floor(minQuantity)
      : 1;
  };

  /*
   * Maximum order quantity.
   *
   * If max_order_quantity is configured, use it.
   * Otherwise stock becomes the maximum.
   *
   * Stock is ALWAYS the final upper limit.
   */
  const getMaxOrderQuantity = () => {
    const stock = getCurrentStock();
    const maxQuantity = Number(product?.max_order_quantity);

    if (stock <= 0) return 0;

    if (Number.isFinite(maxQuantity) && maxQuantity > 0) {
      return Math.min(Math.floor(maxQuantity), stock);
    }

    return stock;
  };

  const getCartItemCount = () =>
    cart.reduce((total, item) => total + item.quantity, 0);

  const handleAddToCart = () => {
    if (!product) return;

    const currentStock = getCurrentStock();
    const minQuantity = getMinOrderQuantity();
    const maxQuantity = getMaxOrderQuantity();

    /*
     * No stock.
     */
    if (currentStock <= 0) {
      alert("This product is currently out of stock.");
      return;
    }

    /*
     * Stock is lower than the required minimum order quantity.
     */
    if (currentStock < minQuantity) {
      alert(
        `Only ${currentStock} unit${
          currentStock === 1 ? "" : "s"
        } available. The minimum order quantity is ${minQuantity}.`,
      );
      return;
    }

    /*
     * Safety check for quantity.
     */
    if (quantity < minQuantity) {
      alert(`Minimum order quantity is ${minQuantity}.`);
      setQuantity(minQuantity);
      return;
    }

    /*
     * Safety check for maximum.
     */
    if (quantity > maxQuantity) {
      alert(`Maximum order quantity is ${maxQuantity}.`);
      setQuantity(maxQuantity);
      return;
    }

    const itemToAdd = selectedVariant
      ? {
          ...product,
          ...selectedVariant,
          id: product.id,
          variant_id: selectedVariant.id,
          unit_price: selectedVariant.unit_price,
          discount_price: selectedVariant.discount_price,
        }
      : product;

    const cartId = selectedVariant
      ? `${product.id}-${selectedVariant.id}`
      : product.id;

    setCart((prev) => {
      const existingItem = prev.find((item) => item.cartId === cartId);

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        /*
         * Do not allow the cart quantity to exceed:
         * 1. available stock
         * 2. configured maximum order quantity
         */
        const finalQuantity = Math.min(newQuantity, maxQuantity);

        if (finalQuantity === existingItem.quantity) {
          alert(`Maximum available quantity for this order is ${maxQuantity}.`);

          return prev;
        }

        return prev.map((item) =>
          item.cartId === cartId
            ? {
                ...item,
                quantity: finalQuantity,
              }
            : item,
        );
      }

      return [
        ...prev,
        {
          cartId,
          product_id: product.id,
          name: product.name,
          image_url: product.image_url,
          unit_price: itemToAdd.unit_price,
          discount_price: itemToAdd.discount_price,
          stock_quantity: currentStock,
          variant_1_name: selectedVariant?.variant_1_name,
          variant_1_value: selectedVariant?.variant_1_value,
          variant_2_name: selectedVariant?.variant_2_name,
          variant_2_value: selectedVariant?.variant_2_value,
          quantity,
        },
      ];
    });

    if (onAddToCart) {
      onAddToCart(itemToAdd, quantity);
    }

    setShowSuccess(true);
    // setShowCart(true);
  };

  const updateCart = (cartId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId !== cartId) return item;

          const minQuantity = getMinOrderQuantity();
          const maxQuantity = getMaxOrderQuantity();

          const newQuantity = item.quantity + change;

          /*
           * Removing items from the cart is still allowed.
           */
          if (newQuantity <= 0) {
            return {
              ...item,
              quantity: 0,
            };
          }

          /*
           * Never allow quantity above available stock
           * or configured maximum order quantity.
           */
          if (newQuantity > maxQuantity) {
            return {
              ...item,
              quantity: maxQuantity,
            };
          }

          /*
           * Never allow an existing cart line to sit
           * between 1 and min_order_quantity.
           *
           * If the user decreases below minimum,
           * remove the item from cart.
           */
          if (newQuantity < minQuantity) {
            return {
              ...item,
              quantity: 0,
            };
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const handleCheckout = () => {
    alert("Checkout functionality");
  };

  // Map our raw cart lines into the shared component's normalized CartItem shape.
  const cartItems: CartItem[] = cart.map((item) => {
    const variantLabel =
      item.variant_1_name || item.variant_2_name
        ? [
            item.variant_1_name &&
              `${item.variant_1_name}: ${item.variant_1_value}`,
            item.variant_2_name &&
              `${item.variant_2_name}: ${item.variant_2_value}`,
          ]
            .filter(Boolean)
            .join(" ")
        : undefined;

    return {
      cartId: item.cartId,
      productId: item.product_id,
      name: item.name,
      imageUrl: item.image_url,
      price: Number(item.discount_price) || Number(item.unit_price) || 0,
      quantity: item.quantity,
      stock: Number(item.stock_quantity) || 0,
      variantLabel,
    };
  });

  const parseFeatures = () => {
    if (!product?.features) return [];

    if (Array.isArray(product.features)) {
      return product.features.filter(
        (feature: any) =>
          feature !== null &&
          feature !== undefined &&
          String(feature).trim() !== "",
      );
    }

    return String(product.features)
      .split(/\r\n|\n/)
      .filter((feature: string) => feature.trim() !== "");
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

  const currentStock = getCurrentStock();
  const minOrderQuantity = getMinOrderQuantity();
  const maxOrderQuantity = getMaxOrderQuantity();

  const cannotMeetMinimum = currentStock > 0 && currentStock < minOrderQuantity;

  const isOutOfStock = currentStock <= 0;

  const canOrder =
    !isOutOfStock && !cannotMeetMinimum && maxOrderQuantity >= minOrderQuantity;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-3xl font-bold text-slate-900">Product Details</h1>
        </div>

        <CartButton
          itemCount={getCartItemCount()}
          onClick={() => setShowCart(true)}
        />
      </div>

      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5" />

          <span>
            Added to cart! ({quantity} item
            {quantity > 1 ? "s" : ""})
          </span>
        </div>
      )}

      <ShoppingCart
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        items={cartItems}
        onUpdateQuantity={updateCart}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />

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
                className={`w-6 h-6 ${
                  inWishlist ? "fill-red-500 text-red-500" : "text-slate-600"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-4">
            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-3">
                {product.categories?.name || "Uncategorized"}
              </span>

              {product.brands?.name && (
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full mb-3 ml-2">
                  {product.brands.name}
                </span>
              )}

              <h2 className="text-3xl font-bold text-slate-900">
                {product.name}
              </h2>

              <p className="text-sm text-slate-500 mt-2">SKU: {product.sku}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-baseline gap-3">
                {product.discount_price ||
                (selectedVariant && selectedVariant.discount_price) ? (
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-red-600">
                      $
                      {(
                        selectedVariant?.discount_price ||
                        product.discount_price
                      )?.toFixed(2)}
                    </span>

                    <span className="text-2xl text-slate-500 line-through">
                      $
                      {(
                        selectedVariant?.original_price ||
                        product.original_price ||
                        getCurrentPrice()
                      )?.toFixed(2)}
                    </span>

                    <span className="text-lg text-slate-500">per unit</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-blue-600">
                      ${getCurrentPrice()?.toFixed(2)}
                    </span>

                    <span className="text-lg text-slate-500">per unit</span>
                  </div>
                )}
              </div>
            </div>

            {/* CURRENT STOCK */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Availability</h3>

                {isOutOfStock ? (
                  <span className="text-sm font-semibold text-red-600">
                    Out of Stock
                  </span>
                ) : cannotMeetMinimum ? (
                  <span className="text-sm font-semibold text-red-600">
                    Not enough stock for minimum order
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-green-600">
                    {currentStock} unit
                    {currentStock !== 1 ? "s" : ""} available
                  </span>
                )}
              </div>

              {!isOutOfStock && !cannotMeetMinimum && (
                <p className="text-sm text-slate-500 mt-1">
                  Minimum order:{" "}
                  <span className="font-medium text-slate-700">
                    {minOrderQuantity}
                  </span>
                  {" • "}
                  Maximum order:{" "}
                  <span className="font-medium text-slate-700">
                    {maxOrderQuantity}
                  </span>
                </p>
              )}

              {cannotMeetMinimum && (
                <p className="text-sm text-slate-500 mt-1">
                  Only {currentStock} unit
                  {currentStock !== 1 ? "s" : ""} remaining, but the minimum
                  order quantity is {minOrderQuantity}.
                </p>
              )}
            </div>

            {variants.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Select Variant
                </h3>

                <div className="space-y-2">
                  {variants.map((variant) => {
                    const variantStock = Number(variant.stock_quantity) || 0;

                    const variantMin = Number(product.min_order_quantity) || 1;

                    const variantMaxConfigured = Number(
                      product.max_order_quantity,
                    );

                    const variantMax =
                      variantStock <= 0
                        ? 0
                        : variantMaxConfigured > 0
                          ? Math.min(
                              Math.floor(variantMaxConfigured),
                              variantStock,
                            )
                          : variantStock;

                    const isAvailable =
                      variantStock >= variantMin && variantMax >= variantMin;

                    return (
                      <div
                        key={variant.id}
                        onClick={() =>
                          isAvailable && setSelectedVariant(variant)
                        }
                        className={`p-4 border-2 rounded-lg transition ${
                          selectedVariant?.id === variant.id
                            ? "border-blue-600 bg-blue-50 cursor-pointer"
                            : isAvailable
                              ? "border-slate-200 hover:border-slate-300 cursor-pointer"
                              : "border-slate-200 bg-slate-50 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {[1, 2, 3, 4, 5].map((n) => {
                                  const nameKey = `variant_${n}_name`;
                                  const valueKey = `variant_${n}_value`;

                                  if (!variant[nameKey]) return null;

                                  return (
                                    <div
                                      key={n}
                                      className="inline-flex items-baseline gap-1.5 bg-slate-100 px-3 py-1.5 rounded-md"
                                    >
                                      <span className="text-sm font-semibold text-slate-700 uppercase">
                                        {variant[nameKey]}:
                                      </span>

                                      <span className="text-base font-bold text-slate-900">
                                        {variant[valueKey]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {variant.sku && (
                                <div>
                                  <span className="text-xs text-slate-500">
                                    SKU:{" "}
                                  </span>

                                  <span className="text-sm font-medium text-slate-700">
                                    {variant.sku}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0">
                              {variant.discount_price ||
                              product.discount_price ? (
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-red-600">
                                    $
                                    {(
                                      variant.discount_price ||
                                      product.discount_price
                                    )?.toFixed(2)}
                                  </p>

                                  <p className="text-sm text-slate-500 line-through">
                                    $
                                    {(
                                      variant.original_price ||
                                      product.original_price ||
                                      variant.unit_price ||
                                      product.unit_price
                                    )?.toFixed(2)}
                                  </p>

                                  <p
                                    className={`text-sm font-semibold mt-1 ${
                                      isAvailable
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {isAvailable
                                      ? `${variantStock} available`
                                      : variantStock <= 0
                                        ? "Out of Stock"
                                        : `Only ${variantStock} available`}
                                  </p>

                                  <div className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded mt-1">
                                    SALE
                                  </div>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-blue-600">
                                    ${variant.unit_price?.toFixed(2)}
                                  </p>

                                  <p
                                    className={`text-sm font-semibold mt-1 ${
                                      isAvailable
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {isAvailable
                                      ? `${variantStock} available`
                                      : variantStock <= 0
                                        ? "Out of Stock"
                                        : `Only ${variantStock} available`}
                                  </p>
                                </div>
                              )}
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
              <h3 className="font-semibold text-slate-900 mb-3">Quantity</h3>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg p-1">
                  <button
                    onClick={() =>
                      setQuantity((current) => {
                        const minQuantity = getMinOrderQuantity();

                        return Math.max(minQuantity, current - 1);
                      })
                    }
                    disabled={!canOrder || quantity <= minOrderQuantity}
                    className="p-2 hover:bg-slate-100 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="px-6 py-2 font-semibold text-slate-900">
                    {quantity > 0 ? quantity : 0}
                  </span>

                  <button
                    onClick={() =>
                      setQuantity((current) => {
                        const maxQuantity = getMaxOrderQuantity();

                        return Math.min(
                          maxQuantity,
                          Math.max(getMinOrderQuantity(), current) + 1,
                        );
                      })
                    }
                    disabled={!canOrder || quantity >= maxOrderQuantity}
                    className="p-2 hover:bg-slate-100 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-sm text-slate-600">
                  Total:{" "}
                  <span className="font-semibold text-slate-900">
                    $
                    {(
                      getCurrentPrice() * (quantity > 0 ? quantity : 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {!isOutOfStock && !cannotMeetMinimum && (
                <p className="text-xs text-slate-500 mt-2">
                  Order between{" "}
                  <span className="font-semibold">{minOrderQuantity}</span> and{" "}
                  <span className="font-semibold">{maxOrderQuantity}</span>{" "}
                  units.
                </p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={!canOrder}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition text-lg font-semibold ${
                  !canOrder
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isOutOfStock
                  ? "Out of Stock"
                  : cannotMeetMinimum
                    ? `Only ${currentStock} Available`
                    : "Add to Cart"}
              </button>

              <button
                onClick={onBack}
                className="w-full mt-3 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
              >
                Continue Shopping
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="font-semibold text-slate-900 mb-2">Description</h3>

            <p className="text-slate-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          {featuresList.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                Features & Specifications
              </h3>

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
        </div>
      </div>
    </div>
  );
}
