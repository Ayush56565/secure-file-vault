package services

import (
	"database/sql"
	"filevault/internal/models"
	"fmt"
)

type AdminService struct {
	db *sql.DB
}

func NewAdminService(db *sql.DB) *AdminService {
	return &AdminService{db: db}
}

// GetAllFilesForAdmin returns all files in the system with uploader details
func (s *AdminService) GetAllFilesForAdmin(page, limit int, search, sortBy, sortOrder string) ([]models.File, int, error) {
	offset := (page - 1) * limit

	query := `
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, fo.name as folder_name,
		       (SELECT COUNT(*) FROM files f2 WHERE f2.hash_id = f.hash_id) as reference_count
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE 1=1`

	args := []interface{}{}
	argIndex := 1

	// Add search filter
	if search != "" {
		query += fmt.Sprintf(" AND (f.original_name ILIKE $%d OR f.display_name ILIKE $%d OR u.username ILIKE $%d)", argIndex, argIndex, argIndex)
		args = append(args, "%"+search+"%", "%"+search+"%", "%"+search+"%")
		argIndex++
	}

	// Add sorting
	orderBy := "f.created_at"
	if sortBy != "" {
		switch sortBy {
		case "file_size":
			orderBy = "fh.file_size"
		case "download_count":
			orderBy = "f.download_count"
		case "original_name":
			orderBy = "f.original_name"
		case "created_at":
			orderBy = "f.created_at"
		case "username":
			orderBy = "u.username"
		default:
			orderBy = "f.created_at"
		}
	}

	orderDirection := "DESC"
	if sortOrder == "asc" {
		orderDirection = "ASC"
	}

	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDirection)

	// Add pagination
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
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
			return nil, 0, err
		}

		if folderName.Valid {
			file.FolderName = folderName.String
		}
		file.ReferenceCount = referenceCount
		file.IsDuplicate = referenceCount > 1

		files = append(files, file)
	}

	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM files f
		JOIN users u ON f.user_id = u.id
		WHERE 1=1`

	countArgs := []interface{}{}
	countArgIndex := 1

	if search != "" {
		countQuery += fmt.Sprintf(" AND (f.original_name ILIKE $%d OR f.display_name ILIKE $%d OR u.username ILIKE $%d)", countArgIndex, countArgIndex, countArgIndex)
		countArgs = append(countArgs, "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	var total int
	err = s.db.QueryRow(countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

// GetSystemStats returns comprehensive system statistics
func (s *AdminService) GetSystemStats() (*models.SystemStats, error) {
	stats := &models.SystemStats{}

	// Total files
	err := s.db.QueryRow("SELECT COUNT(*) FROM files").Scan(&stats.TotalFiles)
	if err != nil {
		return nil, err
	}

	// Total users
	err = s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	if err != nil {
		return nil, err
	}

	// Total storage used
	err = s.db.QueryRow(`
		SELECT COALESCE(SUM(fh.file_size), 0)
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
	`).Scan(&stats.TotalStorageBytes)
	if err != nil {
		return nil, err
	}

	// Total downloads
	err = s.db.QueryRow("SELECT COALESCE(SUM(download_count), 0) FROM files").Scan(&stats.TotalDownloads)
	if err != nil {
		return nil, err
	}

	// Public files
	err = s.db.QueryRow("SELECT COUNT(*) FROM files WHERE is_public = true").Scan(&stats.PublicFiles)
	if err != nil {
		return nil, err
	}

	// Deduplication stats - calculate correctly
	err = s.db.QueryRow(`
		WITH file_refs AS (
			SELECT fh.id, fh.file_size, COUNT(f.id) as reference_count
			FROM file_hashes fh
			LEFT JOIN files f ON f.hash_id = fh.id
			GROUP BY fh.id, fh.file_size
		)
		SELECT 
			COUNT(*) as unique_files,
			SUM(reference_count) as total_files,
			COALESCE(SUM(file_size), 0) as unique_storage,
			COALESCE(SUM(file_size * reference_count), 0) as total_storage
		FROM file_refs
	`).Scan(&stats.UniqueFiles, &stats.TotalFiles, &stats.UniqueStorageBytes, &stats.TotalStorageBytes)
	if err != nil {
		return nil, err
	}

	// Calculate savings (space saved due to deduplication)
	stats.SavingsBytes = stats.TotalStorageBytes - stats.UniqueStorageBytes
	if stats.TotalStorageBytes > 0 {
		stats.SavingsPercentage = float64(stats.SavingsBytes) / float64(stats.TotalStorageBytes) * 100
	}

	return stats, nil
}

// GetTopDownloadedFiles returns most downloaded files
func (s *AdminService) GetTopDownloadedFiles(limit int) ([]models.File, error) {
	query := `
		SELECT f.id, f.user_id, f.hash_id, f.original_name, f.display_name, f.folder_id, 
		       f.is_public, f.download_count, f.created_at, f.updated_at,
		       fh.hash_sha256, fh.file_size, fh.mime_type, u.username, fo.name as folder_name
		FROM files f
		JOIN file_hashes fh ON f.hash_id = fh.id
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders fo ON f.folder_id = fo.id
		WHERE f.download_count > 0
		ORDER BY f.download_count DESC
		LIMIT $1`

	rows, err := s.db.Query(query, limit)
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

// GetRecentActivity returns recent file uploads and downloads
func (s *AdminService) GetRecentActivity(limit int) ([]models.Activity, error) {
	query := `
		SELECT 
			'upload' as activity_type,
			f.original_name,
			f.created_at as activity_date,
			u.username,
			f.id as file_id
		FROM files f
		JOIN users u ON f.user_id = u.id
		UNION ALL
		SELECT 
			'download' as activity_type,
			f.original_name,
			f.updated_at as activity_date,
			u.username,
			f.id as file_id
		FROM files f
		JOIN users u ON f.user_id = u.id
		WHERE f.download_count > 0
		ORDER BY activity_date DESC
		LIMIT $1`

	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var activities []models.Activity
	for rows.Next() {
		var activity models.Activity
		err := rows.Scan(&activity.Type, &activity.FileName, &activity.Date, &activity.Username, &activity.FileID)
		if err != nil {
			return nil, err
		}
		activities = append(activities, activity)
	}

	return activities, nil
}

// GetAllUserStats returns statistics for all users
func (s *AdminService) GetAllUserStats() ([]models.UserStats, error) {
	query := `
		SELECT 
			u.id,
			u.username,
			u.email,
			u.created_at,
			u.storage_quota_mb,
			COALESCE(COUNT(f.id), 0) as file_count,
			COALESCE(SUM(fh.file_size), 0) as used_storage_bytes,
			COALESCE(SUM(f.download_count), 0) as total_downloads
		FROM users u
		LEFT JOIN files f ON u.id = f.user_id
		LEFT JOIN file_hashes fh ON f.hash_id = fh.id
		GROUP BY u.id, u.username, u.email, u.created_at, u.storage_quota_mb
		ORDER BY u.created_at DESC`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserStats
	for rows.Next() {
		var user models.UserStats
		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt,
			&user.StorageQuotaMB, &user.FileCount, &user.UsedStorageBytes, &user.TotalDownloads)
		if err != nil {
			return nil, err
		}
		user.UsedStorageMB = user.UsedStorageBytes / (1024 * 1024)
		users = append(users, user)
	}

	return users, nil
}
