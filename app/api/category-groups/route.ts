import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/category-groups - Fetch all active category groups
export async function GET(request: NextRequest) {
  try {
    const collection = await getCollection('category_groups');
    
    const groups = await collection
      .find({ is_active: true })
      .sort({ order: 1 })
      .project({
        _id: 1,
        name: 1,
        label: 1,
        icon: 1,
        order: 1,
        keywords: 1,
      })
      .toArray();

    // Transform _id to id for frontend
    const transformedGroups = groups.map(group => ({
      id: group._id.toString(),
      name: group.name,
      label: group.label,
      icon: group.icon,
      order: group.order,
      keywords: group.keywords,
    }));

    return NextResponse.json({
      success: true,
      groups: transformedGroups,
    });
  } catch (error) {
    console.error('Error fetching category groups:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch category groups' },
      { status: 500 }
    );
  }
}

