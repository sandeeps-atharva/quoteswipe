import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// Email template for new contact submission
function getContactNotificationHtml(contact: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const subjectEmoji: Record<string, string> = {
    'general': '📩',
    'support': '🔧',
    'feedback': '💬',
    'bug': '🐛',
    'partnership': '🤝',
    'other': '📝',
  };
  
  const emoji = subjectEmoji[contact.subject] || '📩';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
    .message-card { background: white; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #10b981; }
    .subject-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 10px; }
    .info { color: #666; font-size: 14px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
    .reply-btn { display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-left: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} New Contact Message!</h1>
    </div>
    <div class="content">
      <p>Someone has reached out through the contact form.</p>
      
      <div class="message-card">
        <span class="subject-badge">${emoji} ${contact.subject.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        <p style="margin-top: 10px; white-space: pre-wrap;">${contact.message}</p>
        <div class="info">
          <strong>From:</strong> ${contact.name}<br>
          <strong>Email:</strong> <a href="mailto:${contact.email}">${contact.email}</a>
        </div>
      </div>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com'}/admin" class="btn">View in Admin</a>
      <a href="mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}" class="reply-btn">Reply to ${contact.name}</a>
    </div>
  </div>
</body>
</html>
`;
}

// Auto-reply template for the user
function getAutoReplyHtml(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 25px; text-decoration: none; margin-top: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #666; }
    .links { margin-top: 15px; }
    .links a { color: #667eea; margin: 0 10px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thank You for Reaching Out! 💌</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      
      <p>Thank you for contacting QuoteSwipe! We've received your message and will get back to you as soon as possible.</p>
      
      <p>Our team typically responds within <strong>24-48 hours</strong>. If your inquiry is urgent, please mention it in your follow-up.</p>
      
      <p>In the meantime, why not explore some inspiring quotes?</p>
      
      <center>
        <a href="${appUrl}" class="btn">Explore Quotes →</a>
      </center>
      
      <div class="footer">
        <p>This is an automated response. Please do not reply to this email.</p>
        <div class="links">
          <a href="${appUrl}/about">About</a> |
          <a href="${appUrl}/privacy">Privacy</a> |
          <a href="${appUrl}/feedback">Feedback</a>
        </div>
        <p style="margin-top: 15px;">© ${new Date().getFullYear()} QuoteSwipe. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

// GET - Get all contact submissions (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const contactCollection = await getCollection('contact_submissions');
    
    const filter = status && status !== 'all' ? { status } : {};
    const submissions = await contactCollection
      .find(filter)
      .sort({ created_at: -1 })
      .toArray() as any[];
    
    // Get counts by status
    const total = await contactCollection.countDocuments();
    const newCount = await contactCollection.countDocuments({ status: 'new' });
    const readCount = await contactCollection.countDocuments({ status: 'read' });
    const repliedCount = await contactCollection.countDocuments({ status: 'replied' });
    const closedCount = await contactCollection.countDocuments({ status: 'closed' });
    
    return NextResponse.json({ 
      submissions: submissions.map((s: any) => ({ ...s, id: s.id || s._id?.toString() })),
      counts: {
        total,
        new_count: newCount,
        read_count: readCount,
        replied_count: repliedCount,
        closed_count: closedCount
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Get contact submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit contact form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;
    
    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    const contactCollection = await getCollection('contact_submissions');
    
    // Insert contact submission
    await contactCollection.insertOne({
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
      status: 'new',
      created_at: new Date()
    } as any);
    
    const adminEmail = process.env.ADMIN_EMAIL || 'hello.quoteswipe@gmail.com';
    
    // Send notification to admin
    sendEmail({
      to: adminEmail,
      subject: `📩 New Contact: ${subject} from ${name}`,
      html: getContactNotificationHtml({ name, email, subject, message }),
      text: `New Contact Form Submission\n\nFrom: ${name} (${email})\nSubject: ${subject}\n\nMessage:\n${message}`,
    }).catch(err => console.error('Failed to send contact notification:', err));
    
    // Send auto-reply to user
    sendEmail({
      to: email,
      subject: '✨ Thanks for contacting QuoteSwipe!',
      html: getAutoReplyHtml(name),
      text: `Hi ${name},\n\nThank you for contacting QuoteSwipe! We've received your message and will get back to you within 24-48 hours.\n\nBest regards,\nThe QuoteSwipe Team`,
    }).catch(err => console.error('Failed to send auto-reply:', err));
    
    return NextResponse.json(
      { message: 'Thank you for your message! We\'ll get back to you soon.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit contact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update contact submission status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { submissionId, status, admin_notes } = body;
    
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }
    
    const validStatuses = ['new', 'read', 'replied', 'closed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    const updates: any = {};
    
    if (status) {
      updates.status = status;
      if (status === 'replied') {
        updates.replied_at = new Date();
      }
    }
    
    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    const contactCollection = await getCollection('contact_submissions');
    await contactCollection.updateOne(
      { $or: [{ id: submissionId }, { _id: toObjectId(submissionId) as any }] },
      { $set: updates }
    );
    
    return NextResponse.json({ message: 'Contact submission updated' }, { status: 200 });
  } catch (error) {
    console.error('Update contact submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete contact submission (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');
    
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }
    
    const contactCollection = await getCollection('contact_submissions');
    await contactCollection.deleteOne({ 
      $or: [{ id: submissionId }, { _id: toObjectId(submissionId) as any }] 
    });
    
    return NextResponse.json({ message: 'Contact submission deleted' }, { status: 200 });
  } catch (error) {
    console.error('Delete contact submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
