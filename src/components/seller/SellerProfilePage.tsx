import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, MapPin, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface WarehouseModalProps {
  warehouse: any | null;
  onClose: () => void;
  onSave: () => void;
  sellerId: string;
}

function WarehouseModal({ warehouse, onClose, onSave, sellerId }: WarehouseModalProps) {
  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    address: warehouse?.address || '',
    city: warehouse?.city || '',
    state: warehouse?.state || '',
    zip_code: warehouse?.zip_code || '',
    country: warehouse?.country || 'USA',
    phone: warehouse?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (warehouse) {
        const { error } = await supabase
          .from('warehouses')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', warehouse.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('warehouses')
          .insert({ ...formData, seller_id: sellerId });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert('Failed to save warehouse');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          {warehouse ? 'Edit Warehouse' : 'Add Warehouse'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Warehouse Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Main Warehouse"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="123 Main St"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="New York"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State *
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="NY"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ZIP Code *
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country *
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="USA"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SellerProfilePage() {
  const { profile } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

  useEffect(() => {
    loadWarehouses();
  }, [profile]);

  const loadWarehouses = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('warehouses')
      .select('*')
      .eq('seller_id', profile.id)
      .order('name');

    setWarehouses(data || []);
    setLoading(false);
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadWarehouses();
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('Failed to delete warehouse');
    }
  };

  const toggleWarehouseStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      loadWarehouses();
    } catch (error) {
      console.error('Error updating warehouse status:', error);
      alert('Failed to update warehouse status');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Profile & Settings</h1>
        <p className="text-slate-600 mt-1">Manage your profile and warehouse locations</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-slate-600">{profile?.email}</p>
            <p className="text-sm text-slate-500 capitalize mt-1">
              {profile?.role} Account
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Business Name:</span>
            <p className="font-medium text-slate-900">{profile?.business_name || 'Not set'}</p>
          </div>
          <div>
            <span className="text-slate-500">Phone:</span>
            <p className="font-medium text-slate-900">{profile?.phone || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Warehouses Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Warehouse Locations</h2>
            <p className="text-sm text-slate-600 mt-1">Manage your fulfillment centers</p>
          </div>
          <button
            onClick={() => {
              setSelectedWarehouse(null);
              setShowWarehouseModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No warehouses added yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Add warehouse locations to manage order fulfillment
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className={`border rounded-lg p-4 ${
                  warehouse.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-5 h-5 ${warehouse.is_active ? 'text-blue-600' : 'text-slate-400'}`} />
                    <h3 className="font-semibold text-slate-900">{warehouse.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedWarehouse(warehouse);
                        setShowWarehouseModal(true);
                      }}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWarehouse(warehouse.id)}
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-slate-600 space-y-1">
                  <p>{warehouse.address}</p>
                  <p>{warehouse.city}, {warehouse.state} {warehouse.zip_code}</p>
                  <p>{warehouse.country}</p>
                  {warehouse.phone && <p className="text-slate-500">{warehouse.phone}</p>}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    warehouse.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {warehouse.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => toggleWarehouseStatus(warehouse.id, warehouse.is_active)}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {warehouse.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse Modal */}
      {showWarehouseModal && (
        <WarehouseModal
          warehouse={selectedWarehouse}
          onClose={() => {
            setShowWarehouseModal(false);
            setSelectedWarehouse(null);
          }}
          onSave={loadWarehouses}
          sellerId={profile?.id || ''}
        />
      )}
    </div>
  );
}
