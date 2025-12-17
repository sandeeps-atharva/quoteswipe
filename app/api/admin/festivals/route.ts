import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/festivals - Get all festivals
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const festivalsCollection = await getCollection('festivals');
    const festivalQuotesCollection = await getCollection('festival_quotes');

    const festivals = await festivalsCollection.find({}).sort({ date: 1 }).toArray() as any[];

    // Get quote counts for each festival
    const quoteCounts = await festivalQuotesCollection.aggregate([
      { $group: { _id: '$festival_id', count: { $sum: 1 } } }
    ]).toArray() as any[];
    const countMap = new Map(quoteCounts.map((q: any) => [String(q._id), q.count]));

    const formattedFestivals = festivals.map((f: any) => ({
      ...f,
      id: f.id || f._id?.toString(),
      quotes_count: countMap.get(String(f.id || f._id)) || 0
    }));

    return NextResponse.json({ festivals: formattedFestivals });
  } catch (error) {
    console.error('Get festivals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/festivals - Create a new festival
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { name, date, description } = await request.json();

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

    const festivalsCollection = await getCollection('festivals');

    const result = await festivalsCollection.insertOne({
      name,
      date: new Date(date),
      description: description || null,
      created_at: new Date()
    } as any);

    return NextResponse.json({
      message: 'Festival created successfully',
      festivalId: result.insertedId.toString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Create festival error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
