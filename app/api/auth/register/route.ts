import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    ) as any;

    const userId = result.insertId;

    // Generate token
    const token = generateToken({ userId, email });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(name, email).catch(err => {
      console.error('Welcome email error:', err);
    });

    // Set cookie
    const response = NextResponse.json(
      { message: 'User created successfully', user: { id: userId, name, email, auth_provider: 'email' } },
      { status: 201 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Send welcome email with a quote
async function sendWelcomeEmail(name: string, email: string) {
  try {
    // Get a random quote for the welcome email
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

