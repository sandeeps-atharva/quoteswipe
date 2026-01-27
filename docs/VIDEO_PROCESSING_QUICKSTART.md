# Video Processing Quick Start

## Installation

1. **Install dependencies:**
```bash
npm install
```

This will install:
- `@aws-sdk/client-s3` - Cloud storage

**Note:** The system uses MongoDB for job queue (no Redis needed!)

2. **Setup Cloud Storage:**

Create `.env.local`:
```env
# MongoDB (already configured)
MONGODB_URI=your-mongodb-uri
MONGODB_DB=quoteswipe

# Storage (choose one)

# AWS S3
STORAGE_REGION=us-east-1
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret

# OR Cloudflare R2
STORAGE_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET=your-bucket-name
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret
STORAGE_FORCE_PATH_STYLE=true
```

4. **Start the system:**

Terminal 1 - Next.js:
```bash
npm run dev
```

Terminal 2 - Video Worker:
```bash
npm run video-worker
```

## Usage

The frontend (`QuoteReelModal`) now automatically uses server-side processing when you upload a video and add text overlay.

## API Examples

### Upload Video
```javascript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('quoteText', 'Your quote text');
formData.append('textSettings', JSON.stringify({
  fontSize: 100,
  fontFamily: 'Georgia',
  color: '#ffffff',
  alignment: 'center',
  shadowEnabled: true,
}));
formData.append('quality', '1080p');

const response = await fetch('/api/video/upload', {
  method: 'POST',
  body: formData,
});

const { jobId } = await response.json();
```

### Check Status
```javascript
const response = await fetch(`/api/video/status/${jobId}`);
const { state, progress, result } = await response.json();

if (state === 'completed') {
  // Get download URL
  const downloadRes = await fetch(`/api/video/download/${jobId}`);
  const { downloadUrl } = await downloadRes.json();
  // Use downloadUrl to download video
}
```

## Architecture

```
User Uploads Video
    ↓
POST /api/video/upload
    ↓
Video Stored in Cloud Storage
    ↓
Job Added to Redis Queue
    ↓
Worker Processes Job (FFmpeg)
    ↓
Processed Video Uploaded to Storage
    ↓
User Polls Status
    ↓
GET /api/video/download/[jobId]
    ↓
Presigned Download URL
```

## FFmpeg Quality

- **CRF 18**: Visually lossless (default)
- **Preset**: Slow (best quality)
- **Audio**: Copy (lossless)

For true lossless, edit `lib/video-processor.ts`:
- Change `-crf 18` to `-crf 0`
- Change `-preset slow` to `-preset veryslow`

## Troubleshooting

**FFmpeg not found:**
```bash
which ffmpeg
# Install if missing: brew install ffmpeg
```

**Redis connection failed:**
```bash
redis-cli ping
# Should return: PONG
```

**Jobs stuck:**
- Check worker is running: `npm run video-worker`
- Check Redis: `redis-cli ping`
- Check logs in console

## Production Deployment

1. **Use managed Redis** (Upstash, Redis Cloud, AWS ElastiCache)
2. **Use managed storage** (S3, R2, Spaces)
3. **Run worker separately** or use serverless functions
4. **Set up monitoring** for queue and worker health
5. **Configure auto-scaling** based on queue length

See `VIDEO_PROCESSING_SETUP.md` for detailed production setup.
