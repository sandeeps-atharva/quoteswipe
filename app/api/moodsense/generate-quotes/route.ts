import { NextRequest, NextResponse } from 'next/server';

interface GenerateQuotesRequest {
  mood?: string; // User's typed mood or emotion (optional if image provided)
  intensity?: string;
  userInput?: string;
  imageBase64?: string; // Base64 encoded image
  imageMimeType?: string; // Image MIME type
}

interface GeneratedQuote {
  text: string;
  author: string;
  category?: string;
}

/**
 * Generate quotes using Google Gemini API (with optional image support)
 */
async function generateQuotesWithGemini(
  mood?: string,
  intensity?: string,
  userInput?: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<GeneratedQuote[] | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI] Google Gemini API key not configured');
    return null;
  }

  try {
    // Build prompt based on whether image is provided
    let prompt: string;
    if (imageBase64 && imageMimeType) {
      // Image-based quote generation
      prompt = `You are an emotion-aware AI assistant for a quote app called "MoodSense". Analyze this image and generate exactly 10 short, powerful, and relatable quotes based on the image's emotional sentiment, mood, colors, composition, and atmosphere.

${mood ? `User mentioned mood: "${mood}"` : ''}${intensity ? ` (${intensity} intensity)` : ''}${userInput ? `. Additional context: "${userInput}"` : ''}

Requirements:
- Analyze the image's emotional tone, colors, lighting, composition, and overall atmosphere
- Generate exactly 10 quotes that capture the essence and sentiment of the image
- Each quote should be short (under 150 characters), powerful, and swipe-friendly
- Match the emotional depth and tone visible in the image
- Avoid clichés and overused phrases
- Make quotes relatable and emotionally precise
- Include an author name for each quote (can be "Anonymous" or a meaningful name)
- Format: Return as JSON array with this exact structure:
[
  {"text": "Quote text here", "author": "Author name"},
  {"text": "Quote text here", "author": "Author name"},
  ...
]

Return ONLY the JSON array, nothing else.`;
    } else {
      // Text-based quote generation
      prompt = `You are an emotion-aware AI assistant for a quote app called "MoodSense". Generate exactly 10 short, powerful, and relatable quotes based on the user's mood.

User's mood: "${mood || 'general'}"${intensity ? ` (${intensity} intensity)` : ''}${userInput ? `. Additional context: "${userInput}"` : ''}

Requirements:
- Generate exactly 10 quotes
- Each quote should be short (under 150 characters), powerful, and swipe-friendly
- Match the emotional depth and tone of the mood
- Avoid clichés and overused phrases
- Make quotes relatable and emotionally precise
- Include an author name for each quote (can be "Anonymous" or a meaningful name)
- Format: Return as JSON array with this exact structure:
[
  {"text": "Quote text here", "author": "Author name"},
  {"text": "Quote text here", "author": "Author name"},
  ...
]

Return ONLY the JSON array, nothing else.`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for quote generation

    // Google Gemini API endpoint
    // Use gemini-1.5-flash for higher free tier limits (15 req/min = ~1,000+ per day)
    // gemini-2.5-flash only has 20 requests/day on free tier
    const model = process.env.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Build request body - include image if provided
    const requestBody: any = {
      contents: [{
        parts: []
      }],
      generationConfig: {
        temperature: 0.8, // Higher temperature for more creative quotes
        maxOutputTokens: 2000, // Enough for 10 quotes
      },
    };

    // Add text prompt
    requestBody.contents[0].parts.push({ text: prompt });

    // Add image if provided
    if (imageBase64 && imageMimeType) {
      // Remove data URL prefix if present
      const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;
      
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: imageMimeType,
          data: base64Data
        }
      });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI] Google Gemini API error:', response.status, errorText);
      
      // Handle quota exceeded (429) error
      if (response.status === 429) {
        try {
          const errorData = JSON.parse(errorText);
          const retryDelay = errorData.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay || '12s';
          console.error('[AI] Quota exceeded. Retry after:', retryDelay);
          throw new Error(`API quota exceeded. Free tier allows 20 requests/day. Please try again later or upgrade your plan.`);
        } catch {
          throw new Error('API quota exceeded. Free tier allows 20 requests/day. Please try again later.');
        }
      }
      
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!content) {
      console.log('[AI] Google Gemini returned empty content');
      return null;
    }

    // Try to parse JSON from the response
    try {
      // Extract JSON from markdown code blocks if present
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      const quotes = JSON.parse(jsonContent);
      
      // Validate and format quotes
      if (Array.isArray(quotes)) {
        const formattedQuotes = quotes
          .slice(0, 10) // Ensure max 10 quotes
          .map((q: any) => ({
            text: String(q.text || q.quote || '').trim(),
            author: String(q.author || 'Anonymous').trim(),
            category: q.category ? String(q.category).trim() : undefined,
          }))
          .filter((q: GeneratedQuote) => q.text.length > 0 && q.text.length <= 300); // Filter valid quotes
        
        console.log('[AI] Google Gemini generated quotes:', formattedQuotes.length);
        return formattedQuotes.length > 0 ? formattedQuotes : null;
      }
    } catch (parseError) {
      // If JSON parsing fails, try to extract quotes manually
      console.log('[AI] Failed to parse JSON, trying manual extraction');
      const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
      const quotes: GeneratedQuote[] = [];
      
      for (const line of lines) {
        // Try to extract quote and author from various formats
        const quoteMatch = line.match(/"text":\s*"([^"]+)"/);
        const authorMatch = line.match(/"author":\s*"([^"]+)"/);
        
        if (quoteMatch && authorMatch) {
          quotes.push({
            text: quoteMatch[1].trim(),
            author: authorMatch[1].trim(),
          });
        } else if (line.includes('"') && line.length > 20) {
          // Fallback: treat line as quote text
          const cleanLine = line.replace(/^[-•*]\s*/, '').replace(/"/g, '').trim();
          if (cleanLine.length > 10) {
            quotes.push({
              text: cleanLine,
              author: 'Anonymous',
            });
          }
        }
        
        if (quotes.length >= 10) break;
      }
      
      if (quotes.length > 0) {
        console.log('[AI] Manually extracted quotes:', quotes.length);
        return quotes;
      }
    }

    console.log('[AI] Failed to extract quotes from Gemini response');
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AI] Google Gemini API request timeout');
    } else {
      console.error('[AI] Google Gemini API call failed:', error);
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuotesRequest = await request.json();
    const { mood, intensity, userInput, imageBase64, imageMimeType } = body;

    console.log('[API] generate-quotes called - mood:', mood?.substring(0, 50), 'hasImage:', !!imageBase64);

    // Either mood or image must be provided
    if (!mood && !imageBase64) {
      return NextResponse.json(
        { error: 'Either mood or image is required' },
        { status: 400 }
      );
    }

    // Generate quotes using Gemini (with image if provided)
    const quotes = await generateQuotesWithGemini(
      mood?.trim(), 
      intensity, 
      userInput,
      imageBase64,
      imageMimeType
    );

    if (!quotes || quotes.length === 0) {
      // Check if it was a quota error
      const errorMessage = quotes === null ? 'API quota exceeded. Free tier allows 20 requests/day.' : 'Failed to generate quotes. Please try again.';
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quotes,
      mood: mood?.trim() || 'image-based',
      count: quotes.length,
      aiUsed: imageBase64 ? 'gemini-vision' : 'gemini',
    });
  } catch (error) {
    console.error('[API] generate-quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
