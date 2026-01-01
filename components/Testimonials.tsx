'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '@/lib/api-cache';

interface Review {
  id: number;
  name: string;
  rating: number;
  title: string;
  message: string;
  is_featured: boolean;
  created_at: string;
}

// Custom Arrow Components
const PrevArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="absolute -left-2 sm:-left-4 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 hover:scale-110 active:scale-95"
  >
    <ChevronLeft size={16} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
  </button>
);

const NextArrow = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="absolute -right-2 sm:-right-4 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 hover:scale-110 active:scale-95"
  >
    <ChevronRight size={16} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
  </button>
);

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ users: '5K+', avgRating: '4.9', saved: '50K+' });
  const sliderRef = useRef<Slider>(null);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await apiCache.getOrFetch<{ reviews: Review[] }>(
        CACHE_KEYS.REVIEWS,
        async () => {
          const response = await fetch('/api/reviews');
          if (!response.ok) return { reviews: [] };
          return await response.json();
        },
        { ttl: CACHE_TTL.LONG }
      );
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiCache.getOrFetch<{ stats: { users: string; avgRating: string; saved: string } }>(
        CACHE_KEYS.STATS,
        async () => {
          const response = await fetch('/api/stats');
          if (!response.ok) return { stats: { users: '5K+', avgRating: '4.9', saved: '50K+' } };
          return await response.json();
        },
        { ttl: CACHE_TTL.VERY_LONG }
      );
      setStats({
        users: data.stats.users,
        avgRating: data.stats.avgRating,
        saved: data.stats.saved
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Slick settings - Fully responsive
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    arrows: true,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    customPaging: () => (
      <div className="slick-dot-custom" />
    ),
    dotsClass: 'slick-dots !flex justify-center gap-2 !bottom-[-40px] sm:!bottom-[-50px]',
    responsive: [
      {
        breakpoint: 1024, // Tablet
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          arrows: true,
        }
      },
      {
        breakpoint: 768, // Mobile (< 768px shows 1)
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: true,
        }
      },
      {
        breakpoint: 480, // Small mobile
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          dots: true,
        }
      }
    ]
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 sm:py-12">
        <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="py-8 sm:py-12 md:py-16">
      {/* Section Header */}
      <div className="text-center mb-8 sm:mb-10 md:mb-12 px-4">
        {/* <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500/10 to-pink-500/10 dark:from-blue-500/20 dark:to-pink-500/20 rounded-full mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">💬 Testimonials</span>
        </div> */}
        <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
          What Our Users Say
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md lg:max-w-lg mx-auto px-4">
          Join thousands of happy users who find daily inspiration with QuoteSwipe
        </p>
      </div>

      {/* Slick Slider */}
      <div className="relative max-w-6xl mx-auto px-6 sm:px-8 md:px-12 pb-12 sm:pb-16">
        <Slider ref={sliderRef} {...settings}>
          {reviews.map((review) => (
            <div key={review.id} className="px-2 sm:px-3">
              <div className="h-full bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                {/* Gradient Border Top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
                
                {/* Featured Badge */}
                {review.is_featured && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold rounded-full">
                    ⭐ Featured
                  </div>
                )}
                
                {/* Quote Icon - Hidden on very small screens */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 opacity-5">
                  <Quote size={40} className="sm:w-16 sm:h-16 md:w-20 md:h-20 text-amber-500" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Stars */}
                  <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={`sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] ${
                          star <= review.rating 
                            ? 'text-yellow-400 fill-yellow-400' 
                            : 'text-gray-200 dark:text-gray-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Title */}
                  {review.title && (
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base mb-2 line-clamp-1">
                      {review.title}
                    </h4>
                  )}

                  {/* Message */}
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 sm:mb-6 text-xs sm:text-sm md:text-base line-clamp-4 min-h-[60px] sm:min-h-[80px]">
                    "{review.message}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center text-white font-bold text-[10px] sm:text-xs md:text-sm shadow-md flex-shrink-0">
                      {getInitials(review.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                        {review.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        QuoteSwipe User
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>

      {/* Stats Section */}
      {/* <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 mt-4 sm:mt-6 md:mt-8 px-4">
        <div className="text-center min-w-[80px] sm:min-w-[100px]">
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
            {stats.users}
          </p>
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Happy Users</p>
        </div>
        <div className="text-center min-w-[80px] sm:min-w-[100px]">
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
            {stats.avgRating}
          </p>
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Average Rating</p>
        </div>
        <div className="text-center min-w-[80px] sm:min-w-[100px]">
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
            {stats.saved}
          </p>
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">Quotes Saved</p>
        </div>
      </div> */}
    </div>
  );
}
