/**
 * Video Processing Status API Endpoint
 * Returns the current status of a video processing job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/video-queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    const status = await getJobStatus(jobId);

    if (!status) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: status.id,
      state: status.state,
      progress: status.progress,
      result: status.result,
      error: status.error,
    });

  } catch (error) {
    console.error('[VideoStatus] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get job status' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
