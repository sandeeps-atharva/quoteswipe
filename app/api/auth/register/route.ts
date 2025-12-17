import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCollection } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { welcomeEmailTemplate, welcomeEmailText } from '@/lib/email-templates';

// Get a random quote for welcome email
async function getRandomQuote(): Promise<{ text: string; author: string; category?: string } | null> {
  try {
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');
    
    // Get random quote using aggregation
    const quotes = await quotesCollection.aggregate([
      { $sample: { size: 1 } }
    ]).toArray() as any[];
    
    if (quotes.length > 0) {
      const quote = quotes[0];
      // Get category name if exists
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

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');

    // Check if user already exists
    const existingUser: any = await usersCollection.findOne({ email }) as any;

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await usersCollection.insertOne({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      created_at: new Date(),
    } as any);

    const userId = result.insertedId.toString();

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
