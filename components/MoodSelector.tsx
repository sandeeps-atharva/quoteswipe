'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Heart, Cloud, Zap, AlertCircle, HeartCrack, Moon, Sun, Star, Target, Brain, Lightbulb, Waves, Rocket, BookOpen, Smile, Droplet, Shield, HelpCircle, Coffee, ArrowRight, Quote, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useMoodSense, Emotion, EmotionalIntensity } from '@/contexts/MoodSenseContext';
import GenerateQuotesModal from './GenerateQuotesModal';
import toast from 'react-hot-toast';

interface MoodOption {
  emotion: Emotion;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  gradient: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { emotion: 'hopeful', label: 'Hopeful', icon: Sun, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', gradient: 'from-yellow-400 to-amber-500' },
  { emotion: 'lonely', label: 'Lonely', icon: Moon, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', gradient: 'from-blue-400 to-indigo-500' },
  { emotion: 'motivated', label: 'Motivated', icon: Rocket, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', gradient: 'from-orange-400 to-red-500' },
  { emotion: 'anxious', label: 'Anxious', icon: AlertCircle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', gradient: 'from-red-400 to-rose-500' },
  { emotion: 'heartbroken', label: 'Heartbroken', icon: HeartCrack, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-900/20', gradient: 'from-pink-400 to-rose-500' },
  { emotion: 'calm', label: 'Calm', icon: Waves, color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-900/20', gradient: 'from-cyan-400 to-blue-500' },
  { emotion: 'excited', label: 'Excited', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', gradient: 'from-amber-400 to-yellow-500' },
  { emotion: 'grateful', label: 'Grateful', icon: Heart, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-900/20', gradient: 'from-rose-400 to-pink-500' },
  { emotion: 'determined', label: 'Determined', icon: Target, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', gradient: 'from-purple-400 to-indigo-500' },
  { emotion: 'reflective', label: 'Reflective', icon: Brain, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20', gradient: 'from-indigo-400 to-purple-500' },
  { emotion: 'inspired', label: 'Inspired', icon: Lightbulb, color: 'text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', gradient: 'from-yellow-300 to-amber-400' },
  { emotion: 'peaceful', label: 'Peaceful', icon: Cloud, color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-900/20', gradient: 'from-sky-400 to-cyan-500' },
  { emotion: 'energetic', label: 'Energetic', icon: Zap, color: 'text-lime-500', bgColor: 'bg-lime-50 dark:bg-lime-900/20', gradient: 'from-lime-400 to-green-500' },
  { emotion: 'contemplative', label: 'Contemplative', icon: BookOpen, color: 'text-slate-500', bgColor: 'bg-slate-50 dark:bg-slate-900/20', gradient: 'from-slate-400 to-gray-500' },
  { emotion: 'joyful', label: 'Joyful', icon: Smile, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20', gradient: 'from-yellow-400 to-orange-400' },
  { emotion: 'melancholic', label: 'Melancholic', icon: Droplet, color: 'text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20', gradient: 'from-blue-300 to-indigo-400' },
  { emotion: 'confident', label: 'Confident', icon: Shield, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', gradient: 'from-emerald-400 to-teal-500' },
  { emotion: 'uncertain', label: 'Uncertain', icon: HelpCircle, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900/20', gradient: 'from-gray-400 to-slate-500' },
  { emotion: 'content', label: 'Content', icon: Coffee, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20', gradient: 'from-amber-500 to-orange-500' },
  { emotion: 'restless', label: 'Restless', icon: Sparkles, color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-900/20', gradient: 'from-violet-400 to-purple-500' },
];

const INTENSITY_OPTIONS: { value: EmotionalIntensity; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'soft', label: 'Soft', description: 'Gentle and soothing', icon: Waves },
  { value: 'moderate', label: 'Moderate', description: 'Balanced and thoughtful', icon: Cloud },
  { value: 'deep', label: 'Deep', description: 'Meaningful and profound', icon: Brain },
  { value: 'bold', label: 'Bold', description: 'Powerful and intense', icon: Zap },
];

interface MoodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onMoodSet?: () => void;
  categories?: Array<{ id: string; name: string; icon: string }>;
  onCategoriesSuggested?: (categories: string[]) => void;
  onQuoteGenerated?: (quote: { text: string; author: string; category?: string }) => void;
}

export default function MoodSelector({ 
  isOpen, 
  onClose, 
  onMoodSet,
  categories = [],
  onCategoriesSuggested,
  onQuoteGenerated,
}: MoodSelectorProps) {
  const { setMood, currentMood, suggestCategories } = useMoodSense();
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(currentMood?.emotion || null);
  const [selectedIntensity, setSelectedIntensity] = useState<EmotionalIntensity>(currentMood?.intensity || 'moderate');
  const [userInput, setUserInput] = useState('');
  const [showIntensity, setShowIntensity] = useState(false);
  const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [moodInputMode, setMoodInputMode] = useState<'select' | 'type' | 'image'>('select'); // New: 'select', 'type', or 'image'
  const [typedMood, setTypedMood] = useState(''); // New: for free-text mood input
  const [showGenerateQuotesModal, setShowGenerateQuotesModal] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // Base64 image
  const [imageMimeType, setImageMimeType] = useState<string>(''); // Image MIME type
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageSentiment, setImageSentiment] = useState<{ mood: string; intensity?: string; description: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showIntensity) {
          setShowIntensity(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, showIntensity, onClose]);

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

  if (!isOpen) return null;

  const handleEmotionSelect = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
    setIsAnimating(true);
    setTimeout(() => {
      setShowIntensity(true);
      setIsAnimating(false);
    }, 200);
  };

  const handleSetMood = async () => {
    // Handle typed mood mode
    if (moodInputMode === 'type' && typedMood.trim()) {
      // For typed moods, we'll use AI to understand and suggest categories
      // We'll pass the typed mood as userInput and let AI interpret it
      if (categories.length > 0 && onCategoriesSuggested) {
        setIsLoadingSuggestions(true);
        try {
          // Use typed mood as the primary input - AI will interpret it
          const suggestions = await suggestCategories(
            categories,
            undefined, // No predefined emotion
            selectedIntensity,
            undefined, // No additional userInput
            typedMood.trim() // Use typed mood as freeTextMood
          );
          setSuggestedCategories(suggestions);
          if (suggestions.length > 0) {
            onCategoriesSuggested(suggestions);
          }
          // Set mood with typed text (we'll store it as a custom mood)
          setMood('content' as Emotion, selectedIntensity, typedMood.trim());
        } catch (error) {
          console.error('[MoodSelector] Failed to get category suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      } else {
        setMood('content' as Emotion, selectedIntensity, typedMood.trim());
      }
      onMoodSet?.();
      onClose();
      return;
    }

    // Handle selected emotion mode
    if (selectedEmotion) {
      setMood(selectedEmotion, selectedIntensity, userInput.trim() || undefined);
      
      if (categories.length > 0 && onCategoriesSuggested) {
        setIsLoadingSuggestions(true);
        try {
          const suggestions = await suggestCategories(
            categories,
            selectedEmotion,
            selectedIntensity,
            userInput.trim() || undefined
          );
          setSuggestedCategories(suggestions);
          if (suggestions.length > 0) {
            onCategoriesSuggested(suggestions);
          }
        } catch (error) {
          console.error('[MoodSelector] Failed to get category suggestions:', error);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }
      
      onMoodSet?.();
      onClose();
    }
  };

  const selectedMoodOption = selectedEmotion ? MOOD_OPTIONS.find(m => m.emotion === selectedEmotion) : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !showIntensity && onClose()}
    >
      {/* Backdrop with warm gradient */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-rose-500/10" />
      </div>
      
      {/* Modal */}
      <div className={`
        relative bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl shadow-2xl shadow-stone-900/30 dark:shadow-black/50
        max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden
        border border-stone-200/50 dark:border-stone-700/50
        animate-in zoom-in-95 fade-in duration-300
        ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} transition-all duration-200
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
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                MoodSense
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {showIntensity ? 'Choose intensity' : 'How are you feeling right now?'}
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
          {!showIntensity ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Mode Toggle: Select vs Type vs Image */}
              <div className="flex gap-1.5 sm:gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                <button
                  onClick={() => {
                    setMoodInputMode('select');
                    setTypedMood('');
                    setUploadedImage(null);
                    setImageSentiment(null);
                  }}
                  className={`flex-1 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                    moodInputMode === 'select'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  Select
                </button>
                <button
                  onClick={() => {
                    setMoodInputMode('type');
                    setSelectedEmotion(null);
                    setUploadedImage(null);
                    setImageSentiment(null);
                  }}
                  className={`flex-1 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                    moodInputMode === 'type'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  Type
                </button>
                <button
                  onClick={() => {
                    setMoodInputMode('image');
                    setSelectedEmotion(null);
                    setTypedMood('');
                    fileInputRef.current?.click();
                  }}
                  className={`flex-1 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                    moodInputMode === 'image'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">Upload Image</span>
                  <span className="sm:hidden">Image</span>
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  // Validate file type
                  if (!file.type.startsWith('image/')) {
                    toast.error('Please select an image file');
                    return;
                  }

                  // Validate file size (max 5MB)
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error('Image must be less than 5MB');
                    return;
                  }

                  setIsAnalyzingImage(true);
                  setMoodInputMode('image');

                  try {
                    // Convert to base64
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const base64 = event.target?.result as string;
                      setUploadedImage(base64);
                      setImageMimeType(file.type);

                      // Set image data and auto-open quote generation modal
                      setImageSentiment({
                        mood: 'analyzing',
                        intensity: 'moderate',
                        description: 'Analyzing image...'
                      });
                      setIsAnalyzingImage(false);
                      
                      // Auto-open quote generation modal with image
                      setTimeout(() => {
                        setShowGenerateQuotesModal(true);
                      }, 300);
                    };
                    reader.onerror = () => {
                      toast.error('Failed to read image');
                      setIsAnalyzingImage(false);
                    };
                    reader.readAsDataURL(file);
                  } catch (error) {
                    console.error('[MoodSelector] Error uploading image:', error);
                    toast.error('Failed to upload image');
                    setIsAnalyzingImage(false);
                  }
                }}
              />

              {moodInputMode === 'image' ? (
                /* Image upload and analysis */
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-white mb-2">
                      Upload Image for Sentiment Analysis
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mb-3 sm:mb-4">
                      Upload an image and AI will analyze its emotional sentiment to generate personalized quotes.
                    </p>
                    
                    {isAnalyzingImage ? (
                      <div className="flex flex-col items-center justify-center py-12 sm:py-16 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 animate-spin mb-3" />
                        <p className="text-sm sm:text-base font-medium text-stone-900 dark:text-white mb-1">
                          Analyzing image...
                        </p>
                        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                          AI is detecting the mood and sentiment
                        </p>
                      </div>
                    ) : uploadedImage ? (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Image Preview */}
                        <div className="relative rounded-xl overflow-hidden border-2 border-stone-200 dark:border-stone-700">
                          <img
                            src={uploadedImage}
                            alt="Uploaded"
                            className="w-full h-auto max-h-64 sm:max-h-80 object-cover"
                          />
                          <button
                            onClick={() => {
                              setUploadedImage(null);
                              setImageSentiment(null);
                              setImageMimeType('');
                            }}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-all"
                          >
                            <X className="text-white" size={16} />
                          </button>
                        </div>

                        {/* Image ready indicator */}
                        {uploadedImage && (
                          <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl sm:rounded-2xl border-2 border-purple-500/30 dark:border-purple-400/30">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                                <ImageIcon className="text-white" size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm sm:text-base font-semibold text-stone-900 dark:text-white mb-1">
                                  Image Ready
                                </p>
                                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                                  Click "Generate AI Quotes" to create quotes based on this image
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800/50 p-8 sm:p-12 text-center cursor-pointer hover:border-amber-500 dark:hover:border-amber-400 transition-all hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-stone-400 mx-auto mb-3 sm:mb-4" />
                        <p className="text-sm sm:text-base font-medium text-stone-900 dark:text-white mb-1">
                          Click to upload image
                        </p>
                        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                          JPEG, PNG, WebP (max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : moodInputMode === 'type' ? (
                /* Free-text mood input */
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-white mb-2">
                      How are you feeling?
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mb-3 sm:mb-4">
                      Describe your mood in your own words. AI will understand and suggest relevant categories.
                    </p>
                    <textarea
                      value={typedMood}
                      onChange={(e) => setTypedMood(e.target.value)}
                      placeholder="e.g., Feeling overwhelmed with work, excited about a new opportunity, missing someone special..."
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/50 border-2 border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                      rows={4}
                      autoFocus
                    />
                    {typedMood.trim() && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                        {typedMood.length} characters
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Emotion Selection */
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <span>Select your mood</span>
                    {selectedEmotion && (
                      <ArrowRight className="text-amber-500 animate-in slide-in-from-right-2 hidden sm:block" size={18} />
                    )}
                  </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {MOOD_OPTIONS.map((mood, index) => {
                    const Icon = mood.icon;
                    const isSelected = selectedEmotion === mood.emotion;
                    return (
                      <button
                        key={mood.emotion}
                        onClick={() => handleEmotionSelect(mood.emotion)}
                        className={`
                          group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-200
                          ${isSelected
                            ? `${mood.bgColor} border-${mood.color.split('-')[1]}-500 dark:border-${mood.color.split('-')[1]}-400 shadow-lg shadow-${mood.color.split('-')[1]}-500/20 scale-105`
                            : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:scale-105'
                          }
                          animate-in fade-in slide-in-from-bottom-2
                        `}
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        {/* Selected gradient overlay */}
                        {isSelected && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} opacity-10 rounded-xl sm:rounded-2xl`} />
                        )}
                        <Icon
                          size={24}
                          className={`
                            mx-auto mb-1.5 sm:mb-2 transition-all duration-200
                            ${isSelected 
                              ? `${mood.color} scale-110` 
                              : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-400'
                            }
                          `}
                        />
                        <p className={`
                          text-xs sm:text-sm font-semibold transition-colors
                          ${isSelected
                            ? 'text-stone-900 dark:text-white'
                            : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white'
                          }
                        `}>
                          {mood.label}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Optional User Input */}
                {selectedEmotion && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mt-3 sm:mt-4">
                    <label className="block text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                      Tell us more (optional)
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="What's on your mind? We'll use this to find the perfect quote..."
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-stone-50 dark:bg-stone-800/50 border-2 border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Back button */}
              <button
                onClick={() => setShowIntensity(false)}
                className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 mb-2 flex items-center gap-2 transition-colors group"
              >
                <ArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={14} />
                <span className="hidden sm:inline">Back to emotions</span>
                <span className="sm:hidden">Back</span>
              </button>

              {/* Selected emotion preview */}
              {selectedMoodOption && (
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl ${selectedMoodOption.bgColor} border-2 border-${selectedMoodOption.color.split('-')[1]}-500/30 dark:border-${selectedMoodOption.color.split('-')[1]}-400/30 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4`}>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${selectedMoodOption.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <selectedMoodOption.icon className="text-white" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base text-stone-900 dark:text-white">{selectedMoodOption.label}</p>
                    <p className="text-xs text-stone-600 dark:text-stone-400">Your current mood</p>
                  </div>
                </div>
              )}

              {/* Intensity Selection */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-white mb-3 sm:mb-4">
                  Choose intensity
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {INTENSITY_OPTIONS.map((intensity, index) => {
                    const Icon = intensity.icon;
                    const isSelected = selectedIntensity === intensity.value;
                    return (
                      <button
                        key={intensity.value}
                        onClick={() => setSelectedIntensity(intensity.value)}
                        className={`
                          group relative p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-200
                          ${isSelected
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-amber-500 dark:border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                            : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:scale-105'
                          }
                          animate-in fade-in slide-in-from-bottom-2
                        `}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                            <Icon className="text-white" size={12} />
                          </div>
                        )}
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl mb-2 sm:mb-3 flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg' 
                            : 'bg-stone-200 dark:bg-stone-700 group-hover:bg-stone-300 dark:group-hover:bg-stone-600'
                        }`}>
                          <Icon className={isSelected ? 'text-white' : 'text-stone-500 dark:text-stone-400'} size={18} />
                        </div>
                        <p className={`
                          font-bold mb-1 text-sm sm:text-base transition-colors
                          ${isSelected
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-white'
                          }
                        `}>
                          {intensity.label}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {intensity.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-t border-stone-200/50 dark:border-stone-800/50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:gap-3">
          {/* Generate Quotes Button - Show when mood is set or image uploaded */}
          {(showIntensity || (moodInputMode === 'type' && typedMood.trim()) || (moodInputMode === 'image' && uploadedImage)) && (
            <button
              onClick={() => {
                setShowGenerateQuotesModal(true);
              }}
              className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-xl font-bold hover:opacity-90 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Quote size={16} />
              <span>{moodInputMode === 'image' ? 'Generate Quotes from Image' : 'Generate AI Quotes'}</span>
            </button>
          )}
          
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-all duration-200 hover:scale-105 active:scale-95 text-sm sm:text-base"
            >
              Cancel
            </button>
            {(showIntensity || (moodInputMode === 'type' && typedMood.trim()) || (moodInputMode === 'image' && uploadedImage)) && (
              <button
                onClick={handleSetMood}
                disabled={isLoadingSuggestions || (moodInputMode === 'type' && !typedMood.trim())}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-xl font-bold hover:opacity-90 transition-all duration-200 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoadingSuggestions ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">Analyzing mood...</span>
                    <span className="sm:hidden">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Set Mood</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generate Quotes Modal */}
      {showGenerateQuotesModal && (
        <GenerateQuotesModal
          isOpen={showGenerateQuotesModal}
          onClose={() => setShowGenerateQuotesModal(false)}
          mood={
            moodInputMode === 'image'
              ? 'Image Analysis'
              : moodInputMode === 'type'
              ? typedMood.trim()
              : selectedEmotion
              ? MOOD_OPTIONS.find(m => m.emotion === selectedEmotion)?.label || selectedEmotion
              : ''
          }
          intensity={selectedIntensity}
          userInput={
            moodInputMode === 'type'
              ? undefined
              : userInput.trim() || undefined
          }
          imageBase64={moodInputMode === 'image' ? uploadedImage || undefined : undefined}
          imageMimeType={moodInputMode === 'image' ? imageMimeType || undefined : undefined}
          onQuoteSelect={(quote) => {
            onQuoteGenerated?.(quote);
            setShowGenerateQuotesModal(false);
            // Close MoodSelector modal when quote is selected
            onClose();
          }}
        />
      )}
    </div>
  );
}
