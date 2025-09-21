package models

import (
	"time"
)

type FileHash struct {
	ID         int       `json:"id" db:"id"`
	HashSHA256 string    `json:"hash_sha256" db:"hash_sha256"`
	FileSize   int64     `json:"file_size" db:"file_size"`
	MimeType   string    `json:"mime_type" db:"mime_type"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type File struct {
	ID            int       `json:"id" db:"id"`
	UserID        int       `json:"user_id" db:"user_id"`
	HashID        int       `json:"hash_id" db:"hash_id"`
	OriginalName  string    `json:"original_name" db:"original_name"`
	DisplayName   string    `json:"display_name" db:"display_name"`
	FolderID      *int      `json:"folder_id" db:"folder_id"`
	IsPublic      bool      `json:"is_public" db:"is_public"`
	DownloadCount int       `json:"download_count" db:"download_count"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`

	// Joined fields
	HashSHA256     string   `json:"hash_sha256,omitempty"`
	FileSize       int64    `json:"file_size,omitempty"`
	MimeType       string   `json:"mime_type,omitempty"`
	Username       string   `json:"username,omitempty"`
	UserEmail      string   `json:"user_email,omitempty"`
	FolderName     string   `json:"folder_name,omitempty"`
	Tags           []string `json:"tags,omitempty"`
	ReferenceCount int      `json:"reference_count,omitempty"` // Number of files sharing this content
	IsDuplicate    bool     `json:"is_duplicate,omitempty"`    // True if reference_count > 1
}

type Folder struct {
	ID               int       `json:"id" db:"id"`
	UserID           int       `json:"user_id" db:"user_id"`
	Name             string    `json:"name" db:"name"`
	ParentID         *int      `json:"parent_id" db:"parent_id"`
	IsPublic         bool      `json:"is_public" db:"is_public"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time `json:"updated_at" db:"updated_at"`
	Username         *string   `json:"username,omitempty" db:"username"`
	ParentName       *string   `json:"parent_name,omitempty" db:"parent_name"`
	FileCount        *int      `json:"file_count,omitempty" db:"file_count"`
	FolderSize       *int64    `json:"folder_size,omitempty" db:"folder_size"`
	SubfolderCount   *int      `json:"subfolder_count,omitempty" db:"subfolder_count"`
	SharedPermission *string   `json:"shared_permission,omitempty" db:"shared_permission"`
	UserEmail        *string   `json:"user_email,omitempty" db:"user_email"`
}

type SystemStats struct {
	TotalFiles         int     `json:"total_files"`
	TotalUsers         int     `json:"total_users"`
	TotalStorageBytes  int64   `json:"total_storage_bytes"`
	TotalDownloads     int64   `json:"total_downloads"`
	PublicFiles        int     `json:"public_files"`
	UniqueFiles        int     `json:"unique_files"`
	UniqueStorageBytes int64   `json:"unique_storage_bytes"`
	SavingsBytes       int64   `json:"savings_bytes"`
	SavingsPercentage  float64 `json:"savings_percentage"`
}

type UserStats struct {
	ID               int    `json:"id"`
	Username         string `json:"username"`
	Email            string `json:"email"`
	CreatedAt        string `json:"created_at"`
	StorageQuotaMB   int    `json:"storage_quota_mb"`
	FileCount        int    `json:"file_count"`
	UsedStorageBytes int64  `json:"used_storage_bytes"`
	UsedStorageMB    int64  `json:"used_storage_mb"`
	TotalDownloads   int64  `json:"total_downloads"`
}

type Activity struct {
	Type     string `json:"type"`
	FileName string `json:"file_name"`
	Date     string `json:"date"`
	Username string `json:"username"`
	FileID   int    `json:"file_id"`
}

type FileShare struct {
	ID         int    `json:"id"`
	FileID     int    `json:"file_id"`
	UserID     int    `json:"user_id"`
	Permission string `json:"permission"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
	Username   string `json:"username"`
	FileName   string `json:"file_name"`
}

type FileShareDB struct {
	ID               int       `json:"id" db:"id"`
	FileID           int       `json:"file_id" db:"file_id"`
	SharedWithUserID int       `json:"shared_with_user_id" db:"shared_with_user_id"`
	Permission       string    `json:"permission" db:"permission"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

type FolderShare struct {
	ID               int       `json:"id" db:"id"`
	FolderID         int       `json:"folder_id" db:"folder_id"`
	SharedWithUserID int       `json:"shared_with_user_id" db:"shared_with_user_id"`
	Permission       string    `json:"permission" db:"permission"`
	CreatedAt        time.Time `json:"created_at" db:"created_at"`
}

type FileTag struct {
	ID        int       `json:"id" db:"id"`
	FileID    int       `json:"file_id" db:"file_id"`
	Tag       string    `json:"tag" db:"tag"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type FileUploadRequest struct {
	FolderID *int     `json:"folder_id"`
	IsPublic bool     `json:"is_public"`
	Tags     []string `json:"tags"`
}

type FileSearchRequest struct {
	Query     string   `json:"query"`
	MimeType  string   `json:"mime_type"`
	MinSize   *int64   `json:"min_size"`
	MaxSize   *int64   `json:"max_size"`
	StartDate string   `json:"start_date"`
	EndDate   string   `json:"end_date"`
	Tags      []string `json:"tags"`
	Uploader  string   `json:"uploader"`
	FolderID  *int     `json:"folder_id"`
	Page      int      `json:"page"`
	Limit     int      `json:"limit"`
	SortBy    string   `json:"sort_by"`
	SortOrder string   `json:"sort_order"`
}

type StorageStats struct {
	TotalUsedBytes  int64   `json:"total_used_bytes"`
	OriginalBytes   int64   `json:"original_bytes"`
	SavedBytes      int64   `json:"saved_bytes"`
	SavedPercentage float64 `json:"saved_percentage"`
	QuotaBytes      int64   `json:"quota_bytes"`
	UsedPercentage  float64 `json:"used_percentage"`
	// Frontend-compatible fields
	StorageQuotaMB int64 `json:"storage_quota_mb"`
	UsedStorageMB  int64 `json:"used_storage_mb"`
	TotalFiles     int   `json:"total_files"`
}

type CreateFolderRequest struct {
	Name     string `json:"name" binding:"required,min=1,max=255"`
	ParentID *int   `json:"parent_id"`
	IsPublic bool   `json:"is_public"`
}

type UpdateFolderRequest struct {
	Name     *string `json:"name,omitempty"`
	ParentID *int    `json:"parent_id,omitempty"`
	IsPublic *bool   `json:"is_public,omitempty"`
}

type ShareFolderRequest struct {
	FolderID   int    `json:"folder_id" binding:"required"`
	Username   string `json:"username" binding:"required"`
	Permission string `json:"permission" binding:"required,oneof=read write admin"`
	IsPublic   bool   `json:"is_public"`
}

type FolderStats struct {
	TotalFolders        int `json:"total_folders"`
	PublicFolders       int `json:"public_folders"`
	PrivateFolders      int `json:"private_folders"`
	TotalFilesInFolders int `json:"total_files_in_folders"`
}
