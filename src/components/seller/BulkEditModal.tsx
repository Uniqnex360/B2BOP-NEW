import { useState, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface BulkEditModalProps {
  productIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEditModal({ productIds, onClose, onSuccess }: BulkEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [editType, setEditType] = useState<'visibility' | 'pricing'>('visibility');
  const [visibility, setVisibility] = useState(true);
  const [priceAdjustment, setPriceAdjustment] = useState({ type: 'percentage', value: 0 });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editType === 'visibility') {
        const { error } = await supabase
          .from('products')
          .update({ is_visible: visibility, updated_at: new Date().toISOString() })
          .in('id', productIds);

        if (error) throw error;
      } else if (editType === 'pricing') {
        for (const id of productIds) {
          const { data: product } = await supabase.from('products').select('unit_price').eq('id', id).single();

          if (product) {
            let newPrice = parseFloat(product.unit_price);

            if (priceAdjustment.type === 'percentage') {
              newPrice = newPrice * (1 + priceAdjustment.value / 100);
            } else {
              newPrice = newPrice + priceAdjustment.value;
            }

            await supabase
              .from('products')
              .update({ unit_price: newPrice.toFixed(2), updated_at: new Date().toISOString() })
              .eq('id', id);
          }
        }
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-600/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Bulk Edit Products</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <p className="text-sm text-slate-600">Editing {productIds.length} products</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Edit Type</label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="visibility">Visibility</option>
              <option value="pricing">Pricing Adjustment</option>
            </select>
          </div>

          {editType === 'visibility' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Visibility</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility}
                    onChange={() => setVisibility(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Visible to buyers</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!visibility}
                    onChange={() => setVisibility(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Hidden from buyers</span>
                </label>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adjustment Type
                </label>
                <select
                  value={priceAdjustment.type}
                  onChange={(e) =>
                    setPriceAdjustment({ ...priceAdjustment, type: e.target.value as any })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {priceAdjustment.type === 'percentage' ? 'Percentage' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={priceAdjustment.value}
                  onChange={(e) =>
                    setPriceAdjustment({ ...priceAdjustment, value: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={priceAdjustment.type === 'percentage' ? '10' : '5.00'}
                />
                <p className="text-xs text-slate-600 mt-1">
                  {priceAdjustment.type === 'percentage'
                    ? 'Use negative values to decrease (e.g., -10 for 10% off)'
                    : 'Use negative values to decrease prices'}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Apply Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
