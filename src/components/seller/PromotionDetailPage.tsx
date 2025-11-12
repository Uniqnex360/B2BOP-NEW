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
  const [targetProduct, setTargetProduct] = useState<any>(null);
  const [targetBuyer, setTargetBuyer] = useState<any>(null);
  const [targetCategory, setTargetCategory] = useState<any>(null);
  const [targetBrand, setTargetBrand] = useState<any>(null);

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

      // Load related data if IDs exist
      const promises = [];

      if (promotionData.category_id) {
        promises.push(
          supabase
            .from('categories')
            .select('name')
            .eq('id', promotionData.category_id)
            .single()
            .then(({ data }) => setTargetCategory(data))
        );
      }

      if (promotionData.brand_id) {
        promises.push(
          supabase
            .from('brands')
            .select('name')
            .eq('id', promotionData.brand_id)
            .single()
            .then(({ data }) => setTargetBrand(data))
        );
      }

      if (promotionData.product_id) {
        promises.push(
          supabase
            .from('products')
            .select('name, sku')
            .eq('id', promotionData.product_id)
            .single()
            .then(({ data }) => setTargetProduct(data))
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
    if (!confirm('Are you sure you want to close this promotion? This will deactivate it immediately.')) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: false })
        .eq('id', promotionId);

      if (error) throw error;

      loadPromotion();
    } catch (error) {
      console.error('Error closing promotion:', error);
      alert('Failed to close promotion');
    }
  };

  const getApplyToLabel = () => {
  if (!promotion) return 'Loading...';

  switch (promotion.applies_to) {
    case 'all':
      return 'All Products';
    case 'category':
      return `Category: ${targetCategory?.name || promotion.category_id || 'N/A'}`;
    case 'brand':
      return `Brand: ${targetBrand?.name || promotion.brand_id || 'N/A'}`;
    case 'product':
      return `Product: ${targetProduct?.name || promotion.product_id || 'N/A'} (${targetProduct?.sku || 'N/A'})`;
    case 'specific': // Add this case
      // Check what specific target exists
      if (promotion.product_id) {
        return `Product: ${targetProduct?.name || promotion.product_id || 'N/A'} (${targetProduct?.sku || 'N/A'})`;
      } else if (promotion.category_id) {
        return `Category: ${targetCategory?.name || promotion.category_id || 'N/A'}`;
      } else if (promotion.brand_id) {
        return `Brand: ${targetBrand?.name || promotion.brand_id || 'N/A'}`;
      } else {
        return 'Specific Products (No target specified)';
      }
    default:
      return 'All Products';
  }
};

  // For your data structure, buyer selection might not exist, so we'll handle it gracefully
  const getBuyerSelectionLabel = () => {
    if (!promotion) return 'Loading...';
    
    // If your promotions table doesn't have buyer_selection field, default to 'All Buyers'
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

    if (!promotion.is_active) {
      return { status: 'Inactive', color: 'red', description: 'Promotion is not active' };
    }

    if (now < startDate) {
      return { status: 'Scheduled', color: 'blue', description: 'Promotion will start in the future' };
    }

    if (endDate && now > endDate) {
      return { status: 'Expired', color: 'orange', description: 'Promotion has ended' };
    }

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