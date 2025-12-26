'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Mail,
  Users,
  Quote,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Check,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import toast from 'react-hot-toast';

interface ScheduledEmail {
  id: number;
  title: string;
  subject: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  quote_text?: string;
  quote_author?: string;
  custom_message?: string;
  user_count: number;
  created_at: string;
}

interface QuoteItem {
  id: string | number;
  text: string;
  author: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function SchedulePage() {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    quote_id: '',
    custom_message: '',
    send_to_all: true,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchScheduledEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/scheduled-emails?month=${currentMonth + 1}&year=${currentYear}`
      );
      const data = await res.json();
      if (data.scheduledEmails) {
        setScheduledEmails(data.scheduledEmails);
      }
    } catch (error) {
      console.error('Error fetching scheduled emails:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchScheduledEmails();
  }, [fetchScheduledEmails]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${userSearch}&limit=50`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setTotalUsers(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [userSearch]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes?limit=100');
        const data = await res.json();
        if (data.quotes) {
          setQuotes(
            data.quotes.map((q: any) => ({
              id: q.id,
              text: q.text,
              author: q.author,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
      }
    };
    fetchQuotes();
  }, []);

  const filteredQuotes = quotes.filter(
    (q) =>
      q.text.toLowerCase().includes(quoteSearch.toLowerCase()) ||
      q.author.toLowerCase().includes(quoteSearch.toLowerCase())
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || !formData.scheduled_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.send_to_all && selectedUserIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    // Validate date is in the future
    const scheduleDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
    if (scheduleDateTime <= new Date()) {
      toast.error('Scheduled date must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/scheduled-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_ids: formData.send_to_all ? [] : selectedUserIds,
        }),
      });

      if (res.ok) {
        toast.success('Email scheduled successfully!');
        setShowCreateModal(false);
        setFormData({
          title: '',
          subject: '',
          scheduled_date: '',
          scheduled_time: '09:00',
          quote_id: '',
          custom_message: '',
          send_to_all: true,
        });
        setSelectedUserIds([]);
        fetchScheduledEmails();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to schedule email');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this scheduled email?')) return;

    try {
      const res = await fetch(`/api/admin/scheduled-emails?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Scheduled email deleted');
        setSelectedEmail(null);
        fetchScheduledEmails();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleTriggerSend = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/cron/send-scheduled-emails');
      const data = await res.json();
      if (data.processed > 0) {
        toast.success(`Processed ${data.processed} scheduled email(s)`);
        fetchScheduledEmails();
      } else {
        toast.success('No pending emails to process');
      }
    } catch (error) {
      toast.error('Failed to process scheduled emails');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[100px] lg:min-h-[120px] bg-slate-900/20 rounded-lg" />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const scheduledForDay = scheduledEmails.filter((e) => e.scheduled_date === dateStr);
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();
      const isPast = new Date(dateStr) < new Date(today.toDateString());

      days.push(
        <div
          key={day}
          onClick={() => {
            if (!isPast) {
              setFormData({ ...formData, scheduled_date: dateStr });
              setShowCreateModal(true);
            }
          }}
          className={`min-h-[100px] lg:min-h-[120px] p-2 rounded-lg border transition-all cursor-pointer ${
            isToday
              ? 'bg-violet-500/10 border-violet-500/50 hover:bg-violet-500/20'
              : isPast
              ? 'bg-slate-900/30 border-slate-800/50 cursor-default opacity-50'
              : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                isToday
                  ? 'bg-violet-500 text-white'
                  : isPast
                  ? 'text-slate-600'
                  : 'text-slate-400'
              }`}
            >
              {day}
            </span>
            {scheduledForDay.length > 0 && (
              <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">
                {scheduledForDay.length}
              </span>
            )}
          </div>
          <div className="space-y-1 overflow-hidden">
            {scheduledForDay.slice(0, 2).map((email) => (
              <div
                key={email.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEmail(email);
                }}
                className={`text-xs p-1.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(email.status)}`}
              >
                <p className="truncate font-medium">{email.title}</p>
              </div>
            ))}
            {scheduledForDay.length > 2 && (
              <p className="text-xs text-slate-500">+{scheduledForDay.length - 2} more</p>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const pendingEmails = scheduledEmails.filter((e) => e.status === 'pending');
  const sentEmails = scheduledEmails.filter((e) => e.status === 'sent');
  const failedEmails = scheduledEmails.filter((e) => e.status === 'failed');

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Schedule</h1>
            <p className="text-slate-400">Plan and schedule email campaigns</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerSend}
              disabled={isProcessing || pendingEmails.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
            >
              {isProcessing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Play size={18} />
              )}
              Process Now
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-white transition-colors"
            >
              <Plus size={18} />
              New Schedule
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Calendar size={20} className="text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{scheduledEmails.length}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingEmails.length}</p>
                <p className="text-xs text-slate-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{sentEmails.length}</p>
                <p className="text-xs text-slate-400">Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{failedEmails.length}</p>
                <p className="text-xs text-slate-400">Failed</p>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle & Calendar Header */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentMonth === 0) {
                    setCurrentMonth(11);
                    setCurrentYear((y) => y - 1);
                  } else {
                    setCurrentMonth((m) => m - 1);
                  }
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold text-white min-w-[160px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={() => {
                  if (currentMonth === 11) {
                    setCurrentMonth(0);
                    setCurrentYear((y) => y + 1);
                  } else {
                    setCurrentMonth((m) => m + 1);
                  }
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today.getMonth());
                  setCurrentYear(today.getFullYear());
                }}
                className="ml-2 px-3 py-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm font-medium transition-colors"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-violet-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar size={16} className="inline mr-1.5" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-violet-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mail size={16} className="inline mr-1.5" />
                List
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : viewMode === 'calendar' ? (
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
              <p className="text-xs text-slate-500 mt-4 text-center">
                Click on a future date to schedule an email
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {scheduledEmails.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar size={48} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400">No scheduled emails</p>
                </div>
              ) : (
                scheduledEmails
                  .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                  .map((email) => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <Mail size={20} className="text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{email.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                            <span>{formatDate(email.scheduled_date)}</span>
                            <span>•</span>
                            <span>{email.scheduled_time?.slice(0, 5) || '09:00'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(email.status)}`}>
                        {email.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Schedule New Email</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowUserSelector(false);
                  }}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSchedule} className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Diwali Greeting"
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Email subject line"
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                    />
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Users size={14} className="inline mr-2" />
                    Recipients *
                  </label>
                  
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, send_to_all: true });
                        setSelectedUserIds([]);
                        setShowUserSelector(false);
                      }}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        formData.send_to_all
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      All Users ({totalUsers})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, send_to_all: false });
                        setShowUserSelector(true);
                      }}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        !formData.send_to_all
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Select Users {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
                    </button>
                  </div>

                  {/* User Selector */}
                  {showUserSelector && !formData.send_to_all && (
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500 text-sm"
                        />
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {users.map((user) => (
                          <label
                            key={user.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                              selectedUserIds.includes(user.id)
                                ? 'bg-violet-500/20 border border-violet-500/50'
                                : 'hover:bg-slate-700/50 border border-transparent'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selectedUserIds.includes(user.id)
                                ? 'bg-violet-500 border-violet-500'
                                : 'border-slate-600'
                            }`}>
                              {selectedUserIds.includes(user.id) && <Check size={12} className="text-white" />}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs">
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{user.name}</p>
                              <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="sr-only"
                            />
                          </label>
                        ))}
                      </div>
                      
                      {selectedUserIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
                          <span className="text-sm text-slate-400">{selectedUserIds.length} user(s) selected</span>
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds([])}
                            className="text-sm text-red-400 hover:text-red-300"
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Quote (optional)
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
                    value={formData.quote_id}
                    onChange={(e) => setFormData({ ...formData, quote_id: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                  >
                    <option value="">Select a quote...</option>
                    {filteredQuotes.slice(0, 50).map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.text.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={formData.custom_message}
                    onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                    placeholder="Add a personal message..."
                    rows={3}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowUserSelector(false);
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!formData.send_to_all && selectedUserIds.length === 0)}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Calendar size={18} />
                    )}
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full">
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">Scheduled Email Details</h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(selectedEmail.status)}`}>
                    {selectedEmail.status.charAt(0).toUpperCase() + selectedEmail.status.slice(1)}
                  </span>
                  <div className="text-sm text-slate-400">
                    {formatDate(selectedEmail.scheduled_date)} at {selectedEmail.scheduled_time?.slice(0, 5) || '09:00'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Title</p>
                    <p className="text-white font-medium">{selectedEmail.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Subject</p>
                    <p className="text-white">{selectedEmail.subject}</p>
                  </div>
                  {selectedEmail.quote_text && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Quote</p>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                        <p className="text-slate-300 italic">"{selectedEmail.quote_text}"</p>
                        {selectedEmail.quote_author && (
                          <p className="text-sm text-slate-500 mt-1">— {selectedEmail.quote_author}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedEmail.custom_message && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Message</p>
                      <p className="text-slate-300">{selectedEmail.custom_message}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Recipients</p>
                    <p className="text-white">{selectedEmail.user_count || 'All users'}</p>
                  </div>
                </div>

                {selectedEmail.status === 'pending' && (
                  <button
                    onClick={() => handleDeleteSchedule(selectedEmail.id)}
                    className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl font-medium text-red-400 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={18} />
                    Delete Schedule
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
