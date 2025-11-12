import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CreditCard, Wallet, Building, DollarSign, Truck, MapPin, Edit2 } from 'lucide-react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { stripePromise } from '../../lib/stripeConfig';

interface CheckoutPageProps {
  cart: any[];
  onBack: () => void;
  onSuccess: () => void;
}

export default function CheckoutWrapperPage(props: CheckoutPageProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutPage {...props} />
    </Elements>
  );
}

export function CheckoutPage({ cart, onBack, onSuccess }: CheckoutPageProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState<'address' | 'payment'>('address');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<any>(null);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<any>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // New address form state
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    address_type: 'both',
    is_default: false
  });

  // Payment form states
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [bankName, setBankName] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.product.unit_price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const paymentOptions = [
    { id: 'stripe', name: 'Stripe', icon: CreditCard, description: 'Pay with credit/debit card' },
    { id: 'paypal', name: 'PayPal', icon: Wallet, description: 'Pay with PayPal account' },
    { id: 'netbanking', name: 'Net Banking', icon: Building, description: 'Pay via online banking' },
    { id: 'card', name: 'Debit/Credit Card', icon: CreditCard, description: 'Direct card payment' },
    { id: 'credit', name: 'Credit Terms', icon: Truck, description: 'Use credit limit' },
  ];

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!profile?.id) return;
      setLoadingAddress(true);
      const { data, error } = await supabase
        .from('buyer_addresses')
        .select('*')
        .eq('buyer_id', profile.id)
        .order('is_default', { ascending: false });

      if (!error && data) {
        setAddresses(data);
        // Set default addresses
        const defaultAddress = data.find(addr => addr.is_default);
        if (defaultAddress) {
          setSelectedBillingAddress(defaultAddress);
          setSelectedShippingAddress(defaultAddress);
        } else if (data.length > 0) {
          setSelectedBillingAddress(data[0]);
          setSelectedShippingAddress(data[0]);
        }
      }
      setLoadingAddress(false);
    };
    fetchAddresses();
  }, [profile]);

  const handleAddAddress = async () => {
    if (!newAddress.full_name || !newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.postal_code) {
      alert('Please fill in all required address fields');
      return;
    }

    setSavingAddress(true);
    try {
      const addressData = {
        buyer_id: profile!.id,
        full_name: newAddress.full_name,
        phone: newAddress.phone,
        address_line1: newAddress.address_line1,
        address_line2: newAddress.address_line2,
        city: newAddress.city,
        state: newAddress.state,
        postal_code: newAddress.postal_code,
        country: newAddress.country,
        address_type: newAddress.address_type,
        is_default: newAddress.is_default
      };

      const { data: newAddressData, error } = await supabase
        .from('buyer_addresses')
        .insert(addressData)
        .select()
        .single();

      if (error) throw error;

      // Refresh addresses
      const { data } = await supabase
        .from('buyer_addresses')
        .select('*')
        .eq('buyer_id', profile.id)
        .order('is_default', { ascending: false });

      setAddresses(data || []);
      
      // Auto-select the new address based on its type
      if (newAddress.address_type === 'billing' || newAddress.address_type === 'both') {
        setSelectedBillingAddress(newAddressData);
      }
      if (newAddress.address_type === 'shipping' || newAddress.address_type === 'both') {
        setSelectedShippingAddress(newAddressData);
      }
      
      setShowAddressForm(false);
      setNewAddress({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'USA',
        address_type: 'both',
        is_default: false
      });

      alert('Address added successfully!');
    } catch (error: any) {
      alert('Failed to add address: ' + error.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    if (method === 'cod' || method === 'credit') {
      setShowPaymentForm(false);
    } else {
      setShowPaymentForm(true);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedShippingAddress) {
      alert('Please select both billing and shipping addresses');
      return;
    }
    if (!selectedBillingAddress) {
    setSelectedBillingAddress(selectedShippingAddress);
  }
    setCurrentStep('payment');
  };

  const handleStripePayment = async () => {
    if (!stripe || !elements) {
      alert("Stripe has not loaded properly!");
      return;
    }

    try {
      const { data, error: paymentIntentError } = await supabase.functions.invoke('create-payment-intent', {
        body: JSON.stringify({
          amount: Math.round(total * 100),
          currency: "usd"
        })
      });

      if (paymentIntentError) {
        throw paymentIntentError;
      }

      const cardElement = elements.getElement(CardElement);
      const address = {
        line1: selectedBillingAddress?.address_line1?.trim() || 'N/A',
        city: selectedBillingAddress?.city?.replace(/,$/, '').trim() || 'N/A',
        state: selectedBillingAddress?.state?.trim() || 'N/A',
        postal_code: selectedBillingAddress?.postal_code?.trim() || '00000',
        country: selectedBillingAddress?.country?.trim() === 'USA' ? 'US' : selectedBillingAddress?.country?.trim() || 'US',
      };

      const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement!,
          billing_details: {
            name: cardName || selectedBillingAddress?.full_name || `${profile?.first_name} ${profile?.last_name}`,
            email: profile?.email,
            phone: selectedBillingAddress?.phone,
            address,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await createOrder(paymentIntent.id);
      }
    } catch (error: any) {
      console.error(`Payment failed ${error}`);
      setLoading(false);
      alert(`Payment failed ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (paymentIntentId?: string) => {
    try {
      const orderNumber = 'ORD-' + Date.now().toString().slice(-8);

      let paymentStatus = 'unpaid';
      if (paymentMethod === 'cod' || paymentMethod === 'credit') {
        paymentStatus = 'unpaid';
      } else {
        paymentStatus = 'paid';
      }

      // Create order
      // Create order
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    order_number: orderNumber,
    buyer_id: profile!.id,
    seller_id: profile!.seller_id,
    status: 'pending',
    payment_status: paymentStatus,
    subtotal: subtotal,
    payment_intent_id: paymentIntentId,
    tax_amount: tax,
    total_amount: total,
    notes: `Payment method: ${paymentMethod}`,
    billing_address_id: selectedBillingAddress?.id || selectedShippingAddress.id,
    shipping_address_id: selectedShippingAddress.id,
  })
  .select()
  .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.unit_price,
        line_total: item.product.unit_price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product stock
for (const item of cart) {
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', item.product_id)
    .single();

  if (product) {
    await supabase
      .from('products')
      .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
      .eq('id', item.product_id);
  }

      }

      alert(`Order placed successfully! Order #${orderNumber}`);
      onSuccess();
    } catch (err: any) {
      alert('Failed to place order: ' + err.message);
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    setLoading(true);

    if (paymentMethod === 'stripe') {
      await handleStripePayment();
      return;
    }

    // Validate payment forms if needed
    if (showPaymentForm && paymentMethod !== 'cod' && paymentMethod !== 'credit') {
      if (paymentMethod === 'card') {
        if (!cardNumber || !cardName || !cardExpiry || !cardCVV) {
          alert('Please fill in all card details');
          setLoading(false);
          return;
        }
      } else if (paymentMethod === 'paypal') {
        if (!paypalEmail) {
          alert('Please enter your PayPal email');
          setLoading(false);
          return;
        }
      } else if (paymentMethod === 'netbanking') {
        if (!bankName) {
          alert('Please select your bank');
          setLoading(false);
          return;
        }
      }
    }

    await createOrder();
  };

  const OrderSummary = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
      <div className="space-y-3 mb-4">
        {cart.map((item) => (
          <div key={item.product_id} className="flex justify-between text-sm">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{item.product.name}</p>
              <p className="text-slate-600">Qty: {item.quantity}</p>
            </div>
            <p className="font-medium text-slate-900">
              ${(item.product.unit_price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Tax (10%)</span>
          <span className="font-medium text-slate-900">${tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
          <span className="text-slate-900">Total</span>
          <span className="text-slate-900">${total.toFixed(2)}</span>
        </div>
      </div>
      {currentStep === 'payment' && (
        <button
          onClick={handlePlaceOrder}
          disabled={!paymentMethod || loading || (paymentMethod === 'stripe' && (!stripe || !elements))}
          className="w-full mt-6 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      )}
    </div>
  );

  if (loadingAddress) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // Filter addresses by type for better UX
  const billingAddresses = addresses.filter(addr => addr.address_type === 'billing' || addr.address_type === 'both');
  const shippingAddresses = addresses.filter(addr => addr.address_type === 'shipping' || addr.address_type === 'both');

  // Address Step
  if (currentStep === 'address') {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
            <p className="text-slate-600 mt-1">Step 1 of 2: Shipping & Billing Address</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Address Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Billing Address <span className="text-sm font-normal text-slate-500">(Optional)</span>
                </h2>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Add New Address
                </button>
              </div>

              {billingAddresses.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <p>No billing addresses found. Please add an address to continue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {billingAddresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedBillingAddress(address)}
                      className={`p-4 border-2 rounded-lg text-left transition ${
                        selectedBillingAddress?.id === address.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900">{address.full_name}</p>
                        {address.is_default && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{address.phone}</p>
                      <p className="text-sm text-slate-600">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-sm text-slate-600">
                        {address.city}, {address.state} {address.postal_code}
                      </p>
                      <p className="text-sm text-slate-600">{address.country}</p>
                      <p className="text-xs text-slate-500 mt-2 capitalize">
                        {address.address_type} address
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-600 mb-4">
  If not selected, your shipping address will be used for billing.
</p>
            </div>
            

            {/* Shipping Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h2>
              {shippingAddresses.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <p>No shipping addresses found. Please add an address to continue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shippingAddresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedShippingAddress(address)}
                      className={`p-4 border-2 rounded-lg text-left transition ${
                        selectedShippingAddress?.id === address.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-slate-900">{address.full_name}</p>
                        {address.is_default && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{address.phone}</p>
                      <p className="text-sm text-slate-600">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-sm text-slate-600">
                        {address.city}, {address.state} {address.postal_code}
                      </p>
                      <p className="text-sm text-slate-600">{address.country}</p>
                      <p className="text-xs text-slate-500 mt-2 capitalize">
                        {address.address_type} address
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Address Form */}
            {showAddressForm && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Address</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={newAddress.full_name}
                        onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={newAddress.address_line1}
                      onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={newAddress.address_line2}
                      onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Country
                      </label>
                      <select
                        value={newAddress.country}
                        onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="USA">United States</option>
                        <option value="CAN">Canada</option>
                        <option value="MEX">Mexico</option>
                        <option value="GBR">United Kingdom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Address Type
                      </label>
                      <select
                        value={newAddress.address_type}
                        onChange={(e) => setNewAddress({ ...newAddress, address_type: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="billing">Billing Only</option>
                        <option value="shipping">Shipping Only</option>
                        <option value="both">Both Billing & Shipping</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_default" className="text-sm text-slate-700">
                      Set as default address
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAddressForm(false)}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddAddress}
                      disabled={savingAddress}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {savingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToPayment}
              disabled={ !selectedShippingAddress}
              className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Payment
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary />
          </div>
        </div>
      </div>
    );
  }

  // Payment Step
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentStep('address')} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
          <p className="text-slate-600 mt-1">Step 2 of 2: Payment Method</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Method Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Payment Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handlePaymentMethodSelect(option.id)}
                  className={`flex items-start gap-4 p-4 border-2 rounded-lg transition text-left ${
                    paymentMethod === option.id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paymentMethod === option.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{option.name}</p>
                    <p className="text-sm text-slate-600">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Forms */}
          {showPaymentForm && paymentMethod === 'stripe' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Stripe Payment</h2>
              <label className='block text-sm font-medium text-slate-700 mb-2'>Card Details</label>
              <div className='border border-slate-300  rounded-lg p-3'>
                <CardElement options={{ style: { base: { fontSize: '14px' } }, hidePostalCode: true }} />
              </div>
            </div>
          )}

          {showPaymentForm && paymentMethod === 'card' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Card Payment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">CVV</label>
                    <input
                      type="text"
                      value={cardCVV}
                      onChange={(e) => setCardCVV(e.target.value)}
                      placeholder="123"
                      maxLength={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {showPaymentForm && paymentMethod === 'paypal' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">PayPal Payment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    You will be redirected to PayPal to complete the payment securely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showPaymentForm && paymentMethod === 'netbanking' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Net Banking</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Your Bank</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="">Choose your bank...</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="sbi">State Bank of India</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                    <option value="other">Other Bank</option>
                  </select>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    You will be redirected to your bank's website to complete the transaction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'credit' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Credit Terms</h2>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800 mb-2">
                  <strong>Using Credit:</strong> This order will be added to your credit balance.
                </p>
                <ul className="text-sm text-purple-700 space-y-1 ml-4 list-disc">
                  <li>Credit Limit: Check your available limit</li>
                  <li>Payment will be due as per credit terms</li>
                  <li>Invoice will be sent after order confirmation</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary />
        </div>
      </div>
    </div>
  );
}