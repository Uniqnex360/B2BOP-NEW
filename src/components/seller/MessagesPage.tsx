import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Send, MessageCircle, User } from 'lucide-react';

export default function MessagesPage() {
  const { profile } = useAuth();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBuyers();
  }, [profile]);

  useEffect(() => {
    if (selectedBuyer) {
      loadMessages(selectedBuyer.id);
      markMessagesAsRead(selectedBuyer.id);
    }
  }, [selectedBuyer]);

  useEffect(() => {
    // Load unread counts for all buyers
    loadUnreadCounts();
  }, [buyers]);

  const loadBuyers = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('seller_id', profile.id)
      .eq('role', 'buyer')
      .order('business_name');

    setBuyers(data || []);
    setLoading(false);
  };

  const loadMessages = async (buyerId: string) => {
    if (!profile?.id) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${buyerId}),and(sender_id.eq.${buyerId},recipient_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  };

  const loadUnreadCounts = async () => {
    if (!profile?.id || buyers.length === 0) return;

    const buyerIds = buyers.map(buyer => buyer.id);
    
    const { data } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('recipient_id', profile.id)
      .in('sender_id', buyerIds)
      .eq('is_read', false);

    const counts: Record<string, number> = {};
    data?.forEach(msg => {
      counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
    });

    setUnreadCounts(counts);
  };

  const markMessagesAsRead = async (buyerId: string) => {
    if (!profile?.id) return;

    // Mark all messages from this buyer as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', buyerId)
      .eq('recipient_id', profile.id)
      .eq('is_read', false);

    // Update local unread counts
    setUnreadCounts(prev => ({
      ...prev,
      [buyerId]: 0
    }));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!selectedBuyer || !profile?.id) {
      alert('Please select a buyer first');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: selectedBuyer.id,
        subject: subject.trim() || 'Response from Seller',
        message: newMessage.trim(),
        is_read: false,
      });

      if (error) throw error;

      setNewMessage('');
      setSubject('');
      loadMessages(selectedBuyer.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredBuyers = buyers.filter((buyer) =>
    buyer.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <p className="text-slate-600 mt-1">Communicate with your buyers</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '600px' }}>
        <div className="flex h-full">
          {/* Sidebar with buyers list */}
          <div className="w-80 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search buyers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredBuyers.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-center">
                  <div>
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">No buyers found</p>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {filteredBuyers.map((buyer) => {
                    const unreadCount = unreadCounts[buyer.id] || 0;
                    const hasUnread = unreadCount > 0;
                    
                    return (
                      <button
                        key={buyer.id}
                        onClick={() => setSelectedBuyer(buyer)}
                        className={`w-full text-left p-3 rounded-lg mb-2 transition relative ${
                          selectedBuyer?.id === buyer.id
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'hover:bg-slate-50 border-2 border-transparent'
                        } ${hasUnread ? 'bg-blue-25' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold shrink-0">
                              {buyer.first_name?.[0]}{buyer.last_name?.[0]}
                            </div>
                            {hasUnread && (
                              <div className="absolute -top-1 -right-1">
                                <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center px-1">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium truncate ${
                                hasUnread ? 'text-blue-900 font-semibold' : 'text-slate-900'
                              }`}>
                                {buyer.business_name || `${buyer.first_name} ${buyer.last_name}`}
                              </p>
                            </div>
                            <p className="text-xs text-slate-600 truncate">{buyer.email}</p>
                            {hasUnread && (
                              <p className="text-xs text-blue-600 font-medium mt-1">
                                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col">
            {selectedBuyer ? (
              <>
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {selectedBuyer.first_name?.[0]}{selectedBuyer.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {selectedBuyer.business_name || `${selectedBuyer.first_name} ${selectedBuyer.last_name}`}
                      </p>
                      <p className="text-sm text-slate-600">{selectedBuyer.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600">No messages yet</p>
                        <p className="text-sm text-slate-500 mt-2">Start the conversation below</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-lg max-w-[80%] ${
                            msg.sender_id === profile?.id
                              ? 'bg-blue-100 ml-auto'
                              : 'bg-white mr-auto'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-slate-900 text-sm">
                              {msg.sender_id === profile?.id ? 'You' : selectedBuyer.business_name || 'Buyer'}
                            </p>
                            <p className="text-xs text-slate-500 ml-3">
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                          {msg.subject && msg.subject !== 'Response from Seller' && msg.subject !== 'New Message' && (
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

                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Subject (optional)"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <div className="flex gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        rows={2}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">Select a buyer to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}