# MongoDB Migration Examples

This document shows how to convert API routes from MySQL to MongoDB.

## Example 1: Quotes API

### BEFORE (MySQL) - `app/api/quotes/route.ts`

```typescript
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const [quotes] = await pool.execute(`
    SELECT q.*, c.name as category, c.icon as category_icon 
    FROM quotes q 
    LEFT JOIN categories c ON q.category_id = c.id 
    ORDER BY RAND() 
    LIMIT 50
  `);
  
  return NextResponse.json({ quotes });
}
```

### AFTER (MongoDB)

```typescript
import { getCollection, ObjectId } from '@/lib/db-mongo';

export async function GET(request: NextRequest) {
  const quotesCollection = await getCollection('quotes');
  
  const quotes = await quotesCollection.aggregate([
    // Random sample
    { $sample: { size: 50 } },
    // Join with categories
    {
      $lookup: {
        from: 'categories',
        localField: 'category_id',
        foreignField: '_id',
        as: 'categoryData'
      }
    },
    // Flatten category data
    {
      $addFields: {
        category: { $arrayElemAt: ['$categoryData.name', 0] },
        category_icon: { $arrayElemAt: ['$categoryData.icon', 0] }
      }
    },
    // Remove categoryData array
    { $project: { categoryData: 0 } }
  ]).toArray();
  
  return NextResponse.json({ quotes });
}
```

---

## Example 2: User Likes API

### BEFORE (MySQL) - `app/api/user/likes/route.ts`

```typescript
import pool from '@/lib/db';

// GET - Fetch user's liked quotes
export async function GET(request: NextRequest) {
  const [likes] = await pool.execute(
    `SELECT q.*, c.name as category 
     FROM user_likes ul 
     JOIN quotes q ON ul.quote_id = q.id 
     LEFT JOIN categories c ON q.category_id = c.id 
     WHERE ul.user_id = ?`,
    [userId]
  );
  return NextResponse.json({ quotes: likes });
}

// POST - Like a quote
export async function POST(request: NextRequest) {
  const { quoteId } = await request.json();
  
  // Check if already liked
  const [existing] = await pool.execute(
    'SELECT * FROM user_likes WHERE user_id = ? AND quote_id = ?',
    [userId, quoteId]
  );
  
  if (existing.length > 0) {
    return NextResponse.json({ alreadyLiked: true });
  }
  
  await pool.execute(
    'INSERT INTO user_likes (user_id, quote_id) VALUES (?, ?)',
    [userId, quoteId]
  );
  
  await pool.execute(
    'UPDATE quotes SET likes_count = likes_count + 1 WHERE id = ?',
    [quoteId]
  );
  
  return NextResponse.json({ success: true });
}
```

### AFTER (MongoDB)

```typescript
import { getCollection, toObjectId, ObjectId } from '@/lib/db-mongo';

// GET - Fetch user's liked quotes
export async function GET(request: NextRequest) {
  const likesCollection = await getCollection('user_likes');
  
  const likes = await likesCollection.aggregate([
    { $match: { user_id: toObjectId(userId) } },
    {
      $lookup: {
        from: 'quotes',
        localField: 'quote_id',
        foreignField: '_id',
        as: 'quote'
      }
    },
    { $unwind: '$quote' },
    {
      $lookup: {
        from: 'categories',
        localField: 'quote.category_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $project: {
        _id: '$quote._id',
        text: '$quote.text',
        author: '$quote.author',
        category: { $arrayElemAt: ['$category.name', 0] }
      }
    }
  ]).toArray();
  
  return NextResponse.json({ quotes: likes });
}

// POST - Like a quote
export async function POST(request: NextRequest) {
  const { quoteId } = await request.json();
  const likesCollection = await getCollection('user_likes');
  const quotesCollection = await getCollection('quotes');
  
  // Check if already liked
  const existing = await likesCollection.findOne({
    user_id: toObjectId(userId),
    quote_id: toObjectId(quoteId)
  });
  
  if (existing) {
    return NextResponse.json({ alreadyLiked: true });
  }
  
  // Add like
  await likesCollection.insertOne({
    user_id: toObjectId(userId),
    quote_id: toObjectId(quoteId),
    created_at: new Date()
  });
  
  // Increment likes count
  await quotesCollection.updateOne(
    { _id: toObjectId(quoteId) },
    { $inc: { likes_count: 1 } }
  );
  
  return NextResponse.json({ success: true });
}
```

---

## Example 3: Auth Login

### BEFORE (MySQL)

```typescript
const [users] = await pool.execute(
  'SELECT * FROM users WHERE email = ?',
  [email]
);
const user = users[0];
```

### AFTER (MongoDB)

```typescript
const usersCollection = await getCollection<User>('users');
const user = await usersCollection.findOne({ email });
```

---

## Common Query Patterns

| MySQL | MongoDB |
|-------|---------|
| `SELECT * FROM users` | `collection.find({}).toArray()` |
| `SELECT * FROM users WHERE id = ?` | `collection.findOne({ _id: toObjectId(id) })` |
| `SELECT * FROM users WHERE age > 18` | `collection.find({ age: { $gt: 18 } }).toArray()` |
| `SELECT * FROM users LIMIT 10` | `collection.find({}).limit(10).toArray()` |
| `SELECT * FROM users ORDER BY name` | `collection.find({}).sort({ name: 1 }).toArray()` |
| `SELECT COUNT(*) FROM users` | `collection.countDocuments({})` |
| `INSERT INTO users (name) VALUES (?)` | `collection.insertOne({ name })` |
| `UPDATE users SET name = ? WHERE id = ?` | `collection.updateOne({ _id }, { $set: { name } })` |
| `DELETE FROM users WHERE id = ?` | `collection.deleteOne({ _id })` |
| `SELECT * FROM users WHERE name LIKE '%john%'` | `collection.find({ name: /john/i }).toArray()` |

---

## Running the Migration

```bash
# 1. Install MongoDB driver
npm install mongodb

# 2. Set MongoDB URI in .env
MONGODB_URI=mongodb://localhost:27017

# 3. Run migration script
npx tsx scripts/migrate-mysql-to-mongodb.ts

# 4. Verify data in MongoDB
mongosh quote_swipe --eval "db.quotes.countDocuments()"
```

