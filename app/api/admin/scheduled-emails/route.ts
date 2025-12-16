import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/scheduled-emails - Get all scheduled emails
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let query = `
      SELECT 
        se.*,
        (SELECT COUNT(*) FROM scheduled_email_recipients WHERE scheduled_email_id = se.id) as recipient_count,
        q.text as quote_text,
        q.author as quote_author
      FROM scheduled_emails se
      LEFT JOIN quotes q ON se.quote_id = q.id
    `;

    const params: (string | number)[] = [];

    if (month && year) {
      query += ' WHERE MONTH(se.scheduled_date) = ? AND YEAR(se.scheduled_date) = ?';
      params.push(parseInt(month), parseInt(year));
    }

    query += ' ORDER BY se.scheduled_date ASC, se.scheduled_time ASC';

    const [emails] = await pool.query(query, params);

    return NextResponse.json({ scheduledEmails: emails });
  } catch (error) {
    console.error('Get scheduled emails error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/scheduled-emails - Create a scheduled email
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { 
      title, 
      subject, 
      scheduled_date, 
      scheduled_time, 
      quote_id, 
      custom_message, 
      user_ids 
    } = await request.json();

    if (!title || !subject || !scheduled_date || !user_ids || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'Title, subject, scheduled date, and recipients are required' },
        { status: 400 }
      );
    }

    // Create scheduled email
    const [result] = await pool.query(`
      INSERT INTO scheduled_emails (title, subject, scheduled_date, scheduled_time, quote_id, custom_message, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      subject,
      scheduled_date,
      scheduled_time || '09:00:00',
      quote_id || null,
      custom_message || null,
      authResult.user.userId
    ]) as any;

    const scheduledEmailId = result.insertId;

    // Add recipients
    const recipientValues = user_ids.map((userId: number) => [scheduledEmailId, userId]);
    await pool.query(
      'INSERT INTO scheduled_email_recipients (scheduled_email_id, user_id) VALUES ?',
      [recipientValues]
    );

    return NextResponse.json({
      message: 'Email scheduled successfully',
      scheduledEmailId,
      recipientCount: user_ids.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Create scheduled email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scheduled-emails?id=X - Delete a scheduled email
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Only delete if status is pending
    const [result] = await pool.query(
      'DELETE FROM scheduled_emails WHERE id = ? AND status = "pending"',
      [id]
    ) as any;

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Scheduled email not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Scheduled email deleted' });
  } catch (error) {
    console.error('Delete scheduled email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

