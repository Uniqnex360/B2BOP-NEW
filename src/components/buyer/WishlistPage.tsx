import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';

export default function WishlistPage() {
  const { profile } = useAuth();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, [profile]);

  const loadWishlist = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('wishlist')
      .select('*, products(*, categories(name))')
      .eq('buyer_id', profile.id)
      .order('created_at', { ascending: false });

    setWishlist(data || []);
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id);
    loadWishlist();
  };

  const handleAddToCart = async (product: any) => {
    alert(`Added ${product.name} to cart!`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading wishlist...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Wishlist</h1>
        <p className="text-slate-600 mt-1">Products you want to buy later</p>
      </div>

      {wishlist.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Your wishlist is empty</h3>
          <p className="text-slate-600">Start adding products you love!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition group"
            >
              <div className="aspect-square bg-slate-100 overflow-hidden relative">
                {item.products.image_url ? (
                  <img
                    src={item.products.image_url}
                    alt={item.products.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-300" />
                  </div>
                )}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <span className="text-xs text-slate-500">{item.products.categories?.name}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{item.products.name}</h3>
                <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                  {item.products.description}
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-slate-900">
                    ${item.products.unit_price.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-500">per unit</span>
                </div>
                <button
                  onClick={() => handleAddToCart(item.products)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
