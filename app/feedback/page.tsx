'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, CheckCircle, MessageSquare, Bug, Lightbulb, HelpCircle, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import toast from 'react-hot-toast';

const categories = [
  { id: 'general', label: 'General Feedback', icon: MessageSquare, color: 'blue' },
  { id: 'bug', label: 'Report a Bug', icon: Bug, color: 'red' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'yellow' },
  { id: 'improvement', label: 'Improvement', icon: Wrench, color: 'green' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'purple' },
];

export default function Feedback() {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general',
    message: '',
  });
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
    
    if (!formData.message.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Feedback submitted successfully!');
      } else {
        toast.error(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const selectedCategory = categories.find(c => c.id === formData.category);

  if (isSubmitted) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0C0A09]' : 'bg-[#FFFBF7]'}`}>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <div className={`rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold mb-2 sm:mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Thank You! 🎉
            </h1>
            <p className={`text-sm sm:text-base mb-5 sm:mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Your feedback has been submitted successfully. We truly appreciate you taking the time to help us improve QuoteSwipe!
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <Link
                href="/"
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-base hover:opacity-90 transition-all"
              >
                Back to Quotes
              </Link>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData(prev => ({ ...prev, category: 'general', message: '' }));
                }}
                className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Submit More Feedback
              </button>
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
              Send Feedback
            </h1>
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Help us improve QuoteSwipe
            </p>
          </div>
        </div>

        {/* Form */}
        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Your Name
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
                  Email Address
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
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Feedback Type
              </label>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center gap-1 sm:gap-2 active:scale-95 ${
                        isSelected
                          ? theme === 'dark'
                            ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                            : 'border-amber-500 bg-amber-50 text-amber-600'
                          : theme === 'dark'
                            ? 'border-gray-700 hover:border-gray-600 text-gray-400'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className={`block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Feedback
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
                placeholder={
                  formData.category === 'bug'
                    ? 'Please describe the bug you encountered. Include steps to reproduce if possible...'
                    : formData.category === 'feature'
                    ? 'Describe the feature you\'d like to see...'
                    : formData.category === 'question'
                    ? 'What would you like to know?'
                    : 'Share your thoughts, suggestions, or feedback...'
                }
              />
            </div>

            {/* Info Box */}
            <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
              <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-blue-700'}`}>
                💡 Your feedback is private and goes directly to our team. We read every message and use your input to improve QuoteSwipe.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  Send Feedback
                </>
              )}
            </button>
          </form>

          {/* Want to write a review? */}
          <div className={`mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} text-center`}>
            <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Love QuoteSwipe?{' '}
              <Link href="/review" className="text-amber-500 hover:text-amber-600 font-medium">
                Write a public review →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
