'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, Check } from 'lucide-react';
import Modal from './Modal';
import GoogleSignInButton from './GoogleSignInButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onGoogleSuccess?: (user: { id: number; name: string; email: string }) => void;
  swipeCount?: number;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onLogin,
  onRegister,
  onGoogleSuccess,
  swipeCount = 0,
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [showPassword, setShowPassword] = useState(false);

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePassword = (password: string, isRegister: boolean): string | undefined => {
    if (!password) return 'Password is required';
    if (isRegister) {
      if (password.length < 8) return 'Password must be at least 8 characters';
      if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
      if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
      if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name can only contain letters and spaces';
    return undefined;
  };

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value, authMode === 'register');
      case 'name':
        return validateName(value);
      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (authMode === 'register') {
      const nameError = validateName(formData.name);
      if (nameError) errors.name = nameError;
    }
    
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    
    if (authMode !== 'forgot-password') {
      const passwordError = validatePassword(formData.password, authMode === 'register');
      if (passwordError) errors.password = passwordError;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
    
    if (touched[name]) {
      const fieldError = validateField(name, value);
      setValidationErrors(prev => ({
        ...prev,
        [name]: fieldError,
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const fieldError = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({ name: true, email: true, password: true });
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (authMode === 'login') {
        await onLogin(formData.email, formData.password);
        setFormData({ email: '', password: '', name: '' });
      } else if (authMode === 'register') {
        await onRegister(formData.name.trim(), formData.email, formData.password);
        setFormData({ email: '', password: '', name: '' });
      } else if (authMode === 'forgot-password') {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });

        const data = await response.json();
        if (response.ok) {
          const message = data.instructions 
            ? `${data.message}\n\n${data.instructions}`
            : data.message;
          setSuccessMessage(message);
          setFormData({ email: '', password: '', name: '' });
        } else {
          setError(data.error || 'An error occurred');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setError('');
    setSuccessMessage('');
    setValidationErrors({});
    setTouched({});
  };

  const features = [
    { icon: '📚', text: '210+ Categories' },
    { icon: '💾', text: 'Save Favorites' },
    { icon: '🎨', text: 'Custom Themes' },
    { icon: '∞', text: 'Unlimited Swipes' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" variant="gradient">
      {/* Header with Logo */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-rose-500 rounded-2xl blur-xl opacity-30 scale-110" />
          <Image 
            src="/logo.svg" 
            alt="QuoteSwipe" 
            width={72}
            height={72}
            className="relative w-16 h-16 sm:w-18 sm:h-18 mx-auto"
          />
        </div>
        
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">
          {authMode === 'forgot-password' 
            ? 'Reset Password' 
            : swipeCount >= 5 
              ? 'Loving the quotes?' 
              : 'Welcome Back!'}
        </h2>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          {authMode === 'forgot-password'
            ? "Enter your email and we'll send you a reset link"
            : swipeCount >= 5
              ? 'Create an account to keep swiping and save your favorites!'
              : 'Sign in to access all your saved quotes'}
        </p>
        
        {/* Feature Pills */}
        {/* {authMode !== 'forgot-password' && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {features.map((feature, i) => (
              <span 
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 
                  bg-gradient-to-r from-amber-100 to-rose-100 dark:from-amber-900/30 dark:to-rose-900/30 
                  rounded-full text-xs font-medium text-stone-600 dark:text-stone-300
                  border border-amber-200/50 dark:border-amber-800/30"
              >
                <span>{feature.icon}</span>
                {feature.text}
              </span>
            ))}
          </div>
        )} */}
      </div>

      {/* Auth Mode Toggle */}
      {authMode !== 'forgot-password' && (
        <div className="flex gap-1 mb-6 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-orange-500/25 text-white'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-md shadow-orange-500/25 text-white'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
          <div className="flex items-start gap-2">
            <Check size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-emerald-600 dark:text-emerald-400 text-sm whitespace-pre-line">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Forms */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field (Register only) */}
        {authMode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 
                  ${touched.name && validationErrors.name 
                    ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-200' 
                    : 'border-stone-200 dark:border-stone-700 focus:border-amber-500 focus:ring-amber-200 dark:focus:ring-amber-800'
                  }
                  bg-white/50 dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 
                  placeholder-stone-400 focus:ring-2 focus:outline-none transition-all`}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
            {touched.name && validationErrors.name && (
              <p className="mt-1.5 text-xs text-red-500">{validationErrors.name}</p>
            )}
          </div>
        )}

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={`w-full pl-11 pr-4 py-3 rounded-xl border-2 
                ${touched.email && validationErrors.email 
                  ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-200' 
                  : 'border-stone-200 dark:border-stone-700 focus:border-amber-500 focus:ring-amber-200 dark:focus:ring-amber-800'
                }
                bg-white/50 dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 
                placeholder-stone-400 focus:ring-2 focus:outline-none transition-all`}
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>
          {touched.email && validationErrors.email && (
            <p className="mt-1.5 text-xs text-red-500">{validationErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        {authMode !== 'forgot-password' && (
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onBlur={handleBlur}
                className={`w-full pl-11 pr-12 py-3 rounded-xl border-2 
                  ${touched.password && validationErrors.password 
                    ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-200' 
                    : 'border-stone-200 dark:border-stone-700 focus:border-amber-500 focus:ring-amber-200 dark:focus:ring-amber-800'
                  }
                  bg-white/50 dark:bg-stone-800/50 text-stone-800 dark:text-stone-100 
                  placeholder-stone-400 focus:ring-2 focus:outline-none transition-all`}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {touched.password && validationErrors.password && (
              <p className="mt-1.5 text-xs text-red-500">{validationErrors.password}</p>
            )}
            {!validationErrors.password && authMode === 'register' && (
              <p className="mt-1.5 text-xs text-stone-400">
                Min 8 characters with uppercase, lowercase & number
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 
            hover:from-amber-600 hover:via-orange-600 hover:to-rose-600
            text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25
            hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 group"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {authMode === 'login' && 'Sign In'}
              {authMode === 'register' && 'Create Account'}
              {authMode === 'forgot-password' && 'Send Reset Link'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Forgot Password / Back to Sign In */}
        {authMode === 'login' && (
          <button
            type="button"
            onClick={() => {
              setAuthMode('forgot-password');
              setError('');
              setSuccessMessage('');
              setValidationErrors({});
              setTouched({});
              setFormData({ ...formData, password: '' });
            }}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            Forgot your password?
          </button>
        )}

        {authMode === 'forgot-password' && (
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError('');
              setSuccessMessage('');
              setValidationErrors({});
              setTouched({});
              setFormData({ email: '', password: '', name: '' });
            }}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            ← Back to Sign In
          </button>
        )}
      </form>

      {/* Divider */}
      {authMode !== 'forgot-password' && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 bg-gradient-to-br from-white via-amber-50/30 to-rose-50/30 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 text-sm text-stone-400">
              or continue with
            </span>
          </div>
        </div>
      )}

      {/* Google Sign In */}
      {authMode !== 'forgot-password' && (
        <GoogleSignInButton
          onSuccess={(response) => {
            if (onGoogleSuccess) {
              onGoogleSuccess(response.user);
            }
            onClose();
          }}
          onError={(error) => setError(error)}
          disabled={isLoading}
        />
      )}

      {/* Footer Text */}
      {authMode !== 'forgot-password' && (
        <p className="mt-4 text-center text-xs text-stone-400">
          By continuing, you agree to our{' '}
          <a href="/terms-of-service" className="text-amber-600 dark:text-amber-400 hover:underline">Terms</a>
          {' '}and{' '}
          <a href="/privacy-policy" className="text-amber-600 dark:text-amber-400 hover:underline">Privacy Policy</a>
        </p>
      )}
    </Modal>
  );
}
