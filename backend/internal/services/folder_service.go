package services

import (
	"database/sql"
	"errors"
	"fmt"

	"filevault/internal/models"
)

type FolderService struct {
	db *sql.DB
}

func NewFolderService(db *sql.DB) *FolderService {
	return &FolderService{db: db}
}

func (s *FolderService) CreateFolder(userID int, req models.CreateFolderRequest) (*models.Folder, error) {
	// Check if parent folder exists and belongs to user
	if req.ParentID != nil {
		var parentOwnerID int
		err := s.db.QueryRow("SELECT user_id FROM folders WHERE id = $1", *req.ParentID).Scan(&parentOwnerID)
		if err != nil {
			return nil, errors.New("parent folder not found")
		}
		if parentOwnerID != userID {
			return nil, errors.New("parent folder does not belong to user")
		}
	}

	// Check if folder name already exists in the same parent
	var existingID int
	query := "SELECT id FROM folders WHERE user_id = $1 AND name = $2"
	args := []interface{}{userID, req.Name}
	if req.ParentID != nil {
		query += " AND parent_id = $3"
		args = append(args, *req.ParentID)
	} else {
		query += " AND parent_id IS NULL"
	}

	err := s.db.QueryRow(query, args...).Scan(&existingID)
	if err == nil {
		return nil, errors.New("folder with this name already exists in the same location")
	}

	// Create folder
	var folder models.Folder
	err = s.db.QueryRow(`
		INSERT INTO folders (user_id, name, parent_id, is_public) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, user_id, name, parent_id, is_public, created_at, updated_at`,
		userID, req.Name, req.ParentID, req.IsPublic).Scan(
		&folder.ID, &folder.UserID, &folder.Name, &folder.ParentID, &folder.IsPublic,
		&folder.CreatedAt, &folder.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return &folder, nil
}

func (s *FolderService) GetUserFolders(userID int) ([]models.Folder, error) {
	query := `
		SELECT f.id, f.user_id, f.name, f.parent_id, f.is_public, f.created_at, f.updated_at,
		       u.username, pf.name as parent_name
		FROM folders f
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders pf ON f.parent_id = pf.id
		WHERE f.user_id = $1
		ORDER BY f.name`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var parentName sql.NullString
		err := rows.Scan(&folder.ID, &folder.UserID, &folder.Name, &folder.ParentID,
			&folder.IsPublic, &folder.CreatedAt, &folder.UpdatedAt, &folder.Username, &parentName)
		if err != nil {
			return nil, err
		}
		if parentName.Valid {
			folder.ParentName = &parentName.String
		}
		folders = append(folders, folder)
	}

	return folders, nil
}

func (s *FolderService) GetUserFoldersWithSearch(userID int, search, sortBy, sortOrder string, isPublic *bool) ([]models.Folder, error) {
	query := `
		SELECT f.id, f.user_id, f.name, f.parent_id, f.is_public, f.created_at, f.updated_at,
		       u.username, pf.name as parent_name,
		       (SELECT COUNT(*) FROM files WHERE folder_id = f.id) as file_count,
		       COALESCE((SELECT SUM(fh.file_size) FROM files fi JOIN file_hashes fh ON fi.hash_id = fh.id WHERE fi.folder_id = f.id), 0) as folder_size
		FROM folders f
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders pf ON f.parent_id = pf.id
		WHERE f.user_id = $1`

	args := []interface{}{userID}
	argIndex := 2

	// Add search filter
	if search != "" {
		query += fmt.Sprintf(" AND f.name ILIKE $%d", argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	// Add public/private filter
	if isPublic != nil {
		query += fmt.Sprintf(" AND f.is_public = $%d", argIndex)
		args = append(args, *isPublic)
		argIndex++
	}

	// Add sorting
	orderBy := "f.name"
	if sortBy != "" {
		switch sortBy {
		case "name":
			orderBy = "f.name"
		case "created_at":
			orderBy = "f.created_at"
		case "file_count":
			orderBy = "file_count"
		default:
			orderBy = "f.name"
		}
	}

	orderDirection := "ASC"
	if sortOrder == "desc" {
		orderDirection = "DESC"
	}

	query += fmt.Sprintf(" ORDER BY %s %s", orderBy, orderDirection)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var parentName sql.NullString
		var fileCount int
		var folderSize int64
		err := rows.Scan(&folder.ID, &folder.UserID, &folder.Name, &folder.ParentID,
			&folder.IsPublic, &folder.CreatedAt, &folder.UpdatedAt, &folder.Username, &parentName, &fileCount, &folderSize)
		if err != nil {
			return nil, err
		}
		if parentName.Valid {
			folder.ParentName = &parentName.String
		}
		folder.FileCount = &fileCount
		folder.FolderSize = &folderSize
		folders = append(folders, folder)
	}

	return folders, nil
}

func (s *FolderService) GetFolder(folderID, userID int) (*models.Folder, error) {
	var folder models.Folder
	var parentName sql.NullString
	err := s.db.QueryRow(`
		SELECT f.id, f.user_id, f.name, f.parent_id, f.is_public, f.created_at, f.updated_at,
		       u.username, pf.name as parent_name
		FROM folders f
		JOIN users u ON f.user_id = u.id
		LEFT JOIN folders pf ON f.parent_id = pf.id
		WHERE f.id = $1 AND f.user_id = $2`,
		folderID, userID).Scan(&folder.ID, &folder.UserID, &folder.Name, &folder.ParentID,
		&folder.IsPublic, &folder.CreatedAt, &folder.UpdatedAt, &folder.Username, &parentName)

	if err != nil {
		return nil, err
	}

	if parentName.Valid {
		folder.ParentName = &parentName.String
	}

	return &folder, nil
}

func (s *FolderService) UpdateFolder(folderID, userID int, req models.UpdateFolderRequest) (*models.Folder, error) {
	// Check if folder exists and belongs to user
	var currentFolder models.Folder
	err := s.db.QueryRow("SELECT id, user_id, name, parent_id FROM folders WHERE id = $1", folderID).Scan(
		&currentFolder.ID, &currentFolder.UserID, &currentFolder.Name, &currentFolder.ParentID)
	if err != nil {
		return nil, errors.New("folder not found")
	}
	if currentFolder.UserID != userID {
		return nil, errors.New("folder does not belong to user")
	}

	// Check if new parent folder exists and belongs to user
	if req.ParentID != nil {
		var parentOwnerID int
		err = s.db.QueryRow("SELECT user_id FROM folders WHERE id = $1", *req.ParentID).Scan(&parentOwnerID)
		if err != nil {
			return nil, errors.New("parent folder not found")
		}
		if parentOwnerID != userID {
			return nil, errors.New("parent folder does not belong to user")
		}
		// Prevent circular reference
		if *req.ParentID == folderID {
			return nil, errors.New("folder cannot be its own parent")
		}
	}

	// Check if folder name already exists in the same parent
	if req.Name != nil && *req.Name != "" && *req.Name != currentFolder.Name {
		var existingID int
		query := "SELECT id FROM folders WHERE user_id = $1 AND name = $2 AND id != $3"
		args := []interface{}{userID, *req.Name, folderID}
		if req.ParentID != nil {
			query += " AND parent_id = $4"
			args = append(args, *req.ParentID)
		} else {
			query += " AND parent_id IS NULL"
		}

		err = s.db.QueryRow(query, args...).Scan(&existingID)
		if err == nil {
			return nil, errors.New("folder with this name already exists in the same location")
		}
	}

	// Update folder
	updateQuery := "UPDATE folders SET name = $1, parent_id = $2, is_public = $3 WHERE id = $4"
	args := []interface{}{*req.Name, req.ParentID, *req.IsPublic, folderID}
	if req.Name == nil {
		updateQuery = "UPDATE folders SET parent_id = $1, is_public = $2 WHERE id = $3"
		args = []interface{}{req.ParentID, *req.IsPublic, folderID}
	}

	_, err = s.db.Exec(updateQuery, args...)
	if err != nil {
		return nil, err
	}

	// Return updated folder
	return s.GetFolder(folderID, userID)
}

func (s *FolderService) DeleteFolder(folderID, userID int) error {
	// Check if folder exists and belongs to user
	var folderOwnerID int
	err := s.db.QueryRow("SELECT user_id FROM folders WHERE id = $1", folderID).Scan(&folderOwnerID)
	if err != nil {
		return errors.New("folder not found")
	}
	if folderOwnerID != userID {
		return errors.New("folder does not belong to user")
	}

	// Check if folder has subfolders
	var subfolderCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM folders WHERE parent_id = $1", folderID).Scan(&subfolderCount)
	if err != nil {
		return err
	}
	if subfolderCount > 0 {
		return errors.New("folder contains subfolders, please delete them first")
	}

	// Check if folder has files
	var fileCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM files WHERE folder_id = $1", folderID).Scan(&fileCount)
	if err != nil {
		return err
	}
	if fileCount > 0 {
		return errors.New("folder contains files, please move or delete them first")
	}

	// Delete folder
	_, err = s.db.Exec("DELETE FROM folders WHERE id = $1", folderID)
	return err
}

func (s *FolderService) ShareFolder(folderID, userID int, req models.ShareFolderRequest) error {
	// Check if folder exists and belongs to user
	var folderOwnerID int
	err := s.db.QueryRow("SELECT user_id FROM folders WHERE id = $1", folderID).Scan(&folderOwnerID)
	if err != nil {
		return errors.New("folder not found")
	}
	if folderOwnerID != userID {
		return errors.New("folder does not belong to user")
	}

	// Check if target user exists
	var targetUserID int
	err = s.db.QueryRow("SELECT id FROM users WHERE username = $1", req.Username).Scan(&targetUserID)
	if err != nil {
		return errors.New("user not found")
	}

	// Insert or update share
	_, err = s.db.Exec(`
		INSERT INTO folder_shares (folder_id, shared_with_user_id, permission) 
		VALUES ($1, $2, $3) 
		ON CONFLICT (folder_id, shared_with_user_id) 
		DO UPDATE SET permission = $3`,
		folderID, targetUserID, req.Permission)

	return err
}

func (s *FolderService) GetSharedFolders(userID int) ([]models.Folder, error) {
	query := `
		SELECT f.id, f.user_id, f.name, f.parent_id, f.is_public, f.created_at, f.updated_at,
		       u.username, fs.permission
		FROM folders f
		JOIN users u ON f.user_id = u.id
		JOIN folder_shares fs ON f.id = fs.folder_id
		WHERE fs.shared_with_user_id = $1
		ORDER BY f.name`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var permission string
		err := rows.Scan(&folder.ID, &folder.UserID, &folder.Name, &folder.ParentID,
			&folder.IsPublic, &folder.CreatedAt, &folder.UpdatedAt, &folder.Username, &permission)
		if err != nil {
			return nil, err
		}
		folder.SharedPermission = &permission
		folders = append(folders, folder)
	}

	return folders, nil
}

func (s *FolderService) GetFolderStats(userID int) (*models.FolderStats, error) {
	var stats models.FolderStats

	// Get total folders
	err := s.db.QueryRow("SELECT COUNT(*) FROM folders WHERE user_id = $1", userID).Scan(&stats.TotalFolders)
	if err != nil {
		return nil, err
	}

	// Get public folders
	err = s.db.QueryRow("SELECT COUNT(*) FROM folders WHERE user_id = $1 AND is_public = true", userID).Scan(&stats.PublicFolders)
	if err != nil {
		return nil, err
	}

	// Get private folders
	stats.PrivateFolders = stats.TotalFolders - stats.PublicFolders

	// Get total files in folders
	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM files f 
		JOIN folders fo ON f.folder_id = fo.id 
		WHERE fo.user_id = $1`, userID).Scan(&stats.TotalFilesInFolders)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}
