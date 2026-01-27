/**
 * Video Upload API Endpoint
 * Uploads video to cloud storage and creates processing job
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, generateVideoKey } from '@/lib/storage';
import { addVideoJob, VideoJobData } from '@/lib/video-queue';
import { getUserIdFromRequest } from '@/lib/auth';

// Maximum file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Allowed video formats
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime', // MOV
  'video/webm',
  'video/x-msvideo', // AVI
];

export async function POST(request: NextRequest) {
  try {
    // Get user ID (optional - can work for guests too)
    const userId = getUserIdFromRequest(request);

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const quoteText = formData.get('quoteText') as string | null;
    const textSettingsJson = formData.get('textSettings') as string | null;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(videoFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate unique job ID
    const jobId = `video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Upload video to cloud storage
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const inputVideoKey = generateVideoKey(jobId, 'input');
    const outputVideoKey = generateVideoKey(jobId, 'output');

    console.log(`[VideoUpload] Uploading video for job ${jobId}`);
    await uploadFile(inputVideoKey, videoBuffer, videoFile.type, {
      originalName: videoFile.name,
      userId: userId || 'guest',
      jobId,
    });

    // Parse text settings if provided
    let textSettings: VideoJobData['textSettings'] | undefined;
    if (quoteText && textSettingsJson) {
      try {
        const parsed = JSON.parse(textSettingsJson);
        
        // Position: y is 'top' | 'center' | 'bottom', x is offset percentage
        const positionY = parsed.position?.y || 'center';
        const offsetX = parsed.position?.x || 0;
        const alignment = parsed.alignment || 'center';
        
        // Store position - processor will calculate actual coordinates
        textSettings = {
          text: quoteText,
          position: { x: offsetX, y: 0 }, // y will be calculated in processor
          fontSize: parsed.fontSize || 100,
          fontFamily: parsed.fontFamily || 'Georgia',
          color: parsed.color || '#ffffff',
          alignment: alignment as 'left' | 'center' | 'right',
          shadowEnabled: parsed.shadowEnabled !== false,
          isBold: parsed.isBold || false,
          isItalic: parsed.isItalic || false,
          isUnderline: parsed.isUnderline || false,
        };
        
        // Store position type for processor
        (textSettings as any).positionType = positionY;
      } catch (e) {
        console.error('[VideoUpload] Failed to parse text settings:', e);
      }
    }

    // Create video processing job
    const jobData: VideoJobData = {
      jobId,
      userId: userId || undefined,
      inputVideoKey,
      outputVideoKey,
      textSettings,
      quality: (formData.get('quality') as '720p' | '1080p' | '4k') || '1080p',
    };

    const job = await addVideoJob(jobData);

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: 'queued',
      message: 'Video uploaded successfully. Processing started.',
    });

  } catch (error) {
    console.error('[VideoUpload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload video' },
      { status: 500 }
    );
  }
}

export const maxDuration = 300; // 5 minutes for large uploads
export const dynamic = 'force-dynamic';
