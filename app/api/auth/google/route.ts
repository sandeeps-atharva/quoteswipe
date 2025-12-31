import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { welcomeEmailTemplate, welcomeEmailText } from '@/lib/email-templates';

// Get a random quote for welcome email
async function getRandomQuote(): Promise<{ text: string; author: string; category?: string } | null> {
  try {
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');
    
    const quotes = await quotesCollection.aggregate([
      { $sample: { size: 1 } }
    ]).toArray() as any[];
    
    if (quotes.length > 0) {
      const quote = quotes[0];
      let categoryName = '';
      if (quote.category_id) {
        const category: any = await categoriesCollection.findOne({ _id: quote.category_id }) as any;
        categoryName = category?.name || '';
      }
      return { text: quote.text, author: quote.author, category: categoryName };
    }
    return null;
  } catch {
    return null;
  }
}

// Send welcome email with a quote
async function sendWelcomeEmail(name: string, email: string) {
  try {
    const quote = await getRandomQuote();
    
    if (!quote) {
      console.warn('No quote found for welcome email');
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';
    
    const html = welcomeEmailTemplate(
      { name, email },
      quote,
      appUrl
    );

    const text = welcomeEmailText(
      { name, email },
      quote,
      appUrl
    );

    const result = await sendEmail({
      to: email,
      subject: '✨ Welcome to QuoteSwipe! Here\'s your first inspiring quote',
      html,
      text,
    });

    if (!result.success) {
      console.error('Failed to send welcome email:', result.error);
    } else {
      console.log(`Welcome email sent to ${email}`);
    }
  } catch (error) {
    console.error('Welcome email error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { error: 'Google credential is required' },
        { status: 400 }
      );
    }

    // Decode the JWT token from Google
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid Google credential' },
        { status: 400 }
      );
    }

    // Decode the payload (middle part of JWT)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    const { email, name, picture, sub: googleId, email_verified } = payload;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in Google credential' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');

    // Check if user exists
    const existingUser: any = await usersCollection.findOne({
      $or: [{ email }, { google_id: googleId }]
    }) as any;

    let userId: string;
    let userName = name || email.split('@')[0];
    let isNewUser = false;

    if (existingUser) {
      // User exists - link Google account if not already linked
      userId = existingUser._id.toString();
      userName = existingUser.name;

      // Auto-link Google account to existing email/password account
      // This allows users to sign in with either method
      if (!existingUser.google_id) {
        await usersCollection.updateOne(
          { _id: existingUser._id },
          { 
            $set: { 
              google_id: googleId, 
              // Only update profile picture if user doesn't have one
              ...(existingUser.profile_picture ? {} : { profile_picture: picture || null }),
              // Mark email as verified since Google verified it
              email_verified: true,
            } 
          }
        );
      }
    } else {
      // Create new user
      const result = await usersCollection.insertOne({
        name: userName,
        email,
        google_id: googleId,
        profile_picture: picture || null,
        email_verified: email_verified || false,
        role: 'user',
        onboarding_complete: false,  // New users need onboarding
        created_at: new Date(),
      } as any);

      userId = result.insertedId.toString();
      isNewUser = true;

      // Send welcome email for new users (non-blocking)
      sendWelcomeEmail(userName, email).catch(err => {
        console.error('Welcome email error:', err);
      });
    }

    // Generate JWT token
    const token = generateToken({ userId, email });

    // Get onboarding status for existing users
    const onboardingComplete = isNewUser ? false : (existingUser?.onboarding_complete ?? true);

    // Get profile picture (existing user's profile_picture or Google's picture for new users)
    const profilePicture = isNewUser ? (picture || null) : (existingUser?.profile_picture || picture || null);

    // Create response
    const response = NextResponse.json(
      { 
        message: isNewUser ? 'Account created successfully' : 'Login successful', 
        user: { id: userId, name: userName, email, auth_provider: 'google', profile_picture: profilePicture },
        isNewUser,
        onboarding_complete: onboardingComplete
      },
      { status: isNewUser ? 201 : 200 }
    );

    // Set auth cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
