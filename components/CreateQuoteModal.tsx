'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, PenLine, User, Tag, Loader2, Check, Globe, Lock } from 'lucide-react';
import { isQuotePublic } from '@/lib/helpers';

interface Category {
  id: string | number;
  name: string;
  icon: string;
}

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  theme_id?: string;
  font_id?: string;
  background_id?: string;
  category_id?: string | number;
  category?: string;
  category_icon?: string;
  is_public?: boolean | number;
}

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quote: UserQuote, cacheInvalidated?: boolean) => void;
  categories: Category[];
  editQuote?: UserQuote | null;
}

export default function CreateQuoteModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  editQuote,
}: CreateQuoteModalProps) {
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState<string | number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);

  const isEditing = !!editQuote;
  const maxChars = 500;
  const minChars = 10;

  useEffect(() => {
    if (isOpen) {
      if (editQuote) {
        setText(editQuote.text);
        setAuthor(editQuote.author === 'Me' ? '' : editQuote.author);
        setCategoryId(editQuote.category_id || null);
        setIsPublic(isQuotePublic(editQuote.is_public));
      } else {
        setText('');
        setAuthor('');
        setCategoryId(null);
        setIsPublic(false);
      }
      setError('');
      setCharCount(editQuote?.text.length || 0);
    }
  }, [isOpen, editQuote]);

  const handleTextChange = (value: string) => {
    if (value.length <= maxChars) {
      setText(value);
      setCharCount(value.length);
      setError('');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (text.trim().length < minChars) {
      setError(`Quote must be at least ${minChars} characters`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const endpoint = isEditing 
        ? `/api/user/quotes/${editQuote.id}` 
        : '/api/user/quotes';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          author: author.trim() || 'Me',
          categoryId,
          isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save quote');
      }

      // Pass cacheInvalidated flag to handle public quote visibility in feed
      onSuccess(data.quote, data.cacheInvalidated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:max-w-lg mx-0 sm:mx-4 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />
        
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 sm:px-6 sm:pt-5 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <PenLine size={18} className="sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {isEditing ? 'Edit Quote' : 'Create Quote'}
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {isEditing ? 'Update your quote' : 'Write your own inspiration ✨'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
            >
              <X size={16} className="sm:w-[18px] sm:h-[18px] text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
          {/* Quote Text */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Sparkles size={14} className="text-purple-500" />
              Your Quote
            </label>
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Write something inspiring..."
                className="w-full h-32 sm:h-40 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-sm sm:text-base"
                autoFocus
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  charCount < minChars 
                    ? 'text-red-500' 
                    : charCount > maxChars - 50 
                      ? 'text-orange-500' 
                      : 'text-gray-400'
                }`}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>
            {charCount > 0 && charCount < minChars && (
              <p className="mt-1.5 text-xs text-red-500">
                {minChars - charCount} more characters needed
              </p>
            )}
          </div>

          {/* Author */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <User size={14} className="text-blue-500" />
              Author <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Leave empty for 'Me'"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Tag size={14} className="text-green-500" />
              Category <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategoryId(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  categoryId === null
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                None
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    categoryId === cat.id
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {isPublic ? (
                <Globe size={14} className="text-green-500" />
              ) : (
                <Lock size={14} className="text-gray-400" />
              )}
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  !isPublic
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Lock size={16} />
                <div className="text-left">
                  <p className="text-sm font-semibold">Private</p>
                  <p className="text-[10px] opacity-70">Only you can see</p>
                </div>
              </button>
              <button
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  isPublic
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Globe size={16} />
                <div className="text-left">
                  <p className="text-sm font-semibold">Public</p>
                  <p className="text-[10px] opacity-70">Everyone can see</p>
                </div>
              </button>
            </div>
            {isPublic && (
              <p className="mt-2 text-[11px] text-green-600 dark:text-green-400 flex items-center gap-1">
                <Sparkles size={10} />
                Your quote will appear in the main feed for all users!
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || text.trim().length < minChars}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{isEditing ? 'Update' : 'Create'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
