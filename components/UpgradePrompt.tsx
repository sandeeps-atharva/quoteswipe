'use client';

import { useState } from 'react';
import { Crown, Lock, Sparkles, X, Zap } from 'lucide-react';
import Link from 'next/link';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: 'inline' | 'modal' | 'banner' | 'tooltip';
  onClose?: () => void;
  limit?: number;
  current?: number;
}

export function UpgradePrompt({ 
  feature, 
  description, 
  variant = 'inline',
  onClose,
  limit,
  current,
}: UpgradePromptProps) {
  if (variant === 'tooltip') {
    return (
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Crown size={12} className="text-amber-400" />
          <span>Pro feature</span>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full"
          >
            <X size={14} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Crown size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{feature}</p>
            <p className="text-xs text-white/80">{description || 'Upgrade to Pro to unlock this feature'}</p>
          </div>
          <Link
            href="/pricing"
            className="px-4 py-2 bg-white text-purple-600 font-semibold text-xs rounded-lg hover:bg-white/90 transition-colors"
          >
            Upgrade
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X size={18} className="text-gray-500" />
            </button>
          )}
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <Crown size={32} className="text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {feature}
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {description || 'This feature is available for Pro members. Upgrade now to unlock it!'}
            </p>

            {limit !== undefined && current !== undefined && (
              <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Usage</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {current} / {limit}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (current / limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Link
                href="/pricing"
                className="block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={18} />
                  Upgrade to Pro
                </span>
              </Link>
              
              {onClose && (
                <button
                  onClick={onClose}
                  className="block w-full py-3 text-gray-600 dark:text-gray-400 font-medium text-sm hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Maybe later
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: inline variant
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-800 rounded-lg">
      <Lock size={14} className="text-purple-500" />
      <span className="text-xs text-purple-700 dark:text-purple-300 flex-1">
        {feature} - Pro only
      </span>
      <Link
        href="/pricing"
        className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
      >
        Upgrade
      </Link>
    </div>
  );
}

// Lock badge for premium features
export function ProBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-sm`}>
      <Crown size={size === 'xs' ? 8 : size === 'sm' ? 10 : 12} />
    </div>
  );
}

// Lock overlay for premium items
export function ProLockOverlay({ children, isLocked, feature }: { 
  children: React.ReactNode; 
  isLocked: boolean;
  feature?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isLocked) return <>{children}</>;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30 rounded-lg">
        <div className="w-6 h-6 rounded-full bg-gray-900/80 dark:bg-white/80 flex items-center justify-center">
          <Lock size={12} className="text-white dark:text-gray-900" />
        </div>
      </div>
      {showTooltip && feature && (
        <UpgradePrompt feature={feature} variant="tooltip" />
      )}
    </div>
  );
}

// Limit indicator
export function LimitIndicator({ 
  current, 
  limit, 
  label,
  showUpgrade = true,
}: { 
  current: number; 
  limit: number; 
  label: string;
  showUpgrade?: boolean;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`font-medium ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
          }`}
          style={{ width: isUnlimited ? '10%' : `${percentage}%` }}
        />
      </div>
      {isAtLimit && showUpgrade && (
        <Link
          href="/pricing"
          className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
        >
          <Zap size={10} />
          Upgrade for unlimited
        </Link>
      )}
    </div>
  );
}

