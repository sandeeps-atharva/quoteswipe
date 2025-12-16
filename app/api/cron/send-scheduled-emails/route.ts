import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { festivalEmailTemplate, festivalEmailText } from '@/lib/email-templates';

// This endpoint should be called by a cron job every hour
// For Vercel: Add to vercel.json with cron schedule
// For external: Use cron-job.org or similar service

export async function GET(request: NextRequest) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;

    console.log(`[CRON] Checking scheduled emails for ${currentDate} at ${currentTimeStr}`);

    // Get pending scheduled emails for today that should be sent now
    // Compare both date and time (hour and minute)
    const [scheduledEmails] = await pool.query(`
      SELECT 
        se.*,
        q.text as quote_text,
        q.author as quote_author,
        c.name as category_name
      FROM scheduled_emails se
      LEFT JOIN quotes q ON se.quote_id = q.id
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE se.scheduled_date = ?
        AND se.status = 'pending'
        AND se.scheduled_time <= ?
    `, [currentDate, currentTimeStr]);

    if (!Array.isArray(scheduledEmails) || scheduledEmails.length === 0) {
      console.log('[CRON] No emails to send');
      return NextResponse.json({ message: 'No emails to send', processed: 0 });
    }

    console.log(`[CRON] Found ${scheduledEmails.length} scheduled emails to process`);

    const results = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';

    for (const scheduled of scheduledEmails as any[]) {
      console.log(`[CRON] Processing: ${scheduled.title}`);

      // Get recipients
      const [recipients] = await pool.query(`
        SELECT ser.*, u.name, u.email
        FROM scheduled_email_recipients ser
        JOIN users u ON ser.user_id = u.id
        WHERE ser.scheduled_email_id = ? AND ser.email_status = 'pending'
      `, [scheduled.id]);

      if (!Array.isArray(recipients) || recipients.length === 0) {
        console.log(`[CRON] No pending recipients for ${scheduled.title}`);
        continue;
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients as any[]) {
        try {
          // Build email content
          const html = festivalEmailTemplate(
            { name: recipient.name, email: recipient.email },
            scheduled.title.replace(/[^\w\s]/g, '').trim(), // Festival name from title
            { 
              text: scheduled.quote_text || 'Wishing you a wonderful day!', 
              author: scheduled.quote_author || 'QuoteSwipe',
              category: scheduled.category_name
            },
            appUrl,
            scheduled.custom_message
          );

          const text = festivalEmailText(
            { name: recipient.name, email: recipient.email },
            scheduled.title,
            { 
              text: scheduled.quote_text || 'Wishing you a wonderful day!', 
              author: scheduled.quote_author || 'QuoteSwipe'
            },
            appUrl,
            scheduled.custom_message
          );

          // Send email
          const result = await sendEmail({
            to: recipient.email,
            subject: scheduled.subject,
            html,
            text,
          });

          // Update recipient status
          await pool.query(`
            UPDATE scheduled_email_recipients 
            SET email_status = ?, sent_at = ?, error_message = ?
            WHERE id = ?
          `, [
            result.success ? 'sent' : 'failed',
            result.success ? new Date() : null,
            result.error || null,
            recipient.id
          ]);

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[CRON] Error sending to ${recipient.email}:`, error);
          failedCount++;
          
          await pool.query(`
            UPDATE scheduled_email_recipients 
            SET email_status = 'failed', error_message = ?
            WHERE id = ?
          `, [error instanceof Error ? error.message : 'Unknown error', recipient.id]);
        }
      }

      // Update scheduled email status
      const allFailed = sentCount === 0 && failedCount > 0;
      await pool.query(`
        UPDATE scheduled_emails 
        SET status = ?, sent_at = NOW()
        WHERE id = ?
      `, [allFailed ? 'failed' : 'sent', scheduled.id]);

      results.push({
        id: scheduled.id,
        title: scheduled.title,
        sent: sentCount,
        failed: failedCount,
      });

      console.log(`[CRON] Completed ${scheduled.title}: ${sentCount} sent, ${failedCount} failed`);
    }

    return NextResponse.json({
      message: 'Scheduled emails processed',
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[CRON] Error processing scheduled emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}

