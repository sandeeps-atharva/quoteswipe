import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { festivalEmailTemplate, festivalEmailText } from '@/lib/email-templates';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Quote {
  id: number;
  text: string;
  author: string;
  category_name?: string;
}

interface Festival {
  id: number;
  name: string;
}

// POST /api/admin/send-email - Send bulk festival emails
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { 
      userIds, 
      festivalId, 
      quoteId, 
      subject, 
      customMessage,
      sendToAll = false 
    } = await request.json();

    // Validate inputs
    if (!festivalId || !quoteId || !subject) {
      return NextResponse.json(
        { error: 'Festival, quote, and subject are required' },
        { status: 400 }
      );
    }

    if (!sendToAll && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
      return NextResponse.json(
        { error: 'Please select at least one user or choose "Send to All"' },
        { status: 400 }
      );
    }

    // Get festival
    const [festivals] = await pool.execute(
      'SELECT id, name FROM festivals WHERE id = ?',
      [festivalId]
    );

    if (!Array.isArray(festivals) || festivals.length === 0) {
      return NextResponse.json({ error: 'Festival not found' }, { status: 404 });
    }

    const festival = festivals[0] as Festival;

    // Get quote with category
    const [quotes] = await pool.execute(`
      SELECT q.id, q.text, q.author, c.name as category_name
      FROM quotes q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.id = ?
    `, [quoteId]);

    if (!Array.isArray(quotes) || quotes.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = quotes[0] as Quote;

    // Get users
    let users: User[];
    if (sendToAll) {
      const [allUsers] = await pool.execute(
        'SELECT id, name, email FROM users WHERE role != "admin"'
      );
      users = allUsers as User[];
    } else {
      const placeholders = userIds.map(() => '?').join(',');
      const [selectedUsers] = await pool.execute(
        `SELECT id, name, email FROM users WHERE id IN (${placeholders})`,
        userIds
      );
      users = selectedUsers as User[];
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    // Create email campaign record
    const [campaignResult] = await pool.execute(`
      INSERT INTO email_campaigns (name, subject, festival_id, quote_id, sent_by, total_recipients, status)
      VALUES (?, ?, ?, ?, ?, ?, 'sending')
    `, [
      `${festival.name} Campaign - ${new Date().toISOString().split('T')[0]}`,
      subject,
      festivalId,
      quoteId,
      authResult.user.userId,
      users.length
    ]) as any;

    const campaignId = campaignResult.insertId;

    // Send emails
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      const html = festivalEmailTemplate(
        { name: user.name, email: user.email },
        festival.name,
        { text: quote.text, author: quote.author, category: quote.category_name },
        appUrl,
        customMessage
      );

      const text = festivalEmailText(
        { name: user.name, email: user.email },
        festival.name,
        { text: quote.text, author: quote.author, category: quote.category_name },
        appUrl,
        customMessage
      );

      const result = await sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      // Log email
      await pool.execute(`
        INSERT INTO email_logs (campaign_id, user_id, email, email_type, status, error_message, sent_at)
        VALUES (?, ?, ?, 'festival', ?, ?, ?)
      `, [
        campaignId,
        user.id,
        user.email,
        result.success ? 'sent' : 'failed',
        result.error || null,
        result.success ? new Date() : null
      ]);

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`${user.email}: ${result.error}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign status
    await pool.execute(`
      UPDATE email_campaigns 
      SET sent_count = ?, failed_count = ?, status = ?, completed_at = NOW()
      WHERE id = ?
    `, [sentCount, failedCount, failedCount === users.length ? 'failed' : 'completed', campaignId]);

    return NextResponse.json({
      message: `Email campaign completed`,
      campaignId,
      stats: {
        total: users.length,
        sent: sentCount,
        failed: failedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/send-email - Get email campaigns history
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const [campaigns] = await pool.execute(`
      SELECT 
        ec.*,
        f.name as festival_name,
        q.text as quote_text,
        q.author as quote_author,
        u.name as sent_by_name
      FROM email_campaigns ec
      LEFT JOIN festivals f ON ec.festival_id = f.id
      LEFT JOIN quotes q ON ec.quote_id = q.id
      LEFT JOIN users u ON ec.sent_by = u.id
      ORDER BY ec.created_at DESC
      LIMIT 50
    `);

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

