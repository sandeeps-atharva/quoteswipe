#!/usr/bin/env ts-node
/**
 * Standalone Video Processing Worker
 * Run this script separately to process video jobs from MongoDB queue
 * 
 * Usage:
 *   npm run video-worker
 *   or
 *   ts-node scripts/video-worker.ts
 */

import { processVideoQueue } from '../lib/video-queue';

console.log('[VideoWorker] Starting video processing worker...');
console.log('[VideoWorker] Using MongoDB-based job queue');

// Start processing queue (runs indefinitely)
processVideoQueue().catch((error) => {
  console.error('[VideoWorker] Fatal error:', error);
  process.exit(1);
});
