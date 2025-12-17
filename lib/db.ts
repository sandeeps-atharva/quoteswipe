/**
 * MongoDB Database Connection
 * Using MongoDB Atlas
 */

import { MongoClient, Db, Collection, ObjectId, ServerApiVersion } from 'mongodb';

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sandeep:root@quoteswipe.glnm5hr.mongodb.net/?retryWrites=true&w=majority&appName=quoteswipe';
const MONGODB_DB = process.env.MONGODB_DB || 'quoteswipe';

// Connection caching
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// Declare global for development
declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
}

/**
 * Connect to MongoDB and return database instance
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (process.env.NODE_ENV === 'development') {
    if (global._mongoClient && global._mongoDb) {
      cachedClient = global._mongoClient;
      cachedDb = global._mongoDb;
      return { client: cachedClient, db: cachedDb };
    }
  }

  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  await client.connect();
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  if (process.env.NODE_ENV === 'development') {
    global._mongoClient = client;
    global._mongoDb = db;
  }

  return { client, db };
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
 */
export async function getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
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
