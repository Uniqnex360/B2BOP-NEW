import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Send } from 'lucide-react';

export default function BuyerMessagesPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    loadSellerInfo();
  }, [profile]);

  const loadSellerInfo = async () => {
    if (!profile?.seller_id) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, business_name')
      .eq('id', profile.seller_id)
      .maybeSingle();

    setSellerInfo(data);
  };

  const loadMessages = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    setConversations(data || []);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!profile?.id || !sellerInfo?.id) {
      alert('Unable to send message. Please refresh the page.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: sellerInfo.id,
        subject: subject.trim() || 'New Message',
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      setSubject('');
      loadMessages();
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-600 mt-1">Communicate with your seller</p>
      </div>

      {sellerInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              {sellerInfo.first_name?.[0]}{sellerInfo.last_name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                Messaging: {sellerInfo.business_name || `${sellerInfo.first_name} ${sellerInfo.last_name}`}
              </p>
              <p className="text-sm text-slate-600">{sellerInfo.email}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-4">Conversations</h2>
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 10).map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition"
                >
                  <p className="font-medium text-slate-900 text-sm">{msg.subject || 'No Subject'}</p>
                  <p className="text-xs text-slate-600 line-clamp-1">{msg.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex flex-col h-[600px]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Send Message to Seller</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Order inquiry, Product question, etc."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No conversation history yet</p>
                    <p className="text-sm text-slate-500 mt-2">Send your first message above</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700 mb-2">Conversation History</h4>
                  {conversations.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        msg.sender_id === profile?.id
                          ? 'bg-blue-100 ml-8'
                          : 'bg-white mr-8'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-slate-900 text-sm">
                          {msg.sender_id === profile?.id ? 'You' : sellerInfo?.business_name || 'Seller'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      {msg.subject && (
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {msg.subject}
                        </p>
                      )}
                      <p className="text-sm text-slate-600">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
