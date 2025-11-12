import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface PromotionModalProps {
  promotion?: any;
  onClose: () => void;
  onSuccess: (createdPromotion?: any) => void;
}

export default function PromotionModal({ promotion, onClose, onSuccess }: PromotionModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: promotion?.name || '',
    description: promotion?.description || '',
    applies_to: promotion?.applies_to || 'all',
    target_type: promotion?.category_id ? 'category' : promotion?.brand_id ? 'brand' : promotion?.product_id ? 'product' : 'category',
    target_id: promotion?.category_id || promotion?.brand_id || promotion?.product_id || '',
    promotion_type: promotion?.promotion_type || 'percentage',
    discount_value: promotion?.discount_value || '',
    start_date: promotion?.start_date ? promotion.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
    end_date: promotion?.end_date ? promotion.end_date.split('T')[0] : '',
    is_active: promotion?.is_active ?? true,
  });

  // Track if this is an edit operation
  const isEdit = !!promotion;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [catRes, brandRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').eq('seller_id', profile!.id).eq('is_active', true),
      supabase.from('brands').select('*').eq('seller_id', profile!.id).eq('is_active', true),
      supabase.from('products').select('id, name, sku').eq('seller_id', profile!.id).eq('is_active', true),
    ]);

    setCategories(catRes.data || []);
    setBrands(brandRes.data || []);
    setProducts(prodRes.data || []);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: any = {
        seller_id: profile!.id,
        name: formData.name,
        description: formData.description || null,
        applies_to: formData.applies_to,
        promotion_type: formData.promotion_type,
        discount_value: parseFloat(formData.discount_value),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        is_active: formData.is_active,
        category_id: null,
        brand_id: null,
        product_id: null,
        coupon_code: null,
      };

      if (formData.applies_to === 'specific' && formData.target_id) {
        if (formData.target_type === 'category') {
          data.category_id = formData.target_id;
        } else if (formData.target_type === 'brand') {
          data.brand_id = formData.target_id;
        } else if (formData.target_type === 'product') {
          data.product_id = formData.target_id;
        }
      }

      let result;
      if (promotion) {
        // For edits, first remove the promotion from existing products
        await removePromotionFromProducts(promotion.id);
        
        const { data: updateData, error } = await supabase
          .from('promotions')
          .update(data)
          .eq('id', promotion.id)
          .select();
        if (error) throw error;
        result = updateData?.[0];
        
        // If the promotion is active after edit, apply it to products
        if (result.is_active) {
          await applyPromotionToProducts(result);
        }
      } else {
        const { data: insertData, error } = await supabase
          .from('promotions')
          .insert(data)
          .select();
        if (error) throw error;
        result = insertData?.[0];
        
        // If the promotion is active, apply it to products
        if (result.is_active) {
          await applyPromotionToProducts(result);
        }
      }

      // Pass the created/updated promotion to onSuccess
      onSuccess(result);
    } catch (err: any) {
      alert(err.message || 'Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  // Function to apply promotion to products
  const applyPromotionToProducts = async (promotionData: any) => {
    try {
      // First, get all applicable products
      let query = supabase
        .from('products')
        .select('*')
        .eq('seller_id', profile!.id);

      // Apply filters based on promotion type
      if (promotionData.applies_to === 'specific') {
        if (promotionData.category_id) {
          query = query.eq('category_id', promotionData.category_id);
        } else if (promotionData.brand_id) {
          query = query.eq('brand_id', promotionData.brand_id);
        } else if (promotionData.product_id) {
          query = query.eq('id', promotionData.product_id);
        }
      }

      const { data: applicableProducts, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!applicableProducts || applicableProducts.length === 0) {
        console.log('No products found to apply promotion to');
        return;
      }

      // Update each product with the calculated discount
      for (const product of applicableProducts) {
        const updateData: any = {
          promotion_id: promotionData.id,
          original_price: product.original_price || product.unit_price
        };

        // Calculate discount price
        if (promotionData.promotion_type === 'percentage') {
          updateData.discount_price = Number((product.unit_price * (1 - promotionData.discount_value / 100)).toFixed(2));
        } else {
          updateData.discount_price = Number(Math.max(0, product.unit_price - promotionData.discount_value).toFixed(2));
        }

        await supabase
          .from('products')
          .update(updateData)
          .eq('id', product.id);
      }

      console.log(`Promotion applied to ${applicableProducts.length} products successfully`);
    } catch (error) {
      console.error('Error applying promotion to products:', error);
      throw error;
    }
  };

  // Function to remove promotion from products
  const removePromotionFromProducts = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          promotion_id: null,
          discount_price: null
        })
        .eq('promotion_id', promotionId);

      if (error) throw error;
      
      console.log('Promotion removed from products');
    } catch (error) {
      console.error('Error removing promotion from products:', error);
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-600/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {promotion ? 'Edit Promotion' : 'Create Promotion'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Promotion Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Summer Sale"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe this promotion..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Applies To <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value, target_id: '' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Products</option>
                <option value="specific">Specific Items</option>
              </select>
            </div>

            {formData.applies_to === 'specific' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.target_type}
                  onChange={(e) => setFormData({ ...formData, target_type: e.target.value, target_id: '' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="category">Category</option>
                  <option value="brand">Brand</option>
                  <option value="product">Product</option>
                </select>
              </div>
            )}
          </div>

          {formData.applies_to === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select {formData.target_type.charAt(0).toUpperCase() + formData.target_type.slice(1)} <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                {formData.target_type === 'category' && categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                {formData.target_type === 'brand' && brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
                {formData.target_type === 'product' && products.map((prod) => (
                  <option key={prod.id} value={prod.id}>{prod.name} ({prod.sku})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.promotion_type}
                onChange={(e) => setFormData({ ...formData, promotion_type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Fixed Amount ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={formData.promotion_type === 'percentage' ? '10' : '50'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active (buyers will see this promotion)
            </label>
          </div>


          <div className="flex gap-3 pt-4 border-t border-slate-200">
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
              {loading ? 'Saving...' : promotion ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}