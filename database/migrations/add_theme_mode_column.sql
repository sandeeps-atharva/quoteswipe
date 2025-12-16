-- Migration: Add theme_mode column to user_preferences table
-- Run this migration to enable user-specific dark mode preference

-- Add theme_mode column (stores 'light' or 'dark')
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10) DEFAULT 'light';

-- Verify the changes
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user_preferences' 
AND COLUMN_NAME = 'theme_mode';

