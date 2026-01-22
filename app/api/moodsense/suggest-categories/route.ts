import { NextRequest, NextResponse } from 'next/server';
import { Emotion } from '@/contexts/MoodSenseContext';

interface SuggestCategoriesRequest {
  emotion?: Emotion; // Optional - can be undefined for free-text moods
  intensity?: string;
  userInput?: string;
  allCategories: Array<{ id: string; name: string; icon: string }>;
  freeTextMood?: string; // New: for typed moods
}

// Fallback: Emotion-to-Category mapping (rule-based, fast, no AI needed)
const EMOTION_CATEGORY_MAP: Record<Emotion, string[]> = {
  hopeful: ['Hope', 'Motivation', 'Dreams', 'Future', 'Positivity', 'Inspiration'],
  lonely: ['Friendship', 'Connection', 'Love', 'Relationships', 'Solitude', 'Healing'],
  motivated: ['Motivation', 'Success', 'Achievement', 'Ambition', 'Goals', 'Hustle'],
  anxious: ['Peace', 'Calm', 'Mindfulness', 'Healing', 'Strength', 'Courage'],
  heartbroken: ['Healing', 'Love', 'Heartbreak', 'Recovery', 'Strength', 'Growth'],
  calm: ['Peace', 'Mindfulness', 'Serenity', 'Nature', 'Simplicity', 'Balance'],
  excited: ['Adventure', 'Energy', 'Celebration', 'Joy', 'Enthusiasm', 'Momentum'],
  grateful: ['Gratitude', 'Appreciation', 'Blessings', 'Thankfulness', 'Joy', 'Contentment'],
  determined: ['Determination', 'Resilience', 'Perseverance', 'Goals', 'Strength', 'Focus'],
  reflective: ['Wisdom', 'Philosophy', 'Contemplation', 'Insight', 'Learning', 'Truth'],
  inspired: ['Inspiration', 'Creativity', 'Innovation', 'Vision', 'Dreams', 'Art'],
  peaceful: ['Peace', 'Serenity', 'Tranquility', 'Nature', 'Balance', 'Harmony'],
  energetic: ['Energy', 'Vitality', 'Action', 'Momentum', 'Hustle', 'Excitement'],
  contemplative: ['Philosophy', 'Wisdom', 'Reflection', 'Deep Thoughts', 'Insight', 'Truth'],
  joyful: ['Joy', 'Happiness', 'Celebration', 'Laughter', 'Fun', 'Positivity'],
  melancholic: ['Melancholy', 'Depth', 'Emotion', 'Reflection', 'Art', 'Poetry'],
  confident: ['Confidence', 'Strength', 'Self-Belief', 'Courage', 'Leadership', 'Success'],
  uncertain: ['Guidance', 'Wisdom', 'Clarity', 'Direction', 'Faith', 'Trust'],
  content: ['Contentment', 'Gratitude', 'Satisfaction', 'Peace', 'Simplicity', 'Balance'],
  restless: ['Change', 'Transformation', 'Growth', 'Adventure', 'Exploration', 'Innovation'],
};

const SECONDARY_CATEGORY_MAP: Record<Emotion, string[]> = {
  hopeful: ['Future', 'Dreams', 'Positivity', 'Optimism'],
  lonely: ['Solitude', 'Self-Love', 'Independence', 'Growth'],
  motivated: ['Discipline', 'Focus', 'Excellence', 'Progress'],
  anxious: ['Anxiety', 'Overcoming', 'Resilience', 'Support'],
  heartbroken: ['Emotional', 'Vulnerability', 'Self-Love', 'Recovery'],
  calm: ['Meditation', 'Wellness', 'Rest', 'Tranquility'],
  excited: ['Celebration', 'Achievement', 'Success', 'Energy'],
  grateful: ['Blessings', 'Appreciation', 'Thankfulness', 'Contentment'],
  determined: ['Perseverance', 'Resilience', 'Commitment', 'Excellence'],
  reflective: ['Learning', 'Growth', 'Understanding', 'Wisdom'],
  inspired: ['Creativity', 'Innovation', 'Art', 'Expression'],
  peaceful: ['Harmony', 'Balance', 'Wellness', 'Serenity'],
  energetic: ['Action', 'Momentum', 'Vitality', 'Drive'],
  contemplative: ['Deep Thoughts', 'Philosophy', 'Insight', 'Understanding'],
  joyful: ['Celebration', 'Happiness', 'Fun', 'Laughter'],
  melancholic: ['Emotion', 'Depth', 'Art', 'Poetry'],
  confident: ['Self-Belief', 'Courage', 'Leadership', 'Empowerment'],
  uncertain: ['Guidance', 'Clarity', 'Direction', 'Faith'],
  content: ['Satisfaction', 'Peace', 'Simplicity', 'Gratitude'],
  restless: ['Transformation', 'Change', 'Exploration', 'Innovation'],
};

/**
 * Call OpenAI (ChatGPT) API to suggest categories
 */
async function suggestWithOpenAI(
  emotion: Emotion | undefined,
  intensity: string | undefined,
  userInput: string | undefined,
  allCategories: Array<{ id: string; name: string; icon: string }>,
  freeTextMood?: string
): Promise<string[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('[AI] OpenAI API key not configured');
    return null;
  }

  try {
    const categoryNames = allCategories.map(c => c.name).join(', ');
    
    const prompt = `You are a helpful assistant for a quote app. A user is feeling "${emotion}"${intensity ? ` with ${intensity} intensity` : ''}${userInput ? `. They said: "${userInput}"` : ''}.

Available categories: ${categoryNames}

Based on this mood and context, suggest exactly 6 category names from the available list that would be most relevant and helpful. Return ONLY the category names, separated by commas, nothing else. Be thoughtful and consider what quotes would resonate with someone feeling this way.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.3, // Lower temperature for more consistent results
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] OpenAI API error:', response.status, error);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.log('[AI] OpenAI returned empty content');
      return null;
    }

    // Parse the response - extract category names
    const suggested = content
      .split(',')
      .map((cat: string) => cat.trim())
      .filter((cat: string) => cat.length > 0)
      .slice(0, 6);

    console.log('[AI] OpenAI suggested categories:', suggested);
    return suggested.length > 0 ? suggested : null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AI] OpenAI API request timeout');
    } else {
      console.error('[AI] OpenAI API call failed:', error);
    }
    return null;
  }
}

/**
 * Call Google Gemini API to suggest categories
 */
async function suggestWithGemini(
  emotion: Emotion | undefined,
  intensity: string | undefined,
  userInput: string | undefined,
  allCategories: Array<{ id: string; name: string; icon: string }>,
  freeTextMood?: string
): Promise<string[] | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('[AI] Google Gemini API key not configured');
    return null;
  }

  try {
    const categoryNames = allCategories.map(c => c.name).join(', ');
    
    const prompt = `You are a helpful assistant for a quote app. A user is feeling "${emotion}"${intensity ? ` with ${intensity} intensity` : ''}${userInput ? `. They said: "${userInput}"` : ''}.

Available categories: ${categoryNames}

Based on this mood and context, suggest exactly 6 category names from the available list that would be most relevant and helpful. Return ONLY the category names, separated by commas, nothing else. Be thoughtful and consider what quotes would resonate with someone feeling this way.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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
          temperature: 0.3,
          maxOutputTokens: 300, // Account for thinking tokens in gemini-2.5-flash
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

    // Parse the response - extract category names
    const suggested = content
      .split(',')
      .map((cat: string) => cat.trim())
      .filter((cat: string) => cat.length > 0)
      .slice(0, 6);

    console.log('[AI] Google Gemini suggested categories:', suggested);
    return suggested.length > 0 ? suggested : null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AI] Google Gemini API request timeout');
    } else {
      console.error('[AI] Google Gemini API call failed:', error);
    }
    return null;
  }
}

/**
 * Call Anthropic (Claude) API to suggest categories
 */
async function suggestWithAnthropic(
  emotion: Emotion | undefined,
  intensity: string | undefined,
  userInput: string | undefined,
  allCategories: Array<{ id: string; name: string; icon: string }>,
  freeTextMood?: string
): Promise<string[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[AI] Anthropic API key not configured');
    return null;
  }

  try {
    const categoryNames = allCategories.map(c => c.name).join(', ');
    
    const prompt = `You are a helpful assistant for a quote app. A user is feeling "${emotion}"${intensity ? ` with ${intensity} intensity` : ''}${userInput ? `. They said: "${userInput}"` : ''}.

Available categories: ${categoryNames}

Based on this mood and context, suggest exactly 6 category names from the available list that would be most relevant and helpful. Return ONLY the category names, separated by commas, nothing else. Be thoughtful and consider what quotes would resonate with someone feeling this way.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] Anthropic API error:', response.status, error);
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text?.trim();
    
    if (!content) {
      console.log('[AI] Anthropic returned empty content');
      return null;
    }

    // Parse the response
    const suggested = content
      .split(',')
      .map((cat: string) => cat.trim())
      .filter((cat: string) => cat.length > 0)
      .slice(0, 6);

    console.log('[AI] Anthropic suggested categories:', suggested);
    return suggested.length > 0 ? suggested : null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AI] Anthropic API request timeout');
    } else {
      console.error('[AI] Anthropic API call failed:', error);
    }
    return null;
  }
}

/**
 * Fallback: Rule-based category suggestion
 */
function suggestCategoriesFallback(
  emotion: Emotion | undefined,
  allCategories: Array<{ id: string; name: string; icon: string }>,
  maxSuggestions: number = 6,
  freeTextMood?: string
): string[] {
  // If free-text mood but no emotion, try to infer emotion from text
  if (!emotion && freeTextMood) {
    const moodLower = freeTextMood.toLowerCase();
    // Simple keyword matching to infer emotion
    if (moodLower.includes('anxious') || moodLower.includes('stressed') || moodLower.includes('worried')) {
      emotion = 'anxious';
    } else if (moodLower.includes('happy') || moodLower.includes('joy') || moodLower.includes('excited')) {
      emotion = 'joyful';
    } else if (moodLower.includes('sad') || moodLower.includes('lonely') || moodLower.includes('alone')) {
      emotion = 'lonely';
    } else if (moodLower.includes('motivated') || moodLower.includes('inspired') || moodLower.includes('determined')) {
      emotion = 'motivated';
    } else if (moodLower.includes('calm') || moodLower.includes('peace') || moodLower.includes('relaxed')) {
      emotion = 'calm';
    } else if (moodLower.includes('grateful') || moodLower.includes('thankful') || moodLower.includes('blessed')) {
      emotion = 'grateful';
    } else {
      // Default to 'content' if we can't infer
      emotion = 'content';
    }
  }
  
  if (!emotion) {
    // If still no emotion, return popular categories
    const popularCategories = ['Love', 'Life', 'Wisdom', 'Motivation', 'Happiness', 'Success'];
    const categoryMap = new Map<string, { id: string; icon: string }>();
    allCategories.forEach(cat => {
      categoryMap.set(cat.name, { id: cat.id, icon: cat.icon });
    });
    const suggestions: string[] = [];
    for (const popCat of popularCategories) {
      for (const [catName] of categoryMap.entries()) {
        if (catName.toLowerCase().includes(popCat.toLowerCase()) && !suggestions.includes(catName)) {
          suggestions.push(catName);
          if (suggestions.length >= maxSuggestions) break;
        }
      }
      if (suggestions.length >= maxSuggestions) break;
    }
    return suggestions.slice(0, maxSuggestions);
  }

  const primaryCategories = EMOTION_CATEGORY_MAP[emotion] || [];
  const secondaryCategories = SECONDARY_CATEGORY_MAP[emotion] || [];
  
  const categoryMap = new Map<string, { id: string; icon: string }>();
  allCategories.forEach(cat => {
    categoryMap.set(cat.name, { id: cat.id, icon: cat.icon });
  });
  
  const suggestions: string[] = [];
  
  // Try exact matches from primary categories
  for (const primaryCat of primaryCategories) {
    for (const [catName] of categoryMap.entries()) {
      if (catName.toLowerCase() === primaryCat.toLowerCase() && !suggestions.includes(catName)) {
        suggestions.push(catName);
        if (suggestions.length >= maxSuggestions) break;
      }
    }
    if (suggestions.length >= maxSuggestions) break;
  }
  
  // Try partial matches from primary categories
  if (suggestions.length < maxSuggestions) {
    for (const primaryCat of primaryCategories) {
      if (suggestions.length >= maxSuggestions) break;
      for (const [catName] of categoryMap.entries()) {
        if (
          catName.toLowerCase().includes(primaryCat.toLowerCase()) &&
          !suggestions.includes(catName)
        ) {
          suggestions.push(catName);
          if (suggestions.length >= maxSuggestions) break;
        }
      }
    }
  }
  
  // Try secondary categories
  if (suggestions.length < maxSuggestions) {
    for (const secondaryCat of secondaryCategories) {
      if (suggestions.length >= maxSuggestions) break;
      for (const [catName] of categoryMap.entries()) {
        if (
          catName.toLowerCase().includes(secondaryCat.toLowerCase()) &&
          !suggestions.includes(catName)
        ) {
          suggestions.push(catName);
          if (suggestions.length >= maxSuggestions) break;
        }
      }
    }
  }
  
  // Fallback to popular categories
  if (suggestions.length < maxSuggestions) {
    const popularCategories = ['Love', 'Life', 'Wisdom', 'Motivation', 'Happiness', 'Success'];
    for (const popCat of popularCategories) {
      if (suggestions.length >= maxSuggestions) break;
      for (const [catName] of categoryMap.entries()) {
        if (
          catName.toLowerCase().includes(popCat.toLowerCase()) &&
          !suggestions.includes(catName)
        ) {
          suggestions.push(catName);
          if (suggestions.length >= maxSuggestions) break;
        }
      }
    }
  }
  
  return suggestions.slice(0, maxSuggestions);
}

/**
 * Match AI suggestions to actual category names (fuzzy matching)
 */
function matchAISuggestions(
  aiSuggestions: string[],
  allCategories: Array<{ id: string; name: string; icon: string }>
): string[] {
  const matched: string[] = [];
  const categoryNames = allCategories.map(c => c.name.toLowerCase());
  
  for (const suggestion of aiSuggestions) {
    const suggestionLower = suggestion.toLowerCase().trim();
    
    // Try exact match first
    const exactMatch = allCategories.find(
      cat => cat.name.toLowerCase() === suggestionLower
    );
    if (exactMatch && !matched.includes(exactMatch.name)) {
      matched.push(exactMatch.name);
      continue;
    }
    
    // Try partial match
    const partialMatch = allCategories.find(
      cat => 
        cat.name.toLowerCase().includes(suggestionLower) ||
        suggestionLower.includes(cat.name.toLowerCase())
    );
    if (partialMatch && !matched.includes(partialMatch.name)) {
      matched.push(partialMatch.name);
      continue;
    }
    
    // Try fuzzy match (check if any word matches)
    const suggestionWords = suggestionLower.split(/\s+/);
    const fuzzyMatch = allCategories.find(cat => {
      const catWords = cat.name.toLowerCase().split(/\s+/);
      return suggestionWords.some(word => 
        catWords.some(catWord => 
          catWord.includes(word) || word.includes(catWord)
        )
      );
    });
    if (fuzzyMatch && !matched.includes(fuzzyMatch.name)) {
      matched.push(fuzzyMatch.name);
    }
  }
  
  return matched.slice(0, 6);
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestCategoriesRequest = await request.json();
    const { emotion, intensity, userInput, allCategories, freeTextMood } = body;

    console.log('[API] suggest-categories called - emotion:', emotion, 'freeTextMood:', freeTextMood?.substring(0, 50), 'categories:', allCategories?.length);

    if (!allCategories || !Array.isArray(allCategories)) {
      console.error('[API] Missing required fields');
      return NextResponse.json(
        { error: 'allCategories array is required' },
        { status: 400 }
      );
    }

    // Must have either emotion or freeTextMood
    if (!emotion && !freeTextMood?.trim()) {
      console.error('[API] Missing emotion or freeTextMood');
      return NextResponse.json(
        { error: 'Either emotion or freeTextMood is required' },
        { status: 400 }
      );
    }

    let suggestedCategories: string[] = [];
    let aiUsed: string | false = false;

    // Try AI providers in order of preference
    // 1. Try Google Gemini first (if configured)
    const geminiSuggestions = await suggestWithGemini(emotion, intensity, userInput, allCategories, freeTextMood);
    if (geminiSuggestions && geminiSuggestions.length > 0) {
      const matched = matchAISuggestions(geminiSuggestions, allCategories);
      if (matched.length > 0) {
        suggestedCategories = matched;
        aiUsed = 'gemini';
        console.log('[API] Using Google Gemini suggestions:', suggestedCategories);
      }
    }

    // 2. If Gemini fails, try OpenAI (ChatGPT)
    if (suggestedCategories.length === 0) {
      const openAISuggestions = await suggestWithOpenAI(emotion, intensity, userInput, allCategories, freeTextMood);
      if (openAISuggestions && openAISuggestions.length > 0) {
        const matched = matchAISuggestions(openAISuggestions, allCategories);
        if (matched.length > 0) {
          suggestedCategories = matched;
          aiUsed = 'openai';
          console.log('[API] Using OpenAI suggestions:', suggestedCategories);
        }
      }
    }

    // 3. If OpenAI fails, try Anthropic (Claude)
    if (suggestedCategories.length === 0) {
      const anthropicSuggestions = await suggestWithAnthropic(emotion, intensity, userInput, allCategories, freeTextMood);
      if (anthropicSuggestions && anthropicSuggestions.length > 0) {
        const matched = matchAISuggestions(anthropicSuggestions, allCategories);
        if (matched.length > 0) {
          suggestedCategories = matched;
          aiUsed = 'anthropic';
          console.log('[API] Using Anthropic suggestions:', suggestedCategories);
        }
      }
    }

    // 4. Fallback to rule-based if AI fails or not configured
    if (suggestedCategories.length === 0) {
      suggestedCategories = suggestCategoriesFallback(emotion, allCategories, 6, freeTextMood);
      console.log('[API] Using fallback rule-based suggestions:', suggestedCategories);
    }

    return NextResponse.json({
      suggestedCategories,
      emotion: emotion || 'custom',
      aiUsed: aiUsed || 'fallback',
      message: freeTextMood 
        ? `Based on your mood: "${freeTextMood.substring(0, 50)}...", we suggest these categories`
        : `Based on your ${emotion} mood, we suggest these categories`,
    }, { status: 200 });
  } catch (error) {
    console.error('[API] Error suggesting categories:', error);
    
    // Even on error, try fallback
    try {
      const body: SuggestCategoriesRequest = await request.json();
      const fallback = suggestCategoriesFallback(body.emotion, body.allCategories, 6, body.freeTextMood);
      return NextResponse.json({
        suggestedCategories: fallback,
        emotion: body.emotion || 'custom',
        aiUsed: 'fallback',
        error: 'AI service unavailable, using fallback',
      }, { status: 200 });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}