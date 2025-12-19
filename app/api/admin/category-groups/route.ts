import { NextRequest, NextResponse } from 'next/server';
import { getCollection, toObjectId } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

// Type definitions
interface CategoryGroupDoc {
  _id: ObjectId;
  name: string;
  label: string;
  icon: string;
  order: number;
  keywords: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserDoc {
  _id: ObjectId;
  role?: string;
}

// Check if user is admin
async function isAdmin(request: NextRequest): Promise<boolean> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return false;
  
  const usersCollection = await getCollection('users');
  const user = await usersCollection.findOne({ _id: toObjectId(userId) as any }) as UserDoc | null;
  return user?.role === 'admin';
}

// GET /api/admin/category-groups - Get all groups (including inactive)
export async function GET(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const collection = await getCollection('category_groups');
    const groups = await collection.find({}).sort({ order: 1 }).toArray() as unknown as CategoryGroupDoc[];

    return NextResponse.json({
      success: true,
      groups: groups.map(g => ({
        id: g._id.toString(),
        name: g.name,
        label: g.label,
        icon: g.icon,
        order: g.order,
        keywords: g.keywords,
        is_active: g.is_active,
        created_at: g.created_at,
        updated_at: g.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching category groups:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch category groups' },
      { status: 500 }
    );
  }
}

// POST /api/admin/category-groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { name, label, icon, order, keywords } = await request.json();

    if (!name || !label || !icon) {
      return NextResponse.json(
        { success: false, message: 'Name, label, and icon are required' },
        { status: 400 }
      );
    }

    const collection = await getCollection('category_groups');

    // Check if name already exists
    const existing = await collection.findOne({ name });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Group name already exists' },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let groupOrder = order;
    if (!groupOrder) {
      const maxOrderDocs = await collection.find({}).sort({ order: -1 }).limit(1).toArray() as unknown as CategoryGroupDoc[];
      groupOrder = maxOrderDocs.length > 0 ? maxOrderDocs[0].order + 1 : 1;
    }

    const newGroup: Omit<CategoryGroupDoc, '_id'> = {
      name,
      label,
      icon,
      order: groupOrder,
      keywords: keywords || [],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await collection.insertOne(newGroup as any);

    return NextResponse.json({
      success: true,
      message: 'Category group created',
      group: {
        id: result.insertedId.toString(),
        name,
        label,
        icon,
        order: groupOrder,
        keywords: keywords || [],
        is_active: true,
      },
    });
  } catch (error) {
    console.error('Error creating category group:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create category group' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/category-groups - Update a group
export async function PUT(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, label, icon, order, keywords, is_active } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Group ID is required' },
        { status: 400 }
      );
    }

    const collection = await getCollection('category_groups');

    const updateData: Partial<CategoryGroupDoc> = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name;
    if (label !== undefined) updateData.label = label;
    if (icon !== undefined) updateData.icon = icon;
    if (order !== undefined) updateData.order = order;
    if (keywords !== undefined) updateData.keywords = keywords;
    if (is_active !== undefined) updateData.is_active = is_active;

    const result = await collection.updateOne(
      { _id: toObjectId(id) as any },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category group updated',
    });
  } catch (error) {
    console.error('Error updating category group:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update category group' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/category-groups - Delete a group
export async function DELETE(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Group ID is required' },
        { status: 400 }
      );
    }

    const collection = await getCollection('category_groups');
    const result = await collection.deleteOne({ _id: toObjectId(id) as any });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Category group deleted',
    });
  } catch (error) {
    console.error('Error deleting category group:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete category group' },
      { status: 500 }
    );
  }
}
