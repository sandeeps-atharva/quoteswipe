import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { festivalEmailTemplate, festivalEmailText, customEmailTemplate, customEmailText } from '@/lib/email-templates';

// This endpoint is called by Vercel cron every 15 minutes
// See vercel.json for cron configuration

export async function GET(request: NextRequest) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Allow without secret for Vercel cron (it uses different auth)
  // But block if secret is set and doesn't match
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
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
    const logsCollection = await getCollection('email_logs');

    // Get pending scheduled emails for today that should be sent now
    // Handle both Date objects and string dates
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find emails scheduled for today (or past days that weren't sent)
    const scheduledEmails = await scheduledEmailsCollection.find({
      status: 'pending',
      $or: [
        // Date object comparison
        { scheduled_date: { $lte: endOfDay } },
        // String date comparison (for backwards compatibility)
        { scheduled_date: { $lte: currentDate } }
      ]
    }).toArray() as any[];

    // Filter by time - only send if scheduled time has passed
    const emailsToSend = scheduledEmails.filter((email: any) => {
      const scheduledDate = email.scheduled_date instanceof Date 
        ? email.scheduled_date.toISOString().split('T')[0]
        : email.scheduled_date?.split('T')[0] || email.scheduled_date;
      
      const scheduledTime = email.scheduled_time || '00:00:00';
      
      // If it's a past date, send it
      if (scheduledDate < currentDate) return true;
      
      // If it's today, check if the time has passed
      if (scheduledDate === currentDate) {
        return scheduledTime <= currentTimeStr;
      }
      
      return false;
    });

    if (emailsToSend.length === 0) {
      console.log('[CRON] No emails to send');
      return NextResponse.json({ message: 'No emails to send', processed: 0 });
    }

    console.log(`[CRON] Found ${emailsToSend.length} scheduled emails to process`);

    const results = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';

    for (const scheduled of emailsToSend) {
      const scheduledEmailId = scheduled.id || scheduled._id?.toString();
      console.log(`[CRON] Processing: ${scheduled.title} (ID: ${scheduledEmailId})`);

      // Get quote details if exists
      let quoteText = '';
      let quoteAuthor = '';
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
            });
            categoryName = category?.name || '';
          }
        }
      }

      // Get users to send to
      let usersToEmail: Array<{ _id: any; name: string; email: string }> = [];

      if (scheduled.send_to_all) {
        // Send to all non-admin users
        usersToEmail = await usersCollection.find({ 
          role: { $ne: 'admin' } 
        }).toArray() as any[];
        console.log(`[CRON] Sending to all ${usersToEmail.length} users`);
      } else {
        // Get specific recipients from the recipients collection
        const recipients = await recipientsCollection.find({
          scheduled_email_id: scheduledEmailId
        }).toArray() as any[];

        if (recipients.length === 0) {
          console.log(`[CRON] No recipients found for ${scheduled.title}, marking as failed`);
          await scheduledEmailsCollection.updateOne(
            { _id: scheduled._id },
            { $set: { status: 'failed', error: 'No recipients found' } }
          );
          continue;
        }

        // Get user details for recipients
        const userIds = recipients.map((r: any) => toObjectId(r.user_id) as any);
        usersToEmail = await usersCollection.find({
          _id: { $in: userIds }
        }).toArray() as any[];
        console.log(`[CRON] Sending to ${usersToEmail.length} specific users`);
      }

      if (usersToEmail.length === 0) {
        console.log(`[CRON] No users to email for ${scheduled.title}`);
        await scheduledEmailsCollection.updateOne(
          { _id: scheduled._id },
          { $set: { status: 'failed', error: 'No users found' } }
        );
        continue;
      }

      let sentCount = 0;
      let failedCount = 0;

      // Process emails in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < usersToEmail.length; i += batchSize) {
        const batch = usersToEmail.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            let html: string;
            let text: string;

            // Determine email type based on whether quote exists
            if (quoteText && quoteAuthor) {
              // Festival-style email with quote
              html = festivalEmailTemplate(
                { name: user.name, email: user.email },
                scheduled.title,
                { text: quoteText, author: quoteAuthor, category: categoryName },
                appUrl,
                scheduled.custom_message
              );
              text = festivalEmailText(
                { name: user.name, email: user.email },
                scheduled.title,
                { text: quoteText, author: quoteAuthor },
                appUrl,
                scheduled.custom_message
              );
            } else {
              // Custom email without quote
              html = customEmailTemplate(
                { name: user.name, email: user.email },
                scheduled.subject,
                scheduled.custom_message || 'Check out QuoteSwipe for daily inspiration!',
                appUrl
              );
              text = customEmailText(
                { name: user.name, email: user.email },
                scheduled.subject,
                scheduled.custom_message || 'Check out QuoteSwipe for daily inspiration!',
                appUrl
              );
            }

            // Send email
            const result = await sendEmail({
              to: user.email,
              subject: scheduled.subject,
              html,
              text,
            });

            // Log the email
            await logsCollection.insertOne({
              scheduled_email_id: scheduledEmailId,
              user_id: user._id.toString(),
              email: user.email,
              email_type: 'scheduled',
              status: result.success ? 'sent' : 'failed',
              error_message: result.error || null,
              sent_at: result.success ? new Date() : null,
              created_at: new Date()
            } as any);

            if (result.success) {
              sentCount++;
            } else {
              failedCount++;
              console.error(`[CRON] Failed to send to ${user.email}: ${result.error}`);
            }
          } catch (error) {
            console.error(`[CRON] Error sending to ${user.email}:`, error);
            failedCount++;
            
            await logsCollection.insertOne({
              scheduled_email_id: scheduledEmailId,
              user_id: user._id.toString(),
              email: user.email,
              email_type: 'scheduled',
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              created_at: new Date()
            } as any);
          }
        }));

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < usersToEmail.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update scheduled email status
      const allFailed = sentCount === 0 && failedCount > 0;
      await scheduledEmailsCollection.updateOne(
        { _id: scheduled._id },
        {
          $set: {
            status: allFailed ? 'failed' : 'sent',
            sent_count: sentCount,
            failed_count: failedCount,
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
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual trigger from admin panel
export async function POST(request: NextRequest) {
  return GET(request);
}
