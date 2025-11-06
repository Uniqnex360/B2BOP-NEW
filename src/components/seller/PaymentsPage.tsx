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
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalUnpaid: 0,
    totalOverdue: 0,
  });

  useEffect(() => {
    loadPayments();
  }, [profile]);

  useEffect(() => {
    filterPayments();
    calculateStats();
  }, [payments, searchTerm, statusFilter]);

  const loadPayments = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:user_profiles!orders_buyer_id_fkey(first_name, last_name, business_name, email)
      `)
      .eq('seller_id', profile.id)
      .order('created_at', { ascending: false });

    setPayments(ordersData || []);
    setLoading(false);
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
        p.buyer?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleDownloadInvoice = (order: any) => {
    alert(`Invoice download for ${order.order_number} will be implemented soon`);
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
            <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices found</h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Invoices will appear here when orders are placed'}
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
                        <div className="font-medium text-slate-900">{payment.order_number}</div>
                        <div className="text-sm text-slate-600">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          {payment.buyer?.business_name || 'N/A'}
                        </div>
                        <div className="text-sm text-slate-600">
                          {payment.buyer?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">
                          ${payment.total_amount?.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-600">
                          Subtotal: ${payment.subtotal?.toFixed(2)}
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
                          {isOverdue ? 'Overdue' : payment.payment_status}
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
