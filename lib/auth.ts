import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface TokenPayload {
  userId: string | number;
  email: string;
  role?: 'user' | 'admin';
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = verifyToken(token);
  return payload?.userId?.toString() || null;
}

// Get full user info from request (including role)
export async function getUserFromRequest(request: NextRequest): Promise<{
  userId: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
} | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  try {
    const usersCollection = await getCollection('users');
    const user: any = await usersCollection.findOne({ _id: toObjectId(payload.userId) as any }) as any;

    if (user) {
      return {
        userId: user._id.toString(),
        email: user.email,
        role: user.role || 'user',
        name: user.name,
      };
    }
    return null;
  } catch (error) {
    console.error('getUserFromRequest error:', error);
    return null;
  }
}

// Admin authorization middleware helper
export async function requireAdmin(request: NextRequest): Promise<
  | { authorized: true; user: { userId: string; email: string; role: 'admin'; name: string } }
  | { authorized: false; response: NextResponse }
> {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  
  if (user.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    };
  }
  
  return {
    authorized: true,
    user: { ...user, role: 'admin' },
  };
}
