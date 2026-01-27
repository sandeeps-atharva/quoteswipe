/**
 * MongoDB-based Job Queue for Video Processing
 * Uses MongoDB collections instead of Redis for job management
 */

import { getDb } from './db';
import { processVideoJob } from './video-processor';
import { ObjectId, Collection } from 'mongodb';

// Job states
export type JobState = 'waiting' | 'active' | 'completed' | 'failed';

// Job data interface
export interface VideoJobData {
  jobId: string;
  userId?: string;
  inputVideoKey: string; // Storage key for input video
  outputVideoKey: string; // Storage key for output video
  overlayKey?: string; // Storage key for overlay image (if text overlay)
  textSettings?: {
    text: string;
    position: { x: number; y: number };
    fontSize: number;
    fontFamily: string;
    color: string;
    alignment: 'left' | 'center' | 'right';
    shadowEnabled: boolean;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
  };
  quality?: '720p' | '1080p' | '4k';
}

// Job result interface
export interface VideoJobResult {
  jobId: string;
  outputVideoKey: string;
  downloadUrl: string;
  duration: number;
  fileSize: number;
}

// Job document in MongoDB
interface VideoJobDocument {
  _id: ObjectId;
  jobId: string;
  userId?: string;
  state: JobState;
  progress: number;
  data: VideoJobData;
  result?: VideoJobResult;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  priority: number;
}

const COLLECTION_NAME = 'video_jobs';
const MAX_ATTEMPTS = 3;
const WORKER_CONCURRENCY = parseInt(process.env.VIDEO_WORKER_CONCURRENCY || '2', 10);
const POLL_INTERVAL = 2000; // Poll every 2 seconds

/**
 * Get video jobs collection
 */
async function getVideoJobsCollection(): Promise<Collection<VideoJobDocument>> {
  const db = await getDb();
  return db.collection<VideoJobDocument>(COLLECTION_NAME);
}

/**
 * Add a video processing job to the queue
 */
export async function addVideoJob(data: VideoJobData): Promise<{ id: string; jobId: string }> {
  const collection = await getVideoJobsCollection();

  // Create job document
  const jobDoc: Omit<VideoJobDocument, '_id'> = {
    jobId: data.jobId,
    userId: data.userId,
    state: 'waiting',
    progress: 0,
    data,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    createdAt: new Date(),
    updatedAt: new Date(),
    priority: data.quality === '4k' ? 1 : 5, // Lower number = higher priority
  };

  const result = await collection.insertOne(jobDoc as VideoJobDocument);

  // Create index for efficient querying
  await collection.createIndex({ state: 1, priority: 1, createdAt: 1 });
  await collection.createIndex({ jobId: 1 }, { unique: true });

  return {
    id: result.insertedId.toString(),
    jobId: data.jobId,
  };
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<{
  id: string;
  state: JobState;
  progress?: number;
  result?: VideoJobResult;
  error?: string;
} | null> {
  const collection = await getVideoJobsCollection();

  const job = await collection.findOne({ jobId });

  if (!job) {
    return null;
  }

  return {
    id: job._id.toString(),
    state: job.state,
    progress: job.progress,
    result: job.result,
    error: job.error,
  };
}

/**
 * Get next waiting job (for worker)
 */
async function getNextJob(): Promise<VideoJobDocument | null> {
  const collection = await getVideoJobsCollection();

  // Find and update: get waiting job and mark as active
  const result = await collection.findOneAndUpdate(
    {
      state: 'waiting',
      attempts: { $lt: MAX_ATTEMPTS },
    },
    {
      $set: {
        state: 'active',
        startedAt: new Date(),
        updatedAt: new Date(),
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      sort: { priority: 1, createdAt: 1 }, // Higher priority first, then oldest first
      returnDocument: 'after',
    }
  );

  return result || null;
}

/**
 * Update job progress
 */
async function updateJobProgress(jobId: string, progress: number): Promise<void> {
  const collection = await getVideoJobsCollection();

  await collection.updateOne(
    { jobId },
    {
      $set: {
        progress,
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Mark job as completed
 */
async function completeJob(jobId: string, result: VideoJobResult): Promise<void> {
  const collection = await getVideoJobsCollection();

  await collection.updateOne(
    { jobId },
    {
      $set: {
        state: 'completed',
        progress: 100,
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

/**
 * Mark job as failed
 */
async function failJob(jobId: string, error: string): Promise<void> {
  const collection = await getVideoJobsCollection();

  const job = await collection.findOne({ jobId });
  if (!job) return;

  // If max attempts reached, mark as failed permanently
  // Otherwise, mark as waiting for retry
  const newState = job.attempts >= MAX_ATTEMPTS ? 'failed' : 'waiting';

  await collection.updateOne(
    { jobId },
    {
      $set: {
        state: newState,
        error,
        updatedAt: new Date(),
        ...(newState === 'failed' ? { completedAt: new Date() } : {}),
      },
    }
  );
}

/**
 * Process a single job
 */
async function processJob(job: VideoJobDocument): Promise<void> {
  console.log(`[VideoWorker] Processing job ${job.jobId}`);

  try {
    // Update progress callback
    const progressCallback = (progress: number) => {
      updateJobProgress(job.jobId, progress).catch(console.error);
    };

    // Process video (with progress updates)
    const result = await processVideoJob(job.data, progressCallback);

    // Mark as completed
    await completeJob(job.jobId, result);
    console.log(`[VideoWorker] Job ${job.jobId} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[VideoWorker] Job ${job.jobId} failed:`, errorMessage);
    await failJob(job.jobId, errorMessage);
  }
}

/**
 * Worker function - processes jobs from MongoDB
 * Runs continuously until stopped
 */
export async function processVideoQueue(): Promise<void> {
  const activeJobs = new Set<string>();
  let isRunning = true;

  console.log('[VideoWorker] Starting video processing worker...');
  console.log(`[VideoWorker] Concurrency: ${WORKER_CONCURRENCY}`);

  const processNext = async (): Promise<void> => {
    if (!isRunning) {
      if (activeJobs.size === 0) {
        console.log('[VideoWorker] All jobs completed, shutting down');
      }
      return;
    }

    // Check if we can process more jobs
    if (activeJobs.size >= WORKER_CONCURRENCY) {
      setTimeout(() => processNext(), POLL_INTERVAL);
      return;
    }

    try {
      // Get next job
      const job = await getNextJob();

      if (!job) {
        // No jobs available, wait and retry
        setTimeout(() => processNext(), POLL_INTERVAL);
        return;
      }

      // Process job asynchronously
      activeJobs.add(job.jobId);
      processJob(job)
        .finally(() => {
          activeJobs.delete(job.jobId);
          // Process next job immediately
          setTimeout(() => processNext(), 100);
        });

      // Process next job immediately (if concurrency allows)
      setTimeout(() => processNext(), 100);
    } catch (error) {
      console.error('[VideoWorker] Error in processNext:', error);
      // Retry after delay
      setTimeout(() => processNext(), POLL_INTERVAL);
    }
  };

  // Handle shutdown
  const shutdown = () => {
    console.log('[VideoWorker] Shutting down gracefully...');
    isRunning = false;
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start processing loop
  processNext();

  // Keep process alive (return never resolves)
  return new Promise(() => {
    // Process will run indefinitely until SIGTERM/SIGINT
  });
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const collection = await getVideoJobsCollection();

  const result = await collection.updateOne(
    { jobId, state: { $in: ['waiting', 'active'] } },
    {
      $set: {
        state: 'failed',
        error: 'Cancelled by user',
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Cleanup old jobs (run periodically)
 */
export async function cleanupOldJobs(): Promise<void> {
  const collection = await getVideoJobsCollection();
  const now = new Date();

  // Delete completed jobs older than 24 hours
  const completedCutoff = new Date(now.getTime() - 24 * 3600 * 1000);
  await collection.deleteMany({
    state: 'completed',
    completedAt: { $lt: completedCutoff },
  });

  // Delete failed jobs older than 7 days
  const failedCutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  await collection.deleteMany({
    state: 'failed',
    completedAt: { $lt: failedCutoff },
  });
}

export default {
  addVideoJob,
  getJobStatus,
  processVideoQueue,
  cancelJob,
  cleanupOldJobs,
};
