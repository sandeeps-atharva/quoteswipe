import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';
import { PlanId, calculateExpiryDate } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

interface OrderDoc {
  _id: any;
  user_id: any;
  razorpay_order_id: string;
  plan_id: PlanId;
  amount: number;
  currency: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get payment details from request
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing payment details' },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Get order from database
    const ordersCollection = await getCollection('orders');
    const order = await ordersCollection.findOne({
      razorpay_order_id,
      user_id: toObjectId(userId),
    }) as unknown as OrderDoc | null;

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (order.status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
      });
    }

    // Fetch payment details from Razorpay
    const payment = await fetchPayment(razorpay_payment_id);

    // Update order status
    await ordersCollection.updateOne(
      { _id: order._id },
      {
        $set: {
          status: 'paid',
          razorpay_payment_id,
          razorpay_signature,
          payment_method: payment.method,
          paid_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    // Create subscription record
    const subscriptionsCollection = await getCollection('subscriptions');
    const expiresAt = calculateExpiryDate(order.plan_id);

    await subscriptionsCollection.insertOne({
      user_id: toObjectId(userId),
      plan_id: order.plan_id,
      status: 'active',
      razorpay_order_id,
      razorpay_payment_id,
      amount: order.amount,
      currency: order.currency,
      started_at: new Date(),
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    // Update user subscription status
    const usersCollection = await getCollection('users');
    await usersCollection.updateOne(
      { _id: toObjectId(userId) as any },
      {
        $set: {
          subscription_plan: order.plan_id,
          subscription_status: 'active',
          subscription_expires_at: expiresAt,
          subscription_started_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    // Record payment in payments collection
    const paymentsCollection = await getCollection('payments');
    await paymentsCollection.insertOne({
      user_id: toObjectId(userId),
      order_id: order._id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: order.amount,
      currency: order.currency,
      status: 'success',
      method: payment.method,
      plan_id: order.plan_id,
      created_at: new Date(),
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        plan: order.plan_id,
        status: 'active',
        expiresAt: expiresAt,
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}

