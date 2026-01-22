import { NextRequest, NextResponse } from 'next/server';

interface GenerateQuotesRequest {
  mood: string; // User's typed mood or emotion
  intensity?: string;
  userInput?: string;
}

interface GeneratedQuote {
  text: string;
  author: string;
  category?: string;
}

/**
 * Generate quotes using Google Gemini API
 */
async function generateQuotesWithGemini(
  mood: string,
  intensity?: string,
  userInput?: string
): Promise<GeneratedQuote[] | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI] Google Gemini API key not configured');
    return null;
  }

  try {
    const prompt = `You are an emotion-aware AI assistant for a quote app called "MoodSense". Generate exactly 10 short, powerful, and relatable quotes based on the user's mood.

User's mood: "${mood}"${intensity ? ` (${intensity} intensity)` : ''}${userInput ? `. Additional context: "${userInput}"` : ''}

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for quote generation

    // Google Gemini API endpoint
    const model = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8, // Higher temperature for more creative quotes
          maxOutputTokens: 2000, // Enough for 10 quotes
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] Google Gemini API error:', response.status, error);
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
    const { mood, intensity, userInput } = body;

    console.log('[API] generate-quotes called - mood:', mood?.substring(0, 50));

    if (!mood || !mood.trim()) {
      return NextResponse.json(
        { error: 'Mood is required' },
        { status: 400 }
      );
    }

    // Generate quotes using Gemini
    const quotes = await generateQuotesWithGemini(mood.trim(), intensity, userInput);

    if (!quotes || quotes.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate quotes. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      quotes,
      mood: mood.trim(),
      count: quotes.length,
      aiUsed: 'gemini',
    });
  } catch (error) {
    console.error('[API] generate-quotes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
