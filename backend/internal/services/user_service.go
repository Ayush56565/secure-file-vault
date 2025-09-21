package services

import (
	"database/sql"
	"errors"
	"fmt"

	"filevault/internal/models"
	"filevault/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	db *sql.DB
}

func NewUserService(db *sql.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) CreateUser(req models.UserCreateRequest) (*models.User, error) {
	// Check if username or email already exists
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM users WHERE username = $1 OR email = $2", req.Username, req.Email).Scan(&count)
	if err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, errors.New("username or email already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Insert user
	var user models.User
	err = s.db.QueryRow(`
		INSERT INTO users (username, email, password_hash, storage_quota_mb) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at`,
		req.Username, req.Email, hashedPassword, 10).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.IsAdmin, &user.StorageQuotaMB, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *UserService) AuthenticateUser(username, password string) (*models.User, error) {
	var user models.User
	err := s.db.QueryRow(`
		SELECT id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at 
		FROM users WHERE username = $1`,
		username).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.IsAdmin, &user.StorageQuotaMB, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	if !utils.CheckPasswordHash(password, user.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}

	return &user, nil
}

func (s *UserService) GetUserByID(userID int) (*models.User, error) {
	var user models.User
	err := s.db.QueryRow(`
		SELECT id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at 
		FROM users WHERE id = $1`,
		userID).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.IsAdmin, &user.StorageQuotaMB, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *UserService) GetUserStats(userID int) (*models.StorageStats, error) {
	var stats models.StorageStats

	// Get user quota in MB
	var quotaMB int
	err := s.db.QueryRow("SELECT storage_quota_mb FROM users WHERE id = $1", userID).Scan(&quotaMB)
	if err != nil {
		return nil, err
	}
	stats.QuotaBytes = int64(quotaMB) * 1024 * 1024 // Convert MB to bytes

	// Get total used storage (deduplicated)
	err = s.db.QueryRow(`
		SELECT COALESCE(SUM(fh.file_size), 0) 
		FROM files f 
		JOIN file_hashes fh ON f.hash_id = fh.id 
		WHERE f.user_id = $1`,
		userID).Scan(&stats.TotalUsedBytes)

	if err != nil {
		return nil, err
	}

	// Get original storage (without deduplication)
	err = s.db.QueryRow(`
		SELECT COALESCE(SUM(fh.file_size), 0) 
		FROM files f 
		JOIN file_hashes fh ON f.hash_id = fh.id 
		WHERE f.user_id = $1`,
		userID).Scan(&stats.OriginalBytes)

	if err != nil {
		return nil, err
	}

	// Calculate savings
	stats.SavedBytes = stats.OriginalBytes - stats.TotalUsedBytes
	if stats.OriginalBytes > 0 {
		stats.SavedPercentage = float64(stats.SavedBytes) / float64(stats.OriginalBytes) * 100
	}

	// Calculate used percentage
	if stats.QuotaBytes > 0 {
		stats.UsedPercentage = float64(stats.TotalUsedBytes) / float64(stats.QuotaBytes) * 100
	}

	// Set frontend-compatible fields
	stats.StorageQuotaMB = int64(quotaMB)
	stats.UsedStorageMB = stats.TotalUsedBytes / (1024 * 1024) // Convert bytes to MB

	// Get total file count
	err = s.db.QueryRow("SELECT COUNT(*) FROM files WHERE user_id = $1", userID).Scan(&stats.TotalFiles)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

func (s *UserService) UpdateUserQuota(userID int, quotaMB int) error {
	_, err := s.db.Exec("UPDATE users SET storage_quota_mb = $1 WHERE id = $2", quotaMB, userID)
	return err
}

func (s *UserService) GetAllUsers() ([]models.User, error) {
	rows, err := s.db.Query(`
		SELECT id, username, email, password_hash, is_admin, storage_quota_mb, created_at, updated_at 
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.IsAdmin, &user.StorageQuotaMB, &user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

// CreateUserWithAdmin creates a user with admin privileges
func (s *UserService) CreateUserWithAdmin(req models.UserCreateRequest, storageQuotaMB int, isAdmin bool) (*models.User, error) {
	// Check if user already exists
	var existingID int
	err := s.db.QueryRow("SELECT id FROM users WHERE username = $1 OR email = $2", req.Username, req.Email).Scan(&existingID)
	if err == nil {
		return nil, fmt.Errorf("user already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %v", err)
	}

	// Create user
	var user models.User
	err = s.db.QueryRow(`
		INSERT INTO users (username, email, password_hash, storage_quota_mb, is_admin, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id, username, email, storage_quota_mb, is_admin, created_at, updated_at
	`, req.Username, req.Email, string(hashedPassword), storageQuotaMB, isAdmin).Scan(
		&user.ID, &user.Username, &user.Email, &user.StorageQuotaMB, &user.IsAdmin, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	return &user, nil
}
