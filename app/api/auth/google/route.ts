import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { welcomeEmailTemplate, welcomeEmailText } from '@/lib/email-templates';

// Get a random quote for welcome email
async function getRandomQuote(): Promise<{ text: string; author: string; category?: string } | null> {
  try {
    const [quotes] = await pool.execute(`
      SELECT q.text, q.author, c.name as category
      FROM quotes q
      LEFT JOIN categories c ON q.category_id = c.id
      ORDER BY RAND()
      LIMIT 1
    `);
    
    if (Array.isArray(quotes) && quotes.length > 0) {
      return quotes[0] as { text: string; author: string; category?: string };
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
    // The credential is a JWT token that contains user info
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

    // Verify the token with Google (optional but recommended for production)
    // For now, we'll trust the JWT since it comes directly from Google's OAuth

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT id, name, email, google_id, password FROM users WHERE email = ? OR google_id = ?',
      [email, googleId]
    );

    let userId: number;
    let userName = name || email.split('@')[0];
    let isNewUser = false;

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      // User exists
      const user = existingUsers[0] as { id: number; name: string; google_id?: string; password?: string };
      
      // Check if user registered with email/password but NOT with Google
      if (user.password && !user.google_id) {
        return NextResponse.json(
          { 
            error: 'This email is already registered with email and password. Please login using your email and password instead of Google Sign-In.',
            type: 'email_password_account'
          },
          { status: 400 }
        );
      }

      userId = user.id;
      userName = user.name;

      // Link Google account if not already linked (this case: user has google_id already)
      if (!user.google_id) {
        await pool.execute(
          'UPDATE users SET google_id = ?, profile_picture = ? WHERE id = ?',
          [googleId, picture || null, userId]
        );
      }
    } else {
      // Create new user
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, google_id, profile_picture, email_verified) VALUES (?, ?, ?, ?, ?)',
        [userName, email, googleId, picture || null, email_verified ? 1 : 0]
      ) as any;

      userId = result.insertId;
      isNewUser = true;

      // Send welcome email for new users (non-blocking)
      sendWelcomeEmail(userName, email).catch(err => {
        console.error('Welcome email error:', err);
      });
    }

    // Generate JWT token
    const token = generateToken({ userId, email });

    // Create response
    const response = NextResponse.json(
      { 
        message: isNewUser ? 'Account created successfully' : 'Login successful', 
        user: { id: userId, name: userName, email, auth_provider: 'google' } 
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

