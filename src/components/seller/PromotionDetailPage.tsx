import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit2, XCircle, Calendar, Tag, Percent, DollarSign, Users, Package, Building, Target, Hash, Eye, EyeOff, Clock, Infinity } from 'lucide-react';
import PromotionModal from './PromotionModal';

interface PromotionDetailPageProps {
  promotionId: string;
  onBack: () => void;
}

export default function PromotionDetailPage({ promotionId, onBack }: PromotionDetailPageProps) {
  const [promotion, setPromotion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [targetProducts, setTargetProducts] = useState<any[]>([]);
  const [targetCategories, setTargetCategories] = useState<any[]>([]);
  const [targetBrands, setTargetBrands] = useState<any[]>([]);

  useEffect(() => {
    loadPromotion();
  }, [promotionId]);

  const loadPromotion = async () => {
    setLoading(true);
    try {
      console.log('Loading promotion with ID:', promotionId);
      
      // Get the basic promotion data
      const { data: promotionData, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .single();

      if (error) {
        console.error('Error loading promotion:', error);
        setPromotion(null);
        setLoading(false);
        return;
      }

      console.log('Promotion data loaded:', promotionData);
      setPromotion(promotionData);

      // Load related data for multiple selections
      const promises = [];

      // Load categories (both single and multiple)
      if (promotionData.category_ids && promotionData.category_ids.length > 0) {
        promises.push(
          supabase
            .from('categories')
            .select('id, name')
            .in('id', promotionData.category_ids)
            .then(({ data }) => setTargetCategories(data || []))
        );
      } else if (promotionData.category_id) {
        // Fallback to single category for backward compatibility
        promises.push(
          supabase
            .from('categories')
            .select('id, name')
            .eq('id', promotionData.category_id)
            .single()
            .then(({ data }) => setTargetCategories(data ? [data] : []))
        );
      }

      // Load brands (both single and multiple)
      if (promotionData.brand_ids && promotionData.brand_ids.length > 0) {
        promises.push(
          supabase
            .from('brands')
            .select('id, name')
            .in('id', promotionData.brand_ids)
            .then(({ data }) => setTargetBrands(data || []))
        );
      } else if (promotionData.brand_id) {
        // Fallback to single brand for backward compatibility
        promises.push(
          supabase
            .from('brands')
            .select('id, name')
            .eq('id', promotionData.brand_id)
            .single()
            .then(({ data }) => setTargetBrands(data ? [data] : []))
        );
      }

      // Load products (both single and multiple)
      if (promotionData.product_ids && promotionData.product_ids.length > 0) {
        promises.push(
          supabase
            .from('products')
            .select('id, name, sku')
            .in('id', promotionData.product_ids)
            .then(({ data }) => setTargetProducts(data || []))
        );
      } else if (promotionData.product_id) {
        // Fallback to single product for backward compatibility
        promises.push(
          supabase
            .from('products')
            .select('id, name, sku')
            .eq('id', promotionData.product_id)
            .single()
            .then(({ data }) => setTargetProducts(data ? [data] : []))
        );
      }

      await Promise.all(promises);
      
    } catch (error) {
      console.error('Error in loadPromotion:', error);
      setPromotion(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseOffer = async () => {
  if (!confirm('Are you sure you want to close this promotion? This will deactivate it immediately and remove discounts from all products.')) return;

  try {
    // First remove the promotion from all products
    const { error: removeError } = await supabase
      .from('products')
      .update({ 
        promotion_id: null,
        discount_price: null
      })
      .eq('promotion_id', promotionId);

    if (removeError) throw removeError;

    // Then deactivate the promotion
    const { error: updateError } = await supabase
      .from('promotions')
      .update({ is_active: false })
      .eq('id', promotionId);

    if (updateError) throw updateError;

    console.log('Promotion closed and removed from products');
    loadPromotion();
  } catch (error) {
    console.error('Error closing promotion:', error);
    alert('Failed to close promotion');
  }
};

  const getApplyToLabel = () => {
    if (!promotion) return 'Loading...';

    // Check if we have multiple conditions
    const hasMultipleCategories = targetCategories.length > 1;
    const hasMultipleBrands = targetBrands.length > 1;
    const hasMultipleProducts = targetProducts.length > 1;
    
    const hasCategories = targetCategories.length > 0;
    const hasBrands = targetBrands.length > 0;
    const hasProducts = targetProducts.length > 0;

    // Count total conditions
    const totalConditions = (hasCategories ? 1 : 0) + (hasBrands ? 1 : 0) + (hasProducts ? 1 : 0);

    if (promotion.applies_to === 'all') {
      return 'All Products';
    }

    if (totalConditions === 0) {
      return 'No specific targets selected';
    }

    // Build description based on multiple conditions
    const parts = [];

    if (hasCategories) {
      if (hasMultipleCategories) {
        parts.push(`${targetCategories.length} Categories`);
      } else {
        parts.push(`Category: ${targetCategories[0]?.name}`);
      }
    }

    if (hasBrands) {
      if (hasMultipleBrands) {
        parts.push(`${targetBrands.length} Brands`);
      } else {
        parts.push(`Brand: ${targetBrands[0]?.name}`);
      }
    }

    if (hasProducts) {
      if (hasMultipleProducts) {
        parts.push(`${targetProducts.length} Products`);
      } else {
        parts.push(`Product: ${targetProducts[0]?.name}`);
      }
    }

    return parts.join(' + ');
  };

  const getBuyerSelectionLabel = () => {
    if (!promotion) return 'Loading...';
    return 'All Buyers';
  };

  const getDiscountTypeLabel = () => {
    return promotion?.promotion_type === 'percentage' ? 'Percentage Discount' : 'Fixed Amount Discount';
  };

  const formatDiscountValue = () => {
    if (!promotion) return 'Loading...';
    return promotion.promotion_type === 'percentage' 
      ? `${promotion.discount_value}%` 
      : `$${parseFloat(promotion.discount_value).toFixed(2)}`;
  };

 const getStatusDetails = () => {
  if (!promotion) return null;

  const now = new Date();
  const startDate = new Date(promotion.start_date);
  const endDate = promotion.end_date ? new Date(promotion.end_date) : null;

  // First check if promotion is manually deactivated
  if (!promotion.is_active) {
    return { status: 'Inactive', color: 'red', description: 'Promotion is manually deactivated' };
  }

  // Check if promotion hasn't started yet
  if (now < startDate) {
    return { status: 'Scheduled', color: 'blue', description: 'Promotion will start in the future' };
  }

  // Check if promotion has expired
  if (endDate && now > endDate) {
    return { status: 'Expired', color: 'orange', description: 'Promotion has ended' };
  }
const cleanupExpiredPromotions = async () => {
  try {
    const now = new Date().toISOString();
    
    // Find all expired promotions that are still marked as active
    const { data: expiredPromotions, error: findError } = await supabase
      .from('promotions')
      .select('id')
      .eq('is_active', true)
      .lt('end_date', now);

    if (findError) throw findError;

    if (expiredPromotions && expiredPromotions.length > 0) {
      const promotionIds = expiredPromotions.map(p => p.id);
      
      // Remove promotion from products
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          promotion_id: null,
          discount_price: null
        })
        .in('promotion_id', promotionIds);

      if (updateError) throw updateError;

      // Mark promotions as inactive
      const { error: deactivateError } = await supabase
        .from('promotions')
        .update({ is_active: false })
        .in('id', promotionIds);

      if (deactivateError) throw deactivateError;

      console.log(`Cleaned up ${expiredPromotions.length} expired promotions`);
    }
  } catch (error) {
    console.error('Error cleaning up expired promotions:', error);
  }
};
  // If all checks pass, promotion is active
  return { status: 'Active', color: 'green', description: 'Promotion is currently running' };
};

  const statusInfo = promotion ? getStatusDetails() : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading promotion...</div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="text-center py-16">
        <div className="mb-4">
          <XCircle className="w-16 h-16 text-red-400 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Promotion Not Found</h3>
        <p className="text-slate-600 mb-4">
          The promotion you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go Back to Promotions
        </button>
      </div>
    );
  }

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
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{promotion.name}</h1>
            <p className="text-slate-600 mt-1">{promotion.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          {promotion.is_active && (
            <button
              onClick={handleCloseOffer}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <XCircle className="w-4 h-4" />
              Close Offer
            </button>
          )}
        </div>
      </div>

      {/* Status Badge with Details */}
      {statusInfo && (
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
            statusInfo.color === 'red' ? 'bg-red-100 text-red-800' :
            statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {statusInfo.status}
          </span>
          <span className="text-sm text-slate-600">{statusInfo.description}</span>
        </div>
      )}

      {/* Main Promotion Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Promotion Name</label>
              <p className="text-slate-900">{promotion.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <p className="text-slate-900">{promotion.description || 'No description provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Created Date</label>
              <p className="text-slate-900">
                {new Date(promotion.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Discount Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Discount Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount Type</label>
              <p className="text-slate-900">{getDiscountTypeLabel()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount Value</label>
              <p className="text-2xl font-bold text-green-600">{formatDiscountValue()}</p>
            </div>
            {promotion.coupon_code && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code</label>
                <p className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">{promotion.coupon_code}</p>
              </div>
            )}
          </div>
        </div>

        {/* Target Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Target Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Applies To</label>
              <p className="text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {getApplyToLabel()}
              </p>
              
              {/* Show detailed breakdown of multiple selections */}
              {(targetCategories.length > 0 || targetBrands.length > 0 || targetProducts.length > 0) && (
                <div className="mt-3 space-y-2">
                  {/* Categories */}
                  {targetCategories.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Categories ({targetCategories.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {targetCategories.map((category) => (
                          <span key={category.id} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {category.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {targetBrands.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Brands ({targetBrands.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {targetBrands.map((brand) => (
                          <span key={brand.id} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {brand.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {targetProducts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Products ({targetProducts.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {targetProducts.map((product) => (
                          <span key={product.id} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            {product.name} ({product.sku})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Buyer Selection</label>
              <p className="text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {getBuyerSelectionLabel()}
              </p>
            </div>
          </div>
        </div>

        {/* Schedule & Limits */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule & Limits
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <p className="text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(promotion.start_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <p className="text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {promotion.end_date 
                  ? new Date(promotion.end_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : <span className="flex items-center gap-1"><Infinity className="w-4 h-4" /> No end date</span>
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <PromotionModal
          promotion={promotion}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadPromotion();
          }}
        />
      )}
    </div>
  );
}