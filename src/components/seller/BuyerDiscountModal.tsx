import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Plus, Trash2 } from 'lucide-react';

interface BuyerDiscountModalProps {
  buyer: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BuyerDiscountModal({ buyer, onClose, onSuccess }: BuyerDiscountModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [newDiscount, setNewDiscount] = useState({
    type: 'category',
    targetId: '',
    percentage: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [discData, catData, brandData] = await Promise.all([
      supabase.from('buyer_discounts').select('*, categories(name), brands(name)').eq('buyer_id', buyer.id),
      supabase.from('categories').select('*').eq('seller_id', profile!.id),
      supabase.from('brands').select('*').eq('seller_id', profile!.id),
    ]);

    setDiscounts(discData.data || []);
    setCategories(catData.data || []);
    setBrands(brandData.data || []);
  };

  const handleAddDiscount = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: any = {
        buyer_id: buyer.id,
        seller_id: profile!.id,
        discount_type: newDiscount.type,
        discount_percentage: parseFloat(newDiscount.percentage),
        is_active: true,
      };

      if (newDiscount.type === 'category') {
        data.category_id = newDiscount.targetId;
      } else if (newDiscount.type === 'brand') {
        data.brand_id = newDiscount.targetId;
      }

      const { error } = await supabase.from('buyer_discounts').insert(data);
      if (error) throw error;

      setNewDiscount({ type: 'category', targetId: '', percentage: '' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    try {
      const { error } = await supabase.from('buyer_discounts').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-600/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Buyer Discounts</h2>
            <p className="text-sm text-slate-600 mt-1">
              {buyer.first_name} {buyer.last_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-medium text-slate-900 mb-4">Existing Discounts</h3>
            {discounts.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">No discounts set</p>
            ) : (
              <div className="space-y-2">
                {discounts.map((disc) => (
                  <div
                    key={disc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {disc.discount_percentage}% off
                      </p>
                      <p className="text-sm text-slate-600">
                        {disc.discount_type === 'category' && disc.categories?.name}
                        {disc.discount_type === 'brand' && disc.brands?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteDiscount(disc.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-medium text-slate-900 mb-4">Add New Discount</h3>
            <form onSubmit={handleAddDiscount} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={newDiscount.type}
                    onChange={(e) =>
                      setNewDiscount({ ...newDiscount, type: e.target.value, targetId: '' })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="category">Category</option>
                    <option value="brand">Brand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {newDiscount.type === 'category' ? 'Category' : 'Brand'}
                  </label>
                  <select
                    required
                    value={newDiscount.targetId}
                    onChange={(e) => setNewDiscount({ ...newDiscount, targetId: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {(newDiscount.type === 'category' ? categories : brands).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Discount %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newDiscount.percentage}
                    onChange={(e) => setNewDiscount({ ...newDiscount, percentage: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Discount
              </button>
            </form>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={onSuccess}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
