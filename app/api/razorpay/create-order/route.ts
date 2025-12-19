import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { createOrder } from '@/lib/razorpay';
import { PLANS, PlanId, canUpgrade } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

interface UserDoc {
  _id: any;
  name: string;
  email: string;
  subscription_plan?: PlanId;
  subscription_status?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Please login to subscribe' },
        { status: 401 }
      );
    }

    // Get plan from request body
    const { planId } = await request.json();
    
    if (!planId || !['monthly', 'yearly', 'lifetime'].includes(planId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get user details
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ _id: toObjectId(userId) as any }) as unknown as UserDoc | null;
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user can upgrade
    const currentPlan = user.subscription_plan || 'free';
    if (!canUpgrade(currentPlan, planId as PlanId)) {
      return NextResponse.json(
        { success: false, message: 'Cannot downgrade or subscribe to same plan' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = PLANS[planId as PlanId];
    if (!plan || plan.price === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Create receipt ID
    const receipt = `order_${userId}_${planId}_${Date.now()}`;

    // Create Razorpay order
    const order = await createOrder({
      amount: plan.price,
      currency: plan.currency,
      receipt: receipt,
      notes: {
        user_id: userId,
        plan_id: planId,
        user_email: user.email,
        user_name: user.name,
      },
    });

    // Store order in database
    const ordersCollection = await getCollection('orders');
    await ordersCollection.insertOne({
      user_id: toObjectId(userId),
      razorpay_order_id: order.id,
      plan_id: planId,
      amount: plan.price,
      currency: plan.currency,
      status: 'created',
      receipt: receipt,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    // Return order details for frontend
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      user: {
        name: user.name,
        email: user.email,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.priceDisplay,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to create order', error: errorMessage },
      { status: 500 }
    );
  }
}

