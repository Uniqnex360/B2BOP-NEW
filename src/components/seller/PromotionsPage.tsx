import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Eye, Trash2, Tag, Loader } from 'lucide-react';
import PromotionModal from './PromotionModal';
import PromotionDetailPage from './PromotionDetailPage';

export default function PromotionsPage() {
  const { profile } = useAuth();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  
  const [applyingPromotion, setApplyingPromotion] = useState<string | null>(null);
  const [removingPromotion, setRemovingPromotion] = useState<string | null>(null);
  const [togglingPromotion, setTogglingPromotion] = useState<string | null>(null);

  useEffect(() => {
    loadPromotions();
  }, [profile]);

  useEffect(() => {
    filterPromotions();
  }, [promotions, searchTerm]);

  const loadPromotions = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false });

    setPromotions(data || []);
    setLoading(false);
  };

  const filterPromotions = () => {
    let filtered = promotions;

    if (searchTerm) {
      filtered = filtered.filter((promo) =>
        promo.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPromotions(filtered);
  };

  
  const applyPromotionToProducts = async (promotion: any) => {
    try {
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('seller_id', profile.id);

      
      if (promotion.applies_to === 'specific') {
        if (promotion.category_id) {
          query = query.eq('category_id', promotion.category_id);
        } else if (promotion.brand_id) {
          query = query.eq('brand_id', promotion.brand_id);
        } else if (promotion.product_id) {
          query = query.eq('id', promotion.product_id);
        }
      }

      const { data: applicableProducts, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!applicableProducts || applicableProducts.length === 0) {
        console.log('No products found to apply promotion to');
        return;
      }

      
      for (const product of applicableProducts) {
        const updateData: any = {
          promotion_id: promotion.id,
          original_price: product.original_price || product.unit_price 
        };

        
        if (promotion.promotion_type === 'percentage') {
          updateData.discount_price = Number((product.unit_price * (1 - promotion.discount_value / 100)).toFixed(2));
        } else {
          updateData.discount_price = Number(Math.max(0, product.unit_price - promotion.discount_value).toFixed(2));
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      setRemovingPromotion(id);
      
      
      await removePromotionFromProducts(id);
      
      
      await supabase.from('promotions').delete().eq('id', id);
      
      await loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert('Failed to delete promotion');
    } finally {
      setRemovingPromotion(null);
    }
  };

  const handleToggleActive = async (promo: any) => {
    const newActiveState = !promo.is_active;
    
    try {
      setTogglingPromotion(promo.id);
      
      
      await supabase
        .from('promotions')
        .update({ is_active: newActiveState })
        .eq('id', promo.id);

      if (newActiveState) {
        
        await applyPromotionToProducts(promo);
      } else {
        
        await removePromotionFromProducts(promo.id);
      }
      
      await loadPromotions();
    } catch (error) {
      console.error('Error toggling promotion active state:', error);
      alert('Failed to update promotion status');
    } finally {
      setTogglingPromotion(null);
    }
  };

  
  const handlePromotionSuccess = async (createdPromotion: any) => {
    setShowModal(false);
    
    if (createdPromotion && createdPromotion.is_active) {
      try {
        setApplyingPromotion(createdPromotion.id);
        await applyPromotionToProducts(createdPromotion);
        console.log('Promotion applied to products successfully');
      } catch (error) {
        console.error('Failed to apply promotion to products:', error);
      } finally {
        setApplyingPromotion(null);
      }
    }
    
    
    await loadPromotions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader className="w-5 h-5 animate-spin" />
          Loading promotions...
        </div>
      </div>
    );
  }

  if (selectedPromotionId) {
    return <PromotionDetailPage promotionId={selectedPromotionId} onBack={() => setSelectedPromotionId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Promotions</h1>
          <p className="text-slate-600 mt-1">Manage promotional campaigns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          disabled={applyingPromotion !== null}
        >
          <Plus className="w-5 h-5" />
          Create Promotion
        </button>
      </div>

      {/* NEW: Global Operation Status Banner */}
      {(applyingPromotion || removingPromotion || togglingPromotion) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="text-blue-800">
              {applyingPromotion && "Applying promotion to products..."}
              {removingPromotion && "Removing promotion from products..."}
              {togglingPromotion && "Updating promotion status..."}
              <div className="text-sm text-blue-600 mt-1">
                This may take a few moments depending on the number of products...
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredPromotions.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No promotions found</h3>
            <p className="text-slate-600 mb-6">
              {searchTerm ? 'Try adjusting your search' : 'Create your first promotion to boost sales'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Promotion
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Promotion
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Applies To
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Valid Period
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPromotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{promo.name}</div>
                      <div className="text-sm text-slate-600">{promo.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {promo.applies_to === 'all' ? 'All Products' : 'Specific Items'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">
                        {promo.promotion_type === 'percentage'
                          ? `${promo.discount_value}%`
                          : `$${promo.discount_value}`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(promo.start_date).toLocaleDateString()} -<br />
                      {new Date(promo.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        disabled={togglingPromotion === promo.id || applyingPromotion === promo.id || removingPromotion === promo.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition ${
                          promo.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {togglingPromotion === promo.id ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          promo.is_active ? 'Active' : 'Inactive'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPromotionId(promo.id)}
                          disabled={applyingPromotion === promo.id || removingPromotion === promo.id || togglingPromotion === promo.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          disabled={applyingPromotion === promo.id || removingPromotion === promo.id || togglingPromotion === promo.id}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removingPromotion === promo.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <PromotionModal
          onClose={() => setShowModal(false)}
          onSuccess={handlePromotionSuccess}
        />
      )}
    </div>
  );
}