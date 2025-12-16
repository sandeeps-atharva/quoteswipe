import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for translations (in production, use Redis or similar)
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Clean old cache entries periodically
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of translationCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      translationCache.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
        { status: 400 }
      );
    }

    // If target language is same as source, return original
    if (targetLanguage === sourceLanguage) {
      return NextResponse.json({ translatedText: text });
    }

    // Check cache first
    const cacheKey = `${sourceLanguage}:${targetLanguage}:${text}`;
    const cached = translationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ translatedText: cached.text, cached: true });
    }

    // Clean old cache entries
    cleanCache();

    // Try Google Translate API (requires GOOGLE_TRANSLATE_API_KEY env variable)
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (apiKey) {
      // Use Google Cloud Translation API
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLanguage,
            target: targetLanguage,
            format: 'text',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const translatedText = data.data.translations[0].translatedText;
        
        // Cache the translation
        translationCache.set(cacheKey, {
          text: translatedText,
          timestamp: Date.now(),
        });

        return NextResponse.json({ translatedText });
      }
    }

    // Fallback: Use free Google Translate (unofficial, for demo purposes)
    // Note: This may have rate limits and is not recommended for production
    const freeTranslateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
    
    const freeResponse = await fetch(freeTranslateUrl);
    
    if (freeResponse.ok) {
      const data = await freeResponse.json();
      // Extract translated text from the response
      let translatedText = '';
      if (data && data[0]) {
        for (const item of data[0]) {
          if (item[0]) {
            translatedText += item[0];
          }
        }
      }
      
      if (translatedText) {
        // Cache the translation
        translationCache.set(cacheKey, {
          text: translatedText,
          timestamp: Date.now(),
        });
        
        return NextResponse.json({ translatedText });
      }
    }

    // If all translation methods fail, return original text
    return NextResponse.json({ 
      translatedText: text, 
      error: 'Translation service unavailable',
      fallback: true 
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}

