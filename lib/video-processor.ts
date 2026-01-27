/**
 * Video Processing with FFmpeg
 * Handles server-side video processing with text overlay
 * Optimized for lossless/near-lossless quality
 */

import { spawn } from 'child_process';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { VideoJobData, VideoJobResult } from './video-queue';
import { uploadFile, getDownloadUrl, generateVideoKey, deleteFile } from './storage';

// Find FFmpeg binary
const findFfmpegPath = (): string | null => {
  // Method 1: ffmpeg-static package
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {
    // Continue to other methods
  }

  // Method 2: Environment variable
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // Method 3: System FFmpeg
  try {
    const { execSync } = require('child_process');
    const systemPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
    if (systemPath && existsSync(systemPath)) {
      return systemPath;
    }
  } catch {
    // Continue
  }

  // Method 4: Common paths
  const commonPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];
  for (const p of commonPaths) {
    if (existsSync(p)) return p;
  }

  return null;
};

const ffmpegPath = findFfmpegPath();

if (!ffmpegPath) {
  console.warn('[VideoProcessor] FFmpeg not found. Video processing will fail.');
}

/**
 * Download file from storage to local temp file
 */
async function downloadFromStorage(key: string, localPath: string): Promise<void> {
  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
  const { createWriteStream } = require('fs');
  const { pipeline } = require('stream/promises');
  
  const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT;
  const STORAGE_REGION = process.env.STORAGE_REGION || process.env.S3_REGION || 'us-east-1';
  const STORAGE_BUCKET = process.env.STORAGE_BUCKET || process.env.S3_BUCKET || 'quote-swipe-videos';
  const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
  const STORAGE_FORCE_PATH_STYLE = process.env.STORAGE_FORCE_PATH_STYLE === 'true' || !!STORAGE_ENDPOINT;
  
  const s3Client = new S3Client({
    region: STORAGE_REGION,
    endpoint: STORAGE_ENDPOINT,
    credentials: STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY ? {
      accessKeyId: STORAGE_ACCESS_KEY_ID,
      secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
    } : undefined,
    forcePathStyle: STORAGE_FORCE_PATH_STYLE,
  });

  const command = new GetObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (response.Body) {
    const writeStream = createWriteStream(localPath);
    await pipeline(response.Body as any, writeStream);
  } else {
    throw new Error('No body in S3 response');
  }
}

/**
 * Create text overlay image using canvas
 */
async function createTextOverlay(
  textSettings: VideoJobData['textSettings'],
  videoWidth: number,
  videoHeight: number,
  outputPath: string
): Promise<void> {
  const { createCanvas } = require('canvas');
  
  if (!textSettings) {
    throw new Error('Text settings required for overlay');
  }

  const canvas = createCanvas(videoWidth, videoHeight);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, videoWidth, videoHeight);

  // Draw gradient overlay for text readability
  const gradient = ctx.createLinearGradient(0, 0, 0, videoHeight);
  gradient.addColorStop(0, 'rgba(0,0,0,0.25)');
  gradient.addColorStop(0.35, 'rgba(0,0,0,0.05)');
  gradient.addColorStop(0.65, 'rgba(0,0,0,0.05)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, videoWidth, videoHeight);

  // Calculate text position
  const baseFontSize = Math.floor(videoWidth * 0.045);
  const fontSize = Math.floor(baseFontSize * (textSettings.fontSize / 100));
  const fontWeight = textSettings.isBold ? '700' : '600';
  const fontStyle = textSettings.isItalic ? 'italic' : 'normal';
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${textSettings.fontFamily}", serif`;
  ctx.fillStyle = textSettings.color;

  // Set text alignment
  ctx.textAlign = textSettings.alignment === 'left' ? 'left' : 
                   textSettings.alignment === 'right' ? 'right' : 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  if (textSettings.shadowEnabled) {
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Calculate position
  const textX = textSettings.position.x;
  const textY = textSettings.position.y;
  const maxWidth = videoWidth * 0.85;

  // Wrap text
  const words = textSettings.text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Draw text lines
  const lineHeight = fontSize * 1.5;
  const totalHeight = lines.length * lineHeight;
  let startY = textY - totalHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineHeight);
  });

  // Draw underline if enabled
  if (textSettings.isUnderline && lines.length > 0) {
    ctx.save();
    ctx.strokeStyle = textSettings.color;
    ctx.lineWidth = Math.max(2, fontSize * 0.05);
    const underlineY = textY + (lines.length * lineHeight / 2) + fontSize * 0.2;
    const underlineWidth = Math.min(maxWidth, ctx.measureText(textSettings.text).width);
    let underlineX = textX;
    if (textSettings.alignment === 'center') {
      underlineX = textX - underlineWidth / 2;
    } else if (textSettings.alignment === 'right') {
      underlineX = textX - underlineWidth;
    }
    ctx.beginPath();
    ctx.moveTo(underlineX, underlineY);
    ctx.lineTo(underlineX + underlineWidth, underlineY);
    ctx.stroke();
    ctx.restore();
  }

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
}

/**
 * Process video job with FFmpeg
 */
export async function processVideoJob(
  data: VideoJobData,
  progressCallback?: (progress: number) => void
): Promise<VideoJobResult> {
  if (!ffmpegPath) {
    throw new Error('FFmpeg not available');
  }

  const tempDir = join(tmpdir(), `video-job-${data.jobId}`);
  const tempFiles: string[] = [];

  try {
    // Create temp directory
    mkdirSync(tempDir, { recursive: true });

    // Download input video from storage
    const inputVideoPath = join(tempDir, 'input.mp4');
    console.log(`[VideoProcessor] Downloading input video: ${data.inputVideoKey}`);
    progressCallback?.(10);
    await downloadFromStorage(data.inputVideoKey, inputVideoPath);
    tempFiles.push(inputVideoPath);
    progressCallback?.(20);

    // Get video dimensions (needed for overlay)
    const videoInfo = await getVideoInfo(inputVideoPath);
    const videoWidth = videoInfo.width;
    const videoHeight = videoInfo.height;
    const duration = videoInfo.duration;

    // Create overlay if text settings provided
    let overlayPath: string | null = null;
    if (data.textSettings) {
      overlayPath = join(tempDir, 'overlay.png');
      console.log(`[VideoProcessor] Creating text overlay`);
      progressCallback?.(30);
      
      // Calculate text position based on settings
      let textX: number;
      let textY: number;
      
      // Get position type from textSettings (stored in upload route)
      const positionType = (data.textSettings as any)?.positionType || 'center';
      const alignmentType = data.textSettings.alignment || 'center';
      const offsetX = data.textSettings.position.x || 0; // Fine position offset
      
      // Calculate Y position based on position type
      switch (positionType) {
        case 'top':
          textY = videoHeight * 0.25;
          break;
        case 'bottom':
          textY = videoHeight * 0.70;
          break;
        default:
          textY = videoHeight * 0.45;
      }

      // Calculate X position based on alignment
      switch (alignmentType) {
        case 'left':
          textX = videoWidth * 0.08;
          break;
        case 'right':
          textX = videoWidth * 0.92;
          break;
        default:
          textX = videoWidth / 2;
      }
      
      // Apply fine position offset (offsetX is percentage: -50 to 50)
      textX += (offsetX / 100) * videoWidth;

      await createTextOverlay(
        {
          ...data.textSettings,
          position: { x: textX, y: textY },
        },
        videoWidth,
        videoHeight,
        overlayPath
      );
      tempFiles.push(overlayPath);
    }

    // Output path
    const outputPath = join(tempDir, 'output.mp4');
    tempFiles.push(outputPath);

    // Build FFmpeg command for lossless/near-lossless quality
    const args: string[] = [
      '-y', // Overwrite output
      '-threads', '0', // Use all CPU cores
      '-i', inputVideoPath, // Input video
    ];

    if (overlayPath) {
      args.push('-i', overlayPath); // Overlay image
      args.push(
        '-filter_complex',
        '[0:v][1:v]overlay=0:0:format=auto', // Overlay filter
        '-c:v', 'libx264', // Video codec
        '-preset', 'slow', // Slower preset = better quality (for lossless)
        '-crf', '18', // CRF 18 = visually lossless (lower = better quality, 0 = lossless but huge files)
        '-pix_fmt', 'yuv420p', // Compatible pixel format
        '-c:a', 'copy', // Copy audio (no re-encode = faster + lossless)
        '-movflags', '+faststart', // Optimize for web streaming
      );
    } else {
      // No overlay - just copy (lossless)
      args.push('-c', 'copy');
    }

    args.push(outputPath);

    // Run FFmpeg
    console.log(`[VideoProcessor] Processing video with FFmpeg`);
    progressCallback?.(40);
    await runFFmpeg(args, (progress) => {
      // FFmpeg progress: 40% to 90%
      progressCallback?.(40 + Math.floor(progress * 0.5));
    });
    progressCallback?.(90);

    // Upload output to storage
    const outputBuffer = readFileSync(outputPath);
    const fileSize = outputBuffer.length;
    
    console.log(`[VideoProcessor] Uploading output video: ${data.outputVideoKey}`);
    progressCallback?.(95);
    await uploadFile(data.outputVideoKey, outputBuffer, 'video/mp4', {
      jobId: data.jobId,
      duration: duration.toString(),
      fileSize: fileSize.toString(),
    });

    // Generate download URL (valid for 1 hour)
    const downloadUrl = await getDownloadUrl(data.outputVideoKey, 3600);
    progressCallback?.(100);

    // Cleanup temp files
    for (const file of tempFiles) {
      try {
        unlinkSync(file);
      } catch {
        // Ignore cleanup errors
      }
    }
    try {
      const { readdirSync, rmdirSync } = require('fs');
      const files = readdirSync(tempDir);
      for (const f of files) {
        try {
          unlinkSync(join(tempDir, f));
        } catch {
          // Ignore
        }
      }
      rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }

    return {
      jobId: data.jobId,
      outputVideoKey: data.outputVideoKey,
      downloadUrl,
      duration,
      fileSize,
    };
  } catch (error) {
    // Cleanup on error
    for (const file of tempFiles) {
      try {
        unlinkSync(file);
      } catch {
        // Ignore
      }
    }

    console.error('[VideoProcessor] Error:', error);
    throw error;
  }
}

/**
 * Run FFmpeg command with progress tracking
 */
function runFFmpeg(args: string[], progressCallback?: (progress: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg not available'));
      return;
    }

    const ffmpeg = spawn(ffmpegPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    let duration = 0;
    let currentTime = 0;

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;

      // Parse duration from FFmpeg output
      if (!duration) {
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1], 10);
          const minutes = parseInt(durationMatch[2], 10);
          const seconds = parseInt(durationMatch[3], 10);
          const centiseconds = parseInt(durationMatch[4], 10);
          duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        }
      }

      // Parse current time from FFmpeg output
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch && duration) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const seconds = parseInt(timeMatch[3], 10);
        const centiseconds = parseInt(timeMatch[4], 10);
        currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;

        // Calculate progress (0-100)
        const progress = Math.min(100, Math.floor((currentTime / duration) * 100));
        progressCallback?.(progress);
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        progressCallback?.(100);
        resolve();
      } else {
        reject(new Error(`FFmpeg error: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Get video info (width, height, duration)
 */
async function getVideoInfo(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('FFmpeg not available'));
      return;
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-i', videoPath,
      '-hide_banner',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', () => {
      // Parse video info from stderr
      const widthMatch = stderr.match(/Video:.*?(\d+)x(\d+)/);
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);

      if (!widthMatch) {
        reject(new Error('Could not parse video dimensions'));
        return;
      }

      const width = parseInt(widthMatch[1], 10);
      const height = parseInt(widthMatch[2], 10);
      let duration = 0;

      if (durationMatch) {
        const hours = parseInt(durationMatch[1], 10);
        const minutes = parseInt(durationMatch[2], 10);
        const seconds = parseInt(durationMatch[3], 10);
        const centiseconds = parseInt(durationMatch[4], 10);
        duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
      }

      resolve({ width, height, duration });
    });

    ffmpeg.on('error', reject);
  });
}

export default processVideoJob;
