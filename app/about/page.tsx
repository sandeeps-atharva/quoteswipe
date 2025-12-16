'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Sparkles, Users, Target, Zap, Globe, Quote, MessageSquare, Palette, PenLine } from 'lucide-react';
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
  const [stats, setStats] = useState<Stats>({
    quotes: '10K+',
    categories: '130+',
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
      // User is logged in, redirect to home
      router.push('/');
    } else {
      // User is not logged in, show auth modal
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

  const features = [
    {
      icon: <PenLine className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />,
      title: "Create Your Own Quotes",
      description: "Write your own inspirational quotes with custom backgrounds, themes, and fonts. Share publicly or keep private.",
      isNew: true
    },
    {
      icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />,
      title: "Curated Content",
      description: "Thousands of hand-picked quotes from history's greatest minds, leaders, and thinkers."
    },
    {
      icon: <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-pink-400" />,
      title: "Save Favorites",
      description: "Build your personal collection of quotes that inspire and motivate you."
    },
    {
      icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />,
      title: "Smart Discovery",
      description: "Swipe through quotes tailored to your interests and discover new perspectives."
    },
    {
      icon: <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600 dark:text-pink-400" />,
      title: "Full Card Customization",
      description: "60+ themes, 75+ fonts, 20+ background images, or upload your own photo to create stunning shareable quote cards."
    },
    {
      icon: <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />,
      title: "Multi-Language",
      description: "Access quotes in 100+ languages to inspire people worldwide."
    }
  ];

  const statsDisplay = [
    { value: stats.quotes, label: "Quotes" },
    { value: stats.categories, label: "Categories" },
    // { value: stats.users, label: "Users" },
    // { value: stats.saved, label: "Quotes Saved" }
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
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-500/10 to-pink-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-pink-500/10 to-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center shadow-md sm:shadow-lg shadow-blue-500/5 dark:shadow-pink-500/5 border border-white/50 dark:border-gray-700/50"
            >
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mb-6 sm:mb-8">
          <div className="text-center mb-5 sm:mb-6 md:mb-8">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">What We Offer</h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">Features designed to enhance your quote discovery experience</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {features.map((feature, index) => (
              <SectionCard 
                key={index} 
                className={`hover:shadow-xl hover:-translate-y-1 transition-all relative ${
                  (feature as { isNew?: boolean }).isNew ? 'ring-2 ring-purple-500/50 dark:ring-purple-400/50' : ''
                }`}
              >
                {(feature as { isNew?: boolean }).isNew && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold rounded-full uppercase">
                    New
                  </span>
                )}
                <div className={`p-2 sm:p-3 w-fit rounded-lg sm:rounded-xl mb-2 sm:mb-3 md:mb-4 ${
                  (feature as { isNew?: boolean }).isNew 
                    ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20'
                    : 'bg-gradient-to-br from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20'
                }`}>
                  {feature.icon}
                </div>
                <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
                  {feature.title}
                </h4>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </SectionCard>
            ))}
          </div>
        </div>

        {/* Quote Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-pink-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 lg:p-10 text-white text-center mb-6 sm:mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <Quote className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
          <blockquote className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display italic mb-2 sm:mb-3 md:mb-4 relative px-2">
            "The only way to do great work is to love what you do."
          </blockquote>
          <p className="text-white/80 text-sm sm:text-base">— Steve Jobs</p>
        </div>

        {/* Values */}
        <SectionCard className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-pink-600 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-pink-700 transition-all shadow-lg shadow-blue-500/25 dark:shadow-pink-500/20 disabled:opacity-70"
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
