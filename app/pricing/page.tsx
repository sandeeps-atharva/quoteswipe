'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Sparkles, Crown, Zap, Star, ArrowLeft, Shield, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

// Plan types
type PlanId = 'free' | 'monthly' | 'yearly' | 'lifetime';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  period: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  features: { text: string; included: boolean; highlight?: boolean }[];
  buttonText: string;
  buttonStyle: 'outline' | 'gradient' | 'solid';
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basics',
    price: 0,
    period: 'forever',
    icon: <Zap className="w-6 h-6" />,
    features: [
      { text: '3 categories access', included: true },
      { text: 'Save up to 10 quotes', included: true },
      { text: 'Create 3 quotes', included: true },
      { text: '5 downloads per day', included: true },
      { text: 'HD quality images', included: true },
      { text: '3 basic themes', included: true },
      { text: 'Watermark on images', included: true },
      { text: 'Contains ads', included: true },
      { text: 'All categories', included: false },
      { text: 'Unlimited saves', included: false },
      { text: 'No watermark', included: false },
      { text: 'Custom backgrounds', included: false },
    ],
    buttonText: 'Current Plan',
    buttonStyle: 'outline',
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    description: 'Full access, billed monthly',
    price: 99,
    period: '/month',
    icon: <Star className="w-6 h-6" />,
    features: [
      { text: 'All 164+ categories', included: true, highlight: true },
      { text: 'Unlimited saved quotes', included: true, highlight: true },
      { text: 'Create 50 quotes', included: true },
      { text: 'Unlimited downloads', included: true, highlight: true },
      { text: 'Full HD quality (1080p)', included: true },
      { text: 'All 20+ themes', included: true },
      { text: 'No watermark', included: true, highlight: true },
      { text: 'No ads', included: true, highlight: true },
      { text: 'All share formats', included: true },
      { text: 'Custom camera backgrounds', included: true },
      { text: 'Font size control', included: true },
      { text: 'Position control', included: true },
    ],
    buttonText: 'Subscribe Now',
    buttonStyle: 'solid',
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    description: 'Best value, save 33%',
    price: 799,
    originalPrice: 1188,
    period: '/year',
    icon: <Crown className="w-6 h-6" />,
    badge: 'BEST VALUE',
    badgeColor: 'from-amber-500 to-orange-500',
    features: [
      { text: 'Everything in Monthly', included: true, highlight: true },
      { text: 'Unlimited quote creation', included: true, highlight: true },
      { text: '2K quality images', included: true, highlight: true },
      { text: '5 exclusive themes', included: true },
      { text: '20 bonus backgrounds', included: true },
      { text: 'Batch download (10 at once)', included: true },
      { text: 'Quote collections/folders', included: true },
      { text: 'Quote reminders', included: true },
      { text: 'Priority support', included: true, highlight: true },
      { text: 'Early access features', included: false },
      { text: 'Custom branding', included: false },
      { text: 'API access', included: false },
    ],
    buttonText: 'Get Yearly',
    buttonStyle: 'gradient',
    popular: true,
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    description: 'Pay once, own forever',
    price: 1999,
    period: 'one-time',
    icon: <Sparkles className="w-6 h-6" />,
    badge: 'LIFETIME',
    badgeColor: 'from-purple-500 to-pink-500',
    features: [
      { text: 'Everything in Yearly', included: true, highlight: true },
      { text: '4K quality images', included: true, highlight: true },
      { text: 'All future features FREE', included: true, highlight: true },
      { text: 'All future themes FREE', included: true, highlight: true },
      { text: 'Custom watermark/branding', included: true },
      { text: 'API access (1000 req/day)', included: true },
      { text: 'Export all data', included: true },
      { text: 'VIP 24/7 support', included: true, highlight: true },
      { text: 'Beta tester access', included: true },
      { text: 'Founder badge on profile', included: true },
      { text: 'Priority feature requests', included: true },
      { text: 'No recurring charges', included: true, highlight: true },
    ],
    buttonText: 'Get Lifetime',
    buttonStyle: 'gradient',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState<PlanId | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check authentication and current subscription
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        const data = await response.json();
        
        if (data.success && data.subscription) {
          setCurrentPlan(data.subscription.plan);
          setIsAuthenticated(data.subscription.status !== 'none' || data.subscription.plan !== 'free');
        }
        
        // Also check if user is logged in
        const authResponse = await fetch('/api/auth/me');
        const authData = await authResponse.json();
        setIsAuthenticated(!!authData.user);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === 'free') return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please login to subscribe');
      router.push('/?login=true');
      return;
    }

    // Check if trying to subscribe to current or lower plan
    if (planId === currentPlan) {
      toast.error('You are already on this plan');
      return;
    }

    setIsLoading(planId);

    try {
      // Create order
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      // Initialize Razorpay
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'QuoteSwipe',
        description: `${orderData.plan.name} Subscription`,
        image: '/logo.svg',
        order_id: orderData.order.id,
        handler: async function (response: any) {
          // Verify payment
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success('🎉 Welcome to Pro! Your subscription is now active.');
              setCurrentPlan(planId);
              // Redirect to home after successful payment
              setTimeout(() => {
                router.push('/');
              }, 2000);
            } else {
              throw new Error(verifyData.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: orderData.user.name,
          email: orderData.user.email,
        },
        notes: {
          plan_id: planId,
        },
        theme: {
          color: '#7c3aed',
        },
        modal: {
          ondismiss: function() {
            setIsLoading(null);
            toast.error('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setIsLoading(null);
      });

      razorpay.open();
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setIsLoading(null);
    }
  };

  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Get button text based on current plan
  const getButtonText = (planId: PlanId) => {
    if (planId === 'free') return 'Current Plan';
    if (planId === currentPlan) return 'Current Plan';
    if (isLoading === planId) return 'Processing...';
    return PLANS.find(p => p.id === planId)?.buttonText || 'Subscribe';
  };

  // Check if button should be disabled
  const isButtonDisabled = (planId: PlanId) => {
    if (planId === 'free') return true;
    if (planId === currentPlan) return true;
    if (isLoading) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 overflow-x-hidden">
      <Toaster position="top-center" />
      
      {/* Loading overlay */}
      {isCheckingAuth && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <ArrowLeft size={20} className="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
              <Image src="/logo.svg" alt="QuoteSwipe" width={32} height={32} />
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                QuoteSwipe
              </span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Shield size={16} />
              <span className="hidden sm:inline">Secure Payment</span>
              {currentPlan !== 'free' && (
                <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                  PRO
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-8 pb-6 sm:pt-16 sm:pb-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500/10 to-pink-500/10 rounded-full mb-4 sm:mb-6">
            <Sparkles size={14} className="sm:w-4 sm:h-4 text-blue-500" />
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              Unlock Premium Features
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white mb-3 sm:mb-4 px-2">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h1>
          
          <p className="text-sm sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            Create beautiful quote images, access all categories, and share without limits.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 sm:gap-3 p-1 sm:p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg sm:rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 sm:gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Yearly
              <span className="px-1.5 py-0.5 text-[8px] sm:text-[10px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full">
                -33%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-12 sm:pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Mobile scroll navigation hint */}
          <div className="flex items-center justify-between px-4 mb-4 md:hidden">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Swipe to see all plans →
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => scrollCards('left')}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scrollCards('right')}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Cards Container */}
          <div
            ref={scrollContainerRef}
            className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide px-4 pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl transition-all duration-300 flex-shrink-0 w-[280px] sm:w-[300px] md:w-auto snap-center ${
                  plan.popular
                    ? 'bg-gradient-to-b from-blue-600 via-purple-600 to-pink-600 p-[2px] md:scale-105 shadow-2xl shadow-purple-500/25'
                    : 'bg-gray-200 dark:bg-gray-800 p-[1px]'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className={`absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 sm:px-4 sm:py-1 bg-gradient-to-r ${plan.badgeColor} text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg z-10`}>
                    {plan.badge}
                  </div>
                )}

                <div className={`h-full rounded-2xl p-4 sm:p-6 ${
                  plan.popular
                    ? 'bg-white dark:bg-gray-900'
                    : 'bg-white dark:bg-gray-900'
                }`}>
                  {/* Plan Header */}
                  <div className="mb-4 sm:mb-6">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 ${
                      plan.id === 'free' ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                      plan.id === 'monthly' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      plan.id === 'yearly' ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-600 dark:text-amber-400' :
                      'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-600 dark:text-purple-400'
                    }`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
                        ₹{plan.price}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                        {plan.period}
                      </span>
                    </div>
                    {plan.originalPrice && (
                      <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 line-through mt-1">
                        ₹{plan.originalPrice}/year
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isButtonDisabled(plan.id)}
                    className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all mb-4 sm:mb-6 disabled:cursor-not-allowed disabled:opacity-60 ${
                      plan.id === currentPlan
                        ? 'border-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : plan.buttonStyle === 'outline'
                        ? 'border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        : plan.buttonStyle === 'gradient'
                        ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                    }`}
                  >
                    {isLoading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : plan.id === currentPlan ? (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        Current Plan
                      </span>
                    ) : (
                      getButtonText(plan.id)
                    )}
                  </button>

                  {/* Features List */}
                  <div className="space-y-2 sm:space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 sm:gap-3">
                        <div className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center mt-0.5 ${
                          feature.included
                            ? feature.highlight
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                        }`}>
                          {feature.included ? (
                            <Check size={10} className="sm:w-3 sm:h-3" strokeWidth={3} />
                          ) : (
                            <X size={10} className="sm:w-3 sm:h-3" strokeWidth={3} />
                          )}
                        </div>
                        <span className={`text-xs sm:text-sm ${
                          feature.included
                            ? feature.highlight
                              ? 'text-gray-900 dark:text-white font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400 dark:text-gray-600 line-through'
                        }`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll indicators for mobile */}
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {PLANS.map((plan, idx) => (
              <div
                key={plan.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === 2 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-8 sm:py-12 px-4 bg-gray-100/50 dark:bg-gray-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-4 gap-3 sm:gap-6 text-center">
            <div>
              <div className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">164+</div>
              <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Categories</div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">10K+</div>
              <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Quotes</div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">50+</div>
              <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Backgrounds</div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">4K</div>
              <div className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400">Quality</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-6 sm:mb-10">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            {[
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit/debit cards, UPI, net banking, and popular wallets through Razorpay.',
              },
              {
                q: 'Is there a refund policy?',
                a: 'Yes, we offer a 7-day money-back guarantee for all paid plans. If you\'re not satisfied, contact us for a full refund.',
              },
              {
                q: 'What happens when my subscription expires?',
                a: 'You\'ll be downgraded to the Free plan. Your saved quotes and created content will remain, but you\'ll have limited access to premium features.',
              },
              {
                q: 'Is Lifetime really lifetime?',
                a: 'Yes! The Lifetime plan is a one-time payment that gives you permanent access to all current and future features forever.',
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer list-none">
                  <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white pr-3 sm:pr-4">{faq.q}</span>
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-open:rotate-45 transition-transform">
                    <span className="text-lg sm:text-xl leading-none">+</span>
                  </span>
                </summary>
                <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 -mt-1 sm:-mt-2">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-10 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">
              Ready to Create Amazing Quotes?
            </h2>
            <p className="text-blue-100 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto">
              Join thousands of creators who use QuoteSwipe to create and share beautiful quote images.
            </p>
            <button
              onClick={() => handleSubscribe('yearly')}
              className="px-6 py-3 sm:px-8 sm:py-4 bg-white text-gray-900 font-bold text-sm sm:text-base rounded-xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Get Started with Pro
            </button>
            <p className="text-blue-200 text-xs sm:text-sm mt-3 sm:mt-4">
              7-day money-back guarantee • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="QuoteSwipe" width={20} height={20} className="sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              © 2024 QuoteSwipe
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <Link href="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">Privacy</Link>
            <Link href="/contact" className="hover:text-gray-700 dark:hover:text-gray-300">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

