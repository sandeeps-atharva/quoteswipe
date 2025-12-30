'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, User, Heart, ThumbsDown, Bookmark, Sparkles, 
  Edit2, Check, X, Lock, Loader2, Mail, Calendar, LogOut,
  PenLine, Camera, Palette, ImageIcon, ChevronRight, Settings,
  Info, MessageSquare, Star, Shield, Trash2, Upload, Grid3X3, Plus
} from 'lucide-react';
import { getRandomBackgroundForQuote } from '@/lib/constants';

// Simple gradient array for created quotes that don't have custom backgrounds
const PROFILE_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #667db6 0%, #0082c8 50%, #0082c8 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
];
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import UpdatePasswordModal from './UpdatePasswordModal';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '@/lib/api-cache';

interface ProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    auth_provider: 'google' | 'email';
    created_at: string;
    role?: 'user' | 'admin';
    profile_picture?: string | null;
  };
}

interface SavedQuote {
  id: string | number;
  text: string;
  author: string;
  category: string;
  category_icon?: string;
  custom_background?: string | null;
}

interface UserQuote {
  id: string | number;
  text: string;
  author: string;
  category?: string;
  category_icon?: string;
  custom_background?: string;
  is_public?: boolean;
}

type ProfileTab = 'saved' | 'created';

interface ProfileViewProps {
  onBack: () => void;
  onCreateQuote: () => void;
  onLogout: () => void;
  likedCount: number;
  savedCount: number;
  skippedCount: number;
  myQuotesCount: number;
  isLoggingOut?: boolean;
  onProfileUpdate?: (profilePicture: string | null) => void;
  savedQuotes?: SavedQuote[];
  userQuotes?: UserQuote[];
  onQuoteClick?: (quoteId: string | number, category?: string, customBackground?: string | null) => void;
}

export default function ProfileView({
  onBack,
  onCreateQuote,
  onLogout,
  likedCount,
  savedCount,
  skippedCount,
  myQuotesCount,
  isLoggingOut = false,
  onProfileUpdate,
  savedQuotes = [],
  userQuotes = [],
  onQuoteClick,
}: ProfileViewProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('saved');
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [showPictureOptions, setShowPictureOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data with caching
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await apiCache.getOrFetch<ProfileData>(
          CACHE_KEYS.USER_PROFILE,
          async () => {
            const response = await fetch('/api/user/profile');
            if (!response.ok) throw new Error('Failed to fetch');
            return await response.json();
          },
          { ttl: CACHE_TTL.MEDIUM, sensitive: true }
        );
        
        setProfileData(data);
        setEditName(data.user.name);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Handle save name
  const handleSaveName = useCallback(async () => {
    if (!editName.trim() || editName === profileData?.user.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(prev => prev ? { ...prev, user: { ...prev.user, name: data.user.name } } : null);
        // Invalidate cache after update
        apiCache.invalidate(CACHE_KEYS.USER_PROFILE);
        apiCache.invalidate(CACHE_KEYS.USER);
        toast.success('Name updated');
        setIsEditingName(false);
      } else {
        toast.error('Failed to update name');
      }
    } catch (error) {
      toast.error('Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  }, [editName, profileData?.user.name]);

  // Get initials
  const getInitials = (name: string) => {
    if (name.includes(' ')) {
      return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Handle profile picture upload
  const handlePictureUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingPicture(true);
    setShowPictureOptions(false);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const response = await fetch('/api/user/profile-picture', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture: base64 }),
        });

        if (response.ok) {
          const data = await response.json();
          setProfileData(prev => prev ? { 
            ...prev, 
            user: { ...prev.user, profile_picture: data.user.profile_picture } 
          } : null);
          // Invalidate cache
          apiCache.invalidate(CACHE_KEYS.USER_PROFILE);
          apiCache.invalidate(CACHE_KEYS.USER);
          // Notify parent of profile picture change
          onProfileUpdate?.(data.user.profile_picture);
          toast.success('Profile picture updated');
        } else {
          const data = await response.json();
          toast.error(data.error || 'Failed to update picture');
        }
        setIsUploadingPicture(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload picture');
      setIsUploadingPicture(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onProfileUpdate]);

  // Handle remove profile picture
  const handleRemovePicture = useCallback(async () => {
    setIsUploadingPicture(true);
    setShowPictureOptions(false);

    try {
      const response = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfileData(prev => prev ? { 
          ...prev, 
          user: { ...prev.user, profile_picture: null } 
        } : null);
        // Invalidate cache
        apiCache.invalidate(CACHE_KEYS.USER_PROFILE);
        apiCache.invalidate(CACHE_KEYS.USER);
        // Notify parent of profile picture change
        onProfileUpdate?.(null);
        toast.success('Profile picture removed');
      } else {
        toast.error('Failed to remove picture');
      }
    } catch (error) {
      toast.error('Failed to remove picture');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [onProfileUpdate]);

  // Menu Item Component
  const MenuItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onClick,
    href,
    danger = false,
    rightElement,
    gradient
  }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    href?: string;
    danger?: boolean;
    rightElement?: React.ReactNode;
    gradient?: string;
  }) => {
    const content = (
      <>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${
          gradient || (danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800')
        }`}>
          <Icon size={18} className={`sm:w-5 sm:h-5 ${danger ? 'text-red-500' : gradient ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm sm:text-base ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        {rightElement || <ChevronRight size={18} className="text-gray-400 shrink-0" />}
      </>
    );

    const className = `w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl ${
      danger 
        ? 'hover:bg-red-50 dark:hover:bg-red-900/20' 
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
    } transition-colors active:scale-[0.98]`;

    if (href) {
      return <Link href={href} className={className}>{content}</Link>;
    }

    return (
      <button onClick={onClick} className={className} disabled={danger && isLoggingOut}>
        {content}
      </button>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-30 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        overscrollBehavior: 'none',
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
            </button>
            
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Profile
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main 
        className="flex-1 overflow-y-auto"
        style={{
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4 animate-pulse">
                <User size={28} className="text-white" />
              </div>
              <Loader2 size={24} className="animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-gray-500">Loading profile...</p>
            </div>
          ) : profileData ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Profile Card */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-black/20">
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 h-32 sm:h-40">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-pink-400/30 rounded-full blur-2xl translate-x-1/4 translate-y-1/4" />
                  </div>
                </div>
                
                {/* Profile Content */}
                <div className="relative pt-20 sm:pt-24 px-4 sm:px-6 pb-5 sm:pb-6">
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                  
                  {/* Avatar */}
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-8 sm:translate-y-10">
                    <div className="relative">
                      <button
                        onClick={() => setShowPictureOptions(true)}
                        disabled={isUploadingPicture}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-1 shadow-2xl group relative overflow-hidden"
                      >
                        <div className="w-full h-full rounded-xl sm:rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden relative">
                          {isUploadingPicture ? (
                            <Loader2 size={32} className="animate-spin text-purple-500" />
                          ) : profileData.user.profile_picture ? (
                            <Image
                              src={profileData.user.profile_picture}
                              alt={profileData.user.name}
                              fill
                              className="object-cover"
                              unoptimized={profileData.user.profile_picture.startsWith('data:')}
                            />
                          ) : (
                            <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                              {getInitials(profileData.user.name)}
                            </span>
                          )}
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={24} className="text-white" />
                          </div>
                        </div>
                      </button>
                      
                      {/* Auth Provider Badge */}
                      <div className={`absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-lg ${
                        profileData.user.auth_provider === 'google' 
                          ? 'bg-white' 
                          : 'bg-blue-500'
                      }`}>
                        {profileData.user.auth_provider === 'google' ? (
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        ) : (
                          <Mail size={16} className="text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Picture Options Modal */}
                  {showPictureOptions && (
                    <div 
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                      onClick={() => setShowPictureOptions(false)}
                    >
                      <div 
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[280px] sm:w-[320px] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                          <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white">Profile Picture</h3>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <Upload size={18} className="text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900 dark:text-white">Upload Photo</p>
                              <p className="text-xs text-gray-500">JPEG, PNG, GIF, WebP (max 5MB)</p>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                              <Camera size={18} className="text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900 dark:text-white">Take Photo</p>
                              <p className="text-xs text-gray-500">Use your camera</p>
                            </div>
                          </button>
                          
                          {profileData.user.profile_picture && (
                            <button
                              onClick={handleRemovePicture}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <Trash2 size={18} className="text-red-500" />
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-red-600 dark:text-red-400">Remove Photo</p>
                                <p className="text-xs text-gray-500">Delete current picture</p>
                              </div>
                            </button>
                          )}
                        </div>
                        <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => setShowPictureOptions(false)}
                            className="w-full p-3 text-center font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Name & Email */}
                  <div className="text-center mt-14 sm:mt-16">
                    {isEditingName ? (
                      <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-4 py-2 text-lg font-bold text-center border-2 border-purple-300 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                          autoFocus
                        />
                        <button 
                          onClick={handleSaveName} 
                          disabled={isSavingName} 
                          className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 shadow-lg"
                        >
                          {isSavingName ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        </button>
                        <button 
                          onClick={() => { setIsEditingName(false); setEditName(profileData.user.name); }} 
                          className="p-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsEditingName(true)} 
                        className="inline-flex items-center gap-2 group"
                      >
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {profileData.user.name}
                        </h2>
                        <Edit2 size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{profileData.user.email}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        profileData.user.auth_provider === 'google' 
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {profileData.user.auth_provider === 'google' ? (
                          <>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            </svg>
                            Google
                          </>
                        ) : (
                          <>
                            <Mail size={12} />
                            Email
                          </>
                        )}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={12} />
                        Joined {formatDate(profileData.user.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {[
                  { icon: Heart, count: likedCount, label: 'Liked', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
                  { icon: Bookmark, count: savedCount, label: 'Saved', color: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                  { icon: Sparkles, count: myQuotesCount, label: 'Created', color: 'from-purple-500 to-violet-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { icon: ThumbsDown, count: skippedCount, label: 'Skipped', color: 'from-gray-400 to-slate-500', bg: 'bg-gray-100 dark:bg-gray-800' },
                ].map((stat, idx) => (
                  <div key={idx} className={`${stat.bg} rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center relative overflow-hidden group`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <stat.icon size={18} className={`sm:w-5 sm:h-5 mx-auto mb-1 bg-gradient-to-br ${stat.color} text-transparent bg-clip-text`} fill="currentColor" style={{ WebkitTextStroke: '0.5px', stroke: 'currentColor' }} />
                    <div className={`text-xl sm:text-2xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
                      {stat.count}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Instagram-style Quote Grid */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-sm font-semibold transition-colors relative ${
                      activeTab === 'saved'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Bookmark size={18} />
                    <span>Saved</span>
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      {savedQuotes.length}
                    </span>
                    {activeTab === 'saved' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('created')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 text-sm font-semibold transition-colors relative ${
                      activeTab === 'created'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Sparkles size={18} />
                    <span>Created</span>
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      {userQuotes.length}
                    </span>
                    {activeTab === 'created' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                  </button>
                </div>

                {/* Grid Content */}
                <div className="p-1">
                  {activeTab === 'saved' ? (
                    savedQuotes.length > 0 ? (
                      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                        {savedQuotes.map((quote) => {
                          // Get background - custom or random
                          const bgStyle = quote.custom_background
                            ? quote.custom_background.startsWith('linear-gradient') || quote.custom_background.startsWith('radial-gradient')
                              ? { background: quote.custom_background }
                              : { backgroundImage: `url(${quote.custom_background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : (() => {
                                const randomBg = getRandomBackgroundForQuote(quote.id);
                                return randomBg.url?.startsWith('linear-gradient') || randomBg.url?.startsWith('radial-gradient')
                                  ? { background: randomBg.url }
                                  : { backgroundImage: `url(${randomBg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
                              })();

                          return (
                            <button
                              key={quote.id}
                              onClick={() => onQuoteClick?.(quote.id, quote.category, quote.custom_background)}
                              className="relative aspect-square overflow-hidden group active:scale-95 transition-transform"
                            >
                              {/* Background */}
                              <div 
                                className="absolute inset-0"
                                style={bgStyle}
                              />
                              {/* Dark overlay for text readability */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                              
                              {/* Quote Content - Always visible */}
                              <div className="absolute inset-0 p-2 flex flex-col justify-between">
                                {/* Category icon */}
                                <div className="flex justify-end">
                                  <span className="text-white/80 text-xs drop-shadow-lg">{quote.category_icon || '📝'}</span>
                                </div>
                                
                                {/* Quote text */}
                                <div className="text-left">
                                  <p className="text-white text-[9px] sm:text-[11px] font-medium leading-tight line-clamp-3 drop-shadow-lg">
                                    &ldquo;{quote.text.slice(0, 80)}{quote.text.length > 80 ? '...' : ''}&rdquo;
                                  </p>
                                  <p className="text-white/70 text-[8px] sm:text-[10px] mt-0.5 truncate drop-shadow">
                                    — {quote.author}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Hover effect */}
                              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty State for Saved */
                      <div className="py-12 px-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                          <Bookmark size={28} className="text-amber-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No Saved Quotes Yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Save quotes you love to see them here</p>
                        <button
                          onClick={onBack}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                        >
                          Browse Quotes
                        </button>
                      </div>
                    )
                  ) : (
                    userQuotes.length > 0 ? (
                      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
                        {userQuotes.map((quote) => {
                          // Get background - custom or random gradient
                          const bgStyle = quote.custom_background
                            ? quote.custom_background.startsWith('linear-gradient') || quote.custom_background.startsWith('radial-gradient')
                              ? { background: quote.custom_background }
                              : { backgroundImage: `url(${quote.custom_background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : { background: PROFILE_GRADIENTS[Math.abs(String(quote.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % PROFILE_GRADIENTS.length] };

                          return (
                            <button
                              key={quote.id}
                              onClick={() => onQuoteClick?.(`user_${quote.id}`, quote.category, quote.custom_background)}
                              className="relative aspect-square overflow-hidden group active:scale-95 transition-transform"
                            >
                              {/* Background */}
                              <div 
                                className="absolute inset-0"
                                style={bgStyle}
                              />
                              {/* Dark overlay for text readability */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                              
                              {/* Quote Content - Always visible */}
                              <div className="absolute inset-0 p-2 flex flex-col justify-between">
                                {/* Top row - Public/Private indicator & Category */}
                                <div className="flex justify-between items-start">
                                  <span className="text-white/80 text-xs drop-shadow-lg">{quote.category_icon || '✨'}</span>
                                  {quote.is_public ? (
                                    <div className="w-5 h-5 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg">
                                      <Check size={12} className="text-white" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-600/90 flex items-center justify-center shadow-lg">
                                      <Lock size={10} className="text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Quote text */}
                                <div className="text-left">
                                  <p className="text-white text-[9px] sm:text-[11px] font-medium leading-tight line-clamp-3 drop-shadow-lg">
                                    &ldquo;{quote.text.slice(0, 80)}{quote.text.length > 80 ? '...' : ''}&rdquo;
                                  </p>
                                  <p className="text-white/70 text-[8px] sm:text-[10px] mt-0.5 truncate drop-shadow">
                                    — {quote.author}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Hover effect */}
                              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty State for Created */
                      <div className="py-12 px-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex items-center justify-center">
                          <Plus size={28} className="text-purple-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No Quotes Created Yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Create your first inspiring quote</p>
                        <button
                          onClick={onCreateQuote}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                        >
                          Create Quote
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Create Quote CTA */}
              <button
                onClick={onCreateQuote}
                className="w-full relative overflow-hidden rounded-2xl group active:scale-[0.98] transition-transform"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative flex items-center gap-4 p-4 sm:p-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <PenLine size={24} className="sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-white text-base sm:text-lg">Create Your Quote</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      {[
                        { icon: Camera, label: 'Photo' },
                        { icon: ImageIcon, label: 'Upload' },
                        { icon: Palette, label: '60+ Themes' },
                      ].map((item, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-white/80 text-[10px] sm:text-xs">
                          <item.icon size={12} className="sm:w-3.5 sm:h-3.5" />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={24} className="text-white/60" />
                </div>
              </button>

              {/* Settings Section */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Account</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {profileData.user.auth_provider === 'email' && (
                    <MenuItem
                      icon={Lock}
                      title="Change Password"
                      subtitle="Update your password"
                      onClick={() => setShowUpdatePasswordModal(true)}
                      gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                    />
                  )}
                  {profileData.user.auth_provider === 'google' && (
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Shield size={18} className="sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Secured by Google</p>
                        <p className="text-[10px] sm:text-xs text-gray-500">Your account is protected</p>
                      </div>
                      <Check size={18} className="text-green-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Help & Support Section */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Support</h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <MenuItem
                    icon={MessageSquare}
                    title="Send Feedback"
                    subtitle="Help us improve"
                    href="/feedback"
                    gradient="bg-gradient-to-br from-green-500 to-emerald-500"
                  />
                  <MenuItem
                    icon={Star}
                    title="Rate Us"
                    subtitle="Share your experience"
                    href="/review"
                    gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
                  />
                  <MenuItem
                    icon={Info}
                    title="About"
                    subtitle="Learn more about us"
                    href="/about"
                    gradient="bg-gradient-to-br from-purple-500 to-indigo-500"
                  />
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl transition-colors font-semibold disabled:opacity-50 active:scale-[0.98]"
              >
                {isLoggingOut ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <LogOut size={20} />
                )}
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </button>

              {/* Version Info */}
              <p className="text-center text-[10px] sm:text-xs text-gray-400 pb-4">
                Quote Swipe v1.0 • Made with ❤️
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mb-4">
                <User size={32} className="text-gray-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Unable to load profile</h2>
              <p className="text-sm text-gray-500 mb-4">Please try again later</p>
              <button
                onClick={onBack}
                className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Update Password Modal */}
      {showUpdatePasswordModal && (
        <UpdatePasswordModal
          isOpen={showUpdatePasswordModal}
          onClose={() => setShowUpdatePasswordModal(false)}
        />
      )}
    </div>
  );
}
