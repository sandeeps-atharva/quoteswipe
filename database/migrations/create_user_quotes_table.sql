-- Create user_quotes table for user-generated quotes (private to each user)
CREATE TABLE IF NOT EXISTS user_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    text TEXT NOT NULL,
    author VARCHAR(255) DEFAULT 'Me',
    category_id INT DEFAULT NULL,
    theme_id VARCHAR(50) DEFAULT 'default',
    font_id VARCHAR(50) DEFAULT 'default',
    background_id VARCHAR(50) DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment for documentation
-- This table stores user-created quotes that are private to each user
-- Users can create, edit, delete, share, and download their own quotes

