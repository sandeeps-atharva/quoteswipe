'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  Quote,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

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

export default function HistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/send-email');
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={14} />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
            <XCircle size={14} />
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
            <Clock size={14} />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.subject.toLowerCase().includes(search.toLowerCase()) ||
      campaign.festival_name?.toLowerCase().includes(search.toLowerCase()) ||
      campaign.quote_text?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + c.failed_count, 0);
  const successRate =
    totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 100;

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Email History</h1>
            <p className="text-slate-400">View all sent email campaigns</p>
          </div>

          <button
            onClick={fetchCampaigns}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Mail size={20} className="text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{campaigns.length}</p>
                <p className="text-xs text-slate-400">Campaigns</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalSent.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalFailed.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Failed</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold">{successRate}%</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Success</p>
                <p className="text-xs text-slate-400">Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-20">
              <Mail size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No campaigns found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-6 hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xl shrink-0">
                          🎉
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {campaign.subject}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-violet-400">{campaign.festival_name}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-sm text-slate-400">
                              {formatDate(campaign.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {campaign.quote_text && (
                        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
                          <div className="flex items-start gap-2">
                            <Quote size={16} className="text-slate-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-slate-300 italic line-clamp-2">
                                "{campaign.quote_text}"
                              </p>
                              {campaign.quote_author && (
                                <p className="text-xs text-slate-500 mt-1">
                                  — {campaign.quote_author}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Users size={14} />
                          {campaign.total_recipients} recipients
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 size={14} />
                          {campaign.sent_count} delivered
                        </div>
                        {campaign.failed_count > 0 && (
                          <div className="flex items-center gap-1.5 text-red-400">
                            <XCircle size={14} />
                            {campaign.failed_count} failed
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 lg:flex-col lg:items-end">
                      {getStatusBadge(campaign.status)}
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Sent by</p>
                        <p className="text-sm text-slate-300">{campaign.sent_by_name || 'Admin'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

