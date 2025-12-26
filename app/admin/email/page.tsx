'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Mail,
  Calendar,
  Quote,
  Send,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Eye,
  Sparkles,
  Check,
  MessageSquare,
  Image,
  X,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import toast from 'react-hot-toast';

interface User {
  id: string;
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
}

interface QuoteItem {
  id: string | number;
  text: string;
  author: string;
  category_name: string;
}

type EmailType = 'festival' | 'custom';

export default function EmailPage() {
  // Email type
  const [emailType, setEmailType] = useState<EmailType>('custom');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });
  const [sendToAll, setSendToAll] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Festivals & Quotes state
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<number | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string | number | null>(null);
  const [quoteSearch, setQuoteSearch] = useState('');

  // Email state
  const [subject, setSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?search=${userSearch}&page=${userPage}&limit=20`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setUserPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userSearch, userPage]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  // Fetch festivals
  useEffect(() => {
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
  }, []);

  // Fetch quotes
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes?limit=200');
        const data = await res.json();
        if (data.quotes) {
          setQuotes(
            data.quotes.map((q: any) => ({
              id: q.id,
              text: q.text,
              author: q.author,
              category_name: q.category_name || 'General',
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
      }
    };
    fetchQuotes();
  }, []);

  // Update subject when festival changes
  useEffect(() => {
    if (selectedFestival && emailType === 'festival') {
      const festival = festivals.find((f) => f.id === selectedFestival);
      if (festival) {
        setSubject(`🎉 Happy ${festival.name} from QuoteSwipe!`);
      }
    }
  }, [selectedFestival, festivals, emailType]);

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Select all visible users
  const selectAllVisible = () => {
    const visibleIds = users.map((u) => u.id);
    const allSelected = visibleIds.every((id) => selectedUsers.includes(id));

    if (allSelected) {
      setSelectedUsers((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedUsers((prev) => [...new Set([...prev, ...visibleIds])]);
    }
  };

  // Filter quotes
  const filteredQuotes = quotes.filter(
    (q) =>
      q.text.toLowerCase().includes(quoteSearch.toLowerCase()) ||
      q.author.toLowerCase().includes(quoteSearch.toLowerCase()) ||
      q.category_name.toLowerCase().includes(quoteSearch.toLowerCase())
  );

  // Get selected quote object
  const selectedQuoteObj = quotes.find((q) => q.id === selectedQuote);
  const selectedFestivalObj = festivals.find((f) => f.id === selectedFestival);

  // Can proceed to next step
  const canProceedStep1 = sendToAll || selectedUsers.length > 0;
  const canProceedStep2 = emailType === 'custom' 
    ? subject.trim().length > 0 
    : (selectedFestival && selectedQuote && subject.trim().length > 0);
  
  // Send emails
  const handleSendEmails = async () => {
    if (!subject) {
      toast.error('Please enter a subject');
      return;
    }

    if (!sendToAll && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    if (emailType === 'festival' && (!selectedFestival || !selectedQuote)) {
      toast.error('Please select a festival and quote');
      return;
    }

    setIsSending(true);

    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: sendToAll ? [] : selectedUsers,
          festivalId: emailType === 'festival' ? selectedFestival : null,
          quoteId: emailType === 'festival' ? selectedQuote : null,
          subject,
          customMessage,
          sendToAll,
          emailType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Successfully sent ${data.stats?.sent || 0} emails!${
            data.stats?.failed > 0 ? ` (${data.stats.failed} failed)` : ''
          }`
        );
        // Reset form
        setSelectedUsers([]);
        setSendToAll(true);
        setSubject('');
        setCustomMessage('');
        setSelectedFestival(null);
        setSelectedQuote(null);
        setCurrentStep(1);
      } else {
        toast.error(data.error || 'Failed to send emails');
      }
    } catch (error) {
      toast.error('An error occurred while sending emails');
    } finally {
      setIsSending(false);
    }
  };

  const steps = [
    { number: 1, title: 'Recipients', icon: Users },
    { number: 2, title: 'Content', icon: MessageSquare },
    { number: 3, title: 'Review', icon: Eye },
  ];

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Send Email</h1>
          <p className="text-slate-400">Create and send emails to your users</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-800" />
            <div 
              className="absolute top-5 left-0 h-0.5 bg-violet-500 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
            
            {steps.map((step) => (
              <div key={step.number} className="relative z-10 flex flex-col items-center">
                <button
                  onClick={() => {
                    if (step.number < currentStep) setCurrentStep(step.number);
                  }}
                  disabled={step.number > currentStep}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.number < currentStep
                      ? 'bg-violet-500 text-white cursor-pointer hover:bg-violet-600'
                      : step.number === currentStep
                      ? 'bg-violet-500 text-white ring-4 ring-violet-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step.number < currentStep ? (
                    <Check size={18} />
                  ) : (
                    <step.icon size={18} />
                  )}
                </button>
                <span className={`mt-2 text-xs font-medium ${
                  step.number <= currentStep ? 'text-white' : 'text-slate-500'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
          {/* Step 1: Recipients */}
          {currentStep === 1 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Select Recipients</h2>
                <label className="flex items-center gap-3 cursor-pointer bg-slate-800 px-4 py-2 rounded-xl">
                  <input
                    type="checkbox"
                    checked={sendToAll}
                    onChange={(e) => {
                      setSendToAll(e.target.checked);
                      if (e.target.checked) setSelectedUsers([]);
                    }}
                    className="w-4 h-4 rounded border-slate-600 text-violet-600 focus:ring-violet-500 bg-slate-700"
                  />
                  <span className="text-sm text-slate-300">Send to all users</span>
                  <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                    {userPagination.total}
                  </span>
                </label>
              </div>

              {sendToAll ? (
                <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <Users size={32} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">All Users Selected</p>
                    <p className="text-slate-400">
                      Your email will be sent to all {userPagination.total} registered users
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500"
                    />
                  </div>

                  {/* Select all */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <button
                      onClick={selectAllVisible}
                      className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium"
                    >
                      {users.every((u) => selectedUsers.includes(u.id))
                        ? '✓ Deselect all visible'
                        : '○ Select all visible'}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Selected:</span>
                      <span className="text-sm font-bold text-white bg-violet-500 px-3 py-1 rounded-full">
                        {selectedUsers.length}
                      </span>
                    </div>
                  </div>

                  {/* User list */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {isLoadingUsers ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                      </div>
                    ) : users.length === 0 ? (
                      <div className="text-center py-16">
                        <Users size={48} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">No users found</p>
                      </div>
                    ) : (
                      users.map((user) => (
                        <label
                          key={user.id}
                          className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                            selectedUsers.includes(user.id)
                              ? 'bg-violet-500/20 border-2 border-violet-500'
                              : 'bg-slate-800/50 border-2 border-transparent hover:bg-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedUsers.includes(user.id)
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-slate-600'
                          }`}>
                            {selectedUsers.includes(user.id) && <Check size={14} className="text-white" />}
                          </div>
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shrink-0">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{user.name}</p>
                            <p className="text-sm text-slate-400 truncate">{user.email}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  {/* Pagination */}
                  {userPagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-slate-800">
                      <button
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                        disabled={userPage === 1}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm text-slate-400">
                        Page {userPage} of {userPagination.totalPages}
                      </span>
                      <button
                        onClick={() => setUserPage((p) => Math.min(userPagination.totalPages, p + 1))}
                        disabled={userPage === userPagination.totalPages}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2: Content */}
          {currentStep === 2 && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Email Content</h2>

              {/* Email Type Tabs */}
              <div className="flex gap-2 p-1 bg-slate-800 rounded-xl mb-6">
                <button
                  onClick={() => setEmailType('custom')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                    emailType === 'custom'
                      ? 'bg-violet-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare size={18} />
                  Custom Email
                </button>
                <button
                  onClick={() => setEmailType('festival')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${
                    emailType === 'festival'
                      ? 'bg-violet-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles size={18} />
                  Festival Greeting
                </button>
              </div>

              <div className="space-y-6">
                {/* Festival Selection (only for festival type) */}
                {emailType === 'festival' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Calendar size={14} className="inline mr-2" />
                        Festival *
                      </label>
                      <select
                        value={selectedFestival || ''}
                        onChange={(e) => setSelectedFestival(Number(e.target.value) || null)}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                      >
                        <option value="">Choose a festival...</option>
                        {festivals.map((festival) => (
                          <option key={festival.id} value={festival.id}>
                            {festival.name}
                          </option>
                        ))}
                      </select>
                      {selectedFestivalObj && (
                        <p className="mt-2 text-xs text-slate-400">{selectedFestivalObj.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Quote size={14} className="inline mr-2" />
                        Quote *
                      </label>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search quotes..."
                          value={quoteSearch}
                          onChange={(e) => setQuoteSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                      <select
                        value={selectedQuote || ''}
                        onChange={(e) => setSelectedQuote(e.target.value || null)}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                      >
                        <option value="">Choose a quote...</option>
                        {filteredQuotes.slice(0, 50).map((quote) => (
                          <option key={quote.id} value={quote.id}>
                            {quote.text.substring(0, 60)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Quote Preview */}
                {emailType === 'festival' && selectedQuoteObj && (
                  <div className="p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-xl">
                    <p className="text-slate-200 italic">"{selectedQuoteObj.text}"</p>
                    <p className="text-sm text-slate-400 mt-2">— {selectedQuoteObj.author}</p>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Mail size={14} className="inline mr-2" />
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Email subject line..."
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MessageSquare size={14} className="inline mr-2" />
                    Message {emailType === 'festival' ? '(optional)' : '*'}
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder={emailType === 'festival' 
                      ? "Add a personal message (optional)..." 
                      : "Write your email message..."
                    }
                    rows={6}
                    className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Review & Send</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Summary */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Recipients</p>
                    <p className="text-lg font-semibold text-white">
                      {sendToAll ? `All Users (${userPagination.total})` : `${selectedUsers.length} Selected`}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Email Type</p>
                    <p className="text-lg font-semibold text-white capitalize">
                      {emailType === 'festival' ? '🎉 Festival Greeting' : '📧 Custom Email'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <p className="text-sm text-slate-400 mb-1">Subject</p>
                    <p className="text-lg font-semibold text-white">{subject}</p>
                  </div>

                  {emailType === 'festival' && selectedFestivalObj && (
                    <div className="p-4 bg-slate-800/50 rounded-xl">
                      <p className="text-sm text-slate-400 mb-1">Festival</p>
                      <p className="text-lg font-semibold text-white">{selectedFestivalObj.name}</p>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div>
                  <p className="text-sm text-slate-400 mb-3">Email Preview</p>
                  <div className="bg-white rounded-xl p-6 text-slate-900 max-h-[400px] overflow-y-auto">
                    {emailType === 'festival' && selectedFestivalObj ? (
                      <>
                        <div className="text-center mb-4">
                          <div className="text-4xl mb-2">🎉</div>
                          <h3 className="text-xl font-bold">{selectedFestivalObj.name}</h3>
                        </div>

                        {selectedQuoteObj && (
                          <div className="bg-gradient-to-br from-violet-100 to-pink-100 rounded-xl p-4 mb-4">
                            <p className="italic text-slate-700">"{selectedQuoteObj.text}"</p>
                            <p className="text-sm text-slate-500 mt-2 text-right">— {selectedQuoteObj.author}</p>
                          </div>
                        )}

                        {customMessage && <p className="text-slate-600 mb-4">{customMessage}</p>}

                        <p className="text-sm text-slate-500">
                          Wishing you a wonderful {selectedFestivalObj.name}!
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold mb-4">{subject}</h3>
                        <p className="text-slate-700 whitespace-pre-wrap">{customMessage || 'No message content'}</p>
                      </>
                    )}

                    <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                      <p className="text-xs text-slate-400">QuoteSwipe • Discover Daily Inspiration</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 font-medium">Please review carefully</p>
                  <p className="text-sm text-slate-400 mt-1">
                    This action will send emails to {sendToAll ? 'all users' : `${selectedUsers.length} users`}. 
                    This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between p-6 bg-slate-800/30 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-slate-300 flex items-center gap-2 transition-all"
            >
              <ChevronLeft size={18} />
              Back
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-medium text-white flex items-center gap-2 transition-all"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSendEmails}
                disabled={isSending}
                className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white flex items-center gap-2 transition-all shadow-lg shadow-violet-500/25"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Email
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
