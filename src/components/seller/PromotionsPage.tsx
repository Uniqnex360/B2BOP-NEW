import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Eye, Trash2, Tag } from 'lucide-react';
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    await supabase.from('promotions').delete().eq('id', id);
    loadPromotions();
  };

  const handleToggleActive = async (promo: any) => {
    await supabase
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id);
    loadPromotions();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading promotions...</div>
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Create Promotion
        </button>
      </div>

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
                onClick={() => {
                  setSelectedPromotion(null);
                  setShowModal(true);
                }}
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
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          promo.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPromotionId(promo.id)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
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
          onSuccess={() => {
            setShowModal(false);
            loadPromotions();
          }}
        />
      )}
    </div>
  );
}
