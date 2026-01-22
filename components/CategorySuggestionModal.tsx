'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface CategorySuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedCategories: string[];
  allCategories: Array<{ id: string; name: string; icon: string }>;
  currentSelected: string[];
  onApply: (categories: string[]) => void;
  onSkip: () => void;
}

export default function CategorySuggestionModal({
  isOpen,
  onClose,
  suggestedCategories,
  allCategories,
  currentSelected,
  onApply,
  onSkip,
}: CategorySuggestionModalProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  // Update selected suggestions when modal opens or suggestions change
  useEffect(() => {
    if (isOpen && suggestedCategories.length > 0) {
      setSelectedSuggestions(suggestedCategories);
    }
  }, [isOpen, suggestedCategories]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || suggestedCategories.length === 0) {
    return null;
  }

  // Create category map for quick lookup
  const categoryMap = new Map<string, { id: string; icon: string }>();
  allCategories.forEach(cat => {
    categoryMap.set(cat.name, { id: cat.id, icon: cat.icon });
  });

  const handleToggleSuggestion = (categoryName: string) => {
    setSelectedSuggestions(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleApply = async () => {
    if (selectedSuggestions.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    setIsApplying(true);
    try {
      const merged = [...new Set([...currentSelected, ...selectedSuggestions])];
      await onApply(merged);
      toast.success(`Added ${selectedSuggestions.length} suggested categor${selectedSuggestions.length === 1 ? 'y' : 'ies'}!`, {
        icon: '✨',
      });
      onClose();
    } catch (error) {
      toast.error('Failed to apply categories');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop with warm gradient */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 rounded-3xl shadow-2xl shadow-stone-900/30 dark:shadow-black/50 max-w-lg w-full border border-stone-200/50 dark:border-stone-700/50 animate-in zoom-in-95 fade-in duration-300 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-rose-400/20 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Header */}
        <div className="border-b border-stone-200/50 dark:border-stone-800/50 px-6 py-5 flex items-center justify-between bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Suggested Categories
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Based on your mood
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
          >
            <X size={18} className="text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-5 leading-relaxed">
            We think you might like these categories. Select the ones you want to add to your feed:
          </p>

          {/* Suggested Categories */}
          <div className="space-y-2.5 mb-6">
            {suggestedCategories.map((categoryName, index) => {
              const category = categoryMap.get(categoryName);
              const isSelected = selectedSuggestions.includes(categoryName);
              const alreadySelected = currentSelected.includes(categoryName);

              return (
                <button
                  key={categoryName}
                  onClick={() => !alreadySelected && handleToggleSuggestion(categoryName)}
                  disabled={alreadySelected}
                  className={`
                    w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200
                    animate-in fade-in slide-in-from-left-2
                    ${alreadySelected
                      ? 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:scale-105'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl shrink-0">{category?.icon || '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`
                        font-semibold block truncate
                        ${isSelected || alreadySelected
                          ? 'text-stone-900 dark:text-white'
                          : 'text-stone-700 dark:text-stone-300'
                        }
                      `}>
                        {categoryName}
                      </span>
                      {alreadySelected && (
                        <span className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 block">
                          Already in your feed
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && !alreadySelected && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  {alreadySelected && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-stone-300 dark:bg-stone-600 flex items-center justify-center">
                      <Check size={14} className="text-stone-600 dark:text-stone-300" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selection count */}
          {selectedSuggestions.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Sparkles size={16} />
                {selectedSuggestions.length} categor{selectedSuggestions.length === 1 ? 'y' : 'ies'} selected
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-stone-200/50 dark:border-stone-800/50 px-6 py-4 flex gap-3 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Skip
          </button>
          <button
            onClick={handleApply}
            disabled={selectedSuggestions.length === 0 || isApplying}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-xl font-bold hover:opacity-90 transition-all duration-200 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApplying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Apply {selectedSuggestions.length > 0 && `(${selectedSuggestions.length})`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
