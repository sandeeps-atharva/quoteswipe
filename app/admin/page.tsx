'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Mail, Calendar, Quote, Send, CheckCircle2, XCircle, 
  Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle,
  PartyPopper, ArrowLeft, CalendarDays
} from 'lucide-react';
import FestivalCalendar from '@/components/FestivalCalendar';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  likes_count: number;
  saved_count: number;
}

interface Festival {
  id: number;
  name: string;
  date: string;
  description: string;
  quotes_count: number;
}

interface QuoteItem {
  id: number;
  text: string;
  author: string;
  category_name: string;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  festival_name: string;
  quote_text: string;
  quote_author: string;
  sent_by_name: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'calendar' | 'history'>('send');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });
  const [sendToAll, setSendToAll] = useState(false);
  
  // Festivals & Quotes state
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<number | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<number | null>(null);
  
  // Email state
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Campaign history
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Scheduled emails state
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/');
          return;
        }
        
        const data = await res.json();
        if (data.user?.role !== 'admin') {
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
        setIsLoading(false);
      } catch {
        router.push('/');
      }
    };
    
    checkAdmin();
  }, [router]);

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/admin/users?search=${userSearch}&page=${userPage}&limit=20`);
        const data = await res.json();
        
        if (data.users) {
          setUsers(data.users);
          setUserPagination(data.pagination);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isAdmin, userSearch, userPage]);

  // Fetch festivals
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchFestivals = async () => {
      try {
        const res = await fetch('/api/admin/festivals');
        const data = await res.json();
        
        if (data.festivals) {
          setFestivals(data.festivals);
        }
      } catch (error) {
        console.error('Error fetching festivals:', error);
      }
    };
    
    fetchFestivals();
  }, [isAdmin]);

  // Fetch quotes
  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes?limit=100');
        const data = await res.json();
        
        if (data.quotes) {
          setQuotes(data.quotes.map((q: any) => ({
            id: q.id,
            text: q.text,
            author: q.author,
            category_name: q.category_name || 'General',
          })));
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
      }
    };
    
    fetchQuotes();
  }, [isAdmin]);

  // Fetch campaign history
  useEffect(() => {
    if (!isAdmin || activeTab !== 'history') return;
    
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/admin/send-email');
        const data = await res.json();
        
        if (data.campaigns) {
          setCampaigns(data.campaigns);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };
    
    fetchCampaigns();
  }, [isAdmin, activeTab]);

  // Fetch scheduled emails
  const fetchScheduledEmails = async () => {
    try {
      const res = await fetch(`/api/admin/scheduled-emails?month=${calendarMonth}&year=${calendarYear}`);
      const data = await res.json();
      if (data.scheduledEmails) {
        setScheduledEmails(data.scheduledEmails);
      }
    } catch (error) {
      console.error('Error fetching scheduled emails:', error);
    }
  };

  useEffect(() => {
    if (!isAdmin || activeTab !== 'calendar') return;
    fetchScheduledEmails();
  }, [isAdmin, activeTab, calendarMonth, calendarYear]);

  // Schedule email handler
  const handleScheduleEmail = async (data: {
    title: string;
    subject: string;
    scheduled_date: string;
    scheduled_time: string;
    quote_id: number | null;
    custom_message: string;
    user_ids: number[];
  }) => {
    const res = await fetch('/api/admin/scheduled-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to schedule email');
    }
  };

  // Delete scheduled email handler
  const handleDeleteScheduled = async (id: number) => {
    const res = await fetch(`/api/admin/scheduled-emails?id=${id}`, {
      method: 'DELETE',
    });
    
    if (res.ok) {
      fetchScheduledEmails();
    }
  };

  // Auto-trigger scheduled emails every minute when admin page is open
  useEffect(() => {
    if (!isAdmin) return;

    const triggerScheduledEmails = async () => {
      try {
        const res = await fetch('/api/cron/send-scheduled-emails');
        const data = await res.json();
        if (data.processed > 0) {
          console.log(`[Auto-trigger] Sent ${data.processed} scheduled email(s)`);
          fetchScheduledEmails(); // Refresh the list
        }
      } catch (error) {
        console.error('[Auto-trigger] Error:', error);
      }
    };

    // Trigger immediately on load
    triggerScheduledEmails();

    // Then trigger every 30 seconds for faster response
    const interval = setInterval(triggerScheduledEmails, 30000);

    return () => clearInterval(interval);
  }, [isAdmin]);

  // Toggle user selection
  const toggleUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Select all visible users
  const selectAllVisible = () => {
    const visibleIds = users.map(u => u.id);
    const allSelected = visibleIds.every(id => selectedUsers.includes(id));
    
    if (allSelected) {
      setSelectedUsers(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedUsers(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  // Send emails
  const handleSendEmails = async () => {
    if (!selectedFestival || !selectedQuote || !subject) {
      setSendResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }
    
    if (!sendToAll && selectedUsers.length === 0) {
      setSendResult({ success: false, message: 'Please select at least one user or choose "Send to All"' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: sendToAll ? [] : selectedUsers,
          festivalId: selectedFestival,
          quoteId: selectedQuote,
          subject,
          customMessage,
          sendToAll,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSendResult({
          success: true,
          message: `Successfully sent ${data.stats.sent} emails! ${data.stats.failed > 0 ? `(${data.stats.failed} failed)` : ''}`,
        });
        // Reset form
        setSelectedUsers([]);
        setSendToAll(false);
        setSubject('');
        setCustomMessage('');
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send emails' });
      }
    } catch (error) {
      setSendResult({ success: false, message: 'An error occurred while sending emails' });
    } finally {
      setIsSending(false);
    }
  };

  // Update subject when festival changes
  useEffect(() => {
    if (selectedFestival) {
      const festival = festivals.find(f => f.id === selectedFestival);
      if (festival) {
        setSubject(`🎉 Happy ${festival.name} from QuoteSwipe!`);
      }
    }
  }, [selectedFestival, festivals]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-400">Manage users & send festival emails</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('send')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'send'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Send className="w-4 h-4 inline mr-2" />
                Send Now
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <CalendarDays className="w-4 h-4 inline mr-2" />
                Schedule
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                History
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'send' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Selection */}
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Select Recipients
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendToAll}
                    onChange={(e) => {
                      setSendToAll(e.target.checked);
                      if (e.target.checked) setSelectedUsers([]);
                    }}
                    className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Send to all users</span>
                </label>
              </div>

              {!sendToAll && (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                    />
                  </div>

                  {/* Select all */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={selectAllVisible}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      {users.every(u => selectedUsers.includes(u.id)) ? 'Deselect all' : 'Select all visible'}
                    </button>
                    <span className="text-sm text-gray-400">
                      {selectedUsers.length} selected
                    </span>
                  </div>

                  {/* User list */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
                    {users.map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id)
                            ? 'bg-purple-600/20 border border-purple-500/50'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-sm text-gray-400 truncate">{user.email}</p>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          <p>❤️ {user.likes_count}</p>
                          <p>📚 {user.saved_count}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Pagination */}
                  {userPagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button
                        onClick={() => setUserPage(p => Math.max(1, p - 1))}
                        disabled={userPage === 1}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-400">
                        Page {userPage} of {userPagination.totalPages}
                      </span>
                      <button
                        onClick={() => setUserPage(p => Math.min(userPagination.totalPages, p + 1))}
                        disabled={userPage === userPagination.totalPages}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {sendToAll && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <p className="text-sm text-yellow-200">
                    This will send emails to all registered users ({userPagination.total} users)
                  </p>
                </div>
              )}
            </div>

            {/* Email Configuration */}
            <div className="space-y-6">
              {/* Festival Selection */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-pink-400" />
                  Select Festival
                </h2>
                <select
                  value={selectedFestival || ''}
                  onChange={(e) => setSelectedFestival(Number(e.target.value) || null)}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="" className="bg-slate-800">Choose a festival...</option>
                  {festivals.map(festival => (
                    <option key={festival.id} value={festival.id} className="bg-slate-800">
                      {festival.name} ({new Date(festival.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quote Selection */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Quote className="w-5 h-5 text-blue-400" />
                  Select Quote
                </h2>
                <select
                  value={selectedQuote || ''}
                  onChange={(e) => setSelectedQuote(Number(e.target.value) || null)}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="" className="bg-slate-800">Choose a quote...</option>
                  {quotes.map(quote => (
                    <option key={quote.id} value={quote.id} className="bg-slate-800">
                      {quote.text.substring(0, 50)}... — {quote.author}
                    </option>
                  ))}
                </select>
                
                {selectedQuote && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg border-l-4 border-purple-500">
                    <p className="text-sm italic">
                      "{quotes.find(q => q.id === selectedQuote)?.text}"
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      — {quotes.find(q => q.id === selectedQuote)?.author}
                    </p>
                  </div>
                )}
              </div>

              {/* Email Details */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-green-400" />
                  Email Details
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Subject *</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject line..."
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Custom Message (optional)</label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add a personal message..."
                      rows={3}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendEmails}
                disabled={isSending || !selectedFestival || !selectedQuote || !subject || (!sendToAll && selectedUsers.length === 0)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Festival Email
                  </>
                )}
              </button>

              {/* Result Message */}
              {sendResult && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  sendResult.success
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {sendResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={sendResult.success ? 'text-green-200' : 'text-red-200'}>
                    {sendResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'calendar' ? (
          /* Schedule Calendar */
          <FestivalCalendar
            scheduledEmails={scheduledEmails}
            users={users}
            quotes={quotes}
            onTriggerSend={async () => {
              const res = await fetch('/api/cron/send-scheduled-emails');
              return res.json();
            }}
            onScheduleEmail={handleScheduleEmail}
            onDeleteScheduled={handleDeleteScheduled}
            onRefresh={fetchScheduledEmails}
          />
        ) : (
          /* Campaign History */
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Mail className="w-5 h-5 text-purple-400" />
              Email Campaign History
            </h2>

            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <PartyPopper className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No campaigns sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map(campaign => (
                  <div
                    key={campaign.id}
                    className="p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{campaign.subject}</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {campaign.festival_name} • {new Date(campaign.created_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 italic truncate">
                          &quot;{campaign.quote_text?.substring(0, 60)}...&quot;
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : campaign.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {campaign.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : campaign.status === 'failed' ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                          {campaign.status}
                        </span>
                        <p className="text-sm text-gray-400 mt-2">
                          ✅ {campaign.sent_count} / ❌ {campaign.failed_count} / 📧 {campaign.total_recipients}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

