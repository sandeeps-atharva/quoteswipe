'use client';

import { useState } from 'react';
import Image from 'next/image';
import Modal from './Modal';

interface UpdatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdatePasswordModal({
  isOpen,
  onClose,
}: UpdatePasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Password updated successfully!');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 2000);
      } else {
        setError(data.error || 'Failed to update password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
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
          Update Password
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-2">
          Enter your current password and choose a new one
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl text-red-600 dark:text-red-400 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl text-green-600 dark:text-green-400 text-xs sm:text-sm">
          {successMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Current Password
          </label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleInputChange}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all"
            placeholder="••••••••"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            New Password
          </label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleInputChange}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all"
            placeholder="••••••••"
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 text-sm sm:text-base focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-all"
            placeholder="••••••••"
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-pink-500 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </Modal>
  );
}
