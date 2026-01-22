# MoodSense AI Integration Guide

## Overview

MoodSense now supports AI-powered category suggestions using Google Gemini, ChatGPT (OpenAI), or Claude (Anthropic). The system intelligently suggests relevant quote categories based on the user's mood, intensity, and optional context.

## How It Works

1. **User sets mood** → Selects emotion (e.g., "Anxious") + intensity + optional context
2. **AI analyzes** → Sends mood data to AI service with all available categories
3. **AI suggests** → Returns 6 most relevant categories
4. **System matches** → Fuzzy matches AI suggestions to actual category names
5. **Fallback** → If AI fails or isn't configured, uses rule-based matching

## Setup Instructions

### Option 1: Google Gemini - Recommended (Free tier available)

1. **Get API Key:**
   - Go to https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the key

2. **Add to `.env`:**
   ```bash
   GOOGLE_GEMINI_API_KEY=your-api-key-here
   GOOGLE_GEMINI_MODEL=gemini-2.5-flash  # Optional: gemini-2.5-pro
   ```

3. **Cost:** FREE tier available (60 requests/minute), then pay-as-you-go

### Option 2: OpenAI (ChatGPT)

1. **Get API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Add to `.env`:**
   ```bash
   OPENAI_API_KEY=sk-your-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo  # Optional: gpt-4, gpt-4-turbo
   ```

3. **Cost:** ~$0.001-0.002 per request (very affordable)

### Option 3: Anthropic (Claude)

1. **Get API Key:**
   - Go to https://console.anthropic.com/
   - Create a new API key
   - Copy the key (starts with `sk-ant-`)

2. **Add to `.env`:**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   ANTHROPIC_MODEL=claude-3-haiku-20240307  # Optional: claude-3-opus, claude-3-sonnet
   ```

3. **Cost:** ~$0.00025 per request (very affordable)

### Option 4: No AI (Fallback)

If no AI keys are configured, the system automatically uses rule-based category matching. This still works great but is less personalized.

## API Priority

The system tries AI providers in this order:
1. **Google Gemini** (if `GOOGLE_GEMINI_API_KEY` is set) - **Recommended**
2. **OpenAI** (if Gemini fails and `OPENAI_API_KEY` is set)
3. **Anthropic** (if OpenAI fails and `ANTHROPIC_API_KEY` is set)
4. **Rule-based fallback** (if all fail or aren't configured)

## Example Request

```json
POST /api/moodsense/suggest-categories
{
  "emotion": "anxious",
  "intensity": "moderate",
  "userInput": "Feeling stressed about work",
  "allCategories": [
    { "id": "1", "name": "Peace", "icon": "🕊️" },
    { "id": "2", "name": "Calm", "icon": "🌊" },
    ...
  ]
}
```

## Example Response

```json
{
  "suggestedCategories": ["Peace", "Calm", "Mindfulness", "Healing", "Strength", "Courage"],
  "emotion": "anxious",
  "aiUsed": "gemini",  // or "openai" or "anthropic" or "fallback"
  "message": "Based on your anxious mood, we suggest these categories"
}
```

## Benefits of AI Integration

✅ **More Personalized** - AI understands context and nuance  
✅ **Better Matching** - Considers user's optional input text  
✅ **Adaptive** - Learns from patterns in your category names  
✅ **Scalable** - Works with any number of categories  
✅ **Reliable** - Automatic fallback if AI fails  

## Cost Estimation

- **Google Gemini:** FREE tier (60 requests/minute), then pay-as-you-go
- **OpenAI GPT-3.5:** ~$0.001 per request
- **Anthropic Claude Haiku:** ~$0.00025 per request
- **Rule-based:** Free (no API calls)

For 1000 users/day with 1 mood set each:
- **Google Gemini:** FREE (within free tier limits)
- OpenAI: ~$1/day (~$30/month)
- Anthropic: ~$0.25/day (~$7.50/month)

## Security Notes

- ✅ API keys are server-side only (never exposed to client)
- ✅ Rate limiting handled by AI providers
- ✅ Error handling with graceful fallback
- ✅ No user data stored or sent to AI (only mood + categories)

## Troubleshooting

### AI not working?
1. Check API key is set correctly in `.env`
2. Check API key has credits/quota
3. Check console logs for specific errors
4. System will automatically fallback to rule-based

### Suggestions not matching?
- AI suggestions are fuzzy-matched to your actual category names
- If AI suggests "Peaceful" but you have "Peace", it will match
- Fallback ensures you always get suggestions

### Want to test without AI?
- Simply don't set the API keys
- System will use rule-based matching automatically

## Support

For issues or questions, check:
- API logs in server console
- Network tab in browser DevTools
- Check AI provider dashboard for quota/errors
