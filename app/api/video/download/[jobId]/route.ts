/**
 * Video Download API Endpoint
 * Returns a presigned download URL for the processed video
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobStatus } from '@/lib/video-queue';
import { getDownloadUrl } from '@/lib/storage';

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

    if (status.state !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Video processing not completed',
          state: status.state,
          progress: status.progress,
        },
        { status: 202 } // Accepted - still processing
      );
    }

    if (!status.result) {
      return NextResponse.json(
        { error: 'Job completed but no result available' },
        { status: 500 }
      );
    }

    // Generate new presigned URL (valid for 1 hour)
    const downloadUrl = await getDownloadUrl(status.result.outputVideoKey, 3600);

    return NextResponse.json({
      success: true,
      downloadUrl,
      duration: status.result.duration,
      fileSize: status.result.fileSize,
      expiresIn: 3600, // seconds
    });

  } catch (error) {
    console.error('[VideoDownload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get download URL' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
