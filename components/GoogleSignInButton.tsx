'use client';

import { useEffect, useRef, useState } from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (response: { user: { id: number; name: string; email: string } }) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({ 
  onSuccess, 
  onError, 
  disabled = false 
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Google Sign-In script
    const loadGoogleScript = () => {
      if (document.querySelector('#google-signin-script')) {
        // Script already exists, check if loaded
        if (window.google?.accounts?.id) {
          setIsScriptLoaded(true);
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-signin-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        onError('Failed to load Google Sign-In');
      };
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, [onError]);

  useEffect(() => {
    if (!isScriptLoaded || !buttonRef.current || !window.google?.accounts?.id) {
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('Google Client ID not configured');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: buttonRef.current.offsetWidth,
      });
    } catch (err) {
      console.error('Error initializing Google Sign-In:', err);
    }
  }, [isScriptLoaded]);

  const handleCredentialResponse = async (response: { credential: string }) => {
    if (!response.credential) {
      onError('No credential received from Google');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate with Google');
      }

      onSuccess(data);
    } catch (err: any) {
      onError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return null; // Don't render if not configured
  }

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
          <span className="ml-2 text-stone-600 dark:text-stone-400">Signing in...</span>
        </div>
      )}
      <div 
        ref={buttonRef} 
        className={`w-full flex justify-center ${isLoading || disabled ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ minHeight: '44px' }}
      />
      {!isScriptLoaded && !isLoading && (
        <button
          type="button"
          disabled={disabled}
          className="w-full py-3 px-4 border border-stone-300 dark:border-stone-600 rounded-full font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      )}
    </div>
  );
}

