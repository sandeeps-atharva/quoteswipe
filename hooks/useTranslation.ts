'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// Client-side cache for translations
const translationCache = new Map<string, string>();

interface UseTranslationOptions {
  text: string;
  enabled?: boolean;
}

interface UseTranslationResult {
  translatedText: string;
  isLoading: boolean;
  isTranslated: boolean;
  error: string | null;
}

export function useTranslation({ text, enabled = true }: UseTranslationOptions): UseTranslationResult {
  const { language, isOriginal } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const translate = useCallback(async () => {
    // If language is English (original), return original text
    if (isOriginal || !enabled) {
      setTranslatedText(text);
      setIsLoading(false);
      return;
    }

    // Check client-side cache
    const cacheKey = `${language.code}:${text}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslatedText(cached);
      setIsLoading(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: language.code,
          sourceLanguage: 'en',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      
      if (data.translatedText) {
        // Cache the translation
        translationCache.set(cacheKey, data.translatedText);
        setTranslatedText(data.translatedText);
      } else {
        setTranslatedText(text);
      }

      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Translation error:', err);
        setError(err.message || 'Translation failed');
        setTranslatedText(text); // Fallback to original
      }
    } finally {
      setIsLoading(false);
    }
  }, [text, language.code, isOriginal, enabled]);

  useEffect(() => {
    translate();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [translate]);

  // Reset translated text when original text changes
  useEffect(() => {
    if (isOriginal) {
      setTranslatedText(text);
    }
  }, [text, isOriginal]);

  return {
    translatedText,
    isLoading,
    isTranslated: !isOriginal && translatedText !== text,
    error,
  };
}

// Hook to translate multiple texts at once (batch translation)
export function useBatchTranslation(texts: string[]) {
  const { language, isOriginal } = useLanguage();
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOriginal || texts.length === 0) {
      const map = new Map<string, string>();
      texts.forEach(text => map.set(text, text));
      setTranslations(map);
      return;
    }

    const translateAll = async () => {
      setIsLoading(true);
      const newTranslations = new Map<string, string>();

      // Check cache first
      const textsToTranslate: string[] = [];
      texts.forEach(text => {
        const cacheKey = `${language.code}:${text}`;
        const cached = translationCache.get(cacheKey);
        if (cached) {
          newTranslations.set(text, cached);
        } else {
          textsToTranslate.push(text);
        }
      });

      // Translate remaining texts
      for (const text of textsToTranslate) {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              targetLanguage: language.code,
              sourceLanguage: 'en',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
              const cacheKey = `${language.code}:${text}`;
              translationCache.set(cacheKey, data.translatedText);
              newTranslations.set(text, data.translatedText);
            } else {
              newTranslations.set(text, text);
            }
          } else {
            newTranslations.set(text, text);
          }
        } catch {
          newTranslations.set(text, text);
        }
      }

      setTranslations(newTranslations);
      setIsLoading(false);
    };

    translateAll();
  }, [texts.join('|'), language.code, isOriginal]);

  return {
    translations,
    isLoading,
    getTranslation: (text: string) => translations.get(text) || text,
  };
}

// Clear translation cache (useful when user changes language)
export function clearTranslationCache() {
  translationCache.clear();
}
