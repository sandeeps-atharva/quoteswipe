import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { calculateExpiryDate, PlanId } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

interface WebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        notes?: {
          user_id?: string;
          plan_id?: string;
        };
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        notes?: {
          user_id?: string;
          plan_id?: string;
        };
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Webhook: Missing signature');
      return NextResponse.json(
        { success: false, message: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('Webhook: Invalid signature');
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = JSON.parse(body);
    console.log('Webhook received:', payload.event);

    // Handle different event types
    switch (payload.event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
      
      case 'refund.created':
        await handleRefundCreated(payload);
        break;
      
      case 'order.paid':
        await handleOrderPaid(payload);
        break;
      
      default:
        console.log('Unhandled webhook event:', payload.event);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

interface OrderDoc {
  _id: any;
  user_id: any;
  razorpay_order_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
}

interface PaymentDoc {
  _id: any;
  user_id: any;
  razorpay_payment_id: string;
  amount: number;
  plan_id: string;
}

async function handlePaymentCaptured(payload: WebhookPayload) {
  const payment = payload.payload.payment?.entity;
  if (!payment) return;

  console.log('Payment captured:', payment.id);

  const ordersCollection = await getCollection('orders');
  const order = await ordersCollection.findOne({ razorpay_order_id: payment.order_id }) as unknown as OrderDoc | null;

  if (!order) {
    console.error('Order not found for payment:', payment.id);
    return;
  }

  // Check if already processed
  if (order.status === 'paid') {
    console.log('Payment already processed:', payment.id);
    return;
  }

  // Update order
  await ordersCollection.updateOne(
    { razorpay_order_id: payment.order_id },
    {
      $set: {
        status: 'paid',
        razorpay_payment_id: payment.id,
        payment_method: payment.method,
        paid_at: new Date(),
        updated_at: new Date(),
      },
    }
  );

  // Get user ID from order
  const userId = order.user_id;
  const planId = order.plan_id as PlanId;

  // Create/update subscription
  const subscriptionsCollection = await getCollection('subscriptions');
  const expiresAt = calculateExpiryDate(planId);

  await subscriptionsCollection.updateOne(
    { user_id: userId, status: 'active' },
    {
      $set: {
        plan_id: planId,
        status: 'active',
        razorpay_order_id: payment.order_id,
        razorpay_payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        started_at: new Date(),
        expires_at: expiresAt,
        updated_at: new Date(),
      },
      $setOnInsert: {
        created_at: new Date(),
      },
    },
    { upsert: true }
  );

  // Update user
  const usersCollection = await getCollection('users');
  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        subscription_plan: planId,
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
        subscription_started_at: new Date(),
        updated_at: new Date(),
      },
    }
  );

  // Record payment
  const paymentsCollection = await getCollection('payments');
  await paymentsCollection.insertOne({
    user_id: userId,
    razorpay_order_id: payment.order_id,
    razorpay_payment_id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'success',
    method: payment.method,
    plan_id: planId,
    source: 'webhook',
    created_at: new Date(),
  } as any);

  console.log('Subscription activated via webhook for user:', userId.toString());
}

async function handlePaymentFailed(payload: WebhookPayload) {
  const payment = payload.payload.payment?.entity;
  if (!payment) return;

  console.log('Payment failed:', payment.id);

  const ordersCollection = await getCollection('orders');
  await ordersCollection.updateOne(
    { razorpay_order_id: payment.order_id },
    {
      $set: {
        status: 'failed',
        razorpay_payment_id: payment.id,
        updated_at: new Date(),
      },
    }
  );

  // Record failed payment
  const order = await ordersCollection.findOne({ razorpay_order_id: payment.order_id }) as unknown as OrderDoc | null;
  if (order) {
    const paymentsCollection = await getCollection('payments');
    await paymentsCollection.insertOne({
      user_id: order.user_id,
      razorpay_order_id: payment.order_id,
      razorpay_payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: 'failed',
      method: payment.method,
      plan_id: order.plan_id,
      source: 'webhook',
      created_at: new Date(),
    } as any);
  }
}

async function handleRefundCreated(payload: WebhookPayload) {
  const refund = payload.payload.refund?.entity;
  if (!refund) return;

  console.log('Refund created:', refund.id);

  // Update payment record
  const paymentsCollection = await getCollection('payments');
  await paymentsCollection.updateOne(
    { razorpay_payment_id: refund.payment_id },
    {
      $set: {
        refund_id: refund.id,
        refund_amount: refund.amount,
        refund_status: refund.status,
        refunded_at: new Date(),
        updated_at: new Date(),
      },
    }
  );

  // If full refund, cancel subscription
  const paymentDoc = await paymentsCollection.findOne({ razorpay_payment_id: refund.payment_id }) as unknown as PaymentDoc | null;
  if (paymentDoc && refund.amount === paymentDoc.amount) {
    const usersCollection = await getCollection('users');
    await usersCollection.updateOne(
      { _id: paymentDoc.user_id },
      {
        $set: {
          subscription_status: 'cancelled',
          updated_at: new Date(),
        },
      }
    );

    const subscriptionsCollection = await getCollection('subscriptions');
    await subscriptionsCollection.updateOne(
      { user_id: paymentDoc.user_id, status: 'active' },
      {
        $set: {
          status: 'cancelled',
          cancelled_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    console.log('Subscription cancelled due to refund for user:', paymentDoc.user_id.toString());
  }
}

async function handleOrderPaid(payload: WebhookPayload) {
  const order = payload.payload.order?.entity;
  if (!order) return;

  console.log('Order paid:', order.id);
  // This is a backup handler - payment.captured should handle most cases
}

