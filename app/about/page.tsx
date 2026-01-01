'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, Sparkles, Users, Target, Zap, Globe, Quote, MessageSquare, Palette, PenLine, 
  Camera, Image as ImageIcon, Share2, Lock, Bookmark, ThumbsDown, Search, Filter, 
  Download, Type, Sun, Moon, Smartphone, Monitor, Bell, Languages, Shuffle, 
  RefreshCw, Eye, EyeOff, ChevronRight, Star, TrendingUp, Layers, Grid3X3,
  Upload, Trash2, Edit, Copy, ExternalLink, QrCode, Instagram, MessageCircle,
  Maximize, ZoomIn, Move, WrapText, LayoutGrid, ListFilter
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import LegalPageLayout, { SectionCard } from '@/components/LegalPageLayout';
import AuthModal from '@/components/AuthModal';
import Testimonials from '@/components/Testimonials';
import toast from 'react-hot-toast';

interface Stats {
  quotes: string;
  categories: string;
  users: string;
  saved: string;
}

export default function About() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('core');
  const [stats, setStats] = useState<Stats>({
    quotes: '12K+',
    categories: '210+',
    users: '1K+',
    saved: '5K+'
  });

  // Check authentication status and fetch stats on mount
  useEffect(() => {
    checkAuth();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          quotes: data.stats.quotes,
          categories: data.stats.categories,
          users: data.stats.users,
          saved: data.stats.saved
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSwiping = () => {
    if (isAuthenticated) {
      router.push('/');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setIsAuthenticated(true);
    setShowAuthModal(false);
    toast.success(`Welcome back, ${data.user.name}! 🎉`);
    router.push('/');
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    setIsAuthenticated(true);
    setShowAuthModal(false);
    toast.success(`Welcome to QuoteSwipe, ${data.user.name}! 🎉`);
    router.push('/');
  };

  const handleGoogleSuccess = async (user: { id: number; name: string; email: string }) => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    toast.success(`Welcome, ${user.name}! 🎉`);
    router.push('/');
  };

  // All Features organized by category
  const featureCategories = [
    {
      id: 'core',
      title: '🎯 Core Features',
      description: 'Essential quote discovery features',
      features: [
        { icon: <Shuffle size={18} />, title: 'Swipe Discovery', desc: 'Swipe right to like, left to skip quotes' },
        { icon: <Heart size={18} />, title: 'Like & Save', desc: 'Save your favorite quotes to collections' },
        { icon: <ThumbsDown size={18} />, title: 'Skip Quotes', desc: 'Skip quotes that don\'t resonate with you' },
        { icon: <Bookmark size={18} />, title: 'Bookmark', desc: 'Quick save quotes for later reading' },
        { icon: <Search size={18} />, title: 'Search', desc: 'Find quotes by text, author, or category' },
        { icon: <Filter size={18} />, title: 'Category Filter', desc: 'Filter quotes by 210+ categories' },
      ]
    },
    {
      id: 'create',
      title: '✍️ Create Your Quotes',
      description: 'Design stunning personalized quote cards',
      features: [
        { icon: <PenLine size={18} />, title: 'Write Quotes', desc: 'Create your own inspirational quotes' },
        { icon: <Camera size={18} />, title: 'Take Photo', desc: 'Use camera for custom backgrounds' },
        { icon: <Upload size={18} />, title: 'Upload Images', desc: 'Upload photos as backgrounds (bulk supported)' },
        { icon: <Eye size={18} />, title: 'Public/Private', desc: 'Share publicly or keep private' },
        { icon: <Edit size={18} />, title: 'Edit Anytime', desc: 'Modify your created quotes anytime' },
        { icon: <Trash2 size={18} />, title: 'Delete', desc: 'Remove quotes you no longer want' },
      ]
    },
    {
      id: 'customize',
      title: '🎨 Customization',
      description: 'Make every quote card unique',
      features: [
        { icon: <Palette size={18} />, title: '60+ Themes', desc: 'Beautiful card themes and styles' },
        { icon: <Type size={18} />, title: '75+ Fonts', desc: 'Wide variety of font styles' },
        { icon: <ImageIcon size={18} />, title: '20+ Backgrounds', desc: 'Preset background images' },
        { icon: <Upload size={18} />, title: 'Custom Backgrounds', desc: 'Upload your own images' },
        { icon: <Sun size={18} />, title: 'Light/Dark Mode', desc: 'Choose your preferred theme' },
        { icon: <Layers size={18} />, title: 'Card Styles', desc: 'Multiple card layout options' },
      ]
    },
    {
      id: 'share',
      title: '📤 Share & Download',
      description: 'Share your favorite quotes everywhere',
      features: [
        { icon: <Download size={18} />, title: 'Download Image', desc: 'Save as high-quality image' },
        { icon: <Copy size={18} />, title: 'Copy Text', desc: 'Quick copy quote text' },
        { icon: <ExternalLink size={18} />, title: 'Share Link', desc: 'Share via unique URL' },
        { icon: <Instagram size={18} />, title: 'Instagram Ready', desc: 'Perfect size for stories/posts' },
        { icon: <MessageCircle size={18} />, title: 'WhatsApp', desc: 'Share directly to WhatsApp' },
        { icon: <QrCode size={18} />, title: 'QR Code', desc: 'Generate shareable QR codes' },
      ]
    },
    {
      id: 'share-tools',
      title: '🔧 Share Modal Tools',
      description: 'Advanced tools when sharing quotes',
      features: [
        { icon: <Maximize size={18} />, title: 'Multiple Formats', desc: 'Story, Square, Portrait sizes' },
        { icon: <ZoomIn size={18} />, title: 'Background Zoom', desc: 'Zoom in/out on background image' },
        { icon: <Move size={18} />, title: 'Background Pan', desc: 'Move background up/down/left/right' },
        { icon: <Type size={18} />, title: 'Font Size Control', desc: 'Adjust text size' },
        { icon: <WrapText size={18} />, title: 'Line Breaks', desc: 'Add line breaks to format text' },
        { icon: <Copy size={18} />, title: 'Caption & Hashtags', desc: 'Auto-generated captions' },
      ]
    },
    {
      id: 'categories',
      title: '📚 Categories',
      description: '210+ categories for every mood',
      features: [
        { icon: <TrendingUp size={18} />, title: 'Trending', desc: 'Situationship, Icks, Hot Takes, etc.' },
        { icon: <Heart size={18} />, title: 'Relationships', desc: 'Love, Breakup, Ex Files, Crush' },
        { icon: <Zap size={18} />, title: 'Motivation', desc: 'Success, Hustle, Goals, Dreams' },
        { icon: <Star size={18} />, title: 'Lifestyle', desc: 'Coffee, Travel, Food, Music' },
        { icon: <Globe size={18} />, title: 'Desi Special', desc: 'Desi Parents, Bollywood, Rishta Season' },
        { icon: <Sparkles size={18} />, title: 'Mood', desc: '2am Quotes, Sunday Scaries, Party' },
      ]
    },
    {
      id: 'account',
      title: '👤 Account Features',
      description: 'Manage your profile and preferences',
      features: [
        { icon: <Users size={18} />, title: 'Profile', desc: 'View and edit your profile' },
        { icon: <Heart size={18} />, title: 'Liked Quotes', desc: 'Access all your liked quotes' },
        { icon: <ThumbsDown size={18} />, title: 'Skipped Quotes', desc: 'Review quotes you skipped' },
        { icon: <Bookmark size={18} />, title: 'Saved Quotes', desc: 'Your bookmarked collection' },
        { icon: <PenLine size={18} />, title: 'My Quotes', desc: 'Manage your created quotes' },
        { icon: <Lock size={18} />, title: 'Change Password', desc: 'Update your password securely' },
      ]
    },
    {
      id: 'auth',
      title: '🔐 Authentication',
      description: 'Secure and easy sign-in options',
      features: [
        { icon: <Users size={18} />, title: 'Email Sign Up', desc: 'Register with email and password' },
        { icon: <Globe size={18} />, title: 'Google Sign In', desc: 'Quick sign in with Google' },
        { icon: <Lock size={18} />, title: 'Secure Sessions', desc: 'HTTP-only cookie authentication' },
        { icon: <RefreshCw size={18} />, title: 'Password Reset', desc: 'Forgot password recovery' },
        { icon: <Eye size={18} />, title: 'Guest Mode', desc: 'Browse without signing in' },
        { icon: <EyeOff size={18} />, title: 'Privacy First', desc: 'Your data stays private' },
      ]
    },
    {
      id: 'navigation',
      title: '📱 Navigation',
      description: 'Easy-to-use interface',
      features: [
        { icon: <LayoutGrid size={18} />, title: 'Bottom Navigation', desc: 'Quick access to main features' },
        { icon: <ListFilter size={18} />, title: 'Sidebar Menu', desc: 'Categories and settings' },
        { icon: <Grid3X3 size={18} />, title: 'Options Menu', desc: 'Profile, Liked, Skipped access' },
        { icon: <Smartphone size={18} />, title: 'Mobile First', desc: 'Optimized for mobile devices' },
        { icon: <Monitor size={18} />, title: 'Desktop Support', desc: 'Works great on desktop too' },
        { icon: <Languages size={18} />, title: 'Multi-Language', desc: '100+ language support' },
      ]
    },
  ];

  const statsDisplay = [
    { value: stats.quotes, label: "Quotes", icon: <Quote size={20} /> },
    { value: stats.categories, label: "Categories", icon: <Grid3X3 size={20} /> },
  ];

  return (
    <>
      <LegalPageLayout
        title="About Us"
        icon={<Image src="/logo.svg" alt="QuoteSwipe" width={40} height={40} className="w-full h-full" />}
        description="Discover inspiration, one swipe at a time"
      >
        {/* Mission Statement */}
        <SectionCard className="mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-rose-500/10 to-amber-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Our Mission</h3>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              At QuoteSwipe, we believe in the power of words to transform lives. Our mission is to 
              make wisdom accessible to everyone by creating a platform where discovering inspirational 
              quotes is as simple as a swipe. We curate the best quotes from philosophers, leaders, 
              artists, and visionaries to help you find motivation, gain perspective, and spark creativity 
              in your daily life.
            </p>
          </div>
        </SectionCard>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {statsDisplay.map((stat, index) => (
            <div 
              key={index}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center shadow-md sm:shadow-lg shadow-amber-500/5 dark:shadow-rose-500/5 border border-white/50 dark:border-gray-700/50"
            >
              <div className="flex justify-center mb-2 text-blue-500">{stat.icon}</div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* All Features Section */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center mb-5 sm:mb-6 md:mb-8">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
              All Features
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
              Everything you can do with QuoteSwipe
            </p>
          </div>
          
          <div className="space-y-3">
            {featureCategories.map((category) => (
              <div 
                key={category.id}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => setExpandedSection(expandedSection === category.id ? null : category.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{category.title.split(' ')[0]}</span>
                    <div className="text-left">
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {category.title.slice(category.title.indexOf(' ') + 1)}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-500">{category.description}</p>
                    </div>
                  </div>
                  <ChevronRight 
                    size={20} 
                    className={`text-gray-400 transition-transform ${expandedSection === category.id ? 'rotate-90' : ''}`} 
                  />
                </button>
                
                {/* Features Grid */}
                {expandedSection === category.id && (
                  <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    {category.features.map((feature, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0">
                          {feature.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                            {feature.title}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {feature.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Features Overview */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center mb-5 sm:mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
              Key Highlights
            </h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: <PenLine size={24} />, title: "Create Quotes", desc: "Write & customize", gradient: "from-orange-500 to-rose-500" },
              { icon: <Camera size={24} />, title: "Photo Backgrounds", desc: "Camera or upload", gradient: "from-amber-500 to-orange-500" },
              { icon: <Palette size={24} />, title: "60+ Themes", desc: "Beautiful styles", gradient: "from-pink-500 to-orange-500" },
              { icon: <Type size={24} />, title: "75+ Fonts", desc: "Unique typography", gradient: "from-green-500 to-teal-500" },
              { icon: <Download size={24} />, title: "Download & Share", desc: "High quality", gradient: "from-rose-500 to-red-500" },
              { icon: <Grid3X3 size={24} />, title: "210+ Categories", desc: "Every mood", gradient: "from-orange-500 to-red-500" },
            ].map((item, idx) => (
              <div key={idx} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 text-center group hover:shadow-lg transition-all">
                <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg`}>
                  {item.icon}
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                <p className="text-[10px] text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quote Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-rose-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 text-white text-center mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <Quote className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <blockquote className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display italic mb-2 sm:mb-3 md:mb-4 relative px-2">
            &ldquo;The only way to do great work is to love what you do.&rdquo;
          </blockquote>
          <p className="text-white/80 text-sm sm:text-base">— Steve Jobs</p>
        </div>

        {/* Trending Categories Highlight */}
        <SectionCard className="mb-6 sm:mb-8 relative overflow-hidden ring-2 ring-orange-500/30 dark:ring-orange-400/30">
          <div className="absolute -top-1 -right-1">
            <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold rounded-bl-xl rounded-tr-xl uppercase">
              🔥 New
            </span>
          </div>
          
          <div className="relative">
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10">
                <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Trending Categories</h3>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              19 new highly engaging categories just added! Perfect for sharing on social media.
            </p>
            
            <div className="flex flex-wrap gap-2">
              {[
                'Situationship', 'Icks', 'Ghosting', 'Hot Takes', 'Sunday Scaries',
                'Desi Parents', 'Student Life', 'Corporate Humor', 'Broke Life',
                'K-Drama Quotes', 'Bollywood Dialogues', 'Zodiac Vibes'
              ].map((cat, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
                  {cat}
                </span>
              ))}
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                +7 more
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Values */}
        <SectionCard className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Our Values</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-4 sm:mt-5 md:mt-6">
            {[
              { title: "Inspiration", desc: "We believe everyone deserves daily inspiration" },
              { title: "Accessibility", desc: "Wisdom should be free and available to all" },
              { title: "Community", desc: "Building a community of motivated individuals" }
            ].map((value, index) => (
              <div key={index} className="text-center p-3 sm:p-4">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">{value.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{value.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Testimonials */}
        <Testimonials />

        {/* CTA */}
        <div className="mt-8 sm:mt-10 md:mt-12 text-center">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Ready to Get Inspired?
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center">
            <button
              onClick={handleStartSwiping}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:from-amber-600 hover:to-rose-600 transition-all shadow-lg shadow-amber-500/25 dark:shadow-rose-500/20 disabled:opacity-70"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              {isLoading ? 'Loading...' : 'Start Swiping'}
            </button>
            <Link
              href="/feedback"
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              Share Feedback
            </Link>
          </div>
        </div>
      </LegalPageLayout>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onGoogleSuccess={handleGoogleSuccess}
      />
    </>
  );
}
