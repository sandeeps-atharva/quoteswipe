'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Quote,
  Heart,
  Bookmark,
  Mail,
  TrendingUp,
  Calendar,
  Send,
  Loader2,
  ArrowUpRight,
  FolderOpen,
  Star,
  PenLine,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

interface Stats {
  overview: {
    totalUsers: number;
    totalQuotes: number;
    totalCategories: number;
    totalLikes: number;
    totalSaved: number;
    totalUserQuotes: number;
    totalReviews: number;
    userGrowth: string;
  };
  email: {
    totalCampaigns: number;
    totalSent: number;
    totalFailed: number;
    successRate: number;
  };
  topCategories: Array<{ name: string; count: number; icon?: string }>;
  recentUsersCount: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'send-email',
      title: 'Send Email',
      description: 'Send festival emails to users',
      icon: <Send size={24} />,
      href: '/admin/email',
      color: 'from-violet-500 to-fuchsia-500',
    },
    {
      id: 'schedule',
      title: 'Schedule',
      description: 'Schedule future emails',
      icon: <Calendar size={24} />,
      href: '/admin/schedule',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'users',
      title: 'Manage Users',
      description: 'View and manage users',
      icon: <Users size={24} />,
      href: '/admin/users',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'history',
      title: 'Email History',
      description: 'View sent campaigns',
      icon: <History size={24} />,
      href: '/admin/history',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const StatCard = ({
    title,
    value,
    icon,
    trend,
    color,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color: string;
  }) => (
    <div className="relative overflow-hidden bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-5 group hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">{trend} this week</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white opacity-80`}>
          {icon}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${color} opacity-50`} />
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back! Here's what's happening with QuoteSwipe.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total Users"
                value={stats.overview.totalUsers}
                icon={<Users size={24} />}
                trend={stats.overview.userGrowth}
                color="from-violet-500 to-fuchsia-500"
              />
              <StatCard
                title="Total Quotes"
                value={stats.overview.totalQuotes}
                icon={<Quote size={24} />}
                color="from-blue-500 to-cyan-500"
              />
              <StatCard
                title="Categories"
                value={stats.overview.totalCategories}
                icon={<FolderOpen size={24} />}
                color="from-emerald-500 to-teal-500"
              />
              <StatCard
                title="Total Likes"
                value={stats.overview.totalLikes}
                icon={<Heart size={24} />}
                color="from-rose-500 to-pink-500"
              />
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Saved Quotes"
                value={stats.overview.totalSaved}
                icon={<Bookmark size={24} />}
                color="from-amber-500 to-orange-500"
              />
              <StatCard
                title="User Quotes"
                value={stats.overview.totalUserQuotes}
                icon={<PenLine size={24} />}
                color="from-indigo-500 to-violet-500"
              />
              <StatCard
                title="Reviews"
                value={stats.overview.totalReviews}
                icon={<Star size={24} />}
                color="from-yellow-500 to-amber-500"
              />
              <StatCard
                title="Emails Sent"
                value={stats.email.totalSent}
                icon={<Mail size={24} />}
                color="from-green-500 to-emerald-500"
              />
            </div>

            {/* Quick Actions & Email Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Quick Actions */}
              <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ArrowUpRight size={20} className="text-violet-400" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      className="group relative overflow-hidden rounded-xl border border-slate-700 hover:border-slate-600 transition-all p-4"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shrink-0`}>
                          {action.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-slate-400 mt-0.5">{action.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Email Stats */}
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Mail size={20} className="text-violet-400" />
                  Email Stats
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Send size={18} className="text-violet-400" />
                      </div>
                      <span className="text-slate-300">Campaigns</span>
                    </div>
                    <span className="text-xl font-bold text-white">{stats.email.totalCampaigns}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      </div>
                      <span className="text-slate-300">Delivered</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-400">{stats.email.totalSent}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <XCircle size={18} className="text-red-400" />
                      </div>
                      <span className="text-slate-300">Failed</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">{stats.email.totalFailed}</span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Success Rate</span>
                      <span className="text-sm font-medium text-emerald-400">{stats.email.successRate}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                        style={{ width: `${stats.email.successRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FolderOpen size={20} className="text-violet-400" />
                Top Categories
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.topCategories.map((category, index) => (
                  <div
                    key={category.name}
                    className="relative overflow-hidden p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-all group"
                  >
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                      {index + 1}
                    </div>
                    <div className="text-3xl mb-2">{category.icon || '📚'}</div>
                    <p className="font-medium text-white truncate">{category.name}</p>
                    <p className="text-sm text-slate-400">{category.count} quotes</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400">Failed to load stats. Please refresh.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
