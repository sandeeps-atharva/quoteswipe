import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { 
  PlanId, 
  SubscriptionStatus, 
  getEffectivePlan, 
  getPlanFeatures,
  PLANS 
} from '@/lib/subscription';

export const dynamic = 'force-dynamic';

interface UserDoc {
  _id: any;
  name: string;
  email: string;
  subscription_plan?: PlanId;
  subscription_status?: SubscriptionStatus;
  subscription_expires_at?: Date | null;
  subscription_started_at?: Date;
}

interface SubscriptionDoc {
  _id: any;
  user_id: any;
  plan_id: PlanId;
  status: SubscriptionStatus;
  started_at: Date;
  expires_at: Date | null;
  razorpay_payment_id?: string;
}

// GET /api/user/subscription - Get user's subscription status
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      // Return free plan for unauthenticated users
      return NextResponse.json({
        success: true,
        subscription: {
          plan: 'free',
          status: 'none',
          isActive: false,
          features: getPlanFeatures('free'),
          planDetails: PLANS.free,
        },
      });
    }

    // Get user
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ 
      _id: toObjectId(userId) as any 
    }) as unknown as UserDoc | null;

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get effective plan
    const effectivePlan = getEffectivePlan(
      user.subscription_plan,
      user.subscription_status,
      user.subscription_expires_at
    );

    // Get latest subscription record
    const subscriptionsCollection = await getCollection('subscriptions');
    const latestSubscription = await subscriptionsCollection
      .find({ user_id: toObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(1)
      .toArray() as unknown as SubscriptionDoc[];

    const subscription = latestSubscription[0] || null;

    // Check if subscription is active
    const isActive = effectivePlan !== 'free';
    const isExpiringSoon = subscription?.expires_at 
      ? new Date(subscription.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
      : false;

    return NextResponse.json({
      success: true,
      subscription: {
        plan: effectivePlan,
        status: user.subscription_status || 'none',
        isActive,
        isExpiringSoon,
        startedAt: user.subscription_started_at || null,
        expiresAt: user.subscription_expires_at || null,
        features: getPlanFeatures(effectivePlan),
        planDetails: PLANS[effectivePlan],
        history: subscription ? {
          lastPaymentId: subscription.razorpay_payment_id,
          lastPlanId: subscription.plan_id,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/user/subscription/cancel - Cancel subscription
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action !== 'cancel') {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
    }

    // Update user subscription status
    const usersCollection = await getCollection('users');
    const result = await usersCollection.updateOne(
      { _id: toObjectId(userId) as any },
      {
        $set: {
          subscription_status: 'cancelled',
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Update subscription record
    const subscriptionsCollection = await getCollection('subscriptions');
    await subscriptionsCollection.updateOne(
      { user_id: toObjectId(userId), status: 'active' },
      {
        $set: {
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled. You will have access until the end of your billing period.',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

