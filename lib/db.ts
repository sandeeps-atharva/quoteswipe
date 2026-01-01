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

// Declare global for development
declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
  var _mongoConnectionPromise: Promise<{ client: MongoClient; db: Db }> | undefined;
}

/**
 * Connect to MongoDB and return database instance
 * Uses connection promise to prevent duplicate connections during concurrent requests
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    // Verify connection is still alive
    try {
      await cachedDb.command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch {
      // Connection lost, reset cache
      cachedClient = null;
      cachedDb = null;
      connectionPromise = null;
    }
  }

  // Development: check global cache
  if (process.env.NODE_ENV === 'development') {
    if (global._mongoClient && global._mongoDb) {
      cachedClient = global._mongoClient;
      cachedDb = global._mongoDb;
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

    // Development: cache in global
    if (process.env.NODE_ENV === 'development') {
      global._mongoClient = client;
      global._mongoDb = db;
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

// Export ObjectId and types
export { ObjectId };
export type { Db, Collection };
