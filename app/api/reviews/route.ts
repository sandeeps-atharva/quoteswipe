import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
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
    
    const reviewsCollection = await getCollection('reviews');
    const usersCollection = await getCollection('users');
    
    if (type === 'featured' || !type) {
      // Get approved reviews for public display
      // Handle both boolean true and number 1 (from MySQL migration)
      const reviews = await reviewsCollection
        .find({ $or: [{ is_approved: true }, { is_approved: 1 }] })
        .sort({ is_featured: -1, rating: -1, created_at: -1 })
        .limit(10)
        .toArray() as any[];
      
      const formattedReviews = reviews.map((r: any) => ({
        id: r.id || r._id?.toString(),
        name: r.name,
        rating: r.rating,
        title: r.title,
        message: r.message,
        is_featured: r.is_featured,
        created_at: r.created_at
      }));
      
      return NextResponse.json({ reviews: formattedReviews }, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        }
      });
    }
    
    // For admin - get all reviews with $lookup optimization
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Single aggregation with $lookup - replaces 2 separate queries
    const formattedReviews = await reviewsCollection.aggregate([
      { $sort: { created_at: -1 } },
      
      // Lookup user details
      {
        $lookup: {
          from: 'users',
          let: { odId: '$user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$odId'] },
                    { $eq: [{ $toString: '$_id' }, { $toString: '$$odId' }] }
                  ]
                }
              }
            },
            { $project: { name: 1 } }
          ],
          as: 'userData'
        }
      },
      
      // Project final shape
      {
        $project: {
          id: { $ifNull: ['$id', { $toString: '$_id' }] },
          user_id: 1,
          name: 1,
          email: 1,
          rating: 1,
          title: 1,
          message: 1,
          is_approved: 1,
          is_featured: 1,
          created_at: 1,
          user_name: { $ifNull: [{ $arrayElemAt: ['$userData.name', 0] }, null] }
        }
      }
    ]).toArray() as any[];
    
    return NextResponse.json({ reviews: formattedReviews }, { status: 200 });
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
    
    const reviewsCollection = await getCollection('reviews');
    
    // Insert review
    await reviewsCollection.insertOne({
      user_id: userId || null,
      name: name.trim(),
      email: email.trim(),
      rating,
      title: title?.trim() || null,
      message: message.trim(),
      is_approved: false,
      is_featured: false,
      created_at: new Date()
    } as any);
    
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
    
    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    const { reviewId, is_approved, is_featured } = body;
    
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }
    
    const reviewsCollection = await getCollection('reviews');
    
    await reviewsCollection.updateOne(
      { $or: [{ id: reviewId }, { _id: toObjectId(reviewId) as any }] },
      { $set: { is_approved: is_approved ?? false, is_featured: is_featured ?? false } }
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
    
    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(userId) as any });
    
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('id');
    
    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }
    
    const reviewsCollection = await getCollection('reviews');
    await reviewsCollection.deleteOne({ 
      $or: [{ id: reviewId }, { _id: toObjectId(reviewId) as any }] 
    });
    
    return NextResponse.json({ message: 'Review deleted' }, { status: 200 });
  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
