-- Migration: Add card customization columns to user_preferences table
-- Run this migration to enable card style customization feature

-- Add card_theme_id column (stores the theme ID like 'default', 'cream', 'dark-elegant', etc.)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS card_theme_id VARCHAR(50) DEFAULT 'default';

-- Add card_font_id column (stores the font style ID like 'elegant', 'modern', 'bold', etc.)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS card_font_id VARCHAR(50) DEFAULT 'elegant';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_card_style ON user_preferences (user_id, card_theme_id, card_font_id);

-- Verify the changes
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'user_preferences' 
AND COLUMN_NAME IN ('card_theme_id', 'card_font_id');

