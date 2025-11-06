import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Eye } from 'lucide-react';
import BuyerModal from './BuyerModal';
import BuyerDetailPage from './BuyerDetailPage';

export default function BuyersPage() {
  const { profile } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuyers();
  }, [profile]);

  useEffect(() => {
    filterBuyers();
  }, [buyers, searchTerm]);

  const loadBuyers = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, buyer_credit_terms!buyer_credit_terms_buyer_id_fkey(*)')
        .eq('seller_id', profile.id)
        .eq('role', 'buyer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuyers(data || []);
    } catch (error) {
      console.error('Error loading buyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBuyers = () => {
    if (!searchTerm) {
      setFilteredBuyers(buyers);
      return;
    }

    const term = searchTerm.toLowerCase();
    setFilteredBuyers(
      buyers.filter(
        (b) =>
          b.first_name?.toLowerCase().includes(term) ||
          b.last_name?.toLowerCase().includes(term) ||
          b.email?.toLowerCase().includes(term) ||
          b.company_name?.toLowerCase().includes(term)
      )
    );
  };

  if (selectedBuyerId) {
    return <BuyerDetailPage buyerId={selectedBuyerId} onBack={() => setSelectedBuyerId(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Buyers</h1>
          <p className="text-slate-600 mt-1">{filteredBuyers.length} buyers</p>
        </div>

        <button
          onClick={() => setShowBuyerModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Onboard Buyer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search buyers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-600">Loading buyers...</p>
        </div>
      ) : filteredBuyers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-900 mb-2">No buyers found</h3>
          <p className="text-slate-600">
            {searchTerm ? 'Try adjusting your search' : 'Start by onboarding your first buyer'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Credit Terms</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.map((buyer) => {
                  const creditTerm = buyer.buyer_credit_terms?.[0];
                  return (
                    <tr key={buyer.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-slate-900">
                          {buyer.first_name} {buyer.last_name}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{buyer.email}</td>
                      <td className="py-4 px-4 text-slate-700">{buyer.company_name || '-'}</td>
                      <td className="py-4 px-4 text-slate-700">
                        {creditTerm ? `${creditTerm.credit_days} days` : 'Not set'}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            buyer.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {buyer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedBuyerId(buyer.id)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBuyerModal && (
        <BuyerModal
          onClose={() => setShowBuyerModal(false)}
          onSuccess={() => {
            setShowBuyerModal(false);
            loadBuyers();
          }}
        />
      )}
    </div>
  );
}
