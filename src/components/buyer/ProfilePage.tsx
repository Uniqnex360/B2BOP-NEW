import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, CreditCard, User, Plus, Edit, X } from 'lucide-react';
export default function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [errors, setErrors] = useState<any>({});
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company_name: ''
  });
  const [newAddress, setNewAddress] = useState({
    address_type: 'shipping',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    phone: '',
    postal_code: '',
    country: 'USA',
    is_default: false,
  });
  const [newPayment, setNewPayment] = useState({
    payment_type: 'credit_card',
    last_four: '',
    is_default: false,
  });
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) return "Phone number is required!";
    if (cleaned.length < 10 || cleaned.length > 15) {
      return "Phone number must be between 10 and 15 digits!";
    }
    return "";
  };
  useEffect(() => {
    loadProfile();
  }, [profile]);
  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        company_name: profile.company_name || ''
      });
    }
  }, [profile]);
  const loadProfile = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [addressRes, paymentRes] = await Promise.all([
      supabase
        .from('buyer_addresses')
        .select('*')
        .eq('buyer_id', profile.id)
        .order('is_default', { ascending: false }),
      supabase
        .from('buyer_payment_methods')
        .select('*')
        .eq('buyer_id', profile.id)
        .order('is_default', { ascending: false }),
    ]);
    setAddresses(addressRes.data || []);
    setPaymentMethods(paymentRes.data || []);
    setLoading(false);
  };
  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await supabase.from('buyer_addresses').delete().eq('id', id);
    loadProfile();
  };
  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    await supabase.from('buyer_payment_methods').delete().eq('id', id);
    loadProfile();
  };
  const handleEditAddress = (address: any) => {
    setEditingAddress(address);
    setNewAddress({
      address_type: address.address_type,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default,
    });
    setShowAddressModal(true);
  };
  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setNewPayment({
      payment_type: payment.payment_type,
      last_four: payment.last_four,
      is_default: payment.is_default,
    });
    setShowPaymentModal(true);
  };
  const handleSaveProfile = async () => {
  if (!profile?.id) return;
  try {
    const { error } = await supabase
      .from('user_profiles') 
      .update({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        company_name: profileForm.company_name
      })
      .eq('id', profile.id);
    if (error) throw error;
    if (typeof updateProfile === 'function') {
      await updateProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        company_name: profileForm.company_name
      });
    } else {
      console.log('Profile updated successfully');
      // window.location.reload(); 
    }
    setShowProfileModal(false);
    loadProfile();
  } catch (error) {
    console.error('Error updating profile:', error);
    setErrors({ profile: 'Failed to update profile' });
  }
};
  const handleSaveAddress = async () => {
    if (!profile?.id) return;
    const phoneError = validatePhone(newAddress.phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }
    setErrors({});
    const full_name = `${profileForm.first_name} ${profileForm.last_name}`.trim();
    const addressData = {
      buyer_id: profile.id,
      full_name: full_name,
      phone: newAddress.phone,
      address_line1: newAddress.address_line1,
      address_line2: newAddress.address_line2,
      city: newAddress.city,
      state: newAddress.state,
      postal_code: newAddress.postal_code,
      country: newAddress.country,
      is_default: newAddress.is_default,
      address_type: newAddress.address_type
    };
    if (editingAddress) {
      await supabase
        .from('buyer_addresses')
        .update(addressData)
        .eq('id', editingAddress.id);
    } else {
      await supabase.from('buyer_addresses').insert(addressData);
    }
    setShowAddressModal(false);
    setEditingAddress(null);
    setNewAddress({
      address_type: 'shipping',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      phone: '',
      is_default: false,
    });
    loadProfile();
  };
  const handleSavePayment = async () => {
    if (!profile?.id) return;
    const paymentData = {
      ...newPayment,
      buyer_id: profile.id,
    };
    if (editingPayment) {
      await supabase
        .from('buyer_payment_methods')
        .update(paymentData)
        .eq('id', editingPayment.id);
    } else {
      await supabase.from('buyer_payment_methods').insert(paymentData);
    }
    setShowPaymentModal(false);
    setEditingPayment(null);
    setNewPayment({
      payment_type: 'credit_card',
      last_four: '',
      is_default: false,
    });
    loadProfile();
  };
  const handleCloseAddressModal = () => {
    setShowAddressModal(false);
    setEditingAddress(null);
    setNewAddress({
      address_type: 'shipping',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      phone: '',
      is_default: false,
    });
    setErrors({});
  };
  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setEditingPayment(null);
    setNewPayment({
      payment_type: 'credit_card',
      last_four: '',
      is_default: false,
    });
  };
  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        company_name: profile.company_name || ''
      });
    }
    setErrors({});
  };
  const formatAddress = (address: any) => {
    const parts = [
      address.address_line1,
      address.address_line2,
      `${address.city}, ${address.state} ${address.postal_code}`,
      address.country
    ].filter(part => part && part.trim() !== '');
    return parts.join(', ');
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading profile...</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-600 mt-1">Manage your account settings</p>
      </div>
      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {profileForm.first_name?.charAt(0)}{profileForm.last_name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {profileForm.first_name} {profileForm.last_name}
            </h2>
            <p className="text-slate-600">{profileForm.email}</p>
            {profileForm.company_name && (
              <p className="text-sm text-slate-500">{profileForm.company_name}</p>
            )}
          </div>
        </div>
        <button 
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
        >
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>
      {/* Addresses Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Saved Addresses</h2>
          </div>
          <button
            onClick={() => setShowAddressModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>
        {addresses.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No saved addresses yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition">
                {addr.is_default && (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mb-2">
                    Default
                  </span>
                )}
                <p className="font-medium text-slate-900 capitalize">{addr.address_type}</p>
                <p className="text-sm text-slate-600 mt-1">{formatAddress(addr)}</p>
                <p className="text-sm text-slate-600 mt-1">Phone: {addr.phone}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button 
                    onClick={() => handleEditAddress(addr)}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => handleDeleteAddress(addr.id)} className="text-sm text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Payment Methods Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Payment Methods</h2>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </button>
        </div>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No payment methods saved yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((payment) => (
              <div key={payment.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition">
                {payment.is_default && (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mb-2">
                    Default
                  </span>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  <p className="font-medium text-slate-900 capitalize">{payment.payment_type.replace('_', ' ')}</p>
                </div>
                <p className="text-sm text-slate-600">•••• •••• •••• {payment.last_four}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button 
                    onClick={() => handleEditPayment(payment)}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => handleDeletePayment(payment.id)} className="text-sm text-red-600 hover:text-red-700">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Edit Profile</h3>
              <button
                onClick={handleCloseProfileModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              {errors.profile && (
                <p className="text-red-600 text-sm">{errors.profile}</p>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseProfileModal}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                {editingAddress ? 'Edit Address' : 'Add Address'}
              </h3>
              <button
                onClick={handleCloseAddressModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newAddress.address_type}
                  onChange={(e) => setNewAddress({ ...newAddress, address_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="shipping">Shipping</option>
                  <option value="billing">Billing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={newAddress.address_line1}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={newAddress.address_line2}
                  onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Apartment, suite, unit, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={newAddress.postal_code}
                  onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="(555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="text-sm text-slate-700">Set as default address</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCloseAddressModal}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingAddress ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">
                {editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}
              </h3>
              <button
                onClick={handleClosePaymentModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
                <select
                  value={newPayment.payment_type}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_account">Bank Account</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last 4 Digits</label>
                <input
                  type="text"
                  maxLength={4}
                  value={newPayment.last_four}
                  onChange={(e) => setNewPayment({ ...newPayment, last_four: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1234"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPayment.is_default}
                  onChange={(e) => setNewPayment({ ...newPayment, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label className="text-sm text-slate-700">Set as default payment method</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClosePaymentModal}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingPayment ? 'Update Payment' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}