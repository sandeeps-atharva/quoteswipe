/**
 * Cloud Storage Service (S3/R2 Compatible)
 * Handles video uploads and downloads with presigned URLs
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Storage configuration
const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || process.env.S3_ENDPOINT;
const STORAGE_REGION = process.env.STORAGE_REGION || process.env.S3_REGION || 'us-east-1';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || process.env.S3_BUCKET || 'quote-swipe-videos';
const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const STORAGE_FORCE_PATH_STYLE = process.env.STORAGE_FORCE_PATH_STYLE === 'true' || !!STORAGE_ENDPOINT; // R2 requires path-style

// Public URL base (for direct access)
const STORAGE_PUBLIC_URL = process.env.STORAGE_PUBLIC_URL || 
  (STORAGE_ENDPOINT 
    ? `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}` 
    : `https://${STORAGE_BUCKET}.s3.${STORAGE_REGION}.amazonaws.com`);

// Initialize S3 client
const s3Client = new S3Client({
  region: STORAGE_REGION,
  endpoint: STORAGE_ENDPOINT,
  credentials: STORAGE_ACCESS_KEY_ID && STORAGE_SECRET_ACCESS_KEY ? {
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
  } : undefined,
  forcePathStyle: STORAGE_FORCE_PATH_STYLE,
});

/**
 * Upload a file to cloud storage
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
      // Cache control for videos
      CacheControl: contentType.startsWith('video/') ? 'public, max-age=31536000' : 'public, max-age=3600',
    });

    await s3Client.send(command);

    // Return public URL or presigned URL
    return `${STORAGE_PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error('[Storage] Upload error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a presigned download URL (valid for 1 hour by default)
 */
export async function getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('[Storage] Get download URL error:', error);
    throw new Error(`Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get public URL (if bucket is public)
 */
export function getPublicUrl(key: string): string {
  return `${STORAGE_PUBLIC_URL}/${key}`;
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('[Storage] Delete error:', error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key: string): Promise<{ size: number; contentType: string; lastModified: Date } | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
    };
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Generate a unique storage key for videos
 */
export function generateVideoKey(jobId: string, type: 'input' | 'output' | 'overlay'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `videos/${jobId}/${type}-${timestamp}-${random}.mp4`;
}

export default {
  uploadFile,
  getDownloadUrl,
  getPublicUrl,
  fileExists,
  deleteFile,
  getFileMetadata,
  generateVideoKey,
};
