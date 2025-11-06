import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CreditCard, Wallet, Building, DollarSign, Truck } from 'lucide-react';

interface CheckoutPageProps {
  cart: any[];
  onBack: () => void;
  onSuccess: () => void;
}

export default function CheckoutPage({ cart, onBack, onSuccess }: CheckoutPageProps) {
  const { profile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

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
    { id: 'cod', name: 'Cash on Delivery', icon: DollarSign, description: 'Pay when you receive' },
    { id: 'credit', name: 'Credit Terms', icon: Truck, description: 'Use credit limit' },
  ];

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    if (method === 'cod' || method === 'credit') {
      setShowPaymentForm(false);
    } else {
      setShowPaymentForm(true);
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    // Validate payment forms if needed
    if (showPaymentForm && paymentMethod !== 'cod' && paymentMethod !== 'credit') {
      if (paymentMethod === 'card' || paymentMethod === 'stripe') {
        if (!cardNumber || !cardName || !cardExpiry || !cardCVV) {
          alert('Please fill in all card details');
          return;
        }
      } else if (paymentMethod === 'paypal') {
        if (!paypalEmail) {
          alert('Please enter your PayPal email');
          return;
        }
      } else if (paymentMethod === 'netbanking') {
        if (!bankName) {
          alert('Please select your bank');
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Generate order number
      const orderNumber = 'ORD-' + Date.now().toString().slice(-8);

      // Determine payment status based on method
      let paymentStatus = 'unpaid';
      if (paymentMethod === 'cod') {
        paymentStatus = 'unpaid';
      } else if (paymentMethod === 'credit') {
        paymentStatus = 'unpaid';
      } else {
        // For online payments, mark as paid (in real app, wait for payment gateway response)
        paymentStatus = 'paid';
      }

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
          tax_amount: tax,
          total_amount: total,
          notes: `Payment method: ${paymentMethod}`,
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
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', item.product_id);
        }
      }

      alert(`Order placed successfully! Order #${orderNumber}`);
      onSuccess();
    } catch (err: any) {
      alert('Failed to place order: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
          <p className="text-slate-600 mt-1">Complete your purchase</p>
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

          {paymentMethod === 'cod' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Cash on Delivery</h2>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Note:</strong> You will pay in cash when the order is delivered to you.
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 ml-4 list-disc">
                  <li>Keep exact amount ready for faster delivery</li>
                  <li>Payment is collected by delivery personnel</li>
                  <li>Inspect products before payment</li>
                </ul>
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
            <button
              onClick={handlePlaceOrder}
              disabled={!paymentMethod || loading}
              className="w-full mt-6 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
