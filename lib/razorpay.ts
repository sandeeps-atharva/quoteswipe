import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  
  return razorpayInstance;
}

// Create order options interface
export interface CreateOrderOptions {
  amount: number; // in smallest currency unit (paise)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

// Create a new Razorpay order
export async function createOrder(options: CreateOrderOptions) {
  const razorpay = getRazorpay();
  
  const order = await razorpay.orders.create({
    amount: options.amount,
    currency: options.currency,
    receipt: options.receipt,
    notes: options.notes || {},
  });
  
  return order;
}

// Verify payment signature
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error('Razorpay secret not configured');
  }
  
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

// Verify webhook signature
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Razorpay webhook secret not configured');
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

// Fetch payment details
export async function fetchPayment(paymentId: string) {
  const razorpay = getRazorpay();
  return await razorpay.payments.fetch(paymentId);
}

// Fetch order details
export async function fetchOrder(orderId: string) {
  const razorpay = getRazorpay();
  return await razorpay.orders.fetch(orderId);
}

// Refund payment
export async function refundPayment(paymentId: string, amount?: number) {
  const razorpay = getRazorpay();
  
  const refundOptions: { payment_id: string; amount?: number } = {
    payment_id: paymentId,
  };
  
  if (amount) {
    refundOptions.amount = amount;
  }
  
  return await razorpay.payments.refund(paymentId, refundOptions);
}

