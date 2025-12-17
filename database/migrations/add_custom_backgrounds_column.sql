-- Migration: Add custom_backgrounds column to user_preferences table
-- This allows users to store their uploaded background images as Base64 in the database
-- No file storage needed - works perfectly on Vercel and serverless platforms!

-- Add custom_backgrounds column (LONGTEXT to store Base64 images)
-- Using LONGTEXT because Base64 images can be large
ALTER TABLE user_preferences 
ADD COLUMN custom_backgrounds LONGTEXT DEFAULT NULL;

-- The custom_backgrounds JSON structure:
-- [
--   {
--     "id": "custom_1234567890",
--     "url": "data:image/jpeg;base64,/9j/4AAQ...", -- Base64 data URL
--     "name": "My Photo",
--     "createdAt": 1234567890
--   }
-- ]
--
-- Benefits of Base64 storage:
-- 1. No file system needed (works on Vercel, serverless)
-- 2. Automatic backup with database
-- 3. Works across all servers/instances
-- 4. No external storage services required
--
-- Limits:
-- - Max 5 images per user
-- - Max ~500KB per image (after compression)
-- - Images resized to 800px max width on client

-- Verify the change
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user_preferences' 
AND COLUMN_NAME = 'custom_backgrounds';

