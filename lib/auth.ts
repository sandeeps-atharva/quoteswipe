import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface TokenPayload {
  userId: number;
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

export function getUserIdFromRequest(request: NextRequest): number | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = verifyToken(token);
  return payload?.userId || null;
}

// Get full user info from request (including role)
export async function getUserFromRequest(request: NextRequest): Promise<{
  userId: number;
  email: string;
  role: 'user' | 'admin';
  name: string;
} | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, COALESCE(role, 'user') as role FROM users WHERE id = ?",
      [payload.userId]
    );

    if (Array.isArray(users) && users.length > 0) {
      const user = users[0] as { id: number; name: string; email: string; role: 'user' | 'admin' };
      return {
        userId: user.id,
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
  | { authorized: true; user: { userId: number; email: string; role: 'admin'; name: string } }
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

