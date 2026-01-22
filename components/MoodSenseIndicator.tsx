'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useMoodSense } from '@/contexts/MoodSenseContext';
import MoodSelector from './MoodSelector';
import toast from 'react-hot-toast';

interface MoodSenseIndicatorProps {
  categories?: Array<{ id: string; name: string; icon: string }>;
  onCategoriesSuggested?: (categories: string[]) => void;
}

export default function MoodSenseIndicator({ 
  categories = [],
  onCategoriesSuggested,
}: MoodSenseIndicatorProps) {
  const { currentMood, isMoodSenseActive, toggleMoodSense, getEmotionalInsight, shouldSuggestReflection } = useMoodSense();
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const insightRef = useRef<string | null>(null);

  // Check for insights periodically
  useEffect(() => {
    if (!isMoodSenseActive) return;

    const checkInsight = () => {
      const insight = getEmotionalInsight();
      if (insight && insight !== insightRef.current) {
        insightRef.current = insight;
        if (shouldSuggestReflection()) {
          setShowInsight(true);
          setTimeout(() => {
            setShowInsight(false);
          }, 8000);
        }
      }
    };

    const interval = setInterval(checkInsight, 5000);
    return () => clearInterval(interval);
  }, [isMoodSenseActive, getEmotionalInsight, shouldSuggestReflection]);

  const handleToggle = () => {
    if (!isMoodSenseActive) {
      setShowMoodSelector(true);
    } else {
      toggleMoodSense();
    }
  };

  const getMoodColor = () => {
    if (!currentMood) return 'text-amber-500';
    
    const colorMap: Record<string, string> = {
      hopeful: 'text-yellow-500',
      lonely: 'text-blue-500',
      motivated: 'text-orange-500',
      anxious: 'text-red-500',
      heartbroken: 'text-pink-500',
      calm: 'text-cyan-500',
      excited: 'text-amber-500',
      grateful: 'text-rose-500',
      determined: 'text-purple-500',
      reflective: 'text-indigo-500',
    };
    
    return currentMood.emotion ? (colorMap[currentMood.emotion] || 'text-amber-500') : 'text-amber-500';
  };

  const getMoodLabel = () => {
    if (!currentMood) return 'Set Mood';
    const labels: Record<string, string> = {
      hopeful: 'Hopeful',
      lonely: 'Lonely',
      motivated: 'Motivated',
      anxious: 'Anxious',
      heartbroken: 'Heartbroken',
      calm: 'Calm',
      excited: 'Excited',
      grateful: 'Grateful',
      determined: 'Determined',
      reflective: 'Reflective',
      inspired: 'Inspired',
      peaceful: 'Peaceful',
      energetic: 'Energetic',
      contemplative: 'Contemplative',
      joyful: 'Joyful',
      melancholic: 'Melancholic',
      confident: 'Confident',
      uncertain: 'Uncertain',
      content: 'Content',
      restless: 'Restless',
    };
    return currentMood.emotion ? (labels[currentMood.emotion] || 'Mood') : 'Set Mood';
  };

  return (
    <>
      {/* Floating MoodSense Button */}
      <button
        onClick={handleToggle}
        className={`
          fixed right-4 bottom-24 z-40 
          flex items-center justify-center
          w-14 h-14 rounded-2xl
          transition-all duration-300 
          hover:scale-105 active:scale-95
          group
          ${isMoodSenseActive && currentMood
            ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/40'
            : 'bg-stone-800/90 dark:bg-stone-900/90 backdrop-blur-sm border border-stone-700/50 dark:border-stone-700/50 shadow-lg hover:shadow-xl hover:border-stone-600/50'
          }
          animate-in fade-in slide-in-from-right-4 duration-500
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label={isMoodSenseActive && currentMood ? `MoodSense: ${getMoodLabel()}` : 'Set your mood'}
      >
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Main sparkle icon */}
          <Sparkles 
            size={24} 
            className={`
              transition-all duration-300 relative z-10
              ${isMoodSenseActive && currentMood 
                ? 'text-white' 
                : 'text-amber-500 dark:text-amber-400'
              }
            `} 
          />
          
          {/* Decorative dots - positioned like in the image */}
          {isMoodSenseActive && currentMood && (
            <>
              {/* Bottom left dot */}
              <div className="absolute bottom-1 left-1.5 w-1.5 h-1.5 bg-white rounded-full opacity-90" />
              {/* Top right dot */}
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-white rounded-full opacity-90" />
            </>
          )}
          
          {/* Subtle pulse effect when active */}
          {isMoodSenseActive && currentMood && (
            <div className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse" />
          )}
        </div>
      </button>

      {/* Insight Banner */}
      {showInsight && insightRef.current && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 animate-in slide-in-from-top-4 fade-in zoom-in-95 duration-300">
          <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl shadow-2xl shadow-amber-500/40 p-4 flex items-start gap-3 overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/50 via-orange-400/50 to-rose-400/50 animate-pulse" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative flex items-start gap-3 w-full">
              <div className="mt-0.5 shrink-0">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-relaxed">{insightRef.current}</p>
              </div>
              <button
                onClick={() => {
                  setShowInsight(false);
                  insightRef.current = null;
                }}
                className="shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mood Selector Modal */}
      <MoodSelector
        isOpen={showMoodSelector}
        onClose={() => setShowMoodSelector(false)}
        onMoodSet={() => {
          toast.success('MoodSense activated! Your quotes will be personalized.', {
            icon: '✨',
            style: {
              background: 'linear-gradient(to right, #f59e0b, #f97316, #e11d48)',
              color: 'white',
            },
          });
        }}
        categories={categories}
        onCategoriesSuggested={onCategoriesSuggested}
      />
    </>
  );
}
