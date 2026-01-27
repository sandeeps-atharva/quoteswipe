# Video Processing Setup Guide

This document explains how to set up and use the server-side video processing system for the QuoteSwipe app.

## Architecture Overview

The video processing system uses:
- **FFmpeg** for server-side video processing (lossless/near-lossless quality)
- **MongoDB** for async job queue (handles concurrent users, no Redis needed)
- **Cloud Storage** (S3/R2 compatible) for storing videos
- **Presigned URLs** for secure downloads

## Workflow

1. **Upload**: User uploads video → Stored in cloud storage → Job created in queue
2. **Processing**: Worker picks up job → Downloads video → Processes with FFmpeg → Uploads result
3. **Download**: User polls status → Gets presigned download URL when ready

## Prerequisites

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `bullmq` - Job queue
- `ioredis` - Redis client
- `@aws-sdk/client-s3` - S3/R2 storage
- `fluent-ffmpeg` - FFmpeg wrapper (already installed)
- `ffmpeg-static` - Static FFmpeg binary (already installed)

### 2. Setup Cloud Storage

**Note:** The system uses MongoDB for job queue management, so no Redis setup is needed!

**Option A: AWS S3**
```env
STORAGE_ENDPOINT=
STORAGE_REGION=us-east-1
STORAGE_BUCKET=quote-swipe-videos
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_FORCE_PATH_STYLE=false
STORAGE_PUBLIC_URL=https://your-bucket.s3.us-east-1.amazonaws.com
```

**Option B: Cloudflare R2**
```env
STORAGE_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=quote-swipe-videos
STORAGE_ACCESS_KEY_ID=your-r2-access-key
STORAGE_SECRET_ACCESS_KEY=your-r2-secret-key
STORAGE_FORCE_PATH_STYLE=true
STORAGE_PUBLIC_URL=https://your-bucket.your-domain.com
```

**Option C: DigitalOcean Spaces**
```env
STORAGE_ENDPOINT=https://nyc3.digitaloceanspaces.com
STORAGE_REGION=nyc3
STORAGE_BUCKET=quote-swipe-videos
STORAGE_ACCESS_KEY_ID=your-spaces-key
STORAGE_SECRET_ACCESS_KEY=your-spaces-secret
STORAGE_FORCE_PATH_STYLE=false
STORAGE_PUBLIC_URL=https://quote-swipe-videos.nyc3.digitaloceanspaces.com
```

### 3. Environment Variables

Create a `.env.local` file:

```env
# MongoDB (already configured for your app)
MONGODB_URI=your-mongodb-uri
MONGODB_DB=quoteswipe

# Storage (see options above)
STORAGE_ENDPOINT=
STORAGE_REGION=us-east-1
STORAGE_BUCKET=quote-swipe-videos
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_FORCE_PATH_STYLE=false
STORAGE_PUBLIC_URL=

# FFmpeg (optional - auto-detected)
FFMPEG_PATH=/usr/bin/ffmpeg

# Worker concurrency (optional)
VIDEO_WORKER_CONCURRENCY=2
```

## Running the System

### Development Mode

1. **Start Next.js dev server**:
```bash
npm run dev
```

3. **Start video worker** (in separate terminal):
```bash
npm run video-worker
```

### Production Mode

#### Option 1: Separate Worker Process

Run the worker as a separate process/server:

```bash
# Build
npm run build

# Start Next.js
npm start

# Start worker (separate process)
npm run video-worker
```

#### Option 2: API Endpoint Worker

The worker can also be started via API endpoint (useful for serverless):

```bash
# POST to start worker
curl -X POST http://localhost:3000/api/video/worker

# DELETE to stop worker
curl -X DELETE http://localhost:3000/api/video/worker
```

#### Option 3: Cron Job (Recommended for Production)

Set up a cron job to periodically check and process jobs:

```bash
# Every minute
* * * * * curl -X POST https://your-domain.com/api/video/worker
```

Or use a service like:
- Vercel Cron Jobs
- GitHub Actions
- AWS Lambda + EventBridge

## API Endpoints

### 1. Upload Video
```
POST /api/video/upload
Content-Type: multipart/form-data

FormData:
- video: File (required)
- quoteText: string (optional)
- textSettings: JSON string (optional)
- quality: '720p' | '1080p' | '4k' (optional, default: '1080p')

Response:
{
  "success": true,
  "jobId": "video-1234567890-abc123",
  "status": "queued"
}
```

### 2. Check Status
```
GET /api/video/status/[jobId]

Response:
{
  "success": true,
  "jobId": "video-1234567890-abc123",
  "state": "completed" | "active" | "waiting" | "failed",
  "progress": 85,
  "result": {
    "jobId": "...",
    "outputVideoKey": "...",
    "downloadUrl": "...",
    "duration": 30.5,
    "fileSize": 5242880
  },
  "error": null
}
```

### 3. Get Download URL
```
GET /api/video/download/[jobId]

Response:
{
  "success": true,
  "downloadUrl": "https://...",
  "duration": 30.5,
  "fileSize": 5242880,
  "expiresIn": 3600
}
```

## FFmpeg Quality Settings

The system uses these FFmpeg settings for lossless/near-lossless quality:

- **Codec**: `libx264`
- **Preset**: `slow` (better quality, slower encoding)
- **CRF**: `18` (visually lossless, lower = better quality)
- **Pixel Format**: `yuv420p` (compatible with all players)
- **Audio**: `copy` (no re-encoding = lossless)

For true lossless (larger files):
- Change `-crf 18` to `-crf 0` (lossless)
- Change `-preset slow` to `-preset veryslow` (best compression)

## Performance Optimization

### Concurrency
- **Worker Concurrency**: Set `VIDEO_WORKER_CONCURRENCY` (default: 2)
- **Queue Limiter**: Max 10 jobs per minute (configurable in `lib/video-queue.ts`)

### Storage
- Use CDN for public URLs (Cloudflare, CloudFront)
- Enable compression on storage bucket
- Set appropriate cache headers

### MongoDB
- Uses existing MongoDB connection (already configured)
- Jobs stored in `video_jobs` collection
- Automatic cleanup of old jobs

## Error Handling

The system handles:
- Invalid file formats
- File size limits (500MB max)
- FFmpeg errors
- Storage errors
- Network timeouts
- Job failures (3 retries with exponential backoff)

## Monitoring

### Check MongoDB Health
```typescript
import { getDb } from '@/lib/db';
const db = await getDb();
await db.command({ ping: 1 });
```

### Check Queue Status
```typescript
import { getDb } from '@/lib/db';

const db = await getDb();
const collection = db.collection('video_jobs');

const waiting = await collection.countDocuments({ state: 'waiting' });
const active = await collection.countDocuments({ state: 'active' });
const completed = await collection.countDocuments({ state: 'completed' });
const failed = await collection.countDocuments({ state: 'failed' });
```

### Check Worker Status
The worker logs all events:
- Job started
- Job completed
- Job failed
- Worker errors

## Troubleshooting

### FFmpeg Not Found
```bash
# Check if FFmpeg is installed
which ffmpeg

# Install FFmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Set custom path
export FFMPEG_PATH=/usr/bin/ffmpeg
```

### MongoDB Connection Failed
- Check MongoDB connection string in `.env.local`
- Verify MongoDB is accessible
- Check firewall/network settings

### Storage Upload Failed
- Verify credentials are correct
- Check bucket exists and is accessible
- Verify endpoint URL is correct
- Check IAM permissions (for S3)

### Jobs Stuck in Queue
- Check worker is running: `npm run video-worker`
- Check MongoDB connection
- Check worker logs for errors
- Verify FFmpeg is working
- Check `video_jobs` collection in MongoDB

## Cost Estimation

### Storage Costs
- **S3**: ~$0.023/GB/month
- **R2**: $0.015/GB/month (no egress fees)
- **Spaces**: ~$0.02/GB/month

### Processing Costs
- **Server**: Depends on instance type
- **FFmpeg**: CPU-intensive, use multi-core instances
- **Worker**: Can run on separate instance or serverless

### Example (1000 videos/month, 50MB each)
- Storage: 50GB × $0.023 = $1.15/month
- Processing: ~$5-10/month (depends on instance)

## Security

- Videos are stored in private buckets
- Presigned URLs expire after 1 hour
- Jobs are user-scoped (optional)
- File size limits prevent abuse
- Rate limiting on queue (10 jobs/minute)

## Scaling

### Horizontal Scaling
- Run multiple worker instances
- Use load balancer for API
- Use Redis Cluster for high availability

### Vertical Scaling
- Increase worker concurrency
- Use faster CPU instances
- Use SSD storage for temp files

## Support

For issues or questions:
1. Check logs in console
2. Check Redis queue status
3. Verify environment variables
4. Test FFmpeg manually: `ffmpeg -version`
