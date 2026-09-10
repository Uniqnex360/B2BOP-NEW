import {
  ShoppingCart as ShoppingCartIcon,
  Plus,
  Minus,
  Trash2,
  X,
} from "lucide-react";
import { getImageUrl, handleImageError } from "../../utils/imageHelper";

// Normalized shape both pages convert their cart data into.
export interface CartItem {
  cartId: string; // unique key for this cart line (product id, or product+variant id)
  productId: string;
  name: string;
  imageUrl?: string;
  price: number; // unit price already accounting for discount
  quantity: number;
  stock: number; // available stock, used to cap the "+" button
  variantLabel?: string; // optional e.g. "Size: L, Color: Red"
}

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartId: string, change: number) => void;
  onRemove: (cartId: string) => void;
  onCheckout: () => void;
}

export default function ShoppingCart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: ShoppingCartProps) {
  if (!isOpen) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Shopping Cart</h2>

            <p className="text-sm text-slate-500 mt-1">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCartIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.cartId}
                  className="border border-slate-200 rounded-lg p-3"
                >
                  <div className="flex gap-3">
                    <img
                      src={getImageUrl(item.imageUrl, item.name)}
                      alt={item.name}
                      onError={(e) => handleImageError(e, item.name)}
                      className="w-20 h-20 object-cover rounded-lg bg-slate-100"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 line-clamp-2">
                          {item.name}
                        </h3>

                        <button
                          onClick={() => onRemove(item.cartId)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.variantLabel && (
                        <div className="text-xs text-slate-500 mt-1">
                          {item.variantLabel}
                        </div>
                      )}

                      <p className="font-semibold text-slate-900 mt-2">
                        ${item.price.toFixed(2)}
                      </p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-1">
                          <button
                            onClick={() => onUpdateQuantity(item.cartId, -1)}
                            className="p-1 hover:bg-slate-100 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="px-3 text-sm font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => onUpdateQuantity(item.cartId, 1)}
                            disabled={item.quantity >= item.stock}
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-semibold text-slate-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-slate-900">
                Total
              </span>
              <span className="text-2xl font-bold text-blue-600">
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onCheckout}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Checkout
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Convenience helper for the little cart badge/button used on both pages.
export function CartButton({
  itemCount,
  onClick,
}: {
  itemCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
    >
      <ShoppingCartIcon className="w-5 h-5" />
      Cart
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
          {itemCount}
        </span>
      )}
    </button>
  );
}
