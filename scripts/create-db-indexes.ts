/**
 * Database Index Creation Script
 * 
 * Run this script to create optimal indexes for better query performance.
 * This can reduce query times by 50-80%!
 * 
 * Usage: npx ts-node scripts/create-db-indexes.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'quoteswipe';

async function createIndexes() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    console.log('✅ Connected to database:', MONGODB_DB);

    // ========================================================================
    // QUOTES COLLECTION INDEXES
    // ========================================================================
    console.log('\n📚 Creating indexes for quotes collection...');
    
    try {
      await db.collection('quotes').createIndex(
        { category_id: 1 },
        { name: 'idx_quotes_category' }
      );
      console.log('  ✅ Created index: idx_quotes_category');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists: idx_quotes_category');
      else throw e;
    }

    try {
      await db.collection('quotes').createIndex(
        { author: 1 },
        { name: 'idx_quotes_author' }
      );
      console.log('  ✅ Created index: idx_quotes_author');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists: idx_quotes_author');
      else throw e;
    }

    // Text index for search
    try {
      await db.collection('quotes').createIndex(
        { text: 'text', author: 'text' },
        { name: 'idx_quotes_text_search', weights: { text: 10, author: 5 } }
      );
      console.log('  ✅ Created text index: idx_quotes_text_search');
    } catch (e: any) {
      if (e.code === 85 || e.code === 86) console.log('  ⏭️  Text index already exists');
      else throw e;
    }

    // ========================================================================
    // USER_QUOTES COLLECTION INDEXES
    // ========================================================================
    console.log('\n👤 Creating indexes for user_quotes collection...');
    
    try {
      await db.collection('user_quotes').createIndex(
        { is_public: 1, category_id: 1 },
        { name: 'idx_user_quotes_public_category' }
      );
      console.log('  ✅ Created index: idx_user_quotes_public_category');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    try {
      await db.collection('user_quotes').createIndex(
        { user_id: 1 },
        { name: 'idx_user_quotes_user' }
      );
      console.log('  ✅ Created index: idx_user_quotes_user');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // USER_LIKES COLLECTION INDEXES
    // ========================================================================
    console.log('\n❤️  Creating indexes for user_likes collection...');
    
    try {
      await db.collection('user_likes').createIndex(
        { user_id: 1, quote_id: 1 },
        { name: 'idx_user_likes_user_quote', unique: true }
      );
      console.log('  ✅ Created index: idx_user_likes_user_quote');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    try {
      await db.collection('user_likes').createIndex(
        { quote_id: 1 },
        { name: 'idx_user_likes_quote' }
      );
      console.log('  ✅ Created index: idx_user_likes_quote');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    try {
      await db.collection('user_likes').createIndex(
        { user_id: 1 },
        { name: 'idx_user_likes_user' }
      );
      console.log('  ✅ Created index: idx_user_likes_user');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // USER_DISLIKES COLLECTION INDEXES
    // ========================================================================
    console.log('\n👎 Creating indexes for user_dislikes collection...');
    
    try {
      await db.collection('user_dislikes').createIndex(
        { user_id: 1, quote_id: 1 },
        { name: 'idx_user_dislikes_user_quote', unique: true }
      );
      console.log('  ✅ Created index: idx_user_dislikes_user_quote');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    try {
      await db.collection('user_dislikes').createIndex(
        { quote_id: 1 },
        { name: 'idx_user_dislikes_quote' }
      );
      console.log('  ✅ Created index: idx_user_dislikes_quote');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // USER_SAVED COLLECTION INDEXES
    // ========================================================================
    console.log('\n💾 Creating indexes for user_saved collection...');
    
    try {
      await db.collection('user_saved').createIndex(
        { user_id: 1, quote_id: 1 },
        { name: 'idx_user_saved_user_quote', unique: true }
      );
      console.log('  ✅ Created index: idx_user_saved_user_quote');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    try {
      await db.collection('user_saved').createIndex(
        { user_id: 1 },
        { name: 'idx_user_saved_user' }
      );
      console.log('  ✅ Created index: idx_user_saved_user');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // CATEGORIES COLLECTION INDEXES
    // ========================================================================
    console.log('\n📁 Creating indexes for categories collection...');
    
    try {
      await db.collection('categories').createIndex(
        { name: 1 },
        { name: 'idx_categories_name', unique: true }
      );
      console.log('  ✅ Created index: idx_categories_name');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // USERS COLLECTION INDEXES
    // ========================================================================
    console.log('\n👥 Creating indexes for users collection...');
    
    try {
      await db.collection('users').createIndex(
        { email: 1 },
        { name: 'idx_users_email', unique: true }
      );
      console.log('  ✅ Created index: idx_users_email');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    try {
      await db.collection('users').createIndex(
        { google_id: 1 },
        { name: 'idx_users_google', sparse: true }
      );
      console.log('  ✅ Created index: idx_users_google');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // USER_PREFERENCES COLLECTION INDEXES
    // ========================================================================
    console.log('\n⚙️  Creating indexes for user_preferences collection...');
    
    try {
      await db.collection('user_preferences').createIndex(
        { user_id: 1 },
        { name: 'idx_user_preferences_user', unique: true }
      );
      console.log('  ✅ Created index: idx_user_preferences_user');
    } catch (e: any) {
      if (e.code === 85) console.log('  ⏭️  Index already exists');
      else throw e;
    }

    // ========================================================================
    // LIST ALL INDEXES
    // ========================================================================
    console.log('\n📋 Current indexes:');
    const collections = ['quotes', 'user_quotes', 'user_likes', 'user_dislikes', 'user_saved', 'categories', 'users', 'user_preferences'];
    
    for (const collName of collections) {
      try {
        const indexes = await db.collection(collName).indexes();
        console.log(`\n  ${collName}:`);
        indexes.forEach((idx: any) => {
          console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });
      } catch (e) {
        console.log(`  ${collName}: Collection may not exist yet`);
      }
    }

    console.log('\n✅ All indexes created successfully!');
    console.log('🚀 Your queries should now be much faster!');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createIndexes();



