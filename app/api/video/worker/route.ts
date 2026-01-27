/**
 * Video Worker API Endpoint
 * This endpoint processes video jobs from MongoDB queue
 * Can be called periodically or via cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { processVideoQueue } from '@/lib/video-queue';

export async function POST(request: NextRequest) {
  try {
    // Process queue (non-blocking)
    // Note: This will process jobs synchronously in the request handler
    // For production, use the standalone worker script instead
    processVideoQueue().catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Video processing started. Jobs will be processed from MongoDB queue.',
    });

  } catch (error) {
    console.error('[VideoWorker] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start processing' },
      { status: 500 }
    );
  }
}

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';
