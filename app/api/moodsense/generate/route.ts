import { NextRequest, NextResponse } from 'next/server';
import { Emotion, EmotionalIntensity, BehaviorPattern } from '@/contexts/MoodSenseContext';

interface GenerateQuoteRequest {
  emotion: Emotion;
  intensity: EmotionalIntensity;
  userInput?: string;
  behaviorPattern: BehaviorPattern;
  language: string;
  context?: {
    theme?: string;
    timeOfDay?: string;
    recentLiked?: any[];
    recentSaved?: any[];
  };
}

// Emotion-based quote templates and generation logic
const EMOTION_QUOTES: Record<Emotion, { soft: string[]; moderate: string[]; deep: string[]; bold: string[] }> = {
  hopeful: {
    soft: [
      "Every sunrise brings new possibilities.",
      "Small steps forward are still progress.",
      "Hope is the light that guides us through darkness.",
    ],
    moderate: [
      "Even in the darkest moments, there's always a glimmer of light waiting to be found.",
      "Hope isn't about ignoring reality—it's about believing in what's possible.",
      "Tomorrow holds promise, but today holds opportunity.",
    ],
    deep: [
      "Hope is not the absence of fear, but the courage to move forward despite it.",
      "In the space between what is and what could be, hope lives and breathes.",
      "The most beautiful things often emerge from the most difficult moments.",
    ],
    bold: [
      "Hope is not a passive wish—it's an active choice to believe in better days ahead.",
      "When everything seems impossible, that's exactly when hope matters most.",
      "Your future self is counting on the hope you nurture today.",
    ],
  },
  lonely: {
    soft: [
      "You are never truly alone—your thoughts are always with you.",
      "Solitude can be a teacher, not just a companion.",
      "Sometimes being alone helps us find ourselves.",
    ],
    moderate: [
      "Loneliness is temporary, but the connections you'll make are lasting.",
      "In solitude, we discover the strength we didn't know we had.",
      "Being alone doesn't mean being lonely—it means being free to be yourself.",
    ],
    deep: [
      "The space between loneliness and solitude is where we learn to love ourselves.",
      "Sometimes the most profound connections come after periods of deep solitude.",
      "Loneliness is the universe's way of preparing you for the right people.",
    ],
    bold: [
      "Embrace your solitude—it's where your greatest growth happens.",
      "You are complete on your own, and any connection is a bonus, not a necessity.",
      "Loneliness is not a flaw—it's a sign that you're ready for deeper connections.",
    ],
  },
  motivated: {
    soft: [
      "Every small action moves you closer to your goal.",
      "Progress, not perfection, is the path forward.",
      "You have everything you need to start right now.",
    ],
    moderate: [
      "Motivation gets you started, but discipline keeps you going.",
      "The best time to start was yesterday—the second best time is now.",
      "Your future self will thank you for the choices you make today.",
    ],
    deep: [
      "True motivation comes from aligning your actions with your deepest values.",
      "The gap between where you are and where you want to be is bridged by consistent action.",
      "Motivation is fleeting, but purpose is enduring—find your why.",
    ],
    bold: [
      "Stop waiting for motivation—create it through action, one step at a time.",
      "Your dreams don't work unless you do. Start now, start small, but start.",
      "The only person standing between you and your goals is the person you were yesterday.",
    ],
  },
  anxious: {
    soft: [
      "This feeling will pass, just like all feelings do.",
      "Take a deep breath—you're stronger than this moment.",
      "Anxiety is temporary, but your strength is permanent.",
    ],
    moderate: [
      "Anxiety is your mind's way of trying to protect you—acknowledge it, then let it go.",
      "You've survived every anxious moment before, and you'll survive this one too.",
      "The things we worry about rarely happen, and when they do, we handle them better than expected.",
    ],
    deep: [
      "Anxiety is not a sign of weakness—it's a sign that you care deeply about something.",
      "In the space between stimulus and response, there is choice—choose peace over panic.",
      "Your anxious thoughts are not facts—they're just thoughts passing through.",
    ],
    bold: [
      "Anxiety is temporary, but your courage to face it is permanent.",
      "You are not your anxiety—you are the awareness that observes it.",
      "Every moment of anxiety you overcome makes you stronger for the next challenge.",
    ],
  },
  heartbroken: {
    soft: [
      "Healing takes time, and that's okay.",
      "Your heart will mend, stronger than before.",
      "Pain is temporary, but love is eternal.",
    ],
    moderate: [
      "Heartbreak is not the end—it's the beginning of understanding yourself better.",
      "The depth of your pain reflects the depth of your capacity to love.",
      "Broken hearts heal, but they never forget the lessons they learned.",
    ],
    deep: [
      "In the ruins of a broken heart, you'll find the foundation for a stronger one.",
      "Heartbreak teaches us what we truly value and what we're willing to fight for.",
      "The pain you feel today is the strength you'll have tomorrow.",
    ],
    bold: [
      "Your heartbreak is not a weakness—it's proof that you loved deeply and authentically.",
      "The end of one love story is the beginning of your own self-love story.",
      "You will love again, but first, love yourself through this pain.",
    ],
  },
  calm: {
    soft: [
      "Peace comes from within—you already have it.",
      "In stillness, we find clarity.",
      "Let calm be your superpower.",
    ],
    moderate: [
      "Calm is not the absence of chaos, but peace within it.",
      "In the quiet moments, we find our true selves.",
      "Serenity is a choice you make, not a circumstance you wait for.",
    ],
    deep: [
      "True calm comes from accepting what is, not from controlling what might be.",
      "In the space between thoughts, there is infinite peace.",
      "Calm is the foundation from which all wisdom flows.",
    ],
    bold: [
      "Your calm in the storm is your greatest strength.",
      "When everything is chaotic, your inner peace becomes your anchor.",
      "Calm is not passive—it's powerful presence in the moment.",
    ],
  },
  excited: {
    soft: [
      "Excitement is the energy of possibility.",
      "Every moment holds something to look forward to.",
      "Let your enthusiasm light the way.",
    ],
    moderate: [
      "Excitement is anticipation meeting opportunity.",
      "The best adventures begin with a single moment of excitement.",
      "Your enthusiasm is contagious—spread it generously.",
    ],
    deep: [
      "Excitement is the universe's way of saying you're on the right path.",
      "True excitement comes from aligning with your authentic desires.",
      "The energy of excitement is the fuel for transformation.",
    ],
    bold: [
      "Your excitement is not just a feeling—it's a force that creates reality.",
      "When you're excited, you're vibrating at the frequency of your dreams.",
      "Excitement is the bridge between where you are and where you want to be.",
    ],
  },
  grateful: {
    soft: [
      "Gratitude turns what we have into enough.",
      "Small moments of gratitude create big shifts.",
      "Thankfulness is the simplest path to joy.",
    ],
    moderate: [
      "Gratitude is not about having everything—it's about appreciating what you have.",
      "In every moment, there's something to be grateful for, even if it's just the moment itself.",
      "Gratitude transforms ordinary moments into extraordinary memories.",
    ],
    deep: [
      "True gratitude is not just feeling thankful—it's living in a way that honors what you've been given.",
      "Gratitude is the recognition that every breath is a gift.",
      "In the practice of gratitude, we find the secret to lasting happiness.",
    ],
    bold: [
      "Gratitude is not passive appreciation—it's active recognition of life's abundance.",
      "Your gratitude doesn't just change your perspective—it changes your reality.",
      "The most powerful force in the universe is a grateful heart.",
    ],
  },
  determined: {
    soft: [
      "Small steps forward are still progress.",
      "Determination is built one choice at a time.",
      "You have what it takes to keep going.",
    ],
    moderate: [
      "Determination is choosing to continue when it would be easier to quit.",
      "Your resolve is stronger than any obstacle in your path.",
      "Every challenge you face makes your determination stronger.",
    ],
    deep: [
      "True determination comes from knowing your why—when you know why, you'll find the how.",
      "Determination is not about never falling—it's about always getting back up.",
      "The difference between success and failure is often just one more attempt.",
    ],
    bold: [
      "Your determination is not negotiable—it's non-negotiable.",
      "When determination meets opportunity, miracles happen.",
      "Stop at nothing, because nothing can stop you when you're truly determined.",
    ],
  },
  reflective: {
    soft: [
      "In reflection, we find wisdom.",
      "Looking inward reveals outward truths.",
      "Quiet contemplation brings clarity.",
    ],
    moderate: [
      "Reflection is the bridge between experience and understanding.",
      "In the mirror of self-reflection, we see who we truly are.",
      "The most profound insights come from moments of quiet reflection.",
    ],
    deep: [
      "True reflection is not just thinking about the past—it's understanding how it shapes the future.",
      "In the space between action and reaction, reflection lives.",
      "Self-reflection is the most honest conversation you'll ever have.",
    ],
    bold: [
      "Reflection is not passive contemplation—it's active transformation.",
      "The most powerful changes begin with honest self-reflection.",
      "When you reflect deeply, you don't just see yourself—you see your potential.",
    ],
  },
  inspired: {
    soft: [
      "Inspiration is everywhere—you just need to notice it.",
      "Let inspiration guide your next step.",
      "Every moment can spark something new.",
    ],
    moderate: [
      "Inspiration is the spark that ignites action.",
      "When inspiration strikes, don't wait—act on it immediately.",
      "True inspiration comes from connecting with something greater than yourself.",
    ],
    deep: [
      "Inspiration is not just a feeling—it's a call to create something meaningful.",
      "The most inspired moments come when we're open to receiving them.",
      "Inspiration flows when we align with our authentic purpose.",
    ],
    bold: [
      "Your inspiration is not random—it's the universe calling you to greatness.",
      "When inspiration meets action, magic happens.",
      "Don't just wait for inspiration—create the conditions for it to find you.",
    ],
  },
  peaceful: {
    soft: [
      "Peace is already within you—just breathe.",
      "In stillness, peace finds you.",
      "Let peace be your natural state.",
    ],
    moderate: [
      "Peace is not the absence of conflict, but the presence of harmony within.",
      "True peace comes from accepting what is and trusting what will be.",
      "In peace, we find our greatest strength.",
    ],
    deep: [
      "Peace is not passive—it's the most powerful state of being.",
      "In the depths of peace, we find infinite wisdom.",
      "True peace is not found in circumstances, but in how we respond to them.",
    ],
    bold: [
      "Your peace is unshakeable because it comes from within, not from without.",
      "When you're at peace, you're unstoppable.",
      "Peace is not weakness—it's the ultimate strength.",
    ],
  },
  energetic: {
    soft: [
      "Your energy is a gift—use it wisely.",
      "Vitality flows when you're aligned.",
      "Energy follows intention.",
    ],
    moderate: [
      "High energy is not just physical—it's mental, emotional, and spiritual alignment.",
      "Your energy is contagious—spread it where it matters most.",
      "True energy comes from doing what energizes you.",
    ],
    deep: [
      "Energy is not something you have—it's something you create through alignment.",
      "The most energetic people are those who've found their purpose.",
      "Your energy is a reflection of how aligned you are with your authentic self.",
    ],
    bold: [
      "Your energy is limitless when you're connected to your purpose.",
      "Stop managing your energy—start aligning with it.",
      "When you're energized, you're unstoppable—channel that power wisely.",
    ],
  },
  contemplative: {
    soft: [
      "Deep thoughts lead to deeper understanding.",
      "Contemplation is the path to wisdom.",
      "In thinking deeply, we find clarity.",
    ],
    moderate: [
      "Contemplation is not overthinking—it's understanding thinking.",
      "The most profound insights come from quiet contemplation.",
      "In contemplation, we find answers to questions we didn't know we had.",
    ],
    deep: [
      "True contemplation is not just thinking—it's being present with your thoughts.",
      "In the depths of contemplation, we discover who we truly are.",
      "Contemplation is the bridge between confusion and clarity.",
    ],
    bold: [
      "Your contemplative mind is your greatest asset—use it to transform your reality.",
      "Don't just think—contemplate until you understand.",
      "The most powerful changes come from deep contemplation followed by decisive action.",
    ],
  },
  joyful: {
    soft: [
      "Joy is found in the simplest moments.",
      "Let joy be your natural state.",
      "Happiness is a choice you make every day.",
    ],
    moderate: [
      "Joy is not the absence of problems, but the presence of gratitude.",
      "True joy comes from within and radiates outward.",
      "The most joyful people are those who've learned to find joy in everything.",
    ],
    deep: [
      "Joy is not dependent on circumstances—it's a state of being you choose.",
      "In joy, we find our true nature and highest expression.",
      "The deepest joy comes from living in alignment with your values.",
    ],
    bold: [
      "Your joy is not negotiable—it's your birthright.",
      "When you're joyful, you're unstoppable—spread that energy everywhere.",
      "Joy is not just a feeling—it's a way of life.",
    ],
  },
  melancholic: {
    soft: [
      "Melancholy has its own beauty and wisdom.",
      "In sadness, we find depth.",
      "It's okay to feel the weight of the world sometimes.",
    ],
    moderate: [
      "Melancholy is not depression—it's a deep appreciation for the bittersweet nature of life.",
      "In melancholy, we find the poetry of existence.",
      "The most beautiful art comes from moments of deep melancholy.",
    ],
    deep: [
      "Melancholy is the recognition that all beautiful things are temporary, and that's what makes them beautiful.",
      "In the depths of melancholy, we find profound understanding.",
      "True melancholy is not sadness—it's the awareness of life's beautiful impermanence.",
    ],
    bold: [
      "Your melancholy is not weakness—it's depth of feeling.",
      "Embrace your melancholy—it's part of what makes you beautifully human.",
      "The most profound insights come from moments of deep melancholy.",
    ],
  },
  confident: {
    soft: [
      "Confidence grows with each step you take.",
      "You have everything you need within you.",
      "Believe in yourself—others will follow.",
    ],
    moderate: [
      "Confidence is not arrogance—it's knowing your worth.",
      "True confidence comes from self-acceptance, not self-aggrandizement.",
      "Your confidence is magnetic—it draws opportunities to you.",
    ],
    deep: [
      "Confidence is not the absence of doubt—it's moving forward despite it.",
      "True confidence comes from knowing who you are, not from what others think.",
      "The most confident people are those who've learned to trust themselves.",
    ],
    bold: [
      "Your confidence is not negotiable—it's your superpower.",
      "When you're confident, you're unstoppable—own that power.",
      "Confidence is not about being perfect—it's about being perfectly yourself.",
    ],
  },
  uncertain: {
    soft: [
      "Uncertainty is just the space before clarity.",
      "It's okay not to have all the answers.",
      "In uncertainty, possibilities live.",
    ],
    moderate: [
      "Uncertainty is not weakness—it's honesty about the unknown.",
      "The most growth happens in moments of uncertainty.",
      "In uncertainty, we find the courage to explore.",
    ],
    deep: [
      "True wisdom comes from being comfortable with uncertainty.",
      "Uncertainty is not the absence of knowledge—it's the presence of possibility.",
      "In the space of uncertainty, we discover who we truly are.",
    ],
    bold: [
      "Your uncertainty is not a flaw—it's a sign of growth.",
      "Embrace uncertainty—it's where innovation and transformation happen.",
      "The most courageous people are those who move forward despite uncertainty.",
    ],
  },
  content: {
    soft: [
      "Contentment is found in appreciating what is.",
      "In contentment, we find true wealth.",
      "Peace comes from being satisfied with enough.",
    ],
    moderate: [
      "Contentment is not complacency—it's gratitude for what you have while still growing.",
      "True contentment comes from within, not from external circumstances.",
      "In contentment, we find the foundation for lasting happiness.",
    ],
    deep: [
      "Contentment is the recognition that you are enough, exactly as you are.",
      "True contentment is not about having everything—it's about wanting what you have.",
      "In the state of contentment, we find our true home.",
    ],
    bold: [
      "Your contentment is not settling—it's choosing peace over constant striving.",
      "When you're content, you're powerful—you're not dependent on external validation.",
      "Contentment is the ultimate form of wealth—it can't be taken away.",
    ],
  },
  restless: {
    soft: [
      "Restlessness is energy waiting to be channeled.",
      "Your restlessness is a sign that change is needed.",
      "In restlessness, growth is calling.",
    ],
    moderate: [
      "Restlessness is not a problem—it's a signal that you're ready for something new.",
      "Your restlessness is the universe telling you it's time to move.",
      "In restlessness, we find the motivation to transform.",
    ],
    deep: [
      "True restlessness comes from misalignment—it's your soul asking for change.",
      "Restlessness is not anxiety—it's anticipation of what's possible.",
      "In the depths of restlessness, we find our next direction.",
    ],
    bold: [
      "Your restlessness is not a flaw—it's fuel for transformation.",
      "Don't suppress your restlessness—channel it into action.",
      "The most restless people become the most accomplished—use that energy wisely.",
    ],
  },
};

// Generate quote based on emotion, intensity, and context
function generateQuote(
  emotion: Emotion,
  intensity: EmotionalIntensity,
  userInput?: string,
  behaviorPattern?: BehaviorPattern,
  context?: any
): { text: string; author: string; emotion: Emotion; intensity: EmotionalIntensity; suggestedTheme?: string; suggestedFont?: string; caption?: string } {
  const quotes = EMOTION_QUOTES[emotion][intensity];
  
  // Select quote based on behavior pattern
  let selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
  
  // Adjust based on behavior
  if (behaviorPattern) {
    if (behaviorPattern.skipStreak >= 3 && intensity === 'bold') {
      // User skipping a lot - soften
      const softerQuotes = EMOTION_QUOTES[emotion]['soft'] || EMOTION_QUOTES[emotion]['moderate'];
      selectedQuote = softerQuotes[Math.floor(Math.random() * softerQuotes.length)];
    } else if (behaviorPattern.likeStreak >= 5 && intensity === 'soft') {
      // User liking a lot - intensify
      const strongerQuotes = EMOTION_QUOTES[emotion]['deep'] || EMOTION_QUOTES[emotion]['bold'];
      selectedQuote = strongerQuotes[Math.floor(Math.random() * strongerQuotes.length)];
    }
  }

  // Generate author based on emotion
  const authors: Record<Emotion, string[]> = {
    hopeful: ['Anonymous', 'Unknown', 'Wisdom'],
    lonely: ['Anonymous', 'Unknown', 'Reflection'],
    motivated: ['Anonymous', 'Unknown', 'Determination'],
    anxious: ['Anonymous', 'Unknown', 'Understanding'],
    heartbroken: ['Anonymous', 'Unknown', 'Healing'],
    calm: ['Anonymous', 'Unknown', 'Peace'],
    excited: ['Anonymous', 'Unknown', 'Enthusiasm'],
    grateful: ['Anonymous', 'Unknown', 'Gratitude'],
    determined: ['Anonymous', 'Unknown', 'Resolve'],
    reflective: ['Anonymous', 'Unknown', 'Contemplation'],
    inspired: ['Anonymous', 'Unknown', 'Inspiration'],
    peaceful: ['Anonymous', 'Unknown', 'Serenity'],
    energetic: ['Anonymous', 'Unknown', 'Vitality'],
    contemplative: ['Anonymous', 'Unknown', 'Wisdom'],
    joyful: ['Anonymous', 'Unknown', 'Joy'],
    melancholic: ['Anonymous', 'Unknown', 'Depth'],
    confident: ['Anonymous', 'Unknown', 'Strength'],
    uncertain: ['Anonymous', 'Unknown', 'Exploration'],
    content: ['Anonymous', 'Unknown', 'Satisfaction'],
    restless: ['Anonymous', 'Unknown', 'Transformation'],
  };

  const author = authors[emotion][Math.floor(Math.random() * authors[emotion].length)];

  // Suggest theme and font based on emotion
  const themeMap: Record<Emotion, string> = {
    hopeful: 'sunset-glow',
    lonely: 'midnight-blue',
    motivated: 'royal-purple',
    anxious: 'ocean-deep',
    heartbroken: 'rose-gold',
    calm: 'forest-calm',
    excited: 'sunset-glow',
    grateful: 'rose-gold',
    determined: 'royal-purple',
    reflective: 'midnight-blue',
    inspired: 'sunset-glow',
    peaceful: 'forest-calm',
    energetic: 'sunset-glow',
    contemplative: 'midnight-blue',
    joyful: 'sunset-glow',
    melancholic: 'ocean-deep',
    confident: 'royal-purple',
    uncertain: 'ocean-deep',
    content: 'forest-calm',
    restless: 'royal-purple',
  };

  const fontMap: Record<Emotion, string> = {
    hopeful: 'elegant',
    lonely: 'classic',
    motivated: 'bold',
    anxious: 'minimal',
    heartbroken: 'elegant',
    calm: 'minimal',
    excited: 'bold',
    grateful: 'elegant',
    determined: 'bold',
    reflective: 'classic',
    inspired: 'elegant',
    peaceful: 'minimal',
    energetic: 'bold',
    contemplative: 'classic',
    joyful: 'bold',
    melancholic: 'elegant',
    confident: 'bold',
    uncertain: 'minimal',
    content: 'minimal',
    restless: 'bold',
  };

  // Generate caption
  const caption = `Feeling ${emotion}? This quote resonates. 💫`;

  return {
    text: selectedQuote,
    author,
    emotion,
    intensity,
    suggestedTheme: themeMap[emotion],
    suggestedFont: fontMap[emotion],
    caption,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuoteRequest = await request.json();
    const { emotion, intensity, userInput, behaviorPattern, context } = body;

    if (!emotion || !intensity) {
      return NextResponse.json(
        { error: 'Emotion and intensity are required' },
        { status: 400 }
      );
    }

    const quote = generateQuote(emotion, intensity, userInput, behaviorPattern, context);

    return NextResponse.json({ quote }, { status: 200 });
  } catch (error) {
    console.error('Error generating quote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
