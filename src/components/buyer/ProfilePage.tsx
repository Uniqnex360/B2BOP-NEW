import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MapPin, CreditCard, User, Plus, Edit, X } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [errors,setErrors]=useState("")
  const [newAddress, setNewAddress] = useState({
    address_type: 'shipping',
    street_address: '',
    city: '',
    state: '',
    phone:"",
    postal_code: '',
    country: 'USA',
    is_default: false,
  });
  const [newPayment, setNewPayment] = useState({
    payment_type: 'credit_card',
    last_four: '',
    is_default: false,
  });
  const validatePhone=(phone:string)=>{
    const cleaned=phone.replace(/\D/g, '');
    if (!cleaned)return "Phone number is required!"
    if(cleaned.length<10||cleaned.length>15)
    {
      return "Phone number must be between 10 and 15 digits!"
    }
    return ""
  }
  useEffect(() => {
    loadProfile();
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

  const handleSaveAddress = async () => {
    if (!profile?.id) return;
    const phoneError=validatePhone(newAddress.phone)
    if(phoneError)
    {
      setErrors({phone:phoneError})
      return
    }
    setErrors({})
      const full_name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
    await supabase.from('buyer_addresses').insert({
      buyer_id:profile.id,
      full_name:full_name,
      phone:newAddress.phone,
      address_line1:newAddress.street_address,
      city:newAddress.city,
      state:newAddress.state,
      postal_code:newAddress.postal_code,
      country:newAddress.country,
      is_default:newAddress.is_default,
      address_type:newAddress.address_type
    });

    setShowAddressModal(false);
    setNewAddress({
      address_type: 'shipping',
      street_address: '',
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

    await supabase.from('buyer_payment_methods').insert({
      ...newPayment,
      buyer_id: profile.id,
    });

    setShowPaymentModal(false);
    setNewPayment({
      payment_type: 'credit_card',
      last_four: '',
      is_default: false,
    });
    loadProfile();
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
            <p className="text-sm text-slate-500">{profile?.company_name}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
          <Edit className="w-4 h-4" />
          Edit Profile
        </button>
      </div>

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
                <p className="font-medium text-slate-900">{addr.address_type}</p>
                <p className="text-sm text-slate-600 mt-1">{addr.street_address}</p>
                <p className="text-sm text-slate-600">{addr.city}, {addr.state} {addr.postal_code}</p>
                <p className="text-sm text-slate-600">{addr.country}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button className="text-sm text-slate-600 hover:text-slate-900">Edit</button>
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
                  <p className="font-medium text-slate-900">{payment.payment_type}</p>
                </div>
                <p className="text-sm text-slate-600">•••• •••• •••• {payment.last_four}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button className="text-sm text-slate-600 hover:text-slate-900">Edit</button>
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

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900">Add Address</h3>
              <button
                onClick={() => setShowAddressModal(false)}
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
                  value={newAddress.street_address}
                  onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Address
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
              <h3 className="text-xl font-semibold text-slate-900">Add Payment Method</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
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
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
