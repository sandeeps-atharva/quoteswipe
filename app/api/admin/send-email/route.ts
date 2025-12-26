import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { festivalEmailTemplate, festivalEmailText, customEmailTemplate, customEmailText } from '@/lib/email-templates';

interface User {
  _id: any;
  name: string;
  email: string;
}

// POST /api/admin/send-email - Send bulk emails (festival or custom)
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
      sendToAll = false,
      emailType = 'festival'
    } = await request.json();

    // Validate inputs
    if (!subject) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    // For festival emails, require festival and quote
    if (emailType === 'festival' && (!festivalId || !quoteId)) {
      return NextResponse.json(
        { error: 'Festival and quote are required for festival emails' },
        { status: 400 }
      );
    }

    // For custom emails, require message
    if (emailType === 'custom' && !customMessage) {
      return NextResponse.json(
        { error: 'Message is required for custom emails' },
        { status: 400 }
      );
    }

    if (!sendToAll && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
      return NextResponse.json(
        { error: 'Please select at least one user or choose "Send to All"' },
        { status: 400 }
      );
    }

    const usersCollection = await getCollection('users');
    const campaignsCollection = await getCollection('email_campaigns');
    const logsCollection = await getCollection('email_logs');

    let festival: any = null;
    let quote: any = null;
    let categoryName = '';

    // Get festival and quote only for festival emails
    if (emailType === 'festival') {
      const festivalsCollection = await getCollection('festivals');
      const quotesCollection = await getCollection('quotes');
      const categoriesCollection = await getCollection('categories');

      festival = await festivalsCollection.findOne({
        $or: [{ id: festivalId }, { _id: toObjectId(festivalId) as any }]
      });

      if (!festival) {
        return NextResponse.json({ error: 'Festival not found' }, { status: 404 });
      }

      quote = await quotesCollection.findOne({
        $or: [{ id: quoteId }, { _id: toObjectId(quoteId) as any }]
      });

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

      // Get category name
      if (quote.category_id) {
        const category: any = await categoriesCollection.findOne({
          $or: [{ id: quote.category_id }, { _id: quote.category_id }]
        });
        categoryName = category?.name || '';
      }
    }

    // Get users
    let users: User[];
    if (sendToAll) {
      users = await usersCollection.find({ role: { $ne: 'admin' } }).toArray() as any[];
    } else {
      users = await usersCollection.find({
        _id: { $in: userIds.map((id: string) => toObjectId(id) as any) }
      }).toArray() as any[];
    }

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    // Create email campaign record
    const campaignName = emailType === 'festival' 
      ? `${festival?.name} Campaign - ${new Date().toISOString().split('T')[0]}`
      : `Custom Email - ${new Date().toISOString().split('T')[0]}`;

    const campaignResult = await campaignsCollection.insertOne({
      name: campaignName,
      subject,
      email_type: emailType,
      festival_id: festivalId || null,
      quote_id: quoteId || null,
      custom_message: customMessage || null,
      sent_by: authResult.user.userId,
      total_recipients: users.length,
      status: 'sending',
      created_at: new Date()
    } as any);

    const campaignId = campaignResult.insertedId.toString();

    // Send emails
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      let html: string;
      let text: string;

      if (emailType === 'festival' && festival && quote) {
        html = festivalEmailTemplate(
          { name: user.name, email: user.email },
          festival.name,
          { text: quote.text, author: quote.author, category: categoryName },
          appUrl,
          customMessage
        );

        text = festivalEmailText(
          { name: user.name, email: user.email },
          festival.name,
          { text: quote.text, author: quote.author, category: categoryName },
          appUrl,
          customMessage
        );
      } else {
        // Custom email
        html = customEmailTemplate(
          { name: user.name, email: user.email },
          subject,
          customMessage,
          appUrl
        );

        text = customEmailText(
          { name: user.name, email: user.email },
          subject,
          customMessage,
          appUrl
        );
      }

      const result = await sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      // Log email
      await logsCollection.insertOne({
        campaign_id: campaignId,
        user_id: user._id.toString(),
        email: user.email,
        email_type: emailType,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
        sent_at: result.success ? new Date() : null,
        created_at: new Date()
      } as any);

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`${user.email}: ${result.error}`);
      }

      // Rate limiting - wait 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign status
    await campaignsCollection.updateOne(
      { _id: campaignResult.insertedId },
      {
        $set: {
          sent_count: sentCount,
          failed_count: failedCount,
          status: failedCount === users.length ? 'failed' : 'completed',
          completed_at: new Date()
        }
      }
    );

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
    const campaignsCollection = await getCollection('email_campaigns');
    const festivalsCollection = await getCollection('festivals');
    const quotesCollection = await getCollection('quotes');
    const usersCollection = await getCollection('users');

    const campaigns = await campaignsCollection
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray() as any[];

    // Get related data
    const formattedCampaigns = await Promise.all(campaigns.map(async (campaign) => {
      let festival: any = null;
      if (campaign.festival_id) {
        festival = await festivalsCollection.findOne({
          $or: [{ id: campaign.festival_id }, { _id: toObjectId(campaign.festival_id) as any }]
        });
      }

      let quote: any = null;
      if (campaign.quote_id) {
        quote = await quotesCollection.findOne({
          $or: [{ id: campaign.quote_id }, { _id: toObjectId(campaign.quote_id) as any }]
        });
      }

      let sentByUser: any = null;
      if (campaign.sent_by) {
        sentByUser = await usersCollection.findOne({ _id: toObjectId(campaign.sent_by) as any });
      }

      return {
        ...campaign,
        id: campaign.id || campaign._id?.toString(),
        festival_name: festival?.name || null,
        quote_text: quote?.text || null,
        quote_author: quote?.author || null,
        sent_by_name: sentByUser?.name || null
      };
    }));

    return NextResponse.json({ campaigns: formattedCampaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
