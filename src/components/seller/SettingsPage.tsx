import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Save, Building2, User, Mail, Phone, MapPin, Plus, X } from 'lucide-react';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: ''
  });

  // Local state for warehouse edits
  const [warehouseEdits, setWarehouseEdits] = useState<{[key: string]: any}>({});
  
  // State for new warehouse form
  const [showAddWarehouseForm, setShowAddWarehouseForm] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: ''
  });
  const [addingWarehouse, setAddingWarehouse] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [profile]);

  const loadSettings = async () => {
    if (!profile?.id) return;

    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      if (profileData) {
        setFormData({
          company_name: profileData.company_name || '',
          contact_person: profileData.contact_person || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          address_line1: profileData.address_line1 || '',
          address_line2: profileData.address_line2 || '',
          city: profileData.city || '',
          state: profileData.state || '',
          postal_code: profileData.postal_code || '',
          country: profileData.country || ''
        });
      }

      const { data: warehouseData } = await supabase
        .from('warehouses')
        .select('*')
        .eq('seller_id', profile.id)
        .order('name');

      setWarehouses(warehouseData || []);
      // Reset edits when loading new data
      setWarehouseEdits({});
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          phone: formData.phone,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWarehouse = async () => {
    if (!profile?.id || !newWarehouse.name.trim()) return;

    setAddingWarehouse(true);
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          seller_id: profile.id,
          name: newWarehouse.name.trim(),
          address_line1: newWarehouse.address_line1,
          address_line2: newWarehouse.address_line2,
          city: newWarehouse.city,
          state: newWarehouse.state,
          postal_code: newWarehouse.postal_code,
          country: newWarehouse.country,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      setWarehouses([...warehouses, data]);
      setNewWarehouse({
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: ''
      });
      setShowAddWarehouseForm(false);
    } catch (error) {
      console.error('Error adding warehouse:', error);
      alert('Failed to add warehouse');
    } finally {
      setAddingWarehouse(false);
    }
  };

  const handleCancelAddWarehouse = () => {
    setNewWarehouse({
      name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: ''
    });
    setShowAddWarehouseForm(false);
  };

  // Handle warehouse field changes locally
  const handleWarehouseFieldChange = (warehouseId: string, field: string, value: string) => {
    setWarehouseEdits(prev => ({
      ...prev,
      [warehouseId]: {
        ...prev[warehouseId],
        [field]: value
      }
    }));
  };

  // Save warehouse changes
  const handleSaveWarehouse = async (warehouseId: string) => {
    const edits = warehouseEdits[warehouseId];
    if (!edits) return;

    try {
      const { error } = await supabase
        .from('warehouses')
        .update(edits)
        .eq('id', warehouseId);

      if (error) throw error;

      // Update local state
      setWarehouses(warehouses.map(w =>
        w.id === warehouseId ? { ...w, ...edits } : w
      ));

      // Clear edits for this warehouse
      setWarehouseEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[warehouseId];
        return newEdits;
      });

      alert('Warehouse updated successfully');
    } catch (error) {
      console.error('Error updating warehouse:', error);
      alert('Failed to update warehouse');
    }
  };

  // Get current value for warehouse field (either edited or original)
  const getWarehouseFieldValue = (warehouse: any, field: string) => {
    return warehouseEdits[warehouse.id]?.[field] ?? warehouse[field] ?? '';
  };

  // Check if warehouse has unsaved changes
  const hasUnsavedChanges = (warehouseId: string) => {
    return !!warehouseEdits[warehouseId];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile and warehouse information</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {/* ... (keep your existing profile form fields exactly as they are) ... */}
          
          <div className="pt-4">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Warehouses
          </h2>
          <button
            onClick={() => setShowAddWarehouseForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Warehouse
          </button>
        </div>
        <div className="p-6">
          {/* Add Warehouse Form */}
          {showAddWarehouseForm && (
            <div className="border-2 border-blue-200 rounded-lg p-6 mb-6 bg-blue-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Warehouse</h3>
                <button
                  onClick={handleCancelAddWarehouse}
                  className="p-1 text-gray-500 hover:text-gray-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse Name *
                  </label>
                  <input
                    type="text"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter warehouse name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={newWarehouse.address_line1}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, address_line1: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={newWarehouse.address_line2}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, address_line2: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Suite, unit, building, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={newWarehouse.city}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={newWarehouse.state}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={newWarehouse.postal_code}
                      onChange={(e) => setNewWarehouse(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ZIP / Postal code"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={newWarehouse.country}
                    onChange={(e) => setNewWarehouse(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Country"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddWarehouse}
                    disabled={addingWarehouse || !newWarehouse.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {addingWarehouse ? 'Adding...' : 'Add Warehouse'}
                  </button>
                  <button
                    onClick={handleCancelAddWarehouse}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Warehouses List */}
          {warehouses.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No warehouses added yet</p>
              <p className="text-gray-400 text-sm mb-4">Add your first warehouse to get started</p>
              <button
                onClick={() => setShowAddWarehouseForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Warehouse Details</h3>
                    {hasUnsavedChanges(warehouse.id) && (
                      <button
                        onClick={() => handleSaveWarehouse(warehouse.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        <Save className="w-3 h-3" />
                        Save Changes
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Warehouse Name
                      </label>
                      <input
                        type="text"
                        value={getWarehouseFieldValue(warehouse, 'name')}
                        onChange={(e) => handleWarehouseFieldChange(warehouse.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={getWarehouseFieldValue(warehouse, 'address_line1')}
                        onChange={(e) => handleWarehouseFieldChange(warehouse.id, 'address_line1', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={getWarehouseFieldValue(warehouse, 'city')}
                        onChange={(e) => handleWarehouseFieldChange(warehouse.id, 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={getWarehouseFieldValue(warehouse, 'state')}
                        onChange={(e) => handleWarehouseFieldChange(warehouse.id, 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={getWarehouseFieldValue(warehouse, 'postal_code')}
                        onChange={(e) => handleWarehouseFieldChange(warehouse.id, 'postal_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={getWarehouseFieldValue(warehouse, 'country')}
                      onChange={(e) => handleWarehouseFieldChange(warehouse.id, 'country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}