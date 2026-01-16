/**
 * MongoDB Index Creation Script
 * 
 * Run this script to create optimal indexes for API performance.
 * These indexes are critical for achieving <200ms response times.
 * 
 * Usage:
 *   npx tsx scripts/create-indexes.ts
 * 
 * Expected improvement:
 *   - User likes/saved/dislikes: 500-2000ms → 80-150ms
 *   - Quotes API: 300-500ms → 50-150ms
 *   - Categories API: 100-300ms → 10-50ms
 */

import { MongoClient, ServerApiVersion } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'quoteswipe';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1>;
  options?: {
    unique?: boolean;
    sparse?: boolean;
    name?: string;
  };
}

const INDEXES: IndexDefinition[] = [
  // ========================================
  // USER INTERACTIONS (Most Critical)
  // ========================================
  
  // user_likes - for fetching user's likes and checking duplicates
  { 
    collection: 'user_likes', 
    index: { user_id: 1, quote_id: 1 }, 
    options: { unique: true, name: 'user_quote_unique' } 
  },
  { 
    collection: 'user_likes', 
    index: { user_id: 1, created_at: -1 }, 
    options: { name: 'user_likes_by_date' } 
  },
  { 
    collection: 'user_likes', 
    index: { quote_id: 1 }, 
    options: { name: 'likes_by_quote' } 
  },

  // user_dislikes - for fetching user's dislikes
  { 
    collection: 'user_dislikes', 
    index: { user_id: 1, quote_id: 1 }, 
    options: { unique: true, name: 'user_dislike_unique' } 
  },
  { 
    collection: 'user_dislikes', 
    index: { user_id: 1, created_at: -1 }, 
    options: { name: 'user_dislikes_by_date' } 
  },
  { 
    collection: 'user_dislikes', 
    index: { quote_id: 1 }, 
    options: { name: 'dislikes_by_quote' } 
  },

  // user_saved - for fetching user's saved quotes
  { 
    collection: 'user_saved', 
    index: { user_id: 1, quote_id: 1 }, 
    options: { unique: true, name: 'user_saved_unique' } 
  },
  { 
    collection: 'user_saved', 
    index: { user_id: 1, created_at: -1 }, 
    options: { name: 'user_saved_by_date' } 
  },

  // ========================================
  // QUOTES
  // ========================================
  
  // quotes - for category filtering and trending queries
  { 
    collection: 'quotes', 
    index: { category_id: 1 }, 
    options: { name: 'quotes_by_category' } 
  },
  { 
    collection: 'quotes', 
    index: { likes_count: -1 }, 
    options: { name: 'quotes_by_popularity' } 
  },

  // user_quotes - for user's created quotes and public quotes
  { 
    collection: 'user_quotes', 
    index: { user_id: 1 }, 
    options: { name: 'user_quotes_by_user' } 
  },
  { 
    collection: 'user_quotes', 
    index: { is_public: 1, category_id: 1 }, 
    options: { name: 'public_quotes_by_category' } 
  },

  // ========================================
  // CATEGORIES
  // ========================================
  
  { 
    collection: 'categories', 
    index: { name: 1 }, 
    options: { name: 'categories_by_name' } 
  },

  // category_groups - for fetching active groups
  { 
    collection: 'category_groups', 
    index: { is_active: 1, order: 1 }, 
    options: { name: 'active_groups_ordered' } 
  },

  // ========================================
  // USERS
  // ========================================
  
  { 
    collection: 'users', 
    index: { email: 1 }, 
    options: { unique: true, name: 'users_email_unique' } 
  },
  { 
    collection: 'users', 
    index: { google_id: 1 }, 
    options: { sparse: true, name: 'users_google_id' } 
  },

  // user_preferences - for fetching user settings
  { 
    collection: 'user_preferences', 
    index: { user_id: 1 }, 
    options: { unique: true, name: 'prefs_by_user' } 
  },
];

async function createIndexes() {
  console.log('🚀 Starting MongoDB index creation...\n');
  console.log(`📦 Database: ${MONGODB_DB}`);
  console.log(`🔗 URI: ${MONGODB_URI?.substring(0, 50)}...\n`);

  const client = new MongoClient(MONGODB_URI!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(MONGODB_DB);
    
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const def of INDEXES) {
      const collection = db.collection(def.collection);
      const indexName = def.options?.name || Object.keys(def.index).join('_');
      
      try {
        // Check if index already exists
        const existingIndexes = await collection.indexes();
        const exists = existingIndexes.some(idx => idx.name === indexName);
        
        if (exists) {
          console.log(`⏭️  ${def.collection}.${indexName} - already exists`);
          skipped++;
          continue;
        }

        await collection.createIndex(def.index, def.options || {});
        console.log(`✅ ${def.collection}.${indexName} - created`);
        created++;
      } catch (error: any) {
        if (error.code === 85 || error.code === 86) {
          // Index already exists with different options
          console.log(`⚠️  ${def.collection}.${indexName} - exists with different options`);
          skipped++;
        } else {
          console.error(`❌ ${def.collection}.${indexName} - failed: ${error.message}`);
          failed++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    // Show index stats
    console.log('\n📈 Current Index Stats:\n');
    
    const collections = ['user_likes', 'user_dislikes', 'user_saved', 'quotes', 'categories'];
    for (const collName of collections) {
      try {
        const coll = db.collection(collName);
        const indexes = await coll.indexes();
        const count = await coll.estimatedDocumentCount().catch(() => null);
        
        console.log(`📁 ${collName}:`);
        console.log(`   Documents: ${count ?? 'N/A'}`);
        console.log(`   Indexes: ${indexes.length}`);
        indexes.forEach(idx => {
          if (idx.name !== '_id_') {
            console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
          }
        });
        console.log('');
      } catch (e) {
        console.log(`📁 ${collName}: Unable to fetch stats\n`);
      }
    }

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Run the script
createIndexes().catch(console.error);
