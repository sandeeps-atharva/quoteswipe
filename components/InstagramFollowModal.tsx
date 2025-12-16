'use client';

import { Instagram } from 'lucide-react';
import Modal from './Modal';

interface InstagramFollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFollow?: () => void;
  instagramHandle?: string;
}

export default function InstagramFollowModal({
  isOpen,
  onClose,
  onFollow,
  instagramHandle = '@quote_swipe',
}: InstagramFollowModalProps) {
  const handleFollow = () => {
    // Open Instagram profile in new tab
    const instagramUrl = `https://www.instagram.com/${instagramHandle.replace('@', '')}/`;
    window.open(instagramUrl, '_blank', 'noopener,noreferrer');
    
    if (onFollow) {
      onFollow();
    }
    
    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="text-center"
    >
      <div className="flex flex-col items-center">
        {/* Instagram Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-4 sm:mb-5 md:mb-6 rounded-full bg-gradient-to-br from-blue-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
          <Instagram size={28} className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" fill="currentColor" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2 sm:mb-3">
          Follow Us on Instagram!
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 px-2">
          Get daily inspiration and discover more amazing quotes
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mb-5 sm:mb-6 md:mb-8">
          Follow <span className="font-semibold text-blue-600 dark:text-blue-400">{instagramHandle}</span> for more content
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
          <button
            onClick={handleFollow}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 bg-gradient-to-r from-blue-500 via-pink-500 to-rose-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <Instagram size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Follow on Instagram</span>
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Maybe Later
          </button>
        </div>

        {/* Additional Info */}
        <p className="mt-4 sm:mt-5 md:mt-6 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
          You can continue swiping after this
        </p>
      </div>
    </Modal>
  );
}
