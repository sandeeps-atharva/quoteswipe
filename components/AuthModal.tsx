'use client';

import { useState } from 'react';
import Image from 'next/image';
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
    
    // Validate on change if field was touched
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
    
    // Mark all fields as touched
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

  const getInputClassName = (fieldName: string) => {
    const hasError = touched[fieldName] && validationErrors[fieldName as keyof ValidationErrors];
    return `w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border ${
      hasError 
        ? 'border-red-400 dark:border-red-500 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-200 dark:focus:ring-red-800' 
        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-200 dark:focus:ring-blue-800'
    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm sm:text-base focus:ring-2 outline-none transition-all`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8">
        <Image 
          src="/logo.svg" 
          alt="QuoteSwipe" 
          width={80}
          height={80}
          className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-2 sm:mb-3 md:mb-4"
        />
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1 sm:mb-2">
          {!isLoading && swipeCount >= 5 ? 'Loving the quotes?' : 'Welcome to QuoteSwipe!'}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-2">
          {!isLoading && swipeCount >= 5
            ? 'Create an account to continue swiping and save your favorites!'
            : 'Sign in to access all features'}
        </p>
        
        {/* Feature highlights */}
        <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
          {['All categories', 'Save favorites', 'Customize cards', 'Unlimited swipes'].map((feature, i) => (
            <span 
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-50 to-pink-50 dark:from-blue-900/20 dark:to-pink-900/20 rounded-full text-[10px] sm:text-xs text-gray-600 dark:text-gray-400"
            >
              <span className="text-green-500 text-xs">✓</span>
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Auth Toggle */}
      {authMode !== 'forgot-password' && (
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg sm:rounded-xl">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm sm:text-base font-medium transition-all ${
              authMode === 'login'
                ? 'bg-white dark:bg-gray-600 shadow-md text-gray-800 dark:text-gray-200'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm sm:text-base font-medium transition-all ${
              authMode === 'register'
                ? 'bg-white dark:bg-gray-600 shadow-md text-gray-800 dark:text-gray-200'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl text-red-600 dark:text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl text-green-600 dark:text-green-400 text-xs sm:text-sm whitespace-pre-line">
          {successMessage}
        </div>
      )}

      {/* Sign In Form */}
      {authMode === 'login' && (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={getInputClassName('email')}
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {touched.email && validationErrors.email && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={getInputClassName('password')}
              placeholder="••••••••"
              disabled={isLoading}
            />
            {touched.password && validationErrors.password && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          
          {/* Don't have account & Forgot Password */}
          <div className="text-center space-y-2 pt-2">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Sign Up
              </button>
            </p>
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
              className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          {/* Divider */}
          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-3 sm:px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or
              </span>
            </div>
          </div>

          {/* Google Sign In */}
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
        </form>
      )}

      {/* Forgot Password Form */}
      {authMode === 'forgot-password' && (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={getInputClassName('email')}
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {touched.email && validationErrors.email && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.email}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
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
            className="w-full text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:underline"
          >
            Back to Sign In
          </button>
        </form>
      )}

      {/* Sign Up Form */}
      {authMode === 'register' && (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={getInputClassName('name')}
              placeholder="John Doe"
              disabled={isLoading}
            />
            {touched.name && validationErrors.name && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={getInputClassName('email')}
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {touched.email && validationErrors.email && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className={getInputClassName('password')}
              placeholder="••••••••"
              disabled={isLoading}
            />
            {touched.password && validationErrors.password && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.password}</p>
            )}
            {!validationErrors.password && authMode === 'register' && (
              <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                Min 8 characters with uppercase, lowercase & number
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
          
          {/* Already have account link */}
          <p className="text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 pt-2">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Sign In
            </button>
          </p>

          {/* Divider */}
          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-3 sm:px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or
              </span>
            </div>
          </div>

          {/* Google Sign In */}
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
        </form>
      )}
    </Modal>
  );
}
