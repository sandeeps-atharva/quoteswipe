import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
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

    const scheduledEmailsCollection = await getCollection('scheduled_emails');
    const quotesCollection = await getCollection('quotes');
    const recipientsCollection = await getCollection('scheduled_email_recipients');

    // Build filter
    let filter: any = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      filter.scheduled_date = { $gte: startDate, $lte: endDate };
    }

    const emails = await scheduledEmailsCollection
      .find(filter)
      .sort({ scheduled_date: 1, scheduled_time: 1 })
      .toArray() as any[];

    // Get quote info and recipient counts
    const formattedEmails = await Promise.all(emails.map(async (email: any) => {
      let quote: any = null;
      if (email.quote_id) {
        quote = await quotesCollection.findOne({ 
          $or: [{ id: email.quote_id }, { _id: toObjectId(email.quote_id) as any }] 
        });
      }

      // Get recipient count - either from stored user_count or by counting recipients
      let userCount = email.user_count;
      if (!userCount && !email.send_to_all) {
        userCount = await recipientsCollection.countDocuments({ 
          scheduled_email_id: email._id.toString() 
        });
      }

      return {
        ...email,
        id: email.id || email._id?.toString(),
        scheduled_date: email.scheduled_date instanceof Date 
          ? email.scheduled_date.toISOString().split('T')[0] 
          : email.scheduled_date,
        user_count: email.send_to_all ? 'All users' : userCount,
        quote_text: quote?.text || null,
        quote_author: quote?.author || null
      };
    }));

    return NextResponse.json({ scheduledEmails: formattedEmails });
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
      user_ids,
      send_to_all = false
    } = await request.json();

    if (!title || !subject || !scheduled_date) {
      return NextResponse.json(
        { error: 'Title, subject, and scheduled date are required' },
        { status: 400 }
      );
    }

    // If not sending to all, require user_ids
    if (!send_to_all && (!user_ids || user_ids.length === 0)) {
      return NextResponse.json(
        { error: 'Please select at least one user or choose "Send to All"' },
        { status: 400 }
      );
    }

    const scheduledEmailsCollection = await getCollection('scheduled_emails');
    const recipientsCollection = await getCollection('scheduled_email_recipients');
    const usersCollection = await getCollection('users');

    // Get user count for display
    let userCount = 0;
    if (send_to_all) {
      userCount = await usersCollection.countDocuments({ role: { $ne: 'admin' } });
    } else {
      userCount = user_ids.length;
    }

    // Create scheduled email
    const result = await scheduledEmailsCollection.insertOne({
      title,
      subject,
      scheduled_date: new Date(scheduled_date),
      scheduled_time: scheduled_time || '09:00:00',
      quote_id: quote_id || null,
      custom_message: custom_message || null,
      created_by: authResult.user.userId,
      send_to_all,
      user_count: userCount,
      status: 'pending',
      created_at: new Date()
    } as any);

    const scheduledEmailId = result.insertedId.toString();

    // Add recipients only if not sending to all
    if (!send_to_all && user_ids && user_ids.length > 0) {
      const recipientDocs = user_ids.map((userId: string) => ({
        scheduled_email_id: scheduledEmailId,
        user_id: userId,
        created_at: new Date()
      }));
      
      await recipientsCollection.insertMany(recipientDocs);
    }

    return NextResponse.json({
      message: 'Email scheduled successfully',
      scheduledEmailId,
      recipientCount: userCount,
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

    const scheduledEmailsCollection = await getCollection('scheduled_emails');
    const recipientsCollection = await getCollection('scheduled_email_recipients');

    // Only delete if status is pending
    const result = await scheduledEmailsCollection.deleteOne({
      $and: [
        { $or: [{ id: id }, { _id: toObjectId(id) as any }] },
        { status: 'pending' }
      ]
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Scheduled email not found or already processed' },
        { status: 404 }
      );
    }

    // Delete recipients
    await recipientsCollection.deleteMany({ scheduled_email_id: id });

    return NextResponse.json({ message: 'Scheduled email deleted' });
  } catch (error) {
    console.error('Delete scheduled email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
