import { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Plus, Trash2 } from 'lucide-react';

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

  // New state for multiple selections
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(['category']); // Default to category

  // Track if this is an edit operation
  const isEdit = !!promotion;

  useEffect(() => {
    loadData();
    // Initialize from existing promotion if editing
    if (promotion) {
      initializeFromPromotion();
    }
  }, []);

  const initializeFromPromotion = () => {
    if (promotion.category_id) {
      setSelectedCategories([promotion.category_id]);
      setSelectedConditions(['category']);
    }
    if (promotion.brand_id) {
      setSelectedBrands([promotion.brand_id]);
      setSelectedConditions(['brand']);
    }
    if (promotion.product_id) {
      setSelectedProducts([promotion.product_id]);
      setSelectedConditions(['product']);
    }
  };

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

  const handleConditionToggle = (condition: string) => {
    setSelectedConditions(prev => {
      if (prev.includes(condition)) {
        return prev.filter(c => c !== condition);
      } else {
        return [...prev, condition];
      }
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands(prev => {
      if (prev.includes(brandId)) {
        return prev.filter(id => id !== brandId);
      } else {
        return [...prev, brandId];
      }
    });
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
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
        category_ids: selectedCategories.length > 0 ? selectedCategories : null,
        brand_ids: selectedBrands.length > 0 ? selectedBrands : null,
        product_ids: selectedProducts.length > 0 ? selectedProducts : null,
        coupon_code: null,
      };

      // For backward compatibility, set single IDs if only one is selected
      if (selectedCategories.length === 1) {
        data.category_id = selectedCategories[0];
      }
      if (selectedBrands.length === 1) {
        data.brand_id = selectedBrands[0];
      }
      if (selectedProducts.length === 1) {
        data.product_id = selectedProducts[0];
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

      // Apply filters based on promotion type and multiple conditions
      const conditions = [];
      
      if (promotionData.category_ids && promotionData.category_ids.length > 0) {
        conditions.push(`category_id.in.(${promotionData.category_ids.join(',')})`);
      }
      
      if (promotionData.brand_ids && promotionData.brand_ids.length > 0) {
        conditions.push(`brand_id.in.(${promotionData.brand_ids.join(',')})`);
      }
      
      if (promotionData.product_ids && promotionData.product_ids.length > 0) {
        conditions.push(`id.in.(${promotionData.product_ids.join(',')})`);
      }

      // If we have multiple conditions, use OR logic (products that match any condition)
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
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

  const getSelectedCategoryNames = () => {
    return selectedCategories.map(id => 
      categories.find(cat => cat.id === id)?.name
    ).filter(Boolean);
  };

  const getSelectedBrandNames = () => {
    return selectedBrands.map(id => 
      brands.find(brand => brand.id === id)?.name
    ).filter(Boolean);
  };

  const getSelectedProductNames = () => {
    return selectedProducts.map(id => 
      products.find(prod => prod.id === id)?.name
    ).filter(Boolean);
  };

  return (
    <div className="fixed inset-0 bg-blue-600/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Products</option>
                <option value="specific">Specific Items</option>
              </select>
            </div>
          </div>

          {formData.applies_to === 'specific' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Apply Conditions (Select one or more)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['category', 'brand', 'product'].map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => handleConditionToggle(condition)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        selectedConditions.includes(condition)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-500'
                      }`}
                    >
                      {condition.charAt(0).toUpperCase() + condition.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories Selection */}
              {selectedConditions.includes('category') && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Select Categories (Multiple)
                    </label>
                    <span className="text-xs text-slate-500">
                      {selectedCategories.length} selected
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 ${
                          selectedCategories.includes(category.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleCategoryToggle(category.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{category.name}</span>
                      </div>
                    ))}
                  </div>
                  {selectedCategories.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Selected categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {getSelectedCategoryNames().map((name, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => handleCategoryToggle(selectedCategories[index])}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Brands Selection */}
              {selectedConditions.includes('brand') && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Select Brands (Multiple)
                    </label>
                    <span className="text-xs text-slate-500">
                      {selectedBrands.length} selected
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                    {brands.map((brand) => (
                      <div
                        key={brand.id}
                        className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 ${
                          selectedBrands.includes(brand.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleBrandToggle(brand.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand.id)}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{brand.name}</span>
                      </div>
                    ))}
                  </div>
                  {selectedBrands.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Selected brands:</p>
                      <div className="flex flex-wrap gap-2">
                        {getSelectedBrandNames().map((name, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => handleBrandToggle(selectedBrands[index])}
                              className="hover:text-green-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Products Selection */}
              {selectedConditions.includes('product') && (
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Select Products (Multiple)
                    </label>
                    <span className="text-xs text-slate-500">
                      {selectedProducts.length} selected
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 ${
                          selectedProducts.includes(product.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleProductToggle(product.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => {}}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm text-slate-700 block">{product.name}</span>
                          <span className="text-xs text-slate-500">SKU: {product.sku}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedProducts.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Selected products:</p>
                      <div className="flex flex-wrap gap-2">
                        {getSelectedProductNames().map((name, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => handleProductToggle(selectedProducts[index])}
                              className="hover:text-purple-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              disabled={loading || (formData.applies_to === 'specific' && selectedConditions.length === 0)}
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