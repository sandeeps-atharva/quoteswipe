/**
 * MySQL to MongoDB Migration Script
 * 
 * This script migrates all data from MySQL to MongoDB
 * 
 * Usage:
 * 1. Install dependencies: npm install mongodb mysql2
 * 2. Set environment variables in .env
 * 3. Run: npx tsx scripts/migrate-mysql-to-mongodb.ts
 */

import mysql from 'mysql2/promise';
import { MongoClient, ObjectId } from 'mongodb';

// MySQL Configuration
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'quote_swipe',
};

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = 'quote_swipe';

// Tables to migrate (in order - respecting foreign keys)
const TABLES_TO_MIGRATE = [
  'categories',
  'users',
  'quotes',
  'user_quotes',
  'user_likes',
  'user_dislikes',
  'user_saved',
  'user_preferences',
  'festivals',
  'scheduled_emails',
  'email_campaigns',
  'contact_messages',
  'feedback',
  'reviews',
  'visitors',
];

// ID mapping for foreign key references
const idMaps: Record<string, Map<string | number, ObjectId>> = {};

async function migrateTable(
  mysqlPool: mysql.Pool,
  mongoDb: any,
  tableName: string
): Promise<void> {
  console.log(`\n📦 Migrating table: ${tableName}`);
  
  try {
    // Fetch all rows from MySQL
    const [rows] = await mysqlPool.execute(`SELECT * FROM ${tableName}`);
    const data = rows as any[];
    
    if (data.length === 0) {
      console.log(`   ⚠️  No data in ${tableName}`);
      return;
    }
    
    console.log(`   Found ${data.length} rows`);
    
    // Initialize ID map for this table
    idMaps[tableName] = new Map();
    
    // Transform data for MongoDB
    const documents = data.map((row) => {
      const doc: any = { ...row };
      const originalId = row.id;
      
      // Generate new ObjectId
      const newId = new ObjectId();
      doc._id = newId;
      
      // Store mapping for foreign key references
      idMaps[tableName].set(originalId, newId);
      
      // Remove old id field
      delete doc.id;
      
      // Convert foreign keys to ObjectId references
      if (doc.user_id && idMaps['users']) {
        doc.user_id = idMaps['users'].get(doc.user_id) || doc.user_id;
      }
      if (doc.category_id && idMaps['categories']) {
        doc.category_id = idMaps['categories'].get(doc.category_id) || doc.category_id;
      }
      if (doc.quote_id && idMaps['quotes']) {
        doc.quote_id = idMaps['quotes'].get(doc.quote_id) || doc.quote_id;
      }
      
      // Convert dates
      if (doc.created_at) doc.created_at = new Date(doc.created_at);
      if (doc.updated_at) doc.updated_at = new Date(doc.updated_at);
      if (doc.last_login) doc.last_login = new Date(doc.last_login);
      if (doc.scheduled_date) doc.scheduled_date = new Date(doc.scheduled_date);
      if (doc.sent_at) doc.sent_at = new Date(doc.sent_at);
      
      // Parse JSON fields
      if (doc.custom_backgrounds && typeof doc.custom_backgrounds === 'string') {
        try {
          doc.custom_backgrounds = JSON.parse(doc.custom_backgrounds);
        } catch (e) {
          doc.custom_backgrounds = [];
        }
      }
      
      return doc;
    });
    
    // Insert into MongoDB
    const collection = mongoDb.collection(tableName);
    
    // Drop existing collection if exists
    try {
      await collection.drop();
    } catch (e) {
      // Collection doesn't exist, that's fine
    }
    
    // Insert all documents
    const result = await collection.insertMany(documents);
    console.log(`   ✅ Inserted ${result.insertedCount} documents`);
    
    // Create indexes based on table
    await createIndexes(collection, tableName);
    
  } catch (error: any) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
  }
}

async function createIndexes(collection: any, tableName: string): Promise<void> {
  const indexes: Record<string, any[]> = {
    users: [
      { key: { email: 1 }, unique: true },
    ],
    quotes: [
      { key: { category_id: 1 } },
      { key: { likes_count: -1 } },
    ],
    user_quotes: [
      { key: { user_id: 1 } },
      { key: { is_public: 1 } },
    ],
    user_likes: [
      { key: { user_id: 1, quote_id: 1 }, unique: true },
    ],
    user_dislikes: [
      { key: { user_id: 1, quote_id: 1 }, unique: true },
    ],
    user_saved: [
      { key: { user_id: 1, quote_id: 1 }, unique: true },
    ],
    categories: [
      { key: { name: 1 } },
    ],
  };
  
  if (indexes[tableName]) {
    for (const index of indexes[tableName]) {
      try {
        await collection.createIndex(index.key, { unique: index.unique || false });
        console.log(`   📇 Created index on ${Object.keys(index.key).join(', ')}`);
      } catch (e: any) {
        console.log(`   ⚠️  Index warning: ${e.message}`);
      }
    }
  }
}

async function migrate(): Promise<void> {
  console.log('🚀 Starting MySQL to MongoDB Migration\n');
  console.log('=====================================\n');
  
  // Connect to MySQL
  console.log('📡 Connecting to MySQL...');
  const mysqlPool = mysql.createPool(mysqlConfig);
  
  // Connect to MongoDB
  console.log('📡 Connecting to MongoDB...');
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const mongoDb = mongoClient.db(MONGODB_DB);
  
  console.log('✅ Connected to both databases\n');
  
  // Migrate each table
  for (const table of TABLES_TO_MIGRATE) {
    await migrateTable(mysqlPool, mongoDb, table);
  }
  
  // Summary
  console.log('\n=====================================');
  console.log('✅ Migration Complete!\n');
  
  // Show collection counts
  console.log('📊 MongoDB Collection Stats:');
  for (const table of TABLES_TO_MIGRATE) {
    try {
      const count = await mongoDb.collection(table).countDocuments();
      console.log(`   ${table}: ${count} documents`);
    } catch (e) {
      // Collection might not exist
    }
  }
  
  // Cleanup
  await mysqlPool.end();
  await mongoClient.close();
  
  console.log('\n🎉 Done! Your data is now in MongoDB.');
}

// Run migration
migrate().catch(console.error);

