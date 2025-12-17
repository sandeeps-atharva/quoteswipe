/**
 * MongoDB Database Connection
 * 
 * This file replaces lib/db.ts when using MongoDB
 * 
 * Usage:
 * 1. Rename this file to db.ts (backup the original first)
 * 2. Update all API routes to use MongoDB syntax
 */

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'quote_swipe';

// Declare global for connection caching in development
declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
}

// Connection caching to prevent multiple connections in development
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB and return database instance
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Use cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Use global cache in development
  if (process.env.NODE_ENV === 'development') {
    if (global._mongoClient && global._mongoDb) {
      cachedClient = global._mongoClient;
      cachedDb = global._mongoDb;
      return { client: cachedClient, db: cachedDb };
    }
  }

  // Create new connection
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 5,
  });

  await client.connect();
  const db = client.db(MONGODB_DB);

  // Cache the connection
  cachedClient = client;
  cachedDb = db;

  // Store in global for development
  if (process.env.NODE_ENV === 'development') {
    global._mongoClient = client;
    global._mongoDb = db;
  }

  console.log('✅ Connected to MongoDB');
  return { client, db };
}

/**
 * Get database instance (shorthand)
 */
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

/**
 * Get a specific collection
 */
export async function getCollection<T = any>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/**
 * Helper to convert string ID to ObjectId
 */
export function toObjectId(id: string | ObjectId): ObjectId {
  if (id instanceof ObjectId) return id;
  return new ObjectId(id);
}

/**
 * Helper to safely convert ID (handles invalid IDs)
 */
export function safeObjectId(id: string | number | ObjectId): ObjectId | null {
  try {
    if (id instanceof ObjectId) return id;
    if (typeof id === 'number') return null; // Old MySQL ID
    if (ObjectId.isValid(id)) return new ObjectId(id);
    return null;
  } catch {
    return null;
  }
}

// Export ObjectId for convenience
export { ObjectId };

// Collection type definitions (optional but helpful)
export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  auth_provider: 'email' | 'google';
  google_id?: string;
  reset_token?: string;
  reset_token_expiry?: Date;
  created_at: Date;
  last_login?: Date;
}

export interface Quote {
  _id: ObjectId;
  text: string;
  author: string;
  category_id: ObjectId;
  likes_count: number;
  created_at: Date;
}

export interface Category {
  _id: ObjectId;
  name: string;
  icon: string;
  description?: string;
}

export interface UserQuote {
  _id: ObjectId;
  user_id: ObjectId;
  text: string;
  author: string;
  category_id?: ObjectId;
  theme_id?: string;
  font_id?: string;
  background_id?: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

