import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Users, Store } from 'lucide-react';
import SellerOnboardingModal from './SellerOnboardingModal';

interface Stats {
  totalSellers: number;
  activeSellers: number;
  totalBuyers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalSellers: 0, activeSellers: 0, totalBuyers: 0 });
  const [sellers, setSellers] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: sellersData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'seller')
        .order('created_at', { ascending: false });

      const { data: buyersData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'buyer');

      setSellers(sellersData || []);
      setStats({
        totalSellers: sellersData?.length || 0,
        activeSellers: sellersData?.filter((s) => s.is_active).length || 0,
        totalBuyers: buyersData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage sellers and platform operations</p>
        </div>
        <button
          onClick={() => setShowOnboarding(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus className="w-5 h-5" />
          Onboard Seller
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Sellers</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalSellers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Active Sellers</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeSellers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Buyers</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalBuyers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sellers list */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Sellers</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-slate-600 py-8">Loading...</p>
          ) : sellers.length === 0 ? (
            <p className="text-center text-slate-600 py-8">No sellers yet. Start by onboarding one!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Business Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {seller.logo_url ? (
                            <img src={seller.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                              <Store className="w-5 h-5 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{seller.business_name || seller.company_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {seller.first_name} {seller.last_name}
                      </td>
                      <td className="py-4 px-4 text-slate-700">{seller.email}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            seller.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {seller.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {new Date(seller.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showOnboarding && (
        <SellerOnboardingModal
          onClose={() => setShowOnboarding(false)}
          onSuccess={() => {
            setShowOnboarding(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
