import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, DollarSign, FileText, Download, Calendar, AlertCircle } from 'lucide-react';

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalUnpaid: 0,
    totalOverdue: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      loadSellerProfile();
      loadPayments();
    }
  }, [profile]);

  useEffect(() => {
    filterPayments();
    calculateStats();
  }, [payments, searchTerm, statusFilter]);

  const loadSellerProfile = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (error) {
      console.error('Error loading seller profile:', error);
    } else {
      setSellerProfile(data);
    }
  };

  const loadPayments = async () => {
    if (!profile?.id) return;

    setLoading(true);
    
    try {
      // First, get orders with buyer info
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:buyer_id(first_name, last_name, business_name, email, phone, address)
        `)
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        setPayments([]);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // Then, get order items for each order - simplified query without variant
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              product:product_id(name, sku, unit_price)
            `)
            .eq('order_id', order.id);

          if (itemsError) {
            console.error('Error loading order items:', itemsError);
            return { ...order, order_items: [] };
          }

          return { ...order, order_items: itemsData || [] };
        })
      );

      setPayments(ordersWithItems);
    } catch (error) {
      console.error('Error in loadPayments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter((p) =>
          p.payment_status === 'unpaid' &&
          p.due_date &&
          new Date(p.due_date) < new Date()
        );
      } else {
        filtered = filtered.filter((p) => p.payment_status === statusFilter);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.buyer?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.buyer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.buyer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  };

  const calculateStats = () => {
    const totalPaid = payments
      .filter((p) => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const totalUnpaid = payments
      .filter((p) => p.payment_status === 'unpaid')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const totalOverdue = payments
      .filter((p) =>
        p.payment_status === 'unpaid' &&
        p.due_date &&
        new Date(p.due_date) < new Date()
      )
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    setStats({ totalPaid, totalUnpaid, totalOverdue });
  };

  const getPaymentStatusColor = (status: string, dueDate?: string) => {
    if (status === 'unpaid' && dueDate && new Date(dueDate) < new Date()) {
      return 'bg-red-100 text-red-800';
    }
    const colors: any = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const generateInvoicePDF = (order: any) => {
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) return;

    // Use seller's business info or fallback to personal info
    const companyName = sellerProfile?.business_name || `${sellerProfile?.first_name || ''} ${sellerProfile?.last_name || ''}`.trim() || 'Your Company';
    const companyAddress = sellerProfile?.address || 'N/A';
    const companyCityState = sellerProfile?.city && sellerProfile?.state ? `${sellerProfile.city}, ${sellerProfile.state} ${sellerProfile.zip_code || ''}`.trim() : 'N/A';
    const companyEmail = sellerProfile?.email || 'contact@yourcompany.com';
    const companyPhone = sellerProfile?.phone || 'N/A';

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.order_number}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333;
          }
          .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            border: 1px solid #ddd; 
            padding: 30px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .company-info h1 { 
            margin: 0; 
            color: #1e293b;
          }
          .invoice-info { 
            text-align: right;
          }
          .invoice-details { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px; 
            margin-bottom: 30px;
          }
          .section { 
            margin-bottom: 20px;
          }
          .section h3 { 
            border-bottom: 1px solid #ddd; 
            padding-bottom: 5px; 
            margin-bottom: 10px;
            color: #475569;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left;
          }
          th { 
            background-color: #f8fafc; 
            font-weight: bold;
          }
          .totals { 
            margin-top: 20px; 
            text-align: right;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0;
          }
          .grand-total { 
            font-size: 1.2em; 
            font-weight: bold; 
            border-top: 2px solid #333; 
            padding-top: 10px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-paid { background: #dcfce7; color: #166534; }
          .status-unpaid { background: #fef3c7; color: #92400e; }
          .status-overdue { background: #fee2e2; color: #991b1b; }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #64748b; 
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .logo { 
            max-width: 150px; 
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <h1>INVOICE</h1>
              <p><strong>${companyName}</strong></p>
              <p>${companyAddress}</p>
              <p>${companyCityState}</p>
              <p>${companyEmail}</p>
              ${companyPhone !== 'N/A' ? `<p>${companyPhone}</p>` : ''}
            </div>
            <div class="invoice-info">
              <h2>${order.order_number || 'N/A'}</h2>
              <p><strong>Invoice Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${order.due_date ? new Date(order.due_date).toLocaleDateString() : 'N/A'}</p>
              <span class="status-badge ${
                order.payment_status === 'paid' ? 'status-paid' : 
                (order.payment_status === 'unpaid' && order.due_date && new Date(order.due_date) < new Date() ? 'status-overdue' : 'status-unpaid')
              }">
                ${order.payment_status === 'paid' ? 'Paid' : 
                  (order.payment_status === 'unpaid' && order.due_date && new Date(order.due_date) < new Date() ? 'Overdue' : order.payment_status || 'Pending')}
              </span>
            </div>
          </div>

          <div class="invoice-details">
            <div class="section">
              <h3>Bill From</h3>
              <p><strong>${companyName}</strong></p>
              <p>${companyAddress}</p>
              <p>${companyCityState}</p>
              <p>${companyEmail}</p>
              ${companyPhone !== 'N/A' ? `<p>${companyPhone}</p>` : ''}
            </div>
            <div class="section">
              <h3>Bill To</h3>
              <p><strong>${order.buyer?.business_name || `${order.buyer?.first_name || ''} ${order.buyer?.last_name || ''}`.trim() || 'Customer'}</strong></p>
              <p>${order.buyer?.email || 'N/A'}</p>
              <p>${order.buyer?.phone || 'N/A'}</p>
              <p>${order.buyer?.address || 'N/A'}</p>
            </div>
          </div>

          <div class="section">
            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.order_items?.map((item: any) => `
                  <tr>
                    <td>${item.product?.name || 'Product'}</td>
                    <td>${item.product?.sku || 'N/A'}</td>
                    <td>${item.quantity || 0}</td>
                    <td>$${(item.unit_price || 0).toFixed(2)}</td>
                    <td>$${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="5">No items</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${(order.subtotal || 0).toFixed(2)}</span>
            </div>
            ${order.tax_amount ? `
            <div class="total-row">
              <span>Tax:</span>
              <span>$${(order.tax_amount || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            ${order.shipping_amount ? `
            <div class="total-row">
              <span>Shipping:</span>
              <span>$${(order.shipping_amount || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            ${order.discount_amount ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-$${(order.discount_amount || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>Total Amount:</span>
              <span>$${(order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is an computer-generated invoice. No signature required.</p>
            ${sellerProfile?.business_name ? `<p><strong>${sellerProfile.business_name}</strong></p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    invoiceWindow.document.write(invoiceHTML);
    invoiceWindow.document.close();

    setTimeout(() => {
      invoiceWindow.print();
    }, 500);
  };

  const handleDownloadInvoice = (order: any) => {
    generateInvoicePDF(order);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments & Invoices</h1>
          <p className="text-slate-600 mt-1">Track payments and manage invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Paid</p>
              <p className="text-3xl font-bold text-green-600">
                ${stats.totalPaid.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {payments.filter((p) => p.payment_status === 'paid').length} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Outstanding</p>
              <p className="text-3xl font-bold text-yellow-600">
                ${stats.totalUnpaid.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {payments.filter((p) => p.payment_status === 'unpaid').length} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-600">
                ${stats.totalOverdue.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {payments.filter((p) =>
                  p.payment_status === 'unpaid' &&
                  p.due_date &&
                  new Date(p.due_date) < new Date()
                ).length} invoices
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order number or buyer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {payments.length === 0 ? 'No invoices found' : 'No matching invoices'}
            </h3>
            <p className="text-slate-600">
              {payments.length === 0 
                ? 'Invoices will appear here when orders are placed' 
                : 'Try adjusting your filters'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider">
                    Due Date
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
                {filteredPayments.map((payment) => {
                  const isOverdue = payment.payment_status === 'unpaid' &&
                    payment.due_date &&
                    new Date(payment.due_date) < new Date();

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{payment.order_number || 'N/A'}</div>
                        <div className="text-sm text-slate-600">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {payment.buyer?.business_name || `${payment.buyer?.first_name || ''} ${payment.buyer?.last_name || ''}`.trim() || 'N/A'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {payment.buyer?.email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          ${payment.total_amount?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-xs text-slate-600">
                          Subtotal: ${payment.subtotal?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {payment.due_date ? (
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(payment.due_date).toLocaleDateString()}
                            </div>
                            {isOverdue && (
                              <div className="text-xs mt-1">Overdue</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.payment_status, payment.due_date)}`}>
                          {isOverdue ? 'Overdue' : payment.payment_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadInvoice(payment)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}