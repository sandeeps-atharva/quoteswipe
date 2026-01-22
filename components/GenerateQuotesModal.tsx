'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, Quote, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface GeneratedQuote {
  text: string;
  author: string;
  category?: string;
}

interface GenerateQuotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  mood: string;
  intensity?: string;
  userInput?: string;
  onQuoteSelect: (quote: GeneratedQuote) => void;
}

export default function GenerateQuotesModal({
  isOpen,
  onClose,
  mood,
  intensity,
  userInput,
  onQuoteSelect,
}: GenerateQuotesModalProps) {
  const [quotes, setQuotes] = useState<GeneratedQuote[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<number>>(new Set()); // Track which quotes were added

  // Generate cache key based on mood
  const getCacheKey = useCallback(() => {
    return `generated_quotes_${mood.trim().toLowerCase()}_${intensity || 'moderate'}`;
  }, [mood, intensity]);

  // Load cached quotes
  const loadCachedQuotes = useCallback(() => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 60 * 60 * 1000) {
          return parsed.quotes || [];
        }
      }
    } catch (error) {
      console.error('[GenerateQuotesModal] Error loading cached quotes:', error);
    }
    return null;
  }, [getCacheKey]);

  // Save quotes to cache
  const saveToCache = useCallback((quotesToSave: GeneratedQuote[]) => {
    try {
      const cacheKey = getCacheKey();
      localStorage.setItem(cacheKey, JSON.stringify({
        quotes: quotesToSave,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('[GenerateQuotesModal] Error saving to cache:', error);
    }
  }, [getCacheKey]);

  // Generate quotes when modal opens
  const handleGenerate = useCallback(async (forceRegenerate = false) => {
    if (isGenerating) return;
    
    // Check cache first (unless forcing regenerate)
    if (!forceRegenerate) {
      const cached = loadCachedQuotes();
      if (cached && cached.length > 0) {
        setQuotes(cached);
        setHasGenerated(true);
        return;
      }
    }
    
    setIsGenerating(true);
    setHasGenerated(false);
    if (forceRegenerate) {
      setQuotes([]);
    }

    try {
      const response = await fetch('/api/moodsense/generate-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood,
          intensity,
          userInput,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate quotes');
      }

      const data = await response.json();
      const generatedQuotes = data.quotes || [];
      setQuotes(generatedQuotes);
      setHasGenerated(true);
      
      // Save to cache
      saveToCache(generatedQuotes);
      
      if (generatedQuotes.length > 0) {
        toast.success(`Generated ${generatedQuotes.length} quotes! ✨`);
      }
    } catch (error: any) {
      console.error('[GenerateQuotesModal] Error generating quotes:', error);
      toast.error(error.message || 'Failed to generate quotes. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [mood, intensity, userInput, isGenerating, loadCachedQuotes, saveToCache]);

  // Load quotes when modal opens
  useEffect(() => {
    if (isOpen && mood.trim()) {
      // Try to load from cache first
      const cached = loadCachedQuotes();
      if (cached && cached.length > 0) {
        setQuotes(cached);
        setHasGenerated(true);
      } else if (!hasGenerated && !isGenerating) {
        // Only auto-generate if no cache exists
        handleGenerate(false);
      }
    }
  }, [isOpen, mood, hasGenerated, isGenerating, handleGenerate, loadCachedQuotes]);

  // Reset selected quotes when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Don't reset quotes - keep them cached
      // setQuotes([]);
      // setHasGenerated(false);
      setSelectedQuotes(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>
      
      {/* Modal */}
      <div className={`
        relative bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl shadow-2xl shadow-stone-900/30 dark:shadow-black/50
        max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden
        border border-stone-200/50 dark:border-stone-700/50
        animate-in zoom-in-95 fade-in duration-300
      `}>
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between z-10 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
              <Sparkles className="text-white" size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white truncate">
                AI-Generated Quotes
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                Based on: <span className="font-semibold text-amber-600 dark:text-amber-400">{mood}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group flex-shrink-0"
          >
            <X size={18} className="sm:w-5 sm:h-5 text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-140px)] scrollbar-hide">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 animate-spin mb-4" />
              <p className="text-base sm:text-lg font-semibold text-stone-900 dark:text-white mb-2">
                Generating quotes...
              </p>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 text-center px-4">
                AI is crafting personalized quotes for you
              </p>
            </div>
          ) : quotes.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                    {quotes.length} quotes generated
                  </p>
                  {selectedQuotes.size > 0 && (
                    <span className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      {selectedQuotes.size} added to feed
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleGenerate(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all w-full sm:w-auto"
                >
                  Regenerate
                </button>
              </div>
              
              <div className="grid gap-3 sm:gap-4">
                {quotes.map((quote, index) => {
                  const isSelected = selectedQuotes.has(index);
                  return (
                  <button
                    key={index}
                    onClick={() => {
                      onQuoteSelect(quote);
                      setSelectedQuotes(prev => new Set(prev).add(index));
                      toast.success('Quote added to feed! ✨', { duration: 2000 });
                    }}
                    disabled={isSelected}
                    className={`group relative p-4 sm:p-5 bg-stone-50 dark:bg-stone-800/50 border-2 rounded-xl sm:rounded-2xl transition-all duration-200 text-left hover:scale-[1.01] sm:hover:scale-[1.02] active:scale-100 ${
                      isSelected
                        ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 cursor-default'
                        : 'border-stone-200 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/20'
                    }`}
                  >
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/5 rounded-xl sm:rounded-2xl transition-all duration-200" />
                    
                    <div className="relative flex items-start gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-amber-500/20 group-hover:to-orange-500/20 transition-all">
                        <Quote className="text-amber-600 dark:text-amber-400" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-stone-900 dark:text-white mb-2 leading-relaxed break-words">
                          "{quote.text}"
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-stone-500 dark:text-stone-400 flex-wrap">
                          <User size={12} />
                          <span className="font-medium">{quote.author}</span>
                          {quote.category && (
                            <>
                              <span>•</span>
                              <span>{quote.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                            <svg className="text-white w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="text-white" size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                <Quote className="text-stone-400" size={24} />
              </div>
              <p className="text-base sm:text-lg font-semibold text-stone-900 dark:text-white mb-2 text-center">
                No quotes generated
              </p>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mb-6 text-center">
                Click the button below to generate quotes
              </p>
              <button
                onClick={() => handleGenerate(false)}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-xl font-bold hover:opacity-90 transition-all duration-200 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 active:scale-95 flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                <Sparkles size={16} />
                Generate Quotes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
