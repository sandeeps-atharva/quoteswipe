import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
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

    const scheduledEmailsCollection = await getCollection('scheduled_emails');
    const recipientsCollection = await getCollection('scheduled_email_recipients');
    const quotesCollection = await getCollection('quotes');
    const categoriesCollection = await getCollection('categories');
    const usersCollection = await getCollection('users');

    // Get pending scheduled emails for today that should be sent now
    const startOfDay = new Date(currentDate);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const scheduledEmails = await scheduledEmailsCollection.find({
      scheduled_date: { $gte: startOfDay, $lte: endOfDay },
      status: 'pending',
      scheduled_time: { $lte: currentTimeStr }
    }).toArray() as any[];

    if (scheduledEmails.length === 0) {
      console.log('[CRON] No emails to send');
      return NextResponse.json({ message: 'No emails to send', processed: 0 });
    }

    console.log(`[CRON] Found ${scheduledEmails.length} scheduled emails to process`);

    const results = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';

    for (const scheduled of scheduledEmails) {
      console.log(`[CRON] Processing: ${scheduled.title}`);

      // Get quote details if exists
      let quoteText = 'Wishing you a wonderful day!';
      let quoteAuthor = 'QuoteSwipe';
      let categoryName = '';

      if (scheduled.quote_id) {
        const quote: any = await quotesCollection.findOne({
          $or: [{ id: scheduled.quote_id }, { _id: toObjectId(scheduled.quote_id) as any }]
        });
        if (quote) {
          quoteText = quote.text;
          quoteAuthor = quote.author;
          if (quote.category_id) {
            const category: any = await categoriesCollection.findOne({
              $or: [{ id: quote.category_id }, { _id: quote.category_id }]
            }) as any;
            categoryName = category?.name || '';
          }
        }
      }

      // Get recipients
      const scheduledEmailId = scheduled.id || scheduled._id?.toString();
      const recipients = await recipientsCollection.find({
        scheduled_email_id: scheduledEmailId,
        email_status: 'pending'
      }).toArray() as any[];

      if (recipients.length === 0) {
        console.log(`[CRON] No pending recipients for ${scheduled.title}`);
        continue;
      }

      // Get user details for recipients
      const userIds = recipients.map((r: any) => r.user_id);
      const users = await usersCollection.find({
        _id: { $in: userIds.map(id => toObjectId(id) as any) }
      }).toArray() as any[];
      const userMap = new Map(users.map((u: any) => [u._id.toString(), { name: u.name, email: u.email }]));

      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        const user = userMap.get(recipient.user_id);
        if (!user) continue;

        try {
          // Build email content
          const html = festivalEmailTemplate(
            { name: user.name, email: user.email },
            scheduled.title.replace(/[^\w\s]/g, '').trim(), // Festival name from title
            { 
              text: quoteText, 
              author: quoteAuthor,
              category: categoryName
            },
            appUrl,
            scheduled.custom_message
          );

          const text = festivalEmailText(
            { name: user.name, email: user.email },
            scheduled.title,
            { 
              text: quoteText, 
              author: quoteAuthor
            },
            appUrl,
            scheduled.custom_message
          );

          // Send email
          const result = await sendEmail({
            to: user.email,
            subject: scheduled.subject,
            html,
            text,
          });

          // Update recipient status
          await recipientsCollection.updateOne(
            { _id: recipient._id },
            {
              $set: {
                email_status: result.success ? 'sent' : 'failed',
                sent_at: result.success ? new Date() : null,
                error_message: result.error || null
              }
            }
          );

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[CRON] Error sending to ${user.email}:`, error);
          failedCount++;
          
          await recipientsCollection.updateOne(
            { _id: recipient._id },
            {
              $set: {
                email_status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          );
        }
      }

      // Update scheduled email status
      const allFailed = sentCount === 0 && failedCount > 0;
      await scheduledEmailsCollection.updateOne(
        { _id: scheduled._id },
        {
          $set: {
            status: allFailed ? 'failed' : 'sent',
            sent_at: new Date()
          }
        }
      );

      results.push({
        id: scheduledEmailId,
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
