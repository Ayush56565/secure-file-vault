package utils

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func ConnectDB() (*sql.DB, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://filevault:filevault123@localhost:5433/filevault?sslmode=disable"
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func RunMigrations(db *sql.DB) error {
	migrationSQL := `
	-- Create users table
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		username VARCHAR(50) UNIQUE NOT NULL,
		email VARCHAR(100) UNIQUE NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		is_admin BOOLEAN DEFAULT FALSE,
		storage_quota_mb INTEGER DEFAULT 10,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Create file_hashes table for deduplication
	CREATE TABLE IF NOT EXISTS file_hashes (
		id SERIAL PRIMARY KEY,
		hash_sha256 VARCHAR(64) UNIQUE NOT NULL,
		file_size BIGINT NOT NULL,
		mime_type VARCHAR(100) NOT NULL,
		file_data BYTEA NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Create folders table
	CREATE TABLE IF NOT EXISTS folders (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
		is_public BOOLEAN DEFAULT FALSE,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Create files table
	CREATE TABLE IF NOT EXISTS files (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		hash_id INTEGER REFERENCES file_hashes(id) ON DELETE CASCADE,
		original_name VARCHAR(255) NOT NULL,
		display_name VARCHAR(255) NOT NULL,
		folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,
		is_public BOOLEAN DEFAULT FALSE,
		download_count INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Create file_shares table for specific user sharing
	CREATE TABLE IF NOT EXISTS file_shares (
		id SERIAL PRIMARY KEY,
		file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
		shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		permission VARCHAR(20) DEFAULT 'read',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(file_id, shared_with_user_id)
	);

	-- Create folder_shares table for specific user sharing
	CREATE TABLE IF NOT EXISTS folder_shares (
		id SERIAL PRIMARY KEY,
		folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
		shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		permission VARCHAR(20) DEFAULT 'read',
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(folder_id, shared_with_user_id)
	);

	-- Create file_tags table for tagging system
	CREATE TABLE IF NOT EXISTS file_tags (
		id SERIAL PRIMARY KEY,
		file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
		tag VARCHAR(50) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(file_id, tag)
	);

	-- Create rate_limits table for tracking API usage
	CREATE TABLE IF NOT EXISTS rate_limits (
		id SERIAL PRIMARY KEY,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		endpoint VARCHAR(100) NOT NULL,
		request_count INTEGER DEFAULT 1,
		window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Create indexes for performance
	CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
	CREATE INDEX IF NOT EXISTS idx_files_hash_id ON files(hash_id);
	CREATE INDEX IF NOT EXISTS idx_files_public ON files(is_public);
	CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
	CREATE INDEX IF NOT EXISTS idx_file_hashes_hash ON file_hashes(hash_sha256);
	CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
	CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
	CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
	CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON file_shares(shared_with_user_id);
	CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
	CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag);
	CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);

	-- Create function to update updated_at timestamp
	CREATE OR REPLACE FUNCTION update_updated_at_column()
	RETURNS TRIGGER AS $$
	BEGIN
		NEW.updated_at = CURRENT_TIMESTAMP;
		RETURN NEW;
	END;
	$$ language 'plpgsql';

	-- Create triggers for updated_at (drop if exists first)
	DO $$
	BEGIN
		-- Drop triggers if they exist
		DROP TRIGGER IF EXISTS update_users_updated_at ON users;
		DROP TRIGGER IF EXISTS update_files_updated_at ON files;
		DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
		
		-- Create triggers
		CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
			FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

		CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON files
			FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

		CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
			FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
	END $$;

	-- Add file_data column to existing file_hashes table if it doesn't exist
	ALTER TABLE file_hashes ADD COLUMN IF NOT EXISTS file_data BYTEA;

	-- Insert default admin user (password: admin123)
	INSERT INTO users (username, email, password_hash, is_admin, storage_quota_mb) 
	VALUES ('admin', 'admin@filevault.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true, 1000)
	ON CONFLICT (username) DO NOTHING;
	`

	_, err := db.Exec(migrationSQL)
	return err
}
