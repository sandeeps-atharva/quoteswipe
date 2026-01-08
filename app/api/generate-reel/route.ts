import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync, statSync, readdirSync, rmdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawn } from 'child_process';

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

export async function POST(request: NextRequest) {
  if (!ffmpegPath) {
    return NextResponse.json({ error: 'FFmpeg not available' }, { status: 500 });
  }

  const tempDir = join(tmpdir(), `reel-${Date.now()}`);
  const tempFiles: string[] = [];

  try {
    // Create temp directory
    mkdirSync(tempDir, { recursive: true });

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const overlayFile = formData.get('overlay') as File;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Save video to temp file
    const videoPath = join(tempDir, 'input.mp4');
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    writeFileSync(videoPath, videoBuffer);
    tempFiles.push(videoPath);

    // Save overlay if provided
    let overlayPath: string | null = null;
    if (overlayFile) {
      overlayPath = join(tempDir, 'overlay.png');
      const overlayBuffer = Buffer.from(await overlayFile.arrayBuffer());
      writeFileSync(overlayPath, overlayBuffer);
      tempFiles.push(overlayPath);
    }

    // Output path
    const outputPath = join(tempDir, 'output.mp4');
    tempFiles.push(outputPath);

    // Build FFmpeg command - OPTIMIZED for speed + quality
    const args: string[] = [
      '-y', // Overwrite output
      '-threads', '0', // Use all CPU cores
      '-i', videoPath, // Input video
    ];

    if (overlayPath) {
      args.push('-i', overlayPath); // Overlay image
      args.push(
        '-filter_complex',
        '[0:v][1:v]overlay=0:0:format=auto', // Overlay filter
        '-c:v', 'libx264', // Video codec
        '-preset', 'ultrafast', // FASTEST encoding (still good quality)
        '-tune', 'zerolatency', // Minimize latency
        '-crf', '18', // High quality (visually lossless)
        '-pix_fmt', 'yuv420p', // Compatible pixel format
        '-c:a', 'copy', // COPY audio (no re-encode = instant)
        '-movflags', '+faststart', // Optimize for web streaming
      );
    } else {
      args.push('-c', 'copy');
    }

    args.push(outputPath);

    // Run FFmpeg with optimized settings
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg error: ${stderr.slice(-500)}`));
        }
      });

      ffmpeg.on('error', reject);
    });

    // Read output file and stream as binary (not base64 - 33% smaller!)
    const outputStats = statSync(outputPath);
    const outputBuffer = readFileSync(outputPath);

    // Cleanup temp files
    for (const file of tempFiles) {
      try { unlinkSync(file); } catch { /* ignore */ }
    }
    try { 
      const files = readdirSync(tempDir);
      for (const f of files) {
        try { unlinkSync(join(tempDir, f)); } catch { /* ignore */ }
      }
      rmdirSync(tempDir);
    } catch { /* ignore */ }

    // Return as binary stream (faster download than base64)
    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': outputStats.size.toString(),
        'Content-Disposition': `attachment; filename="quote-reel-${Date.now()}.mp4"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    // Cleanup on error
    for (const file of tempFiles) {
      try { unlinkSync(file); } catch { /* ignore */ }
    }

    console.error('FFmpeg error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Video processing failed' },
      { status: 500 }
    );
  }
}

export const maxDuration = 120; // 2 minutes max for larger videos
export const dynamic = 'force-dynamic';
