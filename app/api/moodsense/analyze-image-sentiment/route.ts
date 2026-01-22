import { NextRequest, NextResponse } from 'next/server';

interface AnalyzeImageRequest {
  imageBase64: string; // Base64 encoded image
  mimeType: string; // Image MIME type (e.g., 'image/jpeg', 'image/png')
}

/**
 * Analyze image sentiment using Google Gemini Vision API
 */
async function analyzeImageSentimentWithGemini(
  imageBase64: string,
  mimeType: string
): Promise<{ mood: string; intensity?: string; description: string } | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI] Google Gemini API key not configured');
    return null;
  }

  try {
    const prompt = `Analyze this image and determine the emotional sentiment/mood it conveys. 

Consider:
- Colors, lighting, and overall atmosphere
- Facial expressions (if people are present)
- Scene composition and setting
- Objects, symbols, or visual elements
- Overall emotional tone

Respond with a JSON object containing:
{
  "mood": "one word emotion (e.g., hopeful, calm, anxious, joyful, melancholic, peaceful, energetic, reflective, etc.)",
  "intensity": "soft, moderate, deep, or bold",
  "description": "a brief 1-2 sentence description of what you see and the emotional tone"
}

Return ONLY the JSON object, nothing else.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Google Gemini API endpoint with vision support
    // Use gemini-1.5-flash for higher free tier limits (15 req/min = ~1,000+ per day)
    // gemini-2.5-flash only has 20 requests/day on free tier
    const model = process.env.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] Google Gemini Vision API error:', response.status, error);
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
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
      
      const result = JSON.parse(jsonContent);
      
      // Validate and format result
      if (result.mood) {
        return {
          mood: String(result.mood).trim().toLowerCase(),
          intensity: result.intensity ? String(result.intensity).trim().toLowerCase() : 'moderate',
          description: result.description ? String(result.description).trim() : 'Analyzed image sentiment',
        };
      }
    } catch (parseError) {
      console.log('[AI] Failed to parse JSON, trying to extract mood from text');
      // Fallback: try to extract mood from text
      const moodMatch = content.match(/mood["\s:]+([a-z]+)/i);
      const intensityMatch = content.match(/intensity["\s:]+([a-z]+)/i);
      
      if (moodMatch) {
        return {
          mood: moodMatch[1].toLowerCase(),
          intensity: intensityMatch ? intensityMatch[1].toLowerCase() : 'moderate',
          description: content.substring(0, 200),
        };
      }
    }

    console.log('[AI] Failed to extract sentiment from Gemini response');
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AI] Google Gemini Vision API request timeout');
    } else {
      console.error('[AI] Google Gemini Vision API call failed:', error);
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeImageRequest = await request.json();
    const { imageBase64, mimeType } = body;

    console.log('[API] analyze-image-sentiment called');

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'Image base64 and mimeType are required' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid image MIME type' },
        { status: 400 }
      );
    }

    // Analyze image sentiment using Gemini Vision
    const sentiment = await analyzeImageSentimentWithGemini(imageBase64, mimeType);

    if (!sentiment) {
      return NextResponse.json(
        { error: 'Failed to analyze image sentiment. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...sentiment,
      aiUsed: 'gemini-vision',
    });
  } catch (error) {
    console.error('[API] analyze-image-sentiment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
