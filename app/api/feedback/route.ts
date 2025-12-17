import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// Email template for new feedback notification
function getFeedbackNotificationHtml(feedback: {
  name: string;
  email: string;
  category: string;
  message: string;
}): string {
  const categoryEmoji: Record<string, string> = {
    'bug': '🐛',
    'feature': '💡',
    'improvement': '🔧',
    'question': '❓',
    'general': '📝',
  };
  
  const emoji = categoryEmoji[feedback.category] || '📝';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
    .feedback-card { background: white; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #3B82F6; }
    .category { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 10px; }
    .info { color: #666; font-size: 14px; margin-top: 15px; }
    .btn { display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} New Feedback Received!</h1>
    </div>
    <div class="content">
      <p>You have received new feedback from a user.</p>
      
      <div class="feedback-card">
        <span class="category">${emoji} ${feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1)}</span>
        <p style="margin-top: 10px;">"${feedback.message}"</p>
        <p class="info">— ${feedback.name} (${feedback.email})</p>
      </div>
      
      <p>You can view and manage all feedback in the admin panel.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com'}/admin" class="btn">Go to Admin Panel</a>
      
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        To reply to this feedback, you can email the user directly at: <a href="mailto:${feedback.email}">${feedback.email}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// GET - Get all feedback (admin only)
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
    
    const feedbackCollection = await getCollection('feedback');
    
    const filter = status && status !== 'all' ? { status } : {};
    const feedback = await feedbackCollection
      .find(filter)
      .sort({ created_at: -1 })
      .toArray() as any[];
    
    // Get user names
    const userIds = feedback.map((f: any) => f.user_id).filter(Boolean);
    const users = userIds.length > 0 
      ? await usersCollection.find({ _id: { $in: userIds.map(id => toObjectId(id) as any) } }).toArray() as any[]
      : [];
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u.name]));
    
    const formattedFeedback = feedback.map((f: any) => ({
      ...f,
      id: f.id || f._id?.toString(),
      user_name: f.user_id ? userMap.get(f.user_id.toString()) : null
    }));
    
    // Get counts by status
    const total = await feedbackCollection.countDocuments();
    const newCount = await feedbackCollection.countDocuments({ status: 'new' });
    const readCount = await feedbackCollection.countDocuments({ status: 'read' });
    const repliedCount = await feedbackCollection.countDocuments({ status: 'replied' });
    const resolvedCount = await feedbackCollection.countDocuments({ status: 'resolved' });
    
    return NextResponse.json({ 
      feedback: formattedFeedback,
      counts: {
        total,
        new_count: newCount,
        read_count: readCount,
        replied_count: repliedCount,
        resolved_count: resolvedCount
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Get feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, category, message } = body;
    
    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }
    
    // Get user ID if authenticated
    const userId = getUserIdFromRequest(request);
    
    const feedbackCollection = await getCollection('feedback');
    
    // Insert feedback
    await feedbackCollection.insertOne({
      user_id: userId || null,
      name: name.trim(),
      email: email.trim(),
      category: category || 'general',
      message: message.trim(),
      status: 'new',
      created_at: new Date()
    } as any);
    
    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'hello.quoteswipe@gmail.com';
    
    sendEmail({
      to: adminEmail,
      subject: `📝 New Feedback: ${category || 'General'} from ${name}`,
      html: getFeedbackNotificationHtml({ name, email, category: category || 'general', message }),
      text: `New Feedback Received\n\nCategory: ${category || 'General'}\nMessage: ${message}\nFrom: ${name} (${email})\n\nView in admin panel.`,
    }).catch(err => console.error('Failed to send feedback notification:', err));
    
    return NextResponse.json(
      { message: 'Thank you for your feedback! We\'ll review it soon.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update feedback status (admin only)
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
    const { feedbackId, status, admin_notes } = body;
    
    if (!feedbackId) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }
    
    const validStatuses = ['new', 'read', 'replied', 'resolved'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    const updates: any = {};
    
    if (status) {
      updates.status = status;
    }
    
    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes;
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    const feedbackCollection = await getCollection('feedback');
    await feedbackCollection.updateOne(
      { $or: [{ id: feedbackId }, { _id: toObjectId(feedbackId) as any }] },
      { $set: updates }
    );
    
    return NextResponse.json({ message: 'Feedback updated' }, { status: 200 });
  } catch (error) {
    console.error('Update feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete feedback (admin only)
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
    const feedbackId = searchParams.get('id');
    
    if (!feedbackId) {
      return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
    }
    
    const feedbackCollection = await getCollection('feedback');
    await feedbackCollection.deleteOne({ 
      $or: [{ id: feedbackId }, { _id: toObjectId(feedbackId) as any }] 
    });
    
    return NextResponse.json({ message: 'Feedback deleted' }, { status: 200 });
  } catch (error) {
    console.error('Delete feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
