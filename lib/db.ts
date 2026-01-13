/**
 * MongoDB Database Connection
 * Optimized for Vercel serverless with connection pooling
 */

import { MongoClient, Db, Collection, ObjectId, ServerApiVersion } from 'mongodb';

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sandeep:root@quoteswipe.glnm5hr.mongodb.net/?retryWrites=true&w=majority&appName=quoteswipe';
const MONGODB_DB = process.env.MONGODB_DB || 'quoteswipe';

// Connection pooling configuration
const POOL_CONFIG = {
  // Min/max pool size for serverless
  minPoolSize: 1,
  maxPoolSize: 10,
  // Connection timeout - fail fast if can't connect
  connectTimeoutMS: 5000,
  // Socket timeout
  socketTimeoutMS: 30000,
  // Max time to wait for connection from pool
  waitQueueTimeoutMS: 5000,
  // Keep connections alive
  maxIdleTimeMS: 60000,
};

// Connection caching
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectionPromise: Promise<{ client: MongoClient; db: Db }> | null = null;
let lastValidated = 0;
const VALIDATION_INTERVAL = 30_000; // Validate every 30s, not every request

// Declare global for development
declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
  var _mongoConnectionPromise: Promise<{ client: MongoClient; db: Db }> | undefined;
  var _mongoLastValidated: number | undefined;
}

/**
 * Connect to MongoDB and return database instance
 * OPTIMIZED: Removed blocking ping on every request
 * Uses lazy validation (ping every 30s in background, not blocking)
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Fast path: return cached connection without blocking ping
  if (cachedClient && cachedDb) {
    const now = Date.now();
    
    // Only validate periodically, not on every request (saves 50-100ms)
    if (now - lastValidated < VALIDATION_INTERVAL) {
      return { client: cachedClient, db: cachedDb };
    }
    
    // Background validation - don't block the request
    lastValidated = now;
    cachedDb.command({ ping: 1 }).catch(() => {
      // Connection dead, reset for next request
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
      lastValidated = 0;
    });
    
    return { client: cachedClient, db: cachedDb };
  }

  // Development: check global cache
  if (process.env.NODE_ENV === 'development') {
    if (global._mongoClient && global._mongoDb) {
      cachedClient = global._mongoClient;
      cachedDb = global._mongoDb;
      lastValidated = global._mongoLastValidated || Date.now();
      return { client: cachedClient, db: cachedDb };
    }
    
    // Reuse connection promise to prevent duplicate connections
    if (global._mongoConnectionPromise) {
      return global._mongoConnectionPromise;
    }
  }

  // Reuse connection promise if already connecting
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection promise
  connectionPromise = (async () => {
    const startTime = Date.now();
    
    const client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      ...POOL_CONFIG,
    });

    await client.connect();
    const db = client.db(MONGODB_DB);

    // Cache the connection
    cachedClient = client;
    cachedDb = db;
    lastValidated = Date.now();

    // Development: cache in global
    if (process.env.NODE_ENV === 'development') {
      global._mongoClient = client;
      global._mongoDb = db;
      global._mongoLastValidated = lastValidated;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > 1000) {
      console.warn(`[MongoDB] Slow connection: ${elapsed}ms`);
    }

    return { client, db };
  })();

  // Development: store promise globally
  if (process.env.NODE_ENV === 'development') {
    global._mongoConnectionPromise = connectionPromise;
  }

  return connectionPromise;
}

/**
 * Get database instance
 */
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

/**
 * Get a specific collection
 * Optimized: reuses connection automatically
 */
export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

/**
 * Warm up database connection (call on app startup)
 * This pre-establishes the connection to avoid cold start latency
 */
export async function warmUpConnection(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    console.log('[MongoDB] Connection warmed up');
  } catch (error) {
    console.error('[MongoDB] Warm-up failed:', error);
  }
}

/**
 * Convert string to ObjectId safely
 */
export function toObjectId(id: string | ObjectId | number): ObjectId | string | number {
  if (id instanceof ObjectId) return id;
  if (typeof id === 'number') return id;
  try {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
      return new ObjectId(id);
    }
  } catch {}
  return id;
}

/**
 * Check if string is valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  try {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
  } catch {
    return false;
  }
}

/**
 * Normalize any ID to string format
 * IMPORTANT: Use this when storing references to ensure consistent querying
 */
export function normalizeId(id: unknown): string {
  if (id === null || id === undefined) return '';
  if (id instanceof ObjectId) return id.toString();
  if (typeof id === 'object' && '_id' in id) {
    return normalizeId((id as { _id: unknown })._id);
  }
  return String(id);
}

/**
 * Build a flexible ID match query for lookups
 * Handles both ObjectId and string formats
 */
export function buildIdMatch(fieldName: string, id: string | ObjectId): Record<string, any> {
  const stringId = normalizeId(id);
  if (isValidObjectId(stringId)) {
    return {
      $or: [
        { [fieldName]: new ObjectId(stringId) },
        { [fieldName]: stringId }
      ]
    };
  }
  return { [fieldName]: stringId };
}

// Export ObjectId and types
export { ObjectId };
export type { Db, Collection };
