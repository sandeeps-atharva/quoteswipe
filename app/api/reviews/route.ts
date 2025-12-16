import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// Email template for new review notification
function getReviewNotificationHtml(review: {
  name: string;
  email: string;
  rating: number;
  title: string;
  message: string;
}): string {
  const stars = '⭐'.repeat(review.rating);
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
    .review-card { background: white; padding: 20px; border-radius: 10px; margin: 15px 0; border-left: 4px solid #667eea; }
    .stars { font-size: 24px; margin: 10px 0; }
    .info { color: #666; font-size: 14px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌟 New Review Submitted!</h1>
    </div>
    <div class="content">
      <p>A new review has been submitted and is pending approval.</p>
      
      <div class="review-card">
        <div class="stars">${stars}</div>
        <h3>${review.title || 'No Title'}</h3>
        <p>"${review.message}"</p>
        <p class="info">— ${review.name} (${review.email})</p>
      </div>
      
      <p>Please review and approve/reject this review in the admin panel.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://quoteswipe.com'}/admin" class="btn">Go to Admin Panel</a>
    </div>
  </div>
</body>
</html>
`;
}

// GET - Fetch approved reviews (public) or all reviews (admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'featured' || !type) {
      // Get approved reviews for public display
      const [reviews] = await pool.execute(
        `SELECT id, name, rating, title, message, is_featured, created_at 
         FROM reviews 
         WHERE is_approved = TRUE 
         ORDER BY is_featured DESC, rating DESC, created_at DESC 
         LIMIT 10`
      ) as any[];
      
      return NextResponse.json({ reviews }, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        }
      });
    }
    
    // For admin - get all reviews
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [users] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    ) as any[];
    
    if (users[0]?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const [reviews] = await pool.execute(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       ORDER BY r.created_at DESC`
    ) as any[];
    
    return NextResponse.json({ reviews }, { status: 200 });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit a new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, rating, title, message } = body;
    
    // Validation
    if (!name || !email || !rating || !message) {
      return NextResponse.json(
        { error: 'Name, email, rating, and message are required' },
        { status: 400 }
      );
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Get user ID if authenticated
    const userId = getUserIdFromRequest(request);
    
    // Insert review
    await pool.execute(
      `INSERT INTO reviews (user_id, name, email, rating, title, message) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, name.trim(), email.trim(), rating, title?.trim() || null, message.trim()]
    );
    
    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'hello.quoteswipe@gmail.com';
    
    sendEmail({
      to: adminEmail,
      subject: `🌟 New Review (${rating} stars) from ${name}`,
      html: getReviewNotificationHtml({ name, email, rating, title: title || '', message }),
      text: `New Review Submitted\n\nRating: ${'⭐'.repeat(rating)}\nTitle: ${title || 'N/A'}\nMessage: ${message}\nFrom: ${name} (${email})\n\nPlease review in the admin panel.`,
    }).catch(err => console.error('Failed to send review notification:', err));
    
    return NextResponse.json(
      { message: 'Thank you for your review! It will be published after approval.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update review (admin only - approve/feature)
export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [users] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    ) as any[];
    
    if (users[0]?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { reviewId, is_approved, is_featured } = body;
    
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }
    
    await pool.execute(
      `UPDATE reviews SET is_approved = ?, is_featured = ? WHERE id = ?`,
      [is_approved ?? false, is_featured ?? false, reviewId]
    );
    
    return NextResponse.json({ message: 'Review updated' }, { status: 200 });
  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete review (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [users] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    ) as any[];
    
    if (users[0]?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('id');
    
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }
    
    await pool.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
    
    return NextResponse.json({ message: 'Review deleted' }, { status: 200 });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

