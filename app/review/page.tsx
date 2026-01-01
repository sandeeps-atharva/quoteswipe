'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Send, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

export default function Review() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 0,
    title: '',
    message: '',
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setFormData(prev => ({
            ...prev,
            name: data.user.name,
            email: data.user.email
          }));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error('Please write your review');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Review submitted successfully!');
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  if (isSubmitted) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0C0A09]' : 'bg-[#FFFBF7]'}`}>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <div className={`rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold mb-2 sm:mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Thank You for Your Review! ⭐
            </h1>
            <p className={`text-sm sm:text-base mb-5 sm:mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Your review has been submitted and is pending approval. Once approved, it will be visible to other users on our website.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <Link
                href="/"
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-base hover:opacity-90 transition-all"
              >
                Back to Quotes
              </Link>
              <Link
                href="/about"
                className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Learn About Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0C0A09]' : 'bg-[#FFFBF7]'}`}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Link
            href="/"
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${
              theme === 'dark' 
                ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Write a Review
            </h1>
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Share your experience with QuoteSwipe
            </p>
          </div>
        </div>

        {/* Form */}
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Rating */}
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Rating *
              </label>
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div className="flex gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-0.5 sm:p-1 transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          star <= (hoveredRating || formData.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : theme === 'dark'
                              ? 'text-gray-600'
                              : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(hoveredRating > 0 || formData.rating > 0) && (
                  <span className={`text-xs sm:text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {ratingLabels[hoveredRating || formData.rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={!!user}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-amber-500 focus:border-transparent ${user ? 'opacity-60' : ''}`}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!!user}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-amber-500 focus:border-transparent ${user ? 'opacity-60' : ''}`}
                  placeholder="john@example.com"
                />
                <p className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Email won't be displayed publicly
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Review Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength={100}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                placeholder="Sum up your experience in a few words..."
              />
            </div>

            {/* Review Message */}
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Review *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={4}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base transition-all resize-none ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                } focus:ring-2 focus:ring-amber-500 focus:border-transparent`}
                placeholder="Tell others what you love about QuoteSwipe..."
              />
            </div>

            {/* Info Box */}
            <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
                ⭐ Your review will be published on our website after approval. Only your name and review will be visible to others.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:opacity-90 transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  Submit Review
                </>
              )}
            </button>
          </form>

          {/* Have feedback? */}
          <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} text-center`}>
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Have a bug report or suggestion?{' '}
              <Link href="/feedback" className="text-amber-500 hover:text-amber-600 font-medium">
                Send private feedback →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

