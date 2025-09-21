package services

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"filevault/internal/models"
	"filevault/internal/utils"
)

type FileService struct {
	db        *sql.DB
	uploadDir string
}

func NewFileService(db *sql.DB, uploadDir string) *FileService {
	return &FileService{db: db, uploadDir: uploadDir}
}

func (s *FileService) UploadFile(userID int, fileHeader *multipart.FileHeader, req models.FileUploadRequest) (*models.File, error) {
	// Open uploaded file
	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Read file data into memory
	fileData, err := io.ReadAll(file)
	if err != nil {
		return nil, err
	}

	// Calculate file hash from data
	hash, err := utils.CalculateHashFromData(fileData)
	if err != nil {
		return nil, err
	}

	// Get file size
	fileSize := int64(len(fileData))

	// Detect MIME type from data
	actualMimeType := utils.DetectMimeTypeFromData(fileData)

	// Check if file already exists (deduplication)
	var hashID int
	var existingHash models.FileHash
	var isNewFile bool
	err = s.db.QueryRow(`
		SELECT id, hash_sha256, file_size, mime_type, created_at 
		FROM file_hashes WHERE hash_sha256 = $1`,
		hash).Scan(&existingHash.ID, &existingHash.HashSHA256, &existingHash.FileSize, &existingHash.MimeType, &existingHash.CreatedAt)

	if err == sql.ErrNoRows {
		// File doesn't exist, create new hash record with file data
		isNewFile = true
		err = s.db.QueryRow(`
			INSERT INTO file_hashes (hash_sha256, file_size, mime_type, file_data) 
			VALUES ($1, $2, $3, $4) RETURNING id`,
			hash, fileSize, actualMimeType, fileData).Scan(&hashID)
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	} else {
		// File exists, use existing hash
		hashID = existingHash.ID
		isNewFile = false
	}

	// Check storage quota only for new files (not deduplicated)
	if isNewFile {
		var currentUsage int64
		err = s.db.QueryRow(`
			SELECT COALESCE(SUM(fh.file_size), 0) 
			FROM files f 
			JOIN file_hashes fh ON f.hash_id = fh.id 
			WHERE f.user_id = $1`,
			userID).Scan(&currentUsage)

		if err != nil {
			return nil, err
		}

		var quota int64
		err = s.db.QueryRow("SELECT storage_quota_mb FROM users WHERE id = $1", userID).Scan(&quota)
		if err != nil {
			return nil, err
		}
		quota = quota * 1024 * 1024 // Convert MB to bytes

		if currentUsage+fileSize > quota {
			return nil, errors.New("storage quota exceeded")
		}
	}

	// Create file record
	var fileRecord models.File
	err = s.db.QueryRow(`
		INSERT INTO files (user_id, hash_id, original_name, display_name, folder_id, is_public) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id, user_id, hash_id, original_name, display_name, folder_id, is_public, download_count, created_at, updated_at`,
		userID, hashID, fileHeader.Filename, fileHeader.Filename, req.FolderID, req.IsPublic).Scan(
		&fileRecord.ID, &fileRecord.UserID, &fileRecord.HashID, &fileRecord.OriginalName,
		&fileRecord.DisplayName, &fileRecord.FolderID, &fileRecord.IsPublic, &fileRecord.DownloadCount,
		&fileRecord.CreatedAt, &fileRecord.UpdatedAt)

	if err != nil {
		return nil, err
	}

	// Add tags if provided
	if len(req.Tags) > 0 {
		for _, tag := range req.Tags {
			_, err = s.db.Exec("INSERT INTO file_tags (file_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING", fileRecord.ID, tag)
			if err != nil {
				return nil, err
			}
		}
	}

	return &fileRecord, nil
}

func (s *FileService) GetFiles(userID int, searchReq models.FileSearchRequest) ([]models.File, error) {
	query := `
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, fo.name as folder_name,
		       (SELECT COUNT(*) FROM files f2 WHERE f2.hash_id = f.hash_id) as reference_count
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE f.user_id = $1`

	args := []interface{}{userID}
	argIndex := 2

	// Add search filters with full-text search
	if searchReq.Query != "" {
		// Use full-text search for better performance
		query += fmt.Sprintf(" AND (f.original_name ILIKE $%d OR f.display_name ILIKE $%d OR to_tsvector('english', f.original_name || ' ' || f.display_name) @@ plainto_tsquery('english', $%d))", argIndex, argIndex, argIndex+1)
		args = append(args, "%"+searchReq.Query+"%", searchReq.Query)
		argIndex += 2
	}

	if searchReq.MimeType != "" {
		query += fmt.Sprintf(" AND fh.mime_type = $%d", argIndex)
		args = append(args, searchReq.MimeType)
		argIndex++
	}

	if searchReq.MinSize != nil {
		query += fmt.Sprintf(" AND fh.file_size >= $%d", argIndex)
		args = append(args, *searchReq.MinSize)
		argIndex++
	}

	if searchReq.MaxSize != nil {
		query += fmt.Sprintf(" AND fh.file_size <= $%d", argIndex)
		args = append(args, *searchReq.MaxSize)
		argIndex++
	}

	if searchReq.StartDate != "" {
		query += fmt.Sprintf(" AND f.created_at >= $%d", argIndex)
		args = append(args, searchReq.StartDate)
		argIndex++
	}

	if searchReq.EndDate != "" {
		query += fmt.Sprintf(" AND f.created_at <= $%d", argIndex)
		args = append(args, searchReq.EndDate)
		argIndex++
	}

	if searchReq.Uploader != "" {
		query += fmt.Sprintf(" AND u.username ILIKE $%d", argIndex)
		args = append(args, "%"+searchReq.Uploader+"%")
		argIndex++
	}

	if len(searchReq.Tags) > 0 {
		query += fmt.Sprintf(" AND f.id IN (SELECT file_id FROM file_tags WHERE tag = ANY($%d))", argIndex)
		args = append(args, searchReq.Tags)
		argIndex++
	}

	if searchReq.FolderID != nil {
		query += fmt.Sprintf(" AND f.folder_id = $%d", argIndex)
		args = append(args, *searchReq.FolderID)
		argIndex++
	}

	query += " ORDER BY f.created_at DESC"

	// Add pagination
	if searchReq.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, searchReq.Limit)
		argIndex++
	}

	if searchReq.Page > 0 {
		offset := (searchReq.Page - 1) * searchReq.Limit
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderName sql.NullString
		var referenceCount int
		err := rows.Scan(&file.ID, &file.UserID, &file.HashID, &file.OriginalName, &file.DisplayName,
			&file.FolderID, &file.IsPublic, &file.DownloadCount, &file.CreatedAt, &file.UpdatedAt,
			&file.HashSHA256, &file.FileSize, &file.MimeType, &file.Username, &folderName, &referenceCount)
		if err != nil {
			return nil, err
		}
		if folderName.Valid {
			file.FolderName = folderName.String
		}
		file.ReferenceCount = referenceCount
		file.IsDuplicate = referenceCount > 1
		files = append(files, file)
	}

	// Load tags for each file
	for i := range files {
		tags, err := s.getFileTags(files[i].ID)
		if err != nil {
			return nil, err
		}
		files[i].Tags = tags
	}

	return files, nil
}

func (s *FileService) getFileTags(fileID int) ([]string, error) {
	rows, err := s.db.Query("SELECT tag FROM file_tags WHERE file_id = $1", fileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		err := rows.Scan(&tag)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

func (s *FileService) GetFileByID(fileID int) (*models.File, error) {
	var file models.File
	var folderName sql.NullString
	err := s.db.QueryRow(`
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, fo.name as folder_name
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE f.id = $1`,
		fileID).Scan(&file.ID, &file.UserID, &file.HashID, &file.OriginalName, &file.DisplayName,
		&file.FolderID, &file.IsPublic, &file.DownloadCount, &file.CreatedAt, &file.UpdatedAt,
		&file.HashSHA256, &file.FileSize, &file.MimeType, &file.Username, &folderName)

	if err != nil {
		return nil, err
	}

	if folderName.Valid {
		file.FolderName = folderName.String
	}

	// Load tags
	tags, err := s.getFileTags(file.ID)
	if err != nil {
		return nil, err
	}
	file.Tags = tags

	return &file, nil
}

func (s *FileService) DeleteFile(fileID, userID int) error {
	// Check if user owns the file
	var ownerID int
	err := s.db.QueryRow("SELECT user_id FROM files WHERE id = $1", fileID).Scan(&ownerID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return errors.New("not authorized to delete this file")
	}

	// Get hash_id to check reference count
	var hashID int
	err = s.db.QueryRow("SELECT hash_id FROM files WHERE id = $1", fileID).Scan(&hashID)
	if err != nil {
		return err
	}

	// Delete file record
	_, err = s.db.Exec("DELETE FROM files WHERE id = $1", fileID)
	if err != nil {
		return err
	}

	// Check if this was the last reference to the hash
	var refCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM files WHERE hash_id = $1", hashID).Scan(&refCount)
	if err != nil {
		return err
	}

	if refCount == 0 {
		// Get hash to delete physical file
		var hash string
		err = s.db.QueryRow("SELECT hash_sha256 FROM file_hashes WHERE id = $1", hashID).Scan(&hash)
		if err != nil {
			return err
		}

		// Delete physical file
		filePath := filepath.Join(s.uploadDir, hash[:2], hash)
		os.Remove(filePath)

		// Delete hash record
		_, err = s.db.Exec("DELETE FROM file_hashes WHERE id = $1", hashID)
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *FileService) DownloadFile(fileID int) ([]byte, string, error) {
	// Get file data and info
	var fileData []byte
	var originalName string
	err := s.db.QueryRow(`
		SELECT fh.file_data, f.original_name 
		FROM files f 
		JOIN file_hashes fh ON f.hash_id = fh.id 
		WHERE f.id = $1`,
		fileID).Scan(&fileData, &originalName)

	if err != nil {
		return nil, "", err
	}

	// Increment download count
	_, err = s.db.Exec("UPDATE files SET download_count = download_count + 1 WHERE id = $1", fileID)
	if err != nil {
		return nil, "", err
	}

	return fileData, originalName, nil
}

func (s *FileService) ShareFile(fileID, userID int, isPublic bool, sharedUsers []string) error {
	// Check if user owns the file
	var ownerID int
	err := s.db.QueryRow("SELECT user_id FROM files WHERE id = $1", fileID).Scan(&ownerID)
	if err != nil {
		return err
	}

	if ownerID != userID {
		return errors.New("not authorized to share this file")
	}

	// Update file public status
	_, err = s.db.Exec("UPDATE files SET is_public = $1 WHERE id = $2", isPublic, fileID)
	if err != nil {
		return err
	}

	// Remove existing shares
	_, err = s.db.Exec("DELETE FROM file_shares WHERE file_id = $1", fileID)
	if err != nil {
		return err
	}

	// Add new shares for specific users
	for _, username := range sharedUsers {
		// Get user ID by username
		var targetUserID int
		err = s.db.QueryRow("SELECT id FROM users WHERE username = $1", username).Scan(&targetUserID)
		if err != nil {
			continue // Skip invalid usernames
		}

		// Insert share record
		_, err = s.db.Exec(`
			INSERT INTO file_shares (file_id, shared_with_user_id, permission) 
			VALUES ($1, $2, 'read')
			ON CONFLICT (file_id, shared_with_user_id) 
			DO UPDATE SET permission = 'read'`,
			fileID, targetUserID)
		if err != nil {
			continue // Skip on error
		}
	}

	return nil
}

func (s *FileService) GetPublicFiles() ([]models.File, error) {
	query := `
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, fo.name as folder_name
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE f.is_public = true
		ORDER BY f.created_at DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderName sql.NullString
		err := rows.Scan(&file.ID, &file.UserID, &file.HashID, &file.OriginalName, &file.DisplayName,
			&file.FolderID, &file.IsPublic, &file.DownloadCount, &file.CreatedAt, &file.UpdatedAt,
			&file.HashSHA256, &file.FileSize, &file.MimeType, &file.Username, &folderName)
		if err != nil {
			return nil, err
		}
		if folderName.Valid {
			file.FolderName = folderName.String
		}
		files = append(files, file)
	}

	return files, nil
}

func (s *FileService) GetStorageStats(userID int) (map[string]interface{}, error) {
	// Get total storage used (deduplicated)
	var totalStorage int64
	err := s.db.QueryRow(`
		SELECT COALESCE(SUM(fh.file_size), 0) 
		FROM files f 
		JOIN file_hashes fh ON f.hash_id = fh.id 
		WHERE f.user_id = $1`,
		userID).Scan(&totalStorage)

	if err != nil {
		return nil, err
	}

	// Get original storage (without deduplication)
	var originalStorage int64
	err = s.db.QueryRow(`
		SELECT COALESCE(SUM(fh.file_size * (
			SELECT COUNT(*) FROM files f2 WHERE f2.hash_id = f.hash_id
		)), 0)
		FROM files f 
		JOIN file_hashes fh ON f.hash_id = fh.id 
		WHERE f.user_id = $1`,
		userID).Scan(&originalStorage)

	if err != nil {
		return nil, err
	}

	// Calculate savings
	savings := originalStorage - totalStorage
	savingsPercentage := float64(0)
	if originalStorage > 0 {
		savingsPercentage = float64(savings) / float64(originalStorage) * 100
	}

	// Get file count
	var fileCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM files WHERE user_id = $1", userID).Scan(&fileCount)
	if err != nil {
		return nil, err
	}

	// Get unique file count (deduplicated)
	var uniqueFileCount int
	err = s.db.QueryRow(`
		SELECT COUNT(DISTINCT f.hash_id) 
		FROM files f 
		WHERE f.user_id = $1`,
		userID).Scan(&uniqueFileCount)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_storage_bytes":    totalStorage,
		"original_storage_bytes": originalStorage,
		"savings_bytes":          savings,
		"savings_percentage":     savingsPercentage,
		"file_count":             fileCount,
		"unique_file_count":      uniqueFileCount,
		"deduplication_ratio":    float64(uniqueFileCount) / float64(fileCount),
	}, nil
}

func (s *FileService) GetDeduplicationStats(userID int) (map[string]interface{}, error) {
	// Get files with reference counts
	rows, err := s.db.Query(`
		SELECT f.original_name, fh.file_size, fh.mime_type, f.created_at,
		       (SELECT COUNT(*) FROM files f2 WHERE f2.hash_id = f.hash_id) as reference_count
		FROM files f 
		JOIN file_hashes fh ON f.hash_id = fh.id 
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC`,
		userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []map[string]interface{}
	for rows.Next() {
		var fileName, mimeType string
		var fileSize int64
		var createdAt string
		var referenceCount int

		err := rows.Scan(&fileName, &fileSize, &mimeType, &createdAt, &referenceCount)
		if err != nil {
			return nil, err
		}

		files = append(files, map[string]interface{}{
			"name":            fileName,
			"size":            fileSize,
			"mime_type":       mimeType,
			"created_at":      createdAt,
			"reference_count": referenceCount,
			"is_duplicate":    referenceCount > 1,
		})
	}

	// Get deduplication summary with correct calculations
	var uniqueFiles, totalFiles int
	var uniqueSize, totalSize int64

	err = s.db.QueryRow(`
		WITH user_file_refs AS (
			SELECT fh.id, fh.file_size, COUNT(f.id) as reference_count
			FROM file_hashes fh
			JOIN files f ON f.hash_id = fh.id
			WHERE f.user_id = $1
			GROUP BY fh.id, fh.file_size
		)
		SELECT 
			COUNT(*) as unique_files,
			SUM(reference_count) as total_files,
			COALESCE(SUM(file_size), 0) as unique_size,
			COALESCE(SUM(file_size * reference_count), 0) as total_size
		FROM user_file_refs`,
		userID).Scan(&uniqueFiles, &totalFiles, &uniqueSize, &totalSize)

	if err != nil {
		return nil, err
	}

	// Calculate savings and deduplication rate
	savings := totalSize - uniqueSize
	var savingsPercentage float64
	if totalSize > 0 {
		savingsPercentage = float64(savings) / float64(totalSize) * 100
	}

	return map[string]interface{}{
		"files":              files,
		"unique_files":       uniqueFiles,
		"total_files":        totalFiles,
		"unique_size":        uniqueSize,
		"total_size":         totalSize,
		"savings_bytes":      savings,
		"savings_percentage": savingsPercentage,
		"deduplication_rate": savingsPercentage, // Same as savings percentage
	}, nil
}

func (s *FileService) GlobalSearch(searchReq models.FileSearchRequest) ([]models.File, error) {
	query := `
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, fo.name as folder_name
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE 1=1`

	args := []interface{}{}
	argIndex := 1

	// Add search filters with full-text search
	if searchReq.Query != "" {
		query += fmt.Sprintf(" AND (f.original_name ILIKE $%d OR f.display_name ILIKE $%d OR to_tsvector('english', f.original_name || ' ' || f.display_name) @@ plainto_tsquery('english', $%d))", argIndex, argIndex, argIndex+1)
		args = append(args, "%"+searchReq.Query+"%", searchReq.Query)
		argIndex += 2
	}

	if searchReq.MimeType != "" {
		query += fmt.Sprintf(" AND fh.mime_type = $%d", argIndex)
		args = append(args, searchReq.MimeType)
		argIndex++
	}

	if searchReq.MinSize != nil {
		query += fmt.Sprintf(" AND fh.file_size >= $%d", argIndex)
		args = append(args, *searchReq.MinSize)
		argIndex++
	}

	if searchReq.MaxSize != nil {
		query += fmt.Sprintf(" AND fh.file_size <= $%d", argIndex)
		args = append(args, *searchReq.MaxSize)
		argIndex++
	}

	if searchReq.StartDate != "" {
		query += fmt.Sprintf(" AND f.created_at >= $%d", argIndex)
		args = append(args, searchReq.StartDate)
		argIndex++
	}

	if searchReq.EndDate != "" {
		query += fmt.Sprintf(" AND f.created_at <= $%d", argIndex)
		args = append(args, searchReq.EndDate)
		argIndex++
	}

	if searchReq.Uploader != "" {
		query += fmt.Sprintf(" AND u.username ILIKE $%d", argIndex)
		args = append(args, "%"+searchReq.Uploader+"%")
		argIndex++
	}

	if len(searchReq.Tags) > 0 {
		query += fmt.Sprintf(" AND f.id IN (SELECT file_id FROM file_tags WHERE tag = ANY($%d))", argIndex)
		args = append(args, searchReq.Tags)
		argIndex++
	}

	if searchReq.FolderID != nil {
		query += fmt.Sprintf(" AND f.folder_id = $%d", argIndex)
		args = append(args, *searchReq.FolderID)
		argIndex++
	}

	query += " ORDER BY f.created_at DESC"

	// Add pagination
	if searchReq.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, searchReq.Limit)
		argIndex++
	}

	if searchReq.Page > 0 {
		offset := (searchReq.Page - 1) * searchReq.Limit
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, offset)
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var file models.File
		var folderName sql.NullString
		err := rows.Scan(&file.ID, &file.UserID, &file.HashID, &file.OriginalName, &file.DisplayName,
			&file.FolderID, &file.IsPublic, &file.DownloadCount, &file.CreatedAt, &file.UpdatedAt,
			&file.HashSHA256, &file.FileSize, &file.MimeType, &file.Username, &folderName)
		if err != nil {
			return nil, err
		}
		if folderName.Valid {
			file.FolderName = folderName.String
		}
		files = append(files, file)
	}

	// Load tags for each file
	for i := range files {
		tags, err := s.getFileTags(files[i].ID)
		if err != nil {
			return nil, err
		}
		files[i].Tags = tags
	}

	return files, nil
}

// GetFileDetailsForAdmin returns detailed information about a specific file
func (s *FileService) GetFileDetailsForAdmin(fileID int) (*models.File, error) {
	query := `
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, u.email, fo.name as folder_name,
		       (SELECT COUNT(*) FROM files f2 WHERE f2.hash_id = f.hash_id) as reference_count
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE f.id = $1`

	var file models.File
	var folderName sql.NullString
	var referenceCount int

	err := s.db.QueryRow(query, fileID).Scan(&file.ID, &file.UserID, &file.HashID, &file.OriginalName, &file.DisplayName,
		&file.FolderID, &file.IsPublic, &file.DownloadCount, &file.CreatedAt, &file.UpdatedAt,
		&file.HashSHA256, &file.FileSize, &file.MimeType, &file.Username, &file.UserEmail, &folderName, &referenceCount)
	if err != nil {
		return nil, err
	}

	if folderName.Valid {
		file.FolderName = folderName.String
	}
	file.ReferenceCount = referenceCount
	file.IsDuplicate = referenceCount > 1

	// Load tags
	tags, err := s.getFileTags(file.ID)
	if err != nil {
		return nil, err
	}
	file.Tags = tags

	return &file, nil
}

// DeleteFileAsAdmin allows admins to delete any file
func (s *FileService) DeleteFileAsAdmin(fileID int) error {
	// Get file details first
	var hashID int
	var userID int
	err := s.db.QueryRow("SELECT hash_id, user_id FROM files WHERE id = $1", fileID).Scan(&hashID, &userID)
	if err != nil {
		return err
	}

	// Delete the file
	_, err = s.db.Exec("DELETE FROM files WHERE id = $1", fileID)
	if err != nil {
		return err
	}

	// Check if this was the last file using this hash
	var count int
	err = s.db.QueryRow("SELECT COUNT(*) FROM files WHERE hash_id = $1", hashID).Scan(&count)
	if err != nil {
		return err
	}

	// If no more files use this hash, delete the hash and file data
	if count == 0 {
		_, err = s.db.Exec("DELETE FROM file_hashes WHERE id = $1", hashID)
		if err != nil {
			return err
		}
	}

	return nil
}

// ShareFileWithUser allows admins to share files with specific users
func (s *FileService) ShareFileWithUser(fileID int, username, permission string) error {
	// Get user ID
	var userID int
	err := s.db.QueryRow("SELECT id FROM users WHERE username = $1", username).Scan(&userID)
	if err != nil {
		return err
	}

	// Insert or update share
	_, err = s.db.Exec(`
		INSERT INTO file_shares (file_id, user_id, permission, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (file_id, user_id)
		DO UPDATE SET permission = $3, updated_at = NOW()
	`, fileID, userID, permission)

	return err
}

// GetFileShares returns all shares for a specific file
func (s *FileService) GetFileShares(fileID int) ([]models.FileShare, error) {
	query := `
		SELECT fs.id, fs.file_id, fs.user_id, fs.permission, fs.created_at, fs.updated_at,
		       u.username, f.original_name
		FROM file_shares fs
		JOIN users u ON fs.user_id = u.id
		JOIN files f ON fs.file_id = f.id
		WHERE fs.file_id = $1
		ORDER BY fs.created_at DESC`

	rows, err := s.db.Query(query, fileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []models.FileShare
	for rows.Next() {
		var share models.FileShare
		err := rows.Scan(&share.ID, &share.FileID, &share.UserID, &share.Permission,
			&share.CreatedAt, &share.UpdatedAt, &share.Username, &share.FileName)
		if err != nil {
			return nil, err
		}
		shares = append(shares, share)
	}

	return shares, nil
}
