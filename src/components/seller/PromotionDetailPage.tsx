import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit2, XCircle, Calendar, Tag, Percent } from 'lucide-react';
import PromotionModal from './PromotionModal';

interface PromotionDetailPageProps {
  promotionId: string;
  onBack: () => void;
}

export default function PromotionDetailPage({ promotionId, onBack }: PromotionDetailPageProps) {
  const [promotion, setPromotion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadPromotion();
  }, [promotionId]);

  const loadPromotion = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promotions')
      .select('*, categories(name), brands(name)')
      .eq('id', promotionId)
      .maybeSingle();

    setPromotion(data);
    setLoading(false);
  };

  const handleCloseOffer = async () => {
    if (!confirm('Are you sure you want to close this promotion? This will deactivate it immediately.')) return;

    await supabase
      .from('promotions')
      .update({ is_active: false })
      .eq('id', promotionId);

    loadPromotion();
  };

  const getTargetLabel = () => {
    if (promotion.applies_to === 'all') {
      return 'All Products';
    }
    if (promotion.category_id && promotion.categories) {
      return `Category: ${promotion.categories.name}`;
    }
    if (promotion.brand_id && promotion.brands) {
      return `Brand: ${promotion.brands.name}`;
    }
    return 'All Products';
  };

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
        <p className="text-slate-600">Promotion not found</p>
        <button onClick={onBack} className="mt-4 text-slate-900 hover:underline">
          Go back
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
          {/* {promotion.is_active && (
            <button
              onClick={handleCloseOffer}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <XCircle className="w-4 h-4" />
              Close Offer
            </button>
          )} */}
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          promotion.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {promotion.is_active ? 'Active' : 'Closed'}
        </span>
      </div>

      {/* Promotion Details Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Applies To</h3>
            </div>
            <p className="text-lg text-slate-700">{getTargetLabel()}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Discount</h3>
            </div>
            <p className="text-lg text-slate-700">
              {promotion.promotion_type === 'percentage'
                ? `${promotion.discount_value}% off`
                : `$${promotion.discount_value} off`
              }
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Start Date</h3>
            </div>
            <p className="text-lg text-slate-700">
              {new Date(promotion.start_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">End Date</h3>
            </div>
            <p className="text-lg text-slate-700">
              {new Date(promotion.end_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Promotion Information</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• This promotion is automatically applied to qualifying purchases</p>
          <p>• Buyers will see the discounted price when viewing products</p>
          <p>• You can edit the promotion details or close it anytime</p>
          {!promotion.is_active && (
            <p className="text-red-700 font-medium">• This promotion is currently closed and not visible to buyers</p>
          )}
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
