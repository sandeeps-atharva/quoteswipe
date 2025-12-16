-- Add is_public column to user_quotes table
-- Private (0) = Only creator can see
-- Public (1) = Visible to all users in the feed

ALTER TABLE user_quotes 
ADD COLUMN is_public TINYINT(1) DEFAULT 0 AFTER background_id,
ADD INDEX idx_is_public (is_public);

-- Optional: Add status column for moderation (future use)
-- ALTER TABLE user_quotes ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved';

